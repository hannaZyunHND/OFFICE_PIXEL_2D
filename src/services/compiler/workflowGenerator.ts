import type { OfficeBlueprint } from '@/types/blueprint';
import type { AgentEvent, ToolIconType } from '@/types/events';
import type { Stage1SemanticTopology } from '@/types/assets';
import {
  GAME_FACTORY_WORKFLOW_MARKDOWN,
  COMPACT_5_AGENT_MARKDOWN,
  PRODUCT_HUNTER_MARKDOWN,
  parseMarkdownDeterministically,
} from './llmTopologyExtractor';
import {
  findBestSlotForFurniture,
  generateDeterministicBlueprint,
  generateProductHunterMinimalBlueprint,
} from './deterministicLayoutEngine';
import defaultBlueprintData from '@/data/defaultBlueprint.json';
import { MOCK_SCENARIOS } from '@/data/mockScenarios';
import { pickRandomAgentAvatarId } from '@/data/agentAvatarCatalog';
import { DEFAULT_CREWAI_WS_ORIGIN } from '@/config/runtimeEndpoints';

export interface WorkflowSimulationStep {
  delayMs: number;
  event: Omit<AgentEvent, 'event_id' | 'timestamp'>;
}

export interface StoredWorkflowRecord {
  id: string;
  name: string;
  description: string;
  crew_endpoint_url: string;
  raw_requirement: string;
  blueprint: OfficeBlueprint;
  steps: WorkflowSimulationStep[];
  integration_doc_md: string;
  created_at: number;
  avatar_catalog_v2?: boolean;
  minimal_layout_v1?: boolean;
}

/**
 * Extracts a CrewAI connection URL (ws://, wss://, http://, https://) from the prompt text.
 */
export function extractEndpointUrlFromPrompt(input: string): string | null {
  const match = input.match(/\b((?:wss?|https?):\/\/[^\s,;\])"'`<>]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Removes URL declarations (e.g., "URL kết nối: ws://localhost:8768/audit-crew") from the text
 * before extracting department names and agent roles.
 */
export function stripEndpointUrlFromPrompt(input: string): string {
  return input
    .replace(
      /^(?:[-*#>\s]*(?:url\s*kết\s*nối|endpoint\s*url|crew\s*url|websocket\s*url|url|endpoint)\s*[:=-]?\s*)?(?:wss?|https?):\/\/[^\s,;\])"'`<>]+\s*$/gim,
      '',
    )
    .replace(
      /\[?\b(?:url\s*kết\s*nối|endpoint\s*url|crew\s*url|url|endpoint)\s*[:=-]\s*(?:wss?|https?):\/\/[^\s,;\])"'`<>]+\]?/gi,
      '',
    )
    .replace(/\[?(?:wss?|https?):\/\/[^\s,;\])"'`<>]+\]?/gi, '')
    .trim();
}

/**
 * Generates a complete, copy-pasteable Technical Integration Document (.md)
 * so developers can connect a Python CrewAI project to this exact OfficeBlueprint and Endpoint URL.
 */
export function generateCrewAiIntegrationDoc(
  blueprint: OfficeBlueprint,
  workflowId: string,
  rawRequirement: string = '',
  crewEndpointUrl: string = DEFAULT_CREWAI_WS_ORIGIN,
): string {
  const agentRows = blueprint.agents
    .map(
      (a) =>
        `| \`${a.id}\` | **${a.name}** | ${a.role} | \`${a.desk_id}\` | \`${a.color}\` |`,
    )
    .join('\n');

  const edgeRows =
    blueprint.edges.length > 0
      ? blueprint.edges
          .map((e) => `| \`${e.from}\` | \`${e.to}\` | **${e.label}** |`)
          .join('\n')
      : '| *(Tuần tự)* | *(Tuần tự)* | Handoff |';

  const pythonAgentsList = blueprint.agents
    .map(
      (a) =>
        `    AgentSpec(id="${a.id}", name="${a.name}", role="${a.role}", color="${a.color}"),`,
    )
    .join('\n');

  const pythonEdgesList = blueprint.edges
    .map(
      (e) =>
        `    EdgeSpec(from_agent="${e.from}", to_agent="${e.to}", label="${e.label}"),`,
    )
    .join('\n');

  const firstAgent = blueprint.agents[0]?.id || 'agent_1';
  const secondAgent = blueprint.agents[1]?.id || firstAgent;

  return `# TÀI LIỆU KỸ THUẬT KẾT NỐI CREWAI ↔ PIXEL AGENT OFFICE
**Quy trình (Workflow ID)**: \`${workflowId}\`  
**Tên Mô Hình Phòng Ban**: **${blueprint.meta.project_name}**  
**URL Kết Nối CrewAI (Endpoint)**: \`${crewEndpointUrl}\`  
**Kích thước Bản đồ Lưới**: \`${blueprint.meta.grid_cols}x${blueprint.meta.grid_rows} tiles\` (\`tile_size = 32px\`)  
**Tổng số Nhân sự (Agents)**: \`${blueprint.agents.length} Agents\` • **Số luồng DAG**: \`${blueprint.edges.length} Edges\`

---

## 1. Bảng Ánh Xạ Định Danh Nhân Sự (Agent ID Mapping)
Khi phát sự kiện từ **CrewAI (Python)** qua Endpoint \`${crewEndpointUrl}\`, trường \`agent_id\` và \`target_agent_id\` **bắt buộc** khớp với bảng định danh dưới đây:

| \`agent_id\` (Chuẩn kết nối) | Tên hiển thị | Vai trò trong CrewAI | Bàn làm việc (\`desk_id\`) | Màu nhận diện |
| :--- | :--- | :--- | :--- | :--- |
${agentRows}

---

## 2. Đồ Thị Luồng Chuyển Giao Công Việc (DAG Edges)
Các đường nối phát sáng trong chế độ **God-View (\`Tab\`)** và hiệu ứng bắn gói tin Bézier khi phát sự kiện \`AGENT_HANDOFF\`:

| Agent Nguồn (\`agent_id\`) | Agent Đích (\`target_agent_id\`) | Nhãn Luồng Dữ Liệu (\`label\`) |
| :--- | :--- | :--- |
${edgeRows}

---

## 3. Chuẩn Gói Tin Sự Kiện Thời Gian Thực (Real-Time Event JSON)
Bắn gói tin JSON dưới đây từ \`step_callback\` hoặc \`task_callback\` của CrewAI vào Endpoint \`${crewEndpointUrl}\`:

\`\`\`json
{
  "event_id": "evt_${Date.now()}",
  "timestamp": ${Date.now()},
  "event_type": "AGENT_START | AGENT_TOOL_CALL | AGENT_HANDOFF | AGENT_COMPLETE | AGENT_ERROR",
  "agent_id": "${firstAgent}",
  "target_agent_id": "${secondAgent}",
  "metadata": {
    "status_text": "Đang xử lý tác vụ trong ${blueprint.meta.project_name}...",
    "icon": "search | code | db | error | message | check",
    "input_payload": { "task": "Dữ liệu đầu vào của Agent" },
    "output_payload": { "result": "Kết quả đầu ra của Agent" },
    "tokens_used": 450,
    "duration_ms": 1200
  }
}
\`\`\`

---

## 4. Code Python Tích Hợp Nhanh Vào Dự Án CrewAI (\`crewai_connector.py\`)
Sao chép đoạn code dưới đây vào dự án \`crewAI/\` của bạn để lắng nghe / bắn sự kiện thời gian thực qua đúng Endpoint \`${crewEndpointUrl}\`:

\`\`\`python
import asyncio
from pixel_office_sdk import AgentSpec, EdgeSpec, PixelOfficeBridge, build_office_blueprint

CREW_ENDPOINT_URL = "${crewEndpointUrl}"

# 1. Khai báo cấu trúc phòng ban khớp 100% với "${blueprint.meta.project_name}"
AGENTS = [
${pythonAgentsList}
]

EDGES = [
${pythonEdgesList}
]

BLUEPRINT = build_office_blueprint("${blueprint.meta.project_name}", AGENTS, EDGES)

async def run_crew_workflow(prompt: str, bridge: PixelOfficeBridge):
    # Đồng bộ sơ đồ phòng ban lên Frontend qua ${crewEndpointUrl}
    await bridge.set_blueprint(BLUEPRINT)

    # Phát sự kiện theo tiến trình thực thi của từng Agent
    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id="${firstAgent}",
        status_text=f"Khởi động quy trình: {prompt}",
        input_payload={"prompt": prompt, "endpoint": CREW_ENDPOINT_URL},
        tokens_used=320,
    )
    await asyncio.sleep(1.3)

    await bridge.emit_event(
        event_type="AGENT_HANDOFF",
        agent_id="${firstAgent}",
        target_agent_id="${secondAgent}",
        status_text="Chuyển giao kết quả bước 1...",
        icon="message",
        tokens_used=180,
    )
    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id="${firstAgent}",
        status_text="Hoàn tất nhiệm vụ ✓",
        icon="check",
        tokens_used=95,
    )
\`\`\`

---

## 5. Yêu Cầu / Mô Tả Gốc Của Quy Trình (Bao Gồm URL Kết Nối)
\`\`\`markdown
${rawRequirement.trim()}
\`\`\`
`;
}

/**
 * Synthesizes a complete, realistic simulation event sequence for any OfficeBlueprint
 * by traversing its agents and directed workflow edges.
 */
export function synthesizeSimulationStepsForBlueprint(
  blueprint: OfficeBlueprint,
): WorkflowSimulationStep[] {
  const steps: WorkflowSimulationStep[] = [];
  const toolIcons: ToolIconType[] = ['search', 'code', 'db', 'search', 'code'];

  blueprint.agents.forEach((agent, idx) => {
    const outgoingEdges = blueprint.edges.filter((e) => e.from === agent.id);
    const toolIcon = toolIcons[idx % toolIcons.length];

    steps.push({
      delayMs: idx === 0 ? 250 : 450,
      event: {
        event_type: 'AGENT_START',
        agent_id: agent.id,
        metadata: {
          status_text: `${agent.name}: Bắt đầu "${agent.role}"...`,
          input_payload: {
            workflow: blueprint.meta.project_name,
            agent_id: agent.id,
            role: agent.role,
            step_index: idx + 1,
          },
          tokens_used: 380 + idx * 55,
          duration_ms: 1300,
        },
      },
    });

    steps.push({
      delayMs: 1300,
      event: {
        event_type: 'AGENT_TOOL_CALL',
        agent_id: agent.id,
        metadata: {
          status_text: `${agent.name}: Đang chạy công cụ [${toolIcon.toUpperCase()}] xử lý tác vụ...`,
          icon: toolIcon,
          input_payload: {
            tool: `${toolIcon}_executor`,
            agent: agent.name,
          },
          output_payload: {
            status: 'SUCCESS',
            summary: `Kết quả xử lý từ ${agent.name} (${agent.role})`,
          },
          tokens_used: 540 + idx * 40,
          duration_ms: 1300,
        },
      },
    });

    for (const edge of outgoingEdges) {
      const targetAgent = blueprint.agents.find((a) => a.id === edge.to);
      steps.push({
        delayMs: 650,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: agent.id,
          target_agent_id: edge.to,
          metadata: {
            status_text: `Chuyển giao [${edge.label}] → ${targetAgent?.name || edge.to}...`,
            icon: 'message',
            output_payload: {
              edge_label: edge.label,
              from: agent.id,
              to: edge.to,
            },
            tokens_used: 195,
          },
        },
      });
    }

    steps.push({
      delayMs: 500,
      event: {
        event_type: 'AGENT_COMPLETE',
        agent_id: agent.id,
        metadata: {
          status_text: `${agent.name}: Hoàn tất "${agent.role}" ✓`,
          icon: 'check',
          output_payload: {
            completed_by: agent.id,
            verdict: 'DONE',
          },
          tokens_used: 110,
        },
      },
    });
  });

  return steps;
}

/**
 * Parses a natural language chat prompt OR Markdown/ASCII specification into a Stage1SemanticTopology.
 * Automatically strips out the connection URL before extracting the project title and agent roles.
 */
export function parseChatOrMarkdownRequirement(
  input: string,
): Stage1SemanticTopology {
  const cleaned = stripEndpointUrlFromPrompt(input);
  const trimmed = cleaned || input.trim();

  // If it already looks like structured Markdown or the Game Factory ASCII diagram, use deterministic parser
  if (
    trimmed.includes('#') ||
    trimmed.includes('┌') ||
    trimmed.includes('**') ||
    /GAME FACTORY|Pedagogy Analyst/i.test(trimmed)
  ) {
    const parsed = parseMarkdownDeterministically(trimmed);
    if (parsed.agents.length > 0) {
      return parsed;
    }
  }

  // Natural Language Chat Prompt Analyzer:
  // Extract project title and role items separated by commas, semicolons, newlines, or arrows
  const nonEmptyLines = trimmed
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*#]+\s*/, '').trim())
    .filter(Boolean);
  const firstLine = nonEmptyLines[0] || 'Phòng Ban CrewAI Mới';
  const titleCandidate = firstLine.includes(':')
    ? firstLine.slice(0, firstLine.indexOf(':')).trim()
    : firstLine;
  const projectName =
    titleCandidate.length >= 4 && titleCandidate.length <= 75
      ? titleCandidate
      : `Phòng Ban CrewAI: ${titleCandidate.slice(0, 48)}...`;

  const palette = [
    '#38bdf8',
    '#22c55e',
    '#f59e0b',
    '#ec4899',
    '#a855f7',
    '#14b8a6',
    '#6366f1',
    '#f97316',
    '#eab308',
    '#10b981',
  ];
  const usedAvatars: string[] = [];
  const nextRandomAvatar = (): string => {
    const id = pickRandomAgentAvatarId({ excludeIds: usedAvatars });
    usedAvatars.push(id);
    return id;
  };

  // Look for colon list or comma/arrow-separated roles
  const afterColon = trimmed.includes(':')
    ? trimmed.slice(trimmed.indexOf(':') + 1)
    : trimmed;

  const rawParts = afterColon
    .split(/(?:,|;|->|→|=>|\r?\n)+/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 70);

  const agents: Stage1SemanticTopology['agents'] = [];
  if (rawParts.length >= 2) {
    rawParts.slice(0, 12).forEach((part, idx) => {
      const isApproval =
        /qa|critic|review|audit|kiểm duyệt|phê duyệt|giám sát|bảo mật|deploy|quản lý|kiểm toán|giám đốc/i.test(
          part,
        );
      const id = `agent_${part
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 22)}_${idx + 1}`;

      agents.push({
        id,
        name: part.split(/[—–-]/)[0].trim(),
        role: part,
        zone_id: isApproval ? 'zone_approval' : 'zone_work',
        color: palette[idx % palette.length],
        avatar_sprite: nextRandomAvatar(),
      });
    });
  }

  // If the user wrote a high-level topic prompt (e.g. "Phòng ban Marketing & SEO 5 Agents"), synthesize specialized roles
  if (agents.length < 2) {
    const countMatch = trimmed.match(/(\d+)\s*agents?/i);
    const targetCount = countMatch
      ? Math.min(10, Math.max(3, Number(countMatch[1])))
      : 5;

    const defaultTemplates = [
      { name: 'Lead Strategist', role: `Phân tích yêu cầu & Lập kế hoạch (${projectName})`, zone: 'zone_work' },
      { name: 'Research Specialist', role: 'Thu thập dữ liệu & Khảo sát nguồn tin', zone: 'zone_work' },
      { name: 'Execution Engineer', role: 'Thực thi công cụ & Xây dựng sản phẩm', zone: 'zone_work' },
      { name: 'Content & UI Synthesizer', role: 'Biên tập nội dung & Đóng gói tài liệu', zone: 'zone_work' },
      { name: 'QA & Compliance Critic', role: 'Kiểm thử chất lượng & Phê duyệt đầu ra', zone: 'zone_approval' },
      { name: 'Release & Ops Coordinator', role: 'Triển khai & Báo cáo kết quả', zone: 'zone_approval' },
      { name: 'Data Visualizer', role: 'Trực quan hóa chỉ số & Biểu đồ', zone: 'zone_work' },
      { name: 'Security Auditor', role: 'Kiểm định an toàn & Rủi ro', zone: 'zone_approval' },
    ];

    for (let i = 0; i < targetCount; i++) {
      const tpl = defaultTemplates[i % defaultTemplates.length];
      agents.push({
        id: `agent_custom_${i + 1}`,
        name: tpl.name,
        role: tpl.role,
        zone_id: tpl.zone,
        color: palette[i % palette.length],
        avatar_sprite: nextRandomAvatar(),
      });
    }
  }

  const edges: Stage1SemanticTopology['edges'] = [];
  for (let i = 0; i < agents.length - 1; i++) {
    edges.push({
      from: agents[i].id,
      to: agents[i + 1].id,
      label: `Step ${i + 1} Handoff`,
    });
  }

  return {
    project_name: projectName,
    zones: [
      {
        id: 'zone_work',
        name: 'Khu Thực Thi & Sản Xuất',
        type: 'WORK',
        props: ['WHITEBOARD', 'BOOKSHELF', 'PLANT'],
      },
      {
        id: 'zone_approval',
        name: 'Phòng Kiểm Duyệt & QA',
        type: 'APPROVAL',
        props: ['PLANT'],
      },
      {
        id: 'zone_pantry',
        name: 'Pantry & Lounge Thư Giãn',
        type: 'IDLE',
        props: ['COFFEE_MACHINE', 'SOFA', 'AQUARIUM'],
      },
    ],
    agents,
    edges,
  };
}

/**
 * Builds the 3 default seed workflows stored in SQLite so the user can switch
 * between them immediately and inspect their blueprints + endpoint URLs + technical docs.
 */
export function buildDefaultSeedWorkflows(): StoredWorkflowRecord[] {
  // 1. Multi-Agent Game Factory (11 Agents, 28x23 Tiles)
  const gameFactoryUrl = `${DEFAULT_CREWAI_WS_ORIGIN}/game-factory`;
  const gameFactoryTopology = parseMarkdownDeterministically(
    GAME_FACTORY_WORKFLOW_MARKDOWN,
  );
  const gameFactoryBlueprint = generateDeterministicBlueprint(gameFactoryTopology);
  const gameFactorySteps =
    MOCK_SCENARIOS.find((s) => s.id === 'game_factory_crewai')?.steps ||
    synthesizeSimulationStepsForBlueprint(gameFactoryBlueprint);
  const gameFactoryRaw = `URL kết nối: ${gameFactoryUrl}\n${GAME_FACTORY_WORKFLOW_MARKDOWN}`;

  // 2. Autonomous Research Crew (4 Agents, 24x16 Tiles)
  const researchUrl = `${DEFAULT_CREWAI_WS_ORIGIN}/research-crew`;
  const researchBlueprint = JSON.parse(
    JSON.stringify(defaultBlueprintData),
  ) as OfficeBlueprint;
  const usedResearchAvatars: string[] = [];
  researchBlueprint.agents = researchBlueprint.agents.map((agent) => {
    if (agent.avatar_sprite === 'director_ceo') return agent;
    const avatar = pickRandomAgentAvatarId({ excludeIds: usedResearchAvatars });
    usedResearchAvatars.push(avatar);
    return { ...agent, avatar_sprite: avatar };
  });
  if (!researchBlueprint.furniture.some((f) => f.type === 'PS5_PES_STATION')) {
    const ps5Slot = findBestSlotForFurniture(
      researchBlueprint,
      'PS5_PES_STATION',
      [2, 1],
      'IDLE',
      'ps5_pes',
    );
    if (ps5Slot) researchBlueprint.furniture.push(ps5Slot);
  }
  const researchSteps =
    MOCK_SCENARIOS.find((s) => s.id === 'research_crew_full')?.steps ||
    synthesizeSimulationStepsForBlueprint(researchBlueprint);
  const researchRawMd = `URL kết nối: ${researchUrl}
# Autonomous Research Crew (4 Agents)
## Danh Sách Nhân Sự (Agents)
1. **Alice (Researcher)** — Thu thập & Tổng hợp dữ liệu (Khu Phát Triển)
2. **Bob (Data Analyst)** — Phân tích định lượng & Kiểm chứng (Khu Phát Triển)
3. **Clara (Tech Writer)** — Biên soạn báo cáo & Trực quan hóa (Khu Phát Triển)
4. **Viktor (QA Supervisor)** — Kiểm duyệt chất lượng & Phê duyệt (Phòng Kiểm Duyệt)
`;

  // 3. CyberSec & Full-Stack Product Squad (5 Agents)
  const cyberUrl = `${DEFAULT_CREWAI_WS_ORIGIN}/cybersec-crew`;
  const cyberTopology = parseMarkdownDeterministically(COMPACT_5_AGENT_MARKDOWN);
  const cyberBlueprint = generateDeterministicBlueprint(cyberTopology);
  const cyberSteps = synthesizeSimulationStepsForBlueprint(cyberBlueprint);
  const cyberRaw = `URL kết nối: ${cyberUrl}\n${COMPACT_5_AGENT_MARKDOWN}`;

  // 4. Product Hunter — 3 Sàn TMĐT (Shopee / Lazada / TikTok Shop — 8 Agents)
  const hunterUrl = `${DEFAULT_CREWAI_WS_ORIGIN}/product-hunter`;
  const hunterTopology = parseMarkdownDeterministically(PRODUCT_HUNTER_MARKDOWN);
  const hunterBlueprint = generateProductHunterMinimalBlueprint(hunterTopology);
  const hunterSteps = synthesizeSimulationStepsForBlueprint(hunterBlueprint);
  const hunterRaw = `URL kết nối: ${hunterUrl}\n${PRODUCT_HUNTER_MARKDOWN}`;

  return [
    {
      id: 'game_factory_crewai',
      name: 'Multi-Agent Game Factory (CrewAI Flows — 11 Agents)',
      description:
        'Mô hình phòng ban 11 Agents (28x23 tiles): Phase 1 Tuần tự → Phase 2 Rẽ nhánh song song 3 luồng (Arcade/Sim/Puzzle) + Vòng lặp QA/Vision Critic → Phase 3 Đóng gói Portal.',
      crew_endpoint_url: gameFactoryUrl,
      raw_requirement: gameFactoryRaw,
      blueprint: gameFactoryBlueprint,
      steps: gameFactorySteps,
      integration_doc_md: generateCrewAiIntegrationDoc(
        gameFactoryBlueprint,
        'game_factory_crewai',
        gameFactoryRaw,
        gameFactoryUrl,
      ),
      created_at: Date.now() - 30000,
    },
    {
      id: 'research_crew_full',
      name: 'Autonomous Research Crew — Viết Báo Cáo Nghiên Cứu (4 Agents)',
      description:
        'Mô hình phòng ban 4 Agents tiêu chuẩn (24x16 tiles): Alice (Researcher) → Bob (Analyst) → Clara (Writer) → Viktor (QA Supervisor).',
      crew_endpoint_url: researchUrl,
      raw_requirement: researchRawMd,
      blueprint: researchBlueprint,
      steps: researchSteps,
      integration_doc_md: generateCrewAiIntegrationDoc(
        researchBlueprint,
        'research_crew_full',
        researchRawMd,
        researchUrl,
      ),
      created_at: Date.now() - 20000,
    },
    {
      id: 'cybersec_product_crew',
      name: 'CyberSec & Product Squad — Phát Triển & Bảo Mật (5 Agents)',
      description:
        'Mô hình phòng ban 5 Agents (Neo, Trinity, Morpheus, Oracle, Seraph) với luồng rẽ nhánh Backend/Frontend và cổng kiểm toán bảo mật.',
      crew_endpoint_url: cyberUrl,
      raw_requirement: cyberRaw,
      blueprint: cyberBlueprint,
      steps: cyberSteps,
      integration_doc_md: generateCrewAiIntegrationDoc(
        cyberBlueprint,
        'cybersec_product_crew',
        cyberRaw,
        cyberUrl,
      ),
      created_at: Date.now() - 10000,
    },
    {
      id: 'product_hunter_crewai',
      name: 'Product Hunter — Săn Sản Phẩm 3 Sàn (Shopee / Lazada / TikTok — 8 Agents)',
      description:
        'CrewAI phân tích thị trường đa sàn hoàn toàn tự động (AddLiveTag Sàn Cam, Apify Sàn Xanh & Đen, Serper): Điểm Đại dương xanh /100, HHI, Tỷ lệ có bán, Hoa hồng TB, Top Shop CR5; hỗ trợ bật HITL tùy chọn.',
      crew_endpoint_url: hunterUrl,
      raw_requirement: hunterRaw,
      blueprint: hunterBlueprint,
      steps: hunterSteps,
      integration_doc_md: generateCrewAiIntegrationDoc(
        hunterBlueprint,
        'product_hunter_crewai',
        hunterRaw,
        hunterUrl,
      ),
      created_at: Date.now() - 5000,
      avatar_catalog_v2: true,
      minimal_layout_v1: true,
    },
  ];
}
