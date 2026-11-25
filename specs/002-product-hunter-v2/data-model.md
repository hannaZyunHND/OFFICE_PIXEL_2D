# Data Model: Product Hunter v2

## QuestionRoute

Một câu, một phiếu. Hợp đồng ở `contracts/question-route.schema.json`.

| Trường | Ý nghĩa | Luật |
| --- | --- | --- |
| `raw` | Câu gốc | Giữ nguyên để hiện trên Điều phối |
| `intent` | Một trong bảy kiểu | `market_keyword`, `market_category`, `top_products`, `product_eval`, `compare`, `full_report`, `clarify` |
| `platforms` | Sàn phải đo | Rỗng khi `clarify`. Mọi intent khác chứa `shopee`, rồi `lazada` và `tiktok_shop` theo luật sàn |
| `names` | Tên đem đi đo | `clarify`: rỗng. Một tên: 1 phần tử. So sánh: 2. Ngành: khoảng 4. Báo cáo đầy đủ: 1 hoặc nhiều tên đã tách |
| `clarify` | Câu hỏi lại | Rỗng khi đã đo. Khi `clarify`, đúng một câu |
| `when` | Cửa sổ thời gian | `kind` rỗng khi câu không nói tháng hay dịp. `occasion`: Tết, Noel, Trung thu, khai giảng, 8/3, 20/10, Valentine, 11.11, 12.12, mùa hè. `month`: tháng 1–12, tháng này, tháng tới, tháng trước. `query_hint` chỉ có khi `occasion`. Cả dịp và tháng: `kind = occasion`, `label` nêu cả hai |
| `status_text` | Lời trên đầu Điều phối | Tối đa 180 ký tự, có kiểu câu và tên sàn. Có thời điểm khi `when.label` khác rỗng |

Ưu tiên gán `intent`: `full_report`, `compare`, `product_eval`, `top_products`, `market_category`, `market_keyword`, `clarify`.

Chuyển trạng thái: câu vào → phiếu. Phiếu `clarify` dừng. Phiếu đo đi tiếp tới các `FloorSample`.

## FloorSample

Một tên hàng trên một sàn.

| Trường | Ý nghĩa |
| --- | --- |
| `name` | Tên đã đo |
| `platform` | `shopee`, `lazada`, hoặc `tiktok_shop` |
| `mode` | `live`, `sandbox`, hoặc `error` |
| `scope` | `market_block` hoặc `sample`. Sàn Xanh và Sàn Đen luôn `sample` |
| `sp_count`, `shop_count` | Quy mô |
| `total_sold`, `total_revenue_vnd` | Sức bán |
| `avg_price_vnd`, `min_price_vnd`, `max_price_vnd` | Giá |
| `sweet_spot_label` | Khoảng giá bán chạy |
| `hhi`, `blue_ocean_score` | Độ tập trung và chỗ còn trống |
| `avg_commission_pct` | Hoa hồng, hoặc trống |
| `items` | Danh sách đang xem. Mỗi món có thể có tên, ảnh, giá, biên giá, độ dao động giá, bán 7 ngày, bán 30 ngày, bán tích lũy, doanh thu 30 ngày, doanh thu tích lũy, shop, mã shop, đường dẫn món, đường dẫn shop, điểm, hoa hồng, số ngày theo dõi, hệ số tăng trưởng. Ô nào nguồn không trả thì trống, không điền điểm giả |
| `window_all_time` | Nhịp tích lũy khi sàn trả khối tổng: quy mô, lượt bán, doanh thu, giá trung bình, biên giá, số món có bán, tỷ lệ có bán, HHI, điểm chỗ trống, hoa hồng trung bình, hoa hồng cao nhất. Hoa hồng lưu theo phần trăm (8,83), không lưu hệ số 0,0883 |
| `window_tracked_30d` | Nhịp khoảng 30 ngày của nhóm có lịch sử: lượt bán, doanh thu, số món được theo dõi, độ phủ. Trống khi sàn không trả |
| `gifts_excluded` | Số món quà và doanh thu quà bị loại, nếu sàn trả |
| `source_note` | Lời nguồn, ví dụ dữ liệu đã thu thập và lượng bán có thể thấp hơn thực tế |
| `top_shops` | Shop dẫn đầu của khối tổng: mã, doanh thu, số món, tên nếu nối được từ `items`, đường dẫn shop với Sàn Cam |
| `sample_note` | Nhãn của danh sách đang xem. Số giá, HHI và điểm tính trên danh sách chỉ đứng trong mục này |
| `detail_items` | Nhóm nhỏ đã gọi thêm: ngành, hoa hồng tách hai phần, lịch sử giá. Tối đa năm món, hoặc món của câu đánh giá |
| `error` | Lời lỗi khi `mode = error`. Mẫu rỗng, không điền số giả |

`market_block` chỉ khi Sàn Cam live và khối tổng có tổng. Khi đó các thẻ toàn cục đọc `window_all_time`, không đọc số tính lại từ `items`. Thiếu khóa thì `scope = sample` và mọi thẻ ghi là số của danh sách. `sold` và `gmv_vnd` cũ không còn là cặp cột duy nhất: trang phải tách bán tích lũy khỏi bán 30 ngày khi cả hai có số.

## MarketAnswer

Hợp đồng ở `contracts/market-answer.schema.json`.

| Trường | Ý nghĩa |
| --- | --- |
| `route` | Phiếu điều phối |
| `samples` | Các `FloorSample` đã chạy. Bỏ qua sàn không được chọn |
| `related_searches` | Cụm chữ từ Serper. Không phải số bán |
| `prose` | Bài tiếng Việt ghép từ mẫu câu và số trong `samples` |
| `page_path` | Trang xem được |

Mẫu câu theo `intent`:

- Mọi bài đã đo, nếu `when.label` khác rỗng: một câu cửa sổ đứng trước các số. Dịp nói chữ được gắn vào tên tìm. Tháng nói số là số lúc đo, không phải số riêng của cả tháng.
- `market_keyword`: quy mô, giá, khoảng bán chạy, độ tập trung, chỗ còn trống, hoa hồng nếu có, cụm tìm kèm, và `scope` của từng sàn.
- `top_products`: tối đa 10 món mỗi sàn, xếp `total` doanh thu giảm dần, kèm câu “top của mẫu”.
- `product_eval`: một món so với trung vị giá và trung vị lượng bán của mẫu cùng tên. Không có câu về chất lượng lời bình.
- `market_category`: bảng tên × sàn, cùng các cột lượng bán, doanh thu, số shop, giá, chỗ còn trống.
- `compare`: hai cột cùng các chỉ số của `market_keyword`.
- `full_report`: cùng trang ở `contracts/report-page.md`, đủ sàn trong `platforms`, lời ngắn chỉ đường tới trang đó.
- `clarify`: `prose` là câu hỏi lại, `samples` rỗng, không có trang số liệu.

Luật viết: mọi con số trong `prose` phải có mặt trong `samples` hoặc `related_searches`. Mảng rỗng thì câu “chưa lấy được”, không có hạng giả.

## OfficeFloor

Mặt bằng v2. Chi tiết bàn và cạnh ở `contracts/office-floor.md`.

| Thực thể | Luật |
| --- | --- |
| Bàn | Id cố định, một ghế, một màu, một vai |
| Cạnh | Chỉ các cạnh trong hợp đồng. Cạnh sáng khi có `AGENT_HANDOFF` đúng cặp đó |
| Lượt chạy | `FLOW_STARTED.workflow_id = product_hunter_v2_crewai` thì canvas nạp mặt bằng này trước sự kiện đi bộ |

Trạng thái một bàn trong lượt: đứng yên (start + complete, không tool), đang đo (start + tool + complete), hoặc lỗi (`AGENT_ERROR` hoặc complete với lời lỗi). Bàn đứng yên không có handoff tới nó.
