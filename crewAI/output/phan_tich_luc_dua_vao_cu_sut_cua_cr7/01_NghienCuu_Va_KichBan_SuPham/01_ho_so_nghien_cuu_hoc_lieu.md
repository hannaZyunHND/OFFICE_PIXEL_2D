# HỒ SƠ NGHIÊN CỨU HỌC LIỆU & PHÂN TÍCH NỘI DUNG KHOA HỌC
**Chủ đề bài giảng**: **Phân tích lực trong cú sút bóng đá**  
**Lĩnh vực / Môn học**: Vật lí — Cơ học  
**Đối tượng học sinh**: Học sinh THPT lớp 10 — Chương trình GDPT 2018  
**Tác nhân thực hiện**: `Research Specialist (agent_research_specialist)`  
**Engine AI sử dụng**: `gpt-6-luna (codex-cli)`

---

## 1. Hệ Thống Kiến Thức Cốt Lõi Cần Truyền Tải
- **Trụ cột 1**: Xác định hệ khảo sát là quả bóng và biểu diễn các lực tác dụng trong thời gian chân tiếp xúc với bóng.
- **Trụ cột 2**: Phân biệt lực trung bình trong thời gian va chạm với lực tức thời; lực là đại lượng vectơ và đơn vị là niutơn (N).
- **Trụ cột 3**: Dùng định lý xung lượng: xung lượng của hợp lực bằng độ biến thiên động lượng, với động lượng p = mv.
- **Trụ cột 4**: Khi có thể coi hợp lực không đổi, áp dụng định luật II Newton F = ma và liên hệ gia tốc trung bình với độ biến thiên vận tốc trong thời gian tiếp xúc.
- **Trụ cột 5**: Nhận diện giới hạn của mô hình: lực cản, độ biến dạng, hướng bóng, thời gian tiếp xúc và sai số đo ảnh hưởng đến kết quả.

## 2. Công Thức, Định Luật & Dữ Liệu Chuẩn Hóa (Fact-Checked Metrics)
- `Động lượng: p = mv; đơn vị kg·m/s.`
- `Định luật II Newton: hợp lực F = ma; đơn vị lực là N = kg·m/s².`
- `Xung lượng của hợp lực: J = F_tb·Δt = Δp = m(v_sau − v_trước), khi chọn cùng một trục xét.`
- `Lực trung bình theo độ biến thiên vận tốc: F_tb = m(v_sau − v_trước)/Δt; cần xét dấu hoặc chiều vectơ.`
- `Khối lượng quả bóng đá theo Luật 2 IFAB: 0,410–0,450 kg khi bắt đầu trận đấu.`
- `Ví dụ mô phỏng: m = 0,430 kg, bóng gần như đứng yên trước cú sút, v_sau = 30 m/s, Δt = 0,010 s thì F_tb ≈ 1,29 × 10³ N; đây là ước lượng theo mô hình, không phải số đo xác nhận cú sút của Cristiano Ronaldo.`

## 3. Định Hướng Sư Phạm & Trực Quan Cho 4 Luồng Siêu Prompt
1. **Câu hỏi / Tình huống dẫn nhập**: Khi Cristiano Ronaldo sút bóng, lực tác dụng lên bóng làm thay đổi chuyển động của bóng như thế nào và ta có thể ước lượng lực ấy từ những dữ liệu nào?
2. **Nhân vật & Bối cảnh minh họa**: Nhà khoa học sân cỏ Linh, mặc áo thể thao xanh đậm, cầm bảng vẽ vectơ lực và thước đo. đồng hành cùng Trợ lý AI Quỹ đạo, một thiết bị hình cầu nhỏ hiển thị đồ thị vận tốc, thời gian tiếp xúc và vectơ lực..
3. **Phân bổ cho 4 Luồng Prompt**:
   - **Luồng Slide Gamma (10 Slides)**:
   - Slide 1: Tình huống mở đầu — cú sút của Cristiano Ronaldo và câu hỏi lực làm thay đổi chuyển động của bóng ra sao.
   - Slide 2: Mục tiêu bài học, hệ khảo sát và quy ước chiều dương theo hướng bóng bay.
   - Slide 3: Nhận diện các lực tác dụng lên bóng; làm rõ lực chân tác dụng trong thời gian tiếp xúc.
   - Slide 4: Ôn động lượng p = mv và định luật II Newton F = ma.
   - Slide 5: Định lý xung lượng — liên hệ hợp lực, thời gian tác dụng và độ biến thiên động lượng.
   - Slide 6: Thu thập dữ liệu từ video hoặc tình huống mô phỏng: khối lượng, vận tốc trước và sau, thời gian tiếp xúc.
   - Slide 7: Giải ví dụ định lượng, đổi đơn vị và tính lực trung bình; biểu diễn chiều lực.
   - Slide 8: Thảo luận giả thiết, lực không đổi, các lực ngoài và nguồn sai số khi phân tích cú sút.
   - Slide 9: Hoạt động nhóm — thay đổi thời gian tiếp xúc hoặc vận tốc để so sánh lực trung bình, giải thích kết quả.
   - Slide 10: Phiếu kiểm tra nhanh, kết luận và câu hỏi vận dụng về cách làm tăng độ biến thiên động lượng.
   - **Luồng Phiếu Bài Tập (25 Câu)**: Kiểm tra đủ 3 cấp độ Nhận biết — Thông hiểu — Vận dụng qua 15 TN 4 lựa chọn, 5 Đúng/Sai chùm và 5 Tự luận.
   - **Luồng Infographic (7 Phân Khu)**: Hệ thống hóa công thức, sơ đồ cốt lõi và bẫy sai lầm thường gặp trên 1 mặt phẳng trực quan.
   - **Luồng Video Intro Google Flow (20 Footages — 100s)**: Trực quan hóa tình huống mở đầu khơi gợi tò mò khoa học kèm Transcript lời thoại tiếng Việt.
