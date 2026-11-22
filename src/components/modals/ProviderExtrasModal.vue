<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  X,
  KeyRound,
  SlidersHorizontal,
  ShieldAlert,
  Wrench,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
} from 'lucide-vue-next';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { HitlPolicyMode } from '@/services/storage/localConfig';

const uiStore = useUiStore();
const settingsStore = useSettingsStore();

const isOpen = computed(() => uiStore.activeModal === 'PROVIDER_EXTRAS');

const addlivetagApiKey = ref('');
const apifyApiToken = ref('');
const serperApiKey = ref('');
const apifyMaxItemsPerPlatform = ref(20);
const hitlPolicy = ref<HitlPolicyMode>('auto_skip');
const allowSandboxFallback = ref(true);
const showSecrets = ref(false);

watch(isOpen, (open) => {
  if (!open) return;
  const ex = settingsStore.settings.extras;
  addlivetagApiKey.value = ex.addlivetagApiKey;
  apifyApiToken.value = ex.apifyApiToken;
  serperApiKey.value = ex.serperApiKey;
  apifyMaxItemsPerPlatform.value = ex.apifyMaxItemsPerPlatform;
  hitlPolicy.value = ex.hitlPolicy;
  allowSandboxFallback.value = ex.allowSandboxFallback;
});

function handleSaveExtras(): void {
  settingsStore.updateSettings({
    extras: {
      addlivetagApiKey: addlivetagApiKey.value.trim(),
      apifyApiToken: apifyApiToken.value.trim(),
      serperApiKey: serperApiKey.value.trim(),
      apifyMaxItemsPerPlatform: Math.max(
        5,
        Math.min(50, Number(apifyMaxItemsPerPlatform.value) || 15),
      ),
      hitlPolicy: hitlPolicy.value,
      allowSandboxFallback: allowSandboxFallback.value,
    },
  });
  uiStore.showToast(
    '✅ Đã lưu API Keys & Cấu hình Extras (chỉ lưu cục bộ trên trình duyệt)!',
    'success',
    2800,
  );
  uiStore.closeModal();
}
</script>

<template>
  <transition name="toast-fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
      @click.self="uiStore.closeModal()"
    >
      <div
        data-testid="provider-extras-modal"
        class="w-full max-w-2xl rounded-xl hud-panel border border-[#334155] bg-[#0F172A] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        <!-- Header -->
        <div class="px-5 py-3.5 border-b border-[#334155] flex items-center justify-between bg-[#020617]/70">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/40 flex items-center justify-center">
              <SlidersHorizontal class="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-[#F8FAFC]">
                External Tool API Keys & Extras (HITL / Quota)
              </h2>
              <p class="text-[11px] text-[#94A3B8]">
                Cấu hình khóa kết nối API thật (AddLiveTag / Apify / Serper) và chính sách duyệt HITL
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="uiStore.closeModal()"
            class="p-1.5 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-white"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="p-5 space-y-4 overflow-y-auto">
          <!-- Security Notice -->
          <div class="p-3 rounded-lg bg-[#020617] border border-[#334155] flex items-start gap-2.5 text-xs text-[#CBD5E1]">
            <KeyRound class="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
            <div>
              Mặc định backend đọc 3 key từ file <code class="text-[#34D399]">.env</code> (<code class="text-[#38BDF8]">ADDLIVETAG_API_KEY</code>, <code class="text-[#38BDF8]">APIFY_API_TOKEN</code>, <code class="text-[#38BDF8]">SERPER_API_KEY</code>). Key nhập thêm ở đây chỉ lưu trong <code class="text-[#38BDF8]">localStorage</code> trình duyệt để override tạm (không ghi SQLite/Git); nếu đều bỏ trống, hệ thống dùng <strong>Sandbox Fallback</strong> để test E2E.
            </div>
          </div>

          <!-- Provider Keys -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[#F8FAFC]">1. External Market Data API Keys</span>
              <button
                type="button"
                @click="showSecrets = !showSecrets"
                class="text-[11px] text-[#38BDF8] hover:underline inline-flex items-center gap-1"
              >
                <EyeOff v-if="showSecrets" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
                <span>{{ showSecrets ? 'Ẩn Keys' : 'Hiện Keys' }}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 gap-2.5">
              <div>
                <label class="text-[11px] text-[#F97316] font-semibold block mb-1">
                  🟠 AddLiveTag API Key (Shopee / Sàn Cam — data.addlivetag.com)
                </label>
                <input
                  v-model="addlivetagApiKey"
                  data-testid="extras-addlivetag-key"
                  :type="showSecrets ? 'text' : 'password'"
                  placeholder="Để trống nếu dùng Sandbox hoặc ADDLIVETAG_API_KEY trong .env server"
                  class="w-full px-3 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#F97316] text-xs text-[#F8FAFC] font-mono outline-none"
                />
              </div>

              <div>
                <label class="text-[11px] text-[#38BDF8] font-semibold block mb-1">
                  🔵⚫ Apify API Token (Lazada & TikTok Shop Actors — $5 free credit/tháng)
                </label>
                <input
                  v-model="apifyApiToken"
                  data-testid="extras-apify-token"
                  :type="showSecrets ? 'text' : 'password'"
                  placeholder="apify_api_... (tùy chọn)"
                  class="w-full px-3 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#38BDF8] text-xs text-[#F8FAFC] font-mono outline-none"
                />
              </div>

              <div>
                <label class="text-[11px] text-[#10B981] font-semibold block mb-1">
                  🔍 Serper.dev API Key (Google VN Search Signal — 2,500 free queries)
                </label>
                <input
                  v-model="serperApiKey"
                  data-testid="extras-serper-key"
                  :type="showSecrets ? 'text' : 'password'"
                  placeholder="Khóa X-API-KEY từ serper.dev (tùy chọn)"
                  class="w-full px-3 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#10B981] text-xs text-[#F8FAFC] font-mono outline-none"
                />
              </div>
            </div>
          </div>

          <!-- HITL Policy & Quota Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1E293B]">
            <div>
              <label class="text-[11px] font-semibold text-[#FBBF24] flex items-center gap-1 mb-1">
                <ShieldAlert class="w-3.5 h-3.5" />
                Chế độ Human-in-the-Loop (HITL)
              </label>
              <select
                v-model="hitlPolicy"
                data-testid="extras-hitl-policy"
                class="w-full px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] text-xs text-[#F8FAFC] outline-none"
              >
                <option value="auto_skip">Tự động toàn bộ (Mặc định — Xuất báo cáo luôn)</option>
                <option value="heavy_tools_only">Dừng Gate #1 trước khi gọi API nặng</option>
                <option value="standard_2_gates">Duyệt đủ 2 bước (Scope + Chốt ngách)</option>
              </select>
            </div>

            <div>
              <label class="text-[11px] font-semibold text-[#CBD5E1] block mb-1">
                Giới hạn SKU mỗi sàn (Apify Quota Guard)
              </label>
              <input
                v-model.number="apifyMaxItemsPerPlatform"
                data-testid="extras-max-items"
                type="number"
                min="5"
                max="50"
                class="w-full px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] text-xs text-[#F8FAFC] font-mono outline-none"
              />
            </div>

            <label class="sm:col-span-2 flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
              <input
                v-model="allowSandboxFallback"
                type="checkbox"
                class="rounded bg-[#020617] border-[#334155]"
              />
              <span>Tự động dùng Sandbox Fallback (gắn nhãn SANDBOX rõ ràng) khi thiếu API Key hoặc lỗi mạng</span>
            </label>
          </div>

          <!-- Registered External Functions Preview -->
          <div class="pt-2 border-t border-[#1E293B] space-y-2">
            <div class="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5">
              <Wrench class="w-3.5 h-3.5 text-[#A855F7]" />
              <span>External Functions đã đồng bộ từ CrewAI Backend ({{ uiStore.registeredExternalTools.length }})</span>
            </div>

            <div
              v-if="uiStore.registeredExternalTools.length === 0"
              class="p-2.5 rounded bg-[#020617] border border-[#1E293B] text-[11px] text-[#64748B]"
            >
              Chưa nhận danh sách tool (hãy chạy <code>python crewAI/server.py</code> để đồng bộ qua WebSocket).
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              <div
                v-for="tool in uiStore.registeredExternalTools"
                :key="tool.name"
                class="p-2 rounded bg-[#020617] border border-[#334155] text-[11px]"
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="font-mono text-[#38BDF8] font-semibold truncate">{{ tool.name }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0"
                    :class="
                      tool.cost_tier === 'free'
                        ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                        : 'bg-[#F59E0B]/20 text-[#FBBF24]'
                    "
                  >
                    {{ tool.requires_hitl ? 'HITL · CREDIT' : tool.cost_tier.toUpperCase() }}
                  </span>
                </div>
                <div class="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-2">
                  {{ tool.description }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-[#334155] bg-[#020617]/80 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="uiStore.closeModal()"
            class="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs text-[#CBD5E1]"
          >
            Đóng
          </button>
          <button
            type="button"
            data-testid="save-extras-btn"
            @click="handleSaveExtras()"
            class="px-4 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#020617] text-xs font-bold inline-flex items-center gap-1.5"
          >
            <CheckCircle2 class="w-4 h-4" />
            <Save class="w-3.5 h-3.5" />
            <span>Lưu Cấu Hình Extras</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
