# 📚 Trung Tâm Tài Liệu — Pixel Agent Office

Thư mục `docs/` tổng hợp toàn bộ tài liệu kiến trúc, hướng dẫn sử dụng tính năng và chuẩn tích hợp backend cho dự án **Pixel Agent Office**.

---

## Danh Sách Tài Liệu

| Tài liệu | Nội dung chính | Đối tượng đọc |
| :--- | :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Kiến trúc tổng quan Vue 3 + Pinia + PixiJS v8 (60 FPS), Compiler Markdown 2 giai đoạn, cấu trúc bảng & REST API của SQLite (`workflows`, `crew_runs`, `crew_run_events`). | Kỹ sư Frontend / Full-Stack muốn hiểu hoặc mở rộng lõi hệ thống |
| **[FEATURES_AND_USER_GUIDE.md](./FEATURES_AND_USER_GUIDE.md)** | Hướng dẫn vận hành giao diện: Phòng Giám Đốc, Living Office (105 kịch bản + PS5 PES), bong bóng Messenger Drama, Map Editor (51 vật phẩm, xoay/scale), Kho 56 Avatar + Đổi tên Agent, Lịch sử phiên chạy & phím tắt. | Người dùng cuối, Product Designer, QA |
| **[CREWAI_AND_CODEX_GUIDE.md](./CREWAI_AND_CODEX_GUIDE.md)** | Kiến trúc backend Python `crewAI/server.py`, cơ chế routing giữa **Game Factory (11 Agents)**, **E-Learning Lesson Factory (9 Agents)** và **Dynamic Blueprint Flow**, cách hoạt động của **Codex CLI Adapter** (`codex_cli_llm.py`). | AI Engineer / Developer xây dựng CrewAI Flows |
| **[CREWAI_PIXEL_OFFICE_INTEGRATION.md](./CREWAI_PIXEL_OFFICE_INTEGRATION.md)** | Đặc tả giao thức WebSocket hai chiều v1.0.0 (`ws://localhost:8765`), định dạng gói `BLUEPRINT_SYNC`, `DISPATCH_TASK`, `AgentEvent` và hướng dẫn nạp Crew mới trong 3 bước. | Developer tích hợp SDK bên ngoài |

---

## Tài Liệu Tham Chiếu Bổ Sung Trong Repo

- **Root README**: [../README.md](../README.md) — Tổng quan dự án, cài đặt nhanh & cấu trúc thư mục.
- **Đặc tả thiết kế gốc (`SpecKit`)**: [../specs/001-pixel-agent-office/spec.md](../specs/001-pixel-agent-office/spec.md) và các JSON Schema tại [../specs/001-pixel-agent-office/contracts/](../specs/001-pixel-agent-office/contracts/).
- **CrewAI Runner Docs**: [../crewAI/README.md](../crewAI/README.md).
