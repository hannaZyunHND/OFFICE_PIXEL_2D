import { GoogleGenAI, Type } from '@google/genai';
import type { Stage1SemanticTopology } from '@/types/assets';
import type { LocalOfficeSettings } from '@/services/storage/localConfig';
import {
  AGENT_AVATAR_CATALOG,
  pickRandomAgentAvatarId,
} from '@/data/agentAvatarCatalog';

const VALID_AVATAR_IDS = new Set(AGENT_AVATAR_CATALOG.map((p) => p.id));

export const GAME_FACTORY_WORKFLOW_MARKDOWN = `# SƠ ĐỒ KIẾN TRÚC HỆ THỐNG: MULTI-AGENT GAME FACTORY (CREWAI FLOWS)

                                      [ USER PROMPT ]
                            ("Dạy phân số lớp 4 - Cắt bánh")
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PRE-PRODUCTION CREW (Chạy tuần tự - Sequential)                                │
│                                                                                         │
│  ┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │  Pedagogy Analyst   │ ───► │  Creative Director  │ ───► │  Art & Audio Director   │  │
│  │ (claude-3-7-sonnet) │      │      (o3-mini)      │      │   (claude-3-7-sonnet)   │  │
│  └─────────────────────┘      └─────────────────────┘      └────────────┬────────────┘  │
│                                                                         │               │
│                                     Output: MasterBlueprint (3 GDDs) ◄──┘               │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                 ┌───────────────────────────┼───────────────────────────┐
                 │ (asyncio.gather - Rẽ nhánh song song 3 luồng độc lập) │
                 ▼                           ▼                           ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
│ STREAM 1: ARCADE / PHYSICS  │ │ STREAM 2: SIMULATION / SIM  │ │ STREAM 3: PUZZLE / LOGIC    │
│                             │ │                             │ │                             │
│  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │
│  │    Level Designer     │  │ │  │    Level Designer     │  │ │  │    Level Designer     │  │
│  │  (claude-3-7-sonnet)  │  │ │  │  (claude-3-7-sonnet)  │  │ │  │  (claude-3-7-sonnet)  │  │
│  └───────────┬───────────┘  │ │  └───────────┬───────────┘  │ │  └───────────┬───────────┘  │
│              │              │ │              │              │ │              │              │
│              ▼              │ │              ▼              │ │              ▼              │
│  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │
│  │   Senior Game Dev     │◄┐│ │  │   Senior Game Dev     │◄┐│ │  │   Senior Game Dev     │◄┐│
│  │  (claude-3-7-sonnet)  │ ││ │  │  (claude-3-7-sonnet)  │ ││ │  │  (claude-3-7-sonnet)  │ ││
│  │ [FileWriter/Patcher]  │ ││ │  │ [FileWriter/Patcher]  │ ││ │  │ [FileWriter/Patcher]  │ ││
│  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││
│              │             ││ │              │             ││ │              │             ││
│              ▼             ││ │              ▼             ││ │              ▼             ││
│  ┌───────────────────────┐ ││ │  ┌───────────────────────┐ ││ │  ┌───────────────────────┐ ││
│  │  Headless QA Hunter   │ ││ │  │  Headless QA Hunter   │ ││ │  │  Headless QA Hunter   │ ││
│  │     (gpt-4o-mini)     │ ││ │  │     (gpt-4o-mini)     │ ││ │  │     (gpt-4o-mini)     │ ││
│  │ [Playwright Browser]  │ ││ │  │ [Playwright Browser]  │ ││ │  │ [Playwright Browser]  │ ││
│  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││
│              │             ││ │              │             ││ │              │             ││
│              ▼             ││ │              ▼             ││ │              ▼             ││
│  ┌───────────────────────┐ ││ │  ┌───────────────────────┐ ││ │  ┌───────────────────────┐ ││
│  │     Vision Critic     │ ││ │  │     Vision Critic     │ ││ │  │     Vision Critic     │ ││
│  │  (gpt-4o / claude-3.7)│ ││ │  │  (gpt-4o / claude-3.7)│ ││ │  │  (gpt-4o / claude-3.7)│ ││
│  │     [ImageReader]     │ ││ │  │     [ImageReader]     │ ││ │  │     [ImageReader]     │ ││
│  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││ │  └───────────┬───────────┘ ││
│              │             ││ │              │             ││ │              │             ││
│      [Score >= 8.0?]       ││ │      [Score >= 8.0?]       ││ │      [Score >= 8.0?]       ││
│       ├─ NO (<5 vòng) ─────┘│ │       ├─ NO (<5 vòng) ─────┘│ │       ├─ NO (<5 vòng) ─────┘│
│       ├─ NO (=5 vòng) ─►[DROP]│       ├─ NO (=5 vòng) ─►[DROP]│       ├─ NO (=5 vòng) ─►[DROP]│
│       └─ YES ──────────►[PASS]│       └─ YES ──────────►[PASS]│       └─ YES ──────────►[PASS]│
└──────────────┬──────────────┘ └──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │                               │
               └───────────────────────────────┼───────────────────────────────┘
                                               │ (Hội tụ & Lọc lấy các game PASS >= 1)
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: POST-PRODUCTION & DEPLOYMENT CREW                                              │
│                                                                                         │
│  ┌───────────────────────────────┐             ┌─────────────────────────────────────┐  │
│  │       Portal UI Packager      │             │           DevOps Deployer           │  │
│  │      (claude-3-7-sonnet)      │ ──────────► │            (gpt-4o-mini)            │  │
│  │ [Gom iframe + Fullscreen/Mute]│             │    [Vercel/SSH + QR Code Gen]       │  │
│  └───────────────────────────────┘             └──────────────────┬──────────────────┘  │
│                                                                   │                     │
│                                 Output: Link Web App + Mã QR Lớp Học ◄──────────────────┘
└─────────────────────────────────────────────────────────────────────────────────────────┘`;

export const SAMPLE_WORKFLOW_MARKDOWN = GAME_FACTORY_WORKFLOW_MARKDOWN;

export const COMPACT_5_AGENT_MARKDOWN = `# Hệ Thống Multi-Agent Phát Triển Sản Phẩm & Bảo Mật (5 Agents)

## Các Phòng Ban (Zones)
- **Engineering Lab (WORK)**: Khu vực thiết kế kiến trúc, lập trình và tích hợp công cụ.
- **Security & QA Gate (APPROVAL)**: Phòng kiểm thử bảo mật và phê duyệt bản phát hành.
- **Cyber Lounge & Pantry (IDLE)**: Khu vực pha cà phê espresso, hồ cá và ghế sofa nghỉ ngơi.

## Danh Sách Nhân Sự (Agents)
1. **Neo (System Architect)** — Phân tích yêu cầu & Thiết kế kiến trúc hệ thống (Engineering Lab)
2. **Trinity (Backend Coder)** — Xây dựng API & Tích hợp cơ sở dữ liệu (Engineering Lab)
3. **Morpheus (Frontend Designer)** — Tối ưu giao diện Pixel & Trải nghiệm người dùng (Engineering Lab)
4. **Oracle (Security Auditor)** — Rà soát lỗ hổng bảo mật & Kiểm định mã nguồn (Security & QA Gate)
5. **Seraph (Release Manager)** — Phê duyệt cuối cùng & Triển khai Production (Security & QA Gate)

## Luồng Công Việc (Workflow Edges)
- Neo -> Trinity: System Spec
- Neo -> Morpheus: UI Contract
- Trinity -> Oracle: Backend PR
- Morpheus -> Oracle: Frontend PR
- Oracle -> Seraph: Security Audit Report
`;

export const PRODUCT_HUNTER_MARKDOWN = `# Product Hunter — Săn Sản Phẩm 3 Sàn TMĐT (11 Agents · Telegram + HITL + External Tools)

## Các Phòng Ban (Zones)
- **Khu Nghiên Cứu & Thu Thập Đa Sàn (WORK)**: Mở rộng từ khóa, gọi API Sàn Cam / Sàn Xanh / Sàn Đen song song và phân tích giá - review.
- **Phòng Kiểm Toán Số Liệu & Báo Cáo (APPROVAL)**: Lọc nhiễu, bước sang Phòng Giám Đốc trình duyệt HITL và đóng gói Dashboard chiến lược.
- **Phòng Chơi & Pantry (IDLE)**: Khu giải lao tinh gọn gồm Quầy Pantry, máy PS5 PES và bàn Bi Lắc.

## Danh Sách Nhân Sự (Agents)
1. **Liên lạc Telegram** — Nhận tên sản phẩm Chủ tịch nhắn trong group
2. **Market Strategist** — Mở rộng từ khóa & quét tín hiệu Google Serper
3. **Shopee Hunter [Sàn Cam]** — Gọi AddLiveTag Market & Batch API
4. **Lazada Hunter [Sàn Xanh]** — Cào LazMall & giá khuyến mãi qua Apify
5. **TikTok Shop Hunter [Sàn Đen]** — Quét xu hướng GMV video/live & KOC qua Apify
6. **Pricing & Margin Analyst** — Phân tầng phân khúc giá & điểm ngọt thị trường
7. **VOC & Pain-Point Miner** — Khai thác nỗi đau đánh giá 1★–3★ → USP
8. **Camera văn phòng** — Cứ 10 giây chụp toàn cảnh gửi Chủ tịch
9. **Market Auditor [HITL]** — Kiểm toán chéo & trình Giám đốc chốt ngách + nhập giá vốn
10. **Executive Report Architect** — Tính Unit Economics & xuất Dashboard HTML/ZIP
11. **Thư ký Chủ tịch** — Đăng GitHub Pages và gửi link vào Telegram
`;

const SYSTEM_INSTRUCTION = `You are Stage 1 of the Pixel Agent Office Markdown-to-Office Compiler.
Extract the organizational topology from the user's Markdown description or ASCII architecture diagram into the strict JSON schema.
CRITICAL RULE: DO NOT output any (x, y) coordinates. Output only semantic zones, agents, props, and directed workflow edges.
Ensure at least one WORK zone, one APPROVAL zone (if any reviewer/manager/QA/critic exists), and one IDLE zone (with COFFEE_MACHINE and SOFA props).`;

/**
 * Stage 1: Extracts semantic multi-agent topology (zones, agents, edges — zero coordinates)
 * using Google Gemini SDK (@google/genai), OpenAI REST API, or deterministic Markdown/ASCII parser fallback.
 */
export async function extractTopologyFromMarkdown(
  markdownText: string,
  settings: LocalOfficeSettings,
  forceOfflineParser = false,
): Promise<{ topology: Stage1SemanticTopology; source: 'gemini' | 'openai' | 'offline-parser' }> {
  if (!forceOfflineParser) {
    if (settings.llmProvider === 'gemini' && settings.geminiApiKey.trim()) {
      const topology = await callGeminiStructuredTopology(
        markdownText,
        settings.geminiApiKey.trim(),
        settings.geminiModel || 'gemini-2.5-flash',
      );
      return { topology, source: 'gemini' };
    }

    if (settings.llmProvider === 'openai' && settings.openaiApiKey.trim()) {
      const topology = await callOpenAiStructuredTopology(
        markdownText,
        settings.openaiApiKey.trim(),
        settings.openaiModel || 'gpt-4o-mini',
        settings.openaiBaseUrl || 'https://api.openai.com/v1',
      );
      return { topology, source: 'openai' };
    }
  }

  return {
    topology: parseMarkdownDeterministically(markdownText),
    source: 'offline-parser',
  };
}

async function callGeminiStructuredTopology(
  markdownText: string,
  apiKey: string,
  modelName: string,
): Promise<Stage1SemanticTopology> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelName,
    contents: markdownText,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ['project_name', 'zones', 'agents', 'edges'],
        properties: {
          project_name: { type: Type.STRING },
          zones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['id', 'name', 'type', 'props'],
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['WORK', 'APPROVAL', 'IDLE'] },
                props: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                    enum: [
                      'COFFEE_MACHINE',
                      'SOFA',
                      'PLANT',
                      'AQUARIUM',
                      'WHITEBOARD',
                      'BOOKSHELF',
                    ],
                  },
                },
              },
            },
          },
          agents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['id', 'name', 'role', 'zone_id', 'color', 'avatar_sprite'],
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                zone_id: { type: Type.STRING },
                color: { type: Type.STRING },
                avatar_sprite: {
                  type: Type.STRING,
                },
              },
            },
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['from', 'to', 'label'],
              properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING },
                label: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const text = response.text || '';
  const parsed = JSON.parse(text) as Stage1SemanticTopology;
  return normalizeStage1Topology(parsed);
}

async function callOpenAiStructuredTopology(
  markdownText: string,
  apiKey: string,
  modelName: string,
  baseUrl: string,
): Promise<Stage1SemanticTopology> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${cleanUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_INSTRUCTION}\nReturn JSON with keys: project_name, zones (id, name, type: WORK|APPROVAL|IDLE, props[]), agents (id, name, role, zone_id, color, avatar_sprite), edges (from, to, label).`,
        },
        { role: 'user', content: markdownText },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content) as Stage1SemanticTopology;
  return normalizeStage1Topology(parsed);
}

/**
 * Deterministic Markdown & ASCII Architecture Parser:
 * Supports both structured Markdown bullet lists AND ASCII box-drawing architecture diagrams
 * (such as MULTI-AGENT GAME FACTORY / CrewAI Flows).
 */
export function parseMarkdownDeterministically(
  markdownText: string,
): Stage1SemanticTopology {
  // Check if the input matches the Multi-Agent Game Factory (CrewAI Flows) ASCII diagram pattern
  if (
    /GAME FACTORY|Pedagogy Analyst|Headless QA Hunter|Vision Critic|Portal UI Packager/i.test(
      markdownText,
    )
  ) {
    return buildGameFactoryTopology(markdownText);
  }

  if (
    /Product Hunter|Shopee Hunter|Lazada Hunter|TikTok Shop Hunter/i.test(
      markdownText,
    )
  ) {
    return buildProductHunterTopology(markdownText);
  }

  const lines = markdownText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const headingLine = lines.find((l) => l.startsWith('# '));
  const projectName = headingLine
    ? headingLine.replace(/^#+\s*/, '').trim()
    : 'Compiled Multi-Agent Office';

  const palette = [
    '#38bdf8',
    '#22c55e',
    '#f59e0b',
    '#c084fc',
    '#f43f5e',
    '#14b8a6',
    '#818cf8',
    '#fb923c',
  ];
  const usedAvatars: string[] = [];
  const nextRandomAvatar = (): string => {
    const id = pickRandomAgentAvatarId({ excludeIds: usedAvatars });
    usedAvatars.push(id);
    return id;
  };

  const zones: Stage1SemanticTopology['zones'] = [
    {
      id: 'zone_work',
      name: 'Khu Thực Thi & Phát Triển',
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
      id: 'zone_idle',
      name: 'Pantry & Lounge Thư Giãn',
      type: 'IDLE',
      props: ['COFFEE_MACHINE', 'SOFA', 'AQUARIUM'],
    },
  ];

  const agents: Stage1SemanticTopology['agents'] = [];
  const edges: Stage1SemanticTopology['edges'] = [];

  for (const line of lines) {
    const arrowMatch = line.match(
      /^[-*]?\s*([A-Za-z0-9_À-ỹ\s()]+?)\s*(?:->|→|=>|───►)\s*([A-Za-z0-9_À-ỹ\s()]+?)(?:\s*:\s*(.+))?$/,
    );
    if (arrowMatch) {
      edges.push({
        from: slugifyAgentId(arrowMatch[1]),
        to: slugifyAgentId(arrowMatch[2]),
        label: (arrowMatch[3] || 'Handoff').trim(),
      });
      continue;
    }

    const agentMatch = line.match(
      /^(?:\d+\.|[-*])\s*\*\*([^*]+)\*\*\s*(?:[—–:-]\s*(.+))?$/,
    );
    if (agentMatch) {
      const rawName = agentMatch[1].trim();
      const rawRole = (agentMatch[2] || 'Autonomous AI Agent').trim();
      if (
        /WORK|APPROVAL|IDLE/i.test(rawName) &&
        (rawName.includes('(WORK)') ||
          rawName.includes('(APPROVAL)') ||
          rawName.includes('(IDLE)'))
      ) {
        continue;
      }

      const isApproval =
        /review|qa|critic|audit|security|approv|supervisor|manager|kiểm duyệt|thẩm định/i.test(
          `${rawName} ${rawRole}`,
        );
      const idx = agents.length;
      agents.push({
        id: slugifyAgentId(rawName.split('(')[0]),
        name: rawName,
        role: rawRole,
        zone_id: isApproval ? 'zone_approval' : 'zone_work',
        color: palette[idx % palette.length],
        avatar_sprite: nextRandomAvatar(),
      });
    }
  }

  // Also extract ASCII box nodes if user drew custom ASCII boxes: │ Role Name │
  if (agents.length === 0) {
    const boxRegex = /│\s*([A-Za-zÀ-ỹ][A-Za-z0-9À-ỹ\s&/+-]{2,28}?)\s*│/g;
    const seenNames = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = boxRegex.exec(markdownText)) !== null) {
      const candidate = match[1].trim();
      if (
        /PHASE|STREAM|Score|YES|NO|Output|USER PROMPT|claude|gpt-|o3-|FileWriter|Playwright|ImageReader|Vercel|Gom iframe/i.test(
          candidate,
        )
      ) {
        continue;
      }
      if (!seenNames.has(candidate)) {
        seenNames.add(candidate);
        const idx = agents.length;
        const isApproval = /qa|critic|review|audit|deploy/i.test(candidate);
        agents.push({
          id: slugifyAgentId(candidate),
          name: candidate,
          role: 'ASCII Flow Agent',
          zone_id: isApproval ? 'zone_approval' : 'zone_work',
          color: palette[idx % palette.length],
          avatar_sprite: nextRandomAvatar(),
        });
      }
    }
  }

  if (agents.length === 0) {
    agents.push(
      {
        id: 'agent_planner',
        name: 'Planner Agent',
        role: 'Phân rã mục tiêu & Điều phối luồng',
        zone_id: 'zone_work',
        color: '#38bdf8',
        avatar_sprite: nextRandomAvatar(),
      },
      {
        id: 'agent_executor',
        name: 'Executor Agent',
        role: 'Thực thi công cụ & Xử lý dữ liệu',
        zone_id: 'zone_work',
        color: '#22c55e',
        avatar_sprite: nextRandomAvatar(),
      },
      {
        id: 'agent_critic',
        name: 'Critic & Verifier',
        role: 'Kiểm định kết quả & Phê duyệt',
        zone_id: 'zone_approval',
        color: '#c084fc',
        avatar_sprite: nextRandomAvatar(),
      },
    );
  }

  return normalizeStage1Topology({
    project_name: projectName,
    zones,
    agents,
    edges,
  });
}

/**
 * Builds the exact semantic topology for the MULTI-AGENT GAME FACTORY (CREWAI FLOWS) architecture:
 * - Phase 1: Sequential Pre-Production Crew (Pedagogy Analyst -> Creative Director -> Art & Audio Director)
 * - Phase 2: asyncio.gather 3 Parallel Streams (Level Designer -> Arcade/Sim/Puzzle Game Devs -> Headless QA Hunter -> Vision Critic with Score >= 8.0 loop)
 * - Phase 3: Post-Production & Deployment Crew (Portal UI Packager -> DevOps Deployer)
 */
function buildGameFactoryTopology(markdownText: string): Stage1SemanticTopology {
  const headingLine = markdownText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith('#'));
  const projectName = headingLine
    ? headingLine.replace(/^#+\s*/, '').trim()
    : 'MULTI-AGENT GAME FACTORY (CREWAI FLOWS)';

  const gfUsedAvatars: string[] = [];
  const nextGfAvatar = (): string => {
    const id = pickRandomAgentAvatarId({ excludeIds: gfUsedAvatars });
    gfUsedAvatars.push(id);
    return id;
  };

  return {
    project_name: projectName,
    zones: [
      {
        id: 'zone_work',
        name: 'Phase 1 & 2: Pre-Prod & 3 Game Streams',
        type: 'WORK',
        props: ['WHITEBOARD', 'BOOKSHELF', 'PLANT'],
      },
      {
        id: 'zone_approval',
        name: 'QA Playwright, Vision Critic & Deploy',
        type: 'APPROVAL',
        props: ['PLANT'],
      },
      {
        id: 'zone_pantry',
        name: 'Game Studio Pantry & Lounge',
        type: 'IDLE',
        props: ['COFFEE_MACHINE', 'SOFA', 'AQUARIUM'],
      },
    ],
    agents: [
      {
        id: 'agent_pedagogy',
        name: 'Pedagogy Analyst',
        role: 'Phase 1 (claude-3-7-sonnet): Phân tích sư phạm "Dạy phân số lớp 4 - Cắt bánh"',
        zone_id: 'zone_work',
        color: '#38bdf8',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_creative',
        name: 'Creative Director',
        role: 'Phase 1 (o3-mini): Thiết kế cơ chế Gameplay 3 dòng (Arcade / Sim / Puzzle)',
        zone_id: 'zone_work',
        color: '#f59e0b',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_art_audio',
        name: 'Art & Audio Director',
        role: 'Phase 1 (claude-3-7-sonnet): Định hướng mỹ thuật & Xuất MasterBlueprint (3 GDDs)',
        zone_id: 'zone_work',
        color: '#ec4899',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_level_designer',
        name: 'Level Designer (3 Streams)',
        role: 'Phase 2 (claude-3-7-sonnet): Thiết kế màn chơi song song (asyncio.gather)',
        zone_id: 'zone_work',
        color: '#a855f7',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_dev_arcade',
        name: 'Game Dev [Stream 1: Arcade]',
        role: 'Stream 1 (claude-3-7-sonnet): Code Physics Cắt Bánh [FileWriter/Patcher]',
        zone_id: 'zone_work',
        color: '#22c55e',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_dev_sim',
        name: 'Game Dev [Stream 2: Sim]',
        role: 'Stream 2 (claude-3-7-sonnet): Code Tiệm Bánh Phân Số [FileWriter/Patcher]',
        zone_id: 'zone_work',
        color: '#14b8a6',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_dev_puzzle',
        name: 'Game Dev [Stream 3: Puzzle]',
        role: 'Stream 3 (claude-3-7-sonnet): Code Ghép Bánh Logic [FileWriter/Patcher]',
        zone_id: 'zone_work',
        color: '#6366f1',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_portal_packager',
        name: 'Portal UI Packager',
        role: 'Phase 3 (claude-3-7-sonnet): Gom game PASS >= 1 [iframe + Fullscreen/Mute]',
        zone_id: 'zone_work',
        color: '#06b6d4',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_qa_hunter',
        name: 'Headless QA Hunter',
        role: 'Phase 2 QA (gpt-4o-mini): Kiểm thử tự động 3 luồng [Playwright Browser]',
        zone_id: 'zone_approval',
        color: '#f97316',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_vision_critic',
        name: 'Vision Critic',
        role: 'Phase 2 Critic (gpt-4o / claude-3.7): Chấm điểm [ImageReader] Score >= 8.0?',
        zone_id: 'zone_approval',
        color: '#eab308',
        avatar_sprite: nextGfAvatar(),
      },
      {
        id: 'agent_devops_deployer',
        name: 'DevOps Deployer',
        role: 'Phase 3 Deploy (gpt-4o-mini): [Vercel/SSH + QR Code Lớp Học]',
        zone_id: 'zone_approval',
        color: '#10b981',
        avatar_sprite: nextGfAvatar(),
      },
    ],
    edges: [
      {
        from: 'agent_pedagogy',
        to: 'agent_creative',
        label: 'Pedagogy Spec',
      },
      {
        from: 'agent_creative',
        to: 'agent_art_audio',
        label: '3 Game Mechanics',
      },
      {
        from: 'agent_art_audio',
        to: 'agent_level_designer',
        label: 'MasterBlueprint (3 GDDs)',
      },
      {
        from: 'agent_level_designer',
        to: 'agent_dev_arcade',
        label: 'Stream 1: Arcade GDD',
      },
      {
        from: 'agent_level_designer',
        to: 'agent_dev_sim',
        label: 'Stream 2: Sim GDD',
      },
      {
        from: 'agent_level_designer',
        to: 'agent_dev_puzzle',
        label: 'Stream 3: Puzzle GDD',
      },
      {
        from: 'agent_dev_arcade',
        to: 'agent_qa_hunter',
        label: 'Arcade HTML5 Build',
      },
      {
        from: 'agent_dev_sim',
        to: 'agent_qa_hunter',
        label: 'Sim HTML5 Build',
      },
      {
        from: 'agent_dev_puzzle',
        to: 'agent_qa_hunter',
        label: 'Puzzle HTML5 Build',
      },
      {
        from: 'agent_qa_hunter',
        to: 'agent_vision_critic',
        label: 'Playwright Captures',
      },
      {
        from: 'agent_vision_critic',
        to: 'agent_dev_sim',
        label: 'NO (<8.0): Loop Fix UI',
      },
      {
        from: 'agent_vision_critic',
        to: 'agent_portal_packager',
        label: 'PASS >= 8.0 (3 Games)',
      },
      {
        from: 'agent_portal_packager',
        to: 'agent_devops_deployer',
        label: 'Portal + QR Package',
      },
    ],
  };
}

function slugifyAgentId(raw: string): string {
  const base = raw
    .split('(')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base.startsWith('agent_') ? base : `agent_${base || 'unit'}`;
}

function buildProductHunterTopology(_markdownText: string): Stage1SemanticTopology {
  const used: string[] = [];
  const nextAvatar = (): string => {
    const id = pickRandomAgentAvatarId({ excludeIds: used });
    used.push(id);
    return id;
  };

  return {
    project_name: 'Product Hunter — Săn Sản Phẩm 3 Sàn (11 Agents)',
    zones: [
      {
        id: 'zone_work',
        name: 'Săn Hàng Đa Sàn & Phân Tích Dữ Liệu',
        type: 'WORK',
        props: ['WHITEBOARD', 'BOOKSHELF', 'PLANT'],
      },
      {
        id: 'zone_approval',
        name: 'Kiểm Toán Số Liệu, HITL & Báo Cáo',
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
    agents: [
      {
        id: 'agent_telegram_liaison',
        name: 'Liên lạc Telegram',
        role: 'Nhận yêu cầu sản phẩm từ group Telegram của Chủ tịch',
        zone_id: 'zone_work',
        color: '#22c55e',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_market_strategist',
        name: 'Market Strategist',
        role: 'Pha 0: Mở rộng từ khóa & quét tín hiệu Serper VN [HITL Gate #1]',
        zone_id: 'zone_work',
        color: '#38bdf8',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_shopee_hunter',
        name: 'Shopee Hunter [Sàn Cam]',
        role: 'Pha 1: Quét Sàn Cam qua AddLiveTag Market & Batch API',
        zone_id: 'zone_work',
        color: '#f97316',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_lazada_hunter',
        name: 'Lazada Hunter [Sàn Xanh]',
        role: 'Pha 1: Quét Sàn Xanh (LazMall & khuyến mãi) qua Apify Actor',
        zone_id: 'zone_work',
        color: '#2563eb',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_tiktok_hunter',
        name: 'TikTok Shop Hunter [Sàn Đen]',
        role: 'Pha 1: Quét TikTok Shop VN (GMV video/live & KOC) qua Apify',
        zone_id: 'zone_work',
        color: '#ec4899',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_pricing_analyst',
        name: 'Pricing & Margin Analyst',
        role: 'Pha 2: Phân tầng giá 3 phân khúc & tìm vùng giá ngọt',
        zone_id: 'zone_work',
        color: '#f59e0b',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_voc_miner',
        name: 'VOC & Pain-Point Miner',
        role: 'Pha 2: Đào nỗi đau đánh giá 1–3★ & hook chuyển đổi',
        zone_id: 'zone_work',
        color: '#10b981',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_office_camera',
        name: 'Camera văn phòng',
        role: 'Cứ 10 giây chụp toàn cảnh văn phòng gửi Chủ tịch',
        zone_id: 'zone_work',
        color: '#f43f5e',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_market_auditor',
        name: 'Market Auditor [HITL]',
        role: 'Pha 3: Kiểm toán chéo & trình Giám đốc chốt ngách + giá vốn [Gate #2]',
        zone_id: 'zone_approval',
        color: '#a855f7',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_report_architect',
        name: 'Executive Report Architect',
        role: 'Pha 4: Tính lãi ròng thực tế & đóng gói Dashboard HTML + ZIP',
        zone_id: 'zone_approval',
        color: '#22d3ee',
        avatar_sprite: nextAvatar(),
      },
      {
        id: 'agent_chairman_courier',
        name: 'Thư ký Chủ tịch',
        role: 'Deploy GitHub Pages và gửi link báo cáo cho Chủ tịch',
        zone_id: 'zone_approval',
        color: '#eab308',
        avatar_sprite: nextAvatar(),
      },
    ],
    edges: [
      { from: 'agent_telegram_liaison', to: 'agent_market_strategist', label: 'Yêu cầu từ Telegram' },
      { from: 'agent_telegram_liaison', to: 'agent_office_camera', label: 'Mở camera văn phòng' },
      { from: 'agent_market_strategist', to: 'agent_shopee_hunter', label: 'Keyword Matrix (Cam)' },
      { from: 'agent_market_strategist', to: 'agent_lazada_hunter', label: 'Keyword Matrix (Xanh)' },
      { from: 'agent_market_strategist', to: 'agent_tiktok_hunter', label: 'Keyword Matrix (Đen)' },
      { from: 'agent_shopee_hunter', to: 'agent_pricing_analyst', label: 'Shopee SKUs' },
      { from: 'agent_lazada_hunter', to: 'agent_pricing_analyst', label: 'Lazada SKUs' },
      { from: 'agent_tiktok_hunter', to: 'agent_voc_miner', label: 'TikTok KOC & Reviews' },
      { from: 'agent_pricing_analyst', to: 'agent_market_auditor', label: '3 Price Tiers' },
      { from: 'agent_voc_miner', to: 'agent_market_auditor', label: 'Pain Points & USPs' },
      { from: 'agent_market_auditor', to: 'agent_report_architect', label: 'HITL Approved Focus' },
      { from: 'agent_report_architect', to: 'agent_chairman_courier', label: 'Gửi link Chủ tịch' },
    ],
  };
}

function normalizeStage1Topology(
  raw: Stage1SemanticTopology,
): Stage1SemanticTopology {
  const zones = Array.isArray(raw.zones) && raw.zones.length > 0 ? raw.zones : [];
  if (!zones.some((z) => z.type === 'WORK')) {
    zones.unshift({
      id: 'zone_work',
      name: 'Khu Phát Triển',
      type: 'WORK',
      props: ['WHITEBOARD', 'BOOKSHELF'],
    });
  }
  if (!zones.some((z) => z.type === 'IDLE')) {
    zones.push({
      id: 'zone_pantry',
      name: 'Pantry & Thư Giãn',
      type: 'IDLE',
      props: ['COFFEE_MACHINE', 'SOFA', 'AQUARIUM'],
    });
  }

  const workZoneId = zones.find((z) => z.type === 'WORK')!.id;
  const validZoneIds = new Set(zones.map((z) => z.id));

  const agents = (raw.agents || []).map((a, idx) => ({
    id: a.id || `agent_${idx + 1}`,
    name: a.name || `Agent ${idx + 1}`,
    role: a.role || 'Specialist Agent',
    zone_id: validZoneIds.has(a.zone_id) ? a.zone_id : workZoneId,
    color: /^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : '#38bdf8',
    avatar_sprite:
      a.avatar_sprite && VALID_AVATAR_IDS.has(a.avatar_sprite)
        ? a.avatar_sprite
        : pickRandomAgentAvatarId(),
  }));

  const agentIds = new Set(agents.map((a) => a.id));
  const edges = (raw.edges || []).filter(
    (e) => agentIds.has(e.from) && agentIds.has(e.to) && e.from !== e.to,
  );

  if (edges.length === 0 && agents.length > 1) {
    for (let i = 0; i < agents.length - 1; i++) {
      edges.push({
        from: agents[i].id,
        to: agents[i + 1].id,
        label: 'Task Handoff',
      });
    }
  }

  return {
    project_name: raw.project_name || 'AI Multi-Agent Office',
    zones,
    agents,
    edges,
  };
}
