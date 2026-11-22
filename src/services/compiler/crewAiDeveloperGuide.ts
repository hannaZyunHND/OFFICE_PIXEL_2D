/**
 * Technical Integration Guide & Master Prompt Specification for External CrewAI Developers.
 * Defines the standardized Input Contract (Department Creation + Mandatory Endpoint URL)
 * and Output Contract (Real-time Event Stream) so any external CrewAI / Multi-Agent project
 * can integrate with Pixel Agent Office like an API.
 */

export const CREWAI_INPUT_SPEC_TEXT = `# 1. CHUẨN INPUT: KHỞI TẠO PHÒNG BAN MỚI & ĐĂNG KÝ URL KẾT NỐI CREWAI

Để Pixel Agent Office biết **nhận luồng sự kiện từ hệ thống CrewAI nào** và tự động dựng mô hình phòng ban 2D tương ứng trong SQLite, nội dung đưa vào **Ô Chat Yêu Cầu Tạo Phòng Ban** bắt buộc phải bao gồm **URL Kết Nối (Endpoint URL)** cùng **Danh sách Vai trò Nhân sự (Agents)**:

## 1.1. Cấu trúc Chuẩn Input (Bắt buộc có URL kết nối)
\`\`\`text
URL kết nối: ws://<host>:<port>/<ten-crew>
[Tên Phòng Ban / Hệ Thống CrewAI]: [Vai trò Agent 1], [Vai trò Agent 2], [Vai trò Agent 3], ..., [Vai trò Agent Kiểm duyệt / QA], [Vai trò Giám đốc Phê duyệt]
\`\`\`

### Ví dụ Chuẩn 1 (Đội Kiểm Toán Tài Chính chạy tại cổng 8768):
\`\`\`text
URL kết nối: ws://localhost:8768/audit-crew
Đội Kiểm Toán & Phân Tích Tài Chính (6 Agents): Chuyên viên Thu thập Báo cáo, Chuyên viên Phân tích Định lượng, Chuyên viên Định giá Tài sản, Chuyên viên Dự báo Rủi ro, Kiểm toán viên Độc lập QA, Giám đốc Phê duyệt
\`\`\`

### Ví dụ Chuẩn 2 (Đội Vận Hành E-Commerce chạy tại cổng 8769):
\`\`\`text
URL kết nối: ws://localhost:8769/ecom-crew
Phòng Vận Hành E-Commerce Tự Động (5 Agents): Tư vấn sản phẩm, Kiểm tra kho vận, Xử lý cổng thanh toán, Kiểm duyệt chống gian lận QA, Quản lý phê duyệt đơn
\`\`\`

---

## 1.2. Cơ chế Định tuyến Endpoint & Tự động Phân vùng Không gian
1. **Định tuyến CrewAI Endpoint tự động**:
   - Mỗi quy trình lưu trong **SQLite** đều gắn chặt với \`crew_endpoint_url\` riêng của nó (ví dụ: \`ws://localhost:8768/audit-crew\`).
   - Khi người dùng chuyển đổi giữa các quy trình phòng ban trên thanh công cụ, Pixel Agent Office sẽ **tự động chuyển kết nối WebSocket sang đúng URL của Crew đó**.
2. **Quy tắc phân vùng phòng ban tự động (Auto-Zone Mapping)**:
   - Các Agent có tên/vai trò chứa từ khóa: *"QA", "Critic", "Review", "Audit", "Kiểm toán", "Kiểm duyệt", "Phê duyệt", "Giám sát", "Bảo mật", "Giám đốc", "Deploy"* → Tự động xếp bàn vào **PHÒNG KIỂM DUYỆT & QA [APPROVAL]**.
   - Các Agent thực thi còn lại → Tự động xếp bàn vào **KHU THỰC THI & SẢN XUẤT [WORK]**.
   - Khu vực **PANTRY & LOUNGE [IDLE]** được tự động khởi tạo để nhân vật đi nghỉ ngơi khi rảnh.`;

export const CREWAI_OUTPUT_SPEC_TEXT = `# 2. CHUẨN OUTPUT: GIAO THỨC SỰ KIỆN THỜI GIAN THỰC (REAL-TIME EVENT STREAM API)

Khi hệ thống CrewAI của Developer chạy ở Backend, nó sẽ mở WebSocket (hoặc đẩy sự kiện vào Endpoint URL đã khai báo ở bước Input, ví dụ \`ws://localhost:8768/audit-crew\`) theo chuẩn JSON \`AgentEvent\` dưới đây.

## 2.1. Cấu trúc Gói tin JSON Chuẩn (\`AgentEvent\`)
\`\`\`json
{
  "event_id": "evt_1710001234_01",
  "timestamp": 1710001234567,
  "event_type": "AGENT_START | AGENT_TOOL_CALL | AGENT_HANDOFF | AGENT_COMPLETE | AGENT_ERROR",
  "agent_id": "<MÃ_AGENT_ID_TRONG_TÀI_LIỆU_PHÒNG_BAN>",
  "target_agent_id": "<MÃ_AGENT_NHẬN_BÀN_GIAO_NẾU_LÀ_AGENT_HANDOFF>",
  "metadata": {
    "status_text": "Mô tả ngắn hành động đang thực hiện (hiển thị trên bong bóng thoại 2D)",
    "icon": "search | code | db | file | message | check",
    "input_payload": { "task": "Dữ liệu đầu vào của Agent/Tool (hiển thị trong Inspector Drawer)" },
    "output_payload": { "result": "Kết quả đầu ra của Agent/Tool" },
    "tokens_used": 450,
    "duration_ms": 1400
  }
}
\`\`\`

## 2.2. Bảng 5 Loại Sự kiện (\`event_type\`) Điều khiển Máy Trạng Thái (FSM)
| \`event_type\` | Hành vi trực quan trên Văn phòng 2D (Pixel Agent Office) | Trường bắt buộc |
| :--- | :--- | :--- |
| **\`AGENT_START\`** | Nhân vật rời khu vực nghỉ, tìm đường A* về đúng bàn làm việc của mình và chuyển sang trạng thái \`WORKING\`. | \`agent_id\`, \`metadata.status_text\` |
| **\`AGENT_TOOL_CALL\`** | Nhân vật gõ phím tại bàn, bật bong bóng công cụ (\`search\`, \`code\`, \`db\`, \`file\`) kèm \`input_payload\` / \`output_payload\`. | \`agent_id\`, \`metadata.icon\`, \`metadata.status_text\` |
| **\`AGENT_HANDOFF\`** | Bắn tia sáng dữ liệu (Handoff Packet) dọc theo đường cong DAG từ bàn của \`agent_id\` sang bàn của \`target_agent_id\`. | \`agent_id\`, \`target_agent_id\`, \`metadata.status_text\` |
| **\`AGENT_COMPLETE\`** | Nhân vật hoàn thành nhiệm vụ, bật hiệu ứng dấu tích xanh (\`check\`) và ghi nhận tổng Token tiêu thụ. | \`agent_id\`, \`metadata.status_text\` |
| **\`AGENT_ERROR\`** | Nhân vật nhấp nháy cảnh báo đỏ (\`ERROR\`), hiển thị chi tiết lỗi trong ngăn kéo Inspector để gỡ lỗi ngay lập tức. | \`agent_id\`, \`metadata.status_text\` |`;

export const CREWAI_MASTER_PROMPT_FOR_DEVS = `Bạn là Kiến trúc sư Hệ thống Multi-Agent (CrewAI). Tôi đang sử dụng hệ thống hiển thị trực quan 2D "PIXEL AGENT OFFICE" (chạy tại http://localhost:34213).

Hãy thiết kế và viết code hoàn chỉnh cho một hệ thống CrewAI giải quyết bài toán sau:
👉 [NHẬP YÊU CẦU NGHIỆP VỤ CỦA BẠN TẠI ĐÂY - VD: Hệ thống Phân tích & Đầu tư Chứng khoán / Hệ thống Sáng tạo Nội dung Marketing / Hệ thống Kiểm thử Phần mềm Tự động...]

BẮT BUỘC TUÂN THỦ 3 ĐẦU RA KỸ THUẬT SAU ĐỂ KẾT NỐI VỚI PIXEL AGENT OFFICE:

### ĐẦU RA 1: Chuỗi Input Khởi Tạo Phòng Ban + URL Kết Nối (Để dán vào Ô Chat Yêu Cầu trên Pixel Agent Office)
Hãy xuất ra một đoạn văn bản theo đúng định dạng 2 dòng sau để tôi dán trực tiếp vào Ô Chat Tạo Phòng Ban trên Pixel Agent Office (bắt buộc phải có dòng \`URL kết nối:\` để Office biết nhận sự kiện từ Crew nào):
\`\`\`text
URL kết nối: ws://localhost:<CHỌN_PORT_RIÊNG_VD_8768>/<ten-slug-crew>
[Tên Hệ Thống CrewAI (<Số lượng> Agents)]: [Tên Vai Trò Agent 1], [Tên Vai Trò Agent 2], ..., [Tên Vai Trò Agent Kiểm Duyệt QA], [Tên Vai Trò Giám Đốc Phê Duyệt]
\`\`\`
Quy tắc ánh xạ mã \`agent_id\` tự động của hệ thống đối với từng Agent thứ \`i\` (bắt đầu từ 1):
- \`agent_id = "agent_<ten_vai_tro_khong_dau_snake_case_toi_da_22_ky_tu>_<i>"\`
- Ví dụ: Vai trò 1 là \`"Thu thập báo cáo"\` -> \`agent_id = "agent_thu_thap_bao_cao_1"\`.

### ĐẦU RA 2: Module Kết Nối WebSocket (\`office_connector.py\`)
Khởi tạo WebSocket Server hoặc Publisher tại đúng địa chỉ \`URL kết nối\` ở Đầu ra 1 để phát gói tin JSON chuẩn \`AgentEvent\`:
\`\`\`json
{
  "event_id": "evt_<uuid>",
  "timestamp": 1710000000000,
  "event_type": "AGENT_START | AGENT_TOOL_CALL | AGENT_HANDOFF | AGENT_COMPLETE | AGENT_ERROR",
  "agent_id": "<agent_id_chinh_xac>",
  "target_agent_id": "<agent_id_tiep_theo_neu_la_AGENT_HANDOFF>",
  "metadata": {
    "status_text": "<Mô tả hành động ngắn gọn>",
    "icon": "search | code | db | file | message | check",
    "input_payload": {},
    "output_payload": {},
    "tokens_used": 350,
    "duration_ms": 1200
  }
}
\`\`\`

### ĐẦU RA 3: Code Thực Thi CrewAI (\`main_crew.py\`)
Khi mỗi Agent trong CrewAI bắt đầu task, gọi tool, chuyển giao kết quả cho Agent kế tiếp, và hoàn tất task, hãy bắn lần lượt các sự kiện:
1. \`AGENT_START\` khi Agent bắt đầu nhận việc.
2. \`AGENT_TOOL_CALL\` khi Agent gọi công cụ tìm kiếm/phân tích/viết code (\`icon="search"\` hoặc \`"code"\`, \`"db"\`).
3. \`AGENT_HANDOFF\` (kèm \`target_agent_id\` của Agent nhận việc tiếp theo) khi chuyển giao dữ liệu.
4. \`AGENT_COMPLETE\` khi Agent hoàn thành nhiệm vụ.`;

export const STANDALONE_PYTHON_CONNECTOR_CODE = `"""
pixel_office_connector.py — Module độc lập giúp mọi dự án CrewAI bên ngoài
mở cổng WebSocket riêng (hoặc đẩy sự kiện vào Hub) để kết nối với Pixel Agent Office.
Cài đặt duy nhất: pip install websockets
"""
import asyncio
import json
import time
import uuid
import websockets

# Đặt đúng URL kết nối mà bạn đã khai báo trong Prompt tạo phòng ban
CREW_ENDPOINT_URL = "ws://localhost:8768/audit-crew"

async def emit_office_event(
    event_type: str,
    agent_id: str,
    status_text: str,
    target_agent_id: str | None = None,
    icon: str = "code",
    input_payload: dict | None = None,
    output_payload: dict | None = None,
    tokens_used: int = 320,
    duration_ms: int = 1200,
    ws_url: str = CREW_ENDPOINT_URL,
) -> None:
    payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "timestamp": int(time.time() * 1000),
        "event_type": event_type,
        "agent_id": agent_id,
        "metadata": {
            "status_text": status_text,
            "icon": icon,
            "input_payload": input_payload or {},
            "output_payload": output_payload or {},
            "tokens_used": tokens_used,
            "duration_ms": duration_ms,
        },
    }
    if target_agent_id:
        payload["target_agent_id"] = target_agent_id

    try:
        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps(payload, ensure_ascii=False))
    except Exception as err:
        print(f"[PixelOfficeConnector] Không thể gửi sự kiện tới {ws_url}: {err}")
`;
