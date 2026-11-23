import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  PRODUCT_HUNTER_MARKDOWN,
  parseMarkdownDeterministically,
} from '@/services/compiler/llmTopologyExtractor';
import { generateDeterministicBlueprint } from '@/services/compiler/deterministicLayoutEngine';
import { buildDefaultSeedWorkflows } from '@/services/compiler/workflowGenerator';
import { GridPathfinder } from '@/engine/GridPathfinder';
import {
  loadLocalSettings,
  saveLocalSettings,
} from '@/services/storage/localConfig';
import { useUiStore } from '@/stores/useUiStore';
import { DEFAULT_CREWAI_WS_ORIGIN } from '@/config/runtimeEndpoints';

describe('Product Hunter Crew, HITL UI State & Provider Extras Config', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('compiles PRODUCT_HUNTER_MARKDOWN into a valid 11-agent OfficeBlueprint with A* walkable paths', () => {
    const topology = parseMarkdownDeterministically(PRODUCT_HUNTER_MARKDOWN);
    expect(topology.agents.length).toBe(11);
    expect(topology.agents[0]?.id).toBe('agent_telegram_liaison');
    expect(topology.agents.some((a) => a.id === 'agent_office_camera')).toBe(true);
    expect(topology.agents.some((a) => a.id === 'agent_chairman_courier')).toBe(true);
    expect(topology.agents.some((a) => a.id === 'agent_shopee_hunter')).toBe(true);
    expect(topology.agents.some((a) => a.id === 'agent_lazada_hunter')).toBe(true);
    expect(topology.agents.some((a) => a.id === 'agent_tiktok_hunter')).toBe(true);
    expect(topology.agents.some((a) => a.id === 'agent_market_auditor')).toBe(true);

    const bp = generateDeterministicBlueprint(topology);
    const pathfinder = new GridPathfinder(bp);
    const directorDesk = bp.furniture.find((f) => f.type === 'DIRECTOR_DESK');
    expect(directorDesk).toBeDefined();

    for (const agent of bp.agents) {
      const desk = bp.furniture.find((f) => f.id === agent.desk_id);
      expect(desk).toBeDefined();
      const [dx, dy] = desk!.interaction_point;
      expect(pathfinder.isTileWalkable(dx, dy)).toBe(true);
    }
  });

  it('registers streamlined minimal product_hunter_crewai in buildDefaultSeedWorkflows()', async () => {
    const seeds = buildDefaultSeedWorkflows();
    const ph = seeds.find((w) => w.id === 'product_hunter_crewai');
    expect(ph).toBeDefined();
    expect(ph?.crew_endpoint_url).toBe(`${DEFAULT_CREWAI_WS_ORIGIN}/product-hunter`);
    expect(ph?.blueprint.agents.length).toBe(11);
    expect(ph?.steps.length).toBeGreaterThan(10);

    const bp = ph!.blueprint;
    expect(bp.meta.layout_profile).toBe('product_hunter_minimal_v2');

    const types = bp.furniture.map((f) => f.type);
    expect(types).toContain('LARGE_AQUARIUM');
    expect(types).toContain('BOOKSHELF');
    expect(types).toContain('DIRECTOR_DESK');
    expect(types).toContain('PS5_PES_STATION');
    expect(types).toContain('FOOSBALL_TABLE');
    expect(types).toContain('COFFEE_MACHINE');
    expect(types).toContain('MINI_BAR_COUNTER');
    expect(types).toContain('OFFICE_CAT');
    expect(types).toContain('ROBOT_VACUUM');
    // No bloated eco-biome, koi ponds, or excessive clutter
    expect(types).not.toContain('ECO_BIOME_DOME');
    expect(types).not.toContain('KOI_POND');
    expect(types).not.toContain('CORGI_DOG');
    expect(bp.furniture.length).toBe(21);

    const pathfinder = new GridPathfinder(bp);
    const desk0 = bp.furniture.find((f) => f.id === bp.agents[0].desk_id)!;
    const directorDesk = bp.furniture.find((f) => f.type === 'DIRECTOR_DESK')!;
    const foosball = bp.furniture.find((f) => f.type === 'FOOSBALL_TABLE')!;

    for (const item of bp.furniture) {
      expect(
        pathfinder.isTileWalkable(
          item.interaction_point[0],
          item.interaction_point[1],
        ),
      ).toBe(true);
    }

    const toBoss = await pathfinder.findPath(
      desk0.interaction_point[0],
      desk0.interaction_point[1],
      directorDesk.interaction_point[0],
      directorDesk.interaction_point[1],
    );
    expect(toBoss).not.toBeNull();

    const toFoosball = await pathfinder.findPath(
      desk0.interaction_point[0],
      desk0.interaction_point[1],
      foosball.interaction_point[0],
      foosball.interaction_point[1],
    );
    expect(toFoosball).not.toBeNull();
  });

  it('persists ProviderExtrasConfig safely via localConfig with auto_skip default', () => {
    const defaults = loadLocalSettings();
    expect(defaults.extras.hitlPolicy).toBe('auto_skip');
    expect(defaults.extras.allowSandboxFallback).toBe(true);

    if (typeof window !== 'undefined') {
      saveLocalSettings({
        ...defaults,
        extras: {
          ...defaults.extras,
          apifyMaxItemsPerPlatform: 25,
          hitlPolicy: 'heavy_tools_only',
        },
      });
      const reloaded = loadLocalSettings();
      expect(reloaded.extras.apifyMaxItemsPerPlatform).toBe(25);
      expect(reloaded.extras.hitlPolicy).toBe('heavy_tools_only');
    }
  });

  it('manages HITL pending approvals, resolutions, and tool metadata in useUiStore', () => {
    const ui = useUiStore();
    ui.setRegisteredExternalTools([
      {
        name: 'addlivetag_market_search',
        provider: 'AddLiveTag',
        description: 'Shopee market lookup',
        cost_tier: 'free',
        estimated_cost_usd: 0,
        requires_hitl: false,
      },
    ]);
    expect(ui.registeredExternalTools.length).toBe(1);

    const req = {
      approval_id: 'hitl_test_1',
      agent_id: 'agent_market_auditor',
      step_title: 'Gate #2: Nhập giá vốn',
      summary_md: 'Top 3 phân khúc giá',
    };
    ui.setPendingHitlApproval(req);
    expect(ui.pendingHitlApproval?.approval_id).toBe('hitl_test_1');

    ui.recordHitlResolution(req, {
      approval_id: 'hitl_test_1',
      decision: 'approve',
      selected_choices: ['tier_mid'],
      inputs: { cost_price_vnd: 85000 },
      note: 'Đánh TikTok trước',
    });
    expect(ui.pendingHitlApproval).toBeNull();
    expect(ui.hitlDecisionHistory.length).toBe(1);
    expect(ui.hitlDecisionHistory[0].response.inputs.cost_price_vnd).toBe(85000);
  });
});
