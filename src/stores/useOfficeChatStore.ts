import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IdleHobbyIconType, ToolIconType } from '@/types/events';

export type OfficeChatCategory = 'DRAMA' | 'DIRECTOR' | 'WORK';

export interface OfficeChatMessage {
  id: string;
  timestamp: number;
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  category: OfficeChatCategory;
  text: string;
  spotLabel?: string;
  icon?: IdleHobbyIconType | ToolIconType | 'director' | 'handoff' | 'return';
}

const MAX_CHAT_HISTORY = 200;

export const useOfficeChatStore = defineStore('officeChat', () => {
  const messages = ref<OfficeChatMessage[]>([]);
  const isOpen = ref<boolean>(false);
  const activeFilter = ref<'ALL' | OfficeChatCategory>('ALL');
  const unreadCount = ref<number>(0);
  const isPeekDismissed = ref<boolean>(false);

  let seq = 0;

  const filteredMessages = computed<OfficeChatMessage[]>(() => {
    if (activeFilter.value === 'ALL') return messages.value;
    return messages.value.filter((m) => m.category === activeFilter.value);
  });

  const latestMessage = computed<OfficeChatMessage | null>(() => {
    if (messages.value.length === 0) return null;
    return messages.value[messages.value.length - 1];
  });

  function pushMessage(
    payload: Omit<OfficeChatMessage, 'id' | 'timestamp'> & {
      timestamp?: number;
    },
  ): void {
    const cleanText = (payload.text || '').trim();
    if (!cleanText) return;

    const ts = payload.timestamp ?? Date.now();
    // Deduplicate identical consecutive speaker+text within 1200ms
    const recent = messages.value[messages.value.length - 1];
    if (
      recent &&
      recent.speakerId === payload.speakerId &&
      recent.text === cleanText &&
      ts - recent.timestamp < 1200
    ) {
      return;
    }

    seq += 1;
    const entry: OfficeChatMessage = {
      id: `chat_${ts}_${seq}`,
      timestamp: ts,
      speakerId: payload.speakerId,
      speakerName: payload.speakerName,
      speakerColor: payload.speakerColor,
      category: payload.category,
      text: cleanText,
      spotLabel: payload.spotLabel,
      icon: payload.icon,
    };

    const next = [...messages.value, entry];
    if (next.length > MAX_CHAT_HISTORY) {
      next.splice(0, next.length - MAX_CHAT_HISTORY);
    }
    messages.value = next;

    if (!isOpen.value) {
      unreadCount.value += 1;
      isPeekDismissed.value = false;
    }
  }

  function setOpen(open: boolean): void {
    isOpen.value = open;
    if (open) {
      unreadCount.value = 0;
    }
  }

  function toggleOpen(): void {
    setOpen(!isOpen.value);
  }

  function setFilter(filter: 'ALL' | OfficeChatCategory): void {
    activeFilter.value = filter;
  }

  function dismissPeek(): void {
    isPeekDismissed.value = true;
  }

  function clearMessages(): void {
    messages.value = [];
    unreadCount.value = 0;
  }

  return {
    messages,
    filteredMessages,
    latestMessage,
    isOpen,
    activeFilter,
    unreadCount,
    isPeekDismissed,
    pushMessage,
    setOpen,
    toggleOpen,
    setFilter,
    dismissPeek,
    clearMessages,
  };
});
