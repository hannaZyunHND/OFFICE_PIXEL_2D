<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue';
import { OfficeRenderer } from '@/engine/OfficeRenderer';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useOfficeChatStore } from '@/stores/useOfficeChatStore';
import { getAllCustomSpriteAssets } from '@/services/storage/indexedDbAssets';
import type { AgentEvent } from '@/types/events';

const canvasHostRef = ref<HTMLDivElement | null>(null);
/**
 * CRITICAL (Constitution Principle II):
 * OfficeRenderer is stored in a shallowRef so Vue NEVER recursively proxies
 * PixiJS v8 containers, WebGL buffers, or 60 FPS (x, y) coordinates.
 */
const rendererRef = shallowRef<OfficeRenderer | null>(null);

const blueprintStore = useBlueprintStore();
const workflowStore = useWorkflowStore();
const telemetryStore = useTelemetryStore();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();
const officeChatStore = useOfficeChatStore();

onMounted(async () => {
  if (!canvasHostRef.value) return;

  telemetryStore.initializeAgents(blueprintStore.blueprint.agents.map((a) => a.id));

  const renderer = new OfficeRenderer({
    onSelectAgent: (agentId) => {
      uiStore.selectAgent(agentId);
    },
    onSelectFurniture: (furnitureId) => {
      uiStore.selectFurniture(furnitureId);
    },
    onAgentCoarseStateChange: (
      agentId,
      fsmState,
      statusText,
      activeToolIcon,
      queueDepth,
    ) => {
      telemetryStore.updateAgentCoarseState(agentId, {
        fsmState,
        statusText,
        activeToolIcon,
        queueDepth,
      });
    },
    onFurnitureMovedInEditor: (furnitureId, newX, newY) => {
      const res = blueprintStore.updateFurniturePosition(furnitureId, newX, newY);
      if (res.success) {
        void workflowStore.syncActiveBlueprintToSqlite();
        uiStore.showToast(
          `💾 Đã di chuyển "${furnitureId}" tới ô (${newX}, ${newY}) & lưu vào SQLite!`,
          'success',
          2200,
        );
      } else {
        uiStore.showToast(
          res.error || 'Vị trí đặt nội thất không hợp lệ!',
          'error',
          2800,
        );
      }
      return res;
    },
    onHoverTileChange: (tile) => {
      uiStore.hoveredTile = tile;
    },
    onSpeechMessage: (msg) => {
      officeChatStore.pushMessage(msg);
    },
  });

  await renderer.mount(canvasHostRef.value, blueprintStore.blueprint);
  renderer.setSimulationSpeed(settingsStore.settings.simulationSpeed);

  // If blueprintStore changed while WebGL was mounting asynchronously, sync immediately!
  telemetryStore.initializeAgents(blueprintStore.blueprint.agents.map((a) => a.id));
  renderer.loadBlueprint(blueprintStore.blueprint, true);
  renderer.setGodView(uiStore.isGodView);
  renderer.setEditMode(uiStore.isEditMode);

  const savedSprites = await getAllCustomSpriteAssets();
  if (savedSprites.length > 0) {
    await renderer.registerCustomAssets(savedSprites);
  }

  rendererRef.value = renderer;
});

// Watch ONLY coarse blueprint revisions (when user compiles Markdown or edits furniture)
watch(
  () => blueprintStore.revision,
  () => {
    const renderer = rendererRef.value;
    if (!renderer) return;
    telemetryStore.initializeAgents(
      blueprintStore.blueprint.agents.map((a) => a.id),
    );
    renderer.loadBlueprint(blueprintStore.blueprint, false);
  },
);

// Live in-place agent profile updates (rename / avatar swap / color) without resetting positions
watch(
  () => blueprintStore.agentPatchRevision,
  () => {
    const renderer = rendererRef.value;
    if (!renderer) return;
    for (const entry of blueprintStore.lastAgentProfilePatches) {
      renderer.updateAgentAppearance(entry.agentId, entry.patch);
    }
  },
);

// Watch coarse UI mode toggles
watch(
  () => uiStore.isGodView,
  (enabled) => {
    rendererRef.value?.setGodView(enabled);
  },
);

watch(
  () => uiStore.isEditMode,
  (enabled) => {
    rendererRef.value?.setEditMode(enabled);
  },
);

watch(
  () => uiStore.selectedAgentId,
  (agentId) => {
    rendererRef.value?.setSelectedAgent(agentId);
  },
);

watch(
  () => uiStore.selectedFurnitureId,
  (furnId) => {
    rendererRef.value?.setSelectedFurniture(furnId);
  },
);

watch(
  () => settingsStore.settings.simulationSpeed,
  (speed) => {
    rendererRef.value?.setSimulationSpeed(speed);
  },
);

function dispatchEvent(event: AgentEvent): void {
  rendererRef.value?.dispatchEventToEngine(event);
}

async function startDirectorBriefing(prompt: string): Promise<void> {
  await rendererRef.value?.startDirectorBriefing(prompt);
}

function resetCamera(): void {
  rendererRef.value?.resetCamera();
}

async function reloadCustomAssets(): Promise<void> {
  const sprites = await getAllCustomSpriteAssets();
  await rendererRef.value?.registerCustomAssets(sprites);
}

defineExpose({
  dispatchEvent,
  startDirectorBriefing,
  resetCamera,
  reloadCustomAssets,
});

onBeforeUnmount(() => {
  rendererRef.value?.destroy();
  rendererRef.value = null;
});
</script>

<template>
  <div
    ref="canvasHostRef"
    class="fixed inset-0 w-screen h-screen overflow-hidden bg-[#020617] z-0"
  />
</template>
