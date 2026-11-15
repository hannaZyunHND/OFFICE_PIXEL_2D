import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  AGENT_AVATAR_CATALOG,
  getAgentAvatarPreset,
  pickRandomAgentAvatarId,
} from '@/data/agentAvatarCatalog';
import { paintProceduralAgent } from '@/engine/graphics/AgentSpritePainter';
import { parseMarkdownDeterministically } from '@/services/compiler/llmTopologyExtractor';
import { parseChatOrMarkdownRequirement } from '@/services/compiler/workflowGenerator';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import type { Direction } from '@/types/blueprint';

describe('50+ Agent Avatar Catalog, Random Assignment & Agent Profile Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('provides at least 50 unique pixel avatar presets spanning all 5 categories', () => {
    expect(AGENT_AVATAR_CATALOG.length).toBeGreaterThanOrEqual(50);

    const uniqueIds = new Set(AGENT_AVATAR_CATALOG.map((p) => p.id));
    expect(uniqueIds.size).toBe(AGENT_AVATAR_CATALOG.length);

    const categories = new Set(AGENT_AVATAR_CATALOG.map((p) => p.category));
    expect(categories.has('HUMAN')).toBe(true);
    expect(categories.has('ANIMAL')).toBe(true);
    expect(categories.has('ROBOT_CYBER')).toBe(true);
    expect(categories.has('ANIME_HERO')).toBe(true);
    expect(categories.has('FUNNY_OBJECT')).toBe(true);

    expect(getAgentAvatarPreset('animal_rooster').label).toContain('Gà Trống');
    expect(getAgentAvatarPreset('human_gym_bro').label).toContain('Thể Hình');
    expect(getAgentAvatarPreset('object_boba_tea').label).toContain('Trà Sữa');
    expect(getAgentAvatarPreset('robot_retro_crt').category).toBe('ROBOT_CYBER');
    expect(getAgentAvatarPreset('anime_super_saiyan').category).toBe('ANIME_HERO');
  });

  it('pickRandomAgentAvatarId never picks director_ceo and respects excludeIds', () => {
    const picked: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = pickRandomAgentAvatarId({ excludeIds: ['default_scientist'] });
      expect(id).not.toBe('director_ceo');
      expect(id).not.toBe('default_scientist');
      picked.push(id);
    }
    const distinct = new Set(picked);
    expect(distinct.size).toBeGreaterThan(5);
  });

  it('paintProceduralAgent draws pixel rects for all 50+ presets across all 4 directions without errors', () => {
    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    for (const preset of AGENT_AVATAR_CATALOG) {
      for (const dir of dirs) {
        let drawnRects = 0;
        paintProceduralAgent(
          {
            rect(_x, _y, w, h, color) {
              if (w > 0 && h > 0 && typeof color === 'number') {
                drawnRects++;
              }
            },
          },
          preset.suggestedHex,
          dir,
          dir === 'LEFT',
          dir === 'DOWN',
          1,
          preset.id,
        );
        expect(drawnRects).toBeGreaterThan(5);
      }
    }
  });

  it('assigns valid diverse avatars when parsing Markdown and generating workflows', () => {
    const validIds = new Set(AGENT_AVATAR_CATALOG.map((p) => p.id));
    const topology = parseMarkdownDeterministically(`
# Demo Squad
- **Alpha (Coder)** — Lập trình backend
- **Beta (Designer)** — Thiết kế UI
- **Gamma (Tester)** — Kiểm thử tự động
- **Delta (Reviewer)** — Duyệt sản phẩm
    `);

    expect(topology.agents.length).toBeGreaterThanOrEqual(4);
    for (const agent of topology.agents) {
      expect(validIds.has(agent.avatar_sprite)).toBe(true);
      expect(agent.avatar_sprite).not.toBe('director_ceo');
    }

    const generated = parseChatOrMarkdownRequirement(
      'Đội ngũ Content Video 6 Agents: Researcher, Scriptwriter, Editor, Animator, Sound Engineer, QA Reviewer',
    );
    expect(generated.agents.length).toBe(6);
    const chosenSprites = new Set(generated.agents.map((a) => a.avatar_sprite));
    expect(chosenSprites.size).toBeGreaterThanOrEqual(4);
  });

  it('updates agent name, avatar_sprite, and color in-place via useBlueprintStore.updateAgentProfile', () => {
    const store = useBlueprintStore();
    const targetAgent = store.blueprint.agents[0];
    expect(targetAgent).toBeDefined();

    const initialRev = store.revision;
    const initialPatchRev = store.agentPatchRevision;

    const updated = store.updateAgentProfile(targetAgent.id, {
      name: 'Gà Trống DevOps',
      avatar_sprite: 'animal_rooster',
      color: '#EF4444',
    });

    expect(updated).toBe(true);
    // Should NOT trigger full blueprint reload (which would reset office positions)
    expect(store.revision).toBe(initialRev);
    expect(store.agentPatchRevision).toBe(initialPatchRev + 1);

    const saved = store.agentsMap.get(targetAgent.id);
    expect(saved?.name).toBe('Gà Trống DevOps');
    expect(saved?.avatar_sprite).toBe('animal_rooster');
    expect(saved?.color).toBe('#EF4444');
    expect(store.lastAgentProfilePatches[0]?.agentId).toBe(targetAgent.id);
  });
});
