# Tasks: Product Hunter v2 — Hỏi thị trường, nhìn đường đi trên văn phòng

**Input**: Design documents from `/specs/002-product-hunter-v2/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Có, vì quickstart.md và plan.md yêu cầu pytest và vitest cho phiếu, flow sandbox, và mặt bằng.

**Organization**: Theo user story trong spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Làm song song được (khác file, không phụ thuộc việc chưa xong)
- **[Story]**: US1…US8

## Phase 1: Setup

**Purpose**: Chỗ đứng của module mới, không thêm dependency.

- [x] T001 Tạo các file rỗng đúng đường dẫn trong `specs/002-product-hunter-v2/plan.md`: `crewAI/question_route.py`, `crewAI/market_catalog.py`, `crewAI/market_metrics.py`, `crewAI/market_answer.py`, `crewAI/flows/product_hunter_v2_flow.py`

## Phase 2: Foundational

**Purpose**: Phiếu, số đo, mặt bằng, và việc đổi bản đồ trước bước đi. Mọi story dùng chung.

- [x] T002 Viết `route_question` trong `crewAI/question_route.py`: đúng một `intent` trong `market_keyword|market_category|top_products|product_eval|compare|full_report|clarify`; `platforms` rỗng khi `clarify`, mọi intent khác chứa `shopee` rồi thêm `lazada`/`tiktok_shop` theo luật sàn; `names` tối đa 4; `clarify` rỗng khi đo và có nội dung khi hỏi lại; `status_text` tối đa 180 ký tự, có kiểu câu và tên sàn
- [x] T003 [P] Viết 10 ngành, mỗi ngành 4 tên, trong `crewAI/market_catalog.py`
- [x] T004 [P] Viết `build_floor_sample` trong `crewAI/market_metrics.py`: dùng `_compute_market_overview_metrics`, `scope=market_block` chỉ khi Sàn Cam live và khối `market`/`last30Days` có tổng, không thì `scope=sample`; `mode=error` thì `items` rỗng và không điền số giả
- [x] T005 Dựng topology 13 bàn và 15 cạnh trong `src/services/compiler/llmTopologyExtractor.ts` theo `specs/002-product-hunter-v2/contracts/office-floor.md`, nhận “Product Hunter v2” trước topology cũ
- [x] T006 Xếp `generateProductHunterV2Blueprint` trong `src/services/compiler/deterministicLayoutEngine.ts`: `layout_profile` đúng `product_hunter_v2_v1`, hàng sáu bàn câu hỏi, hàng ba bàn sàn, một ô đi được trước mỗi ghế
- [x] T007 Seed `product_hunter_v2_crewai` trong `src/services/compiler/workflowGenerator.ts`, endpoint kết thúc bằng `/product-hunter-v2`, giữ seed `product_hunter_crewai`
- [x] T008 Trong `src/stores/useWorkflowStore.ts`: id mặc định `product_hunter_v2_crewai`; workflow v2 lệch profile thì thay bằng seed và thoát trước nhánh trang trí dưới 30 món; mirror local vẫn nhận seed còn thiếu; `activateWorkflow` có `keepEndpoint`
- [x] T009 `FLOW_STARTED` thêm `workflow_id` và `workflow_name` trong `crewAI/pixel_office_sdk/bridge.py`; `src/services/transport/WebSocketClient.ts` và `src/App.vue` gọi `activateWorkflow` rồi `resetCamera` và bật nhìn đường giao việc; ảnh toàn cảnh chạy cho cả hai workflow
- [x] T010 Nhận `/product-hunter-v2` trước `/product-hunter` trong `crewAI/server.py`

**Checkpoint**: Mặt bằng v2 mở được và câu v2 không rơi vào flow cũ.

## Phase 3: User Story 1 - Hỏi thị trường một tên (Priority: P1)

**Goal**: Câu một tên, chỉ Sàn Cam, bài có quy mô, giá, độ tập trung, chỗ còn trống, cụm tìm kèm. Bản đồ chỉ sáng một bàn câu hỏi và Sàn Cam.

**Independent Test**: “Thị trường kem chống nắng đang thế nào?” không gọi Apify, có handoff tới `agent_v2_market_keyword` và `agent_v2_san_cam`.

- [x] T011 [US1] Ghép bài và trang trong `crewAI/market_answer.py`: số chỉ lấy từ `FloorSample` hoặc `related_searches`; ghi `scope` và mẫu mô phỏng khi `mode=sandbox`
- [x] T012 [US1] Chạy lượt đo trong `crewAI/flows/product_hunter_v2_flow.py`: sự kiện đúng thứ tự hợp đồng, Serper trên bàn câu hỏi, tool sàn theo `contracts/office-floor.md`, năm bàn kia và sàn không chọn chỉ “Đứng yên”
- [x] T013 [US1] Trỏ nhóm Chủ tịch sang workflow v2 trong `crewAI/telegram_office.py` và sửa lời chào cho câu thị trường

## Phase 4: User Story 2 - Luật sàn (Priority: P1)

**Goal**: Sàn Cam luôn đo. Sàn Xanh và Sàn Đen cộng thêm khi câu nhắc. Không hỏi credit.

**Independent Test**: “Top khăn giấy trên Sàn Xanh” gọi Lazada, không gọi TikTok, vẫn gọi Sàn Cam, `hitlPolicy` mặc định không dừng.

- [x] T014 [US2] Khóa luật sàn trong `crewAI/question_route.py` cho Lazada, TikTok, “cả ba sàn”, “3 sàn”, “đủ ba sàn”, và câu “chỉ xem Sàn Đen” vẫn giữ `shopee` khi có tên hàng

## Phase 5: User Story 3 - Top sản phẩm (Priority: P1)

**Goal**: Tối đa 10 món mỗi sàn, xếp theo doanh thu, có câu “top của mẫu”.

**Independent Test**: Câu có “top” ra `top_products` và trang có bảng tối đa 10 dòng.

- [x] T015 [US3] Mẫu câu top trong `crewAI/market_answer.py`, xếp `gmv_vnd` giảm dần, cắt 10

## Phase 6: User Story 4 - Đánh giá một sản phẩm (Priority: P1)

**Goal**: Đặt một món cạnh mặt bằng. Có hoa hồng thì ghi. Không kết luận lời bình. Thiếu tên thì hỏi lại.

**Independent Test**: “Đánh giá kem chống nắng Anessa” là `product_eval`. “Đánh giá” trơ là `clarify`.

- [x] T016 [US4] Chọn món trong mẫu và gọi `addlivetag_product_batch` khi có mã, trong `crewAI/flows/product_hunter_v2_flow.py` và `crewAI/market_answer.py`

## Phase 7: User Story 5 - Hỏi lại (Priority: P1)

**Goal**: Câu không tên không ngành nhận một câu hỏi lại, không tool sàn, không trang số.

**Independent Test**: “Thị trường đang thế nào?” có `clarify`, không có `addlivetag_market_search`.

- [x] T017 [US5] Nhánh dừng trong `crewAI/flows/product_hunter_v2_flow.py`: mọi bàn sàn đứng yên, gửi đúng một câu hỏi lại

## Phase 8: User Story 6 - Ngành hàng (Priority: P2)

**Goal**: Khoảng bốn tên trong ngành, cùng bộ số, chỉ các sàn đã chọn.

**Independent Test**: “Ngành nhà cửa, món nào đang bán?” ra bốn tên và chỉ Sàn Cam.

- [x] T018 [US6] Nối danh mục và Serper khi ngành lạ trong `crewAI/flows/product_hunter_v2_flow.py`; bảng so trong `crewAI/market_answer.py`

## Phase 9: User Story 7 - So sánh (Priority: P2)

**Goal**: Hai cột cùng bộ số. Một tên thì hỏi tên thứ hai.

**Independent Test**: “So quạt mini với quạt điều hòa trên TikTok Shop” ra hai tên, Sàn Cam và Sàn Đen.

- [x] T019 [US7] Đo từng tên rồi viết hai cột trong `crewAI/market_answer.py`

## Phase 10: User Story 8 - Báo cáo đầy đủ (Priority: P3)

**Goal**: Trang dài chỉ gồm sàn đã chọn. Sự kiện vẫn của bàn v2, không có `agent_shopee_hunter`.

**Independent Test**: “Làm báo cáo đầy đủ cho khăn giấy” ra trang dài và handoff tới `agent_v2_full_report`.

- [x] T020 [US8] Trang dài theo sàn đã chọn trong `crewAI/market_answer.py`, phát sự kiện bằng id v2 trong `crewAI/flows/product_hunter_v2_flow.py`

## Phase 11: Polish

**Purpose**: Khớp quickstart.

- [x] T021 [P] Viết `crewAI/tests/test_question_route.py` và `crewAI/tests/test_product_hunter_v2_flow.py` theo `specs/002-product-hunter-v2/quickstart.md`
- [x] T022 [P] Viết `tests/unit/productHunterV2Office.spec.ts`: 13 id, 15 cạnh, profile, seed cũ còn, không bị ECO_BIOME khi profile lệch, id mặc định là v2
- [x] T023 Chạy pytest hai file mới và vitest `productHunterV2Office.spec.ts`

## Phase 12: User Story 9 - Tháng và dịp (Priority: P1)

**Goal**: Tháng và dịp nằm trên phiếu. Dịp gắn vào tên tìm khi tên chưa có chữ đó. Tháng không gắn vào tên tìm và không bịa số của cả tháng. Câu chỉ có dịp thì đo vài tên của dịp. Câu chỉ có tháng thì hỏi lại.

**Independent Test**: “Thị trường kem chống nắng trong tháng 11” gửi query `kem chống nắng` và bài có “không phải số riêng”. “Thị trường hộp quà dịp Tết” gửi query `hộp quà Tết`. “Thị trường dịp Noel” ra vài tên. “Đánh giá dịp Tết” là `clarify`.

- [x] T024 [US9] Đọc `when` trong `crewAI/market_when.py` và gắn vào phiếu ở `crewAI/question_route.py`: `kind` `occasion` hoặc `month` hoặc rỗng; `11.11` không thành tháng 11; `status_text` nêu thời điểm
- [x] T025 [US9] `search_query` trong lượt đo `crewAI/flows/product_hunter_v2_flow.py`; câu cửa sổ đứng đầu bài trong `crewAI/market_answer.py`
- [x] T026 [US9] Bổ sung kỳ vọng tháng/dịp trong `crewAI/tests/test_question_route.py` và `crewAI/tests/test_product_hunter_v2_flow.py`

## Phase 13: User Story 10 - Trang báo cáo không trộn tầng số (Priority: P1)

**Goal**: Mọi câu đã đo mở một trang cùng khung. Thẻ tổng của Sàn Cam lấy từ khối tổng. Danh sách món, ảnh, đường dẫn và biểu đồ khoảng giá ghi là danh sách đang xem. Nhịp 30 ngày không bị viết thành tháng lịch.

**Independent Test**: Phiếu đo giả lập khối tổng 389.428 đ, HHI 0,0275, điểm 40,7. Trang và lời ngắn dùng ba số đó, không dùng giá của món trong danh sách. Trang có chữ “Khoảng giá” và “danh sách đang xem”. Câu hỏi lại không tạo trang.

- [x] T027 [US10] Giữ ảnh, biên giá, bán 7 ngày, bán 30 ngày, bán tích lũy, doanh thu hai nhịp, hệ số tăng trưởng, `topShops` trong `crewAI/providers/ecommerce_providers.py`. Điểm để trống khi nguồn không có điểm. Batch giữ ngành, hoa hồng hai phần, lịch sử giá
- [x] T028 [US10] `build_floor_sample` trong `crewAI/market_metrics.py`: khi Sàn Cam live có khối `market`, thẻ `avg_price_vnd`, `hhi`, `blue_ocean_score` lấy từ khối đó; `window_tracked_30d`, `gifts_excluded`, `top_shops`, `source_note` đi theo payload; `sweet_spot_label` của danh sách không ghi đè thẻ tổng
- [x] T029 [US10] Dựng trang một file, SVG nội tuyến, trong `crewAI/market_report.py` theo `specs/002-product-hunter-v2/contracts/report-page.md`
- [x] T030 [US10] Nối trang vào `crewAI/market_answer.py` và `crewAI/flows/product_hunter_v2_flow.py`: Sàn Cam giữ tới 100 món; batch tối đa 5 món khi live, và khi câu đánh giá; lời ngắn của khối tổng không kèm khoảng giá của danh sách
- [x] T031 [US10] Khóa tầng số trong `crewAI/tests/test_market_report.py` và giữ kỳ vọng “Khoảng giá” trong `crewAI/tests/test_product_hunter_v2_flow.py`

## Dependencies & Execution Order

### Phase Dependencies

- Setup xong rồi mới tới Foundational.
- US1 cần Foundational và bài trả lời.
- US2 nằm trong phiếu, làm cùng US1.
- US3, US4, US5 dùng cùng flow với US1.
- US6 và US7 thêm nhánh trên flow đã chạy.
- US8 là trang dài trên cùng lượt đo.
- US9 gắn thời điểm trên phiếu trước khi trang đọc cửa sổ.
- US10 dùng phiếu đo đã có và thay trang ngắn.
- Polish chạy sau khi các nhánh đã có.

### User Story Dependencies

- US1 là MVP.
- US2 là luật sàn của mọi câu đo.
- US3, US4, US5 độc lập về kiểu câu, chung một flow.
- US6 cần danh mục.
- US7 cần đo một tên đã chạy.
- US8 cần lượt đo và trang.

### Parallel Opportunities

- T003 và T004 song song với T002 sau khi chữ ký phiếu đã chốt.
- T021 và T022 song song.

## Parallel Example: User Story 1

```bash
# Sau khi phiếu và mặt bằng đã có:
# market_answer.py và telegram_office.py đụng file khác flow, viết cùng lúc
# rồi nối trong product_hunter_v2_flow.py
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 và Phase 2.
2. US1: một câu tên hàng, Sàn Cam, bản đồ đổi.
3. Kiểm tra sandbox không gọi Apify.

### Incremental Delivery

1. Thêm luật sàn, top, đánh giá, hỏi lại.
2. Thêm ngành và so sánh.
3. Thêm báo cáo dài trên cùng mặt bằng.

## Notes

- Không gọi `run_product_hunter_flow` từ v2.
- `agent_office_camera` giữ id cũ.
- `status_text` của Điều phối tối đa 180 ký tự.
- US10 không thêm bàn và không nhét trang vào sự kiện bản đồ.
