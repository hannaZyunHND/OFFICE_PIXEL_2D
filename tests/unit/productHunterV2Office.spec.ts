import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { buildProductHunterV2Topology } from '@/services/compiler/llmTopologyExtractor';
import { generateProductHunterV2Blueprint } from '@/services/compiler/deterministicLayoutEngine';
import { buildDefaultSeedWorkflows } from '@/services/compiler/workflowGenerator';
import { GridPathfinder } from '@/engine/GridPathfinder';
import { useWorkflowStore } from '@/stores/useWorkflowStore';

const V2_IDS = [
  'agent_v2_liaison',
  'agent_v2_router',
  'agent_office_camera',
  'agent_v2_market_keyword',
  'agent_v2_market_category',
  'agent_v2_top_products',
  'agent_v2_product_eval',
  'agent_v2_compare',
  'agent_v2_full_report',
  'agent_v2_san_cam',
  'agent_v2_san_xanh',
  'agent_v2_san_den',
  'agent_v2_answer',
  'agent_v2_courier',
];

describe('Product Hunter v2 office floor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('places thirteen desks, fifteen edges, and a walkable aisle', () => {
    const blueprint = generateProductHunterV2Blueprint(buildProductHunterV2Topology());
    expect(blueprint.meta.layout_profile).toBe('product_hunter_v2_v1');
    expect(blueprint.agents.map((agent) => agent.id)).toEqual(V2_IDS);
    expect(blueprint.edges).toHaveLength(15);
    expect(blueprint.edges.some((edge) => edge.label === 'Thị trường từ khóa')).toBe(true);
    expect(blueprint.edges.some((edge) => edge.label === 'Sàn Cam')).toBe(true);

    const pathfinder = new GridPathfinder(blueprint);
    for (const agent of blueprint.agents) {
      const desk = blueprint.furniture.find((item) => item.id === agent.desk_id);
      expect(desk).toBeDefined();
      const [x, y] = desk!.interaction_point;
      expect(pathfinder.isTileWalkable(x, y)).toBe(true);
    }
    const questionRow = blueprint.agents
      .filter((agent) => agent.id.startsWith('agent_v2_market') || agent.id.includes('top') || agent.id.includes('eval') || agent.id.includes('compare') || agent.id.includes('full'))
      .map((agent) => blueprint.furniture.find((item) => item.id === agent.desk_id)!.y);
    expect(new Set(questionRow)).toEqual(new Set([7]));
    const floors = ['agent_v2_san_cam', 'agent_v2_san_xanh', 'agent_v2_san_den'].map(
      (id) => blueprint.furniture.find((item) => item.agent_id === id)!.y,
    );
    expect(new Set(floors)).toEqual(new Set([11]));
  });

  it('keeps the old hunter and opens v2 by default', () => {
    const seeds = buildDefaultSeedWorkflows();
    expect(seeds.some((workflow) => workflow.id === 'product_hunter_crewai')).toBe(true);
    const v2 = seeds.find((workflow) => workflow.id === 'product_hunter_v2_crewai');
    expect(v2?.crew_endpoint_url.endsWith('/product-hunter-v2')).toBe(true);
    expect(v2?.blueprint.meta.layout_profile).toBe('product_hunter_v2_v1');
    const store = useWorkflowStore();
    expect(store.activeWorkflowId).toBe('product_hunter_v2_crewai');
  });

  it('does not stuff eco props onto a sparse v2 floor', async () => {
    const seed = buildDefaultSeedWorkflows().find((workflow) => workflow.id === 'product_hunter_v2_crewai')!;
    const sparse = {
      ...seed,
      blueprint: {
        ...seed.blueprint,
        meta: { ...seed.blueprint.meta, layout_profile: 'old' },
        furniture: seed.blueprint.furniture.slice(0, 3),
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => ({ workflows: [sparse] }) };
      }),
    );
    const store = useWorkflowStore();
    await store.initWorkflows();
    const saved = store.workflows.find((workflow) => workflow.id === 'product_hunter_v2_crewai');
    expect(saved?.blueprint.meta.layout_profile).toBe('product_hunter_v2_v1');
    expect(saved?.blueprint.furniture.some((item) => item.type === 'ECO_BIOME_DOME')).toBe(false);
    expect(saved?.blueprint.agents).toHaveLength(14);
    vi.unstubAllGlobals();
  });
});
