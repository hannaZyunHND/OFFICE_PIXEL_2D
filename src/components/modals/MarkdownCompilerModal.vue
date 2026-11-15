<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  X,
  Sparkles,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Database,
  FileCode2,
  Copy,
  Download,
  Plus,
  Trash2,
  MessageSquarePlus,
  Building2,
  Play,
  BookOpen,
  Terminal,
  FileDown,
  Send,
  Link2,
} from 'lucide-vue-next';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { extractTopologyFromMarkdown } from '@/services/compiler/llmTopologyExtractor';
import { generateDeterministicBlueprint } from '@/services/compiler/deterministicLayoutEngine';
import {
  generateCrewAiIntegrationDoc,
  synthesizeSimulationStepsForBlueprint,
  parseChatOrMarkdownRequirement,
  extractEndpointUrlFromPrompt,
  stripEndpointUrlFromPrompt,
  type StoredWorkflowRecord,
} from '@/services/compiler/workflowGenerator';
import {
  CREWAI_INPUT_SPEC_TEXT,
  CREWAI_OUTPUT_SPEC_TEXT,
  CREWAI_MASTER_PROMPT_FOR_DEVS,
  STANDALONE_PYTHON_CONNECTOR_CODE,
} from '@/services/compiler/crewAiDeveloperGuide';

const emit = defineEmits<{
  (e: 'run-compiled-simulation', workflowId: string): void;
  (e: 'workflow-selected', workflowId: string): void;
}>();

const uiStore = useUiStore();
const settingsStore = useSettingsStore();
const workflowStore = useWorkflowStore();

// When true, the user clicked "+ Tạo Quy Trình Mới": left inputs are empty AND right panel is empty
const isCreatingNewDraft = ref<boolean>(false);

const chatPromptInput = ref<string>('');
const customWorkflowTitle = ref<string>('');
const isCompiling = ref<boolean>(false);
const compileError = ref<string | null>(null);
const rightTab = ref<'DOC' | 'BLUEPRINT'>('DOC');
const copiedDoc = ref<boolean>(false);

// Popup "Hướng dẫn kỹ thuật" state
const showTechGuidePopup = ref<boolean>(false);
const techGuideTab = ref<'PROMPT' | 'INPUT' | 'OUTPUT' | 'PYTHON'>('PROMPT');
const copiedGuideText = ref<boolean>(false);

const currentWorkflow = computed<StoredWorkflowRecord | undefined>(() => {
  if (isCreatingNewDraft.value) return undefined;
  return workflowStore.activeWorkflow;
});

const detectedEndpointUrl = computed<string | null>(() =>
  extractEndpointUrlFromPrompt(chatPromptInput.value),
);

// Sync left panel with active workflow when not in "Create New Draft" mode
watch(
  () => workflowStore.activeWorkflowId,
  () => {
    if (!isCreatingNewDraft.value && workflowStore.activeWorkflow) {
      customWorkflowTitle.value = workflowStore.activeWorkflow.name;
      chatPromptInput.value = workflowStore.activeWorkflow.raw_requirement;
    }
  },
  { immediate: true },
);

function handleSelectExistingWorkflow(workflowId: string): void {
  isCreatingNewDraft.value = false;
  compileError.value = null;
  const wf = workflowStore.activateWorkflow(workflowId);
  if (!wf) return;
  customWorkflowTitle.value = wf.name;
  chatPromptInput.value = wf.raw_requirement;
  emit('workflow-selected', wf.id);
  uiStore.showToast(
    `Đã load phòng ban "${wf.name}" (${wf.blueprint.agents.length} Agents • ${wf.crew_endpoint_url}) từ SQLite!`,
    'info',
    2800,
  );
}

/**
 * Enters "Tạo Quy Trình Mới" mode:
 * - Clears both left inputs (Tên quy trình & Nội dung yêu cầu = trống)
 * - Clears right panel (Tài liệu & Sơ đồ bên phải = trống, không bị lẫn với quy trình cũ)
 */
function startNewWorkflowDraft(): void {
  isCreatingNewDraft.value = true;
  customWorkflowTitle.value = '';
  chatPromptInput.value = '';
  compileError.value = null;
}

function fillQuickPromptExample(kind: 'AUDIT' | 'ECOM' | 'MARKETING'): void {
  compileError.value = null;
  if (kind === 'AUDIT') {
    customWorkflowTitle.value = 'Đội Kiểm Toán & Phân Tích Tài Chính (6 Agents)';
    chatPromptInput.value =
      'URL kết nối: ws://localhost:8768/audit-crew\nĐội Kiểm Toán & Phân Tích Tài Chính (6 Agents): Thu thập báo cáo, Phân tích định lượng, Định giá tài sản, Dự báo rủi ro, Kiểm toán độc lập QA, Giám đốc phê duyệt';
  } else if (kind === 'ECOM') {
    customWorkflowTitle.value = 'Phòng Vận Hành E-Commerce Tự Động (5 Agents)';
    chatPromptInput.value =
      'URL kết nối: ws://localhost:8769/ecom-crew\nPhòng Vận Hành E-Commerce Tự Động (5 Agents): Tư vấn sản phẩm, Kiểm tra kho vận, Xử lý cổng thanh toán, Kiểm duyệt chống gian lận QA, Quản lý phê duyệt đơn';
  } else {
    customWorkflowTitle.value = 'Phòng Sáng Tạo Nội Dung & SEO CrewAI (5 Agents)';
    chatPromptInput.value =
      'URL kết nối: ws://localhost:8770/marketing-crew\nPhòng Sáng Tạo Nội Dung & SEO CrewAI (5 Agents): Nghiên cứu từ khóa, Lập dàn ý chiến lược, Biên tập nội dung bài viết, Thiết kế truyền thông, Biên tập viên Kiểm duyệt QA';
  }
}

/**
 * Compiles the Chat Requirement (requiring a valid CrewAI Endpoint URL inside the prompt)
 * into a new Department Blueprint, generates its Technical Integration Doc + Simulation Steps,
 * saves to SQLite, exits draft mode, and displays the newly generated workflow on the right!
 */
async function compileAndSaveToSqlite(runImmediately = false): Promise<void> {
  const rawText = chatPromptInput.value.trim();
  if (!rawText) {
    compileError.value =
      'Vui lòng nhập yêu cầu tạo phòng ban mới vào Ô Chat Yêu Cầu.';
    return;
  }

  const endpointUrl = extractEndpointUrlFromPrompt(rawText);
  if (!endpointUrl) {
    compileError.value =
      'Bắt buộc phải có URL kết nối CrewAI trong nội dung Prompt (ví dụ: URL kết nối: ws://localhost:8768/audit-crew) để hệ thống biết nhận dữ liệu từ Crew nào!';
    return;
  }

  isCompiling.value = true;
  compileError.value = null;

  try {
    const cleanedRequirement = stripEndpointUrlFromPrompt(rawText);
    let topology = parseChatOrMarkdownRequirement(rawText);

    // If user configured a live Gemini or OpenAI API key, try LLM extraction first
    const hasApiKey =
      (settingsStore.settings.llmProvider === 'gemini' &&
        settingsStore.settings.geminiApiKey.trim()) ||
      (settingsStore.settings.llmProvider === 'openai' &&
        settingsStore.settings.openaiApiKey.trim());

    if (hasApiKey) {
      try {
        const res = await extractTopologyFromMarkdown(
          cleanedRequirement || rawText,
          settingsStore.settings,
          false,
        );
        topology = res.topology;
      } catch {
        // Fallback to deterministic parser already computed in `topology`
      }
    }

    if (customWorkflowTitle.value.trim()) {
      topology.project_name = customWorkflowTitle.value.trim();
    }

    const blueprint = generateDeterministicBlueprint(topology);
    const wfName = customWorkflowTitle.value.trim() || blueprint.meta.project_name;
    blueprint.meta.project_name = wfName;

    const steps = synthesizeSimulationStepsForBlueprint(blueprint);
    const newId = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const integrationDoc = generateCrewAiIntegrationDoc(
      blueprint,
      newId,
      rawText,
      endpointUrl,
    );

    const record: StoredWorkflowRecord = {
      id: newId,
      name: wfName,
      description: `Mô hình phòng ban ${blueprint.agents.length} Agents (${blueprint.meta.grid_cols}x${blueprint.meta.grid_rows} tiles) • Kết nối: ${endpointUrl}`,
      crew_endpoint_url: endpointUrl,
      raw_requirement: rawText,
      blueprint,
      steps,
      integration_doc_md: integrationDoc,
      created_at: Date.now(),
    };

    isCreatingNewDraft.value = false;
    await workflowStore.saveAndActivateWorkflow(record);
    customWorkflowTitle.value = record.name;
    chatPromptInput.value = record.raw_requirement;
    emit('workflow-selected', record.id);
    rightTab.value = 'DOC';

    uiStore.showToast(
      `Đã tạo & lưu "${record.name}" (${blueprint.agents.length} Agents • ${endpointUrl}) vào SQLite!`,
      'success',
      3800,
    );

    if (runImmediately) {
      uiStore.closeModal();
      setTimeout(() => {
        emit('run-compiled-simulation', record.id);
      }, 150);
    }
  } catch (err) {
    compileError.value =
      err instanceof Error ? err.message : 'Lỗi khi tạo mô hình phòng ban mới.';
  } finally {
    isCompiling.value = false;
  }
}

async function copyIntegrationDoc(): Promise<void> {
  if (!currentWorkflow.value) return;
  try {
    await navigator.clipboard.writeText(currentWorkflow.value.integration_doc_md);
    copiedDoc.value = true;
    setTimeout(() => {
      copiedDoc.value = false;
    }, 2000);
  } catch {
    // Ignore clipboard error
  }
}

function downloadIntegrationDoc(): void {
  if (!currentWorkflow.value) return;
  const blob = new Blob([currentWorkflow.value.integration_doc_md], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentWorkflow.value.id}_crewai_integration.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyGuideSectionText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copiedGuideText.value = true;
    setTimeout(() => {
      copiedGuideText.value = false;
    }, 2000);
  } catch {
    // Ignore clipboard error
  }
}

function loadAndRunActiveWorkflow(): void {
  if (!currentWorkflow.value) return;
  const id = currentWorkflow.value.id;
  workflowStore.activateWorkflow(id);
  emit('workflow-selected', id);
  uiStore.closeModal();
  setTimeout(() => {
    emit('run-compiled-simulation', id);
  }, 150);
}
</script>

<template>
  <div
    v-if="uiStore.activeModal === 'COMPILER'"
    class="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
    @click.self="uiStore.closeModal()"
  >
    <div
      class="hud-panel rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-[#38BDF8]/50 shadow-2xl"
    >
      <!-- Modal Header -->
      <div
        class="px-5 py-3.5 border-b border-[#334155] flex items-center justify-between bg-[#0F172A]"
      >
        <div class="flex items-center gap-2.5 flex-wrap">
          <Sparkles class="w-4 h-4 text-[#38BDF8]" />
          <h2 class="font-pixel text-xs sm:text-sm text-[#F8FAFC]">
            TRÌNH QUẢN LÝ QUY TRÌNH PHÒNG BAN (SQLITE) &amp; TÀI LIỆU KẾT NỐI CREWAI
          </h2>
          <span
            class="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/40"
          >
            <Database class="w-3 h-3" />
            <span>SQLite: {{ workflowStore.workflows.length }} Quy trình</span>
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Link: Hướng dẫn kỹ thuật (Opens Popup) -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/50 text-[#38BDF8] hover:bg-[#38BDF8]/25 text-xs font-semibold cursor-pointer transition-colors"
            @click="showTechGuidePopup = true"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span class="underline underline-offset-2">Hướng dẫn kỹ thuật</span>
          </button>

          <button
            type="button"
            class="p-1 rounded-md text-[#94A3B8] hover:text-white cursor-pointer"
            @click="uiStore.closeModal()"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Saved SQLite Workflows Strip (Click any workflow to immediately load its Department & View Connection Doc) -->
      <div
        class="px-5 py-2.5 bg-[#020617]/90 border-b border-[#334155] flex items-center gap-2 overflow-x-auto"
      >
        <span class="text-[11px] font-mono text-[#94A3B8] shrink-0 flex items-center gap-1">
          <Building2 class="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Phòng ban đã lưu (SQLite):</span>
        </span>

        <div
          v-for="wf in workflowStore.workflows"
          :key="wf.id"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer"
          :class="
            !isCreatingNewDraft && wf.id === workflowStore.activeWorkflowId
              ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#F8FAFC]'
              : 'bg-[#1E293B]/70 border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#475569]'
          "
          :title="`Endpoint: ${wf.crew_endpoint_url}`"
          @click="handleSelectExistingWorkflow(wf.id)"
        >
          <span class="truncate max-w-[190px]">{{ wf.name }}</span>
          <span class="px-1.5 py-0.2 rounded bg-[#020617] text-[10px] font-mono text-[#38BDF8]">
            {{ wf.blueprint.agents.length }}A
          </span>
          <button
            v-if="workflowStore.workflows.length > 1 && wf.id.startsWith('wf_')"
            type="button"
            class="text-[#94A3B8] hover:text-[#EF4444] ml-0.5 cursor-pointer"
            title="Xóa quy trình này khỏi SQLite"
            @click.stop="workflowStore.deleteWorkflow(wf.id)"
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-all"
          :class="
            isCreatingNewDraft
              ? 'bg-[#22C55E] border-[#22C55E] text-[#020617] shadow-lg'
              : 'bg-[#22C55E]/15 border-[#22C55E]/50 text-[#4ADE80] hover:bg-[#22C55E]/25'
          "
          @click="startNewWorkflowDraft"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Tạo Quy Trình Mới</span>
        </button>
      </div>

      <!-- Main Two-Column Studio Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Left Column (5 cols): ONLY Option 1 - Ô Chat Yêu Cầu Tạo Phòng Ban / Quy Trình Mới -->
        <div class="lg:col-span-5 flex flex-col">
          <div
            class="flex-1 rounded-xl bg-[#1E293B]/70 border p-4 flex flex-col justify-between gap-3.5 transition-colors"
            :class="
              isCreatingNewDraft
                ? 'border-[#22C55E]/70 bg-[#1E293B]/90'
                : 'border-[#38BDF8]/40'
            "
          >
            <div class="space-y-3">
              <!-- Title + Link "Hướng dẫn kỹ thuật" -->
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <MessageSquarePlus class="w-4 h-4" />
                  <span>Ô Chat Yêu Cầu Tạo Phòng Ban / Quy Trình Mới</span>
                  <span
                    v-if="isCreatingNewDraft"
                    class="px-1.5 py-0.5 rounded bg-[#22C55E]/20 border border-[#22C55E]/50 text-[10px] font-mono text-[#4ADE80]"
                  >
                    Đang tạo mới
                  </span>
                </label>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] hover:text-[#FBBF24] underline underline-offset-2 cursor-pointer"
                  @click="showTechGuidePopup = true"
                >
                  <BookOpen class="w-3.5 h-3.5" />
                  <span>Hướng dẫn kỹ thuật</span>
                </button>
              </div>

              <p class="text-[11px] text-[#94A3B8] leading-relaxed">
                Nhập mô tả phòng ban kèm <strong class="text-[#FBBF24]">URL kết nối CrewAI (bắt buộc)</strong> vào ô bên dưới. Hệ thống sẽ biết nhận dữ liệu từ Crew nào, tự động dựng phòng ban 2D vào <strong class="text-[#4ADE80]">SQLite</strong> và xuất bản <strong class="text-[#38BDF8]">Tài liệu Kỹ thuật Kết nối</strong>.
              </p>

              <!-- Department Name Input -->
              <div class="space-y-1">
                <span class="text-[11px] font-medium text-[#CBD5E1]">
                  Tên quy trình / phòng ban (tùy chọn):
                </span>
                <input
                  v-model="customWorkflowTitle"
                  type="text"
                  placeholder="VD: Đội Kiểm Toán AI 6 Agents (Để trống sẽ tự trích xuất từ yêu cầu)..."
                  class="w-full rounded-lg bg-[#020617] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <!-- Quick Sample Prompts -->
              <div class="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                <span class="text-[11px] font-medium text-[#CBD5E1]">
                  Nội dung yêu cầu (Bắt buộc kèm URL kết nối CrewAI):
                </span>
                <div class="flex items-center gap-2 text-[11px] font-mono">
                  <button
                    type="button"
                    class="text-[#38BDF8] hover:underline cursor-pointer"
                    @click="fillQuickPromptExample('AUDIT')"
                  >
                    + Mẫu Kiểm Toán (6A)
                  </button>
                  <button
                    type="button"
                    class="text-[#4ADE80] hover:underline cursor-pointer"
                    @click="fillQuickPromptExample('ECOM')"
                  >
                    + Mẫu E-Com (5A)
                  </button>
                  <button
                    type="button"
                    class="text-[#C084FC] hover:underline cursor-pointer"
                    @click="fillQuickPromptExample('MARKETING')"
                  >
                    + Mẫu Marketing (5A)
                  </button>
                </div>
              </div>

              <!-- Unified Chat Requirement Textarea (Must contain URL kết nối: ws://...) -->
              <textarea
                v-model="chatPromptInput"
                rows="6"
                placeholder="Nhập yêu cầu tạo phòng ban mới tại đây (Bắt buộc có dòng URL kết nối). Ví dụ:&#10;URL kết nối: ws://localhost:8768/audit-crew&#10;Đội Kiểm Toán & Phân Tích Tài Chính (6 Agents): Thu thập báo cáo, Phân tích định lượng, Định giá tài sản, Dự báo rủi ro, Kiểm toán độc lập QA, Giám đốc phê duyệt"
                class="w-full rounded-lg bg-[#020617] border border-[#334155] p-3 font-mono text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] leading-relaxed resize-none"
              />

              <!-- Live Detected CrewAI Endpoint URL Status Bar -->
              <div
                class="px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-[11px] font-mono"
                :class="
                  detectedEndpointUrl
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#4ADE80]'
                    : 'bg-[#F59E0B]/10 border-[#F59E0B]/50 text-[#FBBF24]'
                "
              >
                <div class="flex items-center gap-1.5 truncate">
                  <Link2 class="w-3.5 h-3.5 shrink-0" />
                  <span v-if="detectedEndpointUrl" class="truncate">
                    URL Kết nối CrewAI: <strong>{{ detectedEndpointUrl }}</strong>
                  </span>
                  <span v-else>
                    ⚠️ Bắt buộc nhập kèm URL kết nối trong Prompt (VD: <code>URL kết nối: ws://localhost:8768/ten-crew</code>)
                  </span>
                </div>
                <span
                  v-if="detectedEndpointUrl"
                  class="px-1.5 py-0.5 rounded bg-[#020617] text-[10px] text-[#4ADE80] shrink-0"
                >
                  Hợp lệ ✓
                </span>
              </div>

              <!-- Optional AI API Key Config -->
              <div
                class="p-2.5 rounded-lg bg-[#020617]/80 border border-[#334155] flex items-center gap-2 text-[11px]"
              >
                <KeyRound class="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                <select
                  v-model="settingsStore.settings.llmProvider"
                  class="bg-[#0F172A] border border-[#334155] rounded px-2 py-1 text-[11px] text-[#F8FAFC] font-mono"
                >
                  <option value="gemini">Gemini API</option>
                  <option value="openai">OpenAI API</option>
                </select>
                <input
                  v-if="settingsStore.settings.llmProvider === 'gemini'"
                  v-model="settingsStore.settings.geminiApiKey"
                  type="password"
                  placeholder="Gemini API Key (Tùy chọn - Để trống dùng Offline AI Compiler)..."
                  class="flex-1 bg-[#0F172A] border border-[#334155] rounded px-2.5 py-1 text-[11px] font-mono text-[#F8FAFC]"
                />
                <input
                  v-else
                  v-model="settingsStore.settings.openaiApiKey"
                  type="password"
                  placeholder="OpenAI API Key (Tùy chọn)..."
                  class="flex-1 bg-[#0F172A] border border-[#334155] rounded px-2.5 py-1 text-[11px] font-mono text-[#F8FAFC]"
                />
              </div>

              <div
                v-if="compileError"
                class="flex items-center gap-2 p-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#F87171]"
              >
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{{ compileError }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 flex-wrap pt-2 border-t border-[#334155]/70">
              <button
                type="button"
                :disabled="isCompiling"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#38BDF8] text-[#020617] font-bold text-xs hover:bg-[#0EA5E9] transition-colors cursor-pointer disabled:opacity-50"
                @click="compileAndSaveToSqlite(false)"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Tạo Phòng Ban Mới + Lưu SQLite + Sinh Tài Liệu</span>
              </button>

              <button
                type="button"
                :disabled="isCompiling"
                class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#22C55E] text-[#020617] font-bold text-xs hover:bg-[#16A34A] transition-colors cursor-pointer disabled:opacity-50"
                title="Tạo phòng ban mới, lưu vào SQLite và chạy mô phỏng ngay trên bản đồ"
                @click="compileAndSaveToSqlite(true)"
              >
                <Play class="w-3.5 h-3.5 fill-current" />
                <span>Tạo &amp; Chạy Ngay</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column (7 cols): Technical Connection Doc & Department Blueprint Preview -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <!-- Tab Switcher + Quick Load & Run CTA -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-1.5 bg-[#020617] p-1 rounded-lg border border-[#334155]">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                :class="
                  rightTab === 'DOC'
                    ? 'bg-[#38BDF8] text-[#020617]'
                    : 'text-[#94A3B8] hover:text-white'
                "
                @click="rightTab = 'DOC'"
              >
                <FileCode2 class="w-3.5 h-3.5" />
                <span>Tài Liệu Kỹ Thuật Kết Nối CrewAI (.md)</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                :class="
                  rightTab === 'BLUEPRINT'
                    ? 'bg-[#38BDF8] text-[#020617]'
                    : 'text-[#94A3B8] hover:text-white'
                "
                @click="rightTab = 'BLUEPRINT'"
              >
                <Building2 class="w-3.5 h-3.5" />
                <span>Sơ Đồ Phòng Ban (OfficeBlueprint.json)</span>
              </button>
            </div>

            <button
              v-if="currentWorkflow"
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22C55E] text-[#020617] font-bold text-xs hover:bg-[#16A34A] cursor-pointer"
              @click="loadAndRunActiveWorkflow"
            >
              <span>Load Phòng Ban Này &amp; Chạy Mô Phỏng</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- CASE 1: A saved workflow is selected (not in empty new-draft state) -->
          <template v-if="currentWorkflow">
            <!-- Summary Strip of the Active Workflow (Including CrewAI Endpoint URL Badge) -->
            <div
              class="rounded-xl bg-[#020617]/90 border border-[#334155] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div class="space-y-0.5">
                <div class="font-bold text-[#F8FAFC] flex items-center gap-2 flex-wrap">
                  <span>{{ currentWorkflow.name }}</span>
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0F172A] border border-[#38BDF8]/40 font-mono text-[10px] text-[#38BDF8]"
                  >
                    <Link2 class="w-3 h-3" />
                    <span>{{ currentWorkflow.crew_endpoint_url }}</span>
                  </span>
                </div>
                <div class="text-[11px] text-[#94A3B8]">
                  {{ currentWorkflow.description }}
                </div>
              </div>

              <div class="flex items-center gap-2 font-mono text-[11px]">
                <span class="px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8]">
                  {{ currentWorkflow.blueprint.meta.grid_cols }}x{{
                    currentWorkflow.blueprint.meta.grid_rows
                  }}
                  Tiles
                </span>
                <span class="px-2 py-0.5 rounded bg-[#1E293B] text-[#4ADE80]">
                  {{ currentWorkflow.blueprint.agents.length }} Agents
                </span>
                <span class="px-2 py-0.5 rounded bg-[#1E293B] text-[#C084FC]">
                  {{ currentWorkflow.blueprint.edges.length }} DAG Edges
                </span>
              </div>
            </div>

            <!-- TAB 1: Technical Integration Documentation for CrewAI -->
            <div
              v-if="rightTab === 'DOC'"
              class="flex-1 flex flex-col gap-2.5 rounded-xl bg-[#020617]/95 border border-[#334155] p-3.5 overflow-hidden"
            >
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="text-xs font-mono font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <CheckCircle2 class="w-4 h-4 text-[#4ADE80]" />
                  <span>
                    CHUẨN KẾT NỐI TỪ CREWAI ({{ currentWorkflow.crew_endpoint_url }}) SANG PHÒNG BAN
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="hud-btn !py-1 !px-2.5 text-xs"
                    @click="copyIntegrationDoc"
                  >
                    <Copy class="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{{ copiedDoc ? 'Đã Copy!' : 'Copy Tài Liệu (.md)' }}</span>
                  </button>

                  <button
                    type="button"
                    class="hud-btn !py-1 !px-2.5 text-xs"
                    @click="downloadIntegrationDoc"
                  >
                    <Download class="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Tải File .md</span>
                  </button>
                </div>
              </div>

              <!-- Quick Agent ID Reference Pills -->
              <div class="flex flex-wrap gap-1.5 py-1">
                <span
                  v-for="ag in currentWorkflow.blueprint.agents"
                  :key="ag.id"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0F172A] border border-[#334155] text-[11px] font-mono text-[#E2E8F0]"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: ag.color }"
                  />
                  <strong class="text-[#38BDF8]">{{ ag.id }}</strong>
                  <span class="text-[#94A3B8]">({{ ag.name }})</span>
                </span>
              </div>

              <pre
                class="flex-1 max-h-[340px] overflow-y-auto rounded-lg bg-[#0F172A] border border-[#334155] p-3 font-mono text-[11px] text-[#E2E8F0] whitespace-pre-wrap leading-relaxed select-text"
              >{{ currentWorkflow.integration_doc_md }}</pre>
            </div>

            <!-- TAB 2: OfficeBlueprint.json Inspector -->
            <div
              v-else
              class="flex-1 flex flex-col gap-2.5 rounded-xl bg-[#020617]/95 border border-[#334155] p-3.5 overflow-hidden"
            >
              <div class="flex items-center justify-between text-xs font-mono text-[#4ADE80]">
                <span>STAGE 2 DETERMINISTIC AUTO-LAYOUT (OfficeBlueprint.json)</span>
                <span>&gt;= 1 Tile Walkways ✓</span>
              </div>

              <pre
                class="flex-1 max-h-[370px] overflow-y-auto rounded-lg bg-[#0F172A] border border-[#334155] p-3 font-mono text-[11px] text-[#94A3B8] select-text"
              >{{ JSON.stringify(currentWorkflow.blueprint, null, 2) }}</pre>
            </div>
          </template>

          <!-- CASE 2: User clicked "+ Tạo Quy Trình Mới" -> Right panel is cleanly empty so nothing mixes! -->
          <div
            v-else
            class="flex-1 rounded-xl bg-[#020617]/90 border border-dashed border-[#334155] p-8 flex flex-col items-center justify-center text-center space-y-3"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-[#1E293B] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8]"
            >
              <Sparkles class="w-6 h-6" />
            </div>

            <div class="space-y-1 max-w-md">
              <div class="text-sm font-bold text-[#F8FAFC]">
                Đang Tạo Quy Trình Phòng Ban Mới (Chưa Có Dữ Liệu Đầu Ra)
              </div>
              <p class="text-xs text-[#94A3B8] leading-relaxed">
                Khung bên phải đã được làm trống để tránh lẫn lộn với các quy trình cũ. Hãy nhập
                <strong class="text-[#FBBF24]">URL kết nối CrewAI</strong> và
                <strong class="text-[#38BDF8]">danh sách vai trò Agents</strong> ở cột bên trái, sau đó bấm
                <strong class="text-[#4ADE80]">"Tạo Phòng Ban Mới + Lưu SQLite + Sinh Tài Liệu"</strong>.
              </p>
            </div>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/50 text-[#FBBF24] text-xs font-semibold hover:bg-[#F59E0B]/25 cursor-pointer"
              @click="showTechGuidePopup = true"
            >
              <BookOpen class="w-3.5 h-3.5" />
              <span>Xem Hướng dẫn kỹ thuật &amp; Prompt mẫu cho Dev CrewAI</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- POPUP MODAL: HƯỚNG DẪN KỸ THUẬT CHO DEVELOPER CREWAI (INPUT / OUTPUT / MASTER PROMPT) -->
    <div
      v-if="showTechGuidePopup"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
      @click.self="showTechGuidePopup = false"
    >
      <div
        class="hud-panel rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden border-2 border-[#F59E0B]/70 shadow-2xl bg-[#0F172A]"
      >
        <!-- Popup Header -->
        <div
          class="px-5 py-4 border-b border-[#334155] flex items-center justify-between bg-[#020617]"
        >
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <BookOpen class="w-4 h-4 text-[#F59E0B]" />
              <h3 class="font-pixel text-xs sm:text-sm text-[#F8FAFC]">
                HƯỚNG DẪN KỸ THUẬT KẾT NỐI CREWAI ↔ PIXEL AGENT OFFICE (API &amp; PROMPT SPEC)
              </h3>
            </div>
            <p class="text-[11px] text-[#94A3B8]">
              Tài liệu chuẩn hóa Input (bắt buộc kèm URL kết nối) &amp; Output dành cho Developer xây dựng hệ thống CrewAI bên ngoài.
            </p>
          </div>

          <button
            type="button"
            class="p-1.5 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white cursor-pointer"
            @click="showTechGuidePopup = false"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Popup Navigation Tabs -->
        <div
          class="px-5 py-2.5 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between flex-wrap gap-2"
        >
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              :class="
                techGuideTab === 'PROMPT'
                  ? 'bg-[#F59E0B] text-[#020617]'
                  : 'bg-[#1E293B] text-[#CBD5E1] hover:text-white'
              "
              @click="techGuideTab = 'PROMPT'"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>1. Master Prompt Cho Dev CrewAI</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              :class="
                techGuideTab === 'INPUT'
                  ? 'bg-[#38BDF8] text-[#020617]'
                  : 'bg-[#1E293B] text-[#CBD5E1] hover:text-white'
              "
              @click="techGuideTab = 'INPUT'"
            >
              <FileDown class="w-3.5 h-3.5" />
              <span>2. Chuẩn Input (URL Kết Nối + Phòng Ban)</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              :class="
                techGuideTab === 'OUTPUT'
                  ? 'bg-[#22C55E] text-[#020617]'
                  : 'bg-[#1E293B] text-[#CBD5E1] hover:text-white'
              "
              @click="techGuideTab = 'OUTPUT'"
            >
              <Send class="w-3.5 h-3.5" />
              <span>3. Chuẩn Output (Event Stream JSON)</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              :class="
                techGuideTab === 'PYTHON'
                  ? 'bg-[#C084FC] text-[#020617]'
                  : 'bg-[#1E293B] text-[#CBD5E1] hover:text-white'
              "
              @click="techGuideTab = 'PYTHON'"
            >
              <Terminal class="w-3.5 h-3.5" />
              <span>4. Code Python Connector Độc Lập</span>
            </button>
          </div>
        </div>

        <!-- Popup Content Body -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4 bg-[#020617]/95">
          <!-- TAB 1: MASTER PROMPT FOR CREWAI DEVELOPERS -->
          <div v-if="techGuideTab === 'PROMPT'" class="space-y-3">
            <div
              class="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/40 p-3.5 flex items-center justify-between flex-wrap gap-3"
            >
              <div class="space-y-1 max-w-xl">
                <div class="text-xs font-bold text-[#FBBF24]">
                  🤖 Prompt Xây Dựng Hệ Thống CrewAI Tương Thích Chuẩn Pixel Agent Office
                </div>
                <p class="text-[11px] text-[#E2E8F0] leading-relaxed">
                  Developer chỉ cần <strong>Copy Prompt này</strong> gửi cho AI (Cursor / Claude / ChatGPT) hoặc đội ngũ phát triển CrewAI. Hệ thống CrewAI được tạo ra sẽ tự động xuất đúng <strong>Input Tạo Phòng Ban (kèm URL kết nối riêng)</strong> và bắn đúng <strong>Output Sự Kiện Thời Gian Thực</strong>!
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F59E0B] text-[#020617] font-bold text-xs hover:bg-[#D97706] cursor-pointer shrink-0"
                @click="copyGuideSectionText(CREWAI_MASTER_PROMPT_FOR_DEVS)"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copiedGuideText ? 'Đã Copy Prompt!' : 'Copy Master Prompt Cho Dev' }}</span>
              </button>
            </div>

            <pre
              class="rounded-xl bg-[#0F172A] border border-[#334155] p-4 font-mono text-xs text-[#F8FAFC] whitespace-pre-wrap leading-relaxed select-text"
            >{{ CREWAI_MASTER_PROMPT_FOR_DEVS }}</pre>
          </div>

          <!-- TAB 2: INPUT CONTRACT (HOW TO DESCRIBE A NEW DEPARTMENT + MANDATORY URL) -->
          <div v-else-if="techGuideTab === 'INPUT'" class="space-y-3">
            <div
              class="rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/40 p-3.5 flex items-center justify-between flex-wrap gap-3"
            >
              <div class="space-y-1 max-w-xl">
                <div class="text-xs font-bold text-[#38BDF8]">
                  📥 Chuẩn Đầu Vào (Input Contract): URL Kết Nối &amp; Mô Tả Phòng Ban
                </div>
                <p class="text-[11px] text-[#E2E8F0] leading-relaxed">
                  Quy định cấu trúc văn bản đầu vào (bắt buộc có <code>URL kết nối: ws://...</code>) để hệ thống biết nhận dữ liệu từ Crew nào, tự động dựng sơ đồ phòng ban vào SQLite và cấp phát mã <code>agent_id</code>.
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#38BDF8] text-[#020617] font-bold text-xs hover:bg-[#0EA5E9] cursor-pointer shrink-0"
                @click="copyGuideSectionText(CREWAI_INPUT_SPEC_TEXT)"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copiedGuideText ? 'Đã Copy!' : 'Copy Tài Liệu Chuẩn Input' }}</span>
              </button>
            </div>

            <pre
              class="rounded-xl bg-[#0F172A] border border-[#334155] p-4 font-mono text-xs text-[#E2E8F0] whitespace-pre-wrap leading-relaxed select-text"
            >{{ CREWAI_INPUT_SPEC_TEXT }}</pre>
          </div>

          <!-- TAB 3: OUTPUT CONTRACT (REAL-TIME EVENT STREAM JSON SCHEMA) -->
          <div v-else-if="techGuideTab === 'OUTPUT'" class="space-y-3">
            <div
              class="rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 p-3.5 flex items-center justify-between flex-wrap gap-3"
            >
              <div class="space-y-1 max-w-xl">
                <div class="text-xs font-bold text-[#4ADE80]">
                  📤 Chuẩn Đầu Ra (Output Event Stream API) Từ CrewAI Sang Pixel Agent Office
                </div>
                <p class="text-[11px] text-[#E2E8F0] leading-relaxed">
                  Đặc tả gói tin JSON thời gian thực gửi qua Endpoint URL của Crew để điều khiển nhân vật di chuyển A*, hiện bong bóng công cụ và bắn tia bàn giao công việc (DAG Handoff).
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#22C55E] text-[#020617] font-bold text-xs hover:bg-[#16A34A] cursor-pointer shrink-0"
                @click="copyGuideSectionText(CREWAI_OUTPUT_SPEC_TEXT)"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copiedGuideText ? 'Đã Copy!' : 'Copy Tài Liệu Chuẩn Output' }}</span>
              </button>
            </div>

            <pre
              class="rounded-xl bg-[#0F172A] border border-[#334155] p-4 font-mono text-xs text-[#E2E8F0] whitespace-pre-wrap leading-relaxed select-text"
            >{{ CREWAI_OUTPUT_SPEC_TEXT }}</pre>
          </div>

          <!-- TAB 4: STANDALONE PYTHON CONNECTOR -->
          <div v-else class="space-y-3">
            <div
              class="rounded-xl bg-[#C084FC]/10 border border-[#C084FC]/40 p-3.5 flex items-center justify-between flex-wrap gap-3"
            >
              <div class="space-y-1 max-w-xl">
                <div class="text-xs font-bold text-[#C084FC]">
                  🐍 Module Python Kết Nối Độc Lập (<code>pixel_office_connector.py</code>)
                </div>
                <p class="text-[11px] text-[#E2E8F0] leading-relaxed">
                  Đoạn mã Python không phụ thuộc thư viện nội bộ (chỉ cần <code>pip install websockets</code>) để các Developer CrewAI khác nhúng trực tiếp vào dự án của họ.
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C084FC] text-[#020617] font-bold text-xs hover:bg-[#A855F7] cursor-pointer shrink-0"
                @click="copyGuideSectionText(STANDALONE_PYTHON_CONNECTOR_CODE)"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copiedGuideText ? 'Đã Copy Code!' : 'Copy Code Python Connector' }}</span>
              </button>
            </div>

            <pre
              class="rounded-xl bg-[#0F172A] border border-[#334155] p-4 font-mono text-xs text-[#E2E8F0] whitespace-pre-wrap leading-relaxed select-text"
            >{{ STANDALONE_PYTHON_CONNECTOR_CODE }}</pre>
          </div>
        </div>

        <!-- Popup Footer -->
        <div
          class="px-5 py-3 border-t border-[#334155] bg-[#0F172A] flex items-center justify-between text-xs"
        >
          <span class="text-[#94A3B8]">
            💡 Mẹo: Mỗi quy trình trong SQLite đều lưu URL kết nối riêng; khi chọn quy trình nào hệ thống sẽ tự động trỏ WebSocket vào URL của Crew đó.
          </span>
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#020617] font-bold hover:bg-[#0EA5E9] cursor-pointer"
            @click="showTechGuidePopup = false"
          >
            Đã hiểu &amp; Đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
