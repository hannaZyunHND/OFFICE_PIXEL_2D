import { describe, it, expect } from 'vitest';
import {
  parseChatOrMarkdownRequirement,
  generateCrewAiIntegrationDoc,
  synthesizeSimulationStepsForBlueprint,
  buildDefaultSeedWorkflows,
  extractEndpointUrlFromPrompt,
  stripEndpointUrlFromPrompt,
} from '@/services/compiler/workflowGenerator';

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
    expect(seeds.length).toBe(3);
    expect(seeds[0].crew_endpoint_url).toBe('ws://localhost:8765/game-factory');

    const firstSeed = seeds[0];
    expect(firstSeed.blueprint.agents.length).toBe(11);
    expect(firstSeed.integration_doc_md).toContain(
      'TÀI LIỆU KỸ THUẬT KẾT NỐI CREWAI',
    );
    expect(firstSeed.integration_doc_md).toContain(
      'ws://localhost:8765/game-factory',
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
