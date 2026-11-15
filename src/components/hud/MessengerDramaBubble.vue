<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  ChevronDown,
  MessageCircle,
  Trash2,
  X,
  ArrowDown,
} from 'lucide-vue-next';
import {
  useOfficeChatStore,
  type OfficeChatCategory,
  type OfficeChatMessage,
} from '@/stores/useOfficeChatStore';
import { useUiStore } from '@/stores/useUiStore';

const officeChatStore = useOfficeChatStore();
const uiStore = useUiStore();

const feedRef = ref<HTMLDivElement | null>(null);
const isPinnedToBottom = ref<boolean>(true);
const hasNewWhileScrolledUp = ref<boolean>(false);

const filterTabs: Array<{
  key: 'ALL' | OfficeChatCategory;
  label: string;
}> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAMA', label: '🎭 Drama' },
  { key: 'DIRECTOR', label: '👑 Sếp' },
  { key: 'WORK', label: '⚙️ Việc' },
];

const latestMsg = computed(() => officeChatStore.latestMessage);

const latestShortName = computed(() => {
  if (!latestMsg.value) return '';
  return shortenName(latestMsg.value.speakerName);
});

const latestInitials = computed(() => {
  if (!latestMsg.value) return '💬';
  if (latestMsg.value.speakerId === 'director') return '👑';
  return getInitials(latestMsg.value.speakerName);
});

function shortenName(name: string): string {
  return name.split(/\s*[—–([|]\s*/)[0].trim();
}

function getInitials(name: string): string {
  const clean = shortenName(name).replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!clean) return 'AI';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function iconEmoji(icon?: OfficeChatMessage['icon']): string {
  switch (icon) {
    case 'lol_game':
      return '🎮';
    case 'ps5_pes':
      return '⚽';
    case 'music_sing':
      return '🎵';
    case 'sleepy_yawn':
      return '🥱';
    case 'search':
      return '🔍';
    case 'code':
      return '💻';
    case 'db':
      return '🗄️';
    case 'check':
      return '✅';
    case 'error':
      return '❌';
    case 'handoff':
      return '📨';
    case 'return':
      return '💼';
    case 'director':
      return '👑';
    default:
      return '';
  }
}

function displayIconEmoji(msg: OfficeChatMessage): string {
  const emoji = iconEmoji(msg.icon);
  if (!emoji) return '';
  // Skip prefixing if message text already starts with an emoji/pictograph
  if (/^\p{Extended_Pictographic}/u.test(msg.text.trimStart())) {
    return '';
  }
  return emoji;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function isGroupedWithPrevious(idx: number): boolean {
  if (idx <= 0) return false;
  const curr = officeChatStore.filteredMessages[idx];
  const prev = officeChatStore.filteredMessages[idx - 1];
  return (
    prev.speakerId === curr.speakerId &&
    curr.timestamp - prev.timestamp < 18_000 &&
    prev.spotLabel === curr.spotLabel
  );
}

function handleScroll(): void {
  const el = feedRef.value;
  if (!el) return;
  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isPinnedToBottom.value = distFromBottom < 36;
  if (isPinnedToBottom.value) {
    hasNewWhileScrolledUp.value = false;
  }
}

function scrollToBottom(smooth = true): void {
  const el = feedRef.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
  isPinnedToBottom.value = true;
  hasNewWhileScrolledUp.value = false;
}

watch(
  () => officeChatStore.filteredMessages.length,
  async () => {
    if (!officeChatStore.isOpen) return;
    await nextTick();
    if (isPinnedToBottom.value) {
      scrollToBottom(false);
    } else {
      hasNewWhileScrolledUp.value = true;
    }
  },
);

watch(
  () => officeChatStore.isOpen,
  async (opened) => {
    if (opened) {
      await nextTick();
      scrollToBottom(false);
    }
  },
);

function inspectSpeaker(speakerId: string): void {
  if (speakerId === 'director') return;
  uiStore.selectAgent(speakerId);
}
</script>

<template>
  <div
    class="fixed bottom-3.5 z-30 flex flex-col items-end gap-2.5 pointer-events-none transition-[right] duration-200"
    :class="uiStore.selectedAgentId ? 'right-3.5 sm:right-[406px]' : 'right-3.5'"
    data-testid="messenger-drama-dock"
  >
    <!-- Expanded Retro Messenger Popup Feed (Separated Cleanly From Office Canvas) -->
    <transition name="messenger-pop">
      <section
        v-if="officeChatStore.isOpen"
        class="pointer-events-auto w-[min(372px,calc(100vw-24px))] h-[min(450px,calc(100vh-140px))] rounded-2xl bg-[#0b1120]/95 backdrop-blur-xl border border-[#334155] shadow-[0_20px_50px_rgba(0,0,0,0.72)] flex flex-col overflow-hidden"
        data-testid="messenger-drama-window"
      >
        <!-- Header -->
        <header
          class="px-3.5 py-2.5 bg-gradient-to-r from-[#0f172a] via-[#131f38] to-[#0f172a] border-b border-[#1e293b] flex items-center justify-between gap-2 shrink-0"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b2ff] via-[#006aff] to-[#6366f1] flex items-center justify-center shadow-md shrink-0 ring-2 ring-[#38bdf8]/30"
            >
              <MessageCircle class="w-4 h-4 text-white fill-white/20" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-xs font-bold text-[#F8FAFC] truncate">
                  Đài Hóng Drama Văn Phòng
                </h3>
                <span class="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
              </div>
              <p class="text-[10px] text-[#94A3B8] font-mono">
                {{ officeChatStore.messages.length }} tin nhắn • Đầy đủ không cắt chữ
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F87171] hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Xóa toàn bộ lịch sử chat"
              @click="officeChatStore.clearMessages()"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Thu gọn thành bong bóng Messenger"
              data-testid="messenger-minimize-btn"
              @click="officeChatStore.setOpen(false)"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </header>

        <!-- Category Filter Bar -->
        <div
          class="px-3 py-1.5 bg-[#090f1d] border-b border-[#1e293b] flex items-center gap-1.5 overflow-x-auto shrink-0"
        >
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            type="button"
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors whitespace-nowrap cursor-pointer border"
            :class="
              officeChatStore.activeFilter === tab.key
                ? 'bg-[#0084ff]/25 text-[#38bdf8] border-[#0084ff]/60'
                : 'bg-[#11192c] text-[#94A3B8] border-[#1e293b] hover:text-[#E2E8F0]'
            "
            @click="officeChatStore.setFilter(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Scrollable Messenger Feed -->
        <div
          ref="feedRef"
          class="relative flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-1.5 bg-[#060a14]/70"
          @scroll="handleScroll"
        >
          <div
            v-if="officeChatStore.filteredMessages.length === 0"
            class="my-auto text-center px-4 py-8 text-[#64748B] text-xs leading-relaxed"
          >
            <p class="text-lg mb-1.5">💬</p>
            <p class="font-semibold text-[#94A3B8]">
              Chưa có hội thoại nào trong mục này
            </p>
            <p class="text-[11px] mt-1">
              Mọi câu gáy bẩn PS5, triết lý hồ Koi, khen chê pantry, rủ chơi LoL và báo cáo việc sẽ hiện nguyên văn tại đây!
            </p>
          </div>

          <template
            v-for="(msg, idx) in officeChatStore.filteredMessages"
            :key="msg.id"
          >
            <!-- Director Message (Right-aligned Messenger Blue) -->
            <div
              v-if="msg.speakerId === 'director'"
              class="flex flex-col items-end"
              :class="isGroupedWithPrevious(idx) ? 'mt-0.5' : 'mt-2'"
            >
              <div
                v-if="!isGroupedWithPrevious(idx)"
                class="flex items-center gap-1.5 mb-0.5 pr-1 text-[10px]"
              >
                <span
                  v-if="msg.spotLabel"
                  class="text-[#94A3B8] font-mono text-[9px]"
                >
                  {{ msg.spotLabel }}
                </span>
                <span class="font-bold text-[#FBBF24]">
                  {{ msg.speakerName }}
                </span>
                <span class="text-[#475569] font-mono text-[9px]">
                  {{ formatTime(msg.timestamp) }}
                </span>
              </div>
              <div
                class="max-w-[85%] px-3 py-1.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-[#0084ff] to-[#0062d1] text-white text-xs leading-relaxed shadow-md select-text whitespace-pre-wrap break-words"
              >
                {{ msg.text }}
              </div>
            </div>

            <!-- Employee Message (Left-aligned Avatar + Messenger Bubble) -->
            <div
              v-else
              class="flex items-end gap-2"
              :class="isGroupedWithPrevious(idx) ? 'mt-0.5' : 'mt-2'"
            >
              <!-- Circular Avatar Swatch -->
              <button
                v-if="!isGroupedWithPrevious(idx)"
                type="button"
                class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-[#F8FAFC] bg-[#0F172A] border-2 shadow cursor-pointer hover:scale-105 transition-transform"
                :style="{ borderColor: msg.speakerColor }"
                :title="`Xem chi tiết ${msg.speakerName}`"
                @click="inspectSpeaker(msg.speakerId)"
              >
                {{ getInitials(msg.speakerName) }}
              </button>
              <div v-else class="w-7 shrink-0" />

              <div class="flex flex-col items-start min-w-0 flex-1">
                <div
                  v-if="!isGroupedWithPrevious(idx)"
                  class="flex flex-wrap items-center gap-1.5 mb-0.5 pl-1 text-[10px]"
                >
                  <button
                    type="button"
                    class="font-bold hover:underline cursor-pointer truncate max-w-[140px]"
                    :style="{ color: msg.speakerColor }"
                    @click="inspectSpeaker(msg.speakerId)"
                  >
                    {{ shortenName(msg.speakerName) }}
                  </button>
                  <span
                    v-if="msg.spotLabel"
                    class="px-1.5 py-[1px] rounded bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] text-[9px] truncate max-w-[130px]"
                  >
                    {{ msg.spotLabel }}
                  </span>
                  <span class="text-[#475569] font-mono text-[9px]">
                    {{ formatTime(msg.timestamp) }}
                  </span>
                </div>

                <div
                  class="max-w-[92%] px-3 py-1.5 rounded-2xl rounded-bl-sm text-xs leading-relaxed shadow-sm select-text whitespace-pre-wrap break-words border"
                  :class="
                    msg.category === 'WORK'
                      ? 'bg-[#101c2e] border-[#1d4ed8]/40 text-[#E2E8F0]'
                      : msg.category === 'DIRECTOR'
                        ? 'bg-[#1c1917] border-[#f59e0b]/45 text-[#FEF3C7]'
                        : 'bg-[#1E293B] border-[#334155]/90 text-[#F8FAFC]'
                  "
                >
                  <span v-if="displayIconEmoji(msg)" class="mr-1">{{
                    displayIconEmoji(msg)
                  }}</span>
                  <span>{{ msg.text }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Scroll to newest button if user scrolled up -->
        <div
          v-if="hasNewWhileScrolledUp"
          class="px-3 py-1 bg-[#090f1d] border-t border-[#1e293b] flex justify-center shrink-0"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0084ff] text-white text-[10px] font-semibold shadow cursor-pointer hover:bg-[#0073e6]"
            @click="scrollToBottom(true)"
          >
            <ArrowDown class="w-3 h-3" />
            <span>Có tin nhắn mới</span>
          </button>
        </div>
      </section>
    </transition>

    <!-- Live Peek Pill Stacked Above Collapsed Circular Chat-Head (Zero ControlBar Overlap) -->
    <transition name="peek-fade">
      <div
        v-if="!officeChatStore.isOpen && latestMsg && !officeChatStore.isPeekDismissed"
        class="pointer-events-auto relative max-w-[245px] sm:max-w-[270px] px-3 py-1.5 pr-6 rounded-2xl rounded-br-sm bg-[#0f172a]/95 backdrop-blur-md border border-[#38bdf8]/45 shadow-xl cursor-pointer hover:border-[#38bdf8] transition-colors"
        data-testid="messenger-peek-pill"
        @click="officeChatStore.setOpen(true)"
      >
        <div class="flex items-center gap-1.5 text-[10px] font-bold">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ backgroundColor: latestMsg.speakerColor }"
          />
          <span
            class="truncate"
            :style="{ color: latestMsg.speakerColor }"
          >
            {{ latestShortName }}
          </span>
          <span
            v-if="latestMsg.spotLabel"
            class="text-[9px] text-[#64748B] truncate font-normal"
          >
            • {{ latestMsg.spotLabel }}
          </span>
        </div>
        <p class="text-[11px] text-[#F8FAFC] line-clamp-2 leading-snug mt-0.5">
          <span v-if="displayIconEmoji(latestMsg)" class="mr-1">{{
            displayIconEmoji(latestMsg)
          }}</span>
          {{ latestMsg.text }}
        </p>
        <button
          type="button"
          class="absolute top-1.5 right-1.5 p-0.5 rounded-full text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1E293B] cursor-pointer"
          title="Ẩn xem trước"
          @click.stop="officeChatStore.dismissPeek()"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </transition>

    <!-- Bottom Circular Messenger Chat-Head Bubble -->
    <div class="flex items-center justify-end pointer-events-none">
      <button
        type="button"
        class="pointer-events-auto relative w-14 h-14 rounded-full bg-gradient-to-br from-[#00b2ff] via-[#006aff] to-[#6366f1] p-[2.5px] shadow-[0_10px_28px_rgba(0,132,255,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
        :title="
          officeChatStore.isOpen
            ? 'Thu gọn Đài Hóng Drama Văn Phòng'
            : 'Mở bong bóng chat Drama Văn Phòng (Kiểu Messenger)'
        "
        data-testid="messenger-chat-head"
        @click="officeChatStore.toggleOpen()"
      >
        <div
          class="w-full h-full rounded-full bg-[#0b1120] flex flex-col items-center justify-center relative overflow-hidden"
        >
          <span
            v-if="latestMsg"
            class="text-xs font-extrabold tracking-tight"
            :style="{ color: latestMsg.speakerColor }"
          >
            {{ latestInitials }}
          </span>
          <MessageCircle
            v-else
            class="w-6 h-6 text-[#38bdf8] group-hover:scale-110 transition-transform"
          />
          <span
            v-if="latestMsg"
            class="text-[8px] font-mono text-[#94A3B8] leading-none mt-0.5"
          >
            CHAT
          </span>
        </div>

        <!-- Tiny Messenger Mini-Badge at bottom-left -->
        <span
          class="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#00b2ff] to-[#006aff] border-2 border-[#020617] flex items-center justify-center shadow"
        >
          <MessageCircle class="w-2.5 h-2.5 text-white fill-white" />
        </span>

        <!-- Green Online Indicator -->
        <span
          class="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-[#020617]"
        />

        <!-- Unread Notification Counter -->
        <span
          v-if="!officeChatStore.isOpen && officeChatStore.unreadCount > 0"
          class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold flex items-center justify-center shadow-md border-2 border-[#020617]"
          data-testid="messenger-unread-badge"
        >
          {{ officeChatStore.unreadCount > 99 ? '99+' : officeChatStore.unreadCount }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.messenger-pop-enter-active,
.messenger-pop-leave-active {
  transition: all 180ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: bottom right;
}
.messenger-pop-enter-from,
.messenger-pop-leave-to {
  opacity: 0;
  transform: scale(0.88) translateY(10px);
}

.peek-fade-enter-active,
.peek-fade-leave-active {
  transition: all 180ms ease;
}
.peek-fade-enter-from,
.peek-fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
