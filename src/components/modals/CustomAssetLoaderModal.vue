<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  X,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Trash2,
  CheckCircle2,
} from 'lucide-vue-next';
import { useUiStore } from '@/stores/useUiStore';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import {
  getAllCustomSpriteAssets,
  saveCustomSpriteAsset,
  deleteCustomSpriteAsset,
  generateSampleDirectionalSpriteSheetBlob,
} from '@/services/storage/indexedDbAssets';
import type { CustomSpriteAsset, SpriteAssetCategory } from '@/types/assets';

const emit = defineEmits<{
  (e: 'assetsUpdated'): void;
}>();

const uiStore = useUiStore();
const blueprintStore = useBlueprintStore();

const savedAssets = ref<CustomSpriteAsset[]>([]);
const category = ref<SpriteAssetCategory>('AGENT');
const targetId = ref<string>(
  blueprintStore.blueprint.agents[0]?.id || 'agent_researcher',
);
const assetName = ref<string>('Custom Cyber Sprite');
const selectedBlob = ref<Blob | null>(null);
const previewDataUrl = ref<string | null>(null);
const statusMessage = ref<string | null>(null);

async function refreshAssetsList(): Promise<void> {
  const list = await getAllCustomSpriteAssets();
  savedAssets.value = list.map((item) => ({
    ...item,
    data_url: item.png_blob ? URL.createObjectURL(item.png_blob) : undefined,
  }));
}

onMounted(() => {
  void refreshAssetsList();
});

watch(
  () => uiStore.activeModal,
  (modal) => {
    if (modal === 'ASSETS') {
      targetId.value =
        category.value === 'AGENT'
          ? blueprintStore.blueprint.agents[0]?.id || 'agent_researcher'
          : 'DESK_PC';
      void refreshAssetsList();
    }
  },
);

watch(category, (nextCat) => {
  targetId.value =
    nextCat === 'AGENT'
      ? blueprintStore.blueprint.agents[0]?.id || 'agent_researcher'
      : 'DESK_PC';
});

function handleFileSelect(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  selectedBlob.value = file;
  assetName.value = file.name.replace(/\.png$/i, '');
  if (previewDataUrl.value) URL.revokeObjectURL(previewDataUrl.value);
  previewDataUrl.value = URL.createObjectURL(file);
}

async function handleGenerateSampleSprite(): Promise<void> {
  const blob = await generateSampleDirectionalSpriteSheetBlob('#ec4899', '#38bdf8');
  selectedBlob.value = blob;
  assetName.value = 'Neon Cyber Visor (4-Row 32x32)';
  if (previewDataUrl.value) URL.revokeObjectURL(previewDataUrl.value);
  previewDataUrl.value = URL.createObjectURL(blob);
}

async function handleSaveToIndexedDb(): Promise<void> {
  if (!selectedBlob.value) return;
  const record: CustomSpriteAsset = {
    id: `sprite_${targetId.value}_${Date.now().toString(36)}`,
    name: assetName.value || 'Custom Sprite',
    category: category.value,
    target_id: targetId.value,
    tile_width: 32,
    tile_height: 32,
    rows: category.value === 'AGENT' ? 4 : 1,
    frames_per_row: 4,
    png_blob: selectedBlob.value,
    created_at: Date.now(),
  };

  await saveCustomSpriteAsset(record);
  await refreshAssetsList();
  emit('assetsUpdated');
  statusMessage.value = `Đã lưu Sprite Sheet vào IndexedDB và áp dụng cho "${targetId.value}"!`;
  uiStore.showToast(statusMessage.value, 'success', 2800);
}

async function handleRemoveAsset(id: string): Promise<void> {
  await deleteCustomSpriteAsset(id);
  await refreshAssetsList();
  emit('assetsUpdated');
  uiStore.showToast('Đã xóa Custom Sprite & khôi phục Procedural Pixel Art', 'info');
}
</script>

<template>
  <div
    v-if="uiStore.activeModal === 'ASSETS'"
    class="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
    @click.self="uiStore.closeModal()"
  >
    <div
      class="hud-panel rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-[#334155]"
    >
      <!-- Header -->
      <div
        class="px-5 py-3.5 border-b border-[#334155] flex items-center justify-between bg-[#0F172A]"
      >
        <div class="flex items-center gap-2.5">
          <ImageIcon class="w-4 h-4 text-[#C084FC]" />
          <h2 class="font-pixel text-sm text-[#F8FAFC]">
            CUSTOM SPRITE SHEET LOADER (32x32px • INDEXEDDB)
          </h2>
        </div>

        <button
          type="button"
          class="p-1 rounded-md text-[#94A3B8] hover:text-white cursor-pointer"
          @click="uiStore.closeModal()"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 overflow-y-auto space-y-5">
        <p class="text-xs text-[#94A3B8] leading-relaxed">
          Tải lên file ảnh <code class="text-[#38BDF8] font-mono">.png</code> chuẩn lưới
          <strong class="text-white">32x32px</strong> (4 hàng cho nhân vật:
          <code class="text-[#4ADE80] font-mono">Down, Left, Right, Up</code>). Dữ liệu
          được lưu bền vững trực tiếp trong trình duyệt qua
          <strong class="text-[#C084FC]">IndexedDB</strong>.
        </p>

        <!-- Target Selection & File Upload -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#020617]/80 p-4 rounded-xl border border-[#334155]">
          <div class="space-y-3">
            <div>
              <label class="block text-[11px] font-mono text-[#94A3B8] mb-1">
                LOẠI ĐỐI TƯỢNG:
              </label>
              <select
                v-model="category"
                class="w-full bg-[#0F172A] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-white font-mono"
              >
                <option value="AGENT">Agent Avatar (4-Row Directional 32x32)</option>
                <option value="FURNITURE">Furniture Texture</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-mono text-[#94A3B8] mb-1">
                GÁN CHO ĐỐI TƯỢNG:
              </label>
              <select
                v-if="category === 'AGENT'"
                v-model="targetId"
                class="w-full bg-[#0F172A] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-white"
              >
                <option
                  v-for="ag in blueprintStore.blueprint.agents"
                  :key="ag.id"
                  :value="ag.id"
                >
                  {{ ag.name }} ({{ ag.id }})
                </option>
              </select>
              <select
                v-else
                v-model="targetId"
                class="w-full bg-[#0F172A] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-white font-mono"
              >
                <option value="DESK_PC">DESK_PC (Bàn máy tính)</option>
                <option value="COFFEE_MACHINE">COFFEE_MACHINE (Máy pha cà phê)</option>
                <option value="SOFA">SOFA (Ghế nghỉ)</option>
                <option value="PLANT">PLANT (Cây cảnh)</option>
                <option value="AQUARIUM">AQUARIUM (Hồ cá)</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <label
                class="hud-btn text-xs cursor-pointer border-[#C084FC]/50 text-[#E2E8F0]"
              >
                <Upload class="w-3.5 h-3.5 text-[#C084FC]" />
                <span>Chọn file .PNG</span>
                <input
                  type="file"
                  accept="image/png"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </label>

              <button
                type="button"
                class="hud-btn text-xs text-[#38BDF8] border-[#38BDF8]/40"
                title="Tạo ngay 1 Sprite Sheet mẫu 128x128px (4x4 ô 32x32px) để test nhanh"
                @click="handleGenerateSampleSprite"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Tạo Sprite Mẫu 32x32</span>
              </button>
            </div>
          </div>

          <!-- Preview & Save Column -->
          <div class="flex flex-col items-center justify-between bg-[#0F172A] rounded-lg border border-[#334155] p-3">
            <div class="text-[11px] font-mono text-[#94A3B8]">
              PREVIEW SPRITE SHEET (PIXELATED)
            </div>

            <div
              class="my-2 w-28 h-28 rounded bg-[#020617] border border-[#334155] flex items-center justify-center overflow-hidden"
            >
              <img
                v-if="previewDataUrl"
                :src="previewDataUrl"
                alt="Sprite Preview"
                class="w-24 h-24 object-contain"
                style="image-rendering: pixelated"
              />
              <span v-else class="text-[11px] text-[#64748B] text-center px-2">
                Chưa chọn file .png
              </span>
            </div>

            <button
              type="button"
              :disabled="!selectedBlob"
              class="w-full py-1.5 px-3 rounded bg-[#22C55E] text-[#020617] font-semibold text-xs hover:bg-[#16A34A] transition-colors cursor-pointer disabled:opacity-40"
              @click="handleSaveToIndexedDb"
            >
              Lưu vào IndexedDB &amp; Áp dụng
            </button>
          </div>
        </div>

        <!-- Installed IndexedDB Assets List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
            <span>Danh sách Sprite Sheets đang lưu trong IndexedDB ({{ savedAssets.length }})</span>
          </div>

          <div
            v-if="savedAssets.length === 0"
            class="rounded-lg bg-[#020617]/60 border border-[#334155] p-4 text-xs text-[#64748B] text-center"
          >
            Chưa có Custom Sprite nào trong IndexedDB — Engine đang sử dụng
            <strong class="text-[#4ADE80]">Procedural Pixel Graphics Fallback</strong>.
          </div>

          <div
            v-for="asset in savedAssets"
            :key="asset.id"
            class="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#020617]/90 border border-[#334155]"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="asset.data_url"
                :src="asset.data_url"
                alt="Asset"
                class="w-10 h-10 rounded bg-[#0F172A] border border-[#334155] object-contain"
                style="image-rendering: pixelated"
              />
              <div>
                <div class="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                  <span>{{ asset.name }}</span>
                  <CheckCircle2 class="w-3.5 h-3.5 text-[#22C55E]" />
                </div>
                <div class="text-[11px] font-mono text-[#94A3B8]">
                  Target: {{ asset.target_id }} ({{ asset.category }})
                </div>
              </div>
            </div>

            <button
              type="button"
              class="hud-btn !py-1 !px-2.5 text-xs text-[#F87171] border-[#EF4444]/40"
              title="Xóa & quay về Procedural Pixel Art"
              @click="handleRemoveAsset(asset.id)"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Revert</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
