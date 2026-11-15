<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  X,
  Cpu,
  Coins,
  Layers,
  Activity,
  Download,
  Monitor,
  ChevronDown,
  ChevronUp,
  Pencil,
} from 'lucide-vue-next';
import { useUiStore } from '@/stores/useUiStore';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import PayloadViewerCard from './PayloadViewerCard.vue';
import AgentAppearanceEditor from './AgentAppearanceEditor.vue';
import { getAgentAvatarPreset } from '@/data/agentAvatarCatalog';
import { renderAgentAvatarToDataUrl } from '@/engine/graphics/AgentSpritePainter';
import type { AgentFsmState } from '@/types/fsm';

const uiStore = useUiStore();
const blueprintStore = useBlueprintStore();
const telemetryStore = useTelemetryStore();

const showAllOfficeLogs = ref<boolean>(false);
const isAgentInfoExpanded = ref<boolean>(false);
const isAvatarEditorOpen = ref<boolean>(false);

const selectedAgent = computed(() => {
  if (!uiStore.selectedAgentId) return null;
  return (
    blueprintStore.blueprint.agents.find(
      (a) => a.id === uiStore.selectedAgentId,
    ) || null
  );
});

const selectedAvatarPreset = computed(() =>
  getAgentAvatarPreset(selectedAgent.value?.avatar_sprite),
);

const selectedAvatarPreviewUrl = computed(() => {
  if (!selectedAgent.value) return '';
  return renderAgentAvatarToDataUrl(
    selectedAgent.value.avatar_sprite,
    selectedAgent.value.color,
  );
});

watch(
  () => uiStore.selectedAgentId,
  () => {
    // Keep current toggle state or allow smooth inspection across agents
  },
);

const agentSnapshot = computed(() => {
  if (!selectedAgent.value) return null;
  return telemetryStore.agentSnapshots[selectedAgent.value.id] || null;
});

const latestAgentEvent = computed(() => {
  if (!selectedAgent.value) return undefined;
  return telemetryStore.getLatestEventForAgent(selectedAgent.value.id);
});

const displayedLogs = computed(() => {
  if (showAllOfficeLogs.value || !selectedAgent.value) {
    return telemetryStore.eventsList;
  }
  return telemetryStore.getEventsForAgent(selectedAgent.value.id);
});

function toggleAgentInfo(): void {
  isAgentInfoExpanded.value = !isAgentInfoExpanded.value;
}

function fsmBadgeStyle(state: AgentFsmState | undefined): string {
  switch (state) {
    case 'WORKING':
      return 'bg-[#22C55E]/20 text-[#4ADE80] border-[#22C55E]/50';
    case 'TOOL_CALL':
      return 'bg-[#F59E0B]/20 text-[#FBBF24] border-[#F59E0B]/50';
    case 'MOVING':
      return 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/50';
    case 'HANDOFF':
      return 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/50';
    case 'COMPLETE':
      return 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/50';
    case 'ERROR':
      return 'bg-[#EF4444]/20 text-[#F87171] border-[#EF4444]/50';
    default:
      return 'bg-[#1E293B] text-[#94A3B8] border-[#334155]';
  }
}

function formatTime(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const d = new Date(ms);
  return d.toLocaleTimeString('vi-VN', { hour12: false });
}
</script>

<template>
  <transition name="drawer-slide">
    <aside
      v-if="selectedAgent"
      class="fixed top-12 right-0 bottom-0 w-full sm:w-[390px] z-30 hud-panel border-l border-[#334155] flex flex-col pointer-events-auto"
    >
      <!-- 1. Agent Identity Header (with Toggle Show/Hide Full Name & Description) -->
      <div
        class="p-4 border-b border-[#334155] flex flex-col gap-2"
        :class="isAvatarEditorOpen ? 'max-h-[72vh] overflow-y-auto' : ''"
      >
        <AgentAppearanceEditor
          v-if="isAvatarEditorOpen && selectedAgent"
          :agent="selectedAgent"
          class="order-last"
        />
        <div class="flex items-start justify-between gap-2.5">
          <div
            class="flex items-start gap-3 min-w-0 flex-1 cursor-pointer group"
            title="Bấm để Ẩn / Hiện toàn bộ tên và mô tả của tác nhân"
            @click="toggleAgentInfo"
          >
            <!-- Pixel Avatar Swatch -->
            <div
              class="w-11 h-11 rounded-lg bg-[#020617] border-2 flex items-center justify-center shrink-0 shadow-md mt-0.5"
              :style="{ borderColor: selectedAgent.color }"
            >
              <div
                class="w-6 h-6 rounded-sm"
                :style="{ backgroundColor: selectedAgent.color }"
              />
            </div>

            <div class="min-w-0 flex-1">
              <!-- Agent Name + FSM State + Toggle Button -->
              <div class="flex items-start justify-between gap-1.5">
                <h2
                  class="text-sm font-bold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors"
                  :class="
                    isAgentInfoExpanded
                      ? 'whitespace-normal break-words leading-snug'
                      : 'truncate'
                  "
                >
                  {{ selectedAgent.name }}
                </h2>

                <span
                  class="px-2 py-0.5 text-[10px] font-mono font-semibold rounded border shrink-0"
                  :class="fsmBadgeStyle(agentSnapshot?.fsmState)"
                >
                  {{ agentSnapshot?.fsmState || 'IDLE' }}
                </span>
              </div>

              <!-- Agent Role / Description -->
              <p
                class="text-xs mt-1 transition-all"
                :class="
                  isAgentInfoExpanded
                    ? 'text-[#E2E8F0] whitespace-normal break-words leading-relaxed bg-[#020617]/80 p-2.5 rounded-md border border-[#334155]/80 mt-1.5'
                    : 'text-[#94A3B8] truncate'
                "
              >
                {{ selectedAgent.role }}
              </p>

              <!-- Desk & Status Info + Toggle Pill -->
              <div class="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                <div
                  class="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] min-w-0"
                  :class="isAgentInfoExpanded ? 'flex-wrap' : 'truncate'"
                >
                  <Monitor class="w-3 h-3 text-[#38BDF8] shrink-0" />
                  <span :class="isAgentInfoExpanded ? 'break-all' : 'truncate'">
                    Desk: {{ selectedAgent.desk_id }}
                  </span>
                  <span>•</span>
                  <span
                    class="text-[#E2E8F0]"
                    :class="isAgentInfoExpanded ? 'whitespace-normal break-words' : 'truncate'"
                  >
                    {{ agentSnapshot?.statusText || 'Sẵn sàng' }}
                  </span>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#38BDF8]/40 text-[10px] font-mono text-[#38BDF8] cursor-pointer shrink-0 transition-colors"
                  @click.stop="toggleAgentInfo"
                >
                  <ChevronUp v-if="isAgentInfoExpanded" class="w-3 h-3" />
                  <ChevronDown v-else class="w-3 h-3" />
                  <span>{{ isAgentInfoExpanded ? 'Thu gọn' : 'Hiện đầy đủ' }}</span>
                </button>
              </div>

              <!-- Extra Agent ID & Metadata when Expanded -->
              <div
                v-if="isAgentInfoExpanded"
                class="mt-2 pt-2 border-t border-[#334155]/60 flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-[#94A3B8]"
              >
                <span class="px-1.5 py-0.5 rounded bg-[#020617] border border-[#334155] text-[#38BDF8]">
                  ID: {{ selectedAgent.id }}
                </span>
                <button
                  type="button"
                  data-testid="toggle-avatar-editor-btn"
                  @click="isAvatarEditorOpen = !isAvatarEditorOpen"
                  class="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#38BDF8]/50 text-[#38BDF8] font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <img
                    v-if="selectedAvatarPreviewUrl"
                    :src="selectedAvatarPreviewUrl"
                    alt="avatar"
                    class="w-4 h-4 rounded-sm shrink-0"
                    style="image-rendering: pixelated;"
                  />
                  <span>{{ selectedAvatarPreset.emoji }} {{ selectedAvatarPreset.label }}</span>
                  <Pencil class="w-2.5 h-2.5 opacity-85 ml-0.5" />
                  <span class="text-[9px] text-[#94A3B8]">Đổi tên / Avatar</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="p-1 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer shrink-0"
            title="Đóng bảng Inspector (Esc)"
            @click="uiStore.selectAgent(null)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 2. Telemetry KPI Strip -->
      <div
        class="grid grid-cols-3 gap-2 px-4 py-2.5 bg-[#1E293B]/60 border-b border-[#334155] font-mono"
      >
        <div class="bg-[#020617]/70 rounded p-2 border border-[#334155]/70">
          <div class="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Coins class="w-3 h-3 text-[#F59E0B]" />
            <span>TOKENS</span>
          </div>
          <div class="text-xs font-bold text-[#F8FAFC] mt-0.5">
            {{ (agentSnapshot?.tokensUsed ?? 0).toLocaleString() }}
          </div>
        </div>

        <div class="bg-[#020617]/70 rounded p-2 border border-[#334155]/70">
          <div class="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Layers class="w-3 h-3 text-[#38BDF8]" />
            <span>QUEUE</span>
          </div>
          <div class="text-xs font-bold text-[#F8FAFC] mt-0.5">
            {{ agentSnapshot?.queueDepth ?? 0 }} pending
          </div>
        </div>

        <div class="bg-[#020617]/70 rounded p-2 border border-[#334155]/70">
          <div class="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Activity class="w-3 h-3 text-[#22C55E]" />
            <span>EVENTS</span>
          </div>
          <div class="text-xs font-bold text-[#F8FAFC] mt-0.5">
            {{ agentSnapshot?.eventsProcessed ?? 0 }}
          </div>
        </div>
      </div>

      <!-- 3. Latest Prompt / Output Payload Viewer (10KB Cap) -->
      <div class="p-4 border-b border-[#334155]">
        <PayloadViewerCard
          :event="latestAgentEvent"
          @download-full="(ev) => telemetryStore.downloadFullEventJson(ev)"
        />
      </div>

      <!-- 4. Ring Buffer Event History Timeline (Max 200 Events) -->
      <div class="flex-1 flex flex-col min-h-0">
        <div
          class="px-4 py-2 bg-[#1E293B]/40 border-b border-[#334155] flex items-center justify-between"
        >
          <div class="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
            <Cpu class="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Event History (Ring Buffer)</span>
          </div>

          <button
            type="button"
            class="text-[11px] font-mono px-2 py-0.5 rounded border border-[#334155] bg-[#020617] text-[#38BDF8] hover:border-[#38BDF8] cursor-pointer"
            @click="showAllOfficeLogs = !showAllOfficeLogs"
          >
            {{ showAllOfficeLogs ? 'Filter: Agent Only' : 'Show All (Max 200)' }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-if="displayedLogs.length === 0"
            class="text-center py-8 text-xs text-[#64748B]"
          >
            Chưa có bản ghi sự kiện nào trong Ring Buffer.
          </div>

          <div
            v-for="ev in displayedLogs"
            :key="ev.event_id"
            class="rounded-md bg-[#020617]/90 border border-[#334155]/80 p-2.5 text-xs space-y-1 hover:border-[#475569] transition-colors"
          >
            <div class="flex items-center justify-between font-mono text-[10.5px]">
              <span class="px-1.5 py-0.2 rounded bg-[#1E293B] text-[#38BDF8] font-semibold">
                {{ ev.event_type }}
              </span>
              <div class="flex items-center gap-2 text-[#94A3B8]">
                <span v-if="ev.metadata?.tokens_used" class="text-[#F59E0B]">
                  +{{ ev.metadata.tokens_used }} tok
                </span>
                <span>{{ formatTime(ev.timestamp) }}</span>
                <button
                  type="button"
                  class="text-[#38BDF8] hover:text-white cursor-pointer"
                  title="Download JSON"
                  @click="telemetryStore.downloadFullEventJson(ev)"
                >
                  <Download class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div class="text-[#E2E8F0] text-[11.5px]">
              {{ ev.metadata?.status_text || ev.event_type }}
            </div>

            <div
              v-if="ev.target_agent_id"
              class="text-[10.5px] font-mono text-[#C084FC]"
            >
              Handoff: {{ ev.agent_id }} → {{ ev.target_agent_id }}
            </div>
          </div>
        </div>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
