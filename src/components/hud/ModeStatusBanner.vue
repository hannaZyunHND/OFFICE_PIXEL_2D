<script setup lang="ts">
import { useUiStore } from '@/stores/useUiStore';
import { useBlueprintStore } from '@/stores/useBlueprintStore';

const uiStore = useUiStore();
const blueprintStore = useBlueprintStore();
</script>

<template>
  <!-- Contextual Floating Status Strip + Agent Quick-Select Pills -->
  <div
    class="fixed top-14 left-4 z-10 flex flex-col gap-2 pointer-events-none"
  >
    <!-- Active Mode Indicator Banner -->
    <div
      v-if="uiStore.isGodView || uiStore.isEditMode"
      class="flex items-center gap-2 pointer-events-auto"
    >
      <div
        v-if="uiStore.isGodView"
        class="px-3 py-1 rounded-md bg-[#0F172A]/90 border border-[#38BDF8] text-[#38BDF8] font-pixel text-[11px] shadow-lg flex items-center gap-2"
      >
        <span class="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
        <span>GOD-VIEW DAG OVERLAY ACTIVE</span>
      </div>

      <div
        v-if="uiStore.isEditMode"
        class="px-3 py-1 rounded-md bg-[#0F172A]/90 border border-[#A855F7] text-[#C084FC] font-pixel text-[11px] shadow-lg flex items-center gap-2"
      >
        <span class="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse" />
        <span>EDIT MODE: KÉO-THẢ NỘI THẤT &amp; COLLISION MAP</span>
        <span
          v-if="uiStore.hoveredTile"
          class="font-mono text-[10px] text-[#F8FAFC] bg-[#1E293B] px-1.5 py-0.5 rounded"
        >
          ({{ uiStore.hoveredTile[0] }}, {{ uiStore.hoveredTile[1] }})
        </span>
      </div>
    </div>

    <!-- Quick Agent Roster Bar (Click any pill to open Telemetry Inspector) -->
    <div
      class="flex flex-wrap items-center gap-1.5 pointer-events-auto"
      v-if="!uiStore.isEditMode"
    >
      <button
        v-for="agent in blueprintStore.blueprint.agents"
        :key="agent.id"
        type="button"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hud-panel transition-all cursor-pointer hover:border-[#64748B]"
        :class="
          uiStore.selectedAgentId === agent.id
            ? 'ring-2 ring-[#38BDF8] bg-[#1E293B]'
            : 'opacity-90 hover:opacity-100'
        "
        :title="`${agent.name} — ${agent.role}`"
        @click="uiStore.selectAgent(agent.id)"
      >
        <span
          class="w-2.5 h-2.5 rounded-sm shrink-0"
          :style="{ backgroundColor: agent.color }"
        />
        <span class="text-[#F8FAFC] truncate max-w-[130px]">{{
          agent.name
        }}</span>
      </button>
    </div>
  </div>
</template>
