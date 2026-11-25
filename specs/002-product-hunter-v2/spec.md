# Feature Specification: Product Hunter v2 — Hỏi thị trường, nhìn đường đi trên văn phòng

**Feature Branch**: `002-product-hunter-v2`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "Sếp cần một hệ thống trả lời câu hỏi tham khảo thị trường, không dừng ở săn theo từ khóa. Sàn Cam là sàn mặc định. Sàn Xanh và Sàn Đen chỉ được đo thêm khi câu hỏi nhắc tới. Chi phí đo thêm được chấp nhận, không hỏi xác nhận. Phải gắn vào văn phòng 2D để nhìn rõ câu đang đi lối nào."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hỏi thị trường một tên hàng và nhìn thấy lối đi (Priority: P1)

Chủ tịch gửi một câu về một tên hàng, ví dụ “Thị trường kem chống nắng đang thế nào?”. Văn phòng 2D đổi sang mặt bằng Product Hunter v2 trước khi ai đó bước đi. Điều phối nói một câu ngắn trên đầu: đây là câu thị trường theo tên, chỉ Sàn Cam. Đường giao việc sáng từ Điều phối tới bàn “Thị trường từ khóa” và bàn Sàn Cam. Năm bàn câu hỏi còn lại và hai bàn Sàn Xanh, Sàn Đen đứng yên, mỗi bàn một lời ngắn “Đứng yên”. Chủ tịch nhận một bài ngắn: quy mô, giá, chỗ đông, chỗ còn trống, và vài cụm người ta đang tìm kèm.

**Why this priority**: Đây là việc sếp cần ngay. Nhìn bản đồ phải hiểu câu đang được trả lời theo kiểu nào và sàn nào đang đo, không cần mở nhật ký.

**Independent Test**: Gửi một câu chỉ có một tên hàng, không nhắc Sàn Xanh hay Sàn Đen. Kiểm tra mặt bằng, lời trên đầu Điều phối, hai đường sáng, các bàn đứng yên, và bài trả lời có đủ bốn nhóm số.

**Acceptance Scenarios**:

1. **Given** văn phòng đang mở mặt bằng cũ, **When** Chủ tịch gửi “Thị trường kem chống nắng đang thế nào?”, **Then** mặt bằng v2 hiện ra và chế độ nhìn đường giao việc bật trước khi nhân viên đầu tiên rời chỗ.
2. **Given** câu chỉ có một tên hàng, **When** Điều phối xong, **Then** người xem đọc được trên bản đồ kiểu câu và danh sách sàn, trong một câu ngắn.
3. **Given** câu không nhắc Sàn Xanh hay Sàn Đen, **When** phép đo chạy, **Then** chỉ bàn Sàn Cam đi lấy số, hai bàn kia đứng yên và không đi lấy số.
4. **Given** phép đo Sàn Cam xong, **When** thư ký gửi bài, **Then** bài có số sản phẩm, số shop, lượng bán, doanh thu, giá thường gặp, khoảng giá bán chạy, độ tập trung, chỗ còn trống, và các cụm tìm kèm.

---

### User Story 2 - Sàn trong câu hỏi quyết định bàn nào đứng dậy (Priority: P1)

Sàn Cam luôn được đo. Sàn Xanh đứng dậy khi câu có “Lazada” hoặc “Sàn Xanh”. Sàn Đen đứng dậy khi câu có “TikTok”, “TikTok Shop” hoặc “Sàn Đen”. “Cả ba sàn”, “ba sàn”, “tất cả sàn”, “đa sàn”, hoặc nhắc cả hai sàn kia, thì cả ba bàn cùng đo. Không có bước hỏi “có chi tiền không”.

**Why this priority**: Sếp đã chốt luật sàn. Làm sai luật này thì bài trả lời và bản đồ cùng lệch.

**Independent Test**: Gửi bốn câu cùng một tên hàng: không nhắc sàn, nhắc Sàn Xanh, nhắc TikTok Shop, và nói “cả ba sàn”. Đối chiếu bàn nào làm việc.

**Acceptance Scenarios**:

1. **Given** câu “Top khăn giấy trên Sàn Xanh”, **When** đo bắt đầu, **Then** Sàn Cam và Sàn Xanh làm việc, Sàn Đen đứng yên.
2. **Given** câu “So quạt mini với quạt điều hòa trên TikTok Shop”, **When** đo bắt đầu, **Then** Sàn Cam và Sàn Đen làm việc, Sàn Xanh đứng yên.
3. **Given** câu “Báo cáo đủ ba sàn cho khăn giấy”, **When** đo bắt đầu, **Then** cả ba bàn sàn làm việc và không có câu hỏi xác nhận chi phí.
4. **Given** câu “chỉ xem Sàn Đen”, **When** đo bắt đầu, **Then** Sàn Cam vẫn đo, Sàn Đen đo thêm.

---

### User Story 3 - Top sản phẩm theo một tên (Priority: P1)

Chủ tịch hỏi “Top khăn giấy gấu trúc”. Bàn “Top sản phẩm” nhận việc. Bài trả về tối đa 10 dòng: tên, giá, lượng bán, doanh thu, shop, đường dẫn. Bài ghi rõ đây là top trong mẫu vừa lấy, theo từng sàn đã đo.

**Why this priority**: Top là câu sếp nêu riêng, và trả lời được ngay từ mẫu sàn mà không cần bài ngành.

**Independent Test**: Gửi một câu có chữ “top” và một tên hàng. Bài có danh sách xếp hạng và không biến thành bài thị trường chung.

**Acceptance Scenarios**:

1. **Given** câu “Top sản phẩm khăn giấy”, **When** bài xong, **Then** danh sách xếp theo doanh thu, mỗi dòng có tên, giá, lượng bán, doanh thu, shop và đường dẫn.
2. **Given** mẫu có hơn 10 món, **When** bài được viết, **Then** bài giữ 10 món đầu và nói đó là top của mẫu.

---

### User Story 4 - Đánh giá một sản phẩm (Priority: P1)

Chủ tịch hỏi một món có đáng nằm ở đâu so với mặt bằng tên hàng đó, hoặc dán đường dẫn một món. Bàn “Đánh giá sản phẩm” nhận việc. Bài đặt món đó cạnh mặt bằng: giá cao hay thấp hơn giá thường gặp, bán mạnh hay yếu so với nhóm, điểm đánh giá, hoa hồng nếu sàn có, shop chính hãng hay shop thường. Bài không kết luận chất lượng từ lời bình vì hệ thống không đọc lời bình hàng loạt.

**Why this priority**: Đánh giá một món là câu sếp chờ, và khác với bài thị trường chung.

**Independent Test**: Gửi “Đánh giá kem chống nắng Anessa”. Bài nói vị trí của món so với mặt bằng tên “kem chống nắng”, và không có câu kết luận về kích ứng hay chất lượng da.

**Acceptance Scenarios**:

1. **Given** câu nêu một món trong một tên hàng, **When** bài xong, **Then** bài có vị trí giá, vị trí sức bán, điểm đánh giá, và loại shop.
2. **Given** sàn có hoa hồng của món đó, **When** bài được viết, **Then** bài ghi mức hoa hồng. **Given** sàn không có hoa hồng, **Then** bài ghi là chưa có số hoa hồng.
3. **Given** câu không có tên món, **When** Điều phối đọc, **Then** hệ thống hỏi lại món nào và không đi đo.

---

### User Story 5 - Câu quá rộng thì hỏi lại (Priority: P1)

“Thị trường đang thế nào?” không chỉ tên, không chỉ ngành. Điều phối hỏi lại một câu: ngành nào, hay một tên hàng. Không bàn sàn nào đi đo. Không có bài số liệu.

**Why this priority**: Đo một câu rỗng sẽ ra số liệu trông thật nhưng không trả lời được sếp.

**Independent Test**: Gửi “thị trường đang thế nào?”. Chỉ có một câu hỏi lại, mặt bằng không có bàn sàn nào làm việc.

**Acceptance Scenarios**:

1. **Given** câu không có tên hàng và không có ngành, **When** Điều phối đọc xong, **Then** Chủ tịch nhận đúng một câu hỏi lại và không nhận bài số liệu.
2. **Given** văn phòng đang rảnh, **When** câu rỗng được xử lý, **Then** mọi bàn sàn ở trạng thái đứng yên.

---

### User Story 6 - Tham khảo một ngành (Priority: P2)

Chủ tịch hỏi một ngành, ví dụ “Ngành nhà cửa, món nào đang bán?”. Bàn “Ngành hàng” nhận việc. Ngành được tách thành khoảng bốn tên hàng cụ thể. Mỗi tên được đo trên đúng các sàn luật sàn cho phép. Bài là một bảng so: lượng bán, doanh thu, số shop, giá, độ đông. Tên đứng đầu có một câu mời đo sâu bằng báo cáo đầy đủ.

**Why this priority**: Câu ngành là phần sếp muốn sau khi câu một tên đã chạy. Cần một danh mục ngành có sẵn thì câu trả lời mới ổn định.

**Independent Test**: Gửi một ngành nằm trong danh mục, không nhắc sàn. Bài so khoảng bốn tên, chỉ số Sàn Cam, Sàn Xanh và Sàn Đen đứng yên.

**Acceptance Scenarios**:

1. **Given** ngành có trong danh mục, **When** bài xong, **Then** bài so khoảng bốn tên hàng bằng cùng một bộ số.
2. **Given** ngành không có trong danh mục, **When** vẫn gợi ý được vài tên hàng, **Then** bài đo các tên đó và nói đây là tên được đề xuất. **When** không gợi ý được, **Then** hệ thống hỏi lại tên hàng cần đo.

---

### User Story 7 - So hai tên hàng (Priority: P2)

“Quạt mini với quạt điều hòa, bên nào còn chỗ?” vào bàn “So sánh”. Hai tên được đo cùng các sàn đã chọn. Bài là hai cột cùng bộ số của câu thị trường một tên.

**Why this priority**: So sánh dùng lại phép đo của câu một tên, sau khi câu một tên đã đúng.

**Independent Test**: Gửi một câu có hai tên nối bằng “với”. Bài có hai cột và một câu bên nào đông hơn, bên nào còn chỗ hơn.

**Acceptance Scenarios**:

1. **Given** câu có đủ hai tên, **When** bài xong, **Then** hai cột dùng cùng bộ số và cùng các sàn.
2. **Given** câu nói so sánh nhưng chỉ có một tên, **When** Điều phối đọc, **Then** hệ thống hỏi tên thứ hai và không đi đo.

---

### User Story 8 - Xin báo cáo đầy đủ, vẫn theo luật sàn (Priority: P3)

“Làm báo cáo đầy đủ cho khăn giấy” vào bàn “Báo cáo đầy đủ”. Chủ tịch nhận đúng trang ở Story 10, gồm mọi sàn câu đó chọn. Trên mặt bằng v2, đường đi vẫn là Điều phối → Báo cáo đầy đủ → các bàn sàn được chọn → thư ký. Mặt bằng mười lăm người cũ vẫn nằm trong danh sách văn phòng để mở lại.

**Why this priority**: Giữ việc cũ, nhưng không kéo người xem sang một mặt bằng khác giữa chừng.

**Independent Test**: Xin báo cáo đầy đủ không nhắc sàn. Nhận một báo cáo dài chỉ Sàn Cam, và đường sáng trên mặt bằng v2 đi qua bàn “Báo cáo đầy đủ”.

**Acceptance Scenarios**:

1. **Given** câu xin báo cáo đầy đủ và không nhắc sàn, **When** chạy xong, **Then** báo cáo dài chỉ có Sàn Cam và đường giao việc trên mặt bằng v2 đi qua bàn “Báo cáo đầy đủ”.
2. **Given** câu xin báo cáo đầy đủ và nói “cả ba sàn”, **When** chạy xong, **Then** báo cáo dài có đủ ba sàn.
3. **Given** người xem mở danh sách văn phòng, **When** tìm mặt bằng săn hàng cũ, **Then** mặt bằng đó vẫn mở được.

---

### User Story 9 - Hỏi theo tháng hoặc theo dịp (Priority: P1)

Chủ tịch gắn thời điểm vào câu để tham khảo cho đúng mùa. “Trong tháng 11” là một tháng. “Dịp Tết”, “dịp Noel”, Trung thu, khai giảng, 8/3, 20/10, Valentine, 11.11, 12.12 và mùa hè là các dịp. Phiếu điều phối giữ thời điểm đó. Lời trên đầu Điều phối đọc được thời điểm. Dịp được gắn vào tên tìm trên sàn khi tên gốc chưa có chữ của dịp. Tháng không bị gắn vào tên tìm. Bài nói rõ số là số sàn trả lúc đo, không phải doanh thu riêng của cả tháng được hỏi. Câu chỉ nói một dịp, không nói tên hàng, thì đo vài tên hàng đúng dịp đó. Câu chỉ nói một tháng, không nói tên hàng, thì hỏi lại tên.

**Why this priority**: Sếp muốn tham khảo đúng cửa sổ thời gian. Đo “hộp quà” và đo “hộp quà Tết” là hai mặt hàng khác nhau. Đo “tháng 11” mà bịa số của cả tháng thì bài trông chuẩn nhưng sai.

**Independent Test**: “Thị trường kem chống nắng trong tháng 11” vẫn đo tên “kem chống nắng”, bài có chữ tháng 11 và câu không phải số riêng của cả tháng. “Thị trường hộp quà dịp Tết” tìm “hộp quà Tết”. “Thị trường dịp Noel” đo các tên Noel, không hỏi lại. “Thị trường trong tháng 11” hỏi lại tên hàng.

**Acceptance Scenarios**:

1. **Given** câu có tên hàng và “trong tháng 11”, **When** phiếu xong, **Then** tên hàng không còn chữ tháng, phiếu ghi tháng 11, và tên gửi đi đo không có “tháng 11”.
2. **Given** câu “hộp quà dịp Tết”, **When** sàn được đo, **Then** tên tìm có chữ Tết và bài nêu dịp Tết.
3. **Given** câu chỉ có “dịp Noel”, **When** đo bắt đầu, **Then** vài tên hàng Noel được đo trên Sàn Cam và lời Điều phối nói dịp Noel.
4. **Given** câu chỉ có “trong tháng 11”, **When** Điều phối đọc, **Then** hệ thống hỏi tên hàng và không đi đo.
5. **Given** câu “Đánh giá dịp Tết” không có món, **When** Điều phối đọc, **Then** hệ thống hỏi món nào và không đi đo.
6. **Given** câu có cả dịp và tháng, **When** phiếu xong, **Then** dịp quyết định chữ gắn vào tên tìm, tháng vẫn hiện trong lời.

---

### User Story 10 - Trang báo cáo đọc được và không trộn tầng số (Priority: P1)

Mọi câu đã đo, kể cả câu một tên hàng, mở một trang cùng một khung. Trang có lời cửa sổ thời gian, các thẻ tổng, ảnh món, đường dẫn món, đường dẫn shop khi có mã shop, bảng nhiều cột, biểu đồ thị phần các shop dẫn đầu, và biểu đồ khoảng giá của đúng danh sách đang xem. Lời ngắn gửi Chủ tịch vẫn ngắn và trỏ tới trang này.

Khi sàn trả một khối tổng, thẻ tổng dùng số của khối đó: quy mô, doanh thu tích lũy, giá trung bình, giá thấp nhất, giá cao nhất, tỷ lệ có bán, độ tập trung, điểm chỗ trống, hoa hồng trung bình. Số tính từ danh sách món không được ghi đè các thẻ đó. Danh sách món và biểu đồ khoảng giá phải ghi là danh sách đang xem. Khi sàn trả thêm một nhịp khoảng 30 ngày của nhóm có lịch sử, trang tách nhịp đó khỏi nhịp tích lũy, và nói nhịp 30 ngày không phải tháng lịch được hỏi. Phần quà bị loại và lời “lượng bán có thể thấp hơn thực tế” hiện khi sàn trả các lời đó.

Món thiếu ảnh, thiếu điểm, hoặc thiếu hoa hồng thì ô đó trống. Trang không điền một điểm đánh giá cho có. Sàn không có khối tổng dùng cùng khung và ghi mọi số là của mẫu tìm được.

**Why this priority**: Trang hiện tại là một đoạn chữ và một bảng. Cùng một lần đo, trang đã lấy giá, độ tập trung và điểm chỗ trống của nhóm món đứng đầu rồi viết như số của cả thị trường. Sếp nhìn nhầm chỗ còn trống.

**Independent Test**: Đo lại “Thị trường kem chống nắng trong tháng 11” chỉ Sàn Cam. Thẻ giá thường gặp, độ tập trung và điểm chỗ trống khớp khối tổng của sàn, và khác với số tính trên danh sách món nếu hai bên khác nhau. Trang có ảnh, có hai nhịp thời gian, và câu tháng 11 vẫn không biến thành doanh thu của cả tháng.

**Acceptance Scenarios**:

1. **Given** sàn trả khối tổng và một danh sách món, **When** trang được dựng, **Then** thẻ quy mô, giá trung bình, độ tập trung và điểm chỗ trống lấy từ khối tổng, còn bảng món ghi là danh sách đang xem.
2. **Given** sàn trả cả nhịp tích lũy và nhịp khoảng 30 ngày, **When** câu có “tháng 11”, **Then** trang hiện hai nhịp và nói không nhịp nào là doanh thu riêng của tháng 11.
3. **Given** một món có ảnh và đường dẫn, **When** trang hiện món đó, **Then** ảnh bấm được tới đúng món và shop có đường dẫn khi có mã shop.
4. **Given** một món không có điểm đánh giá, **When** trang hiện món đó, **Then** ô điểm trống.
5. **Given** sàn không có khối tổng, **When** trang được dựng, **Then** mọi thẻ ghi là số của mẫu tìm được, và doanh thu ghi là ước tính khi sàn không trả doanh thu riêng.
6. **Given** câu hỏi lại, **When** Điều phối dừng, **Then** không có trang số liệu.

---

### Edge Cases

- Văn phòng đang chạy một câu thì câu mới nhận lời đang bận, câu cũ không bị cắt.
- Một sàn được chọn trả về lỗi: bài vẫn có số của sàn lấy được, bàn sàn lỗi hiện lỗi trên bản đồ, chỗ trống không bị điền số giả.
- Câu vừa có “top” vừa có “đánh giá”: làm đánh giá nếu câu chỉ vào một món, làm top nếu câu xin danh sách.
- Câu vừa xin báo cáo đầy đủ vừa có hai tên: làm báo cáo đầy đủ cho từng tên nếu câu nói rõ báo cáo, còn không thì ưu tiên kiểu đứng trước trong luật ưu tiên.
- “Cả 3 sàn”, “3 sàn”, “mọi sàn” được hiểu như đo cả ba.
- Nhắc “Shopee” hoặc “Sàn Cam” không tắt hai sàn kia và cũng không tắt Sàn Cam.
- Tên hàng sau khi bỏ lời thừa (nhập hàng, vốn, nhà cung cấp) còn rỗng thì hỏi lại.
- Mẫu sàn không có món nào: bài nói chưa lấy được món, không xếp hạng giả.
- “11.11” và “12.12” là dịp bán, khác với “trong tháng 11” và “trong tháng 12”.
- Câu vừa có dịp vừa có tháng: dịp gắn vào tên tìm, tháng vẫn được đọc trên phiếu và trong bài.
- Câu chỉ có tháng, không có tên hàng và không có ngành: hỏi lại tên, không đo.
- Câu đánh giá chỉ nêu dịp, không nêu món: hỏi lại món, không lấy danh sách dịp để đánh giá hộ.
- Khối tổng và danh sách món cho hai số khác nhau về giá, độ tập trung hoặc điểm chỗ trống: trang giữ số khối tổng trên thẻ, và có thể hiện số của danh sách ở mục riêng, có nhãn danh sách.
- Món không có ảnh hoặc không có điểm: ô trống, không dùng ảnh thay hay điểm giả.
- Shop chỉ có mã, không có tên trong danh sách món: hiện mã và đường dẫn ghép từ mã, không bịa tên shop.
- Hệ số tăng trưởng của món không kèm đơn vị: trang ghi nguyên số, không đổi thành phần trăm.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mỗi câu của Chủ tịch được gán đúng một kiểu: thị trường theo tên, ngành hàng, top sản phẩm, đánh giá một sản phẩm, so sánh, báo cáo đầy đủ, hoặc hỏi lại.
- **FR-002**: Luật ưu tiên khi một câu khớp nhiều kiểu: báo cáo đầy đủ, rồi so sánh hai tên, rồi đánh giá một món, rồi top, rồi ngành, rồi tên hàng, rồi hỏi lại.
- **FR-003**: Mọi phép đo đều gồm Sàn Cam.
- **FR-004**: Sàn Xanh chỉ được đo khi câu có “Lazada” hoặc “Sàn Xanh”, hoặc khi câu gọi cả ba sàn.
- **FR-005**: Sàn Đen chỉ được đo khi câu có “TikTok”, “TikTok Shop” hoặc “Sàn Đen”, hoặc khi câu gọi cả ba sàn.
- **FR-006**: “Cả ba sàn”, “ba sàn”, “3 sàn”, “tất cả sàn”, “mọi sàn”, “đa sàn”, và việc nhắc cả Sàn Xanh lẫn Sàn Đen, đều chọn cả ba sàn.
- **FR-007**: Hệ thống không hỏi xác nhận chi phí trước khi đo sàn được chọn.
- **FR-008**: Câu thị trường theo tên trả về quy mô, giá thường gặp, khoảng giá bán chạy, độ tập trung, chỗ còn trống, hoa hồng nếu sàn có, và các cụm tìm kèm.
- **FR-009**: Câu top trả về tối đa 10 món mỗi sàn đã đo, xếp theo doanh thu, kèm lời “top của mẫu vừa lấy”.
- **FR-010**: Câu đánh giá đặt một món cạnh mặt bằng của tên hàng, và không kết luận chất lượng từ lời bình.
- **FR-011**: Câu ngành so khoảng bốn tên hàng bằng cùng một bộ số, trên đúng các sàn đã chọn.
- **FR-012**: Câu so sánh trình hai tên trên hai cột cùng bộ số.
- **FR-013**: Câu báo cáo đầy đủ mở cùng trang ở FR-030, chỉ với các sàn đã chọn, và đường đi nằm trên mặt bằng v2.
- **FR-014**: Câu không đủ tên hoặc ngành nhận đúng một câu hỏi lại và không tạo bài số liệu.
- **FR-015**: Khi một câu đang chạy, câu mới nhận lời đang bận.
- **FR-016**: Lúc một câu v2 bắt đầu, mặt bằng đang xem chuyển sang mặt bằng v2 và bật nhìn đường giao việc trước khi nhân viên đầu tiên rời chỗ.
- **FR-017**: Đường giao việc sáng đúng một bàn câu hỏi. Năm bàn câu hỏi kia hiện “Đứng yên” và không đi lấy số.
- **FR-018**: Bàn Sàn Cam làm việc trên mọi phép đo. Bàn Sàn Xanh và Sàn Đen làm việc chỉ khi được chọn; bàn không được chọn hiện “Đứng yên” và không đi lấy số.
- **FR-019**: Đường không được đi thì không sáng. Đường được đi thì sáng.
- **FR-020**: Lời trên đầu Điều phối nêu kiểu câu và các sàn, đủ để đọc trên bản đồ.
- **FR-021**: Số trong bài lấy từ phép đo. Bước viết bài không bịa lượng bán, doanh thu, hay thứ hạng.
- **FR-022**: Sàn được chọn mà lỗi thì bài giữ sàn lấy được, bàn lỗi hiện lỗi, số thiếu để trống.
- **FR-023**: Bài gửi cho Chủ tịch gồm lời ngắn và một trang xem được. Thư ký hoàn tất sau khi lời đó đã gửi.
- **FR-024**: Mặt bằng săn hàng cũ vẫn nằm trong danh sách văn phòng.
- **FR-025**: Câu nêu một dịp (Tết, Noel hoặc Giáng sinh, Trung thu, khai giảng, 8/3, 20/10, Valentine, 11.11, 12.12, mùa hè) thì phiếu giữ dịp đó. Tên tìm trên sàn được gắn chữ của dịp khi tên gốc chưa có chữ đó.
- **FR-026**: Câu chỉ có dịp, không có tên hàng, được đo bằng vài tên hàng của dịp đó, trừ câu đánh giá và câu so sánh thiếu tên. Hai kiểu đó hỏi lại.
- **FR-027**: Câu nêu một tháng (tháng 1 đến tháng 12, tháng này, tháng tới, tháng trước) thì phiếu giữ tháng đó. Tên tìm không bị gắn số tháng. Bài nói số là số sàn trả lúc đo, không phải số riêng của cả tháng đó.
- **FR-028**: Câu chỉ có tháng, không có tên hàng và không có ngành, nhận một câu hỏi lại và không đi đo.
- **FR-029**: Lời trên đầu Điều phối nêu thời điểm khi câu có dịp hoặc tháng.
- **FR-030**: Mọi câu đã đo mở một trang cùng khung: lời cửa sổ, thẻ tổng, ảnh, đường dẫn món, đường dẫn shop khi có mã shop, bảng món, biểu đồ thị phần shop dẫn đầu, biểu đồ khoảng giá của danh sách đang xem. Câu hỏi lại không có trang này.
- **FR-031**: Khi sàn trả khối tổng, thẻ quy mô, doanh thu tích lũy, giá trung bình, biên giá, tỷ lệ có bán, độ tập trung, điểm chỗ trống và hoa hồng trung bình lấy từ khối đó. Số tính từ danh sách món không ghi đè các thẻ này.
- **FR-032**: Khi sàn trả một nhịp tích lũy và một nhịp khoảng 30 ngày của nhóm có lịch sử, trang tách hai nhịp. Nhịp 30 ngày không được viết thành tháng lịch trong câu hỏi.
- **FR-033**: Trang nêu số món quà và doanh thu quà bị loại khi sàn trả các số đó, và nêu lời lượng bán có thể thấp hơn thực tế khi sàn có lời đó.
- **FR-034**: Ảnh, điểm, hoa hồng, biên giá từng món, lượng bán 7 ngày, lượng bán 30 ngày và doanh thu 30 ngày chỉ hiện khi món có số. Thiếu thì để trống. Không điền điểm mặc định.
- **FR-035**: Biểu đồ khoảng giá và bảng món ghi là danh sách đang xem. Biểu đồ shop dùng danh sách shop dẫn đầu của khối tổng khi sàn trả danh sách đó, và nối tên shop từ các món đang xem.
- **FR-036**: Ngành hàng, hoa hồng tách người bán với sàn, và lịch sử giá gần nhất chỉ lấy cho nhóm nhỏ món đứng đầu, hoặc cho món đang được đánh giá. Không lấy chi tiết cho cả danh sách.
- **FR-037**: Sàn không có khối tổng dùng cùng khung và ghi mọi số là của mẫu tìm được. Doanh thu của mẫu là giá nhân lượt bán khi sàn không trả doanh thu riêng.
- **FR-038**: Lời gửi Chủ tịch vẫn là lời ngắn kèm đường dẫn. Trang nằm trong file, không nhét vào sự kiện trên bản đồ, và không thêm bàn mới.

### Key Entities

- **Câu hỏi**: Lời Chủ tịch gửi, nguyên văn.
- **Phiếu điều phối**: Kiểu câu, các sàn được chọn, các tên hàng đem đi đo, thời điểm (dịp hoặc tháng, có thể trống), lời hỏi lại nếu có.
- **Phiếu đo**: Với mỗi tên hàng và mỗi sàn, quy mô, giá, độ tập trung, chỗ còn trống, và danh sách món trong mẫu.
- **Bài trả lời**: Lời ngắn theo đúng kiểu câu, cộng một trang xem được theo FR-030 khi câu đã được đo.
- **Mặt bằng v2**: Các bàn cố định: tiếp nhận, điều phối, sáu bàn câu hỏi, ba bàn sàn, người viết bài, thư ký, camera. Đường giữa các bàn là các lối có thể sáng.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người đang xem bản đồ chỉ được bàn câu hỏi đang sáng và các bàn sàn đang làm việc trong vòng 10 giây sau khi Điều phối nói xong, không cần mở nhật ký.
- **SC-002**: Câu thị trường một tên hàng trả bài có đủ quy mô, giá, độ tập trung và cụm tìm kèm.
- **SC-003**: Mọi câu không nhắc Sàn Xanh và không nhắc Sàn Đen đều để hai bàn đó đứng yên và không lấy số của hai sàn đó.
- **SC-004**: Câu có “Lazada” hoặc “Sàn Xanh” làm cả bàn Sàn Cam và bàn Sàn Xanh đứng dậy.
- **SC-005**: Câu không có tên và không có ngành nhận một câu hỏi lại và không có trang số liệu.
- **SC-006**: Mặt bằng v2 đã hiện và đường giao việc đã bật trước bước đi đầu tiên, trên cả câu gửi từ nhóm trò chuyện lẫn câu bấm chạy trong văn phòng.
- **SC-007**: Câu xin báo cáo đầy đủ vẫn nhận một báo cáo dài, và báo cáo đó chỉ gồm sàn mà luật sàn đã chọn.
- **SC-008**: Câu “trong tháng 11” kèm một tên hàng không làm tên tìm thành tên có chữ tháng, và bài có câu về cửa sổ tháng. Câu “dịp Tết” kèm “hộp quà” tìm đúng cụm có chữ Tết.
- **SC-009**: Trên một lần đo có khối tổng, thẻ giá thường gặp, độ tập trung và điểm chỗ trống của trang khớp khối tổng. Nếu danh sách món cho ra ba số khác, trang không lấy ba số đó làm thẻ tổng. Trang có ảnh món và tách nhịp tích lũy khỏi nhịp khoảng 30 ngày.

## Assumptions

- Chủ tịch gửi câu vào cùng nhóm trò chuyện đang nối với văn phòng.
- Sàn Cam là bức tranh thị trường chính. Sàn Xanh và Sàn Đen là phần đo thêm khi câu nhắc tới. “Chỉ Sàn Xanh” hoặc “chỉ Sàn Đen” vẫn giữ Sàn Cam.
- Chi phí đo Sàn Xanh và Sàn Đen được chấp nhận. Không thêm cổng xác nhận.
- Danh mục ngành giữ khoảng 8 đến 12 ngành hay hỏi. Mỗi ngành khoảng bốn tên hàng. Ngành lạ được đề xuất tên từ cụm tìm liên quan; nếu không đề xuất được thì hỏi lại.
- Một câu chỉ một kiểu, theo FR-002.
- Lời thừa về nhập hàng, vốn, nhà cung cấp không được đem đi đo.
- Số hoa hồng, lịch sử, và người giới thiệu chỉ hiện khi sàn đó trả về. Chỗ không có số thì ghi là chưa có.
- Lượng tìm kiếm từ khóa không nằm trong bài, vì chưa có nguồn cho số đó.
- Sàn đang nối không lọc theo một tháng trong quá khứ hay tương lai. Dịp được đưa vào tên tìm. Tháng được ghi trên phiếu và trong bài. Bài không bịa doanh thu của cả tháng được hỏi.
- Trang của mọi câu đã đo là một khung mới, không phải bản báo cáo của mặt bằng cũ. Bản cũ vẫn mở được từ danh sách văn phòng. Khung mới không bịa điểm đánh giá, không lấy số của danh sách món để viết thành số toàn cục, và không biến tháng lịch thành doanh thu của tháng đó.
- Mặt bằng cũ giữ trong danh sách, không bị xóa.
