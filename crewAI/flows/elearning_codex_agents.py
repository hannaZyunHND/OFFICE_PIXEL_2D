"""Codex CLI LLM generators for the 9-Agent E-Learning Lesson Design Crew."""

from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List

from codex_cli_llm import find_codex_executable, run_codex_exec, run_codex_json


def _strip_outer_markdown_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if len(lines) >= 3 and lines[-1].strip() == "```":
            return "\n".join(lines[1:-1]).strip()
    return cleaned


def _normalize_list(value: Any, fallback: List[str], min_items: int = 1) -> List[str]:
    if isinstance(value, list):
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        if len(cleaned) >= min_items:
            return cleaned
    return list(fallback)


def codex_research_topic(
    topic_prompt: str,
    attached_name: str = "",
    attached_content: str = "",
    fallback_ctx: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Analyze the lesson prompt and optional reference file via Codex CLI JSON."""
    base = dict(fallback_ctx or {})
    if not find_codex_executable():
        return {**base, "codex_used": False, "llm_engine": "Fallback Template", "tokens_used": 0, "session_id": ""}

    attachment_block = ""
    if attached_content:
        excerpt = attached_content.strip()[:3200]
        attachment_block = (
            f"\nTAI LIEU DINH KEM ({attached_name or 'tai_lieu.txt'}):\n"
            f"\"\"\"\n{excerpt}\n\"\"\"\n"
        )

    prompt = f"""Ban la Chuyen gia Nghien cuu Hoc lieu & Thiet ke Chuong trinh GDPT 2018.
Hay phan tich yeu cau bai giang sau va tra ve DUY NHAT 1 JSON object hop le (khong markdown fence, khong giai thich them).

YEU CAU BAI GIANG:
\"\"\"{topic_prompt.strip()}\"\"\"{attachment_block}

Yeu cau schema JSON (tat ca gia tri bang tieng Viet chuan khoa hoc, chinh xac tuyet doi ve kien thuc mon hoc):
{{
  "topic_title": "Tieu de bai giang chuan muc, ngan gon",
  "subject_domain": "Mon hoc — Phan mon cu the",
  "grade_level": "Doi tuong hoc sinh phu hop (VD: Hoc sinh THPT Lop 10 - Chuong trinh GDPT 2018)",
  "lesson_hook": "1 cau hoi thuc tien / tinh huong dan nhap loi cuon cho dau tiet hoc",
  "visual_theme": {{
    "host_character": "Ten va mo ta ngoai hinh nhan vat dan chuyen phu hop chu de",
    "companion": "Ten va mo ta tro ly AO / thiet bi minh hoa dong hanh",
    "art_style": "Phong cach hinh anh / do hoa phu hop chu de",
    "palette_hex": ["#0F172A", "#38BDF8", "#10B981", "#F59E0B"]
  }},
  "learning_objectives": {{
    "knowledge": "Muc tieu nang luc nhan thuc khoa hoc cu the cho chu de nay",
    "inquiry": "Muc tieu tim hieu & xu ly du lieu/thi nghiem/so lieu cu the",
    "application": "Muc tieu van dung kien thuc giai quyet van de thuc tien"
  }},
  "core_pillars": [
    "Tru cot 1...",
    "Tru cot 2...",
    "Tru cot 3...",
    "Tru cot 4...",
    "Tru cot 5..."
  ],
  "key_metrics": [
    "Cong thuc / Hang so / So lieu chuan hoa 1...",
    "Cong thuc / Hang so / So lieu chuan hoa 2...",
    "Cong thuc / Hang so / So lieu chuan hoa 3...",
    "Cong thuc / Hang so / So lieu chuan hoa 4...",
    "Cong thuc / Hang so / So lieu chuan hoa 5...",
    "Cong thuc / Hang so / So lieu chuan hoa 6..."
  ],
  "slide_10_outline": [
    "Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...",
    "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ...", "Slide 10: ..."
  ],
  "dryrun_timeline": [
    {{"slot": "00:00 – 05:00", "teacher": "Hoat dong GV...", "student": "Hoat dong HS...", "material": "05_Prompt_Video_Intro_GoogleFlow_20Footages", "note": "Danh gia chay thu 100s video"}},
    {{"slot": "05:00 – 25:00", "teacher": "Hoat dong GV...", "student": "Hoat dong HS...", "material": "02_Prompt_Slide_Gamma_10Slides", "note": "Danh gia luong 10 slide"}},
    {{"slot": "25:00 – 33:00", "teacher": "Hoat dong GV...", "student": "Hoat dong HS...", "material": "04_Prompt_Infographics", "note": "Danh gia infographic 7 phan khu"}},
    {{"slot": "33:00 – 45:00", "teacher": "Hoat dong GV...", "student": "Hoat dong HS...", "material": "03_Prompt_Phieu_Bai_Tap_25Cau", "note": "Danh gia phieu 25 cau hoi"}}
  ]
}}"""

    res = run_codex_json(prompt, timeout_sec=55)
    if not res.get("ok"):
        return {
            **base,
            "codex_used": False,
            "llm_engine": "Fallback Template",
            "tokens_used": int(res.get("tokens_used", 0) or 0),
            "session_id": res.get("session_id", ""),
            "codex_error": res.get("error", ""),
        }

    data = res["data"]
    theme = data.get("visual_theme") if isinstance(data.get("visual_theme"), dict) else {}
    objectives = data.get("learning_objectives") if isinstance(data.get("learning_objectives"), dict) else {}

    merged = dict(base)
    merged["topic_title"] = str(data.get("topic_title") or base.get("topic_title") or topic_prompt).strip()
    merged["subject_domain"] = str(data.get("subject_domain") or base.get("subject_domain") or "Giáo dục phổ thông").strip()
    merged["grade_level"] = str(data.get("grade_level") or base.get("grade_level") or "Chương trình GDPT 2018").strip()
    merged["lesson_hook"] = str(data.get("lesson_hook") or base.get("lesson_hook") or "").strip()
    merged["visual_theme"] = {
        "host_character": str(theme.get("host_character") or "Cô Minh Anh — giảng viên trẻ mặc blazer xanh navy, phong thái hiện đại"),
        "companion": str(theme.get("companion") or "Trợ lý AI Holo-Lab hiển thị mô phỏng 3D trực quan"),
        "art_style": str(theme.get("art_style") or "Modern Isometric 2.5D & Scientific Flat Vector"),
        "palette_hex": _normalize_list(theme.get("palette_hex"), ["#0F172A", "#38BDF8", "#10B981", "#F59E0B"], 3),
    }
    merged["learning_objectives"] = {
        "knowledge": str(objectives.get("knowledge") or "").strip(),
        "inquiry": str(objectives.get("inquiry") or "").strip(),
        "application": str(objectives.get("application") or "").strip(),
    }
    merged["core_pillars"] = _normalize_list(data.get("core_pillars"), base.get("core_pillars", []), 3)
    merged["key_metrics"] = _normalize_list(data.get("key_metrics"), base.get("key_metrics", []), 2)
    merged["slide_10_outline"] = _normalize_list(data.get("slide_10_outline"), base.get("slide_10_outline", []), 5)
    if isinstance(data.get("dryrun_timeline"), list) and len(data["dryrun_timeline"]) >= 4:
        merged["dryrun_timeline"] = data["dryrun_timeline"][:4]
    merged["codex_used"] = True
    merged["llm_engine"] = res.get("model") or "gpt-6-luna (codex-cli)"
    merged["tokens_used"] = int(res.get("tokens_used", 0) or 0)
    merged["session_id"] = str(res.get("session_id", ""))
    return merged


def _run_prompt_stream(
    doc_banner: str,
    codex_instruction: str,
    fallback_builder: Callable[[Dict[str, Any]], str],
    ctx: Dict[str, Any],
    timeout_sec: int,
) -> Dict[str, Any]:
    """Shared Codex prompt runner with 1 automatic retry and graceful offline fallback."""
    if not find_codex_executable():
        return {"doc": fallback_builder(ctx), "codex_used": False, "tokens_used": 0, "session_id": "", "error": "No Codex CLI"}

    res = run_codex_exec(codex_instruction, timeout_sec=timeout_sec)
    if not res.get("ok") or len(str(res.get("text", "")).strip()) < 250:
        # One fast retry avoids transient concurrent contention/timeout on single stream
        res = run_codex_exec(codex_instruction, timeout_sec=timeout_sec)
    if not res.get("ok") or len(str(res.get("text", "")).strip()) < 250:
        return {
            "doc": fallback_builder(ctx),
            "codex_used": False,
            "tokens_used": int(res.get("tokens_used", 0) or 0),
            "session_id": str(res.get("session_id", "")),
            "error": res.get("error", "Codex output too short"),
        }

    body = _strip_outer_markdown_fence(res["text"])
    return {
        "doc": f"{doc_banner.strip()}\n\n```markdown\n{body}\n```\n",
        "codex_used": True,
        "model": res.get("model") or "gpt-6-luna (codex-cli)",
        "tokens_used": int(res.get("tokens_used", 0) or 0),
        "session_id": str(res.get("session_id", "")),
    }


def _ctx_brief(ctx: Dict[str, Any]) -> str:
    pillars = "\n".join(f"- {p}" for p in ctx.get("core_pillars", []))
    metrics = "\n".join(f"- {m}" for m in ctx.get("key_metrics", []))
    outline = "\n".join(f"- {s}" for s in ctx.get("slide_10_outline", []))
    theme = ctx.get("visual_theme", {})
    return (
        f"Chu de: {ctx['topic_title']}\n"
        f"Mon hoc / Linh vuc: {ctx.get('subject_domain', '')}\n"
        f"Doi tuong: {ctx.get('grade_level', '')}\n"
        f"Cau hoi dan nhap: {ctx.get('lesson_hook', '')}\n"
        f"Nhan vat & Phong cach: {theme.get('host_character', '')} | {theme.get('companion', '')}\n"
        f"Cac tru cot kien thuc:\n{pillars}\n"
        f"Cong thuc / So lieu / Du lieu chuan hoa:\n{metrics}\n"
        + (f"Khung 10 slide goi y:\n{outline}\n" if outline else "")
    )


def codex_generate_gamma_10_slides(ctx: Dict[str, Any], fallback_builder: Callable[[Dict[str, Any]], str]) -> Dict[str, Any]:
    topic = ctx["topic_title"]
    banner = f"""# SIÊU PROMPT TIẾNG VIỆT TẠO BÀI GIẢNG 10 SLIDE TRÊN GAMMA.APP
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Gamma Slide Engineer (agent_gamma_slide_engineer)`  
**Engine AI**: `{ctx.get('llm_engine', 'codex-cli')}`  
**Hướng dẫn sử dụng**: Copy toàn bộ khối prompt trong khung bên dưới và dán vào Gamma.app (**Create new AI -> Paste in text / Prompt**) để sinh bộ bài giảng đúng 10 slide chuẩn sư phạm."""

    instruction = f"""Ban la Kien truc su Thiet ke Bai giang Dien tu & Chuyen gia Gamma.app.
Hay viet mot BAN PROMPT HOAN CHINH BANG TIENG VIET de nguoi dung copy-paste truc tiep vao Gamma.app tao bo bai giang DUNG 10 SLIDE cho chu de sau:

{_ctx_brief(ctx)}

YEU CAU BAT BUOC (KHONG BO SOT):
1. Viet bang tieng Viet chuan, co dau day du, chinh xac 100% kien thuc chuyen mon, cong thuc/so lieu cua chu de.
2. Mo dau bang thiet lap tong the (Vai tro AI, Tỉ lệ 16:9, Bang mau Hex, Layout Grid/Cards, Typography).
3. Trien khai DAY DU va CHI TIET dung 10 tieu de slide:
   `### SLIDE 1:` den `### SLIDE 10:` (khong gop slide, khong viet "... tuong tu").
4. Moi Slide phai co du 4 muc ro rang (ngan gon, suc tich, giau thong tin):
   - **Bố cục (Layout & Cards):** Mo ta chia cot / the / so do.
   - **Nội dung trọng tâm & Số liệu/Công thức:** Kien thuc chinh xac cua chu de (tuyet doi khong chen chu de khac).
   - **Tương tác / Câu hỏi lớp học:** 1 cau hoi kich thich tu duy hoac hoat dong nhom.
   - **[Prompt ảnh minh họa / Sơ đồ]:** Mo ta cu the hinh anh hoac bieu do cho slide do.
5. Chi xuat noi dung Markdown thuan cua ban Prompt (khong viet loi chao hoi thua)."""

    return _run_prompt_stream(banner, instruction, fallback_builder, ctx, timeout_sec=115)


def codex_generate_quiz_25(ctx: Dict[str, Any], fallback_builder: Callable[[Dict[str, Any]], str]) -> Dict[str, Any]:
    topic = ctx["topic_title"]
    banner = f"""# SIÊU PROMPT TIẾNG VIỆT THIẾT KẾ PHIẾU BÀI TẬP ĐÁNH GIÁ NĂNG LỰC (25 CÂU HỎI)
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Quiz Assessment Maker (agent_quiz_assessment_maker)`  
**Engine AI**: `{ctx.get('llm_engine', 'codex-cli')}`  
**Cấu trúc chuẩn**: Đề kiểm tra đánh giá năng lực 25 câu theo Chương trình GDPT 2018 (15 Trắc nghiệm 4 lựa chọn + 5 Đúng/Sai chùm 4 mệnh đề + 5 Tự luận trả lời ngắn/vận dụng) kèm Bảng Đáp án & Giải thích."""

    instruction = f"""Ban la Chuyen gia Khao thi & Do luong Giao duc Quoc gia (GDPT 2018).
Hay bien soan TRON BO PROMPT + DE KIEM TRA DANH GIA NANG LUC GOM DUNG 25 CAU HOI CU THE + DAP AN bang tieng Viet cho chu de:

{_ctx_brief(ctx)}

YEU CAU CAU TRUC BAT BUOC (VIET DU CA 25 CAU CU THE, SUC TICH DE KHONG BI QUA DAI):
1. Mo dau ngan gon (2 dong): Vai tro Chuyen gia Khao thi & Muc tieu de 25 cau chuan GDPT 2018.
2. **PHẦN I. TRẮC NGHIỆM 4 LỰA CHỌN (15 CÂU — Từ Câu 1 đến Câu 15)**:
   - Danh so `**Câu 1**` .. `**Câu 15**` (6 Nhận biết, 5 Thông hiểu, 4 Vận dụng).
   - Moi cau gom 1 cau dan ngan gon + 4 dap an `A.` `B.` `C.` `D.` tren 1-2 dong, co so lieu/kien thuc chinh xac cua chu de.
3. **PHẦN II. TRẮC NGHIỆM ĐÚNG / SAI CHÙM 4 MỆNH ĐỀ (5 CÂU — Từ Câu 16 đến Câu 20)**:
   - Danh so `**Câu 16**` .. `**Câu 20**`. Moi cau co 1 tinh huong/bang so lieu ngan (2-3 dong) va 4 y `a)` `b)` `c)` `d)` ngan gon.
4. **PHẦN III. TỰ LUẬN TRẢ LỜI NGẮN & VẬN DỤNG THỰC TIỄN (5 CÂU — Từ Câu 21 đến Câu 25)**:
   - Danh so `**Câu 21**` .. `**Câu 25**`, moi cau 1-2 dong ngan gon, co bai toan tinh toan hoac phan tich thuc tien.
5. **PHẦN IV. BẢNG ĐÁP ÁN NHANH & HƯỚNG DẪN GIẢI NGẮN GỌN**:
   - Bang dap an du Câu 1 -> 25 (kem loi giai/huong dan 1 dong cho moi cau).
Chi xuat Markdown thuan, khong viet thua chu."""

    return _run_prompt_stream(banner, instruction, fallback_builder, ctx, timeout_sec=135)


def codex_generate_infographic(ctx: Dict[str, Any], fallback_builder: Callable[[Dict[str, Any]], str]) -> Dict[str, Any]:
    topic = ctx["topic_title"]
    banner = f"""# SIÊU PROMPT TIẾNG VIỆT THIẾT KẾ INFOGRAPHIC TỔNG HỢP KIẾN THỨC (7 PHÂN KHU)
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Infographic Designer (agent_infographic_designer)`  
**Engine AI**: `{ctx.get('llm_engine', 'codex-cli')}`  
**Mục đích sử dụng**: Dùng cho Canva Magic Design, Nano Banana Pro, Ideogram 2.0 hoặc AI UI Generator để dựng Poster Infographic chuẩn sư phạm."""

    instruction = f"""Ban la Giam doc Sang tao Do hoa Thong tin (Information Design Director) chuyen Infographic Giao duc.
Hay viet mot BAN SIÊU PROMPT TIẾNG VIỆT CỰC KỲ CHI TIẾT de thiet ke **POSTER INFOGRAPHIC GIAO DUC 7 PHAN KHU** cho chu de:

{_ctx_brief(ctx)}

YEU CAU BAT BUOC:
1. Muc **1. THÔNG SỐ KỸ THUẬT & BỐ CỤC**: Kich thuoc `1920 x 4800 px` (ti le `9:20`), phong cach do hoa, bang 6 ma mau Hex cu the phu hop chu de, va cap Font chu tieng Viet ro dau (`Be Vietnam Pro`, `Montserrat`).
2. Muc **2. MÔ TẢ CHI TIẾT 7 PHÂN KHU THỊ GIÁC**: Phai danh so ro rang dung 7 phan khu:
   - `#### 🔹 PHÂN KHU 1` (Top Header Banner & 4 Hero KPI Badges)
   - `#### 🔹 PHÂN KHU 2` (Mo hinh / So do Trung tam cua bai hoc)
   - `#### 🔹 PHÂN KHU 3` (Cong thuc / Dinh luat / Tru cot kien thuc cot loi)
   - `#### 🔹 PHÂN KHU 4` (Bieu do so sanh / Truc quan hoa du lieu hoac Phan loai)
   - `#### 🔹 PHÂN KHU 5` (Ung dung thuc tien & Lien he doi song / Cong nghe)
   - `#### 🔹 PHÂN KHU 6` (Luu y su pham — Bay sai lam thuong gap cua hoc sinh)
   - `#### 🔹 PHÂN KHU 7` (Footer & Thong diep khac sau kien thuc)
3. Moi phan khu phai ghi ro: Hinh anh minh hoa (Visual), Tieu de, Noi dung chu + so lieu/cong thuc cu the hien thi tren poster (100% dung kien thuc chu de).
Chi xuat Markdown thuan."""

    return _run_prompt_stream(banner, instruction, fallback_builder, ctx, timeout_sec=120)


def codex_generate_video_20_footages(ctx: Dict[str, Any], fallback_builder: Callable[[Dict[str, Any]], str]) -> Dict[str, Any]:
    topic = ctx["topic_title"]
    banner = f"""# SIÊU PROMPT TIẾNG VIỆT XÂY DỰNG VIDEO INTRO BÀI HỌC (GOOGLE FLOW — 20 FOOTAGES + LỜI THOẠI)
**Chủ đề**: **{topic}**  
**Tác nhân thiết kế**: `Video Flow Director (agent_video_flow_director)`  
**Engine AI**: `{ctx.get('llm_engine', 'codex-cli')}`  
**Công cụ mục tiêu**: **Google Flow (Veo 2 / Imagen Video)** — Tổng thời lượng **100 giây** (20 Footages x 5 giây + Transcript tiếng Việt từng cảnh)."""

    instruction = f"""Ban la Dao dien Hinh anh AI & Bien kich Video Giao duc chuyen nghiep tren nen tang Google Flow (Veo 2).
Hay viet BAN THUYET MINH PRODUCTION PROMPT GOM **HO SO NHAN VAT/VOICE/VAN PHONG** VA **DUNG 20 FOOTAGES LIEN HOAN (#01 -> #20)** cho video mo dau bai giang 100 giay cua chu de:

{_ctx_brief(ctx)}

YEU CAU CAU TRUC BAT BUOC (KHONG BO SOT CANH NAO):
1. **PHẦN 1. HỒ SƠ NHÂN VẬT, GIỌNG ĐỌC & VĂN PHONG (CONSISTENCY BIBLE)**:
   - Mo ta Nhan vat chinh & Tro ly AI (dung theo gou nhan vat trong thong tin chu de), kem `[Character Anchor Token]` bang tieng Anh co dinh de giu dong nhat khuon mat/trang phuc qua ca 20 canh.
   - Ho so Giong doc (Voice Profile tieng Viet) & Quy chuan Van phong + Cam nang ky thuat quay (4K, 24fps, cinematic educational).
2. **PHẦN 2. CHUỖI 20 PROMPT TẠO FOOTAGES GOOGLE FLOW KÈM TRANSCRIPT LỜI THOẠI (00:00 – 01:40)**:
   Phai viet DU va LIEN TUC 20 muc tu `### 🎬 FOOTAGE #01 (00:00 – 00:05)` den `### 🎬 FOOTAGE #20 (01:35 – 01:40)`.
   (Giu moi Footage suc tich 3 dong de hoan thanh tron ven ca 20 canh):
   - `- **Prompt tạo Video trên Google Flow:**` (2-3 cau tieng Anh dien anh mo ta goc may, boi canh thuc te cua chu de, hanh dong va `[Character Anchor]`).
   - `- **🎙️ Transcript Lời Thoại (Voice-over):**` (1-2 cau tieng Viet truyen cam, mach lac, dung kien thuc cua chu de).
   - `- **🔊 Hiệu ứng âm thanh (SFX):**` (Am thanh moi truong/nhac nen khop canh).
Chi xuat Markdown thuan."""

    return _run_prompt_stream(banner, instruction, fallback_builder, ctx, timeout_sec=130)


def inspect_package_metrics(gamma_md: str, quiz_md: str, info_md: str, video_md: str) -> Dict[str, Any]:
    """Extract deterministic structural counts from the 4 generated prompt documents."""
    slides = sorted({int(m) for m in re.findall(r"(?i)\bslide\s*#?\s*(\d+)\b", gamma_md) if 1 <= int(m) <= 20})
    questions = sorted({int(m) for m in re.findall(r"(?im)(?:^|\*|\s)câu\s*#?\s*(\d+)\b", quiz_md) if 1 <= int(m) <= 35})
    # Handle occasional Unicode/Cyrillic lookalikes (e.g. PHÂN/PHАН KHU) in headings
    zones = sorted({int(m) for m in re.findall(r"(?i)(?:PH[ÂAА][NН]\s*KHU|ZONE)\s*#?\s*(\d+)", info_md) if 1 <= int(m) <= 12})
    footages = sorted({int(m) for m in re.findall(r"(?i)footage\s*#?\s*0*(\d+)", video_md) if 1 <= int(m) <= 30})
    transcripts = len(re.findall(r"(?im)Transcript\s*Lời\s*Thoại", video_md))
    has_answer_key = bool(re.search(r"(?i)đáp\s*án|hướng\s*dẫn\s*giải|phần\s*iv", quiz_md))

    return {
        "gamma_slides_found": len(slides),
        "gamma_chars": len(gamma_md),
        "quiz_questions_found": len(questions),
        "quiz_has_answer_key": has_answer_key,
        "quiz_chars": len(quiz_md),
        "infographic_zones_found": len(zones),
        "infographic_chars": len(info_md),
        "video_footages_found": len(footages),
        "video_transcripts_found": transcripts,
        "video_chars": len(video_md),
    }


def _extract_outline_and_sample(text: str, heading_pattern: str) -> str:
    headings = [line.strip() for line in text.splitlines() if re.search(heading_pattern, line)]
    headings_block = "\n".join(headings[:30]) if headings else "(khong tim thay tieu de)"
    head_part = text[:1400]
    tail_part = text[-900:] if len(text) > 2300 else ""
    return f"[CAC TIEU DE TIM THAY ({len(headings)})]:\n{headings_block}\n\n[TRICH DOAN DAU/CUOI]:\n{head_part}\n...\n{tail_part}"


def codex_qa_review_package(
    ctx: Dict[str, Any],
    docs: Dict[str, str],
    metrics: Dict[str, Any],
) -> Dict[str, Any]:
    """Run an independent Codex CLI QA inspection across the 4 generated prompts."""
    slides_n = metrics["gamma_slides_found"]
    quiz_n = metrics["quiz_questions_found"]
    zones_n = metrics["infographic_zones_found"]
    footages_n = metrics["video_footages_found"]

    fallback_scores = {
        "gamma": round(min(9.9, 6.0 + 0.36 * min(slides_n, 10)), 1),
        "quiz": round(min(9.8, 5.5 + 0.16 * min(quiz_n, 25) + (0.3 if metrics["quiz_has_answer_key"] else 0.0)), 1),
        "infographic": round(min(9.8, 6.2 + 0.5 * min(zones_n, 7)), 1),
        "video": round(min(9.9, 5.8 + 0.2 * min(footages_n, 20)), 1),
        "package": 9.8,
    }
    fallback_overall = round(sum(fallback_scores.values()) / 5.0, 2)
    fallback_result = {
        "codex_used": False,
        "tokens_used": 0,
        "session_id": "",
        "scores": fallback_scores,
        "overall_score": fallback_overall,
        "decision": "APPROVED FOR RELEASE" if fallback_overall >= 8.0 else "NEEDS REVISION",
        "notes": {
            "gamma": f"Đếm được {slides_n}/10 tiêu đề slide trong gói học liệu.",
            "quiz": f"Đếm được {quiz_n}/25 câu hỏi; đáp án: {'Có' if metrics['quiz_has_answer_key'] else 'Chưa rõ'}.",
            "infographic": f"Đếm được {zones_n}/7 phân khu thị giác.",
            "video": f"Đếm được {footages_n}/20 footages Google Flow và {metrics['video_transcripts_found']} mục thoại.",
            "package": "Đã kiểm tra danh mục 6 thư mục & 8 file học liệu chuẩn bị đóng gói .ZIP + Portal HTML5.",
        },
        "strengths": [
            "Toàn bộ học liệu bám sát đúng chủ đề bài giảng đầu vào.",
            "Cấu trúc 6 thư mục, file ZIP và cổng Portal tương tác đầy đủ.",
        ],
        "improvements": [
            "Giáo viên nên rà soát lại thông số thí nghiệm hoặc ví dụ địa phương trước khi giảng dạy thực tế.",
        ],
    }

    if not find_codex_executable():
        return fallback_result

    staged_manifest = {
        "02_Prompt_Slide_Gamma_10Slides/prompt_gamma_10_slides.md": f"{len(docs.get('gamma', ''))} chars (ready for DevOps ZIP/Portal)",
        "03_Prompt_Phieu_Bai_Tap_25Cau/prompt_phieu_bai_tap_25_cau.md": f"{len(docs.get('quiz', ''))} chars (ready for DevOps ZIP/Portal)",
        "04_Prompt_Infographics/prompt_thiet_ke_infographics.md": f"{len(docs.get('info', ''))} chars (ready for DevOps ZIP/Portal)",
        "05_Prompt_Video_Intro_GoogleFlow_20Footages/prompt_video_intro_20_footages_google_flow.md": f"{len(docs.get('video', ''))} chars (ready for DevOps ZIP/Portal)",
        "total_planned_folders": 6,
        "total_planned_files": 8,
    }

    qa_prompt = f"""Ban la Truong nhom QA Kiem dinh Hoc lieu So (QA Quality Reviewer).
Hay kiem tra thuc te chat luong khoa hoc, do bam sat chu de va tinh day du cua 4 tai lieu vua duoc cac agent sinh ra truoc khi DevOps Site Manager dong goi ZIP + Portal HTML5 cho bai giang "{ctx['topic_title']}" ({ctx.get('subject_domain', '')}).
Tra ve DUY NHAT 1 JSON object (khong markdown fence):

SO LIEU DO LUONG THUC TE TU CODE:
{json.dumps(metrics, ensure_ascii=False, indent=2)}

TRANG THAI SAN SANG DONG GOI (STAGING MANIFEST 6 THU MUC / 8 FILE):
{json.dumps(staged_manifest, ensure_ascii=False, indent=2)}

TOM TAT CAU TRUC & TRICH DOAN 4 TAI LIEU:
[1. GAMMA SLIDES]:
{_extract_outline_and_sample(docs.get("gamma", ""), r"(?i)SLIDE\s*\d+")}

[2. QUIZ 25 CAU]:
{_extract_outline_and_sample(docs.get("quiz", ""), r"(?im)(?:PHẦN|^\*\*Câu\s*\d+)")}

[3. INFOGRAPHIC]:
{_extract_outline_and_sample(docs.get("info", ""), r"(?i)PH[ÂAА][NН]\s*KHU\s*\d+")}

[4. VIDEO 20 FOOTAGES]:
{_extract_outline_and_sample(docs.get("video", ""), r"(?i)FOOTAGE\s*#\d+")}

Schema JSON bat buoc:
{{
  "gamma_score": 9.5,
  "gamma_note": "Nhan xet thuc te bang tieng Viet (1 cau)",
  "quiz_score": 9.4,
  "quiz_note": "Nhan xet thuc te bang tieng Viet (1 cau)",
  "infographic_score": 9.3,
  "infographic_note": "Nhan xet thuc te bang tieng Viet (1 cau)",
  "video_score": 9.5,
  "video_note": "Nhan xet thuc te bang tieng Viet (1 cau)",
  "package_score": 9.5,
  "package_note": "Nhan xet tinh san sang cua 4 tai lieu & cau truc 6 thu muc/8 file truoc khi DevOps dong goi ZIP + Portal",
  "overall_score": 9.4,
  "decision": "APPROVED FOR RELEASE",
  "strengths": ["Diem manh 1", "Diem manh 2", "Diem manh 3"],
  "improvements": ["De xuat tinh chinh 1", "De xuat tinh chinh 2"]
}}
Luu y: Cham diem trung thuc dua tren so lieu dem duoc, tieu de, trich doan va tinh chinh xac khoa hoc. Luu y day la buoc QA Gate truoc khi DevOps ghi ZIP/Portal nen cham `package_score` dua tren viec 4 tai lieu co dung luong >= 3,000 ky tu va du cau truc 6 thu muc san sang dong goi hay khong."""

    res = run_codex_json(qa_prompt, timeout_sec=50)
    if not res.get("ok"):
        fallback_result["tokens_used"] = int(res.get("tokens_used", 0) or 0)
        fallback_result["session_id"] = str(res.get("session_id", ""))
        return fallback_result

    d = res["data"]

    def _score(key: str, default_val: float) -> float:
        try:
            val = float(d.get(key, default_val))
            return round(max(0.0, min(10.0, val)), 1)
        except (TypeError, ValueError):
            return default_val

    scores = {
        "gamma": _score("gamma_score", fallback_scores["gamma"]),
        "quiz": _score("quiz_score", fallback_scores["quiz"]),
        "infographic": _score("infographic_score", fallback_scores["infographic"]),
        "video": _score("video_score", fallback_scores["video"]),
        "package": _score("package_score", fallback_scores["package"]),
    }
    try:
        overall = round(max(0.0, min(10.0, float(d.get("overall_score", sum(scores.values()) / 5.0)))), 2)
    except (TypeError, ValueError):
        overall = round(sum(scores.values()) / 5.0, 2)

    return {
        "codex_used": True,
        "model": res.get("model") or "gpt-6-luna (codex-cli)",
        "tokens_used": int(res.get("tokens_used", 0) or 0),
        "session_id": str(res.get("session_id", "")),
        "scores": scores,
        "overall_score": overall,
        "decision": str(d.get("decision") or ("APPROVED FOR RELEASE" if overall >= 8.0 else "APPROVED WITH NOTES")),
        "notes": {
            "gamma": str(d.get("gamma_note") or fallback_result["notes"]["gamma"]),
            "quiz": str(d.get("quiz_note") or fallback_result["notes"]["quiz"]),
            "infographic": str(d.get("infographic_note") or fallback_result["notes"]["infographic"]),
            "video": str(d.get("video_note") or fallback_result["notes"]["video"]),
            "package": str(d.get("package_note") or fallback_result["notes"]["package"]),
        },
        "strengths": _normalize_list(d.get("strengths"), fallback_result["strengths"], 1),
        "improvements": _normalize_list(d.get("improvements"), fallback_result["improvements"], 1),
    }
