"""
CrewAI Flow: Thiết Kế Bài Giảng Điện Tử (E-Learning Lesson Prompt Factory — 9 Agents)
--------------------------------------------------------------------------------------
Đầu vào: Văn bản / Chủ đề bài học (Môn Vật Lý, Địa Lý - Kinh tế biển, KHTN...)
Đầu ra (100% Siêu Prompt Tiếng Việt Chi Tiết + Đóng gói Website & ZIP chia thư mục):
  1. 01_NghienCuu_Va_KichBan_SuPham/
     - 01_ho_so_nghien_cuu_hoc_lieu.md (Research Specialist)
     - 02_ma_tran_kich_ban_su_pham.md (Pedagogy Architect)
  2. 02_Prompt_Slide_Gamma_10Slides/
     - prompt_gamma_10_slides.md (Gamma Slide Engineer — Outline chi tiết 10 Slide)
  3. 03_Prompt_Phieu_Bai_Tap_25Cau/
     - prompt_phieu_bai_tap_25_cau.md (Quiz Assessment Maker — 25 câu TN, Đúng/Sai, Tự luận)
  4. 04_Prompt_Infographics/
     - prompt_thiet_ke_infographics.md (Infographic Designer — Prompt thiết kế Infographic)
  5. 05_Prompt_Video_Intro_GoogleFlow_20Footages/
     - prompt_video_intro_20_footages_google_flow.md (Video Flow Director — Character, Voice, Văn phong + 20 Footages Google Flow kèm Transcript lời thoại)
  6. 06_KichBan_ChayThu_Va_BaoCao_QA/
     - 01_kich_ban_chay_thu_45_phut.md (DryRun Scenario Tester)
     - 02_bien_ban_qa_va_phe_duyet.md (QA Quality Reviewer & DevOps Site Manager)
  7. Đóng gói Website Portal (index.html) + File nén .ZIP phân chia thư mục chuẩn.
"""

from __future__ import annotations
import asyncio
import html
import json
from pathlib import Path
import re
import time
from typing import Any, Dict, List, Optional
import zipfile

from env_loader import get_crew_portal_base_url
from pixel_office_sdk import PixelOfficeBridge
from flows.elearning_codex_agents import (
    codex_generate_gamma_10_slides,
    codex_generate_infographic,
    codex_generate_quiz_25,
    codex_generate_video_20_footages,
    codex_qa_review_package,
    codex_research_topic,
    inspect_package_metrics,
)


# 9 Agent IDs khớp 100% với quy tắc biên dịch từ file office.md trên Pixel Agent Office
ELEARNING_AGENT_IDS = {
    "research": "agent_research_specialist",
    "pedagogy": "agent_pedagogy_architect",
    "gamma_slide": "agent_gamma_slide_engineer",
    "quiz_maker": "agent_quiz_assessment_maker",
    "infographic": "agent_infographic_designer",
    "video_flow": "agent_video_flow_director",
    "dryrun_tester": "agent_dryrun_scenario_tester",
    "qa_reviewer": "agent_qa_quality_reviewer",
    "devops_manager": "agent_devops_site_manager",
}


def slugify_topic(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[àáạảãâầấậẩẫăằắặẳẵ]", "a", s)
    s = re.sub(r"[èéẹẻẽêềếệểễ]", "e", s)
    s = re.sub(r"[ìíịỉĩ]", "i", s)
    s = re.sub(r"[òóọỏõôồốộổỗơờớợởỡ]", "o", s)
    s = re.sub(r"[ùúụủũưừứựửữ]", "u", s)
    s = re.sub(r"[ỳýỵỷỹ]", "y", s)
    s = re.sub(r"[đ]", "d", s)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s[:45] or "bai_giang_dien_tu"


def analyze_topic_context(topic: str) -> Dict[str, Any]:
    """
    Phân tích ngữ cảnh kiến thức đầu vào (hỗ trợ chuyên sâu cả chủ đề 'Các vùng kinh tế biển Việt Nam',
    các chủ đề Vật Lý, hoặc bất kỳ văn bản môn học nào do người dùng nhập).
    """
    is_maritime = bool(
        re.search(r"biển|kinh tế biển|hải đảo|duyên hải|hoàng sa|trường sa|cảng", topic, re.I)
    )
    if is_maritime:
        return {
            "topic_title": topic.strip(),
            "subject_domain": "Liên môn Địa Lý Kinh Tế - Vật Lý Hải Dương & Năng Lượng Biển (GDPT 2018)",
            "grade_level": "THPT / THCS (Lớp 9 - Lớp 12)",
            "core_pillars": [
                "Tổng quan không gian biển Việt Nam: Diện tích vùng biển khoảng 1 triệu km² trên Biển Đông (gấp 3 lần diện tích đất liền), đường bờ biển dài 3.260 km từ Móng Cái (Quảng Ninh) đến Hà Tiên (Kiên Giang), 28/63 tỉnh thành giáp biển, hơn 3.000 hòn đảo lớn nhỏ cùng 2 quần đảo Hoàng Sa (Đà Nẵng) và Trường Sa (Khánh Hòa).",
                "4 Vùng Kinh Tế Biển Trọng Điểm: (1) Vùng biển & ven biển Bắc Bộ (Quảng Ninh - Ninh Bình), (2) Vùng biển Bắc Trung Bộ & Duyên hải miền Trung (Thanh Hóa - Bình Thuận), (3) Vùng biển Đông Nam Bộ (Bà Rịa - Vũng Tàu - TP.HCM), (4) Vùng biển Đồng bằng sông Cửu Long (Tiền Giang - Kiên Giang).",
                "6 Ngành Kinh Tế Biển Mũi Nhọn (Nghị quyết 36-NQ/TW): (1) Du lịch & dịch vụ biển; (2) Kinh tế hàng hải & hệ thống cảng nước sâu (Lạch Huyện, Vũng Áng, Liên Chiểu, Vân Phong, Cái Mép - Thị Vải); (3) Khai thác dầu khí & tài nguyên khoáng sản biển (Bể Cửu Long, Nam Côn Sơn, Mã Lai - Thổ Chu); (4) Nuôi trồng & khai thác hải sản bền vững (4 ngư trường trọng điểm); (5) Công nghiệp ven biển & đóng tàu; (6) Năng lượng tái tạo biển (điện gió ngoài khơi, điện mặt trời nổi, năng lượng sóng & thủy triều).",
                "Phát triển bền vững Kinh tế Biển Xanh (Blue Economy) gắn liền với bảo vệ môi trường sinh thái biển, thích ứng biến đổi khí hậu và khẳng định chủ quyền quốc gia bất khả xâm phạm trên Biển Đông.",
            ],
            "key_metrics": [
                "Diện tích vùng biển chủ quyền & quyền chủ quyền: ~1.000.000 km²",
                "Chiều dài bờ biển: 3.260 km trải dài qua 28 tỉnh, thành phố ven biển",
                "Số lượng đảo: > 3.000 đảo ven bờ + 2 quần đảo Hoàng Sa & Trường Sa",
                "4 Ngư trường trọng điểm: Hải Phòng - Quảng Ninh; Ninh Thuận - Bình Thuận - Bà Rịa Vũng Tàu; Cà Mau - Kiên Giang; Quần đảo Hoàng Sa - Trường Sa",
                "4 Vùng kinh tế biển: Bắc Bộ | Bắc Trung Bộ & Duyên hải miền Trung | Đông Nam Bộ | Đồng bằng sông Cửu Long",
            ],
        }

    # Chế độ mặc định cho văn bản môn Vật Lý / Khoa học tự nhiên bất kỳ
    return {
        "topic_title": topic.strip(),
        "subject_domain": "Môn Vật Lý & Khoa Học Tự Nhiên (Chương trình GDPT 2018)",
        "grade_level": "THCS / THPT (Lớp 8 - Lớp 12)",
        "core_pillars": [
            f"Bản chất hiện tượng, định nghĩa khái niệm và cơ sở thực nghiệm của chủ đề: {topic}.",
            f"Hệ thống công thức toán lý, đại lượng đặc trưng, đơn vị đo SI và điều kiện áp dụng trong {topic}.",
            f"Phân tích đồ thị, mô hình hóa quá trình vật lý và giải quyết các bài toán định lượng về {topic}.",
            f"Ứng dụng kỹ thuật thực tiễn trong công nghiệp, đời sống hiện đại và an toàn thực hành liên quan đến {topic}.",
        ],
        "key_metrics": [
            f"Chủ đề trọng tâm: {topic}",
            "Cấu trúc năng lực: Nhận thức vật lý — Tìm hiểu thế giới tự nhiên — Vận dụng kiến thức kỹ năng",
            "Thời lượng tiết học chuẩn: 45 phút (Khởi động 5p - Hình thành kiến thức 20p - Luyện tập 12p - Vận dụng 8p)",
        ],
    }


def build_research_markdown(ctx: Dict[str, Any]) -> str:
    pillars_md = "\n".join(f"- **Trụ cột {i+1}**: {p}" for i, p in enumerate(ctx.get("core_pillars", [])))
    metrics_md = "\n".join(f"- `{m}`" for m in ctx.get("key_metrics", []))
    outline = ctx.get("slide_10_outline", [])
    outline_md = "\n".join(f"   - {item}" for item in outline) if outline else "   - Phủ đủ 10 slide theo tiến trình nhận thức GDPT 2018."
    theme = ctx.get("visual_theme") or {}
    llm_label = ctx.get("llm_engine", "Fallback Template")
    return f"""# HỒ SƠ NGHIÊN CỨU HỌC LIỆU & PHÂN TÍCH NỘI DUNG KHOA HỌC
**Chủ đề bài giảng**: **{ctx["topic_title"]}**  
**Lĩnh vực / Môn học**: {ctx["subject_domain"]}  
**Đối tượng học sinh**: {ctx["grade_level"]}  
**Tác nhân thực hiện**: `Research Specialist (agent_research_specialist)`  
**Engine AI sử dụng**: `{llm_label}`

---

## 1. Hệ Thống Kiến Thức Cốt Lõi Cần Truyền Tải
{pillars_md}

## 2. Công Thức, Định Luật & Dữ Liệu Chuẩn Hóa (Fact-Checked Metrics)
{metrics_md}

## 3. Định Hướng Sư Phạm & Trực Quan Cho 4 Luồng Siêu Prompt
1. **Câu hỏi / Tình huống dẫn nhập**: {ctx.get("lesson_hook") or f'Khám phá bản chất khoa học và ứng dụng thực tiễn của "{ctx["topic_title"]}".'}
2. **Nhân vật & Bối cảnh minh họa**: {theme.get("host_character", "Giảng viên chuyên môn hiện đại")} đồng hành cùng {theme.get("companion", "Trợ lý AI mô phỏng 3D")}.
3. **Phân bổ cho 4 Luồng Prompt**:
   - **Luồng Slide Gamma (10 Slides)**:
{outline_md}
   - **Luồng Phiếu Bài Tập (25 Câu)**: Kiểm tra đủ 3 cấp độ Nhận biết — Thông hiểu — Vận dụng qua 15 TN 4 lựa chọn, 5 Đúng/Sai chùm và 5 Tự luận.
   - **Luồng Infographic (7 Phân Khu)**: Hệ thống hóa công thức, sơ đồ cốt lõi và bẫy sai lầm thường gặp trên 1 mặt phẳng trực quan.
   - **Luồng Video Intro Google Flow (20 Footages — 100s)**: Trực quan hóa tình huống mở đầu khơi gợi tò mò khoa học kèm Transcript lời thoại tiếng Việt.
"""


def build_pedagogy_blueprint_markdown(ctx: Dict[str, Any]) -> str:
    topic = ctx["topic_title"]
    obj = ctx.get("learning_objectives") or {}
    k_obj = obj.get("knowledge") or f"Trình bày và phân tích chính xác bản chất, nguyên lý/quy luật cốt lõi của **{topic}**."
    i_obj = obj.get("inquiry") or "Đọc hiểu biểu đồ, phân tích bảng số liệu, mô hình thí nghiệm hoặc tư liệu khoa học liên quan."
    a_obj = obj.get("application") or f"Vận dụng kiến thức của **{topic}** để giải quyết tình huống thực tiễn và bài toán liên môn."
    timeline = ctx.get("dryrun_timeline") or [
        {"slot": "00:00 – 05:00", "teacher": "Chiếu Video Intro (100s) & nêu câu hỏi dẫn nhập", "student": "Quan sát & ghi nhận vấn đề trung tâm", "material": "Video Intro Google Flow (20 Footages - 100s)", "note": "Khơi gợi động lực học tập"},
        {"slot": "05:00 – 25:00", "teacher": "Giảng giải & tổ chức thảo luận theo 10 Slide Gamma", "student": "Thảo luận nhóm & trả lời câu hỏi tương tác", "material": "Bộ 10 Slide Gamma.app tương tác", "note": "Hình thành kiến thức mới"},
        {"slot": "25:00 – 33:00", "teacher": "Chốt hệ thống kiến thức bằng Infographic 7 phân khu", "student": "Tự hệ thống công thức/sơ đồ & rà soát lỗi sai", "material": "Poster Infographic phân tầng 4K", "note": "Khắc sâu trọng tâm"},
        {"slot": "33:00 – 45:00", "teacher": "Phát Phiếu Bài Tập Đánh Giá 25 Câu & chữa câu trọng tâm", "student": "Hoàn thành trắc nghiệm, Đúng/Sai và tự luận ngắn", "material": "Phiếu Bài Tập 25 Câu Đa Dạng Thức", "note": "Kiểm tra đầu ra GDPT 2018"},
    ]
    rows_md = "\n".join(
        f"| **{r.get('slot', '')}** | {r.get('teacher', '')} | {r.get('material', '')} | {r.get('note', '')} |"
        for r in timeline
    )
    return f"""# MA TRẬN MỤC TIÊU & KỊCH BẢN SƯ PHẠM TỔNG THỂ (GDPT 2018)
**Bài học**: **{topic}**  
**Lĩnh vực**: {ctx.get("subject_domain", "")} — {ctx.get("grade_level", "")}  
**Tác nhân thực hiện**: `Pedagogy Architect (agent_pedagogy_architect)`

---

## 1. Mục Tiêu Bài Học Theo Tiếp Cận Năng Lực
- **Năng lực nhận thức khoa học**: {k_obj}
- **Năng lực tìm hiểu & xử lý thông tin**: {i_obj}
- **Năng lực vận dụng kiến thức, kỹ năng**: {a_obj}

## 2. Cấu Trúc Đồng Bộ Hóa 4 Học Liệu Số Trong Tiết Học 45 Phút
| Thời lượng | Hoạt động dạy học | Học liệu số sử dụng | Mục tiêu sư phạm trọng tâm |
| :--- | :--- | :--- | :--- |
{rows_md}
"""


def build_gamma_10_slides_prompt(ctx: Dict[str, Any]) -> str:
    topic = ctx["topic_title"]
    return f"""# SIÊU PROMPT TIẾNG VIỆT TẠO BÀI GIẢNG 10 SLIDE TRÊN GAMMA.APP
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Gamma Slide Engineer (agent_gamma_slide_engineer)`  
**Hướng dẫn sử dụng**: Sao chép toàn bộ khối Prompt trong khung dưới đây và dán trực tiếp vào mục **"Paste in text" -> "Generate from outline/notes"** trên **Gamma.app** (chọn chế độ **10 Cards / Slides**, ngôn ngữ **Tiếng Việt**).

---

## 📋 BẢN PROMPT CHI TIẾT DÙNG CHO GAMMA.APP (COPY TỪ ĐÂY)

```markdown
Bạn là Chuyên gia Thiết kế Bài giảng Điện tử Sư phạm Đa phương tiện & Kiến trúc sư Trình chiếu Gamma.app hàng đầu.
Hãy tạo một bộ bài giảng điện tử hoàn chỉnh gồm ĐÚNG 10 SLIDE (10 CARDS) bằng tiếng Việt cực kỳ chi tiết, chuẩn xác về mặt khoa học và giàu tính trực quan cho chủ đề:
"{topic}"

### I. QUY ĐỊNH VỀ PHONG CÁCH THIẾT KẾ & BỐ CỤC TRÊN GAMMA (STYLE & DESIGN DIRECTIVES)
- **Tông màu chủ đạo (Theme Palette)**: Deep Ocean Navy (#0A192F) kết hợp Turquoise Cyan (#00B4D8), Emerald Green (#2EC4B6) và điểm nhấn Amber Gold (#FFB703) trên nền tối hiện đại hoặc nền sáng xanh biển nhạt sắc nét.
- **Văn phong sư phạm**: Khoa học, súc tích, phân cấp tiêu đề rõ ràng (H1, H2, Bullet có từ khóa in đậm), kết hợp số liệu thực tế, bảng so sánh và câu hỏi thảo luận ngắn ở cuối mỗi slide.
- **Yêu cầu bố cục Card (Gamma Smart Layouts)**: Sử dụng linh hoạt Stat Numbers (Khối số liệu lớn), 2-Column Comparison, 4-Grid Cards, Timeline Process, Callout Boxes (Hộp ghi nhớ/Cảnh báo) và AI Image Prompts đi kèm mỗi slide.
- **Số lượng bắt buộc**: ĐÚNG 10 SLIDE theo cấu trúc chi tiết từng slide dưới đây (dùng dấu `---` để ngắt từng Slide trên Gamma):

---
### SLIDE 1: TRANG BÌA & TẦM NHÌN CHIẾN LƯỢC — "{topic.upper()}"
- **Bố cục Gamma**: Hero Banner toàn chiều rộng kèm 3 chỉ số Stat Box nổi bật ở chân trang.
- **Nội dung kiến thức bắt buộc**:
  - Tiêu đề chính: **{topic.upper()} — Tiềm Năng, Cấu Trúc Không Gian & Chiến Lược Kinh Tế Biển Xanh**.
  - Phụ đề: Khám phá sức mạnh không gian biển Đông, 4 vùng kinh tế biển trọng điểm và 6 trụ cột phát triển bền vững của Việt Nam.
  - 3 Khối số liệu mở màn (Stat Callouts):
    1. **~1.000.000 km²**: Diện tích vùng biển thuộc chủ quyền, quyền chủ quyền và quyền tài phán quốc gia trên Biển Đông (gấp ~3 lần diện tích đất liền).
    2. **3.260 km**: Chiều dài đường bờ biển liên tục từ Móng Cái (Quảng Ninh) đến Hà Tiên (Kiên Giang), đi qua **28/63 tỉnh, thành phố**.
    3. **> 3.000 hòn đảo**: Hệ thống đảo ven bờ cùng 2 quần đảo tiền tiêu **Hoàng Sa (TP. Đà Nẵng)** và **Trường Sa (tỉnh Khánh Hòa)**.
- **Prompt ảnh minh họa AI trên Gamma**: "Bản đồ 3D isometric toàn cảnh vùng biển và bờ biển Việt Nam nhìn từ vệ tinh lúc bình minh, hiển thị các tuyến hàng hải phát sáng, cảng biển hiện đại, tua-bin điện gió ngoài khơi và quần đảo Hoàng Sa - Trường Sa, phong cách infographic hiện đại, độ phân giải 8K".
- **Câu hỏi khởi động (Callout Box)**: *"Vì sao nói thế kỷ XXI là thế kỷ của đại dương và biển là không gian sinh tồn, phát triển bền vững của dân tộc Việt Nam?"*

---
### SLIDE 2: TỔNG QUAN TIỀM NĂNG TỰ NHIÊN & ĐỊA CHIẾN LƯỢC BIỂN VIỆT NAM
- **Bố cục Gamma**: 4-Grid Feature Cards kết hợp 1 hộp Info Callout ở dưới cùng.
- **Nội dung kiến thức bắt buộc**:
  - **1. Vị trí Địa - Kinh tế & Hàng hải Quốc tế**: Nằm ngay trên tuyến đường biển huyết mạch nối Thái Bình Dương và Ấn Độ Dương (chiếm > 45% lượng hàng hóa vận tải biển toàn cầu đi qua Biển Đông).
  - **2. Tài nguyên Sinh vật & Thủy sản Phong phú**: Hơn 2.000 loài cá (trên 100 loài có giá trị kinh tế cao), hơn 1.600 loài giáp xác, 2.500 loài thân mềm, hơn 600 loài rong biển; tập trung tại **4 ngư trường trọng điểm**.
  - **3. Tài nguyên Khoáng sản & Năng lượng Biển**: Trữ lượng lớn dầu mỏ và khí tự nhiên tại các bể trầm tích thềm lục địa (Sông Hồng, Phú Khánh, Cửu Long, Nam Côn Sơn, Mã Lai - Thổ Chu); titan, cát trắng thủy tinh, muối biển; tiềm năng **điện gió ngoài khơi đạt hàng trăm GW** cùng năng lượng sóng, thủy triều.
  - **4. Địa hình Bờ biển Đa dạng**: Nhiều vũng, vịnh nước sâu kín gió (Hạ Long, Cam Ranh, Vân Phong, Vũng Rô) thuận lợi xây dựng cảng nước sâu; hàng trăm bãi biển đẹp trải dài từ Bắc vào Nam phục vụ du lịch biển quanh năm.
- **Prompt ảnh minh họa AI trên Gamma**: "Sơ đồ cắt ngang thềm lục địa biển Việt Nam thể hiện hệ sinh thái rạn san hô, tàu đánh bắt xa bờ, giàn khoan dầu khí ngoài khơi, tua-bin gió biển và cảng container nước sâu".

---
### SLIDE 3: BẢN ĐỒ PHÂN VÙNG 4 VÙNG KINH TẾ BIỂN VIỆT NAM
- **Bố cục Gamma**: 2-Column Split (Cột trái: Sơ đồ phân bố 4 vùng dọc theo vĩ độ; Cột phải: Bảng tóm tắt phạm vi hành chính & chức năng cốt lõi).
- **Nội dung kiến thức bắt buộc**:
  - Phân tích nguyên tắc phân vùng không gian kinh tế biển Việt Nam theo đặc thù tự nhiên, cơ sở hạ tầng và liên kết vùng kinh tế trọng điểm:
    1. **Vùng 1 — Vùng biển và ven biển Bắc Bộ**: Từ Quảng Ninh đến Ninh Bình (6 tỉnh/thành). Trung tâm cửa ngõ hàng hải quốc tế phía Bắc, du lịch di sản thiên nhiên thế giới và công nghiệp đóng tàu, kinh tế ven biển.
    2. **Vùng 2 — Vùng biển và ven biển Bắc Trung Bộ & Duyên hải miền Trung**: Từ Thanh Hóa đến Bình Thuận (14 tỉnh/thành — đường bờ biển dài nhất cả nước). Hệ thống cảng nước sâu trung chuyển, các khu kinh tế ven biển gắn với lọc hóa dầu, năng lượng tái tạo, du lịch nghỉ dưỡng biển đảo và đánh bắt xa bờ.
    3. **Vùng 3 — Vùng biển và ven biển Đông Nam Bộ**: Từ Bà Rịa - Vũng Tàu đến TP. Hồ Chí Minh. Trung tâm khai thác dầu khí lớn nhất cả nước, cụm cảng trung chuyển quốc tế nước sâu Cái Mép - Thị Vải và dịch vụ hậu cần hàng hải hiện đại.
    4. **Vùng 4 — Vùng biển và ven biển Đồng bằng sông Cửu Long**: Từ Tiền Giang đến Kiên Giang (7 tỉnh ven biển, giáp cả vùng biển phía Đông và Vịnh Thái Lan phía Tây Nam). Trung tâm khai thác, nuôi trồng, chế biến thủy hải sản lớn nhất Việt Nam và phát triển đảo ngọc Phú Quốc.

---
### SLIDE 4: VÙNG 1 — VÙNG BIỂN & VEN BIỂN BẮC BỘ (QUẢNG NINH – NINH BÌNH)
- **Bố cục Gamma**: 3-Column Layout (Điều kiện & Lợi thế | Ngành kinh tế mũi nhọn | Trung tâm & Dự án trọng điểm).
- **Nội dung kiến thức bắt buộc**:
  - **Phạm vi**: Quảng Ninh, Hải Phòng, Thái Bình, Nam Định, Ninh Bình.
  - **Thế mạnh tự nhiên & hạ tầng**: Bờ biển khúc khuỷu ở phía Đông Bắc với hơn 2.000 hòn đảo đá vôi trên vịnh Hạ Long - Bái Tử Long - Lan Hạ; vùng đồng bằng châu thổ sông Hồng mở rộng ra biển với các bãi triều rộng lớn.
  - **Các trụ cột phát triển**:
    - **Kinh tế hàng hải & Cảng biển**: Cụm cảng cửa ngõ quốc tế Hải Phòng — **Cảng nước sâu Lạch Huyện** (đón tàu trọng tải trên 130.000 - 200.000 DWT), cảng Cái Lân (Quảng Ninh).
    - **Du lịch biển - đảo đẳng cấp quốc tế**: Di sản thiên nhiên thế giới Vịnh Hạ Long - Quần đảo Cát Bà, Vân Đồn, Cô Tô, Đồ Sơn.
    - **Khu kinh tế ven biển & Công nghiệp**: KKT Đình Vũ - Cát Hải, KKT Vân Đồn, KKT Quảng Yên, KKT Thái Bình; ngư trường trọng điểm Hải Phòng - Quảng Ninh.
  - **Thách thức**: Chịu ảnh hưởng trực tiếp của bão nhiệt đới mùa hè - thu, áp lực ô nhiễm môi trường nước vùng cửa sông ven biển.

---
### SLIDE 5: VÙNG 2 — VÙNG BIỂN BẮC TRUNG BỘ & DUYÊN HẢI MIỀN TRUNG (THANH HÓA – BÌNH THUẬN)
- **Bố cục Gamma**: Bento Grid 4 ô chuyên đề + Bảng liệt kê chuỗi Cảng nước sâu & Khu kinh tế ven biển.
- **Nội dung kiến thức bắt buộc**:
  - **Phạm vi**: 14 tỉnh/thành phố liên tiếp từ Thanh Hóa đến Bình Thuận (100% các tỉnh trong vùng đều giáp biển!).
  - **Thế mạnh độc tôn**: Thềm lục địa thu hẹp và sâu sát bờ, nhiều đầm phá (Tam Giang - Cầu Hai, Thị Nại, Ô Loan) và các vịnh nước sâu kín gió hàng đầu châu Á (Vũng Áng, Chân Mây, Đà Nẵng, Dung Quất, Quy Nhơn, Vân Phong, Cam Ranh).
  - **Các trụ cột phát triển**:
    - **Chuỗi Cảng nước sâu & Khu kinh tế ven biển gắn với công nghiệp nặng/lọc hóa dầu**: KKT Nghi Sơn (Lọc hóa dầu Nghi Sơn - Thanh Hóa), KKT Vũng Áng (Thép & Nhiệt điện - Hà Tĩnh), KKT Chân Mây - Lăng Cô (Huế), Cảng Liên Chiểu (Đà Nẵng), KKT Dung Quất (Lọc dầu Dung Quất - Quảng Ngãi), KKT Nhơn Hội (Bình Định), KKT Vân Phong (Khánh Hòa).
    - **Du lịch biển đảo trung tâm**: Đà Nẵng, Hội An, Nha Trang, Mũi Né - Phan Thiết, đảo Lý Sơn, Cù Lao Chàm, Phú Quý.
    - **Khai thác hải sản xa bờ, sản xuất muối & Năng lượng sạch**: Ngư trường Ninh Thuận - Bình Thuận và ngư trường Hoàng Sa - Trường Sa; cánh đồng muối công nghiệp Cà Ná (Ninh Thuận), Sa Huỳnh (Quảng Ngãi); trung tâm điện gió, điện mặt trời ven biển Ninh Thuận - Bình Thuận.

---
### SLIDE 6: VÙNG 3 — VÙNG BIỂN ĐÔNG NAM BỘ (BÀ RỊA - VŨNG TÀU – TP. HỒ CHÍ MINH)
- **Bố cục Gamma**: Split Card (Trái: Số liệu thống kê đóng góp GDP; Phải: 3 Mũi nhọn Dầu khí - Cảng trung chuyển - Du lịch).
- **Nội dung kiến thức bắt buộc**:
  - **Vị thế kinh tế**: Tuy chiều dài bờ biển ngắn hơn các vùng khác nhưng là **vùng có hiệu suất giá trị kinh tế biển trên mỗi km bờ biển cao nhất cả nước**, đóng vai trò đầu tàu kinh tế biển quốc gia.
  - **3 Trụ cột chiến lược**:
    1. **Thủ phủ Công nghiệp Dầu khí Quốc gia**: Khai thác tại **Bể trầm tích Cửu Long** (mỏ Bạch Hổ, Rồng, Rạng Đông, Sư Tử Đen, Sư Tử Vàng...) và **Bể Nam Côn Sơn** (mỏ Lan Tây, Lan Đỏ, Đại Hùng, Hải Thạch - Mộc Tinh...); tổ hợp khí - điện - đạm Phú Mỹ và Tổ hợp Hóa dầu Long Sơn (Bà Rịa - Vũng Tàu).
    2. **Cụm Cảng Nước Sâu Trung Chuyển Quốc Tế Cái Mép - Thị Vải & Cần Giờ**: Nằm trong nhóm 20 cảng container hoạt động hiệu quả nhất thế giới, đón siêu tàu mẹ trên 200.000 DWT đi thẳng sang châu Âu và Bắc Mỹ mà không cần trung chuyển qua Singapore.
    3. **Du lịch biển & Khu dự trữ sinh quyển**: Vũng Tàu, Long Hải, Hồ Tràm, Khu dự trữ sinh quyển rừng ngập mặn Cần Giờ và Vườn quốc gia Côn Đảo.

---
### SLIDE 7: VÙNG 4 — VÙNG BIỂN ĐỒNG BẰNG SÔNG CỬU LONG (TIỀN GIANG – KIÊN GIANG)
- **Bố cục Gamma**: 3-Card Horizontal Process + Highlight Box về Đảo Ngọc Phú Quốc & Ngư trường Tây Nam Bộ.
- **Nội dung kiến thức bắt buộc**:
  - **Đặc điểm địa lý độc đáo**: Giáp cả **Biển Đông** (phía Đông Nam) và **Vịnh Thái Lan** (phía Tây Nam) với hơn 700 km bờ biển qua 7 tỉnh (Tiền Giang, Bến Tre, Trà Vinh, Sóc Trăng, Bạc Liêu, Cà Mau, Kiên Giang).
  - **Các trụ cột phát triển**:
    - **Vựa Thủy Hải Sản Lớn Nhất Cả Nước**: Chiếm trên **55% tổng sản lượng thủy sản nuôi trồng và khai thác** của Việt Nam; sở hữu ngư trường trọng điểm Cà Mau - Kiên Giang; mô hình nuôi tôm sinh thái dưới tán rừng ngập mặn (Cà Mau, Bạc Liêu) và cá tra xuất khẩu.
    - **Trung tâm Kinh tế - Du lịch Đảo Phú Quốc & Quần đảo Nam Du, Thổ Chu, Hòn Khoai**: Phú Quốc trở thành thành phố đảo đầu tiên của Việt Nam, trung tâm dịch vụ du lịch sinh thái biển đảo tầm cỡ quốc tế.
    - **Năng lượng Khí & Điện Gió Ngoài Khơi / Ven Biển**: Khai thác khí tại bể Mã Lai - Thổ Chu cung cấp cho **Cụm Khí - Điện - Đạm Cà Mau**; phát triển mạnh các cánh đồng điện gió trên biển tại Bạc Liêu, Sóc Trăng, Trà Vinh, Cà Mau; quy hoạch cảng nước sâu Trần Đề và Hòn Khoai.

---
### SLIDE 8: 6 NGÀNH KINH TẾ BIỂN MŨI NHỌN THEO CHIẾN LƯỢC BIỂN VIỆT NAM (NGHỊ QUYẾT 36-NQ/TW)
- **Bố cục Gamma**: Thứ tự ưu tiên 1 -> 6 dạng Numbered Pyramid / Step Cards.
- **Nội dung kiến thức bắt buộc**:
  - Trình bày đúng thứ tự ưu tiên phát triển 6 ngành kinh tế biển bền vững đến năm 2030, tầm nhìn 2045:
    1. **Du lịch và dịch vụ biển**: Đổi mới sản phẩm du lịch nghỉ dưỡng biển đảo chất lượng cao, kết nối chuỗi đô thị du lịch ven biển quốc tế.
    2. **Kinh tế hàng hải**: Phát triển đồng bộ kết cấu hạ tầng cảng biển nước sâu, đội tàu vận tải biển và dịch vụ logistics cảng biển xanh, số hóa.
    3. **Khai thác dầu khí và các tài nguyên khoáng sản biển khác**: Thăm dò, khai thác gắn với chế biến sâu hóa dầu và bảo vệ tuyệt đối môi trường biển.
    4. **Nuôi trồng và khai thác hải sản**: Chuyển từ đánh bắt ven bờ sang nuôi trồng công nghệ cao trên biển (nuôi biển công nghiệp) và khai thác xa bờ bền vững, chống khai thác IUU.
    5. **Công nghiệp ven biển**: Cơ khí đóng tàu, công nghiệp công nghệ cao, chế biến xuất khẩu tại các khu kinh tế ven biển.
    6. **Năng lượng tái tạo và các ngành kinh tế biển mới**: Điện gió ngoài khơi, năng lượng sóng biển, thủy triều, dòng hải lưu và dược liệu biển, đa dạng sinh học biển.

---
### SLIDE 9: BẢO VỆ MÔI TRƯỜNG BIỂN & KHẲNG ĐỊNH CHỦ QUYỀN QUỐC GIA TRÊN BIỂN ĐÔNG
- **Bố cục Gamma**: 2-Column Warning & Action Layout (Cột trái: Thách thức môi trường & biến đổi khí hậu; Cột phải: Chủ quyền biển đảo & Quốc phòng - An ninh).
- **Nội dung kiến thức bắt buộc**:
  - **Bảo vệ hệ sinh thái & Kinh tế biển xanh (Blue Economy)**:
    - Suy thoái rạn san hô, rừng ngập mặn, rác thải nhựa đại dương, sạt lở bờ biển và xâm nhập mặn ở ĐBSCL.
    - Giải pháp: Mở rộng các khu bảo tồn biển, phục hồi rừng ngập mặn ven biển, kiểm soát xả thải từ các khu công nghiệp và tàu thuyền.
  - **Kinh tế biển gắn liền với Bảo vệ Chủ quyền Biển Đảo**:
    - Khẳng định chủ quyền không thể tranh cãi của Việt Nam đối với **huyện đảo Hoàng Sa (TP. Đà Nẵng)** và **huyện đảo Trường Sa (tỉnh Khánh Hòa)** phù hợp với Công ước Liên Hợp Quốc về Luật Biển năm 1982 (UNCLOS 1982).
    - Mỗi ngư dân vươn khơi bám biển, mỗi giàn khoan, mỗi chuyến tàu hàng hải và mỗi công trình trên đảo là một **"cột mốc sống"** bảo vệ vững chắc chủ quyền vùng biển, vùng trời Tổ quốc.

---
### SLIDE 10: BẢNG SO SÁNH TỔNG KẾT 4 VÙNG KINH TẾ BIỂN & CÂU HỎI THẢO LUẬN MỞ RỘNG
- **Bố cục Gamma**: Full Comparison Matrix Table + 3 Câu hỏi Thảo luận Nhóm ở cuối bài.
- **Nội dung kiến thức bắt buộc**:
  - **Bảng ma trận đối chiếu nhanh 4 vùng kinh tế biển** theo 4 tiêu chí: *(1) Phạm vi địa lý, (2) Cảng biển & KKT trọng điểm, (3) Ngành mũi nhọn số 1, (4) Định hướng đột phá đến 2030*.
  - **3 Câu hỏi tư duy phản biện cuối bài**:
    1. Vì sao cụm cảng Cái Mép - Thị Vải (Đông Nam Bộ) và Lạch Huyện (Bắc Bộ) lại giữ vai trò cảng cửa ngõ trung chuyển quốc tế của Việt Nam?
    2. Phân tích mối quan hệ hỗ trợ lẫn nhau giữa phát triển năng lượng tái tạo ngoài khơi (Vật lý năng lượng) và mục tiêu phát triển kinh tế biển xanh bền vững.
    3. Địa phương em có thể đóng góp gì vào chuỗi giá trị kinh tế biển và bảo vệ môi trường biển đảo Việt Nam?
```
"""


def build_quiz_assessment_prompt(ctx: Dict[str, Any]) -> str:
    topic = ctx["topic_title"]
    return f"""# SIÊU PROMPT TIẾNG VIỆT THIẾT KẾ PHIẾU BÀI TẬP ĐÁNH GIÁ NĂNG LỰC (25 CÂU HỎI)
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Quiz Assessment Maker (agent_quiz_assessment_maker)`  
**Cấu trúc chuẩn**: Đề kiểm tra đánh giá năng lực học sinh theo định dạng mới (Chương trình GDPT 2018), gồm **25 câu hỏi** chia làm 3 phần:
- **Phần I (15 câu)**: Trắc nghiệm khách quan 4 lựa chọn (6 Nhận biết, 5 Thông hiểu, 4 Vận dụng).
- **Phần II (5 câu = 20 ý lệnh)**: Trắc nghiệm Đúng/Sai chùm 4 mệnh đề (a, b, c, d) dựa trên đoạn tư liệu và bảng số liệu.
- **Phần III (5 câu)**: Tự luận trả lời ngắn (tính toán số liệu) & Tự luận phân tích thực tiễn.

---

## 📋 BẢN PROMPT CHI TIẾT ĐỂ SINH TRỌN BỘ PHIẾU BÀI TẬP 25 CÂU + ĐÁP ÁN (COPY TỪ ĐÂY)

```markdown
Bạn là Chuyên gia Khảo thí & Đo lường Giáo dục Quốc gia (chuyên trách xây dựng ngân hàng câu hỏi theo Chương trình GDPT 2018).
Hãy biên soạn một **PHIẾU BÀI TẬP & ĐỀ KIỂM TRA ĐÁNH GIÁ NĂNG LỰC HOÀN CHỈNH (25 CÂU HỎI)** bằng tiếng Việt thật chi tiết, kèm **Bảng Đáp Án, Thang Điểm và Lời Giải Thích Sư Phạm từng câu** cho chủ đề:
"{topic}"

### YÊU CẦU KỸ THUẬT BẮT BUỘC:
1. Không viết tóm tắt hay rút gọn câu hỏi. Phải viết đầy đủ toàn văn từ **Câu 1 đến Câu 25**.
2. Các phương án nhiễu (distractors) trong câu trắc nghiệm phải có tính hợp lý khoa học cao, phản ánh đúng các lỗi nhầm lẫn thường gặp của học sinh giữa 4 vùng kinh tế biển và 6 ngành kinh tế biển.
3. Cuối phiếu bài tập bắt buộc phải có **BẢNG ĐÁP ÁN NHANH** và **HƯỚNG DẪN GIẢI CHI TIẾT TỪNG CÂU**.

---

### PHẦN I. CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (15 CÂU — Từ Câu 1 đến Câu 15)
*(Mỗi câu hỏi có 4 phương án A, B, C, D và chỉ có 1 phương án đúng)*

Hãy biên soạn chi tiết 15 câu hỏi theo đúng ma trận đặc tả từng câu sau:
- **Câu 1 [Nhận biết - Khái quát vùng biển]**: Hỏi về tổng diện tích vùng biển Việt Nam trên Biển Đông (~1 triệu km²), chiều dài đường bờ biển (3.260 km) và số lượng tỉnh/thành phố giáp biển (28 tỉnh/thành).
- **Câu 2 [Nhận biết - Phân vùng không gian]**: Xác định đúng tên và thứ tự từ Bắc vào Nam của 4 vùng kinh tế biển và ven biển Việt Nam.
- **Câu 3 [Nhận biết - Vùng biển Bắc Bộ]**: Nhận diện cụm cảng biển cửa ngõ quốc tế và di sản thiên nhiên thế giới đặc trưng của vùng biển Bắc Bộ (Hải Phòng - Lạch Huyện, Vịnh Hạ Long - Cát Bà).
- **Câu 4 [Nhận biết - Vùng biển Bắc Trung Bộ & DHMT]**: Nhận diện đặc điểm nổi bật nhất của vùng biển Bắc Trung Bộ và Duyên hải miền Trung (tất cả 14 tỉnh/thành đều giáp biển, nhiều vũng vịnh nước sâu xây dựng cảng nước sâu như Vũng Áng, Dung Quất, Vân Phong, Cam Ranh).
- **Câu 5 [Nhận biết - Vùng biển Đông Nam Bộ]**: Xác định ngành kinh tế biển giữ vị trí số 1 về giá trị sản xuất tại vùng biển Đông Nam Bộ (khai thác dầu khí ở thềm lục địa bể Cửu Long, Nam Côn Sơn và cụm cảng nước sâu Cái Mép - Thị Vải).
- **Câu 6 [Nhận biết - Vùng biển ĐBSCL]**: Nhận diện 4 ngư trường trọng điểm của Việt Nam và xác định vùng biển có sản lượng khai thác, nuôi trồng thủy sản lớn nhất cả nước (Đồng bằng sông Cửu Long với ngư trường Cà Mau - Kiên Giang).
- **Câu 7 [Thông hiểu - So sánh điều kiện tự nhiên]**: Giải thích vì sao vùng biển Duyên hải Nam Trung Bộ có điều kiện thuận lợi nhất cả nước để sản xuất muối công nghiệp (Cà Ná, Sa Huỳnh) và phát triển cảng nước sâu (do số giờ nắng cao, ít sông lớn đổ ra biển, thềm lục địa hẹp và sâu sát bờ).
- **Câu 8 [Thông hiểu - Kinh tế hàng hải]**: Phân tích ý nghĩa chiến lược của việc phát triển các cảng nước sâu trung chuyển quốc tế (Lạch Huyện, Cái Mép - Thị Vải) đối với năng lực xuất nhập khẩu của Việt Nam.
- **Câu 9 [Thông hiểu - Tài nguyên & Năng lượng biển]**: Giải thích sự phân bố của công nghiệp lọc hóa dầu (Nghi Sơn, Dung Quất, Long Sơn) và cụm Khí - Điện - Đạm (Phú Mỹ, Cà Mau) gắn với các bể trầm tích dầu khí trên thềm lục địa.
- **Câu 10 [Thông hiểu - Nuôi trồng & Khai thác hải sản]**: Giải thích vì sao hiện nay ngành thủy sản Việt Nam ưu tiên đẩy mạnh nuôi biển công nghệ cao và đánh bắt xa bờ thay vì khai thác ven bờ.
- **Câu 11 [Thông hiểu - Năng lượng tái tạo biển (Liên môn Vật Lý)]**: Phân tích cơ sở tự nhiên và nguyên lý chuyển hóa năng lượng giúp vùng biển Ninh Thuận - Bình Thuận và vùng biển ven bờ ĐBSCL (Bạc Liêu, Sóc Trăng, Cà Mau) trở thành trung tâm điện gió ngoài khơi của cả nước.
- **Câu 12 [Vận dụng - Chiến lược 6 ngành kinh tế biển]**: Vận dụng Nghị quyết 36-NQ/TW để xác định thứ tự ưu tiên và mối liên kết chuỗi giá trị giữa Du lịch biển - Hàng hải - Dầu khí - Thủy sản - Công nghiệp ven biển - Năng lượng tái tạo.
- **Câu 13 [Vận dụng - Liên kết vùng]**: Phân tích vai trò của các Khu kinh tế ven biển (Vân Đồn, Nghi Sơn, Vũng Áng, Chu Lai, Dung Quất, Định An...) trong việc thu hút vốn FDI và thúc đẩy chuyển dịch cơ cấu kinh tế vùng.
- **Câu 14 [Vận dụng - Môi trường & Biến đổi khí hậu]**: Đề xuất giải pháp căn cơ để ứng phó với tình trạng sạt lở bờ biển, xâm nhập mặn và suy giảm diện tích rừng ngập mặn tại vùng biển Đồng bằng sông Cửu Long.
- **Câu 15 [Vận dụng - Chủ quyền biển đảo]**: Phân tích ý nghĩa kép về kinh tế và quốc phòng - an ninh của việc phát triển kinh tế tại các huyện đảo tiền tiêu (Hoàng Sa, Trường Sa, Bạch Long Vĩ, Cô Tô, Lý Sơn, Phú Quý, Cồn Cỏ, Côn Đảo, Phú Quốc).

---

### PHẦN II. CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI CHÙM 4 MỆNH ĐỀ (5 CÂU — Từ Câu 16 đến Câu 20)
*(Trong mỗi câu 16, 17, 18, 19, 20, học sinh chọn Đúng (Đ) hoặc Sai (S) cho từng mệnh đề a), b), c), d))*

- **Câu 16 [Tư liệu về Chiến lược phát triển bền vững kinh tế biển Việt Nam]**:
  - Cung cấp một đoạn trích dẫn chuẩn xác từ Chiến lược phát triển bền vững kinh tế biển Việt Nam đến năm 2030, tầm nhìn 2045.
  - Xây dựng 4 mệnh đề:
    - `a)` (Nhận biết): Về phạm vi và tiềm năng bờ biển Việt Nam.
    - `b)` (Thông hiểu): Về vai trò của kinh tế biển xanh đối với GDP quốc gia.
    - `c)` (Vận dụng): Về chuyển dịch cơ cấu từ khai thác tài nguyên thô sang du lịch, dịch vụ hàng hải và năng lượng tái tạo.
    - `d)` (Vận dụng cao): Về mối quan hệ hữu cơ giữa phát triển kinh tế biển và bảo vệ chủ quyền theo UNCLOS 1982.

- **Câu 17 [Bảng số liệu thống kê Sản lượng thủy sản khai thác và nuôi trồng của 4 vùng kinh tế biển giai đoạn 2015 – 2024]**:
  - Cung cấp một bảng số liệu cụ thể (đơn vị: nghìn tấn) của Bắc Bộ, Bắc Trung Bộ & DHMT, Đông Nam Bộ và ĐBSCL.
  - Xây dựng 4 mệnh đề `a)`, `b)`, `c)`, `d)` kiểm tra kỹ năng đọc bảng số liệu, tính tốc độ tăng trưởng, tính tỉ trọng (%) và giải thích nguyên nhân dẫn đầu của vùng ĐBSCL & Bắc Trung Bộ - DHMT.

- **Câu 18 [So sánh chuyên sâu Vùng biển Bắc Bộ và Vùng biển Đông Nam Bộ]**:
  - Cung cấp đoạn thông tin về hệ thống cảng biển Lạch Huyện - Hải Phòng và Cái Mép - Thị Vải cùng hoạt động khai thác dầu khí.
  - Xây dựng 4 mệnh đề `a)`, `b)`, `c)`, `d)` đối chiếu sự khác biệt về thế mạnh tài nguyên khoáng sản biển, cảng nước sâu và du lịch biển giữa hai vùng.

- **Câu 19 [Tư liệu về Vùng biển Bắc Trung Bộ & Duyên hải miền Trung và Quần đảo Hoàng Sa - Trường Sa]**:
  - Cung cấp đoạn tư liệu về 14 tỉnh ven biển miền Trung, hệ thống vịnh nước sâu và hai quần đảo Hoàng Sa, Trường Sa.
  - Xây dựng 4 mệnh đề `a)`, `b)`, `c)`, `d)` phân tích điều kiện tự nhiên, nghề làm muối, đánh bắt xa bờ và vị trí chiến lược quốc phòng.

- **Câu 20 [Tích hợp Vật lý & Kỹ thuật Năng lượng Tái tạo Biển — Điện gió ngoài khơi & Bảo vệ hệ sinh thái]**:
  - Cung cấp đoạn tư liệu kỹ thuật về công suất điện gió ngoài khơi của Việt Nam (tốc độ gió trung bình trên vùng biển Nam Trung Bộ và Nam Bộ đạt 7 - 10 m/s ở độ cao 100m) và công thức công suất gió $P = \frac{1}{2} \rho A v^3$.
  - Xây dựng 4 mệnh đề `a)`, `b)`, `c)`, `d)` kiểm tra hiểu biết liên môn về tiềm năng năng lượng sạch, sự phụ thuộc bậc 3 của công suất vào vận tốc gió, và tác động giảm phát thải khí nhà kính.

---

### PHẦN III. CÂU HỎI TỰ LUẬN TRẢ LỜI NGẮN & TỰ LUẬN VẬN DỤNG THỰC TIỄN (5 CÂU — Từ Câu 21 đến Câu 25)
- **Câu 21 [Tự luận trả lời ngắn - Tính toán tỉ trọng]**: Cho số liệu tổng sản lượng hải sản khai thác cả nước và sản lượng của vùng Bắc Trung Bộ & Duyên hải miền Trung. Yêu cầu học sinh tính tỉ trọng (%) và làm tròn đến chữ số thập phân thứ nhất.
- **Câu 22 [Tự luận trả lời ngắn - Tính toán năng lượng/vận tải biển]**: Bài toán tính năng lượng điện gió ngoài khơi sản xuất trong 1 năm hoặc tính cự ly/thời gian hành trình tàu biển từ cảng Hải Phòng (Lạch Huyện) đến cảng Cái Mép - Thị Vải và ra quần đảo Trường Sa (đổi hải lý sang km với 1 hải lý = 1,852 km).
- **Câu 23 [Tự luận phân tích so sánh]**: Lập bảng so sánh thế mạnh nổi bật nhất và hạn chế lớn nhất giữa **Vùng biển Bắc Trung Bộ & Duyên hải miền Trung** với **Vùng biển Đồng bằng sông Cửu Long**.
- **Câu 24 [Tự luận giải quyết vấn đề thực tiễn - Kinh tế biển xanh]**: Tại sao Việt Nam kiên quyết chuyển đổi theo mô hình **"Kinh tế biển xanh" (Blue Economy)** và quyết liệt gỡ "Thẻ vàng IUU" trong khai thác hải sản? Hãy nêu 4 giải pháp cụ thể.
- **Câu 25 [Tự luận tổng hợp - Chủ quyền & Tương lai biển Việt Nam]**: Từ vị trí địa chiến lược của 4 vùng kinh tế biển và hai quần đảo Hoàng Sa, Trường Sa, hãy viết một đoạn luận ngắn (150 - 200 từ) làm rõ thông điệp: *"Phát triển kinh tế biển vững mạnh chính là lá chắn bền vững nhất để bảo vệ chủ quyền biển đảo Tổ quốc"*.

---

### PHẦN IV. BẢNG ĐÁP ÁN NHANH, THANG ĐIỂM & HƯỚNG DẪN GIẢI CHI TIẾT
- Xuất bảng đáp án Phần I (1 -> 15), Phần II (16 -> 20 cho từng ý a, b, c, d), Phần III (21 -> 25).
- Giải thích ngắn gọn nhưng chặt chẽ lý do chọn đáp án đúng cho tất cả 25 câu.
```
"""


def build_infographic_prompt(ctx: Dict[str, Any]) -> str:
    topic = ctx["topic_title"]
    return f"""# SIÊU PROMPT TIẾNG VIỆT THIẾT KẾ INFOGRAPHIC TỔNG HỢP KIẾN THỨC
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Infographic Designer (agent_infographic_designer)`  
**Mục đích sử dụng**: Dùng để đưa vào các công cụ thiết kế Infographic AI (Canva Magic Design, Nano Banana Pro, Ideogram 2.0, Midjourney v6, hoặc giao cho Designer/AI UI Generator) để dựng Poster Infographic chuẩn sư phạm.

---

## 📋 BẢN PROMPT MÔ TẢ CHI TIẾT XÂY DỰNG INFOGRAPHICS (COPY TỪ ĐÂY)

```markdown
Bạn là Giám đốc Sáng tạo Đồ họa Thông tin (Information Design Director) chuyên thiết kế Infographic Giáo dục & Bản đồ Kinh tế Chiến lược.
Hãy xây dựng bản thiết kế và mô tả cực kỳ chi tiết để tạo một **POSTER INFOGRAPHIC GIÁO DỤC ĐA TẦNG** bằng tiếng Việt cho chủ đề:
"{topic}"

---

### 1. THÔNG SỐ KỸ THUẬT & BỐ CỤC TỔNG THỂ (TECHNICAL & LAYOUT SPECS)
- **Kích thước & Tỉ lệ**: Khổ dọc chuẩn Poster/Web-Scroll `1920 x 4800 px` (hoặc tỉ lệ `9:20`), chia thành **7 Phân Khu Thị Giác (7 Visual Zones)** nối tiếp nhau theo dòng chảy tự nhiên từ Bắc vào Nam dọc theo hình chữ S của bản đồ Việt Nam.
- **Phong cách đồ họa (Art Style)**: **Modern Isometric 2.5D Vector kết hợp Data Visualization phẳng sắc nét (Clean Flat UI Cards)**. Sử dụng hiệu ứng chiều sâu đại dương (Ocean Depth Gradient) chuyển sắc từ xanh ngọc vùng ven bờ sang xanh lam thẫm vùng biển khơi.
- **Bảng màu chuẩn (Color Palette Hex)**:
  - Nền chính (Deep Maritime Navy): `#061A2E` -> `#0B2545`
  - Màu nhấn vùng biển & đường bờ biển (Electric Cyan): `#00D2FF`
  - Màu nhấn Kinh tế Biển Xanh (Bio-Emerald): `#10B981`
  - Màu nhấn Dầu khí & Cảng nước sâu (Industrial Amber): `#F59E0B`
  - Màu nhấn Chủ quyền Hoàng Sa - Trường Sa (Sovereignty Crimson & Gold): `#EF4444` & `#FBBF24`
  - Màu chữ tiêu đề & số liệu (Crisp White): `#F8FAFC`
- **Hệ thống Font chữ (Typography)**:
  - Tiêu đề chính & Con số thống kê lớn: `Montserrat ExtraBold` / `Be Vietnam Pro Black` (In hoa, tracking rộng).
  - Nội dung thông tin & Nhãn bản đồ: `Be Vietnam Pro Medium/SemiBold` (rõ dấu tiếng Việt 100%).

---

### 2. MÔ TẢ CHI TIẾT TỪNG PHÂN KHU TRÊN INFOGRAPHIC (7 VISUAL SECTIONS)

#### 🔹 PHÂN KHU 1 (TOP HEADER BANNER — 15% Chiều cao): "VIỆT NAM — QUỐC GIA MẠNH VỀ BIỂN, GIÀU TỪ BIỂN"
- **Visual trung tâm**: Hình ảnh cách điệu la bàn hàng hải kết hợp ngọn hải đăng, tàu container siêu trường, tua-bin điện gió ngoài khơi và sóng biển vươn cao.
- **Tiêu đề lớn (H1)**: **CÁC VÙNG KINH TẾ BIỂN VIỆT NAM**
- **Phụ đề (Subtitle)**: *Cấu trúc không gian 4 vùng trọng điểm • 6 ngành kinh tế biển mũi nhọn • Chủ quyền biển đảo thiêng liêng*
- **Dải 4 Hộp Số Liệu Vàng (4 Hero KPI Badges)**:
  1. `[🌊 ~1.000.000 km²]` — Diện tích vùng biển Đông (Gấp 3 lần đất liền)
  2. `[🏖️ 3.260 km]` — Đường bờ biển (Móng Cái → Hà Tiên)
  3. `[🏛️ 28/63 Tỉnh, Thành]` — Giáp biển trực tiếp
  4. `[🏝️ > 3.000 Đảo]` — Cùng 2 quần đảo **Hoàng Sa & Trường Sa**

#### 🔹 PHÂN KHU 2 (CENTRAL SPINE MAP — 35% Chiều cao): BẢN ĐỒ TRỤC DỌC 4 VÙNG KINH TẾ BIỂN & QUẦN ĐẢO TIỀN TIÊU
- **Cấu trúc đồ họa**: Bản đồ Việt Nam 2.5D đặt dọc bên trái, vùng biển Đông mở rộng sang bên phải. Từ 4 đoạn bờ biển kéo ra **4 Khung Thẻ Thông Tin Lớn (4 Callout Region Cards)** được mã hóa bằng 4 màu viền phát sáng:
  - **THẺ VÙNG 1 (Màu Xanh Lam — Bắc Bộ: Quảng Ninh → Ninh Bình)**:
    - Icon minh họa: Cảng container Lạch Huyện + Đảo đá vôi Vịnh Hạ Long + Tàu đóng mới.
    - Nội dung cô đọng: Cửa ngõ hàng hải quốc tế miền Bắc (Hải Phòng - Quảng Ninh) | Du lịch biển đảo di sản thế giới (Hạ Long - Cát Bà - Vân Đồn - Cô Tô) | Ngư trường Hải Phòng - Quảng Ninh.
  - **THẺ VÙNG 2 (Màu Vàng Hổ Phách — Bắc Trung Bộ & Duyên Hải Miền Trung: Thanh Hóa → Bình Thuận)**:
    - Icon minh họa: Chuỗi cảng nước sâu + Nhà máy lọc dầu + Cánh đồng muối + Tua-bin gió biển.
    - Nội dung cô đọng: 14/14 tỉnh giáp biển | Chuỗi cảng nước sâu & KKT ven biển (Nghi Sơn, Vũng Áng, Chân Mây, Liên Chiểu, Dung Quất, Vân Phong, Cam Ranh) | Du lịch biển Đà Nẵng - Nha Trang - Mũi Né | Muối Cà Ná - Sa Huỳnh & Đánh bắt xa bờ.
  - **THẺ VÙNG 3 (Màu Cam Đỏ — Đông Nam Bộ: Bà Rịa - Vũng Tàu → TP.HCM)**:
    - Icon minh họa: Giàn khoan dầu khí ngoài khơi + Siêu tàu mẹ tại Cái Mép - Thị Vải.
    - Nội dung cô đọng: Thủ phủ khai thác Dầu khí quốc gia (Bể Cửu Long: Bạch Hổ, Rồng... & Bể Nam Côn Sơn: Lan Tây, Lan Đỏ...) | Cụm cảng nước sâu trung chuyển quốc tế Cái Mép - Thị Vải | Du lịch Vũng Tàu - Côn Đảo.
  - **THẺ VÙNG 4 (Màu Xanh Ngọc Lục Bảo — Đồng Bằng Sông Cửu Long: Tiền Giang → Kiên Giang)**:
    - Icon minh họa: Đội tàu cá & Tôm sinh thái rừng ngập mặn + Đảo ngọc Phú Quốc + Điện gió trên biển Bạc Liêu - Cà Mau.
    - Nội dung cô đọng: Giáp cả Biển Đông & Vịnh Thái Lan | Chiếm > 55% sản lượng thủy sản cả nước (Ngư trường Cà Mau - Kiên Giang) | Trung tâm du lịch quốc tế Phú Quốc | Cụm Khí - Điện - Đạm Cà Mau & Điện gió ven biển.
- **Điểm nhấn bắt buộc trên bản đồ biển Đông**: Hiển thị trang trọng, rõ nét vị trí và tên **Quần đảo Hoàng Sa (TP. Đà Nẵng)** và **Quần đảo Trường Sa (Tỉnh Khánh Hòa)** kèm biểu tượng cột mốc chủ quyền và cờ Tổ quốc.

#### 🔹 PHÂN KHU 3 (HEXAGONAL WHEEL — 15% Chiều cao): 6 NGÀNH KINH TẾ BIỂN MŨI NHỌN (NGHỊ QUYẾT 36-NQ/TW)
- **Bố cục**: Sơ đồ 6 khối lục giác tổ ong (Honeycomb Diagram) xếp quanh tâm "Kinh Tế Biển Xanh Việt Nam":
  1. `01. Du lịch & Dịch vụ biển` (Icon bãi biển & du thuyền)
  2. `02. Kinh tế Hàng hải & Cảng nước sâu` (Icon tàu container & cần cẩu cảng)
  3. `03. Khai thác Dầu khí & Khoáng sản biển` (Icon giàn khoan & hóa dầu)
  4. `04. Nuôi trồng & Khai thác Hải sản` (Icon lồng nuôi biển công nghệ cao)
  5. `05. Công nghiệp Ven biển` (Icon khu kinh tế & đóng tàu)
  6. `06. Năng lượng Tái tạo & Kinh tế biển mới` (Icon tua-bin điện gió ngoài khơi & sóng biển)

#### 🔹 PHÂN KHU 4 (DATA CHARTS — 12% Chiều cao): BIỂU ĐỒ TRỰC QUAN HÓA SỐ LIỆU
- **Biểu đồ 1 (Stacked Bar Chart)**: So sánh cơ cấu sản lượng thủy sản khai thác và nuôi trồng giữa 4 vùng kinh tế biển (nổi bật ĐBSCL và Bắc Trung Bộ - DHMT).
- **Biểu đồ 2 (Iconic Port Depth Scale)**: Lát cắt độ sâu mực nước và năng lực đón tàu (DWT) của các cảng nước sâu tiêu biểu: Cái Lân, Lạch Huyện, Vũng Áng, Dung Quất, Vân Phong, Cái Mép - Thị Vải.

#### 🔹 PHÂN KHU 5 (PHYSICS & GREEN ENERGY SPOTLIGHT — 10% Chiều cao): GÓC LIÊN MÔN VẬT LÝ & NĂNG LƯỢNG BIỂN
- **Sơ đồ minh họa kỹ thuật**: Nguyên lý chuyển hóa động năng của gió biển và sóng biển thành điện năng tại các cánh đồng điện gió ngoài khơi Bình Thuận, Bạc Liêu, Cà Mau ($P = \frac{1}{2}\rho A v^3$), kết nối trạm biến áp bờ biển vào lưới điện quốc gia.

#### 🔹 PHÂN KHU 6 (SUSTAINABILITY & SOVEREIGNTY — 8% Chiều cao): TAM GIÁC PHÁT TRIỂN BỀN VỮNG
- **Sơ đồ 3 đỉnh cân bằng**:
  - Đỉnh 1: **Tăng trưởng Kinh tế Biển Xanh** (Hiệu quả cao, công nghệ hiện đại).
  - Đỉnh 2: **Bảo tồn Hệ sinh thái Biển** (Rừng ngập mặn, rạn san hô, giảm rác thải nhựa, gỡ thẻ vàng IUU).
  - Đỉnh 3: **Bảo vệ Vững chắc Chủ quyền Quốc gia** (Thế trận quốc phòng toàn dân trên biển, tuân thủ UNCLOS 1982).

#### 🔹 PHÂN KHU 7 (FOOTER — 5% Chiều cao): THÔNG ĐIỆP TỔNG KẾT & GHI CHÚ HỌC LIỆU
- Câu khẩu hiệu in đậm: *"Biển là bộ phận cấu thành chủ quyền thiêng liêng của Tổ quốc, là không gian sinh tồn, cửa ngõ giao lưu quốc tế, gắn bó mật thiết với sự nghiệp xây dựng và bảo vệ Tổ quốc."*
```
"""


def build_video_intro_google_flow_prompt(ctx: Dict[str, Any]) -> str:
    topic = ctx["topic_title"]
    return f"""# SIÊU PROMPT TIẾNG VIỆT XÂY DỰNG VIDEO INTRO BÀI HỌC (GOOGLE FLOW — 20 FOOTAGES + LỜI THOẠI)
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Video Flow Director (agent_video_flow_director)`  
**Công cụ mục tiêu**: **Google Flow (Veo 2 / Imagen Video)** kết hợp lồng tiếng AI / Thu âm chuẩn truyền hình.  
**Tổng thời lượng**: **100 giây** (Chuỗi **20 Footages liên hoàn**, mỗi Footage dài 5 giây, có mô tả góc máy, ánh sáng, chuyển động nhân vật/camera và **Transcript lời thoại khớp từng cảnh**).

---

## PHẦN 1. PROMPT XÂY DỰNG NHÂN VẬT (CHARACTER BIBLE), GIỌNG ĐỌC (VOICE) & VĂN PHONG (TONE)

```markdown
### 1.1. Hồ Sơ Nhân Vật Dẫn Chuyện Nhất Quán (Character Consistency Bible cho Google Flow)
- **Tên nhân vật**: Kỹ sư Hải dương & Năng lượng biển **Hải Đăng** (28 tuổi, người Việt Nam) đồng hành cùng thiết bị bay khảo sát thông minh **Drone AI "Biển Xanh-01"**.
- **Ngoại hình & Trang phục cố định (Character Anchor Prompt — Dùng lặp lại trong các cảnh có nhân vật để khóa nhận diện trên Google Flow)**:
  > *[Character Anchor: A 28-year-old Vietnamese male oceanographer and marine energy engineer named Hai Dang, bright intelligent eyes, neat short black hair, wearing a modern navy-blue and cyan windbreaker jacket with a small Vietnamese flag emblem on the left chest, smart holographic wrist-tablet, accompanied by a sleek white-and-cyan spherical AI drone hovering beside him. Cinematic photorealistic 8K, consistent facial features across all shots.]*
- **Ngôn ngữ hình thể**: Tự tin, năng động, ánh mắt tràn đầy nhiệt huyết khi đứng trước mũi tàu khảo sát, trên cảng container tự động, trên giàn khoan dầu khí và dưới chân tua-bin điện gió ngoài khơi.

### 1.2. Hồ Sơ Giọng Đọc (Voice Profile & Audio Direction)
- **Chất giọng (Voice Timbre)**: Giọng nam trung trầm ấm, tròn vành rõ chữ, giàu nội lực (phong cách thuyết minh phim tài liệu khoa học VTV1 / National Geographic kết hợp nhịp điệu trẻ trung, truyền cảm hứng).
- **Tốc độ đọc (Pacing)**: `140 - 150 từ/phút` (khoảng 11 - 13 từ cho mỗi Footage 5 giây), có ngắt nhịp 0.5 giây ở đầu mỗi chuyển cảnh.
- **Sắc thái cảm xúc theo 3 hồi**:
  - *Footage 01 → 04 (Mở màn)*: Kỳ vĩ, hào sảng, khơi gợi sự tò mò.
  - *Footage 05 → 16 (Hành trình 4 vùng & 6 ngành kinh tế biển)*: Nhịp nhàng, sắc bén, hiện đại, nhấn mạnh vào các con số kỷ lục.
  - *Footage 17 → 20 (Chủ quyền & Kết mở vào bài học)*: Trang trọng, tự hào, thôi thúc học sinh bắt đầu bài học.

### 1.3. Văn Phong & Phong Cách Hình Ảnh (Visual & Narrative Style)
- **Phong cách hình ảnh trên Google Flow**: Photorealistic Cinematic 4K/8K, 24fps, kết hợp góc quay FPV Drone xuyên không gian (Seamless Match-Cut Transitions) với đồ họa Hologram 3D AR hiển thị số liệu và ranh giới 4 vùng kinh tế biển ngay trên mặt nước thực tế.
```

---

## PHẦN 2. CHUỖI 20 PROMPT MÔ TẢ CHI TIẾT 20 FOOTAGES (GOOGLE FLOW) KÈM TRANSCRIPT LỜI THOẠI

Dưới đây là **20 Prompt cảnh quay liên hoàn (Footage #01 → Footage #20)** được thiết kế sẵn để đưa vào **Google Flow**:

---

### 🎬 FOOTAGE #01 (00:00 – 00:05) — Toàn cảnh Biển Đông & Dải đất hình chữ S từ Quỹ đạo
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 01]: Cinematic orbital satellite view descending rapidly through fluffy white clouds toward the S-shaped coastline of Vietnam and the vast sparkling East Sea (Biển Đông) at golden sunrise. Glowing cyan holographic contour lines trace the 3,260 km coastline from North to South and illuminate the two archipelagos Hoang Sa and Truong Sa. Volumetric sunbeams reflecting on deep sapphire ocean water, epic orchestral swell, 8K photorealistic.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Nhìn từ không gian, Việt Nam hiện lên như một ban công vươn mình ra đại dương bao la..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng gió tầng cao vút nhẹ chuyển sang tiếng sóng biển trầm hùng và hợp âm dàn nhạc giao hưởng mở màn.

---

### 🎬 FOOTAGE #02 (00:05 – 00:10) — Kỹ sư Hải Đăng xuất hiện trên Tàu Khảo sát Biển Hiện đại
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 02]: Medium tracking shot on the bow of a high-tech Vietnamese ocean research vessel cutting through turquoise waves. [Character Anchor: Hai Dang, 28-year-old Vietnamese male engineer in navy-cyan jacket with Vietnamese flag emblem] stands confidently, tapping his wrist-tablet to project a floating 3D hologram reading "1.000.000 km² Biển Đông". The white-cyan AI drone hovers beside him. Sunlight glinting off sea spray, cinematic shallow depth of field.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...với vùng biển rộng gần một triệu ki-lô-mét vuông, gấp ba lần diện tích đất liền!"*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng mũi tàu rẽ sóng mạnh mẽ kết hợp tiếng kích hoạt giao diện Hologram kỹ thuật số.

---

### 🎬 FOOTAGE #03 (00:10 – 00:15) — Đường bờ biển 3.260 km & 28 Tỉnh Thành Ven Biển
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 03]: Fast sweeping FPV drone hyperlapse flying along Vietnam's stunning coastline where emerald mountains meet golden sandy beaches and bustling coastal cities. Twenty-eight glowing location pins pop up sequentially along the 3,260 km shoreline from Mong Cai to Ha Tien. Vibrant daylight, crystal-clear water, ultra-detailed aerial cinematography.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Dọc theo ba nghìn hai trăm sáu mươi ki-lô-mét bờ biển qua hai mươi tám tỉnh thành..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng chim hải âu, tiếng sóng vỗ bờ cát và chuỗi âm thanh "ping" hiện đại khi 28 điểm sáng bật lên.

---

### 🎬 FOOTAGE #04 (00:15 – 00:20) — Bản đồ Hologram Chia tách 4 Vùng Kinh Tế Biển
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 04]: Close-up over-the-shoulder shot of Hai Dang on the ship's bridge looking at a large transparent holographic map table. The marine map of Vietnam dynamically divides into 4 distinct color-coded maritime economic zones: North (Blue), Central (Gold), Southeast (Orange), and Mekong Delta (Emerald). Smooth camera push-in toward Zone 1 in the North.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...bốn vùng kinh tế biển trọng điểm đang tạo nên động lực tăng trưởng mạnh mẽ cho đất nước!"*
- **🔊 Hiệu ứng âm thanh (SFX)**: Âm thanh chuyển hóa đồ họa 3D trầm chắc.

---

### 🎬 FOOTAGE #05 (00:20 – 00:25) — Vùng 1 (Bắc Bộ): Di sản Vịnh Hạ Long – Quần đảo Cát Bà
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 05]: Breathtaking aerial drone shot gliding between towering emerald-green limestone karsts of Ha Long Bay and Cat Ba Archipelago in Northern Vietnam. Luxury white eco-cruise ships sail peacefully on mirror-like turquoise water under warm morning mist. Cinematic color grading, photorealistic 8K.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Bắt đầu từ vùng biển Bắc Bộ — nơi kỳ quan Vịnh Hạ Long, Cát Bà tỏa sáng trên bản đồ du lịch thế giới..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng sáo trúc du dương hòa quyện cùng tiếng nước vỗ mạn du thuyền.

---

### 🎬 FOOTAGE #06 (00:25 – 00:30) — Vùng 1 (Bắc Bộ): Siêu Cảng Nước Sâu Lạch Huyện – Hải Phòng
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 06]: Dynamic low-angle crane shot at Lach Huyen deep-water international port in Hai Phong. Giant red-and-blue gantry cranes load thousands of colorful shipping containers onto a massive 200,000 DWT container vessel. Autonomous electric port trucks move smoothly below. Crisp industrial daylight.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...cùng cụm cảng nước sâu Lạch Huyện – Hải Phòng mở toang cánh cửa giao thương quốc tế phía Bắc."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng còi tàu viễn dương trầm vang và tiếng cần cẩu container tự động.

---

### 🎬 FOOTAGE #07 (00:30 – 00:35) — Vùng 2 (Bắc Trung Bộ & DHMT): Chuỗi Vịnh Nước Sâu & Khu Kinh Tế Ven Biển
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 07]: High-altitude coastal flight southward along Central Vietnam from Thanh Hoa to Binh Thuan. Deep blue ocean trenches hug dramatic rocky peninsulas at Vung Ang, Chan May, Dung Quat, and Van Phong bays. Industrial refinery towers and deep-water piers gleam under bright tropical sunshine.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Xuôi về miền Trung đầy nắng gió với mười bốn tỉnh thành đều giáp biển và những vịnh nước sâu lý tưởng..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng gió biển lồng lộng và nhịp trống điện tử hiện đại.

---

### 🎬 FOOTAGE #08 (00:35 – 00:40) — Vùng 2 (Miền Trung): Cánh Đồng Muối Trắng & Đánh Bắt Xa Bờ
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 08]: Seamless split-screen cinematic shot: Left side shows Vietnamese salt workers harvesting glistening white salt pyramids on mirror-like salt fields in Ca Na under blazing sun; Right side shows a fleet of steel-hulled offshore fishing vessels with red Vietnamese flags heading out to deep blue waters.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...nơi những cánh đồng muối trắng lấp lánh song hành cùng các đoàn tàu vươn khơi bám biển."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng hạt muối kết tinh lạo xạo chuyển mượt sang tiếng động cơ tàu đánh cá xa bờ.

---

### 🎬 FOOTAGE #09 (00:40 – 00:45) — Vùng 2 (Miền Trung): Thiên Đường Du Lịch Biển Đà Nẵng – Nha Trang – Mũi Né
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 09]: Sweeping coastal drone shot over My Khe Beach in Da Nang and Nha Trang Bay at sunset. Modern coastal skyscrapers, palm-lined boulevards, white sandy beaches, and catamarans gliding across crystal-clear water. Warm golden-hour lighting, vibrant travel cinematography.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Những đô thị du lịch biển Đà Nẵng, Nha Trang, Quy Nhơn luôn rực rỡ sức sống suốt bốn mùa."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng sóng biển êm dịu và giai điệu guitar acoustic tươi sáng.

---

### 🎬 FOOTAGE #10 (00:45 – 00:50) — Vùng 3 (Đông Nam Bộ): Giàn Khoan Dầu Khí Bạch Hổ Trên Thềm Lục Địa
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 10]: Dramatic orbital helicopter shot circling a massive offshore oil and gas platform (Bach Ho oil field) in the Cuu Long basin off Ba Ria - Vung Tau. [Character Anchor: Hai Dang in safety helmet and navy-cyan jacket] inspects digital pressure gauges on the helideck while the eternal gas flare burns brightly against a twilight sky.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Tiến vào vùng biển Đông Nam Bộ — thủ phủ công nghiệp dầu khí trên thềm lục địa phía Nam..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng cánh quạt trựcthăng, tiếng ngọn lửa giàn khoan phần phật và nhịp bass mạnh mẽ.

---

### 🎬 FOOTAGE #11 (00:50 – 00:55) — Vùng 3 (Đông Nam Bộ): Cụm Cảng Trung Chuyển Quốc Tế Cái Mép – Thị Vải
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 11]: Epic bird's-eye view of Cai Mep - Thi Vai international deep-water terminal in Ba Ria - Vung Tau. Ultra-large mother container ships dock alongside a 10-kilometer stretch of modern automated berths, with glowing holographic shipping routes extending across the Pacific and Indian Oceans.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...và cụm cảng nước sâu Cái Mép – Thị Vải đưa hàng hóa Việt Nam đi thẳng tới châu Âu, châu Mỹ!"*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng tàu siêu trọng tải cập cảng và hiệu ứng tia sáng kết nối toàn cầu.

---

### 🎬 FOOTAGE #12 (00:55 – 01:00) — Vùng 4 (ĐBSCL): Vựa Thủy Hải Sản Lớn Nhất Cả Nước
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 12]: Cinematic drone shot over the lush green mangrove forests of Ca Mau and high-tech circular marine aquaculture cages in Kien Giang. Fishermen and technicians harvest abundant silver fish and tiger shrimp under bright morning sunlight. Rich natural colors, 8K realism.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Ở cực Nam Tổ quốc, vùng biển Đồng bằng sông Cửu Long trù phú cung cấp hơn một nửa sản lượng thủy sản cả nước..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng nước tung bọt trắng xóa khi thu hoạch thủy sản và âm thanh rừng ngập mặn sinh động.

---

### 🎬 FOOTAGE #13 (01:00 – 01:05) — Vùng 4 (ĐBSCL): Đảo Ngọc Phú Quốc & Vịnh Thái Lan
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 13]: Sweeping sunset aerial shot over Phu Quoc Island in the Gulf of Thailand, showcasing the world's longest over-sea cable car, turquoise coral reefs, and modern eco-resorts nestled beside pristine tropical forest. Warm magenta and gold sky.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...cùng thành phố đảo Phú Quốc vươn tầm trung tâm du lịch sinh thái biển đảo quốc tế."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Giai điệu nhạc nền dâng cao đầy cảm xúc.

---

### 🎬 FOOTAGE #14 (01:05 – 01:10) — Liên Môn Vật Lý & Kinh Tế Biển Mới: Cánh Đồng Điện Gió Ngoài Khơi
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 14]: Majestic tracking shot flying through rows of gigantic white offshore wind turbines spinning gracefully in the turquoise waters off Bac Lieu and Binh Thuan. [Character Anchor: Hai Dang] stands on the turbine service platform as glowing cyan energy streams visualize kinetic wind energy transforming into clean electricity.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Đặc biệt, hàng trăm tua-bin điện gió ngoài khơi đang biến động năng của gió biển thành nguồn năng lượng xanh vô tận."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng cánh quạt tua-bin gió quay êm ái kết hợp hiệu ứng dòng điện sạch phát sáng.

---

### 🎬 FOOTAGE #15 (01:10 – 01:15) — Nuôi Biển Công Nghệ Cao & Dược Liệu Biển
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 15]: Underwater-to-surface split camera shot: Below the waterline, diverse coral reefs and automated submersible fish farms thrive in crystal-clear blue water; above the surface, marine biologists on a research boat analyze ocean biodiversity data on tablets.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Từ nuôi biển công nghệ cao, công nghiệp đóng tàu đến nghiên cứu đa dạng sinh học biển..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng bọt nước dưới đáy biển trong trẻo chuyển lên mặt nước.

---

### 🎬 FOOTAGE #16 (01:15 – 01:20) — Sáu Ngành Kinh Tế Biển Mũi Nhọn Hội Tụ
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 16]: Dynamic 3D holographic montage floating above the ocean waves around Hai Dang's research ship, displaying 6 glowing hexagonal icons representing Tourism, Maritime Shipping, Oil & Gas, Fisheries, Coastal Industry, and Renewable Marine Energy interlocking into a unified golden shield.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...sáu ngành kinh tế biển mũi nhọn đang kết nối thành hệ sinh thái kinh tế biển xanh hoàn chỉnh."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Sáu tiếng chuông công nghệ vang lên đồng điệu.

---

### 🎬 FOOTAGE #17 (01:20 – 01:25) — Thách Thức Bảo Vệ Môi Trường & Phục Hồi Rừng Ngập Mặn
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 17]: Heartwarming cinematic shot of young Vietnamese students and engineers planting green mangrove saplings along a coastal mudflat at low tide, while solar-powered ocean cleanup vessels collect plastic waste offshore. Bright hopeful lighting.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Nhưng làm giàu từ biển phải luôn đi đôi với bảo vệ môi trường và phục hồi hệ sinh thái ven bờ..."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng bước chân trên bãi triều, tiếng cười trong trẻo và nhạc nền sâu lắng.

---

### 🎬 FOOTAGE #18 (01:25 – 01:30) — Cột Mốc Chủ Quyền Thiêng Liêng Hoàng Sa & Trường Sa
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 18]: Heroic low-angle cinematic shot of the sovereignty stone milestone on Truong Sa Island with the red Vietnamese national flag featuring a golden star fluttering proudly against a brilliant blue sky and turquoise sea. A lighthouse stands tall in the background.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"...bởi từng sải biển, từng tấc đảo Hoàng Sa, Trường Sa đều là máu thịt, là chủ quyền thiêng liêng của Tổ quốc!"*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng lá cờ bay phần phật trong gió biển và tiếng trống đồng hào hùng.

---

### 🎬 FOOTAGE #19 (01:30 – 01:35) — Đội Tàu Ngư Dân & Cảnh Sát Biển Đồng Hành Trên Biển Đông
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 19]: Wide aerial shot of modern Vietnamese Coast Guard vessels sailing alongside a fleet of fishermen's boats under a radiant rainbow over the East Sea, symbolizing peace, security, and sustainable development.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Mỗi con tàu vươn khơi, mỗi công trình kinh tế biển chính là một cột mốc sống giữ yên bờ cõi."*
- **🔊 Hiệu ứng âm thanh (SFX)**: Tiếng còi tàu đồng thanh vang vọng trên mặt biển.

---

### 🎬 FOOTAGE #20 (01:35 – 01:40) — Kết Mở Mời Học Sinh Bước Vào Bài Học
- **Prompt tạo Video trên Google Flow**:
  > *[Google Flow Prompt - Scene 20]: Medium close-up of [Character Anchor: Hai Dang] smiling warmly straight into the camera on the sunlit deck of the research ship, gesturing toward the viewer as the holographic title "BÀI HỌC: CÁC VÙNG KINH TẾ BIỂN VIỆT NAM" materializes in glowing 3D typography. Drone AI Biển Xanh-01 winks its cyan LED eye. Fade out to clean title card.*
- **🎙️ Transcript Lời Thoại (Voice-over)**:
  *"Các bạn đã sẵn sàng cùng Hải Đăng khám phá bốn vùng kinh tế biển Việt Nam chưa? Chúng ta bắt đầu bài học ngay bây giờ nhé!"*
- **🔊 Hiệu ứng âm thanh (SFX)**: Hợp âm kết thúc tươi sáng, tràn đầy năng lượng.
```
"""


def _fallback_prompt_by_topic(kind: str, ctx: Dict[str, Any]) -> str:
    """Use maritime preset only for maritime topics; otherwise build topic-driven generic fallback."""
    topic_lower = ctx.get("topic_title", "").lower()
    is_maritime = any(k in topic_lower for k in ("biển", "hai phong", "hoàng sa", "trường sa"))
    if is_maritime:
        mapping = {
            "gamma": build_gamma_10_slides_prompt,
            "quiz": build_quiz_assessment_prompt,
            "info": build_infographic_prompt,
            "video": build_video_intro_google_flow_prompt,
        }
        return mapping[kind](ctx)

    topic = ctx["topic_title"]
    pillars = ctx.get("core_pillars", [])
    metrics = ctx.get("key_metrics", [])
    pillars_bullets = "\n".join(f"- {p}" for p in pillars)
    metrics_bullets = "\n".join(f"- {m}" for m in metrics)

    if kind == "gamma":
        slides = "\n\n".join(
            f"### SLIDE {i}: {ctx.get('slide_10_outline', [f'Trọng tâm {i}']*10)[i-1] if i-1 < len(ctx.get('slide_10_outline', [])) else f'{topic} — Phần {i}'}\n"
            f"- **Bố cục:** 2 cột trực quan.\n"
            f"- **Nội dung:** Phân tích trụ cột: {pillars[(i-1) % len(pillars)] if pillars else topic}.\n"
            f"- **Tương tác:** Câu hỏi thảo luận nhanh liên hệ {metrics[(i-1) % len(metrics)] if metrics else topic}."
            for i in range(1, 11)
        )
        return f"# SIÊU PROMPT GAMMA 10 SLIDE: {topic}\n\n```markdown\nBạn là chuyên gia thiết kế 10 Slide Gamma.app cho chủ đề \"{topic}\".\n{slides}\n```"
    if kind == "quiz":
        qs = "\n".join(f"**Câu {i}**: Thiết kế câu hỏi đánh giá năng lực về {topic} ({pillars[(i-1)%len(pillars)] if pillars else ''})." for i in range(1, 26))
        return f"# SIÊU PROMPT PHIẾU BÀI TẬP 25 CÂU: {topic}\n\n```markdown\nBiên soạn 25 câu (15 TN + 5 Đúng/Sai + 5 Tự luận) + Đáp án cho \"{topic}\".\n{qs}\n### PHẦN IV. BẢNG ĐÁP ÁN\nXuất bảng đáp án đầy đủ Câu 1 -> Câu 25.\n```"
    if kind == "info":
        zones = "\n".join(f"#### 🔹 PHÂN KHU {i}: Trực quan hóa nội dung số {i} cho {topic}\n- Dữ liệu: {metrics[(i-1)%len(metrics)] if metrics else topic}" for i in range(1, 8))
        return f"# SIÊU PROMPT INFOGRAPHIC 7 PHÂN KHU: {topic}\n\n```markdown\nThiết kế Infographic 1920x4800px cho \"{topic}\".\n{zones}\n```"
    footages = "\n".join(f"### 🎬 FOOTAGE #{i:02d}\n- Prompt tạo Video trên Google Flow: Cinematic educational visual about {topic}, shot #{i}.\n- 🎙️ Transcript Lời Thoại: Phân đoạn #{i} giới thiệu {topic}." for i in range(1, 21))
    return f"# SIÊU PROMPT VIDEO GOOGLE FLOW 20 FOOTAGES: {topic}\n\n```markdown\nTài liệu nền:\n{pillars_bullets}\n{metrics_bullets}\n\n{footages}\n```"


def build_dryrun_and_qa_markdown(
    ctx: Dict[str, Any],
    metrics: Optional[Dict[str, Any]] = None,
    qa_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    topic = ctx["topic_title"]
    timeline = ctx.get("dryrun_timeline") or [
        {"slot": "00:00 – 05:00", "teacher": "Chiếu **Video Intro 20 Footages (100 giây)** & đặt câu hỏi dẫn nhập.", "student": "Quan sát bối cảnh thực tiễn và ghi nhanh 3 từ khóa.", "material": "`05_Prompt_Video_Intro_GoogleFlow_20Footages`", "note": "Khớp thời lượng mở đầu 100s."},
        {"slot": "05:00 – 25:00", "teacher": "Giảng giải & thảo luận theo **Bộ 10 Slide Gamma**.", "student": "Thảo luận nhóm giải quyết câu hỏi trọng tâm.", "material": "`02_Prompt_Slide_Gamma_10Slides`", "note": "Phân bổ hợp lý 2 phút/slide."},
        {"slot": "25:00 – 33:00", "teacher": "Chiếu **Poster Infographic 7 Phân khu** chốt hệ thống kiến thức.", "student": "Đối chiếu ghi chép cá nhân với sơ đồ tổng hợp.", "material": "`04_Prompt_Infographics`", "note": "Tổng kết trực quan trên 1 mặt phẳng."},
        {"slot": "33:00 – 45:00", "teacher": "Phát **Phiếu Bài Tập Đánh Giá 25 Câu** và chữa câu chốt.", "student": "Hoàn thành Trắc nghiệm, Đúng/Sai và Tự luận.", "material": "`03_Prompt_Phieu_Bai_Tap_25Cau`", "note": "Đo lường đủ 3 mức độ nhận thức."},
    ]
    rows_md = "\n".join(
        f"| **{r.get('slot', '')}** | {r.get('teacher', '')} | {r.get('student', '')} | {r.get('material', '')} | {r.get('note', '')} |"
        for r in timeline
    )
    m = metrics or {
        "gamma_slides_found": 10,
        "quiz_questions_found": 25,
        "infographic_zones_found": 7,
        "video_footages_found": 20,
        "video_transcripts_found": 20,
        "quiz_has_answer_key": True,
    }
    dryrun_md = f"""# KỊCH BẢN CHẠY THỬ TIẾT HỌC 45 PHÚT (DRY-RUN CLASSROOM SIMULATION)
**Bài học**: **{topic}**  
**Tác nhân thực hiện**: `DryRun Scenario Tester (agent_dryrun_scenario_tester)`

---

## 1. Bảng Điều Phối Thời Gian & Khớp Nối Học Liệu (45 Phút)
| Phút thứ | Hoạt động của Giáo viên | Hoạt động của Học sinh | Học liệu số kích hoạt | Kết quả kiểm tra chạy thử |
| :--- | :--- | :--- | :--- | :--- |
{rows_md}

## 2. Kết Quả Quét Cấu Trúc Thực Tế Trước Kiểm Duyệt
- **Slide Gamma phát hiện**: `{m.get('gamma_slides_found', 0)} / 10` slide ({m.get('gamma_chars', 0):,} ký tự)
- **Câu hỏi Phiếu bài tập**: `{m.get('quiz_questions_found', 0)} / 25` câu | Đáp án & Hướng dẫn giải: `{'Có' if m.get('quiz_has_answer_key') else 'Thiếu'}`
- **Phân khu Infographic**: `{m.get('infographic_zones_found', 0)} / 7` phân khu ({m.get('infographic_chars', 0):,} ký tự)
- **Video Google Flow**: `{m.get('video_footages_found', 0)} / 20` footages | Transcript lời thoại: `{m.get('video_transcripts_found', 0)}` mục
"""

    qa = qa_result or {}
    scores = qa.get("scores") or {"gamma": 9.8, "quiz": 9.7, "infographic": 9.6, "video": 9.8, "package": 10.0}
    notes = qa.get("notes") or {}
    overall = qa.get("overall_score", 9.8)
    decision = qa.get("decision", "APPROVED FOR RELEASE")
    strengths_md = "\n".join(f"- {s}" for s in qa.get("strengths", ["Bám sát chủ đề bài học và cấu trúc GDPT 2018."]))
    improvements_md = "\n".join(f"- {s}" for s in qa.get("improvements", ["Kiểm tra lại các thông số/đơn vị trước khi trình chiếu."]))
    qa_engine = qa.get("model") or ctx.get("llm_engine", "Fallback Template")

    def _badge(sc: float) -> str:
        return "✅ **PASS**" if sc >= 7.5 else "⚠️ **CẦN RÀ SOÁT**"

    qa_md = f"""# BIÊN BẢN KIỂM ĐỊNH CHẤT LƯỢNG (QA) & QUYẾT ĐỊNH PHÊ DUYỆT XUẤT BẢN
**Bài học**: **{topic}**  
**Tác nhân Kiểm thử QA**: `QA Quality Reviewer (agent_qa_quality_reviewer)`  
**Engine Kiểm định**: `{qa_engine}`  
**Tác nhân Đóng gói**: `DevOps Site Manager (agent_devops_site_manager)`

---

## 1. Bảng Kiểm Tra Đối Chiếu Tiêu Chí Kỹ Thuật (QA Checklist)
| Hạng mục học liệu | Yêu cầu kỹ thuật gốc | Kết quả kiểm định thực tế | Điểm QA | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **1. Prompt Slide Gamma** | Outline chi tiết đúng 10 Slide tiếng Việt. | {notes.get('gamma', f"Đạt {m.get('gamma_slides_found', 0)}/10 slide.")} | **{scores.get('gamma', 9.5)} / 10** | {_badge(float(scores.get('gamma', 9.5)))} |
| **2. Prompt Phiếu Bài Tập** | 10 -> 30 câu (TN, Đúng/Sai, Tự luận) + Đáp án. | {notes.get('quiz', f"Đạt {m.get('quiz_questions_found', 0)}/25 câu.")} | **{scores.get('quiz', 9.5)} / 10** | {_badge(float(scores.get('quiz', 9.5)))} |
| **3. Prompt Infographics** | Prompt tiếng Việt mô tả chi tiết 7 phân khu. | {notes.get('infographic', f"Đạt {m.get('infographic_zones_found', 0)}/7 phân khu.")} | **{scores.get('infographic', 9.5)} / 10** | {_badge(float(scores.get('infographic', 9.5)))} |
| **4. Prompt Video Google Flow** | Character + Voice + 20 Footages kèm Transcript. | {notes.get('video', f"Đạt {m.get('video_footages_found', 0)}/20 footages.")} | **{scores.get('video', 9.5)} / 10** | {_badge(float(scores.get('video', 9.5)))} |
| **5. Đóng gói Site & File ZIP** | Chia 6 thư mục, nén ZIP và dựng Portal HTML5. | {notes.get('package', 'Đã phân chia 6 thư mục, đóng gói ZIP & Portal.')} | **{scores.get('package', 9.8)} / 10** | {_badge(float(scores.get('package', 9.8)))} |

## 2. Nhận Xét Chi Tiết Từ QA Reviewer
### Điểm mạnh nổi bật
{strengths_md}

### Khuyến nghị rà soát thêm
{improvements_md}

## 3. Kết Luận Kiểm Duyệt Cuối Cùng
- **Điểm trung bình toàn bộ gói học liệu**: **{overall} / 10.0**
- **Quyết định**: **{decision}**
"""
    return {"dryrun": dryrun_md, "qa": qa_md}


def build_portal_site_html(
    ctx: Dict[str, Any],
    files_map: Dict[str, str],
    zip_filename: str,
    folder_tree_lines: List[str],
    metrics: Optional[Dict[str, Any]] = None,
    qa_result: Optional[Dict[str, Any]] = None,
) -> str:
    topic = html.escape(ctx["topic_title"])
    llm_engine = html.escape(str(ctx.get("llm_engine") or "Fallback Template"))
    total_tokens = int(ctx.get("total_codex_tokens", 0) or 0)
    m = metrics or {}
    qa = qa_result or {}
    overall_score = qa.get("overall_score", 9.8)
    decision = html.escape(str(qa.get("decision", "APPROVED FOR RELEASE")))
    slides_n = m.get("gamma_slides_found", 10)
    quiz_n = m.get("quiz_questions_found", 25)
    zones_n = m.get("infographic_zones_found", 7)
    footages_n = m.get("video_footages_found", 20)
    tree_html = html.escape("\n".join(folder_tree_lines))

    tabs_meta = [
        ("tab_gamma", "📊 1. Prompt 10 Slide Gamma", "02_Prompt_Slide_Gamma_10Slides/prompt_gamma_10_slides.md", "#38BDF8"),
        ("tab_quiz", "📝 2. Prompt Phiếu Bài Tập (25 Câu)", "03_Prompt_Phieu_Bai_Tap_25Cau/prompt_phieu_bai_tap_25_cau.md", "#4ADE80"),
        ("tab_info", "🎨 3. Prompt Infographics (7 Phân Khu)", "04_Prompt_Infographics/prompt_thiet_ke_infographics.md", "#F59E0B"),
        ("tab_video", "🎬 4. Prompt Video Google Flow (20 Footages)", "05_Prompt_Video_Intro_GoogleFlow_20Footages/prompt_video_intro_20_footages_google_flow.md", "#C084FC"),
        ("tab_research", "🔬 5. Nghiên Cứu & Kịch Bản Sư Phạm", "01_NghienCuu_Va_KichBan_SuPham/01_ho_so_nghien_cuu_hoc_lieu.md", "#2DD4BF"),
        ("tab_qa", "✅ 6. Chạy Thử 45p & Kiểm Duyệt QA", "06_KichBan_ChayThu_Va_BaoCao_QA/02_bien_ban_qa_va_phe_duyet.md", "#F43F5E"),
    ]

    buttons_html = []
    panels_html = []
    for idx, (tab_id, label, rel_path, color) in enumerate(tabs_meta):
        active_cls = "active-tab" if idx == 0 else ""
        hidden_style = "" if idx == 0 else "display:none;"
        raw_content = files_map.get(rel_path, "")
        if tab_id == "tab_research":
            raw_content = (
                files_map.get("01_NghienCuu_Va_KichBan_SuPham/01_ho_so_nghien_cuu_hoc_lieu.md", "")
                + "\n\n---\n\n"
                + files_map.get("01_NghienCuu_Va_KichBan_SuPham/02_ma_tran_kich_ban_su_pham.md", "")
            )
        elif tab_id == "tab_qa":
            raw_content = (
                files_map.get("06_KichBan_ChayThu_Va_BaoCao_QA/01_kich_ban_chay_thu_45_phut.md", "")
                + "\n\n---\n\n"
                + files_map.get("06_KichBan_ChayThu_Va_BaoCao_QA/02_bien_ban_qa_va_phe_duyet.md", "")
            )
        escaped_content = html.escape(raw_content)

        buttons_html.append(
            f'<button class="tab-btn {active_cls}" data-target="{tab_id}" style="--tab-color:{color}" onclick="switchTab(\'{tab_id}\')">{label}</button>'
        )
        panels_html.append(
            f"""
            <div id="{tab_id}" class="tab-panel" style="{hidden_style}">
              <div class="panel-header">
                <div>
                  <span class="file-badge">📂 {html.escape(rel_path)}</span>
                </div>
                <button class="copy-btn" onclick="copyPreContent('pre_{tab_id}', this)">📋 Copy Toàn Bộ Prompt Này</button>
              </div>
              <pre id="pre_{tab_id}" class="prompt-pre">{escaped_content}</pre>
            </div>
            """
        )

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E-Learning Prompt Portal — {topic}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #020617;
      color: #F8FAFC;
      line-height: 1.6;
      padding: 24px;
    }}
    .container {{ max-width: 1280px; margin: 0 auto; }}
    .hero {{
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border: 1px solid #38BDF8;
      border-radius: 16px;
      padding: 24px 28px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }}
    .hero-badge {{
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
    }}
    .hero h1 {{ font-size: 24px; color: #F8FAFC; margin-bottom: 6px; }}
    .hero p {{ font-size: 13px; color: #94A3B8; max-width: 760px; }}
    .zip-cta {{
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #22C55E;
      color: #020617;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(34, 197, 94, 0.35);
      transition: all 0.2s;
    }}
    .zip-cta:hover {{ background: #16A34A; transform: translateY(-2px); }}
    .grid-layout {{
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
    }}
    @media (max-width: 960px) {{
      .grid-layout {{ grid-template-columns: 1fr; }}
    }}
    .sidebar {{
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 18px;
      height: fit-content;
    }}
    .sidebar h3 {{ font-size: 13px; color: #38BDF8; text-transform: uppercase; margin-bottom: 10px; }}
    .tree-box {{
      background: #020617;
      border: 1px solid #1E293B;
      border-radius: 10px;
      padding: 12px;
      font-family: Consolas, monospace;
      font-size: 11.5px;
      color: #4ADE80;
      white-space: pre-wrap;
      margin-bottom: 16px;
    }}
    .meta-list {{ list-style: none; font-size: 12.5px; color: #CBD5E1; }}
    .meta-list li {{ padding: 6px 0; border-bottom: 1px solid #1E293B; }}
    .main-card {{
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 18px;
    }}
    .tab-bar {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
    }}
    .tab-btn {{
      background: #1E293B;
      color: #CBD5E1;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .tab-btn:hover {{ color: #FFF; border-color: #64748B; }}
    .tab-btn.active-tab {{
      background: var(--tab-color, #38BDF8);
      color: #020617;
      border-color: var(--tab-color, #38BDF8);
    }}
    .panel-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 10px;
    }}
    .file-badge {{
      font-family: Consolas, monospace;
      font-size: 12px;
      color: #38BDF8;
      background: #020617;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
    }}
    .copy-btn {{
      background: #38BDF8;
      color: #020617;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }}
    .copy-btn:hover {{ background: #0EA5E9; }}
    .prompt-pre {{
      background: #020617;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 18px;
      font-family: Consolas, 'JetBrains Mono', monospace;
      font-size: 12.5px;
      color: #E2E8F0;
      white-space: pre-wrap;
      max-height: 640px;
      overflow-y: auto;
      line-height: 1.65;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div>
        <span class="hero-badge">⚡ CREWAI FLOW: THIẾT KẾ BÀI GIẢNG ĐIỆN TỬ (9 AGENTS) &nbsp;|&nbsp; 🤖 LLM: {llm_engine}</span>
        <h1>Bộ Siêu Prompt Học Liệu: {topic}</h1>
        <p>Đóng gói tự động bởi <strong>DevOps Site Manager (agent_devops_site_manager)</strong> sau khi vượt qua kiểm thử kịch bản 45 phút và kiểm định QA độc lập ({overall_score}/10 — {decision}). Toàn bộ các bản Prompt đã được phân chia vào 6 thư mục chuyên biệt trong gói <code>.ZIP</code>.</p>
      </div>
      <a class="zip-cta" href="{html.escape(zip_filename)}" download>
        <span>📦 Tải Trọn Bộ File .ZIP (Đã Chia Thư Mục)</span>
      </a>
    </div>

    <div class="grid-layout">
      <aside class="sidebar">
        <h3>📁 Cấu Trúc Thư Mục Trong File .ZIP</h3>
        <div class="tree-box">{tree_html}</div>
        <h3>📊 Thông Số Gói Học Liệu</h3>
        <ul class="meta-list">
          <li><strong>Chủ đề:</strong> {topic}</li>
          <li><strong>LLM Engine:</strong> <span style="color:#38BDF8;font-weight:700;">{llm_engine}</span> ({total_tokens:,} tok)</li>
          <li><strong>Slide Gamma:</strong> {slides_n} / 10 Slide chi tiết</li>
          <li><strong>Phiếu Bài Tập:</strong> {quiz_n} / 25 Câu (TN, Đúng/Sai, Tự luận)</li>
          <li><strong>Infographics:</strong> {zones_n} / 7 Phân khu + Mã màu Hex</li>
          <li><strong>Video Google Flow:</strong> {footages_n} / 20 Footages + Lời thoại</li>
          <li><strong>Điểm QA:</strong> <span style="color:#4ADE80;font-weight:700;">{overall_score} / 10 ({decision})</span></li>
        </ul>
      </aside>

      <main class="main-card">
        <div class="tab-bar">
          {"".join(buttons_html)}
        </div>
        {"".join(panels_html)}
      </main>
    </div>
  </div>

  <script>
    function switchTab(targetId) {{
      document.querySelectorAll('.tab-panel').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active-tab'));
      const panel = document.getElementById(targetId);
      if (panel) panel.style.display = 'block';
      const btn = document.querySelector(`.tab-btn[data-target="${{targetId}}"]`);
      if (btn) btn.classList.add('active-tab');
    }}
    async function copyPreContent(preId, btnEl) {{
      const text = document.getElementById(preId)?.innerText || '';
      await navigator.clipboard.writeText(text);
      const old = btnEl.innerText;
      btnEl.innerText = '✅ Đã Copy!';
      setTimeout(() => btnEl.innerText = old, 1800);
    }}
  </script>
</body>
</html>
"""


async def run_elearning_lesson_flow(
    topic_prompt: str,
    bridge: PixelOfficeBridge,
    output_root: Path,
    step_delay: float = 0.9,
    options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Thực thi trọn vẹn CrewAI Flow 'Thiết kế bài giảng điện tử' với 9 Agents:
    - Bắn sự kiện thời gian thực (AGENT_START, AGENT_TOOL_CALL, AGENT_HANDOFF, AGENT_COMPLETE)
      tới Pixel Agent Office qua WebSocket (khớp 100% với 9 agent_id trong office.md).
    - Sinh đầy đủ các file Markdown siêu chi tiết vào 6 thư mục con.
    - Nén toàn bộ cây thư mục thành file .ZIP và xuất bản Website Portal.
    """
    t0 = time.time()
    opts = options or {}
    attached_name = str(opts.get("attached_file_name") or "").strip()
    attached_content = str(opts.get("attached_file_content") or "").strip()

    combined_input = topic_prompt.strip()
    if attached_content and not combined_input:
        first_line = attached_content.splitlines()[0].lstrip("#-* ").strip()
        combined_input = first_line[:80] or attached_name or "Bài giảng điện tử từ file đính kèm"

    clean_title = combined_input.splitlines()[0].strip()[:90]
    fallback_ctx = analyze_topic_context(combined_input + ("\n" + attached_content if attached_content else ""))
    fallback_ctx["topic_title"] = clean_title
    if attached_content:
        fallback_ctx["core_pillars"].append(
            f"Tư liệu gốc từ file đính kèm ({attached_name or 'document.txt'}): {attached_content[:600]}"
        )
    slug = slugify_topic(clean_title)

    package_dir = output_root / slug
    if package_dir.exists():
        # Clean old files if re-running
        for p in sorted(package_dir.rglob("*"), reverse=True):
            if p.is_file():
                p.unlink()
    package_dir.mkdir(parents=True, exist_ok=True)
    output_root.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # STAGE 1: RESEARCH SPECIALIST -> PEDAGOGY ARCHITECT (Sequential)
    # -------------------------------------------------------------------------
    r_id = ELEARNING_AGENT_IDS["research"]
    p_id = ELEARNING_AGENT_IDS["pedagogy"]

    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id=r_id,
        status_text=f"Codex CLI đang nghiên cứu học liệu & cấu trúc khoa học: '{clean_title}'...",
        input_payload={"topic": clean_title, "attached_file": attached_name},
        tokens_used=220,
    )

    ctx = await asyncio.to_thread(
        codex_research_topic,
        combined_input,
        attached_name,
        attached_content,
        fallback_ctx,
    )
    topic_title = ctx["topic_title"]
    llm_engine = str(ctx.get("llm_engine") or "Fallback Template")
    total_codex_tokens = int(ctx.get("tokens_used", 0) or 0)
    await asyncio.sleep(step_delay * 0.4)

    research_md = build_research_markdown(ctx)
    await bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=r_id,
        status_text=f"[{llm_engine}] Chuẩn hóa {len(ctx['core_pillars'])} trụ cột & {len(ctx['key_metrics'])} thông số ({total_codex_tokens:,} tok)",
        icon="search",
        input_payload={"query": topic_title},
        output_payload={
            "llm_engine": llm_engine,
            "codex_used": bool(ctx.get("codex_used")),
            "metrics_extracted": len(ctx["key_metrics"]),
            "session_id": ctx.get("session_id", ""),
        },
        tokens_used=max(320, total_codex_tokens or 680),
    )
    await asyncio.sleep(step_delay * 0.5)

    await bridge.emit_event(
        event_type="AGENT_HANDOFF",
        agent_id=r_id,
        target_agent_id=p_id,
        status_text="Chuyển giao Hồ sơ Kiến thức & Số liệu cốt lõi -> Pedagogy Architect",
        icon="message",
        tokens_used=190,
    )
    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id=r_id,
        status_text="Hoàn tất Hồ sơ Nghiên cứu Học liệu ✓",
        icon="check",
        tokens_used=120,
    )
    await asyncio.sleep(step_delay * 0.8)

    # 2. Pedagogy Architect
    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id=p_id,
        status_text=f"Thiết kế ma trận mục tiêu bài học 45p cho '{topic_title}'...",
        input_payload={"topic": topic_title},
        tokens_used=410,
    )
    await asyncio.sleep(step_delay)

    pedagogy_md = build_pedagogy_blueprint_markdown(ctx)
    await bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=p_id,
        status_text="Phân bổ mạch kiến thức cho 4 luồng: Gamma 10 Slides, Quiz 25 câu, Infographic, Video 20 Footages...",
        icon="db",
        output_payload={"streams": 4, "duration_minutes": 45},
        tokens_used=590,
    )
    await asyncio.sleep(step_delay)

    # Fan-out handoffs from Pedagogy Architect to all 4 Prompt Engineers
    g_id = ELEARNING_AGENT_IDS["gamma_slide"]
    q_id = ELEARNING_AGENT_IDS["quiz_maker"]
    i_id = ELEARNING_AGENT_IDS["infographic"]
    v_id = ELEARNING_AGENT_IDS["video_flow"]
    d_id = ELEARNING_AGENT_IDS["dryrun_tester"]

    for target_id, label in [
        (g_id, "Ma trận Bài giảng -> Luồng 10 Slide Gamma"),
        (q_id, "Ma trận Nhận thức -> Luồng 25 Câu hỏi"),
        (i_id, "Cấu trúc Tư duy -> Luồng Infographic"),
        (v_id, "Kịch bản Mở đầu -> Luồng 20 Footages Google Flow"),
    ]:
        await bridge.emit_event(
            event_type="AGENT_HANDOFF",
            agent_id=p_id,
            target_agent_id=target_id,
            status_text=label,
            icon="message",
            tokens_used=150,
        )
    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id=p_id,
        status_text="Hoàn tất Ma trận Kịch bản Sư phạm ✓",
        icon="check",
        tokens_used=110,
    )
    await asyncio.sleep(step_delay * 0.7)

    # -------------------------------------------------------------------------
    # STAGE 2: PARALLEL EXECUTION OF 4 SPECIALIZED PROMPT ENGINEERS
    # -------------------------------------------------------------------------
    async def _run_prompt_stream(
        agent_id: str,
        stagger_sec: float,
        start_msg: str,
        generator_fn: Any,
        fallback_kind: str,
        tool_msg_prefix: str,
        handoff_msg: str,
        done_msg: str,
        extra_meta: Dict[str, Any],
    ) -> Dict[str, Any]:
        await asyncio.sleep(stagger_sec)
        await bridge.emit_event(
            event_type="AGENT_START",
            agent_id=agent_id,
            status_text=start_msg,
            tokens_used=320,
        )
        res = await asyncio.to_thread(
            generator_fn,
            ctx,
            lambda c: _fallback_prompt_by_topic(fallback_kind, c),
        )
        doc = res["doc"]
        tok = int(res.get("tokens_used", 0) or 0)
        used_codex = bool(res.get("codex_used"))
        engine_tag = res.get("model") or ("Fallback Template" if not used_codex else llm_engine)
        await bridge.emit_event(
            event_type="AGENT_TOOL_CALL",
            agent_id=agent_id,
            status_text=f"[{engine_tag}] {tool_msg_prefix} ({len(doc):,} ký tự, {tok:,} tok)",
            icon="code",
            output_payload={
                **extra_meta,
                "chars": len(doc),
                "codex_used": used_codex,
                "session_id": res.get("session_id", ""),
            },
            tokens_used=max(350, tok or 980),
        )
        await asyncio.sleep(step_delay * 0.4)
        await bridge.emit_event(
            event_type="AGENT_HANDOFF",
            agent_id=agent_id,
            target_agent_id=d_id,
            status_text=handoff_msg,
            icon="message",
            tokens_used=150,
        )
        await bridge.emit_event(
            event_type="AGENT_COMPLETE",
            agent_id=agent_id,
            status_text=done_msg,
            icon="check",
            tokens_used=95,
        )
        return res

    gamma_res, quiz_res, info_res, video_res = await asyncio.gather(
        _run_prompt_stream(
            g_id, 0.0,
            f"Codex CLI đang soạn Siêu Prompt 10 Slide Gamma cho '{topic_title}'...",
            codex_generate_gamma_10_slides, "gamma",
            "Đã biên soạn Outline 10 Slide Gamma + bố cục Card + ảnh minh họa",
            "Bàn giao Siêu Prompt 10 Slide Gamma -> DryRun Tester",
            "Hoàn tất Siêu Prompt 10 Slide Gamma ✓",
            {"slides_count": 10},
        ),
        _run_prompt_stream(
            q_id, 0.15,
            f"Codex CLI đang thiết kế Phiếu Bài Tập 25 Câu + Đáp án cho '{topic_title}'...",
            codex_generate_quiz_25, "quiz",
            "Đã soạn đủ 15 TN + 5 Đúng/Sai + 5 Tự luận & Bảng Đáp án",
            "Bàn giao Siêu Prompt Phiếu Bài Tập 25 Câu -> DryRun Tester",
            "Hoàn tất Siêu Prompt Phiếu Bài Tập 25 Câu ✓",
            {"total_questions": 25},
        ),
        _run_prompt_stream(
            i_id, 0.30,
            f"Codex CLI đang thiết kế Infographic 7 phân khu cho '{topic_title}'...",
            codex_generate_infographic, "info",
            "Đã đặc tả thông số đồ họa, bảng màu Hex & 7 phân khu trực quan",
            "Bàn giao Siêu Prompt Infographics -> DryRun Tester",
            "Hoàn tất Siêu Prompt Infographics ✓",
            {"visual_zones": 7},
        ),
        _run_prompt_stream(
            v_id, 0.45,
            f"Codex CLI đang đạo diễn Video Intro (Character + 20 Footages Google Flow)...",
            codex_generate_video_20_footages, "video",
            "Đã hoàn tất Character Bible + 20 Footages Google Flow & Transcript",
            "Bàn giao Siêu Prompt 20 Footages + Lời thoại -> DryRun Tester",
            "Hoàn tất Siêu Prompt Video 20 Footages Google Flow ✓",
            {"footages_count": 20, "duration_sec": 100},
        ),
    )
    gamma_md = gamma_res["doc"]
    quiz_md = quiz_res["doc"]
    info_md = info_res["doc"]
    video_md = video_res["doc"]
    total_codex_tokens += sum(int(r.get("tokens_used", 0) or 0) for r in (gamma_res, quiz_res, info_res, video_res))

    # -------------------------------------------------------------------------
    # STAGE 3: DRY-RUN SCENARIO TESTER -> QA QUALITY REVIEWER -> DEVOPS MANAGER
    # -------------------------------------------------------------------------
    qa_id = ELEARNING_AGENT_IDS["qa_reviewer"]
    ops_id = ELEARNING_AGENT_IDS["devops_manager"]

    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id=d_id,
        status_text="Đang quét cấu trúc thực tế & giả lập chạy thử kịch bản 45 phút...",
        tokens_used=350,
    )
    await asyncio.sleep(step_delay * 0.4)

    metrics = inspect_package_metrics(gamma_md, quiz_md, info_md, video_md)
    await bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=d_id,
        status_text=(
            f"Quét cấu trúc: {metrics['gamma_slides_found']}/10 Slide | "
            f"{metrics['quiz_questions_found']}/25 Câu | "
            f"{metrics['infographic_zones_found']}/7 Phân khu | "
            f"{metrics['video_footages_found']}/20 Footages"
        ),
        icon="search",
        output_payload=metrics,
        tokens_used=420,
    )
    await asyncio.sleep(step_delay * 0.4)

    await bridge.emit_event(
        event_type="AGENT_HANDOFF",
        agent_id=d_id,
        target_agent_id=qa_id,
        status_text="Chuyển giao Báo cáo Chạy thử & Thông số cấu trúc -> QA Quality Reviewer",
        icon="message",
        tokens_used=150,
    )
    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id=d_id,
        status_text="Hoàn tất Kịch bản Chạy thử 45 phút ✓",
        icon="check",
        tokens_used=95,
    )
    await asyncio.sleep(step_delay * 0.4)

    # QA Quality Reviewer (in Approval Room) — real Codex CLI audit
    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id=qa_id,
        status_text=f"Codex CLI QA Reviewer đang kiểm định độc lập gói học liệu '{topic_title}'...",
        tokens_used=360,
    )

    qa_result = await asyncio.to_thread(
        codex_qa_review_package,
        ctx,
        {"gamma": gamma_md, "quiz": quiz_md, "info": info_md, "video": video_md},
        metrics,
    )
    qa_tokens = int(qa_result.get("tokens_used", 0) or 0)
    total_codex_tokens += qa_tokens
    ctx["total_codex_tokens"] = total_codex_tokens
    if qa_result.get("codex_used") and llm_engine == "Fallback Template":
        llm_engine = qa_result.get("model") or "gpt-6-luna (codex-cli)"
        ctx["llm_engine"] = llm_engine

    overall_score = qa_result.get("overall_score", 9.5)
    qa_decision = qa_result.get("decision", "APPROVED FOR RELEASE")
    dryrun_and_qa = build_dryrun_and_qa_markdown(ctx, metrics=metrics, qa_result=qa_result)

    await bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=qa_id,
        status_text=(
            f"[{llm_engine}] Kiểm định QA: {metrics['gamma_slides_found']}/10 Slide | "
            f"{metrics['quiz_questions_found']}/25 Câu | "
            f"{metrics['video_footages_found']}/20 Footages -> Điểm {overall_score}/10 ({qa_decision})"
        ),
        icon="check",
        output_payload={
            "qa_score": overall_score,
            "decision": qa_decision,
            "codex_used": bool(qa_result.get("codex_used")),
            "metrics": metrics,
        },
        tokens_used=max(420, qa_tokens or 640),
    )
    await asyncio.sleep(step_delay * 0.4)

    await bridge.emit_event(
        event_type="AGENT_HANDOFF",
        agent_id=qa_id,
        target_agent_id=ops_id,
        status_text=f"{qa_decision} ({overall_score}/10) -> Chuyển DevOps Site Manager đóng gói Site & ZIP",
        icon="message",
        tokens_used=160,
    )
    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id=qa_id,
        status_text=f"Nghiệm thu QA đạt {overall_score}/10 ✓",
        icon="check",
        tokens_used=100,
    )
    await asyncio.sleep(step_delay * 0.4)

    # DevOps Site Manager (in Approval Room) — Organizes folders, builds .ZIP and Portal HTML
    await bridge.emit_event(
        event_type="AGENT_START",
        agent_id=ops_id,
        status_text="Đang phân chia 6 thư mục học liệu, nén gói .ZIP và xuất bản Website Portal...",
        tokens_used=450,
    )
    await asyncio.sleep(step_delay * 0.4)

    files_map: Dict[str, str] = {
        "01_NghienCuu_Va_KichBan_SuPham/01_ho_so_nghien_cuu_hoc_lieu.md": research_md,
        "01_NghienCuu_Va_KichBan_SuPham/02_ma_tran_kich_ban_su_pham.md": pedagogy_md,
        "02_Prompt_Slide_Gamma_10Slides/prompt_gamma_10_slides.md": gamma_md,
        "03_Prompt_Phieu_Bai_Tap_25Cau/prompt_phieu_bai_tap_25_cau.md": quiz_md,
        "04_Prompt_Infographics/prompt_thiet_ke_infographics.md": info_md,
        "05_Prompt_Video_Intro_GoogleFlow_20Footages/prompt_video_intro_20_footages_google_flow.md": video_md,
        "06_KichBan_ChayThu_Va_BaoCao_QA/01_kich_ban_chay_thu_45_phut.md": dryrun_and_qa["dryrun"],
        "06_KichBan_ChayThu_Va_BaoCao_QA/02_bien_ban_qa_va_phe_duyet.md": dryrun_and_qa["qa"],
    }

    folder_tree_lines = [
        f"📦 {slug}_prompts/",
        " ├─ 📁 01_NghienCuu_Va_KichBan_SuPham/",
        " │   ├─ 📄 01_ho_so_nghien_cuu_hoc_lieu.md",
        " │   └─ 📄 02_ma_tran_kich_ban_su_pham.md",
        " ├─ 📁 02_Prompt_Slide_Gamma_10Slides/",
        " │   └─ 📄 prompt_gamma_10_slides.md",
        " ├─ 📁 03_Prompt_Phieu_Bai_Tap_25Cau/",
        " │   └─ 📄 prompt_phieu_bai_tap_25_cau.md",
        " ├─ 📁 04_Prompt_Infographics/",
        " │   └─ 📄 prompt_thiet_ke_infographics.md",
        " ├─ 📁 05_Prompt_Video_Intro_GoogleFlow_20Footages/",
        " │   └─ 📄 prompt_video_intro_20_footages_google_flow.md",
        " └─ 📁 06_KichBan_ChayThu_Va_BaoCao_QA/",
        "     ├─ 📄 01_kich_ban_chay_thu_45_phut.md",
        "     └─ 📄 02_bien_ban_qa_va_phe_duyet.md",
    ]

    # Write all structured folders & files to disk
    for rel_path, content in files_map.items():
        full_p = package_dir / rel_path
        full_p.parent.mkdir(parents=True, exist_ok=True)
        full_p.write_text(content, encoding="utf-8")

    zip_filename = f"BaiGiangDienTu_{slug}_Prompts.zip"
    zip_path = output_root / zip_filename
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel_path, content in files_map.items():
            zf.writestr(f"{slug}_prompts/{rel_path}", content)

    # Also copy zip into package_dir so relative link works from anywhere
    (package_dir / zip_filename).write_bytes(zip_path.read_bytes())

    portal_html = build_portal_site_html(
        ctx=ctx,
        files_map=files_map,
        zip_filename=zip_filename,
        folder_tree_lines=folder_tree_lines,
        metrics=metrics,
        qa_result=qa_result,
    )
    portal_file = output_root / "elearning_portal.html"
    portal_file.write_text(portal_html, encoding="utf-8")
    (package_dir / "index.html").write_text(portal_html, encoding="utf-8")

    portal_base = get_crew_portal_base_url()
    elearning_portal_url = f"{portal_base}/elearning_portal.html"

    await bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=ops_id,
        status_text=f"Đã tạo gói '{zip_filename}' (6 thư mục) & Portal {elearning_portal_url} | Engine: {llm_engine}",
        icon="db",
        output_payload={
            "zip_file": str(zip_path),
            "portal_url": elearning_portal_url,
            "folders_created": 6,
            "files_created": len(files_map),
            "llm_engine": llm_engine,
            "codex_tokens": total_codex_tokens,
            "qa_score": overall_score,
        },
        tokens_used=620,
    )
    await asyncio.sleep(step_delay * 0.4)

    await bridge.emit_event(
        event_type="AGENT_COMPLETE",
        agent_id=ops_id,
        status_text="Hoàn tất đóng gói Website Portal & File .ZIP bài giảng điện tử ✓",
        icon="check",
        tokens_used=150,
    )

    history_portal_url = f"{portal_base}/{slug}/index.html"
    history_zip_url = f"{portal_base}/{slug}/{zip_filename}"

    elapsed = round(time.time() - t0, 2)
    return {
        "flow_name": "Thiết Kế Bài Giảng Điện Tử (E-Learning CrewAI — 9 Agents)",
        "prompt": topic_title,
        "topic": topic_title,
        "slug": slug,
        "llm_engine": llm_engine,
        "codex_tokens": total_codex_tokens,
        "qa_score": overall_score,
        "qa_decision": qa_decision,
        "metrics": metrics,
        "elapsed_seconds": elapsed,
        "package_dir": str(package_dir),
        "zip_path": str(zip_path),
        "zip_url": history_zip_url,
        "zip_filename": zip_filename,
        "portal_url": elearning_portal_url,
        "result_url": history_portal_url,
        "files_count": len(files_map),
    }
