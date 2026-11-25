# Hợp đồng trang báo cáo

Một file `index.html` cho mọi câu đã đo. Câu hỏi lại không có file này. Trang tự chứa CSS và biểu đồ bằng thanh trong file, không thư viện ngoài. Nhiều sàn thì mỗi sàn một tab. Nhiều tên hàng thì mỗi tên một hàng tab phía trên. Bảng món phân trang 10 dòng, có ô tìm, lọc shop và tải CSV. Ảnh là đường dẫn do sàn trả, không phải ảnh vẽ thay.

Lời ngắn gửi Chủ tịch không đổi vai: vài câu và đường dẫn. Bản đồ không nhận nội dung trang.

## Khung, từ trên xuống

1. **Đầu trang.** Câu gốc. Kiểu câu. Sàn đã đo. Cửa sổ tháng hoặc dịp nếu phiếu có. Một câu: số là số lúc đo, không phải doanh thu riêng của tháng lịch được hỏi.
2. **Nguồn.** `live` hoặc `sandbox`. Với Sàn Cam có khối tổng: dữ liệu đã thu thập, không phải cả sàn; lượng bán có thể thấp hơn thực tế; số món quà và doanh thu quà bị loại.
3. **Hai nhịp, khi sàn trả cả hai.** Nhịp tích lũy và nhịp khoảng 30 ngày của nhóm có ít nhất 8 ngày lịch sử đứng thành hai hàng thẻ, không cộng vào nhau. Nhịp 30 ngày ghi độ phủ và nói không phải tháng trong câu hỏi.
4. **Thẻ toàn cục.** Quy mô món, số shop, lượt bán, doanh thu, giá trung bình, biên giá, tỷ lệ có bán, HHI, điểm chỗ trống, hoa hồng trung bình. Có khối tổng thì cả hàng này lấy từ khối tổng. Hoa hồng cao nhất chỉ là một chú thích “mức sàn trả cao nhất”, không phải mức nên kỳ vọng. Không có khối tổng thì hàng này ghi “số của mẫu tìm được”, và doanh thu ghi là ước tính khi bằng giá nhân lượt bán.
5. **Shop dẫn đầu.** Biểu đồ ngang thị phần doanh thu. Có `topShops` thì dùng danh sách đó, tên shop nối từ món đang xem, đường dẫn shop của Sàn Cam ghép từ mã shop. Shop không có tên thì hiện mã. Không có danh sách shop của khối tổng thì biểu đồ lấy shop trong mẫu và ghi nhãn mẫu.
6. **Khoảng giá của danh sách đang xem.** Sáu khoảng, cột là số món và doanh thu của danh sách, có nhãn “danh sách đang xem”, không ghi là toàn bộ hàng chục nghìn món. Khoảng bán chạy của danh sách không được đưa lên thẻ giá toàn cục.
7. **Đà bán.** Với các món có cả bán 7 ngày và bán 30 ngày: biểu đồ hai thanh trên nhóm đứng đầu. Không nhân 7 ngày ra một tháng.
8. **Bảng món.** Ảnh, tên, đường dẫn món, shop và đường dẫn shop, giá, biên giá, độ dao động giá, bán 7 ngày, bán 30 ngày, bán tích lũy, doanh thu 30 ngày, doanh thu tích lũy, điểm, hoa hồng, số ngày theo dõi, hệ số tăng trưởng ghi nguyên số. Ô thiếu để trống. Không có cột điểm nào mang số giả.
9. **Nhóm chi tiết.** Chỉ khi có `detail_items`: ngành, hoa hồng người bán, hoa hồng sàn, trần, đổi giá 7 ngày, đổi giá 30 ngày, phần trăm giảm, tồn. Nếu giá chi tiết khác giá trong danh sách, hiện cả hai.
10. **Sàn thứ hai và thứ ba.** Cùng các mục, mỗi sàn một tab. Tab không có khối tổng mở bằng dải “mẫu tìm kiếm”.
11. **Cụm tìm kèm.** Các chữ Serper và đường dẫn bài, không có biểu đồ lượt tìm.

So sánh và ngành xếp các chương theo từng tên, rồi một dải thẻ đặt cạnh nhau bằng cùng các chỉ số của mục 4. Top vẫn nói danh sách là top của mẫu đang xem.

## Cấm

- Lấy HHI, điểm chỗ trống, hoặc giá trung bình của danh sách món ghi lên thẻ toàn cục khi khối tổng đã có các số đó.
- Điền điểm đánh giá khi món không có điểm.
- Đổi hệ số tăng trưởng thành phần trăm.
- Vẽ lượng tìm kiếm, số người giới thiệu, hoặc tỷ lệ video với live khi nguồn không trả.
- Gọi nhịp 30 ngày là tháng 11, tháng 12, hoặc bất kỳ tháng nào trong câu hỏi.
- Nhét HTML này vào sự kiện bản đồ.
