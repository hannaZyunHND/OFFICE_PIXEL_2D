# Office Floor Contract: Product Hunter v2

Mặt bằng này là thứ người xem thấy. Id bàn trong sự kiện phải trùng id dưới đây. Tọa độ do `generateProductHunterV2Blueprint` tính, không ghi trong hợp đồng này.

`layout_profile`: `product_hunter_v2_v1`  
`workflow_id`: `product_hunter_v2_crewai`  
Endpoint: đường dẫn kết thúc bằng `/product-hunter-v2`

## Bàn

Hàng trên, từ trái sang phải: tiếp nhận, điều phối, camera.  
Hàng giữa: sáu bàn câu hỏi.  
Hàng sàn, ngay dưới: Sàn Cam, Sàn Xanh, Sàn Đen.  
Hàng bài: người viết, thư ký.  
Góc thư giãn và góc giám đốc nằm ngoài các hàng này, còn một ô đi được quanh mỗi ghế.

| Id | Tên trên bản đồ | Màu | Vai |
| --- | --- | --- | --- |
| `agent_v2_liaison` | Liên lạc | `#22c55e` | Nhận câu |
| `agent_v2_router` | Điều phối | `#a3e635` | Gán kiểu câu, sàn và thời điểm |
| `agent_office_camera` | Camera văn phòng | `#f43f5e` | Ảnh toàn cảnh. Giữ id cũ để ảnh Telegram rơi đúng bàn |
| `agent_v2_market_keyword` | Thị trường từ khóa | `#38bdf8` | Câu một tên |
| `agent_v2_market_category` | Ngành hàng | `#2dd4bf` | Câu một ngành |
| `agent_v2_top_products` | Top sản phẩm | `#f59e0b` | Câu top |
| `agent_v2_product_eval` | Đánh giá sản phẩm | `#10b981` | Câu một món |
| `agent_v2_compare` | So sánh | `#c4b5fd` | Câu hai tên |
| `agent_v2_full_report` | Báo cáo đầy đủ | `#22d3ee` | Câu xin báo cáo dài |
| `agent_v2_san_cam` | Sàn Cam | `#f97316` | Luôn đo, trừ khi hỏi lại |
| `agent_v2_san_xanh` | Sàn Xanh | `#2563eb` | Đo khi được chọn |
| `agent_v2_san_den` | Sàn Đen | `#0f172a` | Đo khi được chọn |
| `agent_v2_answer` | Viết bài | `#a855f7` | Ghép số thành lời |
| `agent_v2_courier` | Thư ký | `#eab308` | Gửi bài cho Chủ tịch |

## Cạnh được vẽ

| Từ | Tới | Nhãn |
| --- | --- | --- |
| `agent_v2_liaison` | `agent_v2_router` | Câu hỏi |
| `agent_v2_liaison` | `agent_office_camera` | Mở camera |
| `agent_v2_router` | `agent_v2_market_keyword` | Thị trường từ khóa |
| `agent_v2_router` | `agent_v2_market_category` | Ngành hàng |
| `agent_v2_router` | `agent_v2_top_products` | Top sản phẩm |
| `agent_v2_router` | `agent_v2_product_eval` | Đánh giá sản phẩm |
| `agent_v2_router` | `agent_v2_compare` | So sánh |
| `agent_v2_router` | `agent_v2_full_report` | Báo cáo đầy đủ |
| `agent_v2_router` | `agent_v2_san_cam` | Sàn Cam |
| `agent_v2_router` | `agent_v2_san_xanh` | Sàn Xanh |
| `agent_v2_router` | `agent_v2_san_den` | Sàn Đen |
| `agent_v2_san_cam` | `agent_v2_answer` | Số Sàn Cam |
| `agent_v2_san_xanh` | `agent_v2_answer` | Số Sàn Xanh |
| `agent_v2_san_den` | `agent_v2_answer` | Số Sàn Đen |
| `agent_v2_answer` | `agent_v2_courier` | Bài trả lời |

Không vẽ cạnh từ bàn câu hỏi sang bàn sàn. Đường sáng của một lượt là: một cạnh kiểu câu, cộng các cạnh sàn được chọn.

## Sự kiện một lượt đo

1. `FLOW_STARTED` gồm `prompt`, `workflow_id`, `workflow_name`. Canvas gọi `activateWorkflow(workflow_id)`, đưa camera về đầu bản đồ, bật nhìn đường giao việc.
2. `AGENT_HANDOFF` liên lạc → điều phối.
3. Điều phối `AGENT_COMPLETE` với `status_text` của phiếu, kể cả thời điểm khi câu có dịp hoặc tháng. `input_payload` là `QuestionRoute`, nhỏ hơn 10KB.
4. `AGENT_HANDOFF` điều phối → đúng một bàn câu hỏi.
5. Năm bàn câu hỏi kia: `AGENT_START` “Đứng yên — không phải câu này”, rồi `AGENT_COMPLETE`. Không có handoff, không có tool.
6. `AGENT_HANDOFF` điều phối → từng bàn sàn được chọn.
7. Bàn sàn không được chọn: `AGENT_START` “Đứng yên — câu không nhắc sàn này”, rồi `AGENT_COMPLETE`. Không tool.
8. Bàn sàn được chọn: `AGENT_TOOL_CALL` đúng tool của sàn, rồi `AGENT_COMPLETE` hoặc lời lỗi.
9. `AGENT_HANDOFF` từ mỗi sàn đã đo → viết bài.
10. Viết bài `AGENT_COMPLETE`, `status_text` là câu đầu của bài.
11. `AGENT_HANDOFF` viết bài → thư ký. Thư ký `AGENT_COMPLETE` sau khi lời đã gửi.

Lượt hỏi lại dừng sau bước 4. Bàn được chọn là không có bàn nào. Mọi bàn sàn đứng yên. Không có trang số liệu.

## Tool theo sàn

| Sàn | Tool hiện có |
| --- | --- |
| Sàn Cam | `addlivetag_market_search`, rồi `addlivetag_product_batch` khi câu là đánh giá và đã có mã món |
| Sàn Xanh | `apify_lazada_search` |
| Sàn Đen | `apify_tiktok_shop_search` |
| Cụm chữ | `serper_ecommerce_search` trên bàn câu hỏi, trước khi giao sàn |

Serper không chạy trên lượt hỏi lại.
