import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AgentEvent } from '@/types/events';
import type {
  CrewRunDetail,
  CrewRunEventRecord,
  CrewRunRecord,
} from '@/types/runHistory';
import type { CrewAiFlowResult } from './useUiStore';

export interface StartRunSessionInput {
  workflowId: string;
  workflowName: string;
  endpointUrl: string;
  prompt: string;
  attachedFileName?: string;
  attachedFileContent?: string;
}

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function extractAvgStreamScore(result: CrewAiFlowResult): number | null {
  if (typeof result.qa_score === 'number' && Number.isFinite(result.qa_score)) {
    return result.qa_score;
  }
  if (Array.isArray(result.streams) && result.streams.length > 0) {
    const scores = result.streams
      .map((s) => Number(s.score))
      .filter((n) => Number.isFinite(n));
    if (scores.length > 0) {
      return Number(
        (scores.reduce((acc, v) => acc + v, 0) / scores.length).toFixed(2),
      );
    }
  }
  return null;
}

export const useRunHistoryStore = defineStore('runHistory', () => {
  const runs = ref<CrewRunRecord[]>([]);
  const selectedRun = ref<CrewRunDetail | null>(null);
  const activeRunId = ref<string | null>(null);
  const loadingRuns = ref(false);
  const loadingDetail = ref(false);

  let activeSeq = 0;
  let persistChain: Promise<void> = Promise.resolve();

  function enqueuePersist(work: () => Promise<void>): void {
    persistChain = persistChain
      .then(work)
      .catch((err) => {
        console.warn('[RunHistory] SQLite persistence warning:', err);
      });
  }

  async function initRunHistory(limit = 100): Promise<void> {
    loadingRuns.value = true;
    try {
      const resp = await fetch(`/api/runs?limit=${limit}`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { runs?: CrewRunRecord[] };
      if (Array.isArray(data.runs)) {
        runs.value = data.runs;
      }
    } catch (err) {
      console.warn('[RunHistory] Failed to load /api/runs:', err);
    } finally {
      loadingRuns.value = false;
    }
  }

  async function selectAndLoadRun(runId: string): Promise<CrewRunDetail | null> {
    loadingDetail.value = true;
    try {
      const resp = await fetch(`/api/runs?id=${encodeURIComponent(runId)}`);
      if (!resp.ok) return null;
      const detail = (await resp.json()) as CrewRunDetail;
      selectedRun.value = detail;
      return detail;
    } catch (err) {
      console.warn('[RunHistory] Failed to load run detail:', err);
      return null;
    } finally {
      loadingDetail.value = false;
    }
  }

  function startRunSession(input: StartRunSessionInput): string {
    const runId = generateRunId();
    const now = Date.now();
    const filePreview = (input.attachedFileContent || '').slice(0, 4000);

    const record: CrewRunRecord = {
      id: runId,
      workflow_id: input.workflowId,
      workflow_name: input.workflowName,
      endpoint_url: input.endpointUrl,
      prompt: input.prompt,
      attached_file_name: input.attachedFileName || '',
      attached_file_preview: filePreview,
      status: 'running',
      started_at: now,
      finished_at: null,
      elapsed_seconds: null,
      llm_engine: '',
      total_tokens: 0,
      qa_score: null,
      qa_decision: '',
      portal_url: '',
      result_url: '',
      zip_url: '',
      zip_filename: '',
      result_json: '{}',
      error_message: '',
      event_count: 0,
    };

    activeRunId.value = runId;
    activeSeq = 0;
    runs.value = [record, ...runs.value];
    selectedRun.value = { run: { ...record }, events: [] };

    enqueuePersist(async () => {
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    });

    return runId;
  }

  function recordRunEvent(event: AgentEvent, agentName = ''): void {
    const runId = activeRunId.value;
    if (!runId) return;

    activeSeq += 1;
    const seq = activeSeq;
    const meta = event.metadata || {};
    const tokens = Number(meta.tokens_used ?? 0) || 0;
    const payloadObj: Record<string, unknown> = {};
    if (meta.input_payload !== undefined) {
      payloadObj.input_payload = meta.input_payload;
    }
    if (meta.output_payload !== undefined) {
      payloadObj.output_payload = meta.output_payload;
    }
    const payloadJson =
      Object.keys(payloadObj).length > 0 ? JSON.stringify(payloadObj) : '{}';

    const eventRecord: CrewRunEventRecord = {
      run_id: runId,
      seq,
      event_id: event.event_id,
      timestamp: event.timestamp || Date.now(),
      event_type: event.event_type,
      agent_id: event.agent_id,
      agent_name: agentName || event.agent_id,
      target_agent_id: event.target_agent_id || '',
      status_text: meta.status_text || '',
      icon: meta.icon || '',
      tokens_used: tokens,
      payload_json: payloadJson,
    };

    const runIdx = runs.value.findIndex((r) => r.id === runId);
    if (runIdx >= 0) {
      const target = runs.value[runIdx];
      target.total_tokens = (target.total_tokens || 0) + tokens;
      target.event_count = (target.event_count || 0) + 1;
      const outObj =
        meta.output_payload && typeof meta.output_payload === 'object'
          ? (meta.output_payload as Record<string, unknown>)
          : undefined;
      const inObj =
        meta.input_payload && typeof meta.input_payload === 'object'
          ? (meta.input_payload as Record<string, unknown>)
          : undefined;
      const detectedEngine = outObj?.llm_engine ?? inObj?.llm_engine;
      if (typeof detectedEngine === 'string' && detectedEngine.trim()) {
        target.llm_engine = detectedEngine.trim();
      }
    }

    if (selectedRun.value?.run.id === runId) {
      selectedRun.value.events.push(eventRecord);
      selectedRun.value.run.total_tokens += tokens;
    }

    enqueuePersist(async () => {
      await fetch('/api/runs/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventRecord),
      });
    });
  }

  function completeRunSession(result: CrewAiFlowResult): void {
    const runId = activeRunId.value;
    if (!runId) return;

    const now = Date.now();
    const runIdx = runs.value.findIndex((r) => r.id === runId);
    const existing = runIdx >= 0 ? runs.value[runIdx] : null;

    const elapsed =
      typeof result.elapsed_seconds === 'number'
        ? result.elapsed_seconds
        : existing
          ? Number(((now - existing.started_at) / 1000).toFixed(2))
          : 0;
    const qaScore = extractAvgStreamScore(result);
    const llmEngine =
      result.llm_engine ||
      existing?.llm_engine ||
      (typeof result.flow_name === 'string' && result.flow_name.includes('Codex')
        ? 'Codex CLI'
        : '');

    const patch: Partial<CrewRunRecord> = {
      status: 'completed',
      finished_at: now,
      elapsed_seconds: elapsed,
      llm_engine: llmEngine,
      qa_score: qaScore,
      qa_decision: result.qa_decision || '',
      portal_url: result.portal_url || '',
      result_url: result.result_url || result.portal_url || '',
      zip_url: result.zip_url || '',
      zip_filename: result.zip_filename || '',
      result_json: JSON.stringify(result),
    };

    if (existing) {
      runs.value[runIdx] = { ...existing, ...patch };
    }
    if (selectedRun.value?.run.id === runId) {
      selectedRun.value.run = { ...selectedRun.value.run, ...patch };
    }

    const totalTokensSnapshot = existing?.total_tokens ?? 0;
    activeRunId.value = null;

    enqueuePersist(async () => {
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runId,
          ...patch,
          total_tokens: totalTokensSnapshot,
        }),
      });
    });
  }

  function failRunSession(errorMessage: string): void {
    const runId = activeRunId.value;
    if (!runId) return;

    const now = Date.now();
    const runIdx = runs.value.findIndex((r) => r.id === runId);
    const existing = runIdx >= 0 ? runs.value[runIdx] : null;
    const elapsed = existing
      ? Number(((now - existing.started_at) / 1000).toFixed(2))
      : 0;

    const patch: Partial<CrewRunRecord> = {
      status: 'error',
      finished_at: now,
      elapsed_seconds: elapsed,
      error_message: errorMessage,
    };

    if (existing) {
      runs.value[runIdx] = { ...existing, ...patch };
    }
    if (selectedRun.value?.run.id === runId) {
      selectedRun.value.run = { ...selectedRun.value.run, ...patch };
    }

    const totalTokensSnapshot = existing?.total_tokens ?? 0;
    activeRunId.value = null;

    enqueuePersist(async () => {
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runId,
          ...patch,
          total_tokens: totalTokensSnapshot,
        }),
      });
    });
  }

  async function deleteRun(runId: string): Promise<void> {
    runs.value = runs.value.filter((r) => r.id !== runId);
    if (selectedRun.value?.run.id === runId) {
      selectedRun.value = runs.value[0]
        ? { run: runs.value[0], events: [] }
        : null;
    }
    await fetch(`/api/runs?id=${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    });
  }

  async function clearAllRuns(): Promise<void> {
    runs.value = [];
    selectedRun.value = null;
    await fetch('/api/runs?all=1', { method: 'DELETE' });
  }

  return {
    runs,
    selectedRun,
    activeRunId,
    loadingRuns,
    loadingDetail,
    initRunHistory,
    selectAndLoadRun,
    startRunSession,
    recordRunEvent,
    completeRunSession,
    failRunSession,
    deleteRun,
    clearAllRuns,
  };
});
