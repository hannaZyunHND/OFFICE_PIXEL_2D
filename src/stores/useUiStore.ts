import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ConnectionState =
  | 'SIMULATOR_READY'
  | 'SIMULATOR_RUNNING'
  | 'WS_CONNECTED'
  | 'WS_RECONNECTING'
  | 'WS_DISCONNECTED'
  | 'POSTMESSAGE_LISTENING';

export type ActiveModalType =
  | 'NONE'
  | 'COMPILER'
  | 'ASSETS'
  | 'WS_CONFIG'
  | 'CREWAI_MISSION'
  | 'RUN_HISTORY';

export interface CrewAiStreamSummary {
  stream_id: string;
  name: string;
  file: string;
  url: string;
  score: number;
  iterations: number;
  verdict: string;
}

export interface CrewAiFlowResult {
  flow_name?: string;
  prompt: string;
  topic?: string;
  slug?: string;
  elapsed_seconds: number;
  portal_url: string;
  result_url?: string;
  zip_url?: string;
  zip_filename?: string;
  files_count?: number;
  llm_engine?: string;
  codex_tokens?: number;
  qa_score?: number;
  qa_decision?: string;
  metrics?: Record<string, unknown>;
  streams?: CrewAiStreamSummary[];
  master_blueprint?: Record<string, unknown>;
  qr_svg?: string;
}

export const useUiStore = defineStore('ui', () => {
  const isGodView = ref<boolean>(false);
  const isEditMode = ref<boolean>(false);
  const selectedAgentId = ref<string | null>(null);
  const selectedFurnitureId = ref<string | null>(null);
  const activeModal = ref<ActiveModalType>('NONE');
  const connectionState = ref<ConnectionState>('SIMULATOR_READY');
  const reconnectAttempt = ref<number>(0);
  const hoveredTile = ref<[number, number] | null>(null);
  const toastMessage = ref<{
    text: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  // Live CrewAI Backend Task Dispatch & Result State
  const crewAiPrompt = ref<string>('');
  const crewAiFlowRunning = ref<boolean>(false);
  const crewAiResult = ref<CrewAiFlowResult | null>(null);

  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function toggleGodView(): void {
    isGodView.value = !isGodView.value;
  }

  function toggleEditMode(): void {
    isEditMode.value = !isEditMode.value;
    if (!isEditMode.value) {
      selectedFurnitureId.value = null;
    }
  }

  function selectAgent(agentId: string | null): void {
    selectedAgentId.value = agentId;
  }

  function selectFurniture(furnitureId: string | null): void {
    selectedFurnitureId.value = furnitureId;
  }

  function openModal(modal: ActiveModalType): void {
    activeModal.value = modal;
  }

  function closeModal(): void {
    activeModal.value = 'NONE';
  }

  function showToast(
    text: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    durationMs = 3400,
  ): void {
    toastMessage.value = { text, type };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage.value = null;
    }, durationMs);
  }

  return {
    isGodView,
    isEditMode,
    selectedAgentId,
    selectedFurnitureId,
    activeModal,
    connectionState,
    reconnectAttempt,
    hoveredTile,
    toastMessage,
    crewAiPrompt,
    crewAiFlowRunning,
    crewAiResult,
    toggleGodView,
    toggleEditMode,
    selectAgent,
    selectFurniture,
    openModal,
    closeModal,
    showToast,
  };
});
