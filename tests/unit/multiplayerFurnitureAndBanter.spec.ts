import { describe, it, expect } from 'vitest';
import {
  ALL_OFFICE_BANTER_SCRIPTS,
  DESK_IDLE_ACTIVITIES,
  LOL_DUO_INVITE_SCRIPTS,
  pickDeskIdleActivity,
  pickGroupBanterScript,
} from '@/data/officeBanterScripts';
import { FURNITURE_CATALOG, type OfficeBlueprint } from '@/types/blueprint';
import { GridPathfinder } from '@/engine/GridPathfinder';
import { AgentEntity } from '@/engine/AgentEntity';
import { decorateBlueprintWithRichFurniture } from '@/services/compiler/deterministicLayoutEngine';

function createSampleOfficeBlueprint(): OfficeBlueprint {
  return {
    meta: {
      project_name: 'Co-op Leisure & Desk Return Office',
      grid_cols: 24,
      grid_rows: 16,
      tile_size: 32,
    },
    zones: [
      { id: 'z_work', name: 'Work', type: 'WORK', rect: [1, 1, 10, 14] },
      { id: 'z_idle', name: 'Pantry', type: 'IDLE', rect: [12, 1, 11, 14] },
    ],
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
      {
        id: 'ps5_1',
        type: 'PS5_PES_STATION',
        x: 15,
        y: 4,
        footprint: [2, 1],
        interaction_point: [15, 5],
        facing: 'UP',
      },
      {
        id: 'pool_1',
        type: 'POOL_TABLE',
        x: 15,
        y: 8,
        footprint: [2, 1],
        interaction_point: [15, 9],
        facing: 'UP',
      },
      {
        id: 'eco_1',
        type: 'ECO_BIOME_DOME',
        x: 18,
        y: 3,
        footprint: [4, 3],
        interaction_point: [19, 6],
        facing: 'UP',
      },
      {
        id: 'koi_1',
        type: 'KOI_POND',
        x: 18,
        y: 9,
        footprint: [3, 2],
        interaction_point: [19, 11],
        facing: 'UP',
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
}

describe('PS5_PES_STATION & Co-op Multi-Player Furniture Slots', () => {
  it('registers PS5_PES_STATION in catalog and places it during rich layout decoration', () => {
    const entry = FURNITURE_CATALOG.find((f) => f.type === 'PS5_PES_STATION');
    expect(entry).toBeDefined();
    expect(entry?.footprint).toEqual([2, 1]);

    const bareBp = createSampleOfficeBlueprint();
    bareBp.furniture = bareBp.furniture.filter((f) => f.type === 'DESK_PC');
    const decorated = decorateBlueprintWithRichFurniture(bareBp, 35);
    expect(decorated.furniture.some((f) => f.type === 'PS5_PES_STATION')).toBe(true);
  });

  it('assigns 2-3 distinct non-overlapping perimeter slots around large social furniture', () => {
    const bp = createSampleOfficeBlueprint();
    const pf = new GridPathfinder(bp);

    for (const furnId of ['ps5_1', 'pool_1', 'eco_1', 'koi_1']) {
      const furn = bp.furniture.find((f) => f.id === furnId)!;
      const slot1 = pf.reserveFurnitureSlotForAgent('agent_1', furn);
      const slot2 = pf.reserveFurnitureSlotForAgent('agent_2', furn);
      const slot3 = pf.reserveFurnitureSlotForAgent('agent_3', furn);
      const slot4 = pf.reserveFurnitureSlotForAgent('agent_4', furn);

      expect(slot1).not.toBeNull();
      expect(slot2).not.toBeNull();
      expect(slot3).not.toBeNull();
      expect(slot4).toBeNull(); // Capped at 3 players

      const coords = new Set([
        `${slot1!.x},${slot1!.y}`,
        `${slot2!.x},${slot2!.y}`,
        `${slot3!.x},${slot3!.y}`,
      ]);
      expect(coords.size).toBe(3);
      expect(pf.getAgentsAtFurnitureCount(furnId)).toBe(3);

      pf.releaseIdleReservation('agent_1');
      pf.releaseIdleReservation('agent_2');
      pf.releaseIdleReservation('agent_3');
      expect(pf.getAgentsAtFurnitureCount(furnId)).toBe(0);
    }
  });
});

describe('Office Banter Scripts (~100+ scenarios & cute desk hobbies)', () => {
  it('contains >= 100 unique contextual banter scripts across all 4 categories', () => {
    expect(ALL_OFFICE_BANTER_SCRIPTS.length).toBeGreaterThanOrEqual(100);
    const ids = new Set(ALL_OFFICE_BANTER_SCRIPTS.map((s) => s.id));
    expect(ids.size).toBe(ALL_OFFICE_BANTER_SCRIPTS.length);

    const categories = new Set(ALL_OFFICE_BANTER_SCRIPTS.map((s) => s.category));
    expect(categories.has('SPORTS_PES')).toBe(true);
    expect(categories.has('NATURE_PHILOSOPHY')).toBe(true);
    expect(categories.has('FOOD_PANTRY')).toBe(true);
    expect(categories.has('CHITCHAT_LOL')).toBe(true);

    // Every script turn stays crisp (<= 46 chars) to prevent bubble truncation
    for (const s of ALL_OFFICE_BANTER_SCRIPTS) {
      expect(s.turns.length).toBeGreaterThanOrEqual(2);
      for (const t of s.turns) {
        expect(t.text.length).toBeLessThanOrEqual(46);
      }
    }
  });

  it('provides LoL duo invites and cute at-desk idle hobbies (LoL, sing, yawn)', () => {
    expect(LOL_DUO_INVITE_SCRIPTS.length).toBeGreaterThanOrEqual(4);
    const icons = new Set(DESK_IDLE_ACTIVITIES.map((a) => a.icon));
    expect(icons.has('lol_game')).toBe(true);
    expect(icons.has('music_sing')).toBe(true);
    expect(icons.has('sleepy_yawn')).toBe(true);
    expect(pickDeskIdleActivity('lol_game').icon).toBe('lol_game');
    expect(pickDeskIdleActivity('music_sing').icon).toBe('music_sing');
    expect(pickDeskIdleActivity('sleepy_yawn').icon).toBe('sleepy_yawn');
  });

  it('selects furniture-appropriate banter categories cleanly', () => {
    expect(pickGroupBanterScript('PS5_PES_STATION', 3).category).toBe('SPORTS_PES');
    expect(pickGroupBanterScript('KOI_POND', 3).category).toBe('NATURE_PHILOSOPHY');
    expect(pickGroupBanterScript('RAMEN_NOODLE_BAR', 3).category).toBe('FOOD_PANTRY');
  });
});

describe('AgentEntity Autonomous Return-to-Desk Lifecycle', () => {
  it('leaves social furniture after bounded play duration and walks back to DESK_PC', async () => {
    const bp = createSampleOfficeBlueprint();
    const pf = new GridPathfinder(bp);
    const desk = bp.furniture.find((f) => f.id === 'desk_1')!;
    const ps5 = bp.furniture.find((f) => f.id === 'ps5_1')!;

    let releasedAgentId: string | null = null;
    const agent = new AgentEntity(
      bp.agents[0],
      desk.interaction_point[0],
      desk.interaction_point[1],
      desk.facing,
      {
        onCoarseStateChange: () => {},
        onRequestPath: (sx, sy, ex, ey) => pf.findPath(sx, sy, ex, ey),
        onRequestIdleSpot: (agentId) => pf.reserveIdleDestination(agentId, bp),
        onReleaseIdleSpot: (agentId) => {
          releasedAgentId = agentId;
          pf.releaseIdleReservation(agentId);
        },
        onLaunchHandoffPacket: () => {},
        getAgentDesk: () => desk,
      },
    );

    const slot = pf.reserveFurnitureSlotForAgent('agent_1', ps5)!;
    expect(slot).not.toBeNull();

    // Send agent to PS5 with short 1500ms play window
    const movePromise = agent.goToSocialFurnitureSlot(slot, '🎮 Đá PES!', '#22c55e', 1500);
    // Let EasyStar async promise resolve and walk agent just until arrival at PS5
    await new Promise((r) => setTimeout(r, 20));
    for (let i = 0; i < 60 && agent.fsmState === 'MOVING'; i++) {
      agent.tick(100);
    }
    await movePromise;

    expect(agent.fsmState).toBe('IDLE');
    expect(agent.idleSubState).toBe('AT_FURNITURE');
    expect(agent.activeIdleFurnitureId).toBe('ps5_1');

    // Expire play timer -> triggers returnToDeskFromIdle(), releases reservation & returns to DESK_PC
    agent.tick(1600);
    await new Promise((r) => setTimeout(r, 20));
    expect(releasedAgentId).toBe('agent_1');
    expect(pf.getAgentsAtFurnitureCount('ps5_1')).toBe(0);
    expect(agent.fsmState).toBe('MOVING');

    for (let i = 0; i < 60 && agent.fsmState === 'MOVING'; i++) {
      agent.tick(100);
    }
    expect(agent.fsmState).toBe('IDLE');
    expect(agent.idleSubState).toBe('AT_DESK');
    expect(agent.gridX).toBe(desk.interaction_point[0]);
    expect(agent.gridY).toBe(desk.interaction_point[1]);

    // Real Crew task immediately exits idle substate
    agent.enqueueEvent({
      event_id: 'ev_1',
      timestamp: Date.now(),
      event_type: 'AGENT_START',
      agent_id: 'agent_1',
      metadata: { status_text: 'Làm task mới!' },
    });
    expect(agent.idleSubState).toBe('NONE');
  });
});
