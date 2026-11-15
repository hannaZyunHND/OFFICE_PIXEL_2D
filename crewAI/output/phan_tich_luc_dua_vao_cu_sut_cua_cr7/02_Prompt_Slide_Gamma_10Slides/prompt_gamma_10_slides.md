# SIÊU PROMPT TIẾNG VIỆT TẠO BÀI GIẢNG 10 SLIDE TRÊN GAMMA.APP
**Chủ đề**: **Phân tích lực trong cú sút bóng đá**  
**Tác nhân thiết kế**: `Gamma Slide Engineer (agent_gamma_slide_engineer)`  
**Engine AI**: `gpt-6-luna (codex-cli)`  
**Hướng dẫn sử dụng**: Copy toàn bộ khối prompt trong khung bên dưới và dán vào Gamma.app (**Create new AI -> Paste in text / Prompt**) để sinh bộ bài giảng đúng 10 slide chuẩn sư phạm.

```markdown
## THIẾT LẬP TỔNG THỂ

Tạo bài giảng điện tử **đúng 10 slide**, bằng tiếng Việt chuẩn, có dấu đầy đủ, dành cho **học sinh THPT lớp 10, môn Vật lí — Cơ học, theo Chương trình GDPT 2018**.

**Vai trò AI:** Bạn là kiến trúc sư thiết kế bài giảng điện tử và chuyên gia Gamma.app, đồng thời là giáo viên Vật lí chính xác, dễ hiểu. Hãy triển khai mạch bài từ câu hỏi thực tế đến mô hình, công thức, ví dụ, giới hạn và vận dụng. Chỉ dùng nội dung thuộc chủ đề **phân tích lực trong cú sút bóng đá**.

**Tỉ lệ:** 16:9, phù hợp trình chiếu trong lớp học.

**Bảng màu:** xanh sân cỏ đậm `#123B2A`, xanh lá `#2E8B57`, trắng `#FFFFFF`, vàng nhấn `#F2C14E`, xám nền `#F3F5F4`. Bảo đảm tương phản rõ, tránh nền rối.

**Layout Grid/Cards:** Dùng lưới nhất quán, khoảng trắng thoáng; phối hợp thẻ nội dung, sơ đồ vectơ, trục thời gian và vùng tính toán. Mỗi slide có một ý chính, phân cấp nội dung rõ ràng, không nhồi chữ.

**Typography:** Tiêu đề sans-serif đậm, lớn; nội dung sans-serif dễ đọc; công thức trình bày riêng, ký hiệu nhất quán. Giữ nguyên đơn vị SI, chỉ rõ chiều hoặc dấu khi xét vận tốc và lực.

**Nhân vật xuyên suốt:** Nhà khoa học sân cỏ **Linh**, mặc áo thể thao xanh đậm, cầm bảng vẽ vectơ lực và thước đo. Trợ lý AI **Quỹ đạo** là thiết bị hình cầu nhỏ, hiển thị đồ thị vận tốc, thời gian tiếp xúc và vectơ lực. Dùng hai nhân vật để dẫn dắt, không để hình ảnh lấn át kiến thức.

**Quy tắc nội dung:** Không khẳng định ví dụ mô phỏng là số đo cú sút thật của Cristiano Ronaldo. Phân biệt rõ lực trung bình với lực tức thời; lực và vận tốc là đại lượng vectơ. Dùng ký hiệu \(F_{\text{tb}}\) cho độ lớn lực trung bình theo trục đang xét; khi nói đến chiều, biểu diễn bằng dấu hoặc vectơ.

### SLIDE 1: Cú sút làm bóng đổi chuyển động ra sao?

- **Bố cục (Layout & Cards):** Một ảnh sân bóng chiếm khoảng hai phần ba slide; bên cạnh là thẻ câu hỏi dẫn nhập và một dải nhỏ giới thiệu Linh cùng trợ lý Quỹ đạo.
- **Nội dung trọng tâm & Số liệu/Công thức:** Khi Cristiano Ronaldo sút bóng, lực của chân tác dụng lên bóng trong thời gian tiếp xúc có thể làm vận tốc của bóng thay đổi. Câu hỏi dẫn nhập: **Lực tác dụng lên bóng làm thay đổi chuyển động như thế nào, và ta có thể ước lượng lực ấy từ những dữ liệu nào?** Chưa nêu con số lực thật.
- **Tương tác / Câu hỏi lớp học:** Theo em, để bóng đang đứng yên bay đi, cần biết những đại lượng nào ngoài khối lượng bóng?
- **[Prompt ảnh minh họa / Sơ đồ]:** Cảnh cầu thủ thực hiện cú sút trên sân bóng, bóng rời chân theo một hướng rõ ràng; Linh quan sát bằng thước đo, Quỹ đạo hiển thị mũi tên vận tốc. Phong cách giáo dục khoa học hiện đại, không chèn chữ sai lên ảnh.

### SLIDE 2: Mục tiêu, hệ khảo sát và quy ước chiều

- **Bố cục (Layout & Cards):** Ba thẻ mục tiêu ở phía trên; nửa dưới là sơ đồ quả bóng được khoanh làm hệ khảo sát, kèm trục một chiều hướng theo chiều bóng bay.
- **Nội dung trọng tâm & Số liệu/Công thức:** Sau bài học, học sinh có thể: xác định hệ khảo sát là **quả bóng**; nhận diện các lực trong thời gian chân tiếp xúc; dùng động lượng và định lý xung lượng để ước lượng lực trung bình; nêu giả thiết và giới hạn của mô hình. Quy ước chiều dương cùng hướng bóng bay sau cú sút.
- **Tương tác / Câu hỏi lớp học:** Nếu chọn chiều dương ngược hướng bóng bay, đại lượng nào trong phép tính sẽ đổi dấu?
- **[Prompt ảnh minh họa / Sơ đồ]:** Sơ đồ tối giản quả bóng được viền sáng và ghi “Hệ khảo sát: bóng”; trục \(+x\) chỉ theo hướng bóng bay. Vẽ chân bên ngoài hệ để phân biệt vật tương tác với hệ khảo sát.

### SLIDE 3: Những lực nào tác dụng lên bóng?

- **Bố cục (Layout & Cards):** Sơ đồ bóng ở giữa, xung quanh là các nhãn lực; đặt thẻ nhấn “Trong thời gian tiếp xúc” bên cạnh hình chân chạm bóng.
- **Nội dung trọng tâm & Số liệu/Công thức:** Trong mô hình, các lực có thể gồm trọng lực \(P=mg\), lực đỡ của mặt sân nếu bóng còn tiếp xúc sân, lực cản không khí và lực của chân trong thời gian chân tiếp xúc bóng. Lực của chân chỉ tác dụng trong khoảng tiếp xúc; không mặc định các lực khác bằng không. Hợp lực là tổng vectơ các lực tác dụng lên bóng.
- **Tương tác / Câu hỏi lớp học:** Trong khoảnh khắc chân đang chạm bóng, lực nào tạo tác dụng nổi bật làm bóng tăng tốc theo hướng sút?
- **[Prompt ảnh minh họa / Sơ đồ]:** Sơ đồ vật tự do của quả bóng: mũi tên trọng lực hướng xuống, lực đỡ hướng lên nếu bóng chạm sân, lực cản ngược chiều chuyển động và lực chân theo hướng sút trong giai đoạn tiếp xúc. Dùng chú giải màu, không bỏ mũi tên hoặc gắn sai điểm đặt.

### SLIDE 4: Động lượng và định luật II Newton

- **Bố cục (Layout & Cards):** Hai thẻ công thức đặt cạnh nhau; bên dưới là ví dụ trực quan bóng trước và sau cú sút với vectơ vận tốc.
- **Nội dung trọng tâm & Số liệu/Công thức:** Động lượng: \(\vec p=m\vec v\), đơn vị \(\mathrm{kg\cdot m/s}\). Định luật II Newton: \(\vec F_{\text{hợp}}=m\vec a\), đơn vị lực là niutơn: \(1\,\mathrm N=1\,\mathrm{kg\cdot m/s^2}\). Động lượng cùng hướng với vận tốc; lực và gia tốc cùng hướng với nhau. Với khối lượng không đổi, hợp lực gây ra sự biến đổi vận tốc.
- **Tương tác / Câu hỏi lớp học:** Nếu khối lượng bóng không đổi nhưng vận tốc đổi cả độ lớn lẫn hướng, động lượng thay đổi ra sao?
- **[Prompt ảnh minh họa / Sơ đồ]:** Hai khung “trước sút” và “sau sút” cùng một quả bóng; khung trước có vectơ vận tốc nhỏ hoặc bằng không, khung sau có vectơ dài theo hướng bay. Đặt công thức \(p=mv\) và \(F=ma\) rõ ràng cạnh hình.

### SLIDE 5: Định lý xung lượng — lực tác dụng trong bao lâu?

- **Bố cục (Layout & Cards):** Một dải thời gian tiếp xúc nối từ “chân chạm bóng” đến “bóng rời chân”; dưới dải là chuỗi công thức và sơ đồ \(\vec F_{\text{hợp}}\rightarrow\Delta\vec p\).
- **Nội dung trọng tâm & Số liệu/Công thức:** Xung lượng của hợp lực bằng độ biến thiên động lượng: \(\vec J=\Delta\vec p=m(\vec v_{\text{sau}}-\vec v_{\text{trước}})\). Nếu dùng lực trung bình trong khoảng tiếp xúc: \(\vec J=\vec F_{\text{hợp,tb}}\Delta t\), do đó \(\vec F_{\text{hợp,tb}}\Delta t=\Delta\vec p\). Xung lượng có đơn vị \(\mathrm{N\cdot s}\), tương đương \(\mathrm{kg\cdot m/s}\).
- **Tương tác / Câu hỏi lớp học:** Với cùng độ biến thiên động lượng, nếu thời gian tiếp xúc dài hơn thì độ lớn lực trung bình thay đổi thế nào?
- **[Prompt ảnh minh họa / Sơ đồ]:** Đồ thị lực theo thời gian trong một khoảng tiếp xúc ngắn; đường lực có thể biến thiên, còn một đường ngang biểu diễn lực trung bình tạo cùng xung lượng. Không thể hiện lực tức thời bằng lực trung bình.

### SLIDE 6: Cần những dữ liệu nào để ước lượng lực?

- **Bố cục (Layout & Cards):** Bốn thẻ dữ liệu xếp thành lưới: khối lượng, vận tốc trước, vận tốc sau, thời gian tiếp xúc; cạnh đó là quy trình thu thập từ video hoặc tình huống mô phỏng.
- **Nội dung trọng tâm & Số liệu/Công thức:** Cần đo hoặc biết \(m\), \(\vec v_{\text{trước}}\), \(\vec v_{\text{sau}}\), \(\Delta t\). Theo Luật 2 IFAB, khối lượng bóng khi bắt đầu trận đấu nằm trong khoảng **0,410–0,450 kg**. Từ video, có thể ước lượng vận tốc qua quãng đường và thời gian giữa các khung hình; thời gian tiếp xúc cũng cần được xác định từ video tốc độ cao hoặc dữ liệu mô phỏng. Ghi rõ sai số và quy đổi về đơn vị SI.
- **Tương tác / Câu hỏi lớp học:** Nếu video không đủ rõ để xác định chính xác thời điểm bóng rời chân, dữ liệu nào và kết quả ước lượng sẽ bị ảnh hưởng?
- **[Prompt ảnh minh họa / Sơ đồ]:** Giao diện phân tích video với các khung hình trước, trong và sau va chạm; Quỹ đạo đánh dấu thời điểm tiếp xúc, đo thời gian và hiển thị vận tốc. Thêm thẻ khối lượng “0,410–0,450 kg — Luật 2 IFAB”.

### SLIDE 7: Ví dụ mô phỏng — tính lực trung bình

- **Bố cục (Layout & Cards):** Thẻ dữ kiện bên trái, các bước tính ở giữa, kết quả và vectơ lực ở bên phải; làm nổi bật nhãn “Mô phỏng”.
- **Nội dung trọng tâm & Số liệu/Công thức:** Cho \(m=0{,}430\,\mathrm{kg}\), bóng gần như đứng yên trước cú sút nên \(v_{\text{trước}}\approx0\,\mathrm{m/s}\); \(v_{\text{sau}}=30\,\mathrm{m/s}\); \(\Delta t=0{,}010\,\mathrm{s}\). Chọn chiều dương theo hướng bóng bay: \(\Delta v=30-0=30\,\mathrm{m/s}\). Khi dùng lực trung bình của **hợp lực** theo trục xét: \[F_{\text{hợp,tb}}=\frac{m\Delta v}{\Delta t}=\frac{0{,}430\times30}{0{,}010}=1290\,\mathrm N\approx1{,}29\times10^3\,\mathrm N.\] Kết quả hướng theo chiều dương đã chọn. Đây là ước lượng theo mô hình, **không phải số đo xác nhận cú sút của Cristiano Ronaldo**.
- **Tương tác / Câu hỏi lớp học:** Nếu thời gian tiếp xúc tăng gấp đôi mà độ biến thiên vận tốc giữ nguyên, lực trung bình theo mô hình sẽ bằng bao nhiêu?
- **[Prompt ảnh minh họa / Sơ đồ]:** Bảng tính có đủ đơn vị ở từng dòng; quả bóng với vectơ lực trung bình hướng về phía trước. Gắn nhãn “Ví dụ mô phỏng — không phải dữ liệu đo cú sút thật”.

### SLIDE 8: Mô hình có những giả thiết và giới hạn nào?

- **Bố cục (Layout & Cards):** Hai cột “Giả thiết của phép tính” và “Nguồn sai số, giới hạn”; đặt sơ đồ lực nhỏ ở cuối slide.
- **Nội dung trọng tâm & Số liệu/Công thức:** \(F_{\text{tb}}=m\Delta v/\Delta t\) cho **hợp lực trung bình** theo trục xét. Công thức dựa trên định lý xung lượng; không đòi hỏi lực tức thời không đổi. Nếu áp dụng \(F=ma\) với một giá trị lực không đổi, đó là mô hình đơn giản hóa; gia tốc trung bình theo trục là \(a_{\text{tb}}=(v_{\text{sau}}-v_{\text{trước}})/\Delta t\). Lực chân trung bình không nhất thiết bằng hợp lực trung bình nếu các lực khác đáng kể. Kết quả chịu ảnh hưởng của lực cản, độ biến dạng bóng, hướng chuyển động, cách xác định thời gian tiếp xúc và sai số đo vận tốc, khối lượng.
- **Tương tác / Câu hỏi lớp học:** Vì sao không thể kết luận lực tức thời ở mọi thời điểm đúng bằng \(1{,}29\times10^3\,\mathrm N\) từ ví dụ?
- **[Prompt ảnh minh họa / Sơ đồ]:** Đồ thị lực theo thời gian có đường cong thay đổi và một mức lực trung bình; kèm các biểu tượng nhỏ cho lực cản, bóng biến dạng và sai số khung hình.

### SLIDE 9: Hoạt động nhóm — thời gian và vận tốc ảnh hưởng thế nào?

- **Bố cục (Layout & Cards):** Bảng nhóm ba tình huống cùng khối lượng \(0{,}430\,\mathrm{kg}\), chia cột cho \(v_{\text{sau}}\), \(\Delta t\), \(\Delta v\), \(F_{\text{hợp,tb}}\); ô trống để học sinh điền.
- **Nội dung trọng tâm & Số liệu/Công thức:** Giả sử bóng gần như đứng yên trước va chạm và chiều dương theo hướng bóng bay. Tình huống A: \(v_{\text{sau}}=20\,\mathrm{m/s}\), \(\Delta t=0{,}010\,\mathrm{s}\), \(F_{\text{tb}}=860\,\mathrm N\). Tình huống B: \(v_{\text{sau}}=30\,\mathrm{m/s}\), \(\Delta t=0{,}010\,\mathrm{s}\), \(F_{\text{tb}}=1290\,\mathrm N\). Tình huống C: \(v_{\text{sau}}=30\,\mathrm{m/s}\), \(\Delta t=0{,}020\,\mathrm{s}\), \(F_{\text{tb}}=645\,\mathrm N\). Dùng \(F_{\text{tb}}=m(v_{\text{sau}}-v_{\text{trước}})/\Delta t\). Đây là các giá trị mô phỏng; lực trung bình tăng khi độ biến thiên vận tốc tăng, và giảm khi thời gian tiếp xúc tăng, nếu các đại lượng còn lại giữ nguyên.
- **Tương tác / Câu hỏi lớp học:** Mỗi nhóm giải thích một so sánh: vì sao B lớn hơn A, hoặc vì sao C nhỏ hơn B? Nêu rõ đại lượng nào được giữ nguyên.
- **[Prompt ảnh minh họa / Sơ đồ]:** Bảng so sánh ba tình huống với thanh biểu diễn lực trung bình tỉ lệ \(860\), \(1290\), \(645\,\mathrm N\); đồ họa rõ ràng, không làm người xem hiểu đây là số liệu cú sút thực.

### SLIDE 10: Kiểm tra nhanh, kết luận và vận dụng

- **Bố cục (Layout & Cards):** Ba câu kiểm tra nhanh ở một bên; bên còn lại là thẻ kết luận công thức và câu hỏi vận dụng cuối bài.
- **Nội dung trọng tâm & Số liệu/Công thức:** Kiểm tra nhanh: (1) Động lượng được tính bằng công thức nào và có đơn vị gì? (2) Xung lượng của hợp lực liên hệ với đại lượng nào? (3) Với cùng \(\Delta p\), tăng \(\Delta t\) làm lực trung bình thay đổi thế nào? Kết luận: \(\vec p=m\vec v\); \(\vec F_{\text{hợp,tb}}\Delta t=\Delta\vec p\); theo một trục, \(F_{\text{hợp,tb}}=m(v_{\text{sau}}-v_{\text{trước}})/\Delta t\). Luôn nêu chiều hoặc dấu và giới hạn của dữ liệu.
- **Tương tác / Câu hỏi lớp học:** Trong một tình huống va chạm bóng đá, em có thể làm tăng độ biến thiên động lượng bằng cách nào? Hãy giải thích dựa trên khối lượng, vận tốc và hướng chuyển động.
- **[Prompt ảnh minh họa / Sơ đồ]:** Infographic tổng kết từ dữ liệu \(m, v_{\text{trước}}, v_{\text{sau}}, \Delta t\) đến \(\Delta p\) và lực trung bình; Linh cùng Quỹ đạo chỉ vào sơ đồ, giữ công thức và đơn vị dễ đọc.
```
