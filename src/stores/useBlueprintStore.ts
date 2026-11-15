import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getCanonicalFootprint,
  type OfficeBlueprint,
  type BlueprintValidationResult,
  type FurnitureItem,
  type AgentBlueprint,
  type ZoneDefinition,
} from '@/types/blueprint';
import defaultBlueprintData from '@/data/defaultBlueprint.json';

export function validateBlueprint(bp: OfficeBlueprint): BlueprintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bp || !bp.meta) {
    return { valid: false, errors: ['Missing blueprint meta section.'], warnings };
  }

  const { grid_cols, grid_rows, tile_size } = bp.meta;
  if (tile_size !== 32) {
    errors.push(`Invalid tile_size ${tile_size}: canonical tile_size MUST be 32.`);
  }
  if (grid_cols < 12 || grid_cols > 64 || grid_rows < 10 || grid_rows > 64) {
    errors.push(`Grid dimensions ${grid_cols}x${grid_rows} out of bounds (12..64 x 10..64).`);
  }

  // Track occupied footprint tiles
  const occupied = new Map<string, string>();
  for (const furn of bp.furniture) {
    const [w, h] = furn.footprint;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const tx = furn.x + dx;
        const ty = furn.y + dy;
        if (tx < 1 || tx >= grid_cols - 1 || ty < 1 || ty >= grid_rows - 1) {
          errors.push(`Furniture "${furn.id}" at (${tx}, ${ty}) overlaps outer wall or is out of bounds.`);
        }
        const key = `${tx},${ty}`;
        if (occupied.has(key)) {
          errors.push(
            `Furniture "${furn.id}" overlaps with "${occupied.get(key)}" at tile (${tx}, ${ty}).`,
          );
        } else {
          occupied.set(key, furn.id);
        }
      }
    }
  }

  // Verify interaction_point is walkable
  for (const furn of bp.furniture) {
    const [ix, iy] = furn.interaction_point;
    if (ix < 1 || ix >= grid_cols - 1 || iy < 1 || iy >= grid_rows - 1) {
      errors.push(
        `Furniture "${furn.id}" interaction_point (${ix}, ${iy}) is outside walkable interior.`,
      );
    }
    const key = `${ix},${iy}`;
    if (occupied.has(key)) {
      errors.push(
        `Furniture "${furn.id}" interaction_point (${ix}, ${iy}) is blocked by "${occupied.get(key)}".`,
      );
    }
  }

  // Verify agent desk references
  const deskMap = new Map<string, FurnitureItem>();
  for (const furn of bp.furniture) {
    if (furn.type === 'DESK_PC') {
      deskMap.set(furn.id, furn);
    }
  }
  for (const agent of bp.agents) {
    if (!deskMap.has(agent.desk_id)) {
      warnings.push(
        `Agent "${agent.id}" references desk "${agent.desk_id}" which is not a DESK_PC item.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getCandidateInteractionPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  facing: FurnitureItem['facing'],
): [number, number][] {
  const topEdge: [number, number][] = [];
  const bottomEdge: [number, number][] = [];
  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (let ox = 0; ox < w; ox++) {
    bottomEdge.push([x + ox, y + h]);
    topEdge.push([x + ox, y - 1]);
  }
  for (let oy = 0; oy < h; oy++) {
    rightEdge.push([x + w, y + oy]);
    leftEdge.push([x - 1, y + oy]);
  }

  if (facing === 'UP') {
    return [...bottomEdge, ...rightEdge, ...leftEdge, ...topEdge];
  }
  if (facing === 'DOWN') {
    return [...topEdge, ...leftEdge, ...rightEdge, ...bottomEdge];
  }
  if (facing === 'LEFT') {
    return [...rightEdge, ...bottomEdge, ...topEdge, ...leftEdge];
  }
  return [...leftEdge, ...bottomEdge, ...topEdge, ...rightEdge];
}

function getOrientedFootprint(
  type: FurnitureItem['type'],
  facing: FurnitureItem['facing'],
  scale: number,
): [number, number] {
  const [canonW, canonH] = getCanonicalFootprint(type);
  const s = typeof scale === 'number' && scale > 0 ? scale : 1;
  const w = Math.max(1, Math.round(canonW * s));
  const h = Math.max(1, Math.round(canonH * s));
  const isQuarterTurn = facing === 'RIGHT' || facing === 'LEFT';
  return isQuarterTurn ? [h, w] : [w, h];
}

function cloneBlueprint(bp: OfficeBlueprint): OfficeBlueprint {
  return JSON.parse(JSON.stringify(bp)) as OfficeBlueprint;
}

export const useBlueprintStore = defineStore('blueprint', () => {
  const blueprint = ref<OfficeBlueprint>(
    cloneBlueprint(defaultBlueprintData as unknown as OfficeBlueprint),
  );
  const revision = ref<number>(1);
  const lastValidation = ref<BlueprintValidationResult>(
    validateBlueprint(blueprint.value),
  );

  const agentsMap = computed<Map<string, AgentBlueprint>>(() => {
    const map = new Map<string, AgentBlueprint>();
    for (const a of blueprint.value.agents) {
      map.set(a.id, a);
    }
    return map;
  });

  const furnitureMap = computed<Map<string, FurnitureItem>>(() => {
    const map = new Map<string, FurnitureItem>();
    for (const f of blueprint.value.furniture) {
      map.set(f.id, f);
    }
    return map;
  });

  const idleZones = computed<ZoneDefinition[]>(() =>
    blueprint.value.zones.filter((z) => z.type === 'IDLE'),
  );

  function setBlueprint(nextBp: OfficeBlueprint): BlueprintValidationResult {
    const validation = validateBlueprint(nextBp);
    lastValidation.value = validation;
    blueprint.value = cloneBlueprint(nextBp);
    revision.value++;
    return validation;
  }

  function resetToDefaultBlueprint(): void {
    setBlueprint(defaultBlueprintData as unknown as OfficeBlueprint);
  }

  function updateFurniturePosition(
    furnitureId: string,
    newX: number,
    newY: number,
  ): { success: boolean; error?: string } {
    const target = blueprint.value.furniture.find((f) => f.id === furnitureId);
    if (!target) {
      return { success: false, error: `Furniture "${furnitureId}" not found.` };
    }

    const dx = newX - target.x;
    const dy = newY - target.y;
    const [w, h] = target.footprint;
    const candidatePoints: [number, number][] = [
      [target.interaction_point[0] + dx, target.interaction_point[1] + dy],
      ...getCandidateInteractionPoints(newX, newY, w, h, target.facing),
    ];

    let lastError = 'Invalid furniture position.';
    for (const ip of candidatePoints) {
      const candidate = cloneBlueprint(blueprint.value);
      const candidateFurn = candidate.furniture.find((f) => f.id === furnitureId)!;
      candidateFurn.x = newX;
      candidateFurn.y = newY;
      candidateFurn.interaction_point = ip;

      const validation = validateBlueprint(candidate);
      if (validation.valid) {
        blueprint.value = candidate;
        lastValidation.value = validation;
        revision.value++;
        return { success: true };
      }
      lastError = validation.errors[0] || lastError;
    }

    return { success: false, error: lastError };
  }

  function rotateFurnitureFacing(furnitureId: string): boolean {
    const order: FurnitureItem['facing'][] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const target = blueprint.value.furniture.find((f) => f.id === furnitureId);
    if (!target) return false;

    const currentIndex = Math.max(0, order.indexOf(target.facing));
    const nextDir = order[(currentIndex + 1) % order.length];

    const [canonW, canonH] = getCanonicalFootprint(target.type);
    const currentQuarter = target.facing === 'RIGHT' || target.facing === 'LEFT';
    const baseW = currentQuarter ? canonH : canonW;
    const baseH = currentQuarter ? canonW : canonH;
    const currentScale =
      typeof target.scale === 'number' && target.scale > 0
        ? target.scale
        : Math.max(target.footprint[0] / baseW, target.footprint[1] / baseH, 0.5);

    const [rotW, rotH] = getOrientedFootprint(target.type, nextDir, currentScale);

    // Build nudge offsets ordered by Manhattan distance from current (x, y)
    const offsets: [number, number][] = [];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        offsets.push([dx, dy]);
      }
    }
    offsets.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - (Math.abs(b[0]) + Math.abs(b[1])));

    for (const [dx, dy] of offsets) {
      const candX = target.x + dx;
      const candY = target.y + dy;
      const candidateIps = getCandidateInteractionPoints(
        candX,
        candY,
        rotW,
        rotH,
        nextDir,
      );

      for (const ip of candidateIps) {
        const candidate = cloneBlueprint(blueprint.value);
        const furn = candidate.furniture.find((f) => f.id === furnitureId)!;
        furn.x = candX;
        furn.y = candY;
        furn.facing = nextDir;
        furn.footprint = [rotW, rotH];
        furn.interaction_point = ip;

        const validation = validateBlueprint(candidate);
        if (validation.valid) {
          blueprint.value = candidate;
          lastValidation.value = validation;
          revision.value++;
          return true;
        }
      }
    }

    return false;
  }

  function addFurnitureItem(item: FurnitureItem): { success: boolean; error?: string } {
    const candidate = cloneBlueprint(blueprint.value);
    candidate.furniture.push(item);
    const validation = validateBlueprint(candidate);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }
    blueprint.value = candidate;
    lastValidation.value = validation;
    revision.value++;
    return { success: true };
  }

  function removeFurnitureItem(furnitureId: string): { success: boolean; error?: string } {
    const furn = blueprint.value.furniture.find((f) => f.id === furnitureId);
    if (!furn) return { success: false, error: 'Item not found.' };
    if (furn.agent_id) {
      return {
        success: false,
        error: `Cannot delete desk assigned to agent "${furn.agent_id}".`,
      };
    }
    const candidate = cloneBlueprint(blueprint.value);
    candidate.furniture = candidate.furniture.filter((f) => f.id !== furnitureId);
    blueprint.value = candidate;
    lastValidation.value = validateBlueprint(candidate);
    revision.value++;
    return { success: true };
  }

  function scaleFurnitureItem(
    furnitureId: string,
    rawNextScale: number,
  ): {
    success: boolean;
    scale: number;
    footprint: [number, number];
    error?: string;
  } {
    const target = blueprint.value.furniture.find((f) => f.id === furnitureId);
    if (!target) {
      return {
        success: false,
        scale: 1,
        footprint: [1, 1],
        error: `Furniture "${furnitureId}" not found.`,
      };
    }

    const clampedScale = Math.round(Math.max(0.5, Math.min(4.0, rawNextScale)) * 100) / 100;
    const [scaledW, scaledH] = getOrientedFootprint(
      target.type,
      target.facing,
      clampedScale,
    );

    const nudges = [0, -1, 1, -2, 2, -3, 3];
    for (const dy of nudges) {
      for (const dx of nudges) {
        const candX = target.x + dx;
        const candY = target.y + dy;
        const candidateIps = getCandidateInteractionPoints(
          candX,
          candY,
          scaledW,
          scaledH,
          target.facing,
        );

        for (const ip of candidateIps) {
          const candidate = cloneBlueprint(blueprint.value);
          const furn = candidate.furniture.find((f) => f.id === furnitureId)!;
          furn.x = candX;
          furn.y = candY;
          furn.footprint = [scaledW, scaledH];
          furn.scale = clampedScale;
          furn.interaction_point = ip;

          const validation = validateBlueprint(candidate);
          if (validation.valid) {
            blueprint.value = candidate;
            lastValidation.value = validation;
            revision.value++;
            return {
              success: true,
              scale: clampedScale,
              footprint: [scaledW, scaledH],
            };
          }
        }
      }
    }

    // Fallback: if surrounding grid tiles are tightly packed, still apply proportional visual scale
    const fallbackCandidate = cloneBlueprint(blueprint.value);
    const fallbackFurn = fallbackCandidate.furniture.find((f) => f.id === furnitureId)!;
    fallbackFurn.scale = clampedScale;
    blueprint.value = fallbackCandidate;
    lastValidation.value = validateBlueprint(fallbackCandidate);
    revision.value++;
    return {
      success: true,
      scale: clampedScale,
      footprint: fallbackFurn.footprint,
    };
  }

  const agentPatchRevision = ref(0);
  const lastAgentProfilePatches = ref<
    Array<{
      agentId: string;
      patch: { name?: string; avatar_sprite?: string; color?: string };
    }>
  >([]);

  function updateAgentProfile(
    agentId: string,
    patch: { name?: string; avatar_sprite?: string; color?: string },
  ): boolean {
    const idx = blueprint.value.agents.findIndex((a) => a.id === agentId);
    if (idx === -1) return false;

    const current = blueprint.value.agents[idx];
    const nextAgent = {
      ...current,
      name:
        patch.name !== undefined && patch.name.trim().length > 0
          ? patch.name.trim()
          : current.name,
      avatar_sprite: patch.avatar_sprite ?? current.avatar_sprite,
      color: patch.color ?? current.color,
    };

    const nextAgents = [...blueprint.value.agents];
    nextAgents[idx] = nextAgent;
    blueprint.value = {
      ...blueprint.value,
      agents: nextAgents,
    };
    lastAgentProfilePatches.value = [{ agentId, patch }];
    agentPatchRevision.value++;
    return true;
  }

  return {
    blueprint,
    revision,
    agentPatchRevision,
    lastAgentProfilePatches,
    lastValidation,
    agentsMap,
    furnitureMap,
    idleZones,
    setBlueprint,
    resetToDefaultBlueprint,
    updateFurniturePosition,
    rotateFurnitureFacing,
    addFurnitureItem,
    removeFurnitureItem,
    scaleFurnitureItem,
    updateAgentProfile,
  };
});
