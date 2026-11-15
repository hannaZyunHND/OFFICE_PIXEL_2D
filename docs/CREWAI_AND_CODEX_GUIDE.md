# 🤖 CrewAI Flows & OpenAI Codex CLI Backend Guide

Tài liệu này hướng dẫn cấu trúc backend Python trong `crewAI/`, cơ chế kết hợp **OpenAI Codex CLI** để sinh nội dung thực tế từ LLM, và cách mở rộng Crew mới.

---

## 1. Cấu Trúc Thư Mục `crewAI/`

```text
crewAI/
├── server.py                        # Máy chủ trung tâm: WebSocket :8765 + Portal HTTP :8766
├── codex_cli_llm.py                 # Adapter gọi OpenAI Codex CLI (`codex exec`) kèm parse tokens
├── pixel_office_sdk/
│   ├── __init__.py
│   ├── bridge.py                    # PixelOfficeBridge: WebSocket server & event dispatcher
│   └── contracts.py                 # ZoneSpec, AgentSpec, EdgeSpec, build_office_blueprint
├── flows/
│   ├── game_factory_flow.py         # Multi-Agent Game Factory (11 Agents) -> 3 HTML5 Games + Portal + QR
│   ├── elearning_lesson_flow.py     # Thiết Kế Bài Giảng Điện Tử (9 Agents) -> Portal + ZIP 6 thư mục
│   ├── elearning_codex_agents.py    # Các hàm prompt LLM Codex CLI chuyên trách cho 9 Agents E-Learning
│   └── custom_crew_template.py      # Mẫu tham khảo viết Crew mới
├── run_elearning_crew.py            # CLI runner độc lập cho E-Learning Crew (9 Agents)
├── run_cli_demo.py                  # CLI runner thử nghiệm nhanh Game Factory
├── office.md                        # Đặc tả kiến trúc E-Learning CrewAI (9 Agents)
└── output/                          # Thư mục xuất kết quả thực thi (.html, .md, .zip, .svg)
```

---

## 2. Cơ Chế Định Tuyến Trong `crewAI/server.py`

Khi chạy `python crewAI/server.py`, server khởi tạo đồng thời:
1. **Artifact HTTP Server (`http://localhost:8766/`)**: Phục vụ file tĩnh trong `crewAI/output/` (cho phép CORS `*`, tắt cache) để Frontend mở trực tiếp website kết quả trong iframe và tải file `.ZIP`.
2. **WebSocket Bridge (`ws://localhost:8765`)**: Lắng nghe lệnh `DISPATCH_TASK` từ Frontend và định tuyến dựa trên `endpoint_url`, `workflow_id`, `workflow_name` và danh sách `agent.id` của Blueprint:

| Điều kiện nhận diện | Flow thực thi | Đầu ra chính tại `crewAI/output/` |
| :--- | :--- | :--- |
| Chứa `elearning`, `bài giảng` hoặc agent `agent_gamma_slide_engineer` | `run_elearning_lesson_flow(...)` (**9 Agents**) | Thư mục theo chủ đề (6 module Markdown siêu prompt: Nghiên cứu & Ma trận, 10 Slide Gamma, 25 Câu hỏi, Infographics, 20 Footages Google Flow, Kịch bản dạy thử 45p + QA), Portal HTML và file `.ZIP` |
| Chứa `game_factory`, `game-factory` hoặc agent `agent_dev_arcade` | `run_game_factory_flow(...)` (**11 Agents**) | `master_blueprint_3_gdds.json`, `stream1_arcade.html`, `stream2_sim.html`, `stream3_puzzle.html`, `portal.html`, `classroom_qr.svg` |
| Mọi Crew tùy biến khác lưu trong SQLite | `run_dynamic_blueprint_flow(...)` | Tuần tự hóa các Agent & cạnh `edges` trực tiếp từ `options["blueprint"]`, phát đầy đủ sự kiện `AGENT_START` → `TOOL_CALL` → `HANDOFF` → `COMPLETE` |

---

## 3. Tích Hợp OpenAI Codex CLI (`codex_cli_llm.py`)

Thay vì phụ thuộc cứng vào API key tĩnh, `crewAI/codex_cli_llm.py` gọi trực tiếp công cụ **OpenAI Codex CLI** đã đăng nhập trên máy:

### Tìm binary tự động (`find_codex_executable()`)
1. Ưu tiên biến môi trường **`CODEX_BIN`** nếu được thiết lập.
2. Tìm `codex` / `codex.exe` trong hệ thống `PATH`.
3. Tự động quét thư mục gói cài đặt Codex cục bộ tại **`~/.codex/packages/*/releases/*/bin/`** (chọn bản mới nhất theo thời gian chỉnh sửa).

### Cách thực thi an toàn (`run_codex_exec()`)
- Gọi lệnh non-interactive ở chế độ chỉ đọc an toàn:
  ```text
  codex exec --skip-git-repo-check --ephemeral -s read-only -o <temp_output> -
  ```
- Truyền prompt UTF-8 qua `stdin`.
- Tự động tách từ log CLI tên **model** thực tế (ví dụ `gpt-6-luna (codex-cli)`), **`session_id`** và số **`tokens used`** thật để gửi lên HUD Telemetry và lưu vào bảng `crew_runs` trong SQLite.
- `run_codex_json()` tự động bóc tách JSON block kể cả khi model bọc trong ```` ```json ... ``` ````.
- **Cơ chế Fallback an toàn**: Nếu máy chưa cài Codex CLI hoặc hết quota / timeout, cả **Game Factory** và **E-Learning Crew** đều tự động chuyển sang bộ biên dịch template chất lượng cao tích hợp sẵn mà không bị treo luồng.

---

## 4. Các Sản Phẩm Sinh Ra Của E-Learning Crew (9 Agents)

Khi chạy chủ đề bài giảng (có thể kèm file đính kèm trên giao diện), **9 Agents** lần lượt phối hợp tạo thành gói hoàn chỉnh gồm 6 thư mục con + Portal + `.ZIP`:

1. `01_NghienCuu_Va_KichBan_SuPham/` — `01_ho_so_nghien_cuu_hoc_lieu.md`, `02_ma_tran_kich_ban_su_pham.md`
2. `02_Prompt_Slide_Gamma_10Slides/` — `prompt_gamma_10_slides.md` (Siêu prompt 10 Slide chuẩn Gamma.app)
3. `03_Prompt_Phieu_Bai_Tap_25Cau/` — `prompt_phieu_bai_tap_25_cau.md` (25 câu trắc nghiệm, Đúng/Sai, tự luận)
4. `04_Prompt_Infographics/` — `prompt_thiet_ke_infographics.md`
5. `05_Prompt_Video_Intro_GoogleFlow_20Footages/` — `prompt_video_intro_20_footages_google_flow.md` (Nhân vật, giọng đọc, 20 cảnh Google Flow + transcript)
6. `06_KichBan_ChayThu_Va_BaoCao_QA/` — `01_kich_ban_chay_thu_45_phut.md`, `02_bien_ban_qa_va_phe_duyet.md`
7. **Website Portal** (`index.html`) + **File nén `.ZIP`** phục vụ tải trực tiếp trên `http://localhost:8766/`.

---

## 5. Tài Liệu Giao Thức WebSocket Chi Tiết

Để tự xây dựng một Crew mới từ đầu hoặc tích hợp hệ thống Agent Python riêng, xem tiếp đặc tả giao thức tại **[CREWAI_PIXEL_OFFICE_INTEGRATION.md](./CREWAI_PIXEL_OFFICE_INTEGRATION.md)**.
