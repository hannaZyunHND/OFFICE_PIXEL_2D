<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import PixelOfficeCanvas from '@/components/canvas/PixelOfficeCanvas.vue';
import TopHudBar from '@/components/hud/TopHudBar.vue';
import ModeStatusBanner from '@/components/hud/ModeStatusBanner.vue';
import SimulatorControlBar, {
  type CrewFlowDispatchPayload,
} from '@/components/hud/SimulatorControlBar.vue';
import MessengerDramaBubble from '@/components/hud/MessengerDramaBubble.vue';
import AgentInspectorDrawer from '@/components/inspector/AgentInspectorDrawer.vue';
import MapEditorToolbar from '@/components/editor/MapEditorToolbar.vue';
import MarkdownCompilerModal from '@/components/modals/MarkdownCompilerModal.vue';
import CustomAssetLoaderModal from '@/components/modals/CustomAssetLoaderModal.vue';
import RunHistoryModal from '@/components/modals/RunHistoryModal.vue';
import HumanApprovalModal from '@/components/modals/HumanApprovalModal.vue';
import ProviderExtrasModal from '@/components/modals/ProviderExtrasModal.vue';

import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useRunHistoryStore } from '@/stores/useRunHistoryStore';
import { EventBusManager } from '@/services/transport/EventBusManager';
import type { AgentEvent, HitlApprovalResponse } from '@/types/events';
import type { TransportMode } from '@/services/storage/localConfig';
import { DEFAULT_CREWAI_WS_ORIGIN } from '@/config/runtimeEndpoints';

const canvasRef = ref<InstanceType<typeof PixelOfficeCanvas> | null>(null);
const isSimRunning = ref<boolean>(false);

const blueprintStore = useBlueprintStore();
const workflowStore = useWorkflowStore();
const telemetryStore = useTelemetryStore();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();
const runHistoryStore = useRunHistoryStore();

let eventBus: EventBusManager | null = null;

function handleIngestEvent(event: AgentEvent): void {
  // 1. Record bounded telemetry event in Pinia (RingBuffer 200 cap + 10KB truncation)
  telemetryStore.recordEvent(event);
  // 2. Persist event to SQLite Run History if a crew run session is active
  const agentName =
    blueprintStore.blueprint.agents.find((a) => a.id === event.agent_id)?.name ??
    event.agent_id;
  runHistoryStore.recordRunEvent(event, agentName);
  // 3. Dispatch to PixiJS 60 FPS Engine (Per-Agent Event Queue + A* + Bubbles)
  canvasRef.value?.dispatchEvent(event);
}

onMounted(async () => {
  eventBus = new EventBusManager(
    handleIngestEvent,
    (running) => {
      isSimRunning.value = running;
      uiStore.connectionState = running ? 'SIMULATOR_RUNNING' : 'SIMULATOR_READY';
    },
    (wsStatus, attempt) => {
      uiStore.connectionState = wsStatus;
      uiStore.reconnectAttempt = attempt;
    },
    {
      onBlueprintSync: (syncedBlueprint) => {
        const res = blueprintStore.setBlueprint(syncedBlueprint);
        if (res.valid) {
          uiStore.isGodView = true;
          canvasRef.value?.resetCamera();
          uiStore.showToast(
            `Đã đồng bộ tự động sơ đồ "${syncedBlueprint.meta.project_name}" (${syncedBlueprint.agents.length} Agents) từ CrewAI Bridge!`,
            'info',
            3200,
          );
        }
      },
      onFlowStarted: (prompt) => {
        uiStore.crewAiFlowRunning = true;
        uiStore.isGodView = true;
        uiStore.showToast(
          `🚀 CrewAI (${workflowStore.activeWorkflow?.crew_endpoint_url || DEFAULT_CREWAI_WS_ORIGIN}) đang thực thi: "${prompt}"`,
          'info',
          3400,
        );
      },
      onFlowResult: (result) => {
        uiStore.crewAiFlowRunning = false;
        uiStore.crewAiResult = result;
        runHistoryStore.completeRunSession(result);
        uiStore.showToast(
          `✅ Đã hoàn tất chạy Flow cho "${result.topic || result.prompt}" (${result.elapsed_seconds}s)!`,
          'success',
          4200,
        );
      },
      onFlowError: (err) => {
        uiStore.crewAiFlowRunning = false;
        uiStore.setPendingHitlApproval(null);
        runHistoryStore.failRunSession(err);
        uiStore.showToast(`Lỗi thực thi CrewAI Bridge: ${err}`, 'error', 4000);
      },
      onHumanApprovalRequired: (approval) => {
        uiStore.setPendingHitlApproval(approval);
        void canvasRef.value?.requestAgentHumanApproval(
          approval.agent_id,
          approval.step_title,
        );
        const hitlEvt: AgentEvent = {
          event_id: `hitl_req_${approval.approval_id}`,
          timestamp: Date.now(),
          event_type: 'HUMAN_APPROVAL',
          agent_id: approval.agent_id,
          metadata: {
            status_text: `⏸️ Chờ Giám đốc duyệt HITL: ${approval.step_title}`,
            icon: 'message',
            input_payload: {
              approval_id: approval.approval_id,
              stage: approval.stage || 'APPROVAL',
              estimated_cost_usd: approval.estimated_cost_usd || 0,
            },
          },
        };
        telemetryStore.recordEvent(hitlEvt);
        const agName =
          blueprintStore.blueprint.agents.find((a) => a.id === approval.agent_id)
            ?.name ?? approval.agent_id;
        runHistoryStore.recordRunEvent(hitlEvt, agName);
        uiStore.showToast(
          `⚖️ HITL: "${approval.step_title}" đang chờ Giám đốc duyệt!`,
          'warning',
          4000,
        );
      },
      onToolRegistrySync: (tools) => {
        uiStore.setRegisteredExternalTools(tools);
      },
    },
  );

  // Start in WebSocket live-ready mode
  settingsStore.updateSettings({ transportMode: 'websocket' });

  // Load workflows from SQLite (/api/workflows) and run history (/api/runs)
  await Promise.all([
    workflowStore.initWorkflows(),
    runHistoryStore.initRunHistory(),
  ]);
  if (workflowStore.activeWorkflow) {
    eventBus.simulator.setCustomWorkflowSteps(workflowStore.activeWorkflow.steps);
    eventBus.switchMode('websocket', workflowStore.activeWorkflow.crew_endpoint_url);
    canvasRef.value?.resetCamera();
  }

  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  eventBus?.destroy();
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function handleRunCompiledSimulation(): void {
  if (!eventBus) return;
  uiStore.isGodView = true;
  settingsStore.updateSettings({ transportMode: 'mock' });
  if (workflowStore.activeWorkflow) {
    eventBus.simulator.setCustomWorkflowSteps(workflowStore.activeWorkflow.steps);
  }
  canvasRef.value?.resetCamera();
  eventBus.simulator.start(
    settingsStore.settings.simulationSpeed,
    blueprintStore.blueprint.agents,
    blueprintStore.blueprint.edges,
  );
  uiStore.showToast(
    `Đang chạy mô phỏng phòng ban "${blueprintStore.blueprint.meta.project_name}" (${blueprintStore.blueprint.agents.length} Agents)!`,
    'success',
    3200,
  );
}

function handleDispatchCrewFlow(payload: CrewFlowDispatchPayload): void {
  if (!eventBus) return;
  eventBus.simulator.stop();

  const activeWf = workflowStore.activeWorkflow;
  const endpointUrl = activeWf?.crew_endpoint_url || DEFAULT_CREWAI_WS_ORIGIN;

  uiStore.isGodView = true;
  uiStore.crewAiPrompt = payload.prompt;
  uiStore.crewAiFlowRunning = true;
  uiStore.crewAiResult = null;

  // Persist new run session immediately in SQLite before dispatching
  runHistoryStore.startRunSession({
    workflowId: activeWf?.id || 'custom_workflow',
    workflowName: activeWf?.name || blueprintStore.blueprint.meta.project_name,
    endpointUrl,
    prompt: payload.prompt,
    attachedFileName: payload.attachedFileName,
    attachedFileContent: payload.attachedFileContent,
  });

  // Trigger Giám Đốc -> First Agent physical chat-bubble briefing ceremony
  void canvasRef.value?.startDirectorBriefing(payload.prompt);

  settingsStore.updateSettings({
    transportMode: 'websocket',
    wsEndpoint: endpointUrl,
  });
  eventBus.switchMode('websocket', endpointUrl);

  eventBus.wsClient.dispatchTask(payload.prompt, {
    workflow_id: activeWf?.id || 'custom_workflow',
    workflow_name: activeWf?.name || blueprintStore.blueprint.meta.project_name,
    endpoint_url: endpointUrl,
    attached_file_name: payload.attachedFileName,
    attached_file_content: payload.attachedFileContent,
    blueprint: blueprintStore.blueprint,
    step_delay: settingsStore.settings.simulationSpeed === 2 ? 0.45 : 0.75,
    extras: { ...settingsStore.settings.extras },
  });

  uiStore.showToast(
    `🚀 Đã gửi yêu cầu "${payload.prompt}" thẳng vào Crew (${endpointUrl})!`,
    'info',
    3200,
  );
}

function handleSubmitHitlDecision(response: HitlApprovalResponse): void {
  const pending = uiStore.pendingHitlApproval;
  eventBus?.wsClient.sendHumanApprovalResponse(response);

  if (pending) {
    canvasRef.value?.resolveAgentHumanApproval(pending.agent_id, response.decision);
    const resolvedEvt: AgentEvent = {
      event_id: `hitl_res_${pending.approval_id}_${Date.now()}`,
      timestamp: Date.now(),
      event_type: 'HUMAN_APPROVAL',
      agent_id: pending.agent_id,
      metadata: {
        status_text: `✅ Giám đốc [${response.decision.toUpperCase()}]: ${pending.step_title}`,
        icon: response.decision === 'reject' ? 'error' : 'check',
        output_payload: response as unknown as Record<string, unknown>,
      },
    };
    telemetryStore.recordEvent(resolvedEvt);
    const agName =
      blueprintStore.blueprint.agents.find((a) => a.id === pending.agent_id)
        ?.name ?? pending.agent_id;
    runHistoryStore.recordRunEvent(resolvedEvt, agName);
    uiStore.recordHitlResolution(pending, response);
  }
}

function handleRerunPromptFromHistory(payload: {
  prompt: string;
  workflowId: string;
}): void {
  if (
    payload.workflowId &&
    workflowStore.workflows.some((w) => w.id === payload.workflowId) &&
    workflowStore.activeWorkflowId !== payload.workflowId
  ) {
    handleChangeScenario(payload.workflowId);
  }
  uiStore.crewAiPrompt = payload.prompt;
  uiStore.showToast(
    'Đã nạp lại prompt vào ô chat! Bấm "Gửi & Chạy Flow" để thực thi.',
    'info',
    2800,
  );
}

function handleChangeScenario(workflowId: string): void {
  eventBus?.simulator.stop();
  uiStore.crewAiFlowRunning = false;

  const wf = workflowStore.activateWorkflow(workflowId);
  if (wf) {
    eventBus?.simulator.setCustomWorkflowSteps(wf.steps);
    canvasRef.value?.resetCamera();
    eventBus?.switchMode('websocket', wf.crew_endpoint_url);
    uiStore.showToast(
      `Đã chuyển sang phòng ban "${wf.name}" (${wf.blueprint.agents.length} Agents • ${wf.crew_endpoint_url})!`,
      'info',
      2800,
    );
  }
}

function handleSwitchTransport(mode: TransportMode, wsUrl?: string): void {
  if (!eventBus) return;
  eventBus.switchMode(mode, wsUrl);
  if (mode === 'postmessage') {
    uiStore.connectionState = 'POSTMESSAGE_LISTENING';
  } else if (mode === 'websocket') {
    uiStore.showToast(
      `Đang kết nối WebSocket (${wsUrl || DEFAULT_CREWAI_WS_ORIGIN}) để nhận sự kiện thực từ CrewAI...`,
      'info',
      3000,
    );
  } else if (mode === 'mock') {
    uiStore.connectionState = 'SIMULATOR_READY';
  }
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.key === 'Tab') {
    e.preventDefault();
    uiStore.toggleGodView();
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    uiStore.toggleEditMode();
  } else if (e.key === 'Escape') {
    if (uiStore.activeModal !== 'NONE') {
      uiStore.closeModal();
    } else if (uiStore.selectedAgentId) {
      uiStore.selectAgent(null);
    } else if (uiStore.isEditMode) {
      uiStore.toggleEditMode();
    }
  }
}
</script>

<template>
  <main class="relative w-screen h-screen overflow-hidden select-none bg-[#020617]">
    <!-- Layer A: 60 FPS 2D Pixel Art Office Canvas (PixiJS v8 + EasyStar.js) -->
    <PixelOfficeCanvas ref="canvasRef" />

    <!-- Layer B: Retro-Modern Floating Dark OLED HUD -->
    <TopHudBar
      @reset-camera="canvasRef?.resetCamera()"
    />

    <ModeStatusBanner />

    <MapEditorToolbar />

    <AgentInspectorDrawer />

    <SimulatorControlBar
      :is-sim-running="isSimRunning"
      @change-scenario="handleChangeScenario"
      @switch-transport="handleSwitchTransport"
      @dispatch-crew-flow="handleDispatchCrewFlow"
    />

    <!-- Bottom-Right Floating Messenger Chat-Head Bubble & Drama Feed -->
    <MessengerDramaBubble />

    <!-- Unified SQLite Workflow, Chat Requirement & CrewAI Technical Documentation Modal -->
    <MarkdownCompilerModal
      @run-compiled-simulation="handleRunCompiledSimulation"
      @workflow-selected="handleChangeScenario"
    />

    <CustomAssetLoaderModal
      @assets-updated="canvasRef?.reloadCustomAssets()"
    />

    <RunHistoryModal @rerun-prompt="handleRerunPromptFromHistory" />

    <HumanApprovalModal @submit-decision="handleSubmitHitlDecision" />

    <ProviderExtrasModal />

    <!-- Floating Toast Notification -->
    <transition name="toast-fade">
      <div
        v-if="uiStore.toastMessage"
        class="fixed top-14 right-4 z-50 px-3.5 py-2 rounded-lg hud-panel text-xs font-medium shadow-xl flex items-center gap-2 pointer-events-none"
        :class="{
          'border-[#22C55E] text-[#4ADE80]': uiStore.toastMessage.type === 'success',
          'border-[#F59E0B] text-[#FBBF24]': uiStore.toastMessage.type === 'warning',
          'border-[#EF4444] text-[#F87171]': uiStore.toastMessage.type === 'error',
          'border-[#38BDF8] text-[#E2E8F0]': uiStore.toastMessage.type === 'info',
        }"
      >
        <span>{{ uiStore.toastMessage.text }}</span>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 180ms ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
