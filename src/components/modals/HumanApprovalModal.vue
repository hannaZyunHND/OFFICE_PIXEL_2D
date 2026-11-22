<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ShieldCheck,
  CheckCircle2,
  Edit3,
  XCircle,
  Minimize2,
  Maximize2,
  Coins,
  UserCheck,
} from 'lucide-vue-next';
import { useUiStore } from '@/stores/useUiStore';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import type { HitlApprovalResponse } from '@/types/events';

const emit = defineEmits<{
  (e: 'submitDecision', response: HitlApprovalResponse): void;
}>();

const uiStore = useUiStore();
const blueprintStore = useBlueprintStore();

const isMinimized = ref(false);
const selectedChoiceIds = ref<string[]>([]);
const formValues = ref<Record<string, string | number>>({});
const directorNote = ref('');

const request = computed(() => uiStore.pendingHitlApproval);

const requestingAgent = computed(() => {
  if (!request.value) return null;
  return (
    blueprintStore.blueprint.agents.find((a) => a.id === request.value?.agent_id) ||
    null
  );
});

watch(
  () => request.value?.approval_id,
  () => {
    const req = request.value;
    if (!req) return;
    isMinimized.value = false;
    directorNote.value = '';
    selectedChoiceIds.value = (req.choices || [])
      .filter((c) => c.default_selected)
      .map((c) => c.id);

    const nextFields: Record<string, string | number> = {};
    for (const f of req.form_fields || []) {
      if (f.default_value !== undefined) {
        nextFields[f.key] = f.default_value;
      } else {
        nextFields[f.key] = f.type === 'number' ? 0 : '';
      }
    }
    formValues.value = nextFields;
  },
  { immediate: true },
);

function toggleChoice(id: string): void {
  const isMulti = request.value?.multi_select !== false;
  if (!isMulti) {
    selectedChoiceIds.value = [id];
    return;
  }
  if (selectedChoiceIds.value.includes(id)) {
    selectedChoiceIds.value = selectedChoiceIds.value.filter((c) => c !== id);
  } else {
    selectedChoiceIds.value = [...selectedChoiceIds.value, id];
  }
}

function submitDecision(decision: 'approve' | 'edit' | 'reject'): void {
  if (!request.value) return;
  emit('submitDecision', {
    approval_id: request.value.approval_id,
    decision,
    selected_choices: selectedChoiceIds.value,
    inputs: { ...formValues.value },
    note: directorNote.value.trim(),
  });
}
</script>

<template>
  <transition name="toast-fade">
    <div
      v-if="request"
      data-testid="hitl-approval-panel"
      class="fixed z-40 pointer-events-auto transition-all"
      :class="
        isMinimized
          ? 'top-16 right-4 w-80'
          : 'top-16 left-1/2 -translate-x-1/2 w-[94vw] max-w-[600px]'
      "
    >
      <div
        class="hud-panel border-2 border-[#F59E0B]/80 rounded-xl shadow-2xl overflow-hidden bg-[#0F172A]/98 backdrop-blur-md"
      >
        <!-- Header -->
        <div
          class="px-4 py-2.5 bg-gradient-to-r from-[#F59E0B]/20 via-[#0F172A] to-[#38BDF8]/15 border-b border-[#334155] flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-8 h-8 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/60 flex items-center justify-center shrink-0 animate-pulse"
            >
              <UserCheck class="w-4 h-4 text-[#FBBF24]" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-pixel text-[11px] text-[#FBBF24] tracking-wider uppercase">
                  HUMAN-IN-THE-LOOP · CHỜ GIÁM ĐỐC DUYỆT
                </span>
                <span
                  v-if="request.estimated_cost_usd && request.estimated_cost_usd > 0"
                  class="px-1.5 py-0.5 rounded bg-[#020617] border border-[#334155] text-[10px] font-mono text-[#34D399] inline-flex items-center gap-1"
                >
                  <Coins class="w-3 h-3" /> ~${{ request.estimated_cost_usd.toFixed(2) }}
                </span>
              </div>
              <p class="text-xs font-semibold text-[#F8FAFC] truncate">
                {{ request.step_title }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="isMinimized = !isMinimized"
            class="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
            :title="isMinimized ? 'Mở rộng bảng duyệt' : 'Thu gọn để xem văn phòng'"
          >
            <Maximize2 v-if="isMinimized" class="w-3.5 h-3.5" />
            <Minimize2 v-else class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Body -->
        <div v-if="!isMinimized" class="p-4 space-y-3.5 max-h-[72vh] overflow-y-auto">
          <!-- Requesting Agent Pill -->
          <div class="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>
              Agent trình duyệt:
              <strong class="text-[#F8FAFC]">{{
                requestingAgent?.name || request.agent_id
              }}</strong>
            </span>
            <span class="font-mono px-2 py-0.5 rounded bg-[#020617] border border-[#334155] text-[#38BDF8]">
              {{ request.stage || 'APPROVAL' }}
            </span>
          </div>

          <!-- Context Summary -->
          <div
            class="p-3 rounded-lg bg-[#020617] border border-[#334155] text-xs text-[#E2E8F0] whitespace-pre-wrap leading-relaxed"
          >
            {{ request.summary_md }}
          </div>

          <!-- Choices (Checkboxes / Radios) -->
          <div v-if="request.choices && request.choices.length > 0" class="space-y-1.5">
            <label class="text-[11px] font-semibold text-[#F8FAFC] flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5 text-[#38BDF8]" />
              Lựa chọn phạm vi / hướng xử lý:
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="ch in request.choices"
                :key="ch.id"
                type="button"
                :data-testid="`hitl-choice-${ch.id}`"
                @click="toggleChoice(ch.id)"
                class="p-2.5 rounded-lg border text-left transition-all flex items-start gap-2"
                :class="
                  selectedChoiceIds.includes(ch.id)
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#F8FAFC]'
                    : 'bg-[#020617]/70 border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                "
              >
                <span
                  class="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[10px]"
                  :class="
                    selectedChoiceIds.includes(ch.id)
                      ? 'bg-[#38BDF8] border-[#38BDF8] text-[#020617] font-bold'
                      : 'border-[#475569]'
                  "
                >
                  {{ selectedChoiceIds.includes(ch.id) ? '✓' : '' }}
                </span>
                <div class="min-w-0">
                  <div class="text-xs font-semibold">{{ ch.label }}</div>
                  <div v-if="ch.description" class="text-[10px] opacity-80 leading-snug mt-0.5">
                    {{ ch.description }}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Dynamic Human Inputs (VD: Giá vốn VNĐ, Giới hạn SKU, Từ khóa loại trừ) -->
          <div
            v-if="request.form_fields && request.form_fields.length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
          >
            <div
              v-for="field in request.form_fields"
              :key="field.key"
              :class="field.type === 'textarea' ? 'sm:col-span-2' : ''"
              class="flex flex-col gap-1"
            >
              <label class="text-[11px] font-medium text-[#CBD5E1]">
                {{ field.label }}
              </label>

              <select
                v-if="field.type === 'select'"
                v-model="formValues[field.key]"
                :data-testid="`hitl-input-${field.key}`"
                class="px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#38BDF8] text-xs text-[#F8FAFC] outline-none"
              >
                <option
                  v-for="opt in field.options || []"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>

              <textarea
                v-else-if="field.type === 'textarea'"
                v-model="formValues[field.key]"
                :data-testid="`hitl-input-${field.key}`"
                rows="2"
                :placeholder="field.placeholder || ''"
                class="px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#38BDF8] text-xs text-[#F8FAFC] outline-none"
              />

              <input
                v-else
                v-model="formValues[field.key]"
                :data-testid="`hitl-input-${field.key}`"
                :type="field.type === 'number' ? 'number' : 'text'"
                :placeholder="field.placeholder || ''"
                class="px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#38BDF8] text-xs text-[#F8FAFC] font-mono outline-none"
              />
            </div>
          </div>

          <!-- Optional Note -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-medium text-[#94A3B8]">
              Ghi chú chỉ đạo của Giám đốc (tùy chọn)
            </label>
            <input
              v-model="directorNote"
              data-testid="hitl-director-note"
              type="text"
              placeholder="VD: Tập trung TikTok Affiliate hoặc tránh hàng dễ vỡ..."
              class="px-2.5 py-1.5 rounded bg-[#020617] border border-[#334155] focus:border-[#38BDF8] text-xs text-[#F8FAFC] outline-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
            <button
              type="button"
              data-testid="hitl-reject-btn"
              @click="submitDecision('reject')"
              class="px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/50 text-[#F87171] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>Bỏ Qua / Dừng Nhánh</span>
            </button>

            <button
              type="button"
              data-testid="hitl-edit-btn"
              @click="submitDecision('edit')"
              class="px-3 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/60 text-[#38BDF8] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Áp Dụng Chỉnh Sửa</span>
            </button>

            <button
              type="button"
              data-testid="hitl-approve-btn"
              @click="submitDecision('approve')"
              class="px-4 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#020617] text-xs font-bold inline-flex items-center gap-1.5 shadow-lg transition-colors"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Duyệt & Chạy Tiếp</span>
            </button>
          </div>
        </div>

        <!-- Minimized Footer Strip -->
        <div v-else class="px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <span class="text-[#CBD5E1] truncate">Nhân viên đang đợi tại bàn Giám đốc...</span>
          <button
            type="button"
            @click="isMinimized = false"
            class="px-2 py-1 rounded bg-[#F59E0B] text-[#020617] font-bold text-[11px] shrink-0"
          >
            Mở Duyệt
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
