# Research: Product Hunter v2

## 1. Flow mới, giữ flow cũ

**Decision**: Thêm `run_product_hunter_v2_flow`. Giữ `run_product_hunter_flow` và mặt bằng 15 người.

**Rationale**: Báo cáo dài hiện nay đang chạy. Mặt bằng cũ chật, mọi lối đều đổ về một từ khóa, nên nhìn không ra kiểu câu. Spec yêu cầu mặt bằng cũ vẫn mở được.

**Alternatives considered**: Sửa flow cũ thành sáu nhánh. Bị loại vì một lần sửa chạm báo cáo đang dùng, và 15 bàn hiện tại không phải sáu kiểu câu.

## 2. Điều phối bằng luật, không bằng mô hình

**Decision**: Module `crewAI/question_route.py` gán một kiểu và một tập sàn bằng luật chữ. Bài trả lời ghép từ số đã đo, bằng câu mẫu.

**Rationale**: Spec cấm bước viết bài bịa lượng bán, doanh thu, thứ hạng. Luật chữ kiểm thử được từng câu sếp đã chốt. Mô hình tự do dễ gọi nhầm Sàn Xanh.

**Alternatives considered**: Một agent CrewAI tự chọn tool. Bị loại vì cùng một câu có thể ra hai lối, và dễ đo sàn không được nhắc.

## 3. Luật sàn

**Decision**: Tập sàn luôn có `shopee`. Thêm `lazada` khi câu có `lazada` hoặc `sàn xanh`. Thêm `tiktok_shop` khi câu có `tiktok` hoặc `sàn đen`. Cụm `cả ba sàn`, `ba sàn`, `3 sàn`, `tất cả sàn`, `mọi sàn`, `đa sàn` chọn cả ba. Nhắc cả Lazada lẫn TikTok cũng chọn cả ba. `hitlPolicy` giữ `auto_skip`. Không thêm cổng chi phí.

**Rationale**: Sếp chốt Sàn Cam là mặc định, hai sàn kia cộng thêm khi lời nhắc tới, và chấp nhận credit. Tool Apify đang gắn `requires_hitl=True` nhưng flow cũ chỉ dừng khi `hitlPolicy` khác `auto_skip`. V2 đi cùng đường đó.

**Alternatives considered**: Hỏi xác nhận trước mỗi lần Apify. Bị loại vì sếp nói tốn thì chịu tốn. Bỏ Sàn Cam khi câu nói “chỉ Sàn Đen”. Bị loại vì spec ghi Sàn Cam luôn nằm trong phép đo.

## 4. Số thị trường lấy từ khối tổng, danh sách món dùng để xếp

**Decision**: Với Sàn Cam, nếu payload live có khối `market` hoặc `last30Days` và trong đó có tổng, bài thị trường dùng tổng đó và ghi `scope = market_block`. Danh sách món dùng cho top, khoảng giá và đánh giá một món. Khối tổng không có số thì tính từ mẫu và ghi `scope = sample`. Sàn Xanh và Sàn Đen luôn `scope = sample`.

**Rationale**: Flow cũ lưu hai khối này rồi tính lại từ danh sách đã cắt, nên bài “thị trường” thực ra là bài của mẫu. V2 phải nói đúng nguồn của con số. Tên trường trong khối tổng chưa được chốt trong repo, nên lúc làm phải đọc một payload live và ghi ánh xạ vào trace. Thiếu khóa thì hạ xuống mẫu, không đoán số.

**Alternatives considered**: Luôn tính từ danh sách món. Bị loại vì đánh mất bức tranh thị trường mà nguồn Sàn Cam đã trả.

## 5. Serper chỉ để gợi ý chữ

**Decision**: Serper chạy cho cụm tìm kèm của câu một tên, và để đề xuất tên khi ngành không có trong danh mục. Serper không tạo lượng bán hay doanh thu.

**Rationale**: Tool hiện trả `related_searches` và snippet, không có GMV.

**Alternatives considered**: Dùng Serper làm thứ hạng sản phẩm. Bị loại vì thứ hạng Google không phải thứ hạng bán.

## 6. Mặt bằng v2 là văn phòng thứ hai

**Decision**: Seed `product_hunter_v2_crewai`, `layout_profile = product_hunter_v2_v1`, hàm `generateProductHunterV2Blueprint`. Mười ba bàn: tiếp nhận, điều phối, sáu kiểu câu, ba sàn, người viết, thư ký, và camera dùng đúng id `agent_office_camera`.

**Rationale**: `BLUEPRINT_SYNC` và `activateWorkflow` đã biết cách đổi sơ đồ trên canvas. Camera Telegram đang bắn sự kiện vào `agent_office_camera`. Giữ id đó thì ảnh toàn cảnh vẫn rơi đúng bàn camera trên mặt bằng mới. Trang tải đang chọn `product_hunter_crewai` mỗi lần mở. Đổi mặc định sang id v2 thì mở app là thấy mặt bằng hỏi thị trường. Mặt bằng cũ vẫn trong danh sách.

**Alternatives considered**: Nhét sáu bàn mới vào mặt bằng 15 người. Bị loại vì hàng bàn đã kín, đường giao việc sẽ rối. Đổi id camera. Bị loại vì `telegram_office.CAMERA_AGENT_ID` sẽ thành bàn vô hình.

## 7. Đổi mặt bằng trước bước đi đầu tiên

**Decision**: `FLOW_STARTED` mang thêm `workflow_id` và `workflow_name`. `App.vue` gọi `activateWorkflow` rồi `resetCamera` và bật nhìn đường giao việc, trước khi sự kiện nhân viên tới. Nhánh `product-hunter-v2` trên server được xét trước nhánh `product-hunter`.

**Rationale**: `trigger_flow` phát `FLOW_STARTED` rồi mới chạy handler. Canvas đã `watch` blueprint và gọi `loadBlueprint`. Sự kiện của bàn v2 chỉ có ghế khi sơ đồ đã đổi. Chuỗi `product-hunter` đang nuốt mọi URL có cụm đó, nên URL v2 phải được nhận ra trước.

**Alternatives considered**: Để Python gửi cả file tọa độ. Bị loại vì tọa độ thuộc máy xếp mặt bằng phía văn phòng. Hai nơi cùng giữ tọa độ sẽ lệch ghế và đường đi.

## 8. Đường trên bản đồ là hình sao từ Điều phối

**Decision**: Blueprint chỉ kẻ các cạnh: tiếp nhận → điều phối, tiếp nhận → camera, điều phối → từng bàn câu hỏi, điều phối → từng bàn sàn, ba bàn sàn → người viết, người viết → thư ký. Bàn không được chọn không nhận `AGENT_HANDOFF`. Bàn đó nhận `AGENT_START` rồi `AGENT_COMPLETE` với lời “Đứng yên”.

**Rationale**: God View vẽ mọi cạnh và làm sáng cạnh có handoff. Nối sáu bàn câu với ba sàn tạo mười tám đường chồng. Hình sao từ Điều phối đủ để thấy một kiểu câu và các sàn đang đo. Gói tin Bézier vẫn bay giữa hai bàn khi có handoff.

**Alternatives considered**: Không hiện bàn đứng yên. Bị loại vì spec muốn người xem thấy bàn nào không đi lấy số.

## 9. Cấm trang trí tự động đè lên mặt bằng v2

**Decision**: `useWorkflowStore` xử lý `product_hunter_v2_crewai` giống `product_hunter_crewai`: nếu `layout_profile` lệch thì xếp lại bằng hàm v2, rồi thoát trước nhánh “ít hơn 30 món nội thất thì trang trí thêm”.

**Rationale**: Nhánh trang trí thêm đang đẩy đồ vào chỗ trống. Sáu bàn câu hỏi cần một hàng đọc được. Bị nhồi cây và bể cá thì hết lối nhìn.

**Alternatives considered**: Thêm cho đủ 30 món nội thất để né nhánh đó. Bị loại vì món thêm không theo hàng, lần sau vẫn có thể bị trang trí lại.

## 10. Báo cáo đầy đủ không gọi flow cũ

**Decision**: V2 không gọi `run_product_hunter_flow`. Báo cáo đầy đủ phát sự kiện bằng id bàn v2 rồi dựng cùng trang ở mục 13, không dựng HTML của flow cũ.

**Rationale**: Gọi flow cũ sẽ phát sự kiện của `agent_shopee_hunter` và các id không có ghế trên mặt bằng v2. HTML cũ còn tính lại tổng từ danh sách đã cắt và có chỗ điền điểm giả, nên không dùng làm trang Story 10.

**Alternatives considered**: Tách nguyên hàm dựng trang của flow cũ sang v2. Bị loại sau lần đối chiếu payload: trang đó không tách nhịp tích lũy khỏi nhịp 30 ngày, không có ảnh, và có thể ghi một tỷ lệ video/live khi nguồn không trả tỷ lệ đó.

## 11. Danh mục ngành

**Decision**: `crewAI/market_catalog.py` giữ 10 ngành, mỗi ngành 4 tên: mỹ phẩm, mẹ và bé, nhà cửa, đồ gỗ, đồ ăn, đồ điện, thời trang, thể thao, thú cưng, văn phòng phẩm. Ngành lạ: Serper lấy cụm liên quan, giữ tối đa 4 cụm có dạng tên hàng. Không ra tên thì `clarify`.

**Rationale**: Spec cần khoảng bốn tên ổn định cho ngành hay hỏi, và một lối thoát khi ngành lạ.

**Alternatives considered**: Để mô hình nghĩ tên ngành mỗi lần. Bị loại vì cùng câu “nhà cửa” sẽ ra các tên khác nhau, bảng so không so lại được.

## 12. Thời điểm là một trường của phiếu, không phải một sàn lọc theo tháng

**Decision**: `crewAI/market_when.py` đọc `when` trên phiếu. Dịp (Tết, Noel, Trung thu, khai giảng, 8/3, 20/10, Valentine, 11.11, 12.12, mùa hè) có `query_hint`. Tên gửi xuống sàn là tên gốc cộng hint nếu tên chưa chứa chữ đó. Câu chỉ có dịp thì đo tối đa bốn tên của dịp, kiểu ngành, trừ đánh giá và so sánh thiếu tên thì hỏi lại. Tháng (1–12, tháng này, tháng tới, tháng trước) có `query_hint` rỗng: không gắn vào tên tìm. Bài ghi cửa sổ và nói số là số sàn trả lúc đo. “11.11” không bị hiểu thành “tháng 11”.

**Rationale**: “Hộp quà” và “hộp quà Tết” là hai lần tìm khác nhau, nên dịp phải vào tham số tìm. AddLiveTag, Apify và Serper đang nối không nhận một tháng lịch sử. Gắn “tháng 11” vào từ khóa làm bẩn tên hàng. Bịa doanh thu của cả tháng 11 thì trái luật “số chỉ đến từ phiếu đo”.

**Alternatives considered**: Thêm tham số ngày vào URL sàn. Bị loại vì endpoint hiện không có ô đó. Coi mọi “tháng 11” là dịp 11.11. Bị loại vì sếp nói tháng và dịp là hai cửa sổ.

## 13. Trang báo cáo đọc ba tầng số, không trộn

**Decision**: Mọi câu đã đo dùng một trang tĩnh do `crewAI/market_report.py` dựng. Biểu đồ là SVG trong file, không thư viện ngoài, để trang đăng công khai vẫn mở khi không tải script. Lời ngắn và sự kiện bản đồ không mang trang.

Đối chiếu live Sàn Cam cho “kem chống nắng”, cùng nguồn với trang đã gửi, payload có các khối: `market`, `last30Days`, `giftsExcluded`, `topShops`, `products` (100 dòng), `scopeNote`.

Khối `market` là tích lũy toàn bộ món đã thu thập, đã trừ quà: 28.926 SP, 7.036 shop, 727.121 lượt bán, doanh thu 259.973.337.976 đ, giá trung bình 389.428 đ, biên 1.000–71.500.000 đ, 7.619 SP có bán, tỷ lệ có bán 26,34%, HHI 0,0275, điểm chỗ trống 40,7, hoa hồng trung bình 8,83%, hoa hồng cao nhất 87%. `scopeNote` nói đây là dữ liệu đã thu thập, không phải cả sàn, và lượng bán là mức sàn dưới vì không phải món nào cũng có số bán.

`last30Days` là nhịp khác: 52.570 lượt bán, doanh thu 23.073.602.855 đ, 8.603 SP được theo dõi, độ phủ 29,74%. Lời của nguồn: chỉ tính món có ít nhất 8 ngày lịch sử, còn khối `market` là tích lũy và phủ toàn bộ món đã thu thập. Nhịp này không phải tháng 11.

`giftsExcluded`: 241 món, 46.352.133.903 đ, bị loại vì quà làm phình tổng.

`topShops`: 10 shop, mỗi dòng có mã shop, doanh thu, số món. Không có tên shop. Shop đứng đầu mã 562665255, doanh thu 29.088.747.746 đ, 30 món, khoảng 11,2% doanh thu khối tổng. Tên shop nối từ `products` khi mã trùng. Đường dẫn shop Sàn Cam ghép `https://shopee.vn/shop/{mã}` vì đường dẫn món đã dùng cùng mã đó.

Mỗi món trong 100 dòng đều có: `imageUrl`, `productLink`, `productName`, `shopId`, `shopName`, `price`, `priceMin`, `priceMax`, `priceCv`, `rating`, `commissionRate`, `sales`, `sold7d`, `sold30d`, `revenue30d`, `revenueAll`, `daysTracked`, `growth`, `catId`. Không có khóa ảnh nào bị thiếu trong lần này. Không có KOC, không có tách video/live, không có lượng tìm kiếm.

Trang đã gửi thì khác các số này: giá thường gặp 561.984 đ và biên 150.000–1.076.000 đ, HHI 0,1313, điểm 92 nhãn Đại dương xanh, hoa hồng 9,0%. Các số đó ra từ nhóm món đứng đầu (flow đang giữ tối đa 30 dòng), trong khi adapter bỏ ảnh, bỏ `topShops`, bỏ nhịp 30 ngày, và lấy `sales` với `revenueAll` làm một cột. Công thức chỗ trống của mẫu top gần như món nào cũng có bán, nên điểm bị kéo lên 92. Khối tổng tự cho 40,7. Hai câu kinh doanh khác nhau: cả danh mục phân tán và chỉ khoảng một phần tư món có bán; kệ đang nhìn thấy thì gắt hơn. Trang phải nói cả hai, đúng nhãn.

`growth` trên món đứng đầu là 2,519 và không kèm đơn vị. Trang ghi nguyên số, không nhân 100.

Batch một món thêm những gì danh sách không có: `catName`, đường ngành, hoa hồng tách người bán và sàn, trần hoa hồng, cờ Xtra, `priceStats` (giá hiện tại, min, max, trung bình, đổi 7 ngày, đổi 30 ngày), `latestPriceHistory` (giá, giá gốc, phần trăm giảm, flash sale, tồn, ngày ghi). Giá trong batch của cùng một món có thể khác giá trong danh sách. Trang câu đánh giá hiện cả hai, có nhãn nguồn. Không batch 100 món: công cụ batch đang nhận tối đa 20 mã, và Story 10 chỉ cần tối đa 5 món đứng đầu cộng món đang đánh giá.

Sàn Xanh và Sàn Đen chưa được gọi lại trong lần đối chiếu này. Adapter hiện có giá, lượt bán, tên shop, điểm, đường dẫn món. Doanh thu đang là giá nhân lượt bán. Ảnh chưa được map. Trang dùng cùng khung và một dải “mẫu tìm kiếm”. Thiếu ảnh thì ô trống.

Serper vẫn chỉ là cụm tìm kèm và vài đường dẫn bài viết. Không vẽ biểu đồ lượt tìm.

**Rationale**: Sếp nhìn trang nát, và số trên trang còn dễ đọc nhầm chỗ còn trống. Dữ liệu để làm trang đủ dùng cho một quyết định nhập hàng trên Sàn Cam đã có sẵn ở lần tìm: quy mô, hai nhịp, quà, cạnh tranh, kệ có ảnh và đường dẫn, đà 7 ngày so với 30 ngày, hoa hồng. Phần không có thì để trống: lượng tìm kiếm, KOC, video so với live, doanh thu của đúng tháng lịch, lời bình.

**Alternatives considered**: Gắn Chart.js từ mạng. Bị loại vì trang đăng công khai phải mở được khi script ngoài không tải. Lấy khối tổng rồi vẫn ghi điểm 92 của mẫu lên thẻ chính. Bị loại vì đó là số đang làm sếp đọc sai. Coi `growth` là phần trăm. Bị loại vì nguồn không ghi đơn vị. Gọi batch cho cả 100 món để có lịch sử giá mọi dòng. Bị loại vì chậm và vượt nhu cầu của thẻ tổng. Bịa doanh thu tháng 11 bằng cách chia nhịp 30 ngày. Bị loại vì nguồn nói nhịp đó là nhóm có lịch sử, không phải tháng được hỏi.
