# CrewAI ↔ Pixel Agent Office Bridge (`crewAI/`)

Thư mục này chứa **Multi-Agent Game Factory (CrewAI Flows)** cùng bộ SDK chuẩn hóa **`pixel_office_sdk`** giúp kết nối hai chiều (Bidirectional WebSocket) giữa bất kỳ hệ thống **CrewAI (Python)** nào với giao diện **Pixel Agent Office (Vue 3 + PixiJS v8)**.

---

## 1. Cấu Trúc Thư Mục

```text
crewAI/
├── pixel_office_sdk/              # SDK chuẩn hóa kết nối CrewAI <-> Pixel Agent Office
│   ├── __init__.py
│   ├── contracts.py               # Sinh tự động OfficeBlueprint.json (>= 1 tile) & chuẩn hóa AgentEvent
│   └── bridge.py                  # WebSocket Server (ws://localhost:8765) nhận lệnh & bắn sự kiện thời gian thực
├── flows/
│   ├── __init__.py
│   ├── game_factory_flow.py       # Luồng 3 Phase: Multi-Agent Game Factory (11 Agents, asyncio.gather 3 Streams)
│   └── custom_crew_template.py    # Mẫu chuẩn để nạp thêm bất kỳ CrewAI mới nào vào kiểm thử
├── output/                        # Thư mục xuất kết quả thực tế (HTML5 Games, Portal, QR Code, Blueprint)
│   ├── OfficeBlueprint.json
│   ├── master_blueprint_3_gdds.json
│   ├── stream1_arcade.html        # Game 1: Siêu Đầu Bếp Cắt Bánh Phân Số (Arcade/Physics)
│   ├── stream2_sim.html           # Game 2: Tiệm Bánh Phân Số Lớp 4 (Simulation v1.1)
│   ├── stream3_puzzle.html        # Game 3: Khuôn Bánh Phân Số Bằng Nhau (Puzzle/Logic)
│   ├── portal.html                # Web Portal 3-in-1 gom iframe + Fullscreen
│   ├── classroom_qr.svg           # Mã QR Lớp Học (SVG)
│   └── flow_result.json           # Bản ghi tổng hợp kết quả trả về Frontend
├── server.py                      # Máy chủ Live Bridge (WS port 8765 + Portal HTTP port 8766)
└── run_cli_demo.py                # Script chạy thử nhanh toàn bộ Flow trên CLI
```

---

## 2. Cách Khởi Chạy & Giao Việc Trực Tiếp Trên Frontend

### Bước 1: Chạy CrewAI Bridge Server
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" crewAI/server.py
```
- **WebSocket Bridge**: `ws://localhost:8765`
- **Game Portal HTTP Server**: `http://localhost:8766/portal.html`

### Bước 2: Giao Việc & Nhận Kết Quả Ngay Trên Pixel Agent Office (`http://localhost:5173/`)
1. Bấm nút **"🚀 Giao Việc CrewAI"** màu xanh trên thanh Top HUD Bar.
2. Nhập chủ đề (ví dụ: `"Dạy phân số lớp 4 - Cắt bánh"`) và bấm **"Giao Việc & Xem Văn Phòng Chạy Live"**.
3. Quan sát 11 Agents trên bản đồ 2D thực thi trực tiếp Phase 1 (Tuần tự) → Phase 2 (`asyncio.gather` 3 luồng song song + vòng lặp `Playwright` & `Vision Critic Score >= 8.0`) → Phase 3 (Đóng gói Portal & QR Code).
4. Khi hoàn tất, cửa sổ **CrewAI Mission Control** tự động bật lên để bạn **chơi thử trực tiếp cả 3 Game HTML5**, quét **Mã QR Lớp Học**, và xem **MasterBlueprint (3 GDDs)**.

---

## 3. Tài Liệu Chuẩn Hóa Tích Hợp Crew Mới
Xem chi tiết giao thức chuẩn hóa tại: [docs/CREWAI_PIXEL_OFFICE_INTEGRATION.md](../docs/CREWAI_PIXEL_OFFICE_INTEGRATION.md).
