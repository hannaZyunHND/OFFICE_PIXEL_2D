<script setup lang="ts">
import { computed } from 'vue';
import {
  Eye,
  Grid,
  History,
  Sparkles,
  Image as ImageIcon,
  Maximize2,
  Radio,
} from 'lucide-vue-next';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useUiStore } from '@/stores/useUiStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useRunHistoryStore } from '@/stores/useRunHistoryStore';

const emit = defineEmits<{
  (e: 'resetCamera'): void;
}>();

const blueprintStore = useBlueprintStore();
const uiStore = useUiStore();
const telemetryStore = useTelemetryStore();
const runHistoryStore = useRunHistoryStore();

const connectionBadge = computed(() => {
  if (uiStore.crewAiFlowRunning) {
    return {
      label: 'CREW FLOW RUNNING',
      dotClass: 'bg-[#22C55E] animate-ping',
      solidDot: 'bg-[#22C55E]',
      borderClass: 'border-[#22C55E]/50 text-[#4ADE80]',
    };
  }
  switch (uiStore.connectionState) {
    case 'SIMULATOR_RUNNING':
      return {
        label: 'FLOW RUNNING',
        dotClass: 'bg-[#22C55E] animate-ping',
        solidDot: 'bg-[#22C55E]',
        borderClass: 'border-[#22C55E]/40 text-[#4ADE80]',
      };
    case 'WS_CONNECTED':
      return {
        label: 'CREW WS LIVE',
        dotClass: 'bg-[#38BDF8] animate-ping',
        solidDot: 'bg-[#38BDF8]',
        borderClass: 'border-[#38BDF8]/40 text-[#38BDF8]',
      };
    case 'WS_RECONNECTING':
      return {
        label: `WS RETRY #${uiStore.reconnectAttempt}`,
        dotClass: 'bg-[#F59E0B] animate-ping',
        solidDot: 'bg-[#F59E0B]',
        borderClass: 'border-[#F59E0B]/40 text-[#F59E0B]',
      };
    case 'POSTMESSAGE_LISTENING':
      return {
        label: 'POSTMESSAGE BUS',
        dotClass: 'bg-[#818CF8]',
        solidDot: 'bg-[#818CF8]',
        borderClass: 'border-[#818CF8]/40 text-[#818CF8]',
      };
    default:
      return {
        label: 'OFFICE READY',
        dotClass: 'bg-[#10B981]',
        solidDot: 'bg-[#10B981]',
        borderClass: 'border-[#334155] text-[#94A3B8]',
      };
  }
});
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 h-12 z-20 hud-panel px-4 flex items-center justify-between pointer-events-auto"
  >
    <!-- Left Cluster: Brand + Active Blueprint Title + Connection Status -->
    <div class="flex items-center gap-3 min-w-0">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded bg-[#1E293B] border border-[#38BDF8]/50 flex items-center justify-center shadow-inner"
        >
          <span class="font-pixel text-[11px] text-[#38BDF8] font-bold">PX</span>
        </div>
        <div class="leading-tight">
          <div class="flex items-center gap-2">
            <span class="font-pixel text-xs tracking-wider text-[#F8FAFC]">
              PIXEL AGENT OFFICE
            </span>
            <span
              class="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#38BDF8] border border-[#334155]"
            >
              {{ blueprintStore.blueprint.meta.grid_cols }}x{{
                blueprintStore.blueprint.meta.grid_rows
              }}
              TILES
            </span>
          </div>
          <p class="text-[11px] text-[#94A3B8] truncate max-w-[260px]">
            {{ blueprintStore.blueprint.meta.project_name }}
          </p>
        </div>
      </div>

      <!-- Connection Status Badge -->
      <div
        class="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#020617]/80 border text-[11px] font-mono"
        :class="connectionBadge.borderClass"
      >
        <span class="relative flex h-2 w-2">
          <span
            class="absolute inline-flex h-full w-full rounded-full opacity-75"
            :class="connectionBadge.dotClass"
          />
          <span
            class="relative inline-flex rounded-full h-2 w-2"
            :class="connectionBadge.solidDot"
          />
        </span>
        <span>{{ connectionBadge.label }}</span>
      </div>
    </div>

    <!-- Center Cluster: God-View (Tab) + Edit Mode (Removed Run Demo Simulation button) -->
    <div class="flex items-center gap-2">
      <!-- God-View Toggle (Tab) -->
      <button
        type="button"
        class="hud-btn"
        :class="{ 'hud-btn-godview-active': uiStore.isGodView }"
        title="Chuyển đổi Chill Mode / God-View (Phím tắt: Tab)"
        @click="uiStore.toggleGodView()"
      >
        <Eye class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">God-View</span>
        <kbd
          class="px-1 py-0.2 text-[10px] font-mono rounded bg-[#020617]/80 border border-[#334155] text-[#94A3B8]"
        >
          Tab
        </kbd>
      </button>

      <!-- Interactive Map Editor Toggle -->
      <button
        type="button"
        class="hud-btn"
        :class="{ 'hud-btn-editmode-active': uiStore.isEditMode }"
        title="Bật/Tắt chế độ chỉnh sửa bản đồ & Collision Map (Phím tắt: E)"
        @click="uiStore.toggleEditMode()"
      >
        <Grid class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Edit Mode</span>
      </button>
    </div>

    <!-- Right Cluster: AI Markdown Compiler + Custom Assets + Camera Reset -->
    <div class="flex items-center gap-2">
      <!-- Total Token Counter Pill -->
      <div
        class="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#020617]/70 border border-[#334155] font-mono text-[11px] text-[#94A3B8]"
        title="Tổng Token tiêu thụ & Bộ đệm Ring Buffer (Tối đa 200 events)"
      >
        <Radio class="w-3 h-3 text-[#38BDF8]" />
        <span class="text-[#F8FAFC] font-semibold">
          {{ telemetryStore.totalTokensAllAgents.toLocaleString() }}
        </span>
        <span>tok</span>
        <span class="text-[#475569]">|</span>
        <span>{{ telemetryStore.bufferCount }}/{{ telemetryStore.bufferCapacity }} ev</span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs font-bold bg-[#38BDF8] text-[#020617] hover:bg-[#0EA5E9] transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
        title="Mở trình quản lý Quy trình CrewAI (SQLite), Ô chat yêu cầu tạo phòng ban mới & Tài liệu kỹ thuật kết nối"
        @click="uiStore.openModal('COMPILER')"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>Quy Trình &amp; Kết Nối CrewAI</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-sans text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-amber-300 transition-all cursor-pointer whitespace-nowrap shrink-0"
        title="Mở Lịch Sử Chạy Crew & Nhật Ký Phiên Làm Việc (SQLite)"
        @click="uiStore.openModal('RUN_HISTORY')"
      >
        <History class="w-3.5 h-3.5 text-amber-400" />
        <span class="hidden sm:inline">Lịch Sử Chạy</span>
        <span
          v-if="runHistoryStore.runs.length > 0"
          class="px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-200 font-mono text-[10px]"
        >
          {{ runHistoryStore.runs.length }}
        </span>
      </button>

      <button
        type="button"
        class="hud-btn"
        title="Tải lên Sprite Sheet 32x32px (.png) lưu vào IndexedDB"
        @click="uiStore.openModal('ASSETS')"
      >
        <ImageIcon class="w-3.5 h-3.5 text-[#C084FC]" />
        <span class="hidden md:inline">Sprites</span>
      </button>

      <button
        type="button"
        class="hud-btn !px-2"
        title="Căn giữa lại Camera về tỉ lệ 2x mặc định"
        @click="emit('resetCamera')"
      >
        <Maximize2 class="w-3.5 h-3.5 text-[#94A3B8]" />
      </button>
    </div>
  </header>
</template>
