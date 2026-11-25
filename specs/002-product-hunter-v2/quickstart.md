# Quickstart: Product Hunter v2

Cách kiểm tra đặc tả và mặt bằng. Chưa cần credit sàn thật: bộ thử để sandbox.

## Chuẩn bị

- Văn phòng: `npm run dev`, mở app.
- Cầu nối: lệnh Python trong `crewAI/README.md` (`crewAI/server.py`).
- Khóa sàn trong `.env` chỉ cần khi muốn số live. Không khóa thì phiếu ghi `sandbox` và bài phải nói đó là mẫu mô phỏng.

## 1. Phiếu điều phối

Chạy thử `question_route` với bốn câu:

| Câu | Kỳ vọng |
| --- | --- |
| `Thị trường kem chống nắng đang thế nào?` | `market_keyword`, chỉ `shopee`, một tên |
| `Top khăn giấy trên Sàn Xanh` | `top_products`, `shopee` + `lazada` |
| `So quạt mini với quạt điều hòa trên TikTok Shop` | `compare`, `shopee` + `tiktok_shop`, hai tên |
| `Thị trường đang thế nào?` | `clarify`, không sàn, không tên |
| `Thị trường kem chống nắng trong tháng 11` | `market_keyword`, tên `kem chống nắng`, `when.kind = month`, tên tìm không có “tháng 11” |
| `Thị trường hộp quà dịp Tết` | `market_keyword`, `when.id = tet`, tên tìm `hộp quà Tết` |
| `Thị trường dịp Noel` | `market_category`, vài tên Noel, chỉ `shopee` |
| `Thị trường trong tháng 11` | `clarify`, có chữ tháng 11, không đo |

Lệnh nằm ở `crewAI/tests`, cùng kiểu với `test_brief_fit.py`.

## 2. Một lượt sandbox không đụng hai sàn kia

Chạy flow v2 với câu thị trường một tên, `allowSandboxFallback` bật, không gửi token Apify.

Kỳ vọng nhật ký tool: có `addlivetag_market_search`, có `serper_ecommerce_search`, không có `apify_lazada_search`, không có `apify_tiktok_shop_search`.

Sự kiện: một handoff tới `agent_v2_market_keyword`, một handoff tới `agent_v2_san_cam`, không handoff tới `agent_v2_san_xanh` hay `agent_v2_san_den`.

## 3. Câu nhắc Sàn Xanh thì bàn xanh đi lấy số

Cùng harness, câu có “Sàn Xanh”. Nhật ký có `apify_lazada_search`. Vẫn có Sàn Cam. Không có TikTok. `hitlPolicy` mặc định không mở cổng xác nhận.

## 4. Mặt bằng trên văn phòng

Kiểm tra seed `product_hunter_v2_crewai`:

- `meta.layout_profile` là `product_hunter_v2_v1`.
- Đủ 13 id trong `contracts/office-floor.md`, kể cả `agent_office_camera`.
- Đúng 15 cạnh, nhãn tiếng Việt như hợp đồng.
- Workflow cũ `product_hunter_crewai` vẫn có trong seed.
- Id mặc định lúc mở app là `product_hunter_v2_crewai`.
- Hồ sơ v2 không đi qua nhánh trang trí thêm khi số món nội thất dưới 30.

Mở app. Bản đồ phải là hàng sáu bàn câu hỏi và hàng ba bàn sàn. Bấm nhìn đường giao việc: đường tỏa từ Điều phối, chưa sáng hết.

## 5. Câu thật trên bản đồ

Gửi một câu từ nhóm Chủ tịch, hoặc bấm chạy trên mặt bằng v2.

Thứ tự mắt thấy:

1. Bản đồ v2 hiện, nhìn đường giao việc bật, trước khi ai bước.
2. Điều phối nói kiểu câu, sàn, và thời điểm nếu câu có tháng hoặc dịp.
3. Một bàn câu hỏi nhận gói tin. Năm bàn kia chỉ hiện “Đứng yên”.
4. Sàn Cam nhận gói tin. Sàn Xanh và Sàn Đen chỉ nhận gói tin khi câu nhắc.
5. Thư ký xong thì nhóm có lời ngắn và đường dẫn trang.

Câu “Thị trường đang thế nào?” dừng ở một câu hỏi lại. Không bàn sàn nào gọi tool.

## 6. Báo cáo đầy đủ

Câu “Làm báo cáo đầy đủ cho khăn giấy” ra cùng khung trang ở `contracts/report-page.md`, chỉ Sàn Cam, và đường sáng trên mặt bằng v2 đi qua `agent_v2_full_report`. Không xuất hiện id `agent_shopee_hunter` trong lượt đó.

## 7. Trang không trộn tầng số

Sau lát Story 10, mở trang của câu “Thị trường kem chống nắng trong tháng 11”.

- Có câu cửa sổ tháng 11, và câu nhịp 30 ngày không phải doanh thu của cả tháng.
- Thẻ giá thường gặp, HHI và điểm chỗ trống khớp khối tổng, không khớp ba số tính trên danh sách món khi hai bên khác nhau.
- Có nhịp tích lũy và nhịp khoảng 30 ngày thành hai nhóm thẻ.
- Có ảnh và đường dẫn món. Shop có đường dẫn khi có mã shop.
- Biểu đồ khoảng giá ghi là danh sách đang xem.
- Một món không có điểm thì ô điểm trống.
- Câu “Thị trường đang thế nào?” vẫn không tạo trang.
