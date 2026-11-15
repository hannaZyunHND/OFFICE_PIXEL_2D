# 🎮 Hướng Dẫn Tính Năng & Vận Hành — Pixel Agent Office

Tài liệu này tổng hợp đầy đủ các tính năng tương tác trên giao diện Web UI (`http://localhost:5173`) để bạn khai thác tối đa hệ thống.

---

## 1. Phòng Giám Đốc & Luồng Giao Việc (`DirectorEntity`)

- **Phòng Giám Đốc (`DIRECTOR` zone)**: Tự động bố trí riêng bàn Giám đốc (`DIRECTOR_DESK`) cùng nhân vật **Giám đốc (Sếp)** đeo vương miện vàng (`director_ceo`).
- **Hành vi tự chủ (`AUTONOMOUS` mode)**: Khi rảnh, Giám đốc đi dạo ngẫu nhiên trong văn phòng, ghé bàn các nhân viên đang làm việc để hỏi thăm tiến độ, hoặc ra khu giải trí/sinh thái chơi các món đồ nội thất (`PS5_PES_STATION`, `KOI_POND`, `COFFEE_MACHINE`...).
- **Luồng giao việc (`BRIEFING` mode)**: Khi bạn nhập yêu cầu ở thanh điều khiển phía dưới và bấm gửi, Giám đốc chuyển sang trạng thái chỉ đạo, Agent đầu tiên của luồng sẽ bước tới nhận nhiệm vụ qua bong bóng hội thoại trước khi đội ngũ bắt đầu chạy Crew.

---

## 2. Văn Phòng Sống Động & 105 Kịch Bản Drama ([officeBanterScripts.ts](../src/data/officeBanterScripts.ts))

Khi không có tác vụ AI nào đang chạy hoặc sau khoảng thời gian rảnh tại bàn:
- **Chu kỳ Làm việc ↔ Giải lao**: Nhân viên ngồi bàn làm việc một lúc (có biểu tượng hoạt động đáng yêu như **chơi LoL**, **hát hò**, **ngáp ngủ**) rồi mới xin phép đi giải lao, chơi một lượt tại khu tiện ích rồi **bắt buộc quay trở lại bàn làm việc của mình**, tránh tình trạng "cắm rễ" vĩnh viễn ở Pantry.
- **Chơi nhóm 2–3 người tại nội thất lớn**: Các vật phẩm lớn (như **máy PS5 PES `PS5_PES_STATION`**, bàn Bi-a `POOL_TABLE`, Bóng bàn `PING_PONG_TABLE`, Bi lắc `FOOSBALL_TABLE`, Hồ cá Koi, Khu Sinh Thái, Karaoke...) cho phép 2–3 Agent rủ nhau tụ tập chơi chung.
- **105 Kịch bản Banter tiếng Việt** thuộc 4 nhóm chủ đề:
  1. `SPORTS_PES` — Gáy bẩn khi đá PS5 PES, bida, bóng bàn, bi lắc.
  2. `NATURE_PHILOSOPHY` — Triết lý nhân sinh, ngắm cá Koi, vườn thiền, hoa anh đào.
  3. `FOOD_PANTRY` — Khen chê cà phê, trà sữa, mì Ramen, tủ lạnh pantry.
  4. `CHITCHAT_LOL` — Rủ leo rank Liên Minh Huyền Thoại, tám chuyện deadline & sếp.

---

## 3. Bong Bóng Chat Drama Kiểu Messenger ([MessengerDramaBubble.vue](../src/components/hud/MessengerDramaBubble.vue))

- Đặt tại **góc dưới bên phải** màn hình, tách biệt khỏi bản đồ văn phòng.
- **Giải quyết vấn đề che chữ trên đầu nhân vật**: Mọi câu thoại dài của nhân viên, hội thoại sếp và log công việc đều được gom thành luồng chat có avatar màu, tên nhân vật và thời gian.
- **Bộ lọc nhanh**:
  - `Tất cả`: Xem toàn bộ dòng chảy văn phòng.
  - `🎭 Drama`: Chuyên xem các màn gáy bẩn PS5, chém gió Pantry.
  - `👑 Sếp`: Chỉ xem chỉ đạo và bình luận của Giám đốc.
  - `⚙️ Việc`: Theo dõi bước chạy tác vụ & bàn giao của Agents.
- Hỗ trợ thu gọn thành nút tròn nổi kèm **huy hiệu đếm tin chưa đọc**, tự động cuộn xuống tin mới nhất (ghim đáy).

---

## 4. Kho 56 Pixel Avatar & Trình Biên Tập Nhân Vật ([AgentInspectorDrawer.vue](../src/components/inspector/AgentInspectorDrawer.vue), [AgentAppearanceEditor.vue](../src/components/inspector/AgentAppearanceEditor.vue))

Nhấp chuột trực tiếp vào **bất kỳ nhân viên nào** trên bản đồ (hoặc chọn trên thanh danh sách nhân sự) để mở Drawer thanh tra bên phải:

- Bấm nút **`Đổi tên / Avatar`** để mở trình biên tập ngoại hình:
  1. **Đổi tên trực tiếp**: Nhập tên mới vào ô `Tên nhân viên` và nhấn `Enter` hoặc **`Lưu`**.
  2. **Đổi màu đồng phục / vòng chọn**: Chọn nhanh từ 8 mã màu nổi bật.
  3. **Kho 56 Pixel Avatar** chia làm 5 danh mục:
     - `🎭 Con người (18)`: 6 mẫu cơ bản + Thể hình Gym Bro, Đầu bếp, Bartender, Ninja, Phi hành gia, Hải tặc, Rockstar, Thám tử, Hiệp sĩ, Pháp sư, Barista, Bác sĩ.
     - `🐾 Động vật (13)`: Gà trống, Mèo cam, Corgi, Gấu trúc, Ếch Pepe, Chim cánh cụt mặc vest, Shiba, T-Rex, Cá mập mặc vest, Vịt vàng, Cáo đỏ, Thỏ trắng, Capybara đội quýt.
     - `🤖 Robot (8)`: Robot CRT, Mecha Vàng, Cyborg Neon, Bot tròn một mắt, Robot hầu bàn, Đầu TV, Droid trắng cam, Robot Steampunk.
     - `⚡ Anime / Hero (9)`: Ninja tóc vàng, Siêu Saiyan aura vàng, Mũ rơm, Chú thuật sư bịt mắt, Thiếu nữ phép thuật, Mèo máy chuông vàng, Chuột điện má đỏ, Siêu anh hùng áo choàng, Slime đội vương miện.
     - `🧋 Đồ vật hài (8)`: Xương rồng đeo kính, Ly trà sữa trân châu, Cuộn giấy vệ sinh, Cà phê bốc khói, Chuối mặc cà vạt, Nấm đỏ, Bánh mì nướng bơ, Cục pin 100%.
  4. **Tìm kiếm & Random**: Lọc theo tên/từ khóa hoặc bấm **`Random`** để xoay ngay ngoại hình mới.
- **Random khi tạo mới**: Khi biên dịch quy trình mới từ Markdown/Chat prompt, mỗi nhân viên tự động nhận một avatar ngẫu nhiên không trùng từ kho 56 mẫu (`pickRandomAgentAvatarId`).
- **Cập nhật tức thì & Lưu SQLite**: Diện mạo và tên thay đổi ngay lập tức trên canvas **không làm ngắt quãng di chuyển** và được đồng bộ thẳng vào bảng `workflows` trong SQLite.

---

## 5. Trình Chỉnh Sửa Văn Phòng (`MapEditorToolbar`) & 51 Nội Thất

Nhấn phím **`E`** hoặc nút **Edit Mode** trên thanh Top Bar để bật chế độ thiết kế văn phòng:

- **Kho 51 vật phẩm (`FURNITURE_CATALOG`)** chia 5 nhóm:
  1. `🌿 Khu Sinh Thái (Cỡ Lớn)`: Đại Khu Sinh Thái 4×3 (`ECO_BIOME_DOME`), Hồ Cá Koi 3×2, Vườn Thiền, Nhà Kính, Cây Anh Đào, Đài Phun Nước...
  2. `🤖 Chạy Nhảy / Robot`: Mèo Văn Phòng (`OFFICE_CAT`), Cún Corgi (`CORGI_DOG`), Robot Hút Bụi (`ROBOT_VACUUM`), Chó Robot, Drone mini, Xe đua RC, Bot giao đồ ăn... (tự động đi/nhảy quanh sàn).
  3. `🎱 Giải Trí / Bi-a`: Máy PS5 đá PES (`PS5_PES_STATION`), Bàn Bi-a, Bóng bàn, Máy Game Thùng, Bi lắc, Phi tiêu, Gắp thú, Pinball, Kính VR, Phòng Karaoke, Bàn Cờ Vua.
  4. `🍸 Quầy Bar / Bếp`: Máy pha cà phê, Quầy Mini Bar, Lò vi sóng, Máy bán nước, Cây lọc nước, Tủ lạnh đôi, Xe bắp rang, Tủ kem, Quầy mì Ramen, Lò Pizza.
  5. `🖥️ Công Nghệ / VP`: Tủ Server, Quả cầu Hologram, Bảng trắng, Kệ sách, Máy in 3D, Màn hình Telepresence, Jukebox...
- **Thao tác chỉnh sửa từng vật phẩm**:
  - **Kéo-thả** trực tiếp vật phẩm đến ô trống mới trên lưới.
  - **Xoay hướng thật**: Xoay theo 4 hướng (`DOWN`, `LEFT`, `UP`, `RIGHT`), tự động hoán đổi chiều rộng × chiều cao (`footprint`) và vẽ lại đồ họa đúng mặt trước + điểm đứng tương tác.
  - **Phóng to / Thu nhỏ tỉ lệ**: Điều chỉnh tỉ lệ `0.75x`, `1x`, `1.25x`, `1.5x`, `2x`, `2.5x`, `3x` theo đúng tỉ lệ khung lưới.
  - Mọi thay đổi được lưu thẳng về SQLite (`syncActiveBlueprintToSqlite`).

---

## 6. Lịch Sử Phiên Chạy (`RunHistoryModal`) & Trình Biên Dịch Workflow (`MarkdownCompilerModal`)

- **Lịch Sử Chạy (Top Bar → `Lịch Sử Chạy`)**:
  - Lưu mọi phiên chạy vào SQLite (`crew_runs` & `crew_run_events`): thời gian, prompt gốc, tệp đính kèm, LLM engine sử dụng, tổng tokens, điểm QA, lỗi chi tiết và log từng bước.
  - Bấm mở trực tiếp kết quả HTML/Portal, tải gói `.ZIP`, hoặc bấm **Nạp lại Prompt** để chạy lại nhanh.
- **Quy Trình & Kết Nối CrewAI (`MarkdownCompilerModal`)**:
  - Quản lý danh sách nhiều Workflow/Phòng ban lưu trong SQLite.
  - Dán Markdown / sơ đồ ASCII hoặc gõ yêu cầu để tạo phòng ban mới (hỗ trợ Gemini API, OpenAI API và Offline Parser).
  - Xem trực tiếp JSON `OfficeBlueprint` và tài liệu code Python SDK tích hợp riêng cho phòng ban đó.

---

## 7. Phím Tắt & Điều Khiển Camera

| Thao tác / Phím | Chức năng |
| :--- | :--- |
| **`Tab`** | Bật / Tắt chế độ **God-View** (hiện đường nối luồng DAG phát sáng & vòng chọn các Agent). |
| **`E`** | Bật / Tắt **Edit Mode** (mở Map Editor để thêm, xóa, kéo-thả, xoay và phóng tỉ lệ nội thất). |
| **`Esc`** | Đóng Modal đang mở → hoặc bỏ chọn Agent trong Inspector → hoặc thoát Edit Mode. |
| **Giữ Chuột Trái / Giữa + Kéo** | Pan (kéo di chuyển) camera quanh văn phòng *(khi không kéo nội thất trong Edit Mode)*. |
| **Cuộn Chuột (Wheel)** | Zoom In / Out (`0.65x` đến `4.0x`). |
| **Click vào Agent** | Mở `AgentInspectorDrawer` để xem telemetry, payload JSON, ring buffer, đổi tên và chọn 56 Avatar. |
| **`Enter`** *(trong ô Chat Dispatch)* | Gửi yêu cầu thực thi tới CrewAI Bridge (`Shift + Enter` để xuống dòng). |
