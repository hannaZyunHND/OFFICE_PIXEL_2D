<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Check,
  Dices,
  Save,
  Search,
  Sparkles,
  Palette,
  Database,
} from 'lucide-vue-next';
import type { AgentBlueprint } from '@/types/blueprint';
import {
  AGENT_AVATAR_CATALOG,
  AGENT_AVATAR_CATEGORY_META,
  getAgentAvatarPreset,
  pickRandomAgentAvatarId,
  type AgentAvatarCategory,
} from '@/data/agentAvatarCatalog';
import { renderAgentAvatarToDataUrl } from '@/engine/graphics/AgentSpritePainter';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';

const props = defineProps<{
  agent: AgentBlueprint;
}>();

const blueprintStore = useBlueprintStore();
const workflowStore = useWorkflowStore();

const draftName = ref<string>(props.agent.name);
const selectedCategory = ref<AgentAvatarCategory>('ALL');
const searchQuery = ref<string>('');
const isSaving = ref<boolean>(false);
const saveFeedback = ref<string>('');

const QUICK_COLORS = [
  '#38BDF8',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#EC4899',
  '#22D3EE',
  '#FACC15',
];

watch(
  () => props.agent.id,
  () => {
    draftName.value = props.agent.name;
    saveFeedback.value = '';
  },
);

watch(
  () => props.agent.name,
  (newName) => {
    draftName.value = newName;
  },
);

const currentPreset = computed(() =>
  getAgentAvatarPreset(props.agent.avatar_sprite),
);

const currentPreviewUrl = computed(() =>
  renderAgentAvatarToDataUrl(props.agent.avatar_sprite, props.agent.color),
);

const filteredPresets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return AGENT_AVATAR_CATALOG.filter((preset) => {
    if (
      selectedCategory.value !== 'ALL' &&
      preset.category !== selectedCategory.value
    ) {
      return false;
    }
    if (!q) return true;
    return (
      preset.label.toLowerCase().includes(q) ||
      preset.id.toLowerCase().includes(q) ||
      preset.emoji.includes(q)
    );
  });
});

function getCategoryCount(catId: AgentAvatarCategory): number {
  if (catId === 'ALL') return AGENT_AVATAR_CATALOG.length;
  return AGENT_AVATAR_CATALOG.filter((p) => p.category === catId).length;
}

const isNameDirty = computed(() => {
  const trimmed = draftName.value.trim();
  return trimmed.length > 0 && trimmed !== props.agent.name;
});

async function applyAndPersist(patch: {
  name?: string;
  avatar_sprite?: string;
  color?: string;
}, label: string): Promise<void> {
  const ok = blueprintStore.updateAgentProfile(props.agent.id, patch);
  if (!ok) return;

  isSaving.value = true;
  saveFeedback.value = 'Đang lưu SQLite...';
  try {
    await workflowStore.syncActiveBlueprintToSqlite(blueprintStore.blueprint);
    saveFeedback.value = `Đã lưu ${label} ✓`;
  } catch {
    saveFeedback.value = 'Đã lưu cục bộ ✓';
  } finally {
    isSaving.value = false;
  }
}

async function handleSaveName(): Promise<void> {
  const clean = draftName.value.trim();
  if (!clean) return;
  await applyAndPersist({ name: clean }, 'tên nhân viên');
}

async function handleSelectAvatar(avatarId: string): Promise<void> {
  await applyAndPersist({ avatar_sprite: avatarId }, 'avatar');
}

async function handleSelectColor(color: string): Promise<void> {
  await applyAndPersist({ color }, 'màu');
}

async function handleRandomizeAvatar(): Promise<void> {
  const nextId = pickRandomAgentAvatarId({
    excludeIds: [props.agent.avatar_sprite],
  });
  await applyAndPersist({ avatar_sprite: nextId }, 'avatar ngẫu nhiên');
}
</script>

<template>
  <div
    data-testid="agent-appearance-editor"
    class="mt-2 p-2.5 rounded-lg bg-[#020617]/95 border border-[#334155] flex flex-col gap-2.5 shadow-inner"
  >
    <!-- Rename + Live Preview Row -->
    <div class="flex items-center gap-2.5">
      <div
        class="w-12 h-12 rounded-lg bg-[#0F172A] border border-[#38BDF8]/40 flex items-center justify-center shrink-0 overflow-hidden shadow"
        :style="{ borderColor: agent.color }"
      >
        <img
          v-if="currentPreviewUrl"
          :src="currentPreviewUrl"
          :alt="currentPreset.label"
          class="w-11 h-11 object-contain"
          style="image-rendering: pixelated;"
        />
        <span v-else class="text-xl">{{ currentPreset.emoji }}</span>
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-1">
          <span class="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Tên nhân viên
          </span>
          <span
            v-if="saveFeedback"
            data-testid="agent-profile-save-status"
            class="text-[10px] text-[#34D399] inline-flex items-center gap-1 font-mono"
          >
            <Database class="w-2.5 h-2.5" />
            {{ saveFeedback }}
          </span>
        </div>

        <form class="flex items-center gap-1" @submit.prevent="handleSaveName">
          <input
            v-model="draftName"
            data-testid="agent-rename-input"
            type="text"
            maxlength="48"
            placeholder="Nhập tên nhân viên..."
            class="flex-1 min-w-0 px-2 py-1 text-[11px] bg-[#0F172A] border border-[#334155] focus:border-[#38BDF8] rounded text-[#F8FAFC] outline-none font-mono"
          />
          <button
            type="submit"
            data-testid="agent-rename-save-btn"
            :disabled="!draftName.trim() || isSaving"
            class="px-2 py-1 rounded text-[10px] font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
            :class="
              isNameDirty
                ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#020617]'
                : 'bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]'
            "
            title="Lưu tên vào SQLite"
          >
            <Save class="w-3 h-3" />
            <span>Lưu</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Accent Color Bar + Random Avatar -->
    <div class="flex items-center justify-between gap-2 border-t border-[#1E293B] pt-2">
      <div class="flex items-center gap-1">
        <Palette class="w-3 h-3 text-[#94A3B8] mr-0.5" />
        <button
          v-for="c in QUICK_COLORS"
          :key="c"
          type="button"
          class="w-4 h-4 rounded-full border transition-transform hover:scale-110"
          :class="
            agent.color.toUpperCase() === c
              ? 'border-white scale-110 ring-1 ring-white/50'
              : 'border-[#334155]'
          "
          :style="{ backgroundColor: c }"
          :title="`Đổi màu ${c}`"
          @click="handleSelectColor(c)"
        />
      </div>

      <button
        type="button"
        data-testid="agent-random-avatar-btn"
        :disabled="isSaving"
        @click="handleRandomizeAvatar"
        class="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#38BDF8]/40 text-[#38BDF8] text-[10px] font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
      >
        <Dices class="w-3 h-3" />
        <span>Random</span>
      </button>
    </div>

    <!-- Search + Category Tabs -->
    <div class="flex flex-col gap-1.5 border-t border-[#1E293B] pt-2">
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-[10px] font-semibold text-[#F8FAFC] inline-flex items-center gap-1">
          <Sparkles class="w-3 h-3 text-[#FBBF24]" />
          Kho Assets Nhân Vật ({{ AGENT_AVATAR_CATALOG.length }})
        </span>
        <div class="relative w-36">
          <Search class="w-3 h-3 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            data-testid="avatar-search-input"
            type="text"
            placeholder="Tìm gà, robot..."
            class="w-full pl-6 pr-2 py-0.5 text-[10px] bg-[#0F172A] border border-[#334155] focus:border-[#38BDF8] rounded text-[#F8FAFC] outline-none"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="cat in AGENT_AVATAR_CATEGORY_META"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.id"
          class="px-1.5 py-0.5 rounded text-[9.5px] border transition-colors inline-flex items-center gap-1"
          :class="
            selectedCategory === cat.id
              ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] font-semibold'
              : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-[#E2E8F0]'
          "
        >
          <span>{{ cat.emoji }}</span>
          <span>{{ cat.label }}</span>
          <span class="opacity-70">({{ getCategoryCount(cat.id) }})</span>
        </button>
      </div>
    </div>

    <!-- Visual Pixelated Asset Grid -->
    <div
      data-testid="avatar-picker-grid"
      class="grid grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto pr-1"
    >
      <button
        v-for="preset in filteredPresets"
        :key="preset.id"
        type="button"
        :data-testid="`avatar-option-${preset.id}`"
        @click="handleSelectAvatar(preset.id)"
        class="relative p-1.5 rounded-lg border flex flex-col items-center gap-1 text-center transition-all hover:bg-[#1E293B]"
        :class="
          agent.avatar_sprite === preset.id
            ? 'bg-[#0F172A] border-[#38BDF8] ring-1 ring-[#38BDF8]/60'
            : 'bg-[#0F172A]/60 border-[#1E293B] hover:border-[#475569]'
        "
        :title="preset.label"
      >
        <span
          v-if="agent.avatar_sprite === preset.id"
          class="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#38BDF8] text-[#020617] flex items-center justify-center"
        >
          <Check class="w-2.5 h-2.5 stroke-[3]" />
        </span>

        <img
          :src="renderAgentAvatarToDataUrl(preset.id, agent.color)"
          :alt="preset.label"
          class="w-9 h-9 object-contain"
          style="image-rendering: pixelated;"
        />

        <span class="text-[9px] leading-tight text-[#CBD5E1] line-clamp-2 w-full">
          {{ preset.emoji }} {{ preset.label }}
        </span>
      </button>
    </div>
  </div>
</template>
