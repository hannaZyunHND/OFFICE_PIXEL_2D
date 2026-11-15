URL kết nối: ws://localhost:8765/elearning-crew
# Thiết Kế Bài Giảng Điện Tử (E-Learning CrewAI — 9 Agents)

## Tổng Quan Hệ Thống CrewAI
Hệ thống Multi-Agent CrewAI chuyên trách chuyển hóa nội dung kiến thức môn học (Vật Lý, Địa Lý - Kinh tế biển, Khoa học Tự nhiên...) thành trọn bộ **Siêu Prompt Thiết Kế Bài Giảng Điện Tử Đa Phương Tiện** (10 Slide Gamma, Phiếu bài tập 25 câu hỏi đa dạng thức, Infographic trực quan, và Video Intro 20 Footages Google Flow kèm Transcript lời thoại), sau đó chạy thử kịch bản sư phạm, kiểm định QA và đóng gói thành Website Portal kèm gói `.ZIP` phân chia thư mục chuẩn.

## Danh Sách Tác Nhân (Agents)
1. **Research Specialist (Nghiên cứu Học liệu)** — Phân tích sâu nội dung đầu vào, bóc tách hệ thống khái niệm khoa học, số liệu thực tiễn và liên hệ thực tế
2. **Pedagogy Architect (Kiến trúc Sư phạm)** — Thiết kế ma trận mục tiêu bài học (GDPT 2018), cấu trúc hoạt động dạy học và phân bổ mạch kiến thức cho 4 học liệu
3. **Gamma Slide Engineer (Prompt 10 Slide Gamma)** — Xây dựng siêu Prompt tiếng Việt cho Gamma App gồm outline kiến thức chi tiết cho đúng 10 Slide, bố cục visual và câu hỏi tương tác
4. **Quiz Assessment Maker (Prompt Phiếu Bài Tập)** — Xây dựng siêu Prompt tiếng Việt thiết kế bộ 25 câu hỏi kiểm tra đánh giá (Trắc nghiệm 4 lựa chọn, Đúng/Sai 4 mệnh đề, Tự luận vận dụng và Bảng đáp án)
5. **Infographic Designer (Prompt Infographics)** — Xây dựng siêu Prompt tiếng Việt mô tả thiết kế Infographic phân tầng, bảng màu Hex, hệ thống icon, biểu đồ và khối dữ liệu trực quan
6. **Video Flow Director (Prompt Video Google Flow)** — Xây dựng siêu Prompt hồ sơ Nhân vật (Character), Giọng đọc (Voice), Văn phong + Chuỗi 20 Prompt mô tả 20 Footages Google Flow kèm Transcript lời thoại
7. **DryRun Scenario Tester (Kịch bản Chạy thử)** — Giả lập chạy thử kịch bản tiết dạy 45 phút, kiểm tra độ khớp nối thời lượng và trải nghiệm học sinh giữa Video Intro, 10 Slide, Infographic và Phiếu bài tập
8. **QA Quality Reviewer (QA Kiểm thử Học liệu)** — Kiểm định chất lượng học liệu độc lập, đối chiếu độ chi tiết của từng Prompt (đủ 10 slide Gamma, đủ 25 câu hỏi, đủ 20 footages Google Flow có lời thoại)
9. **DevOps Site Manager (Kiểm duyệt & Đóng gói ZIP)** — Kiểm duyệt xuất bản cuối cùng, phân chia cây thư mục chuẩn, nén gói `.ZIP` và dựng Website Portal tải trọn bộ học liệu

## Luồng Chuyển Giao Công Việc (DAG Edges)
- Research Specialist -> Pedagogy Architect: Hồ sơ Kiến thức & Số liệu cốt lõi
- Pedagogy Architect -> Gamma Slide Engineer: Ma trận Bài giảng -> Luồng 10 Slide
- Pedagogy Architect -> Quiz Assessment Maker: Ma trận Nhận thức -> Luồng 25 Câu hỏi
- Pedagogy Architect -> Infographic Designer: Cấu trúc Tư duy -> Luồng Infographic
- Pedagogy Architect -> Video Flow Director: Kịch bản Mở đầu -> Luồng 20 Footages
- Gamma Slide Engineer -> DryRun Scenario Tester: Siêu Prompt 10 Slide Gamma
- Quiz Assessment Maker -> DryRun Scenario Tester: Siêu Prompt Phiếu Bài Tập
- Infographic Designer -> DryRun Scenario Tester: Siêu Prompt Infographics
- Video Flow Director -> DryRun Scenario Tester: Siêu Prompt 20 Footages + Lời thoại
- DryRun Scenario Tester -> QA Quality Reviewer: Báo cáo Chạy thử Kịch bản 45p
- QA Quality Reviewer -> DevOps Site Manager: PASS Kiểm định -> Đóng gói Site & ZIP
