import type { AgentEvent } from '@/types/events';

export interface MockScenarioDefinition {
  id: string;
  name: string;
  description: string;
  steps: {
    delayMs: number;
    event: Omit<AgentEvent, 'event_id' | 'timestamp'>;
  }[];
}

export const MOCK_SCENARIOS: MockScenarioDefinition[] = [
  {
    id: 'game_factory_crewai',
    name: 'Multi-Agent Game Factory — Dạy Phân Số Lớp 4 (CrewAI Flows)',
    description:
      'Mô phỏng 3 Phase: Phase 1 Tuần tự (3 GDDs) → Phase 2 Rẽ nhánh song song 3 luồng (Arcade/Sim/Puzzle) + Vòng lặp QA/Vision Critic (Score >= 8.0) → Phase 3 Đóng gói Portal & QR Code.',
    steps: [
      // PHASE 1: PRE-PRODUCTION CREW (Sequential)
      {
        delayMs: 250,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_pedagogy',
          metadata: {
            status_text: '[Phase 1] Phân tích yêu cầu: "Dạy phân số lớp 4 - Cắt bánh"...',
            input_payload: {
              user_prompt: 'Dạy phân số lớp 4 - Cắt bánh',
              model: 'claude-3-7-sonnet',
              target_grade: 4,
              learning_objectives: [
                'Nhận biết phân số 1/2, 1/3, 1/4, 3/4 qua thao tác cắt bánh trực quan',
                'So sánh hai phân số cùng mẫu số và quy đồng trực quan',
              ],
            },
            tokens_used: 480,
            duration_ms: 1300,
          },
        },
      },
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_pedagogy',
          metadata: {
            status_text: 'Tra cứu chuẩn chương trình Toán Lớp 4 & Tâm lý lứa tuổi...',
            icon: 'search',
            input_payload: {
              tool: 'curriculum_knowledge_base',
              topic: 'Phân số lớp 4 - Thực hành chia phần bằng nhau',
            },
            output_payload: {
              pedagogy_rubric: 'Chia đều bánh Pizza/Bánh kem thành N phần bằng nhau',
              difficulty_tiers: ['Cơ bản (1/2, 1/4)', 'Tương đương (2/4 = 1/2)', 'Cộng phân số'],
            },
            tokens_used: 620,
            duration_ms: 1300,
          },
        },
      },
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_pedagogy',
          target_agent_id: 'agent_creative',
          metadata: {
            status_text: 'Chuyển Pedagogy Spec sang Creative Director (o3-mini)...',
            icon: 'message',
            output_payload: { handoff: 'PedagogyFramework_v1.json' },
            tokens_used: 210,
          },
        },
      },
      {
        delayMs: 500,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_pedagogy',
          metadata: {
            status_text: 'Hoàn tất khung sư phạm Phân số lớp 4 ✓',
            icon: 'check',
            tokens_used: 90,
          },
        },
      },
      {
        delayMs: 300,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_creative',
          metadata: {
            status_text: '[Phase 1] (o3-mini) Thiết kế 3 hướng Gameplay: Arcade, Sim, Puzzle...',
            input_payload: {
              model: 'o3-mini',
              streams: ['STREAM 1: ARCADE / PHYSICS', 'STREAM 2: SIMULATION / SIM', 'STREAM 3: PUZZLE / LOGIC'],
            },
            tokens_used: 740,
          },
        },
      },
      {
        delayMs: 1400,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_creative',
          target_agent_id: 'agent_art_audio',
          metadata: {
            status_text: 'Chuyển 3 Game Concepts sang Art & Audio Director...',
            icon: 'message',
            output_payload: {
              stream_1: 'Ninja Cắt Bánh Phân Số (Arcade Physics)',
              stream_2: 'Tiệm Bánh Phân Số Vui Nhộn (Bakery Simulation)',
              stream_3: 'Ghép Khuôn Bánh Bí Ẩn (Fraction Logic Puzzle)',
            },
            tokens_used: 310,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_creative',
          metadata: {
            status_text: 'Đã chốt 3 cơ chế Gameplay ✓',
            icon: 'check',
            tokens_used: 85,
          },
        },
      },
      {
        delayMs: 300,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_art_audio',
          metadata: {
            status_text: '[Phase 1] Tổng hợp MasterBlueprint (3 GDDs) & Bảng màu/Âm thanh...',
            input_payload: { model: 'claude-3-7-sonnet', deliverables: 'MasterBlueprint (3 GDDs)' },
            tokens_used: 890,
          },
        },
      },
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_art_audio',
          metadata: {
            status_text: 'Xuất MasterBlueprint (3 GDDs: Arcade, Sim, Puzzle)...',
            icon: 'code',
            output_payload: {
              master_blueprint: 'READY',
              gdd_count: 3,
              svg_cake_assets: ['pizza_8_slices', 'cream_cake_6_slices', 'pie_4_slices'],
            },
            tokens_used: 950,
          },
        },
      },
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_art_audio',
          target_agent_id: 'agent_level_designer',
          metadata: {
            status_text: 'Bàn giao MasterBlueprint (3 GDDs) sang Phase 2 Level Designer...',
            icon: 'message',
            tokens_used: 260,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_art_audio',
          metadata: {
            status_text: 'Output: MasterBlueprint (3 GDDs) hoàn tất ✓',
            icon: 'check',
            tokens_used: 110,
          },
        },
      },

      // PHASE 2: asyncio.gather — Rẽ nhánh song song 3 luồng độc lập
      {
        delayMs: 300,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_level_designer',
          metadata: {
            status_text: '[Phase 2] Thiết kế màn chơi cho cả 3 luồng (asyncio.gather)...',
            input_payload: {
              parallel_streams: 3,
              levels_per_game: 5,
              progression: '1/2 -> 1/4 -> 3/4 -> 2/6 -> 5/8',
            },
            tokens_used: 820,
          },
        },
      },
      // Fan-out 3 parallel handoffs (asyncio.gather)
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_level_designer',
          target_agent_id: 'agent_dev_arcade',
          metadata: {
            status_text: '[asyncio.gather #1] Phân phối Level Spec -> Stream 1 (Arcade)...',
            icon: 'message',
            tokens_used: 190,
          },
        },
      },
      {
        delayMs: 150,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_level_designer',
          target_agent_id: 'agent_dev_sim',
          metadata: {
            status_text: '[asyncio.gather #2] Phân phối Level Spec -> Stream 2 (Simulation)...',
            icon: 'message',
            tokens_used: 190,
          },
        },
      },
      {
        delayMs: 150,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_level_designer',
          target_agent_id: 'agent_dev_puzzle',
          metadata: {
            status_text: '[asyncio.gather #3] Phân phối Level Spec -> Stream 3 (Puzzle)...',
            icon: 'message',
            tokens_used: 190,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_level_designer',
          metadata: {
            status_text: 'Đã phát nhánh song song 3 luồng Level Specs ✓',
            icon: 'check',
            tokens_used: 95,
          },
        },
      },

      // 3 Parallel Game Devs working simultaneously
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_dev_arcade',
          metadata: {
            status_text: '[Stream 1: Arcade] [FileWriter/Patcher] Code game Cắt Bánh Vật Lý...',
            icon: 'code',
            input_payload: { stream: 'ARCADE / PHYSICS', tool: 'FileWriter/Patcher' },
            tokens_used: 1420,
          },
        },
      },
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_dev_sim',
          metadata: {
            status_text: '[Stream 2: Sim] [FileWriter/Patcher] Code game Tiệm Bánh Phân Số...',
            icon: 'code',
            input_payload: { stream: 'SIMULATION / SIM', tool: 'FileWriter/Patcher' },
            tokens_used: 1510,
          },
        },
      },
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_dev_puzzle',
          metadata: {
            status_text: '[Stream 3: Puzzle] [FileWriter/Patcher] Code game Ghép Bánh Logic...',
            icon: 'code',
            input_payload: { stream: 'PUZZLE / LOGIC', tool: 'FileWriter/Patcher' },
            tokens_used: 1380,
          },
        },
      },

      // All 3 Streams hand off builds to Headless QA Hunter
      {
        delayMs: 1350,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_dev_arcade',
          target_agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: 'Gửi bản build Stream 1 (Arcade) sang Headless QA Hunter...',
            icon: 'message',
            tokens_used: 220,
          },
        },
      },
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_dev_sim',
          target_agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: 'Gửi bản build Stream 2 (Sim) sang Headless QA Hunter...',
            icon: 'message',
            tokens_used: 220,
          },
        },
      },
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_dev_puzzle',
          target_agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: 'Gửi bản build Stream 3 (Puzzle) sang Headless QA Hunter...',
            icon: 'message',
            tokens_used: 220,
          },
        },
      },
      {
        delayMs: 500,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_dev_arcade',
          metadata: {
            status_text: 'Stream 1 (Arcade) Build v1 hoàn tất ✓',
            icon: 'check',
            tokens_used: 110,
          },
        },
      },
      {
        delayMs: 200,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_dev_puzzle',
          metadata: {
            status_text: 'Stream 3 (Puzzle) Build v1 hoàn tất ✓',
            icon: 'check',
            tokens_used: 110,
          },
        },
      },

      // Headless QA Hunter runs Playwright Browser
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: '[Playwright Browser] Chạy Headless टेस्ट 3 game & chụp ảnh màn hình...',
            icon: 'search',
            input_payload: {
              model: 'gpt-4o-mini',
              tool: 'Playwright Browser',
              assertions: ['Canvas renders', 'Slice interaction works', 'Zero console errors'],
            },
            output_payload: {
              arcade_status: 'DOM_OK',
              sim_status: 'DOM_OK (Minor label overlap on 1/4 slice)',
              puzzle_status: 'DOM_OK',
            },
            tokens_used: 780,
          },
        },
      },
      {
        delayMs: 1350,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_qa_hunter',
          target_agent_id: 'agent_vision_critic',
          metadata: {
            status_text: 'Chuyển ảnh chụp Playwright 3 luồng sang Vision Critic...',
            icon: 'message',
            tokens_used: 240,
          },
        },
      },

      // Vision Critic evaluates [Score >= 8.0?] -> Triggers 1 Feedback Loop on Stream 2 (Sim)
      {
        delayMs: 600,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_vision_critic',
          metadata: {
            status_text: '[ImageReader] Chấm điểm: Arcade=8.8 (PASS), Puzzle=9.1 (PASS), Sim=6.8 (<8.0 NO)...',
            icon: 'db',
            input_payload: {
              model: 'gpt-4o / claude-3.7',
              tool: 'ImageReader',
              threshold: 8.0,
            },
            output_payload: {
              stream_1_arcade: { score: 8.8, verdict: 'PASS' },
              stream_2_sim: {
                score: 6.8,
                verdict: 'NO (<5 vòng - Loop #1)',
                issue: 'Nhãn phân số 3/4 bị lệch khỏi lát bánh khi kéo thả',
              },
              stream_3_puzzle: { score: 9.1, verdict: 'PASS' },
            },
            tokens_used: 960,
          },
        },
      },
      {
        delayMs: 1350,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_vision_critic',
          target_agent_id: 'agent_dev_sim',
          metadata: {
            status_text: '[Score 6.8 < 8.0] Trả về Stream 2 (Sim) sửa lỗi hiển thị lát bánh (Vòng 1/5)...',
            icon: 'error',
            tokens_used: 210,
          },
        },
      },
      {
        delayMs: 700,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_dev_sim',
          metadata: {
            status_text: '[Vòng lặp #1] [FileWriter/Patcher] Vá lỗi căn giữa nhãn phân số 3/4...',
            icon: 'code',
            output_payload: { patched_file: 'sim_bakery_canvas.js', loop_iteration: 1 },
            tokens_used: 690,
          },
        },
      },
      {
        delayMs: 1300,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_dev_sim',
          target_agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: 'Gửi lại bản vá Stream 2 (Sim v1.1) sang Headless QA Hunter...',
            icon: 'message',
            tokens_used: 180,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_dev_sim',
          metadata: {
            status_text: 'Đã hoàn tất bản vá Stream 2 (Sim v1.1) ✓',
            icon: 'check',
            tokens_used: 95,
          },
        },
      },
      {
        delayMs: 500,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_qa_hunter',
          target_agent_id: 'agent_vision_critic',
          metadata: {
            status_text: 'Playwright xác nhận bản vá Sim v1.1 -> gửi Vision Critic chấm lại...',
            icon: 'message',
            tokens_used: 195,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_qa_hunter',
          metadata: {
            status_text: 'Tất cả 3 luồng đã qua kiểm thử Playwright ✓',
            icon: 'check',
            tokens_used: 110,
          },
        },
      },

      // Vision Critic approves all 3 games (PASS >= 8.0) and converges to Phase 3
      {
        delayMs: 600,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_vision_critic',
          target_agent_id: 'agent_portal_packager',
          metadata: {
            status_text: '[Hội tụ PASS 3/3 >= 8.0] Chuyển 3 game đạt chuẩn sang Portal UI Packager...',
            icon: 'message',
            output_payload: {
              passed_games: ['Arcade (8.8)', 'Sim v1.1 (8.6)', 'Puzzle (9.1)'],
            },
            tokens_used: 310,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_vision_critic',
          metadata: {
            status_text: 'Vision Critic: Cả 3 game đạt chuẩn Score >= 8.0 ✓',
            icon: 'check',
            tokens_used: 130,
          },
        },
      },

      // PHASE 3: POST-PRODUCTION & DEPLOYMENT CREW
      {
        delayMs: 300,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_portal_packager',
          metadata: {
            status_text: '[Phase 3] Gom 3 game vào Portal [iframe + Fullscreen/Mute]...',
            icon: 'code',
            input_payload: {
              model: 'claude-3-7-sonnet',
              features: ['3-Tab Game Switcher', 'Fullscreen Toggle', 'Audio Mute'],
            },
            tokens_used: 870,
          },
        },
      },
      {
        delayMs: 1350,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_portal_packager',
          target_agent_id: 'agent_devops_deployer',
          metadata: {
            status_text: 'Chuyển gói Portal Bundle sang DevOps Deployer...',
            icon: 'message',
            tokens_used: 230,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_portal_packager',
          metadata: {
            status_text: 'Đóng gói Web Portal 3-in-1 hoàn tất ✓',
            icon: 'check',
            tokens_used: 105,
          },
        },
      },
      {
        delayMs: 500,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_devops_deployer',
          metadata: {
            status_text: '[Vercel/SSH + QR Code Gen] Đang deploy & tạo mã QR Lớp học...',
            icon: 'code',
            input_payload: {
              model: 'gpt-4o-mini',
              target: 'Vercel Production Edge',
            },
            output_payload: {
              webapp_url: 'https://phan-so-lop-4-game-factory.vercel.app',
              classroom_qr: 'QR_GENERATED_SVG_256x256',
            },
            tokens_used: 520,
          },
        },
      },
      {
        delayMs: 1350,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_devops_deployer',
          metadata: {
            status_text: 'OUTPUT: Link Web App + Mã QR Lớp Học sẵn sàng! 🎉',
            icon: 'check',
            output_payload: {
              status: 'DEPLOYED_SUCCESSFULLY',
              url: 'https://phan-so-lop-4-game-factory.vercel.app',
              qr_code_ready: true,
              games_included: 3,
            },
            tokens_used: 190,
          },
        },
      },
    ],
  },
  {
    id: 'research_crew_full',
    name: 'Quy trình Viết Báo Cáo Nghiên Cứu (4 Agents)',
    description:
      'Kịch bản chuẩn kiểm thử toàn bộ vòng đời: IDLE → MOVING → WORKING → TOOL_CALL → HANDOFF (Bézier) → COMPLETE → IDLE (Pantry 8s).',
    steps: [
      {
        delayMs: 300,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: 'Khởi tạo kế hoạch thu thập dữ liệu AI 2026...',
            input_payload: {
              topic: 'Multi-Agent Systems & Visual Observability 2026',
              frameworks: ['LangGraph', 'CrewAI', 'AutoGen', 'Swarm'],
              depth: 'comprehensive',
            },
            tokens_used: 320,
            duration_ms: 1400,
          },
        },
      },
      {
        delayMs: 1600,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: 'Đang truy vấn ArXiv & GitHub Trending...',
            icon: 'search',
            input_payload: {
              tool: 'web_search',
              query: 'Multi-Agent orchestration benchmarks 2026',
              max_results: 15,
            },
            output_payload: {
              sources_found: 14,
              top_repos: ['langchain-ai/langgraph', 'crewAIInc/crewAI', 'microsoft/autogen'],
            },
            tokens_used: 540,
            duration_ms: 1850,
          },
        },
      },
      {
        delayMs: 1800,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_researcher',
          target_agent_id: 'agent_analyst',
          metadata: {
            status_text: 'Chuyển giao Raw Market Data cho Bob...',
            icon: 'message',
            input_payload: { handoff_to: 'agent_analyst', records: 14 },
            output_payload: { status: 'DELIVERED' },
            tokens_used: 180,
            duration_ms: 900,
          },
        },
      },
      {
        delayMs: 700,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_analyst',
          metadata: {
            status_text: 'Phân tích số liệu & đối chiếu benchmark...',
            input_payload: { dataset_id: 'ds_2026_agents', rows: 1400 },
            tokens_used: 410,
            duration_ms: 1500,
          },
        },
      },
      {
        delayMs: 500,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: 'Hoàn tất thu thập dữ liệu!',
            icon: 'check',
            output_payload: { total_sources_verified: 14 },
            tokens_used: 95,
          },
        },
      },
      {
        delayMs: 1500,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_analyst',
          metadata: {
            status_text: 'Truy vấn Vector DB & chạy Python thống kê...',
            icon: 'db',
            input_payload: {
              sql: 'SELECT framework, avg_latency_ms, token_efficiency FROM benchmarks_2026;',
            },
            output_payload: {
              rows_returned: 4,
              p95_latency_ms: 420,
            },
            tokens_used: 680,
            duration_ms: 1700,
          },
        },
      },
      {
        delayMs: 1700,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_analyst',
          target_agent_id: 'agent_writer',
          metadata: {
            status_text: 'Gửi Verified Insights sang Clara...',
            icon: 'message',
            output_payload: { insights_count: 6, charts_ready: true },
            tokens_used: 210,
          },
        },
      },
      {
        delayMs: 600,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_analyst',
          metadata: {
            status_text: 'Hoàn tất phân tích định lượng ✓',
            icon: 'check',
            tokens_used: 110,
          },
        },
      },
      {
        delayMs: 400,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_writer',
          metadata: {
            status_text: 'Đang biên soạn báo cáo tổng hợp Markdown...',
            input_payload: { outline: ['Executive Summary', 'Architecture', 'Benchmarks'] },
            tokens_used: 790,
            duration_ms: 1600,
          },
        },
      },
      {
        delayMs: 1600,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_writer',
          metadata: {
            status_text: 'Render biểu đồ & định dạng tài liệu...',
            icon: 'code',
            input_payload: { generator: 'markdown_compiler_v2' },
            output_payload: { pages: 8, word_count: 3450 },
            tokens_used: 920,
            duration_ms: 1600,
          },
        },
      },
      {
        delayMs: 1600,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_writer',
          target_agent_id: 'agent_reviewer',
          metadata: {
            status_text: 'Trình bản thảo sang Phòng Kiểm Duyệt (Viktor)...',
            icon: 'message',
            output_payload: { draft_version: 'v1.0-rc1' },
            tokens_used: 260,
          },
        },
      },
      {
        delayMs: 700,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_reviewer',
          metadata: {
            status_text: 'Đang kiểm duyệt độ chính xác & trích dẫn...',
            input_payload: { draft_version: 'v1.0-rc1', checklist_items: 12 },
            tokens_used: 510,
            duration_ms: 1500,
          },
        },
      },
      {
        delayMs: 1200,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_writer',
          metadata: {
            status_text: 'Đã gửi bản thảo chờ duyệt ✓',
            icon: 'check',
            tokens_used: 80,
          },
        },
      },
      {
        delayMs: 1400,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_reviewer',
          metadata: {
            status_text: 'Báo cáo đạt chuẩn xuất bản 100% ✓',
            icon: 'check',
            output_payload: {
              approval_status: 'APPROVED',
              quality_score: '98/100',
              note: 'Sau 8 giây không có sự kiện mới, các Agent sẽ tự động đi pha cà phê & trò chuyện tại Pantry!',
            },
            tokens_used: 290,
          },
        },
      },
    ],
  },
  {
    id: 'burst_queue_stress',
    name: 'Kiểm Thử Hàng Đợi Tốc Độ Cao (5 Events / 0.5s + Payload > 10KB)',
    description:
      'Bắn 5 sự kiện liên tiếp trong 0.5s kèm payload 14KB để kiểm chứng Per-Agent Queue Throttling (1200ms) và cắt gọn 10KB.',
    steps: [
      {
        delayMs: 80,
        event: {
          event_type: 'AGENT_START',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: '[Burst #1] Khởi động truy vấn song song...',
            tokens_used: 210,
          },
        },
      },
      {
        delayMs: 90,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: '[Burst #2] Quét dữ liệu lớn (>10KB Payload)...',
            icon: 'search',
            input_payload: {
              query: 'Large corpus stress test',
              raw_document_dump: 'PIXEL_AGENT_OFFICE_STRESS_DATA_'.repeat(420), // ~13.4 KB
            },
            output_payload: {
              chunks_indexed: 128,
              raw_embeddings_preview: '0.0142,-0.0831,0.9214,'.repeat(520), // ~11.4 KB
            },
            tokens_used: 1840,
          },
        },
      },
      {
        delayMs: 90,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: '[Burst #3] Thực thi code tổng hợp...',
            icon: 'code',
            tokens_used: 640,
          },
        },
      },
      {
        delayMs: 90,
        event: {
          event_type: 'AGENT_HANDOFF',
          agent_id: 'agent_researcher',
          target_agent_id: 'agent_analyst',
          metadata: {
            status_text: '[Burst #4] Bắn gói tin sang Bob...',
            icon: 'message',
            tokens_used: 150,
          },
        },
      },
      {
        delayMs: 90,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: 'agent_researcher',
          metadata: {
            status_text: '[Burst #5] Hoàn tất chuỗi 5 sự kiện!',
            icon: 'check',
            tokens_used: 90,
          },
        },
      },
    ],
  },
];
