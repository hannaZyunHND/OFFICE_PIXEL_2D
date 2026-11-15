import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useOfficeChatStore } from '@/stores/useOfficeChatStore';
import { BubbleRenderer } from '@/engine/graphics/BubbleRenderer';
import { AgentEntity, type AgentSpeechEmitPayload } from '@/engine/AgentEntity';
import type { OfficeBlueprint } from '@/types/blueprint';
import { GridPathfinder } from '@/engine/GridPathfinder';

describe('Office Messenger Drama Chat Store & Long Bubble Fix', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stores full untruncated drama & work dialogues, tracks unread count, and caps buffer at 200', () => {
    const store = useOfficeChatStore();
    const longLine =
      'Đây là một câu thoại siêu dài từ agent mô tả chi tiết cả kết quả đá PES PS5 thắng 5-0 lẫn phân tích bug sản phẩm để không bao giờ bị cắt mất chữ!';

    store.pushMessage({
      speakerId: 'agent_1',
      speakerName: 'Alice (Coder)',
      speakerColor: '#38bdf8',
      category: 'DRAMA',
      text: longLine,
      spotLabel: '🎮 Máy PS5 & TV Đá PES',
      icon: 'ps5_pes',
    });

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].text).toBe(longLine);
    expect(store.unreadCount).toBe(1);

    // Deduplicates identical back-to-back speech within 1200ms
    store.pushMessage({
      speakerId: 'agent_1',
      speakerName: 'Alice (Coder)',
      speakerColor: '#38bdf8',
      category: 'DRAMA',
      text: longLine,
      spotLabel: '🎮 Máy PS5 & TV Đá PES',
      icon: 'ps5_pes',
    });
    expect(store.messages).toHaveLength(1);

    // Opening Messenger window resets unread badge to 0
    store.setOpen(true);
    expect(store.unreadCount).toBe(0);

    // Category filter works cleanly
    store.pushMessage({
      speakerId: 'director',
      speakerName: '👑 Giám Đốc (Tôi)',
      speakerColor: '#fbbf24',
      category: 'DIRECTOR',
      text: 'Đẩy nhanh tiến độ release hôm nay nhé!',
      icon: 'director',
    });
    store.setFilter('DIRECTOR');
    expect(store.filteredMessages).toHaveLength(1);
    expect(store.filteredMessages[0].speakerId).toBe('director');

    // Ring buffer bounds at 200 entries
    store.setFilter('ALL');
    for (let i = 0; i < 220; i++) {
      store.pushMessage({
        speakerId: `agent_${i % 3}`,
        speakerName: `Agent ${i % 3}`,
        speakerColor: '#22c55e',
        category: 'WORK',
        text: `Log dòng ${i}`,
      });
    }
    expect(store.messages).toHaveLength(200);
  });

  it('keeps on-canvas BubbleRenderer compact/wrapped while emitting complete text to Messenger log', () => {
    const bubble = new BubbleRenderer();
    const superLongPrompt =
      'Phân tích kiến trúc toàn bộ module microservices kết hợp viết kiểm thử tự động Playwright cho hệ thống tài chính';

    bubble.showStatusBubble(superLongPrompt, '#38bdf8');
    expect(bubble.container.visible).toBe(true);

    const emitted: AgentSpeechEmitPayload[] = [];
    const bp: OfficeBlueprint = {
      meta: { project_name: 'Test', grid_cols: 12, grid_rows: 10, tile_size: 32 },
      zones: [{ id: 'z1', name: 'Work', type: 'WORK', rect: [1, 1, 10, 8] }],
      furniture: [
        {
          id: 'desk_1',
          type: 'DESK_PC',
          x: 3,
          y: 3,
          footprint: [2, 1],
          interaction_point: [3, 4],
          facing: 'UP',
          agent_id: 'agent_1',
        },
      ],
      agents: [
        {
          id: 'agent_1',
          name: 'Alice',
          role: 'Engineer',
          color: '#38bdf8',
          avatar_sprite: 'default_coder',
          desk_id: 'desk_1',
        },
      ],
      edges: [],
    };
    const pf = new GridPathfinder(bp);
    const desk = bp.furniture[0];
    const agent = new AgentEntity(bp.agents[0], 3, 4, 'UP', {
      onCoarseStateChange: () => {},
      onRequestPath: (sx, sy, ex, ey) => pf.findPath(sx, sy, ex, ey),
      onRequestIdleSpot: (id) => pf.reserveIdleDestination(id, bp),
      onLaunchHandoffPacket: () => {},
      getAgentDesk: () => desk,
      onSpeechEmit: (payload) => emitted.push(payload),
    });

    agent.enqueueEvent({
      event_id: 'ev_long',
      timestamp: Date.now(),
      event_type: 'AGENT_START',
      agent_id: 'agent_1',
      metadata: { status_text: superLongPrompt },
    });
    agent.tick(20);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].text).toBe(superLongPrompt);
    expect(emitted[0].category).toBe('WORK');
  });
});
