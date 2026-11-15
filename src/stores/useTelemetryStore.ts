import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AgentEvent, StoredTelemetryEvent } from '@/types/events';
import type { AgentFsmState, AgentRuntimeSnapshot } from '@/types/fsm';
import {
  RingBuffer,
  TELEMETRY_MAX_EVENTS,
  toStoredTelemetryEvent,
} from '@/services/storage/ringBuffer';

/**
 * Coarse Business Telemetry Store (Constitution Principle II & V):
 * - Capped at 200 events in memory via RingBuffer.
 * - Truncates >10KB payloads with on-demand full JSON download.
 * - NEVER stores or watches 60 FPS (x, y) pixel coordinates.
 */
export const useTelemetryStore = defineStore('telemetry', () => {
  const ringBuffer = new RingBuffer<StoredTelemetryEvent>(TELEMETRY_MAX_EVENTS);
  const eventsList = ref<StoredTelemetryEvent[]>([]);
  const agentSnapshots = ref<Record<string, AgentRuntimeSnapshot>>({});
  const totalEventsIngested = ref<number>(0);

  const bufferCount = computed(() => eventsList.value.length);
  const bufferCapacity = TELEMETRY_MAX_EVENTS;

  const totalTokensAllAgents = computed(() =>
    Object.values(agentSnapshots.value).reduce((sum, s) => sum + s.tokensUsed, 0),
  );

  function initializeAgents(agentIds: string[]): void {
    const next: Record<string, AgentRuntimeSnapshot> = {};
    for (const id of agentIds) {
      next[id] = agentSnapshots.value[id] ?? {
        id,
        fsmState: 'IDLE',
        statusText: 'Đang chờ nhiệm vụ...',
        activeToolIcon: null,
        queueDepth: 0,
        tokensUsed: 0,
        eventsProcessed: 0,
        currentFurnitureId: null,
      };
    }
    agentSnapshots.value = next;
  }

  function recordEvent(rawEvent: AgentEvent): StoredTelemetryEvent {
    const stored = toStoredTelemetryEvent(rawEvent);
    ringBuffer.push(stored);
    eventsList.value = ringBuffer.toNewestFirstArray();
    totalEventsIngested.value++;

    const current = agentSnapshots.value[rawEvent.agent_id] ?? {
      id: rawEvent.agent_id,
      fsmState: 'IDLE' as AgentFsmState,
      statusText: '',
      activeToolIcon: null,
      queueDepth: 0,
      tokensUsed: 0,
      eventsProcessed: 0,
      currentFurnitureId: null,
    };

    const addedTokens =
      typeof rawEvent.metadata?.tokens_used === 'number'
        ? rawEvent.metadata.tokens_used
        : 0;

    agentSnapshots.value[rawEvent.agent_id] = {
      ...current,
      tokensUsed: current.tokensUsed + addedTokens,
      eventsProcessed: current.eventsProcessed + 1,
    };

    return stored;
  }

  function updateAgentCoarseState(
    agentId: string,
    patch: Partial<Omit<AgentRuntimeSnapshot, 'id' | 'tokensUsed' | 'eventsProcessed'>>,
  ): void {
    const existing = agentSnapshots.value[agentId] ?? {
      id: agentId,
      fsmState: 'IDLE' as AgentFsmState,
      statusText: '',
      activeToolIcon: null,
      queueDepth: 0,
      tokensUsed: 0,
      eventsProcessed: 0,
      currentFurnitureId: null,
    };
    agentSnapshots.value[agentId] = {
      ...existing,
      ...patch,
    };
  }

  function getEventsForAgent(agentId: string): StoredTelemetryEvent[] {
    return eventsList.value.filter(
      (e) => e.agent_id === agentId || e.target_agent_id === agentId,
    );
  }

  function getLatestEventForAgent(agentId: string): StoredTelemetryEvent | undefined {
    return eventsList.value.find((e) => e.agent_id === agentId);
  }

  function downloadFullEventJson(event: StoredTelemetryEvent): void {
    const fullExport = {
      event_id: event.event_id,
      timestamp: event.timestamp,
      event_type: event.event_type,
      agent_id: event.agent_id,
      target_agent_id: event.target_agent_id,
      metadata: {
        ...event.metadata,
        input_payload: event.full_input_json
          ? safeJsonParse(event.full_input_json)
          : event.metadata.input_payload,
        output_payload: event.full_output_json
          ? safeJsonParse(event.full_output_json)
          : event.metadata.output_payload,
      },
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_id}_${event.agent_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearTelemetry(): void {
    ringBuffer.clear();
    eventsList.value = [];
    totalEventsIngested.value = 0;
    for (const id of Object.keys(agentSnapshots.value)) {
      agentSnapshots.value[id] = {
        ...agentSnapshots.value[id],
        fsmState: 'IDLE',
        statusText: 'Sẵn sàng',
        activeToolIcon: null,
        queueDepth: 0,
        tokensUsed: 0,
        eventsProcessed: 0,
      };
    }
  }

  return {
    eventsList,
    agentSnapshots,
    totalEventsIngested,
    bufferCount,
    bufferCapacity,
    totalTokensAllAgents,
    initializeAgents,
    recordEvent,
    updateAgentCoarseState,
    getEventsForAgent,
    getLatestEventForAgent,
    downloadFullEventJson,
    clearTelemetry,
  };
});

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
