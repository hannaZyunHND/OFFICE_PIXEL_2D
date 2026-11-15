<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  RotateCw,
  Plus,
  Minus,
  Maximize2,
  Trash2,
  Download,
  Sparkles,
  Database,
  Save,
} from 'lucide-vue-next';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useUiStore } from '@/stores/useUiStore';
import {
  FURNITURE_CATALOG,
  getCanonicalFootprint,
  isRoamingFurnitureType,
  type FurnitureCategory,
  type FurnitureCatalogEntry,
} from '@/types/blueprint';
import {
  decorateBlueprintWithRichFurniture,
  findBestSlotForFurniture,
} from '@/services/compiler/deterministicLayoutEngine';

const blueprintStore = useBlueprintStore();
const workflowStore = useWorkflowStore();
const uiStore = useUiStore();

const activeCategory = ref<FurnitureCategory>('ECO_LOUNGE');
const searchQuery = ref<string>('');

const categoryTabs: { id: FurnitureCategory; label: string; emoji: string }[] = [
  { id: 'ECO_LOUNGE', label: 'Khu Sinh Thái (Cỡ Lớn)', emoji: '🌿' },
  { id: 'ROAMING_PETS_BOTS', label: 'Chạy Nhảy / Robot', emoji: '🤖' },
  { id: 'RECREATION', label: 'Giải Trí / Bi-a', emoji: '🎱' },
  { id: 'PANTRY_BAR', label: 'Quầy Bar / Bếp', emoji: '🍸' },
  { id: 'TECH_OFFICE', label: 'Công Nghệ / VP', emoji: '🖥️' },
];

const scalePresets = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];

const filteredCatalog = computed<FurnitureCatalogEntry[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    return FURNITURE_CATALOG.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q),
    );
  }
  return FURNITURE_CATALOG.filter((item) => item.category === activeCategory.value);
});

const selectedFurniture = computed(() => {
  if (!uiStore.selectedFurnitureId) return null;
  return (
    blueprintStore.blueprint.furniture.find(
      (f) => f.id === uiStore.selectedFurnitureId,
    ) || null
  );
});

const selectedCurrentScale = computed<number>(() => {
  const furn = selectedFurniture.value;
  if (!furn) return 1;
  if (typeof furn.scale === 'number' && furn.scale > 0) {
    return furn.scale;
  }
  const [canonW, canonH] = getCanonicalFootprint(furn.type);
  const isQuarterTurn = furn.facing === 'RIGHT' || furn.facing === 'LEFT';
  const baseW = isQuarterTurn ? canonH : canonW;
  const baseH = isQuarterTurn ? canonW : canonH;
  return Math.max(furn.footprint[0] / baseW, furn.footprint[1] / baseH, 0.5);
});

async function handleScaleFurniture(nextScale: number): Promise<void> {
  const furn = selectedFurniture.value;
  if (!furn) return;
  const res = blueprintStore.scaleFurnitureItem(furn.id, nextScale);
  if (res.success) {
    await workflowStore.syncActiveBlueprintToSqlite();
    uiStore.showToast(
      `📐 Đã phóng tỉ lệ "${furn.id}" lên ${res.scale}x (kích thước ${res.footprint[0]}x${res.footprint[1]} ô) & lưu vào SQLite!`,
      'success',
      2200,
    );
  } else {
    uiStore.showToast(
      res.error || 'Không thể đổi tỉ lệ nội thất tại vị trí này!',
      'warning',
      2500,
    );
  }
}

async function handleStepScale(delta: number): Promise<void> {
  const next = Math.round((selectedCurrentScale.value + delta) * 100) / 100;
  await handleScaleFurniture(next);
}

const roamingCount = computed(
  () =>
    blueprintStore.blueprint.furniture.filter((f) =>
      isRoamingFurnitureType(f.type),
    ).length,
);

async function handleRotate(): Promise<void> {
  if (!uiStore.selectedFurnitureId) return;
  const ok = blueprintStore.rotateFurnitureFacing(uiStore.selectedFurnitureId);
  if (ok) {
    const updated = selectedFurniture.value;
    await workflowStore.syncActiveBlueprintToSqlite();
    const angleLabel =
      updated?.facing === 'RIGHT'
        ? '90° Dọc (RIGHT)'
        : updated?.facing === 'DOWN'
          ? '180° Ngang (DOWN)'
          : updated?.facing === 'LEFT'
            ? '270° Dọc (LEFT)'
            : '0° Ngang (UP)';
    uiStore.showToast(
      `🔄 Đã xoay vật thể sang chiều ${angleLabel} (${updated?.footprint[0]}x${updated?.footprint[1]} ô) & lưu tự động vào SQLite!`,
      'success',
      2200,
    );
  } else {
    uiStore.showToast(
      'Không đủ khoảng trống xung quanh để xoay vật thể này!',
      'warning',
      2400,
    );
  }
}

async function handleDeleteSelected(): Promise<void> {
  if (!uiStore.selectedFurnitureId) return;
  const res = blueprintStore.removeFurnitureItem(uiStore.selectedFurnitureId);
  if (res.success) {
    uiStore.selectFurniture(null);
    await workflowStore.syncActiveBlueprintToSqlite();
    uiStore.showToast(
      '💾 Đã xóa vật thể & cập nhật phòng ban trong SQLite!',
      'info',
      2000,
    );
  } else {
    uiStore.showToast(res.error || 'Không thể xóa vật thể này', 'error', 2600);
  }
}

async function handleSpawnProp(entry: FurnitureCatalogEntry): Promise<void> {
  const preferZone =
    entry.category === 'TECH_OFFICE'
      ? 'WORK'
      : entry.category === 'ROAMING_PETS_BOTS'
        ? 'WORK'
        : 'IDLE';

  const candidate = findBestSlotForFurniture(
    blueprintStore.blueprint,
    entry.type,
    entry.footprint,
    preferZone,
    Date.now().toString(36).slice(-4),
  );

  if (candidate) {
    const res = blueprintStore.addFurnitureItem(candidate);
    if (res.success) {
      uiStore.selectFurniture(candidate.id);
      await workflowStore.syncActiveBlueprintToSqlite();
      uiStore.showToast(
        `💾 Đã thêm "${entry.label}" tại (${candidate.x}, ${candidate.y}) & lưu vào SQLite!`,
        'success',
        2400,
      );
      return;
    }
  }

  uiStore.showToast(
    'Bản đồ hiện tại đã kín chỗ trống cho kích thước này — hãy bấm "Trang Trí Tự Động 45+ Nội Thất" để mở rộng không gian!',
    'warning',
    3200,
  );
}

async function handleAutoDecorateRichOffice(): Promise<void> {
  const baseBp = JSON.parse(JSON.stringify(blueprintStore.blueprint));
  const ecoDome = baseBp.furniture.find(
    (f: { type: string; footprint: [number, number] }) =>
      f.type === 'ECO_BIOME_DOME',
  );
  if (!ecoDome || ecoDome.footprint[0] < 4) {
    baseBp.furniture = baseBp.furniture.filter(
      (f: { id: string; type: string; agent_id?: string }) =>
        Boolean(f.agent_id) ||
        f.type === 'DESK_PC' ||
        !f.id.includes('_auto_'),
    );
  }
  const enriched = decorateBlueprintWithRichFurniture(
    baseBp,
    46,
  );
  blueprintStore.setBlueprint(enriched);
  await workflowStore.syncActiveBlueprintToSqlite(enriched);
  uiStore.showToast(
    `✨ Đã trang trí văn phòng với ${enriched.furniture.length} nội thất (Khu sinh thái cỡ lớn 4x3, Hồ cá Koi 3x2, Vườn thiền, bàn bi-a, mèo, robot...) & lưu vào SQLite!`,
    'success',
    3800,
  );
}

async function handleManualSaveSqlite(): Promise<void> {
  const ok = await workflowStore.syncActiveBlueprintToSqlite();
  if (ok) {
    uiStore.showToast(
      `💾 Đã lưu toàn bộ ${blueprintStore.blueprint.furniture.length} nội thất của phòng ban "${workflowStore.activeWorkflow?.name}" vào SQLite!`,
      'success',
      2800,
    );
  }
}

function exportBlueprintJson(): void {
  const blob = new Blob(
    [JSON.stringify(blueprintStore.blueprint, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OfficeBlueprint.json';
  a.click();
  URL.revokeObjectURL(url);
  uiStore.showToast('Đã xuất file OfficeBlueprint.json!', 'success', 2200);
}
</script>

<template>
  <div
    v-if="uiStore.isEditMode"
    class="fixed top-14 left-4 bottom-28 z-20 hud-panel rounded-xl p-3.5 w-80 flex flex-col gap-2.5 pointer-events-auto shadow-2xl border border-[#A855F7]/50"
  >
    <!-- Header & SQLite Sync Badge -->
    <div class="flex items-center justify-between border-b border-[#334155] pb-2">
      <div class="flex items-center gap-1.5">
        <span class="font-pixel text-xs text-[#C084FC]">KHO NỘI THẤT (48 MÓN)</span>
      </div>
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#020617] border border-[#22C55E]/40 text-[10px] font-mono text-[#4ADE80]"
        title="Mọi thay đổi nội thất đều tự động lưu vào SQLite của phòng ban hiện tại"
      >
        <Database class="w-3 h-3" />
        <span>{{ blueprintStore.blueprint.furniture.length }} món • SQLite ✓</span>
      </span>
    </div>

    <!-- Stats & Auto-Decorate 45+ Items CTA -->
    <div class="flex items-center justify-between gap-2 text-[11px] text-[#94A3B8]">
      <span>
        Tổng: <strong class="text-[#F8FAFC]">{{ blueprintStore.blueprint.furniture.length }}</strong> nội thất
        (<strong class="text-[#38BDF8]">{{ roamingCount }}</strong> thú cưng/robot chạy nhảy)
      </span>
    </div>

    <button
      type="button"
      class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A855F7] hover:bg-[#9333EA] text-white font-sans text-xs font-bold transition-all cursor-pointer shadow-md"
      title="Tự động mở rộng và bày trí ~46 nội thất (Bàn bi-a, bóng bàn, khu sinh thái, quầy bar, lò vi sóng, mèo, robot hút bụi...) rồi lưu vào SQLite"
      @click="handleAutoDecorateRichOffice"
    >
      <Sparkles class="w-3.5 h-3.5" />
      <span>Trang Trí Đầy Đủ ~46 Nội Thất + Lưu SQLite</span>
    </button>

    <!-- Selected Furniture Controls -->
    <div
      v-if="selectedFurniture"
      class="rounded-lg bg-[#020617]/90 border border-[#A855F7]/60 p-2.5 space-y-2 shrink-0"
    >
      <div class="flex items-center justify-between text-xs gap-1">
        <span class="font-mono font-bold text-[#F8FAFC] truncate">{{
          selectedFurniture.id
        }}</span>
        <span class="font-mono text-[10.5px] text-[#C084FC] shrink-0">
          ({{ selectedFurniture.x }}, {{ selectedFurniture.y }}) •
          {{ selectedFurniture.footprint[0] }}x{{ selectedFurniture.footprint[1] }} ô •
          {{ selectedFurniture.facing }}
        </span>
      </div>

      <!-- Proportional Scale Controls -->
      <div class="rounded-md bg-[#0F172A] border border-[#334155] p-2 space-y-1.5">
        <div class="flex items-center justify-between text-[10.5px]">
          <span class="inline-flex items-center gap-1 font-semibold text-[#E2E8F0]">
            <Maximize2 class="w-3 h-3 text-[#38BDF8]" />
            <span>Tỉ lệ kích thước (Chuẩn tỉ lệ):</span>
          </span>
          <span class="font-mono font-bold text-[#38BDF8]">
            {{ selectedCurrentScale }}x ({{ selectedFurniture.footprint[0] }}x{{ selectedFurniture.footprint[1] }} ô)
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="hud-btn flex-1 justify-center !py-1 text-[11px]"
            title="Thu nhỏ tỉ lệ (-0.25x)"
            @click="handleStepScale(-0.25)"
          >
            <Minus class="w-3 h-3 text-[#FBBF24]" />
            <span>Thu nhỏ</span>
          </button>

          <button
            type="button"
            class="hud-btn flex-1 justify-center !py-1 text-[11px]"
            title="Phóng to tỉ lệ (+0.25x)"
            @click="handleStepScale(0.25)"
          >
            <Plus class="w-3 h-3 text-[#4ADE80]" />
            <span>Phóng to</span>
          </button>
        </div>

        <div class="flex items-center gap-1 flex-wrap">
          <button
            v-for="preset in scalePresets"
            :key="preset"
            type="button"
            class="px-1.5 py-0.5 rounded font-mono text-[10px] border transition-colors cursor-pointer"
            :class="
              Math.abs(selectedCurrentScale - preset) < 0.05
                ? 'bg-[#38BDF8]/25 border-[#38BDF8] text-[#38BDF8] font-bold'
                : 'bg-[#020617] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]'
            "
            @click="handleScaleFurniture(preset)"
          >
            {{ preset }}x
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="hud-btn flex-1 justify-center !py-1 text-xs"
          title="Xoay cả vật thể và vùng chiếm chỗ 90° theo chiều kim đồng hồ (Ngang ↔ Dọc)"
          @click="handleRotate"
        >
          <RotateCw class="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Xoay Chiều (90°)</span>
        </button>

        <button
          type="button"
          class="hud-btn !py-1 !px-2.5 text-[#F87171] border-[#EF4444]/40"
          :disabled="Boolean(selectedFurniture.agent_id)"
          :title="
            selectedFurniture.agent_id
              ? 'Không thể xóa bàn làm việc đang gắn với Agent'
              : 'Xóa vật thể này & lưu SQLite'
          "
          @click="handleDeleteSelected"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Search & Category Filter Tabs -->
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Tìm nội thất (VD: bi-a, mèo, robot, bar, lò vi sóng...)"
      class="w-full bg-[#020617] border border-[#334155] focus:border-[#C084FC] rounded-md px-2.5 py-1.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none shrink-0"
    />

    <div
      v-if="!searchQuery.trim()"
      class="flex flex-wrap gap-1 shrink-0"
    >
      <button
        v-for="tab in categoryTabs"
        :key="tab.id"
        type="button"
        class="px-2 py-1 rounded text-[10.5px] font-medium transition-colors cursor-pointer border"
        :class="
          activeCategory === tab.id
            ? 'bg-[#A855F7]/25 border-[#A855F7] text-[#F8FAFC]'
            : 'bg-[#020617]/70 border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]'
        "
        @click="activeCategory = tab.id"
      >
        <span>{{ tab.emoji }} {{ tab.label }}</span>
      </button>
    </div>

    <!-- Scrollable Catalog List -->
    <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
      <button
        v-for="item in filteredCatalog"
        :key="item.type"
        type="button"
        class="w-full hud-btn justify-between !py-1.5 !px-2.5 text-xs hover:border-[#A855F7]"
        @click="handleSpawnProp(item)"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm shrink-0">{{ item.emoji }}</span>
          <span class="truncate text-left text-[#F8FAFC]">{{ item.label }}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span
            class="px-1.5 py-0.2 rounded bg-[#0F172A] border border-[#334155] text-[9.5px] font-mono text-[#94A3B8]"
            title="Kích thước chuẩn trên lưới (Rộng x Cao)"
          >
            {{ item.footprint[0] }}x{{ item.footprint[1] }}
          </span>
          <span
            v-if="item.isRoaming"
            class="px-1.5 py-0.2 rounded bg-[#22C55E]/20 border border-[#22C55E]/40 text-[9.5px] font-mono text-[#4ADE80]"
          >
            Chạy nhảy
          </span>
          <Plus class="w-3.5 h-3.5 text-[#22C55E]" />
        </div>
      </button>
    </div>

    <!-- Footer: Save SQLite & Export JSON -->
    <div class="pt-2 border-t border-[#334155] flex items-center gap-2 shrink-0">
      <button
        type="button"
        class="hud-btn flex-1 justify-center !py-1.5 text-xs border-[#22C55E]/50 text-[#4ADE80]"
        title="Lưu ngay bố cục nội thất hiện tại vào đúng phòng ban trong SQLite"
        @click="handleManualSaveSqlite"
      >
        <Save class="w-3.5 h-3.5" />
        <span>Lưu Vào SQLite</span>
      </button>

      <button
        type="button"
        class="hud-btn !py-1.5 !px-2.5 text-xs border-[#38BDF8]/40 text-[#38BDF8]"
        title="Tải xuống file OfficeBlueprint.json"
        @click="exportBlueprintJson"
      >
        <Download class="w-3.5 h-3.5" />
        <span>JSON</span>
      </button>
    </div>
  </div>
</template>
