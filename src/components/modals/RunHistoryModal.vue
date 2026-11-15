<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  History,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-vue-next';
import { useRunHistoryStore } from '@/stores/useRunHistoryStore';
import { useUiStore } from '@/stores/useUiStore';
import type { CrewRunRecord, CrewRunStatus } from '@/types/runHistory';

const emit = defineEmits<{
  (e: 'rerun-prompt', payload: { prompt: string; workflowId: string }): void;
}>();

const uiStore = useUiStore();
const runHistoryStore = useRunHistoryStore();

const searchQuery = ref('');
const statusFilter = ref<'ALL' | CrewRunStatus>('ALL');
const activeTab = ref<'TIMELINE' | 'RESULT_JSON'>('TIMELINE');
const expandedEventSeqs = ref<Set<number>>(new Set());
const showAttachedPreview = ref(false);

const isOpen = computed(() => uiStore.activeModal === 'RUN_HISTORY');

const filteredRuns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return runHistoryStore.runs.filter((run) => {
    if (statusFilter.value !== 'ALL' && run.status !== statusFilter.value) {
      return false;
    }
    if (!q) return true;
    return (
      run.prompt.toLowerCase().includes(q) ||
      run.workflow_name.toLowerCase().includes(q) ||
      run.llm_engine.toLowerCase().includes(q) ||
      run.attached_file_name.toLowerCase().includes(q)
    );
  });
});

const selectedDetail = computed(() => runHistoryStore.selectedRun);
const selectedRun = computed(() => selectedDetail.value?.run ?? null);
const selectedEvents = computed(() => selectedDetail.value?.events ?? []);

const parsedResultJson = computed<Record<string, unknown> | null>(() => {
  const raw = selectedRun.value?.result_json;
  if (!raw || raw === '{}') return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
});

const resultStreams = computed(() => {
  const streams = parsedResultJson.value?.streams;
  return Array.isArray(streams)
    ? (streams as Array<{
        stream_id?: string;
        name?: string;
        file?: string;
        url?: string;
        score?: number;
        verdict?: string;
      }>)
    : [];
});

const resultMetrics = computed(() => {
  const m = parsedResultJson.value?.metrics;
  return m && typeof m === 'object' ? (m as Record<string, unknown>) : null;
});

watch(isOpen, async (open) => {
  if (!open) return;
  await runHistoryStore.initRunHistory();
  if (runHistoryStore.runs.length > 0 && !runHistoryStore.selectedRun) {
    await runHistoryStore.selectAndLoadRun(runHistoryStore.runs[0].id);
  }
});

onMounted(() => {
  if (runHistoryStore.runs.length === 0) {
    void runHistoryStore.initRunHistory();
  }
});

async function handleSelectRun(run: CrewRunRecord): Promise<void> {
  expandedEventSeqs.value = new Set();
  showAttachedPreview.value = false;
  await runHistoryStore.selectAndLoadRun(run.id);
}

function toggleEventPayload(seq: number): void {
  const next = new Set(expandedEventSeqs.value);
  if (next.has(seq)) next.delete(seq);
  else next.add(seq);
  expandedEventSeqs.value = next;
}

function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatOffsetSec(eventTs: number, runStartTs: number): string {
  const delta = Math.max(0, (eventTs - runStartTs) / 1000);
  return `+${delta.toFixed(1)}s`;
}

function formatPrettyJson(raw: string): string {
  if (!raw || raw === '{}') return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function hasNonEmptyPayload(raw: string): boolean {
  return Boolean(raw && raw !== '{}' && raw.trim().length > 2);
}

function statusBadgeClass(status: CrewRunStatus): string {
  if (status === 'completed') {
    return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
  }
  if (status === 'error') {
    return 'bg-rose-500/15 border-rose-500/40 text-rose-300';
  }
  return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
}

function statusLabel(status: CrewRunStatus): string {
  if (status === 'completed') return 'Hoàn tất';
  if (status === 'error') return 'Lỗi';
  return 'Đang chạy';
}

function eventTypeBadgeClass(evType: string): string {
  switch (evType) {
    case 'AGENT_START':
      return 'bg-sky-500/15 border-sky-500/40 text-sky-300';
    case 'AGENT_TOOL_CALL':
      return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300';
    case 'AGENT_HANDOFF':
      return 'bg-violet-500/15 border-violet-500/40 text-violet-300';
    case 'AGENT_COMPLETE':
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
    case 'AGENT_ERROR':
      return 'bg-rose-500/15 border-rose-500/40 text-rose-300';
    default:
      return 'bg-slate-700/60 border-slate-600 text-slate-300';
  }
}

async function handleDeleteRun(runId: string, event: Event): Promise<void> {
  event.stopPropagation();
  await runHistoryStore.deleteRun(runId);
  if (runHistoryStore.runs.length > 0 && !runHistoryStore.selectedRun) {
    await runHistoryStore.selectAndLoadRun(runHistoryStore.runs[0].id);
  }
}

function handleRerunPrompt(): void {
  if (!selectedRun.value) return;
  emit('rerun-prompt', {
    prompt: selectedRun.value.prompt,
    workflowId: selectedRun.value.workflow_id,
  });
  uiStore.closeModal();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    @click.self="uiStore.closeModal()"
  >
    <div
      class="w-full max-w-6xl h-[86vh] flex flex-col rounded-xl bg-[#0a0f1a] border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200"
    >
      <!-- Modal Header -->
      <div
        class="flex items-center justify-between px-5 py-3.5 bg-[#0f172a] border-b border-slate-800 shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400"
          >
            <History class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              LỊCH SỬ CHẠY CREW & NHẬT KÝ PHIÊN LÀM VIỆC (SQLite)
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300"
              >
                {{ runHistoryStore.runs.length }} phiên
              </span>
            </h2>
            <p class="text-[11px] text-slate-400">
              Theo dõi chi tiết mọi phiên chạy: yêu cầu Giám đốc giao, từng bước agent xử lý,
              tokens, điểm QA và liên kết kết quả đã lưu.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
            :disabled="runHistoryStore.loadingRuns"
            @click="runHistoryStore.initRunHistory()"
          >
            <RefreshCw
              class="w-3.5 h-3.5"
              :class="{ 'animate-spin': runHistoryStore.loadingRuns }"
            />
            <span>Làm mới</span>
          </button>
          <button
            class="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
            @click="uiStore.closeModal()"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Main Master-Detail Layout -->
      <div class="flex-1 min-h-0 flex">
        <!-- Left Sidebar: Run List -->
        <aside
          class="w-[350px] shrink-0 border-r border-slate-800 bg-[#0c1322] flex flex-col min-h-0"
        >
          <!-- Search + Filter -->
          <div class="p-3 border-b border-slate-800/80 space-y-2.5 shrink-0">
            <div class="relative">
              <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm theo prompt, crew, engine..."
                class="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div class="flex items-center gap-1 flex-wrap">
              <button
                v-for="item in [
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'completed', label: 'Hoàn tất' },
                  { id: 'running', label: 'Đang chạy' },
                  { id: 'error', label: 'Lỗi' },
                ] as const"
                :key="item.id"
                class="px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer"
                :class="
                  statusFilter === item.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                "
                @click="statusFilter = item.id"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <!-- Run Items -->
          <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div
              v-if="filteredRuns.length === 0"
              class="text-center py-12 px-4 text-xs text-slate-500"
            >
              Chưa có phiên chạy nào được lưu trong SQLite. Hãy gửi yêu cầu ở thanh chat để bắt đầu!
            </div>

            <div
              v-for="run in filteredRuns"
              :key="run.id"
              class="group p-2.5 rounded-lg border transition-all cursor-pointer"
              :class="
                selectedRun?.id === run.id
                  ? 'bg-slate-800/85 border-amber-500/55 shadow-md'
                  : 'bg-slate-900/55 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              "
              @click="handleSelectRun(run)"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold"
                  :class="statusBadgeClass(run.status)"
                >
                  <CheckCircle2 v-if="run.status === 'completed'" class="w-2.5 h-2.5" />
                  <XCircle v-else-if="run.status === 'error'" class="w-2.5 h-2.5" />
                  <Loader2 v-else class="w-2.5 h-2.5 animate-spin" />
                  {{ statusLabel(run.status) }}
                </span>

                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-slate-500">
                    {{ formatDateTime(run.started_at) }}
                  </span>
                  <button
                    class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                    title="Xóa phiên này"
                    @click="handleDeleteRun(run.id, $event)"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div class="text-[10px] font-semibold text-sky-400 truncate mb-0.5">
                {{ run.workflow_name }}
              </div>
              <p class="text-xs text-slate-200 font-medium line-clamp-2 leading-snug mb-1.5">
                {{ run.prompt }}
              </p>

              <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <div class="flex items-center gap-2">
                  <span>{{ (run.total_tokens || 0).toLocaleString() }} tok</span>
                  <span v-if="run.elapsed_seconds != null">{{ run.elapsed_seconds }}s</span>
                  <span v-if="run.event_count != null">{{ run.event_count }} bước</span>
                </div>
                <span
                  v-if="run.qa_score != null"
                  class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold"
                >
                  QA {{ run.qa_score }}/10
                </span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Right Pane: Run Detail & Timeline -->
        <main class="flex-1 min-w-0 flex flex-col min-h-0 bg-[#090e18]">
          <div
            v-if="runHistoryStore.loadingDetail"
            class="flex-1 flex items-center justify-center gap-2 text-xs text-slate-400"
          >
            <Loader2 class="w-4 h-4 animate-spin text-amber-400" />
            <span>Đang tải chi tiết phiên chạy từ SQLite...</span>
          </div>

          <div
            v-else-if="!selectedRun"
            class="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 p-8 text-center"
          >
            <History class="w-10 h-10 text-slate-700" />
            <p class="text-sm font-medium text-slate-400">Chọn một phiên chạy ở cột bên trái</p>
            <p class="text-xs text-slate-500 max-w-md">
              Toàn bộ prompt, file đính kèm, nhật ký từng agent và liên kết Portal/.ZIP sẽ hiển thị
              chi tiết tại đây.
            </p>
          </div>

          <template v-else>
            <!-- Run Summary Header -->
            <div class="p-4 border-b border-slate-800 bg-[#0d1424] space-y-2.5 shrink-0">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold"
                      :class="statusBadgeClass(selectedRun.status)"
                    >
                      {{ statusLabel(selectedRun.status) }}
                    </span>
                    <span
                      class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/35 text-sky-300 text-[11px] font-semibold"
                    >
                      {{ selectedRun.workflow_name }}
                    </span>
                    <span
                      v-if="selectedRun.llm_engine"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/35 text-violet-300 text-[11px] font-mono"
                    >
                      <Cpu class="w-3 h-3" />
                      {{ selectedRun.llm_engine }}
                    </span>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 cursor-pointer"
                      title="Đưa prompt này vào ô chat để chạy lại"
                      @click="handleRerunPrompt"
                    >
                      <Play class="w-3.5 h-3.5 text-amber-400" />
                      <span>Dùng lại Prompt</span>
                    </button>

                    <a
                      v-if="selectedRun.result_url || selectedRun.portal_url"
                      :href="selectedRun.result_url || selectedRun.portal_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                      <span>Mở Portal Kết Quả</span>
                    </a>

                    <a
                      v-if="selectedRun.zip_url"
                      :href="selectedRun.zip_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Download class="w-3.5 h-3.5" />
                      <span>Tải .ZIP</span>
                    </a>
                  </div>
                </div>

                <h3 class="text-sm font-bold text-white leading-snug break-words">
                  “{{ selectedRun.prompt }}”
                </h3>

                <div
                  v-if="selectedRun.attached_file_name"
                  class="flex items-center gap-2"
                >
                  <button
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-amber-300 cursor-pointer"
                    @click="showAttachedPreview = !showAttachedPreview"
                  >
                    <FileText class="w-3 h-3" />
                    <span>Đính kèm: {{ selectedRun.attached_file_name }}</span>
                    <span class="text-slate-400">
                      ({{ showAttachedPreview ? 'Ẩn' : 'Xem trích đoạn' }})
                    </span>
                  </button>
                </div>

                <pre
                  v-if="showAttachedPreview && selectedRun.attached_file_preview"
                  class="mt-1.5 p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-28 overflow-auto whitespace-pre-wrap"
                >{{ selectedRun.attached_file_preview }}</pre>
              </div>

              <!-- Metrics Strip -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div class="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] text-slate-500">Bắt đầu</div>
                  <div class="text-xs font-mono text-slate-200">
                    {{ formatDateTime(selectedRun.started_at) }}
                  </div>
                </div>
                <div class="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] text-slate-500">Thời gian chạy</div>
                  <div class="text-xs font-mono text-slate-200 flex items-center gap-1">
                    <Clock class="w-3 h-3 text-slate-400" />
                    {{
                      selectedRun.elapsed_seconds != null
                        ? `${selectedRun.elapsed_seconds}s`
                        : 'Đang chạy...'
                    }}
                  </div>
                </div>
                <div class="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] text-slate-500">Tổng Tokens</div>
                  <div class="text-xs font-mono text-emerald-300 font-semibold">
                    {{ (selectedRun.total_tokens || 0).toLocaleString() }} tok
                  </div>
                </div>
                <div class="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] text-slate-500">Số bước sự kiện</div>
                  <div class="text-xs font-mono text-sky-300 font-semibold">
                    {{ selectedEvents.length }} bước
                  </div>
                </div>
                <div class="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800">
                  <div class="text-[10px] text-slate-500">Đánh giá QA</div>
                  <div class="text-xs font-mono text-amber-300 font-semibold truncate">
                    {{
                      selectedRun.qa_score != null
                        ? `${selectedRun.qa_score}/10 ${selectedRun.qa_decision ? `(${selectedRun.qa_decision})` : ''}`
                        : '—'
                    }}
                  </div>
                </div>
              </div>

              <!-- Error Banner if Failed -->
              <div
                v-if="selectedRun.error_message"
                class="px-3 py-2 rounded bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200"
              >
                <strong class="font-semibold">Lỗi phiên chạy:</strong>
                {{ selectedRun.error_message }}
              </div>

              <!-- Optional Streams (Game Factory) or Metrics (E-Learning) -->
              <div v-if="resultStreams.length > 0" class="flex flex-wrap gap-2">
                <a
                  v-for="(stream, idx) in resultStreams"
                  :key="stream.stream_id || idx"
                  :href="stream.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
                >
                  <Sparkles class="w-3 h-3 text-emerald-400" />
                  <span class="font-medium">{{ stream.name || stream.file }}</span>
                  <span
                    v-if="stream.score != null"
                    class="px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]"
                  >
                    {{ stream.score }}/10
                  </span>
                  <ExternalLink class="w-3 h-3 text-slate-400" />
                </a>
              </div>

              <div v-else-if="resultMetrics" class="flex flex-wrap gap-2">
                <span
                  v-for="(val, key) in resultMetrics"
                  :key="key"
                  class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono"
                >
                  {{ key }}: <strong class="text-sky-300">{{ val }}</strong>
                </span>
              </div>
            </div>

            <!-- Tabs Header -->
            <div class="flex items-center gap-2 px-4 pt-2.5 border-b border-slate-800 bg-[#0b1120] shrink-0">
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer"
                :class="
                  activeTab === 'TIMELINE'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                "
                @click="activeTab = 'TIMELINE'"
              >
                <Layers class="w-3.5 h-3.5" />
                <span>Nhật Ký Thực Thi Từng Bước ({{ selectedEvents.length }})</span>
              </button>

              <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer"
                :class="
                  activeTab === 'RESULT_JSON'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                "
                @click="activeTab = 'RESULT_JSON'"
              >
                <FileCode2 class="w-3.5 h-3.5" />
                <span>Dữ Liệu Kết Quả (JSON)</span>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="activeTab === 'TIMELINE'" class="space-y-2">
                <div
                  v-if="selectedEvents.length === 0"
                  class="text-center py-8 text-xs text-slate-500"
                >
                  Chưa có sự kiện nào được ghi nhận cho phiên này.
                </div>

                <div
                  v-for="ev in selectedEvents"
                  :key="`${ev.run_id}_${ev.seq}`"
                  class="rounded-lg bg-slate-900/75 border border-slate-800/90 p-3 hover:border-slate-700 transition-colors"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-[10px] font-mono text-slate-500 w-7">
                        #{{ ev.seq }}
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold"
                        :class="eventTypeBadgeClass(ev.event_type)"
                      >
                        {{ ev.event_type }}
                      </span>
                      <span class="text-xs font-semibold text-white">
                        {{ ev.agent_name || ev.agent_id }}
                      </span>
                      <span
                        v-if="ev.target_agent_id"
                        class="text-[11px] font-mono text-violet-300"
                      >
                        → {{ ev.target_agent_id }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                      <span v-if="ev.tokens_used > 0" class="text-emerald-400">
                        +{{ ev.tokens_used }} tok
                      </span>
                      <span class="text-slate-400">
                        {{ formatOffsetSec(ev.timestamp, selectedRun.started_at) }}
                      </span>
                      <button
                        v-if="hasNonEmptyPayload(ev.payload_json)"
                        class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer"
                        @click="toggleEventPayload(ev.seq)"
                      >
                        {{ expandedEventSeqs.has(ev.seq) ? 'Ẩn Payload' : 'Xem Payload' }}
                      </button>
                    </div>
                  </div>

                  <p class="mt-1.5 pl-9 text-xs text-slate-300 leading-relaxed">
                    {{ ev.status_text }}
                  </p>

                  <pre
                    v-if="expandedEventSeqs.has(ev.seq) && hasNonEmptyPayload(ev.payload_json)"
                    class="mt-2 ml-9 p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-200 overflow-x-auto max-h-64"
                  >{{ formatPrettyJson(ev.payload_json) }}</pre>
                </div>
              </div>

              <div v-else class="space-y-2">
                <pre
                  v-if="parsedResultJson"
                  class="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-sky-200 overflow-auto"
                >{{ JSON.stringify(parsedResultJson, null, 2) }}</pre>
                <div v-else class="text-center py-8 text-xs text-slate-500">
                  Phiên này chưa có dữ liệu result_json hoàn chỉnh.
                </div>
              </div>
            </div>
          </template>
        </main>
      </div>
    </div>
  </div>
</template>
