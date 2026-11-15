import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  COMPACT_5_AGENT_MARKDOWN,
  GAME_FACTORY_WORKFLOW_MARKDOWN,
  parseMarkdownDeterministically,
} from '@/services/compiler/llmTopologyExtractor';
import { generateDeterministicBlueprint } from '@/services/compiler/deterministicLayoutEngine';
import { useBlueprintStore, validateBlueprint } from '@/stores/useBlueprintStore';
import { GridPathfinder } from '@/engine/GridPathfinder';

describe('Stage 1 & Stage 2 Deterministic Auto-Layout Engine (Constitution Principle IV)', () => {
  it('compiles 5-agent Markdown into a valid OfficeBlueprint with zero overlapping footprints and 100% A* reachability', async () => {
    const topology = parseMarkdownDeterministically(COMPACT_5_AGENT_MARKDOWN);
    expect(topology.agents.length).toBe(5);
    expect(topology.edges.length).toBe(5);

    const blueprint = generateDeterministicBlueprint(topology);
    const validation = validateBlueprint(blueprint);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(blueprint.furniture.length).toBeGreaterThanOrEqual(40);

    const types = new Set(blueprint.furniture.map((f) => f.type));
    expect(types.has('POOL_TABLE')).toBe(true);
    expect(types.has('PING_PONG_TABLE')).toBe(true);
    expect(types.has('MINI_BAR_COUNTER')).toBe(true);
    expect(types.has('MICROWAVE_STAND')).toBe(true);
    expect(types.has('ECO_BIOME_DOME')).toBe(true);
    expect(types.has('OFFICE_CAT')).toBe(true);
    expect(types.has('ROBOT_VACUUM')).toBe(true);

    const ecoDome = blueprint.furniture.find((f) => f.type === 'ECO_BIOME_DOME')!;
    expect(ecoDome.footprint).toEqual([4, 3]);
    const koiPond = blueprint.furniture.find((f) => f.type === 'KOI_POND')!;
    expect(koiPond.footprint).toEqual([3, 2]);
    const zenGarden = blueprint.furniture.find((f) => f.type === 'ZEN_ROCK_GARDEN')!;
    expect(zenGarden.footprint).toEqual([3, 2]);
    const sakura = blueprint.furniture.find((f) => f.type === 'CHERRY_BLOSSOM_TREE')!;
    expect(sakura.footprint).toEqual([2, 2]);
    const fountain = blueprint.furniture.find((f) => f.type === 'INDOOR_FOUNTAIN')!;
    expect(fountain.footprint).toEqual([2, 2]);

    const pathfinder = new GridPathfinder(blueprint);
    const coffee = blueprint.furniture.find((f) => f.type === 'COFFEE_MACHINE')!;
    expect(coffee).toBeDefined();

    for (const agent of blueprint.agents) {
      const desk = blueprint.furniture.find((f) => f.id === agent.desk_id)!;
      expect(desk).toBeDefined();

      const path = await pathfinder.findPath(
        desk.interaction_point[0],
        desk.interaction_point[1],
        coffee.interaction_point[0],
        coffee.interaction_point[1],
      );
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(2);
    }
  });

  it('compiles MULTI-AGENT GAME FACTORY (CrewAI Flows) ASCII diagram into an 11-agent, 13-edge OfficeBlueprint with valid A* paths', async () => {
    const topology = parseMarkdownDeterministically(GAME_FACTORY_WORKFLOW_MARKDOWN);
    expect(topology.agents.length).toBe(11);
    expect(topology.edges.length).toBe(13);

    const blueprint = generateDeterministicBlueprint(topology);
    const validation = validateBlueprint(blueprint);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(blueprint.furniture.length).toBeGreaterThanOrEqual(40);

    const types = new Set(blueprint.furniture.map((f) => f.type));
    expect(types.has('POOL_TABLE')).toBe(true);
    expect(types.has('PING_PONG_TABLE')).toBe(true);
    expect(types.has('MINI_BAR_COUNTER')).toBe(true);
    expect(types.has('MICROWAVE_STAND')).toBe(true);
    expect(types.has('ECO_BIOME_DOME')).toBe(true);
    expect(types.has('OFFICE_CAT')).toBe(true);
    expect(types.has('ROBOT_VACUUM')).toBe(true);

    const ecoDome = blueprint.furniture.find((f) => f.type === 'ECO_BIOME_DOME')!;
    expect(ecoDome.footprint).toEqual([4, 3]);
    const koiPond = blueprint.furniture.find((f) => f.type === 'KOI_POND')!;
    expect(koiPond.footprint).toEqual([3, 2]);
    const zenGarden = blueprint.furniture.find((f) => f.type === 'ZEN_ROCK_GARDEN')!;
    expect(zenGarden.footprint).toEqual([3, 2]);
    const sakura = blueprint.furniture.find((f) => f.type === 'CHERRY_BLOSSOM_TREE')!;
    expect(sakura.footprint).toEqual([2, 2]);
    const fountain = blueprint.furniture.find((f) => f.type === 'INDOOR_FOUNTAIN')!;
    expect(fountain.footprint).toEqual([2, 2]);

    const pathfinder = new GridPathfinder(blueprint);
    const coffee = blueprint.furniture.find((f) => f.type === 'COFFEE_MACHINE')!;
    expect(coffee).toBeDefined();

    for (const agent of blueprint.agents) {
      const desk = blueprint.furniture.find((f) => f.id === agent.desk_id)!;
      expect(desk).toBeDefined();

      const path = await pathfinder.findPath(
        desk.interaction_point[0],
        desk.interaction_point[1],
        coffee.interaction_point[0],
        coffee.interaction_point[1],
      );
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(2);
    }
  });

  it('rotates furniture 90 degrees (UP -> RIGHT -> DOWN -> LEFT), swapping footprint [w, h] <-> [h, w] and keeping interaction_point valid', () => {
    setActivePinia(createPinia());
    const store = useBlueprintStore();

    const desk = store.blueprint.furniture.find((f) => f.id === 'furn_desk_1')!;
    expect(desk.facing).toBe('UP');
    expect(desk.footprint).toEqual([2, 1]);

    // 1. Rotate UP -> RIGHT (90° vertical: [1, 2])
    expect(store.rotateFurnitureFacing('furn_desk_1')).toBe(true);
    const afterRight = store.blueprint.furniture.find((f) => f.id === 'furn_desk_1')!;
    expect(afterRight.facing).toBe('RIGHT');
    expect(afterRight.footprint).toEqual([1, 2]);
    expect(validateBlueprint(store.blueprint).valid).toBe(true);

    // 2. Rotate RIGHT -> DOWN (180° horizontal: [2, 1])
    expect(store.rotateFurnitureFacing('furn_desk_1')).toBe(true);
    const afterDown = store.blueprint.furniture.find((f) => f.id === 'furn_desk_1')!;
    expect(afterDown.facing).toBe('DOWN');
    expect(afterDown.footprint).toEqual([2, 1]);
    expect(validateBlueprint(store.blueprint).valid).toBe(true);

    // 3. Rotate DOWN -> LEFT (270° vertical: [1, 2])
    expect(store.rotateFurnitureFacing('furn_desk_1')).toBe(true);
    const afterLeft = store.blueprint.furniture.find((f) => f.id === 'furn_desk_1')!;
    expect(afterLeft.facing).toBe('LEFT');
    expect(afterLeft.footprint).toEqual([1, 2]);
    expect(validateBlueprint(store.blueprint).valid).toBe(true);
  });
});
