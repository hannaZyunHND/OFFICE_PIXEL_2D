# Implementation Plan: Product Hunter v2 — Hỏi thị trường, nhìn đường đi trên văn phòng

**Branch**: `002-product-hunter-v2` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-product-hunter-v2/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Chủ tịch hỏi một câu thị trường. Điều phối gán đúng một kiểu và đúng các sàn: Sàn Cam luôn có, Sàn Xanh và Sàn Đen chỉ khi câu nhắc tới, không hỏi credit. Văn phòng 2D đổi sang mặt bằng v2 trước bước đi đầu tiên. Sáu bàn câu hỏi đứng thành một hàng, ba bàn sàn đứng hàng dưới. Chỉ một bàn câu hỏi và các bàn sàn được chọn nhận đường giao việc. Bàn còn lại hiện “Đứng yên”.

Cách làm: flow Python mới đọc luật trong `question_route.py`, gọi tool sàn đang có, ghép bài từ số đã đo. Mặt bằng do hàm xếp sẵn trên văn phòng, seed thành workflow thứ hai. `FLOW_STARTED` mang `workflow_id` để canvas gọi `activateWorkflow` trước sự kiện đi bộ. Flow cũ và mặt bằng 15 người giữ nguyên.

Trang đang gửi Chủ tịch là một đoạn chữ cộng một bảng. Lần đo “kem chống nắng” đã chứng minh trang lấy giá, độ tập trung và điểm chỗ trống của nhóm món đứng đầu rồi viết như số của cả thị trường. Lát tiếp theo giữ nguyên phiếu, luật sàn và mặt bằng. Phiếu đo được mở thêm các tầng số sàn đã trả. Một file HTML tĩnh, biểu đồ vẽ bằng SVG trong file, dùng chung cho mọi câu đã đo. Lời trên bản đồ và tin nhắn vẫn ngắn. Không thêm bàn.

## Technical Context

**Language/Version**: TypeScript (Vue 3, Pinia, PixiJS v8) cho mặt bằng; Python 3.13 cho flow, cùng runtime `crewAI/server.py`.

**Primary Dependencies**: Tool sẵn có `addlivetag_market_search`, `addlivetag_product_batch`, `apify_lazada_search`, `apify_tiktok_shop_search`, `serper_ecommerce_search`. Cầu `PixelOfficeBridge` và sự kiện `AgentEvent` đã có trong `specs/001-pixel-agent-office/contracts/realtime-event.schema.json`.

**Storage**: Trang bài trong `crewAI/output/product_hunter_v2/<slug>/index.html`, một file tự chứa, không gọi thư viện ngoài khi mở. Workflow seed trong store văn phòng (SQLite + mirror local), cùng chỗ workflow cũ. Sự kiện bản đồ không mang trang.

**Testing**: pytest trong `crewAI/tests` cho phiếu và flow sandbox. Vitest cho seed, cạnh, và việc miễn trang trí tự động.

**Target Platform**: Trình duyệt trên máy sếp (văn phòng 2D) và process Python cục bộ. Câu vào từ nhóm Telegram hoặc nút chạy trên văn phòng.

**Performance Goals**: Canvas giữ 60 FPS. Phiếu điều phối xong trước mọi cuộc gọi sàn. Mỗi trạng thái làm việc trên bản đồ giữ nhịp tối thiểu 1200 ms của hàng đợi sẵn có.

**Constraints**: Không đưa tọa độ vào mô hình. Không nhét payload quá 10 KB vào bong bóng. Sàn không được chọn không bị gọi. Số trong bài chỉ đến từ phiếu đo. Số toàn cục không lấy từ danh sách món khi khối tổng đã có số. Nhánh URL `product-hunter-v2` phải được nhận trước nhánh `product-hunter`. Không điền điểm đánh giá khi món không có điểm.

**Scale/Scope**: Một câu một lượt. Mười bốn bàn kể cả camera. Mười ngành trong danh mục. Trang Sàn Cam giữ tới trang kết quả sàn trả (lần đối chiếu là 100 món). Lời ngắn vẫn nói top của mẫu khi kiểu câu là top. Chi tiết ngành và lịch sử giá chỉ cho tối đa năm món đứng đầu, hoặc cho món đang đánh giá.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Kết quả | Cách v2 tuân thủ |
| --- | --- | --- |
| I. Văn phòng là client, không buộc một framework | Đạt | Văn phòng chỉ nhận `OfficeBlueprint` và `AgentEvent`. Flow Python là nguồn sự kiện, cùng kiểu flow cũ. |
| II. Vue không theo dõi tọa độ từng khung hình | Đạt | Việc mới là đổi blueprint một lần và phát sự kiện thô. Pixi giữ nội suy và đường đi. |
| III. Vẽ được khi không có ảnh | Đạt | Bàn v2 dùng ghế và sprite thủ tục sẵn. Không thêm loại nội thất mới. |
| IV. Hai tầng: ngữ nghĩa rồi tọa độ | Đạt | Id, vai, cạnh nằm trong topology. `generateProductHunterV2Blueprint` tự xếp ô, có khoảng hở một ô. |
| V. Nhật ký có trần, dữ liệu ở máy người dùng | Đạt | `status_text` ngắn. `QuestionRoute` nhỏ hơn 10 KB. Trang bài là file HTML, kể cả khi bảng dài và có ảnh ngoài. Ảnh là đường dẫn sàn trả, không nhúng vào sự kiện. |

Không có vi phạm cần ghi ở Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-product-hunter-v2/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── question-route.schema.json
│   ├── market-answer.schema.json
│   ├── report-page.md
│   └── office-floor.md
└── tasks.md              # do /speckit-tasks tạo, không tạo ở bước này
```

### Source Code (repository root)

```text
crewAI/
├── question_route.py                 # phiếu: kiểu câu + sàn + tên + thời điểm
├── market_when.py                    # dịp gắn vào tên tìm; tháng chỉ ghi trên phiếu
├── market_catalog.py                 # 10 ngành, mỗi ngành 4 tên
├── market_metrics.py                 # hàm thuần đang nằm trong flow cũ
├── market_answer.py                  # ghép prose từ FloorSample
├── market_report.py                  # trang HTML một file, SVG nội tuyến
├── flows/product_hunter_v2_flow.py   # sự kiện đúng id bàn v2
├── flows/product_hunter_flow.py      # gọi market_metrics, không đổi lối cũ
├── server.py                         # nhận /product-hunter-v2 trước /product-hunter
└── telegram_office.py                # câu Chủ tịch mở workflow v2

src/services/compiler/
├── llmTopologyExtractor.ts           # topology 14 bàn, cạnh như office-floor.md
├── deterministicLayoutEngine.ts      # generateProductHunterV2Blueprint
└── workflowGenerator.ts              # seed product_hunter_v2_crewai

src/stores/useWorkflowStore.ts        # mặc định v2; cấm trang trí đè
src/App.vue                           # FLOW_STARTED → activateWorkflow
crewAI/pixel_office_sdk/bridge.py     # FLOW_STARTED thêm workflow_id

tests/unit/productHunterV2Office.spec.ts
crewAI/tests/test_question_route.py
crewAI/tests/test_product_hunter_v2_flow.py
```

**Structure Decision**: Hai process như hiện nay. Python đo và phát sự kiện. Vue chỉ đổi sơ đồ và vẽ. Không thêm service mới.

## Delivery

Bốn lát. Ba lát đầu đã có trên bản đồ. Lát trang là việc tiếp theo, xem trên file bài chứ không thêm bàn.

1. **P1 — một tên, top, đánh giá, hỏi lại, luật sàn, mặt bằng.** `question_route.py`, flow v2, seed mặt bằng, `FLOW_STARTED.workflow_id`, Telegram trỏ v2. Sàn Cam dùng tool sẵn. Sàn Xanh và Sàn Đen chỉ gọi khi phiếu có sàn đó. Bài là trang ngắn.
2. **P2 — ngành và so sánh.** `market_catalog.py`, Serper khi ngành lạ, bảng bốn tên, hai cột so sánh. Cùng mặt bằng, chỉ đổi bàn được handoff.
3. **P3 — báo cáo đầy đủ.** Cùng trang của lát 4, đủ các sàn phiếu đã chọn, đường đi qua `agent_v2_full_report`. Không gọi `run_product_hunter_flow` và không dựng lại HTML của flow cũ.

4. **Trang báo cáo — Story 10.** Chưa có task. Làm sau khi sếp chốt lát này, rồi mới `/speckit-tasks`. Thứ tự trong lát:

   1. Giữ phiếu, luật sàn, mặt bằng, lời ngắn.
   2. `market_metrics.py` tách ba tầng trên Sàn Cam: khối tổng, nhịp 30 ngày của nhóm có lịch sử, danh sách món. Giữ `topShops`, quà bị loại, và lời nguồn. Mỗi món giữ ảnh, hai đường dẫn, điểm thật, hoa hồng, biên giá, độ dao động giá, bán 7 ngày, bán 30 ngày, bán tích lũy, doanh thu 30 ngày, doanh thu tích lũy, số ngày theo dõi, hệ số tăng trưởng nguyên bản. Bỏ mức điểm giả 4,7.
   3. Sàn Cam xin đủ trang kết quả sàn đang trả, không cắt còn 30 dòng trước khi dựng trang. Sự kiện bản đồ vẫn chỉ một câu trạng thái.
   4. `market_report.py` dựng một file cho mọi câu đã đo. Biểu đồ là SVG trong file. Khung mục nằm ở `contracts/report-page.md`.
   5. Nhóm nhỏ tối đa năm món, hoặc món của câu đánh giá, mới gọi batch để lấy ngành, hoa hồng tách hai phần, và lịch sử giá. Không batch cả danh sách.
   6. Sàn Xanh và Sàn Đen dùng cùng khung với dải “mẫu tìm kiếm”. Ảnh và đường dẫn shop chỉ khi payload có. Doanh thu mẫu ghi là giá nhân lượt bán khi không có doanh thu riêng. Lần lập plan này chưa gọi lại hai sàn đó.

## Constitution Check (sau thiết kế)

Các cổng ở trên vẫn đạt sau khi thêm trang. Hợp đồng mặt bằng không thêm loại sự kiện ngoài `AgentEvent` và không thêm bàn. Tọa độ không nằm trong `question_route` hay payload Telegram. Camera giữ `agent_office_camera`. Trang dài nằm ở file, nên trần 10 KB và 200 sự kiện của bản đồ không bị trang báo cáo kéo theo. Vue không theo dõi ảnh hay biểu đồ của trang đó. Miễn trang trí tự động là để giữ hàng bàn đọc được: hàm xếp vẫn chừa một ô đi được.

## Complexity Tracking

> Không có vi phạm hiến pháp cần biện minh.
