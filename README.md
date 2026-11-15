# 🏢 Pixel Agent Office — Multi-Agent AI Visualizer & Live CrewAI Command Center

**Pixel Agent Office** là hệ thống trực quan hóa và điều phối đa tác nhân (**Multi-Agent AI Systems**) trên không gian văn phòng 2D Pixel Art tương tác **60 FPS** (xây dựng bằng **Vue 3 + PixiJS v8 + EasyStar.js + Python CrewAI SDK + SQLite**).

Thay vì theo dõi log chữ đơn điệu trong terminal, bạn quan sát toàn bộ đội ngũ AI Agent làm việc tại bàn, bắn gói tin chuyển giao công việc (`AGENT_HANDOFF`), họp với Giám đốc, nghỉ ngơi đá **PS5 PES** hoặc dạo chơi trong **Khu Sinh Thái**, đồng thời kích hoạt các Crew AI thực thụ (kèm **OpenAI Codex CLI**) và lưu lại toàn bộ lịch sử phiên chạy vào SQLite.

---

## ✨ Tính năng nổi bật

- **🎨 Văn phòng 2D Pixel Art 60 FPS & Đồ thị DAG (`God-View`)**: Render mượt mà bằng PixiJS v8 + thuật toán tìm đường A* (`easystarjs`); nhấn `Tab` để bật lớp phủ luồng công việc phát sáng (God-View) và quỹ đạo gói tin Bézier.
- **🎭 Kho 56 Pixel Avatar & Tùy biến Nhân vật Live**: 56 mẫu nhân vật đa phong cách (Con người, Động vật như Gà trống/Capybara/Corgi/Cá mập, Robot CRT/Mecha, Anime/Hero, Đồ vật hài hước như Ly Trà Sữa/Chuối/Xương rồng). Đổi tên, đổi màu, random và chọn avatar ngay trong `AgentInspectorDrawer` mà **không làm reset vị trí** trên canvas, lưu thẳng xuống SQLite.
- **👑 Phòng Giám Đốc & Giao việc Trực quan**: NPC Giám đốc (`DirectorEntity`) tự do dạo quanh văn phòng kiểm tra nhân viên/chơi tiện ích; khi bạn gửi prompt từ thanh điều khiển, nhân viên đầu tiên sẽ bước sang nhận yêu cầu qua bong bóng thoại trước khi bắt đầu luồng xử lý.
- **☕ Văn phòng Sống động (Living Office) & 105 Kịch bản Drama**: Nhân viên rảnh việc tự tản ra chơi cùng nhau (2–3 người) tại **PS5 PES**, bàn Bi-a, Bóng bàn, Quầy Bar, Hồ Cá Koi, Đại Khu Sinh Thái..., đối thoại theo **105 kịch bản banter** thuộc 4 chủ đề, rồi quay lại bàn làm việc (chơi LoL, hát, ngáp ngủ).
- **💬 Bong bóng Chat Drama kiểu Messenger**: Nút bong bóng chat góc dưới-phải hiển thị toàn bộ lời thoại & nhật ký văn phòng với bộ lọc (`Tất cả`, `Drama`, `Sếp`, `Việc`), giúp đọc hội thoại dài dễ dàng không bị che bởi nhân vật.
- **🛋️ Map Editor & Kho 51 Nội thất Tương tác**: Kéo-thả tự do, xoay hướng chuẩn theo footprint (`WxH`), phóng to/thu nhỏ tỉ lệ `0.75x – 3x`, thêm thú cưng & robot chạy nhảy quanh văn phòng (`OFFICE_CAT`, `CORGI_DOG`, `ROBOT_VACUUM`, `MINI_DRONE`...) và lưu bố cục vào SQLite.
- **🧩 Trình biên dịch Markdown-to-Office (2 Giai đoạn)**: Tự động chuyển mô tả Markdown/ASCII hoặc prompt tự nhiên thành bản đồ `OfficeBlueprint` hoàn chỉnh không chồng chéo và 100% đi lại được (`deterministicLayoutEngine.ts`), hỗ trợ **Google Gemini**, **OpenAI API** và **Offline Parser**.
- **🚀 Kết nối CrewAI Flows & OpenAI Codex CLI Live**: Tích hợp sẵn cầu nối WebSocket (`ws://localhost:8765`) + HTTP Portal (`http://localhost:8766`) cho các Crew thực chiến (**Game Factory 11 Agents**, **Thiết Kế Bài Giảng Điện Tử E-Learning 9 Agents**, hoặc Crew tùy biến).
- **🗄️ Lưu trữ SQLite Bền vững (`data/pixel_office.sqlite`)**: Lưu cả danh sách Workflow/Blueprint tùy biến và **Lịch sử Phiên chạy (`crew_runs`, `crew_run_events`)** gồm prompt, token, điểm QA, lỗi, portal URL và file `.ZIP`.

---

## 🛠️ Công nghệ sử dụng

| Tầng hệ thống | Công nghệ |
| :--- | :--- |
| **Frontend & UI HUD** | Vue 3 (`<script setup>`), TypeScript 5.7, Pinia, Tailwind CSS, Lucide Icons |
| **Game Engine & Pathfinding** | PixiJS v8 (`pixi.js`), EasyStar.js (`easystarjs`) A* grid pathfinding |
| **Database & Local API** | Vite Dev Server Middleware + Node.js built-in `node:sqlite` (`WAL` mode) |
| **Browser Asset Storage** | IndexedDB (`pixel_office_assets_db`) & `localStorage` |
| **AI Topology Compiler** | `@google/genai`, OpenAI Chat Completions JSON API, Deterministic Fallback Parser |
| **Multi-Agent Backend** | Python 3, `websockets`, `pixel_office_sdk`, OpenAI **Codex CLI** (`codex exec`) |
| **Kiểm thử** | Vitest (`vitest run`), `vue-tsc` |

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu môi trường
- **Node.js `>= 22.14.0`** (bắt buộc để sử dụng module `node:sqlite` tích hợp sẵn của Node.js)
- **Python `>= 3.10`** + gói `websockets` (nếu chạy CrewAI Backend live bridge)
- *(Tùy chọn)* **OpenAI Codex CLI** (`codex` trong `PATH`, `~/.codex/packages/`, hoặc biến môi trường `CODEX_BIN`)

### 1. Cài đặt dependencies & Chạy Frontend + SQLite API
```powershell
npm install
npm run dev
```
Truy cập ứng dụng tại: **http://localhost:5173**

### 2. Chạy Backend CrewAI Live WebSocket Bridge & Portal Server *(Tùy chọn cho Live Flow)*
Cài `websockets` nếu chưa có:
```powershell
python -m pip install websockets
```
Khởi động server cầu nối:
```powershell
python crewAI/server.py
```
- **WebSocket Bridge**: `ws://localhost:8765`
- **Portal & Output Artifact HTTP Server**: `http://localhost:8766/`

Hoặc chạy thử riêng E-Learning Crew (9 Agents) từ CLI:
```powershell
python crewAI/run_elearning_crew.py "Các vùng kinh tế biển Việt Nam"
```

### 3. Build & Kiểm thử (Verification)
```powershell
# Kiểm tra kiểu TypeScript
npm run typecheck

# Typecheck + Build production bundle
npm run build

# Chạy toàn bộ unit tests (9 test suites / 24 tests)
npm test
```

---

## 📂 Cấu trúc Thư mục

```text
├── docs/                                # Tài liệu kỹ thuật chuẩn hóa của dự án
│   ├── README.md                        # Mục lục tài liệu
│   ├── ARCHITECTURE.md                  # Kiến trúc hệ thống, 60 FPS Engine & SQLite API
│   ├── FEATURES_AND_USER_GUIDE.md       # Hướng dẫn chi tiết tính năng, Editor, Avatars & phím tắt
│   ├── CREWAI_AND_CODEX_GUIDE.md        # Hướng dẫn CrewAI Flows, Codex CLI & tùy biến Crew
│   └── CREWAI_PIXEL_OFFICE_INTEGRATION.md # Đặc tả chuẩn WebSocket Protocol v1.0.0
├── server/
│   └── sqliteRunHistoryPlugin.ts        # Vite plugin API /api/runs & /api/runs/event (node:sqlite)
├── src/
│   ├── components/                      # Vue HUD, Canvas wrapper, MapEditor, Inspector, Modals
│   ├── data/                            # 56 Pixel Avatars, 105 Banter Scripts, Default Blueprint
│   ├── engine/                          # PixiJS OfficeRenderer, Agent/Director/Furniture Entities, A*
│   ├── services/                        # Stage 1-2 Compiler, Transport (WS/Mock/PostMessage), Storage
│   ├── stores/                          # Pinia stores (Blueprint, Workflow, RunHistory, Telemetry...)
│   └── types/                           # TypeScript contracts (blueprint, assets, events, fsm, runHistory)
├── crewAI/
│   ├── pixel_office_sdk/                # Python SDK (PixelOfficeBridge & Blueprint/Event Contracts)
│   ├── flows/                           # Game Factory (11 Agents), E-Learning (9 Agents), Template
│   ├── codex_cli_llm.py                 # Adapter gọi OpenAI Codex CLI (`codex exec`) kèm parse token
│   ├── server.py                        # Máy chủ Live WS :8765 + Artifact HTTP :8766
│   └── output/                          # Kết quả sinh ra (HTML5 Games, Slide/Quiz Portal, .ZIP)
├── specs/001-pixel-agent-office/        # Spec, Plan, JSON Schemas & Checklists gốc
├── tests/unit/                          # Unit tests bằng Vitest (layout, A*, avatars, banter, runs)
├── data/                                # Thư mục chứa pixel_office.sqlite (tự sinh khi chạy dev)
└── vite.config.ts                       # Cấu hình Vite + SQLite /api/workflows middleware
```

---

## 📚 Tài liệu chi tiết trong `docs/`

1. **[docs/README.md](docs/README.md)** — Mục lục tổng hợp tài liệu dự án.
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Kiến trúc tổng thể Frontend, PixiJS v8 Engine, Compiler 2 pha và SQLite Schema/API.
3. **[docs/FEATURES_AND_USER_GUIDE.md](docs/FEATURES_AND_USER_GUIDE.md)** — Hướng dẫn sử dụng đầy đủ giao diện, Map Editor, 56 Avatars, Living Office, Messenger Drama & Lịch sử chạy.
4. **[docs/CREWAI_AND_CODEX_GUIDE.md](docs/CREWAI_AND_CODEX_GUIDE.md)** — Kiến trúc Python CrewAI Bridge, các Crew dựng sẵn & tích hợp OpenAI Codex CLI.
5. **[docs/CREWAI_PIXEL_OFFICE_INTEGRATION.md](docs/CREWAI_PIXEL_OFFICE_INTEGRATION.md)** — Đặc tả giao thức WebSocket hai chiều v1.0.0 (`BLUEPRINT_SYNC`, `DISPATCH_TASK`, `AgentEvent`).
