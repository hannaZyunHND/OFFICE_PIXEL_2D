import { describe, it, expect } from 'vitest';
import {
  parseChatOrMarkdownRequirement,
  generateCrewAiIntegrationDoc,
  synthesizeSimulationStepsForBlueprint,
  buildDefaultSeedWorkflows,
  extractEndpointUrlFromPrompt,
  stripEndpointUrlFromPrompt,
} from '@/services/compiler/workflowGenerator';
import { DEFAULT_CREWAI_WS_ORIGIN } from '@/config/runtimeEndpoints';

describe('Workflow Generator & CrewAI Technical Documentation', () => {
  it('extracts mandatory CrewAI Endpoint URL from prompt and generates department + technical doc', () => {
    const req =
      'URL kết nối: ws://localhost:8768/audit-crew\nĐội Kiểm Toán & Phân Tích Tài Chính 6 Agents: Thu thập báo cáo, Phân tích định lượng, Định giá tài sản, Dự báo rủi ro, Kiểm toán độc lập QA, Giám đốc phê duyệt';

    const extractedUrl = extractEndpointUrlFromPrompt(req);
    expect(extractedUrl).toBe('ws://localhost:8768/audit-crew');

    const stripped = stripEndpointUrlFromPrompt(req);
    expect(stripped).not.toContain('ws://localhost:8768/audit-crew');

    const topology = parseChatOrMarkdownRequirement(req);
    expect(topology.project_name).toBe(
      'Đội Kiểm Toán & Phân Tích Tài Chính 6 Agents',
    );
    expect(topology.agents.length).toBe(6);
    expect(topology.zones.length).toBe(3);

    const seeds = buildDefaultSeedWorkflows();
    expect(seeds.length).toBe(1);
    expect(seeds[0].id).toBe('product_hunter_crewai');
    expect(seeds[0].crew_endpoint_url).toBe(`${DEFAULT_CREWAI_WS_ORIGIN}/product-hunter`);

    const firstSeed = seeds[0];
    expect(firstSeed.blueprint.agents.length).toBe(15);
    expect(firstSeed.integration_doc_md).toContain(
      'TÀI LIỆU KỸ THUẬT KẾT NỐI CREWAI',
    );
    expect(firstSeed.integration_doc_md).toContain(
      `${DEFAULT_CREWAI_WS_ORIGIN}/product-hunter`,
    );

    const steps = synthesizeSimulationStepsForBlueprint(firstSeed.blueprint);
    expect(steps.length).toBeGreaterThan(5);

    const doc = generateCrewAiIntegrationDoc(
      firstSeed.blueprint,
      'audit_crew_6',
      req,
      extractedUrl || 'ws://localhost:8768/audit-crew',
    );
    expect(doc).toContain('ws://localhost:8768/audit-crew');
  });
});
