<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  RotateCcw,
  FileCode2,
  Database,
  History,
  Paperclip,
  Send,
  X,
  ExternalLink,
  Download,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-vue-next';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useUiStore } from '@/stores/useUiStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useRunHistoryStore } from '@/stores/useRunHistoryStore';
import type { TransportMode } from '@/services/storage/localConfig';

export interface CrewFlowDispatchPayload {
  prompt: string;
  attachedFileName: string;
  attachedFileContent: string;
}

defineProps<{
  isSimRunning: boolean;
}>();

const emit = defineEmits<{
  (e: 'changeScenario', workflowId: string): void;
  (e: 'switchTransport', mode: TransportMode, wsUrl?: string): void;
  (e: 'dispatchCrewFlow', payload: CrewFlowDispatchPayload): void;
}>();

const settingsStore = useSettingsStore();
const telemetryStore = useTelemetryStore();
const uiStore = useUiStore();
const workflowStore = useWorkflowStore();
const runHistoryStore = useRunHistoryStore();

const chatInput = ref<string>(uiStore.crewAiPrompt || '');

watch(
  () => uiStore.crewAiPrompt,
  (next) => {
    if (next && next !== chatInput.value) {
      chatInput.value = next;
    }
  },
);
const attachedFileName = ref<string>('');
const attachedFileContent = ref<string>('');
const attachedFileSize = ref<number>(0);
const fileInputRef = ref<HTMLInputElement | null>(null);

function handleWorkflowChange(e: Event): void {
  const selectEl = e.target as HTMLSelectElement;
  const wfId = selectEl.value;
  emit('changeScenario', wfId);
}

function toggleSpeed(): void {
  const nextSpeed = settingsStore.settings.simulationSpeed === 1 ? 2 : 1;
  settingsStore.updateSettings({ simulationSpeed: nextSpeed });
}

function triggerFilePicker(): void {
  fileInputRef.value?.click();
}

async function handleFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    attachedFileName.value = file.name;
    attachedFileContent.value = text;
    attachedFileSize.value = file.size;
    if (!chatInput.value.trim()) {
      const firstNonEmpty = text
        .split(/\r?\n/)
        .map((line) => line.replace(/^[#*-\s]+/, '').trim())
        .find((line) => line.length > 0);
      chatInput.value = firstNonEmpty
        ? firstNonEmpty.slice(0, 90)
        : file.name.replace(/\.[^.]+$/, '');
    }
    uiStore.showToast(
      `📎 Đã đính kèm file "${file.name}" (${Math.max(1, Math.round(file.size / 1024))} KB)`,
      'info',
      2400,
    );
  } catch {
    uiStore.showToast('Không thể đọc nội dung file đính kèm.', 'error', 2600);
  } finally {
    input.value = '';
  }
}

function clearAttachedFile(): void {
  attachedFileName.value = '';
  attachedFileContent.value = '';
  attachedFileSize.value = 0;
}

function submitCrewFlow(): void {
  if (uiStore.crewAiFlowRunning) return;
  const promptText = chatInput.value.trim();
  if (!promptText && !attachedFileContent.value.trim()) {
    uiStore.showToast(
      'Vui lòng nhập nội dung yêu cầu hoặc đính kèm file tài liệu trước khi bấm Chạy Flow!',
      'warning',
      3000,
    );
    return;
  }

  const finalPrompt =
    promptText ||
    attachedFileName.value.replace(/\.[^.]+$/, '') ||
    'Yêu cầu từ tài liệu đính kèm';

  emit('dispatchCrewFlow', {
    prompt: finalPrompt,
    attachedFileName: attachedFileName.value,
    attachedFileContent: attachedFileContent.value,
  });
}

function handleInputKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitCrewFlow();
  }
}
</script>

<template>
  <div
    class="fixed bottom-3 left-3 right-[84px] xl:left-1/2 xl:right-auto xl:-translate-x-1/2 xl:w-[min(920px,calc(100vw-190px))] z-20 hud-panel rounded-xl px-3.5 py-2.5 flex flex-col gap-2 pointer-events-auto shadow-2xl border border-[#334155]"
  >
    <!-- ROW 1: Active Department Selector (SQLite) + CrewAI Endpoint + Speed / Utilities -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-1.5 min-w-0">
        <span
          class="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#020617] border border-[#334155] text-[10px] font-mono text-[#38BDF8]"
          title="Lưu trữ bền vững trong SQLite (data/pixel_office.sqlite)"
        >
          <Database class="w-3 h-3 text-[#22C55E]" />
          <span>SQLite ({{ workflowStore.workflows.length }})</span>
        </span>

        <select
          :value="workflowStore.activeWorkflowId"
          class="bg-[#020617] border border-[#334155] rounded-md px-2.5 py-1 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] cursor-pointer max-w-[340px] font-semibold"
          title="Chọn phòng ban CrewAI để nhận yêu cầu và chạy trực tiếp"
          @change="handleWorkflowChange"
        >
          <option
            v-for="wf in workflowStore.workflows"
            :key="wf.id"
            :value="wf.id"
          >
            {{
              wf.name.toLowerCase().includes('agent')
                ? wf.name
                : `${wf.name} (${wf.blueprint.agents.length} Agents)`
            }}
          </option>
        </select>

        <span
          v-if="workflowStore.activeWorkflow?.crew_endpoint_url"
          class="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-[#020617] border border-[#38BDF8]/40 text-[10px] font-mono text-[#38BDF8]"
          :title="`Mọi yêu cầu từ ô chat bên dưới sẽ bắn thẳng vào Crew tại: ${workflowStore.activeWorkflow.crew_endpoint_url}`"
        >
          <span>🔗 {{ workflowStore.activeWorkflow.crew_endpoint_url }}</span>
        </span>
      </div>

      <!-- Right Utility Controls -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="hud-btn !py-1 !px-2.5 text-xs border-[#38BDF8]/50 text-[#38BDF8]"
          title="Mở trình quản lý Quy trình, Ô chat tạo phòng ban mới & Tài liệu kỹ thuật kết nối CrewAI"
          @click="uiStore.openModal('COMPILER')"
        >
          <FileCode2 class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Tài Liệu Kết Nối &amp; Quy Trình</span>
        </button>

        <button
          type="button"
          class="hud-btn !py-1 !px-2.5 text-xs border-amber-500/45 text-amber-300"
          title="Xem chi tiết Lịch Sử Chạy các phiên Crew (SQLite)"
          @click="uiStore.openModal('RUN_HISTORY')"
        >
          <History class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Lịch Sử ({{ runHistoryStore.runs.length }})</span>
        </button>

        <button
          type="button"
          class="px-2 py-1 rounded bg-[#1E293B] border border-[#334155] font-mono text-[11px] text-[#F8FAFC] hover:border-[#38BDF8] cursor-pointer"
          title="Tốc độ di chuyển & thực thi"
          @click="toggleSpeed"
        >
          {{ settingsStore.settings.simulationSpeed }}x Speed
        </button>

        <button
          type="button"
          class="p-1.5 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
          title="Xóa lịch sử Ring Buffer"
          @click="
            telemetryStore.clearTelemetry();
            uiStore.showToast('Đã làm mới bộ đệm Telemetry Ring Buffer', 'info', 2000);
          "
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- ROW 2: Direct Chat Input + File Attachment + Send (Run Flow) -->
    <div class="flex flex-col gap-1.5">
      <!-- Attached File Badge (when a file is attached) -->
      <div
        v-if="attachedFileName"
        class="flex items-center justify-between gap-2 px-2.5 py-1 rounded-md bg-[#0F172A] border border-[#38BDF8]/50 text-xs text-[#E2E8F0]"
      >
        <div class="flex items-center gap-2 min-w-0">
          <FileText class="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span class="font-mono text-[11px] text-[#38BDF8] truncate">
            {{ attachedFileName }}
          </span>
          <span class="text-[10px] font-mono text-[#94A3B8] shrink-0">
            ({{ Math.max(1, Math.round(attachedFileSize / 1024)) }} KB •
            {{ attachedFileContent.length.toLocaleString() }} ký tự)
          </span>
        </div>
        <button
          type="button"
          class="text-[#94A3B8] hover:text-[#EF4444] cursor-pointer p-0.5"
          title="Gỡ file đính kèm"
          @click="clearAttachedFile"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Main Chat Input & Run Flow Bar -->
      <div class="flex items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.md,.csv,.json,.html,.py,.ts,.log"
          class="hidden"
          @change="handleFileChange"
        />

        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155] hover:border-[#38BDF8] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer shrink-0"
          title="Đính kèm file nội dung bài học / tài liệu đầu vào (.txt, .md, .csv, .json...)"
          @click="triggerFilePicker"
        >
          <Paperclip class="w-3.5 h-3.5 text-[#38BDF8]" />
          <span class="hidden sm:inline">Đính kèm file</span>
        </button>

        <div class="relative flex-1 min-w-0">
          <input
            v-model="chatInput"
            type="text"
            :disabled="uiStore.crewAiFlowRunning"
            :placeholder="`Nhập nội dung / chủ đề gửi thẳng vào ${workflowStore.activeWorkflow?.name || 'CrewAI'} (VD: Các vùng kinh tế biển Việt Nam)...`"
            class="w-full bg-[#020617] border border-[#334155] focus:border-[#38BDF8] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none font-sans disabled:opacity-60"
            @keydown="handleInputKeydown"
          />
        </div>

        <button
          type="button"
          :disabled="uiStore.crewAiFlowRunning"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md"
          :class="
            uiStore.crewAiFlowRunning
              ? 'bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/50 cursor-wait'
              : 'bg-[#22C55E] hover:bg-[#16A34A] text-[#020617]'
          "
          title="Gửi yêu cầu và kích hoạt chạy thẳng luồng CrewAI của phòng ban đang chọn"
          @click="submitCrewFlow"
        >
          <Loader2
            v-if="uiStore.crewAiFlowRunning"
            class="w-3.5 h-3.5 animate-spin"
          />
          <Send v-else class="w-3.5 h-3.5" />
          <span>{{
            uiStore.crewAiFlowRunning ? 'Đang Chạy Flow...' : 'Gửi & Chạy Flow'
          }}</span>
        </button>
      </div>
    </div>

    <!-- ROW 3: Live Output Result Banner (Portal Site & ZIP Download) -->
    <div
      v-if="uiStore.crewAiResult"
      class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#22C55E]/50 text-xs"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Sparkles class="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
        <span class="text-[#4ADE80] font-semibold truncate">
          Hoàn tất ({{ uiStore.crewAiResult.elapsed_seconds }}s):
          "{{ uiStore.crewAiResult.topic || uiStore.crewAiResult.prompt }}"
        </span>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="uiStore.crewAiResult.result_url || uiStore.crewAiResult.portal_url"
          :href="uiStore.crewAiResult.result_url || uiStore.crewAiResult.portal_url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#020617] font-bold text-[11px] transition-colors"
        >
          <ExternalLink class="w-3 h-3" />
          <span>Mở Site Kết Quả (Portal)</span>
        </a>

        <a
          v-if="uiStore.crewAiResult.zip_url"
          :href="uiStore.crewAiResult.zip_url"
          download
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#22C55E] hover:bg-[#16A34A] text-[#020617] font-bold text-[11px] transition-colors"
        >
          <Download class="w-3 h-3" />
          <span>Tải Trọn Bộ .ZIP</span>
        </a>

        <button
          type="button"
          class="text-[#94A3B8] hover:text-[#F8FAFC] p-0.5 cursor-pointer"
          title="Đóng thông báo kết quả"
          @click="uiStore.crewAiResult = null"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
