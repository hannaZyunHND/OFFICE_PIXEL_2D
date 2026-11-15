import { describe, it, expect } from 'vitest';
import { GridPathfinder } from '@/engine/GridPathfinder';
import defaultBlueprint from '@/data/defaultBlueprint.json';
import type { OfficeBlueprint } from '@/types/blueprint';

describe('GridPathfinder & EasyStar.js A* Collision Matrix', () => {
  const bp = defaultBlueprint as unknown as OfficeBlueprint;

  it('marks furniture footprints as blocked and interaction_points as walkable', () => {
    const pathfinder = new GridPathfinder(bp);

    // furn_desk_1 is at (3, 4) with footprint [2, 1] and interaction_point [3, 5]
    expect(pathfinder.isTileWalkable(3, 4)).toBe(false);
    expect(pathfinder.isTileWalkable(4, 4)).toBe(false);
    expect(pathfinder.isTileWalkable(3, 5)).toBe(true);
  });

  it('computes a valid 4-directional orthogonal A* path from desk to coffee machine', async () => {
    const pathfinder = new GridPathfinder(bp);
    // From Alice's desk interaction_point [3, 5] to Coffee Machine interaction_point [18, 10]
    const path = await pathfinder.findPath(3, 5, 18, 10);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(10);
    expect(path![0]).toEqual({ x: 3, y: 5 });
    expect(path![path!.length - 1]).toEqual({ x: 18, y: 10 });

    // Verify every step is strictly orthogonal (Manhattan distance == 1) and walkable
    for (let i = 1; i < path!.length; i++) {
      const prev = path![i - 1];
      const curr = path![i];
      const manhattan = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      expect(manhattan).toBe(1);
      expect(pathfinder.isTileWalkable(curr.x, curr.y)).toBe(true);
    }
  });
});
