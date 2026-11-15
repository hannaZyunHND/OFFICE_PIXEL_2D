import { describe, it, expect } from 'vitest';
import {
  generateDeterministicBlueprint,
  ensureDirectorRoomAndFurniture,
} from '@/services/compiler/deterministicLayoutEngine';
import {
  COMPACT_5_AGENT_MARKDOWN,
  parseMarkdownDeterministically,
} from '@/services/compiler/llmTopologyExtractor';
import { validateBlueprint } from '@/stores/useBlueprintStore';
import { GridPathfinder } from '@/engine/GridPathfinder';
import defaultBlueprint from '@/data/defaultBlueprint.json';
import type { OfficeBlueprint } from '@/types/blueprint';

describe('Director Office Room (Phòng Giám Đốc) & Briefing Pathing', () => {
  it('ensures generated blueprints include Phòng Giám Đốc (DIRECTOR zone), DIRECTOR_DESK, and walkable A* path from worker #1', async () => {
    const topology = parseMarkdownDeterministically(COMPACT_5_AGENT_MARKDOWN);
    const bp = generateDeterministicBlueprint(topology);

    const directorZone = bp.zones.find((z) => z.type === 'DIRECTOR');
    const directorDesk = bp.furniture.find((f) => f.type === 'DIRECTOR_DESK');
    expect(directorZone).toBeDefined();
    expect(directorZone!.name).toContain('Giám Đốc');
    expect(directorDesk).toBeDefined();

    const validation = validateBlueprint(bp);
    expect(validation.valid).toBe(true);

    // Ensure idempotency
    const secondPass = ensureDirectorRoomAndFurniture(bp);
    expect(secondPass.meta.grid_cols).toBe(bp.meta.grid_cols);
    expect(
      secondPass.furniture.filter((f) => f.type === 'DIRECTOR_DESK').length,
    ).toBe(1);

    // Ensure First Worker can A*-walk right up to a neighbor next to Director Desk
    const pf = new GridPathfinder(bp);
    const firstWorker = bp.agents[0];
    const firstDesk = bp.furniture.find((f) => f.id === firstWorker.desk_id)!;
    const neighbors = pf.getWalkableNeighbors(
      directorDesk!.interaction_point[0],
      directorDesk!.interaction_point[1],
    );
    expect(neighbors.length).toBeGreaterThan(0);

    const path = await pf.findPath(
      firstDesk.interaction_point[0],
      firstDesk.interaction_point[1],
      neighbors[0].x,
      neighbors[0].y,
    );
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(5);
  });

  it('includes valid DIRECTOR zone and reachable DIRECTOR_DESK in defaultBlueprint.json', async () => {
    const bp = defaultBlueprint as unknown as OfficeBlueprint;
    const validation = validateBlueprint(bp);
    expect(validation.valid).toBe(true);

    const directorZone = bp.zones.find((z) => z.type === 'DIRECTOR');
    const directorDesk = bp.furniture.find((f) => f.type === 'DIRECTOR_DESK');
    expect(directorZone).toBeDefined();
    expect(directorDesk).toBeDefined();

    const pf = new GridPathfinder(bp);
    const firstDesk = bp.furniture.find((f) => f.id === bp.agents[0].desk_id)!;
    const path = await pf.findPath(
      firstDesk.interaction_point[0],
      firstDesk.interaction_point[1],
      directorDesk!.interaction_point[0],
      directorDesk!.interaction_point[1],
    );
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(5);
  });
});
