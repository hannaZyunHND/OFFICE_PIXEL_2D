<script setup lang="ts">
import { Download, AlertTriangle, Code2 } from 'lucide-vue-next';
import type { StoredTelemetryEvent } from '@/types/events';

const props = defineProps<{
  event: StoredTelemetryEvent | undefined;
}>();

const emit = defineEmits<{
  (e: 'downloadFull', event: StoredTelemetryEvent): void;
}>();
</script>

<template>
  <div class="space-y-2.5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
        <Code2 class="w-3.5 h-3.5 text-[#38BDF8]" />
        <span>Latest Prompt / Output Payload</span>
      </div>
      <button
        v-if="props.event"
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
        title="Tải xuống toàn bộ JSON sự kiện gốc (không cắt gọn)"
        @click="emit('downloadFull', props.event)"
      >
        <Download class="w-3 h-3" />
        <span>Download Full JSON</span>
      </button>
    </div>

    <div
      v-if="!props.event"
      class="rounded-lg bg-[#020617]/80 border border-[#334155] p-3 text-xs text-[#94A3B8] italic"
    >
      Chưa có dữ liệu sự kiện cho Agent này. Hãy nhập yêu cầu ở ô chat phía dưới và bấm
      <strong class="text-[#22C55E]">🚀 Gửi &amp; Chạy Flow</strong> để bắt đầu!
    </div>

    <template v-else>
      <!-- 10KB Truncation Alert Banner -->
      <div
        v-if="props.event.input_truncated || props.event.output_truncated"
        class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[11px]"
      >
        <div class="flex items-center gap-1.5">
          <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
          <span>Payload &gt; 10KB đã được cắt gọn để bảo vệ RAM</span>
        </div>
        <button
          type="button"
          class="underline font-semibold cursor-pointer shrink-0"
          @click="emit('downloadFull', props.event)"
        >
          Tải bản đầy đủ
        </button>
      </div>

      <!-- Input Payload Box -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
          <span>INPUT / PROMPT</span>
          <span>{{ props.event.input_byte_length.toLocaleString() }} bytes</span>
        </div>
        <pre
          class="max-h-32 overflow-y-auto rounded-md bg-[#020617] border border-[#334155] p-2.5 font-mono text-[11px] text-[#E2E8F0] whitespace-pre-wrap break-all leading-relaxed"
        >{{ props.event.input_preview || '{ "info": "No input_payload attached" }' }}</pre>
      </div>

      <!-- Output Payload Box -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
          <span>OUTPUT / RESULT</span>
          <span>{{ props.event.output_byte_length.toLocaleString() }} bytes</span>
        </div>
        <pre
          class="max-h-32 overflow-y-auto rounded-md bg-[#020617] border border-[#334155] p-2.5 font-mono text-[11px] text-[#4ADE80] whitespace-pre-wrap break-all leading-relaxed"
        >{{ props.event.output_preview || '{ "info": "Pending or no output_payload" }' }}</pre>
      </div>
    </template>
  </div>
</template>
