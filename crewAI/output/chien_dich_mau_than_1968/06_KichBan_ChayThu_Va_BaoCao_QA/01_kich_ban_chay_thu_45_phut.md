# KỊCH BẢN CHẠY THỬ TIẾT HỌC 45 PHÚT (DRY-RUN CLASSROOM SIMULATION)
**Bài học**: **Chiến dịch Mậu Thân 1968**  
**Tác nhân thực hiện**: `DryRun Scenario Tester (agent_dryrun_scenario_tester)`

---

## 1. Bảng Điều Phối Thời Gian & Khớp Nối Học Liệu (45 Phút)
| Phút thứ | Hoạt động của Giáo viên | Hoạt động của Học sinh | Học liệu số kích hoạt | Kết quả giả lập chạy thử |
| :--- | :--- | :--- | :--- | :--- |
| **00:00 – 05:00** | Trình chiếu **Video Intro 20 Footages (100 giây)** và đặt câu hỏi mở đầu. | Quan sát hành trình của kỹ sư Hải Đăng qua 4 vùng biển, ghi nhanh 3 từ khóa ấn tượng. | `05_Prompt_Video_Intro_GoogleFlow_20Footages` | **Đạt 100%**: 20 cảnh x 5s = 100s vừa khít phần dẫn nhập, lời thoại khớp hình ảnh. |
| **05:00 – 25:00** | Giảng giải và tổ chức thảo luận 4 nhóm theo **Bộ 10 Slide Gamma**. | Nhóm 1: Bắc Bộ (Slide 4); Nhóm 2: Miền Trung (Slide 5); Nhóm 3: Đông Nam Bộ (Slide 6); Nhóm 4: ĐBSCL (Slide 7). | `02_Prompt_Slide_Gamma_10Slides` | **Đạt 100%**: Mỗi slide trung bình 2 phút, cấu trúc 10 slide không bị quá tải chữ. |
| **25:00 – 33:00** | Chiếu **Poster Infographic 7 Phân khu** để tổng kết và khắc sâu kiến thức. | Đối chiếu sản phẩm nhóm với bản đồ phân vùng và biểu đồ trên Infographic. | `04_Prompt_Infographics` | **Đạt 100%**: Bố cục 7 phân khu giúp học sinh hệ thống hóa ngay tại lớp. |
| **33:00 – 45:00** | Phát **Phiếu Bài Tập Đánh Giá 25 Câu** (Làm nhanh 10 câu trọng tâm tại lớp + 15 câu về nhà). | Làm bài cá nhân và chấm chéo phần Trắc nghiệm & Đúng/Sai. | `03_Prompt_Phieu_Bai_Tap_25Cau` | **Đạt 100%**: Phân hóa rõ 3 mức độ Nhận biết - Thông hiểu - Vận dụng. |
