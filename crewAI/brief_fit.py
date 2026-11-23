"""Turn a chairman question into searchable product names and a measured ranking.

Product Hunter only finds products and measures the market. Words about
importing, stocking, capital, or suppliers are noise and are never searched.
"""

from __future__ import annotations

import html
import re
from typing import Any, Dict, List

from tool_registry import DEFAULT_TOOL_REGISTRY


_ADVISORY_MARKERS = re.compile(
    r"phân tích|tư vấn|xu hướng|mùa vụ|phù hợp|từ nay|gợi ý|sản phẩm nào",
    re.IGNORECASE,
)
_WINDOW = re.compile(
    r"từ\s+(?:nay|bây giờ|hôm nay)\s+(?:đến|tới)\s+([^.,;]+)",
    re.IGNORECASE,
)
_LEADING = re.compile(
    r"^(?:hãy|xin|nhờ)?\s*(?:phân tích|tìm|săn|nghiên cứu|tra cứu|tư vấn)"
    r"(?:\s+và\s+tư vấn)?\s+(?:cho tôi\s+)?(?:sản phẩm|thị trường|từ khóa)?\s*[:\-]?\s*",
    re.IGNORECASE,
)
_NOISE_RULES = (
    ("nhập hàng", r"nhập\s+hàng"),
    ("nhập sản phẩm", r"nhập\s+(?:một\s+)?sản\s*phẩm"),
    ("về bán", r"về\s+bán"),
    ("để bán", r"để\s+bán"),
    ("vốn", r"\bvốn\b"),
    ("nhà cung cấp", r"nhà\s+cung\s+cấp"),
    ("số lượng đặt", r"số\s+lượng\s+đặt|\bmoq\b"),
)
_CATEGORY_NOISE = (
    ("thống kê", r"thống\s*kê"),
    ("mặt hàng", r"mặt\s*hàng"),
    ("cho tôi", r"cho\s+tôi"),
    ("các sàn thương mại điện tử", r"(?:trên\s+)?các\s+sàn(?:\s+thương\s+mại\s+điện\s+tử)?(?:\s+việt(?:\s*nam)?)?"),
)
_CATEGORY_MARKERS = re.compile(r"thống kê|bán chạy|mặt hàng|nhóm hàng", re.IGNORECASE)
_OCCASIONS = (
    ("tet", "Tết", r"tết|nguyên đán"),
    ("mid_autumn", "Trung thu", r"trung thu"),
    ("christmas", "Giáng sinh", r"noel|giáng sinh|giang sinh"),
    ("back_to_school", "khai giảng", r"khai giảng|khai giang|tựu trường|tuu truong"),
    ("womens_day", "8/3", r"8\s*/\s*3|8 tháng 3|quốc tế phụ nữ"),
    ("vn_womens_day", "20/10", r"20\s*/\s*10|20 tháng 10|phụ nữ việt nam"),
    ("summer", "mùa hè", r"mùa hè|mùa nóng"),
)

# Names a person can type into Shopee, Lazada, or TikTok Shop.
_CATALOG: Dict[str, List[Dict[str, str]]] = {
    "tet": [
        {"keyword": "hộp quà Tết", "name": "Hộp quà Tết", "reason": "Quà biếu cuối năm, cả ba sàn đều có trang bán để đo."},
        {"keyword": "lịch để bàn Tết", "name": "Lịch để bàn Tết", "reason": "Đồ dùng theo đúng mốc Tết, dễ so giá và đếm shop."},
        {"keyword": "đồ trang trí Tết", "name": "Đồ trang trí Tết", "reason": "Nhu cầu tăng sát Tết, đo được độ đông của gian hàng."},
        {"keyword": "bánh kẹo Tết", "name": "Bánh kẹo Tết", "reason": "Hàng ăn theo mùa, đo được giá và số sản phẩm đang bán."},
    ],
    "mid_autumn": [
        {"keyword": "bánh trung thu", "name": "Bánh trung thu", "reason": "Món chính của dịp, có đủ shop để đo cạnh tranh."},
        {"keyword": "đèn lồng trung thu", "name": "Đèn lồng trung thu", "reason": "Đồ trang trí đúng dịp, giá trải từ rẻ đến cao."},
        {"keyword": "hộp quà trung thu", "name": "Hộp quà trung thu", "reason": "Quà biếu, đo được phân khúc giá."},
    ],
    "christmas": [
        {"keyword": "cây thông Noel", "name": "Cây thông Noel", "reason": "Đồ trang trí chính của dịp, dễ tìm trên cả ba sàn."},
        {"keyword": "hộp quà Giáng sinh", "name": "Hộp quà Giáng sinh", "reason": "Quà tặng cuối năm, đo được giá và số shop."},
        {"keyword": "đồ trang trí Noel", "name": "Đồ trang trí Noel", "reason": "Nhóm hàng rộng, thấy được chỗ còn thưa hay đã đông."},
    ],
    "back_to_school": [
        {"keyword": "balo học sinh", "name": "Balo học sinh", "reason": "Đồ dùng đúng dịp tựu trường, nhiều shop để so."},
        {"keyword": "hộp bút học sinh", "name": "Hộp bút học sinh", "reason": "Món nhỏ, dễ đo khoảng giá."},
        {"keyword": "đồ dùng học tập", "name": "Đồ dùng học tập", "reason": "Nhóm rộng cho mùa khai giảng."},
    ],
    "womens_day": [
        {"keyword": "hộp quà 8/3", "name": "Hộp quà 8/3", "reason": "Quà tặng đúng ngày, đo được mức cạnh tranh."},
        {"keyword": "hoa sáp", "name": "Hoa sáp", "reason": "Món quà bán quanh ngày lễ, có sẵn trên sàn."},
        {"keyword": "nước hoa mini", "name": "Nước hoa mini", "reason": "Quà nhỏ, dễ so giá."},
    ],
    "vn_womens_day": [
        {"keyword": "hộp quà 20/10", "name": "Hộp quà 20/10", "reason": "Quà tặng đúng ngày 20/10."},
        {"keyword": "hoa sáp", "name": "Hoa sáp", "reason": "Món quà để đo giá và số shop."},
        {"keyword": "set mỹ phẩm", "name": "Set mỹ phẩm", "reason": "Nhóm quà được tìm nhiều quanh ngày lễ."},
    ],
    "summer": [
        {"keyword": "quạt mini", "name": "Quạt mini", "reason": "Đồ dùng mùa nóng, nhiều shop để đo."},
        {"keyword": "kem chống nắng", "name": "Kem chống nắng", "reason": "Nhu cầu tăng theo mùa hè."},
        {"keyword": "đồ bơi", "name": "Đồ bơi", "reason": "Hàng mùa, đo được độ đông gian hàng."},
    ],
}

_MATERIAL_LINES: Dict[str, List[Dict[str, str]]] = {
    "gỗ": [
        {"keyword": "bàn gỗ", "name": "Bàn gỗ", "reason": "Món gỗ lớn, đếm được lượt bán trên cả ba sàn."},
        {"keyword": "ghế gỗ", "name": "Ghế gỗ", "reason": "Đồ ngồi cùng nhóm, nhiều shop để so sức bán."},
        {"keyword": "kệ gỗ", "name": "Kệ gỗ", "reason": "Đồ chứa bằng gỗ, đo được số lượng đã bán."},
        {"keyword": "tủ gỗ", "name": "Tủ gỗ", "reason": "Món gỗ cỡ lớn, doanh thu thường cao hơn món nhỏ."},
    ],
    "nhựa": [
        {"keyword": "bàn nhựa", "name": "Bàn nhựa", "reason": "Tên cụ thể trong nhóm đồ nhựa."},
        {"keyword": "ghế nhựa", "name": "Ghế nhựa", "reason": "Đồ ngồi bằng nhựa, dễ đếm lượt bán."},
        {"keyword": "kệ nhựa", "name": "Kệ nhựa", "reason": "Đồ chứa bằng nhựa."},
        {"keyword": "hộp nhựa", "name": "Hộp nhựa", "reason": "Món nhựa nhỏ, nhiều shop."},
    ],
}


def _clean_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _occasion(text: str) -> tuple[str, str]:
    folded = text.lower()
    for occasion_id, label, pattern in _OCCASIONS:
        if re.search(pattern, folded, flags=re.IGNORECASE):
            return occasion_id, label
    return "", ""


def _dropped_noise(text: str) -> List[str]:
    found: List[str] = []
    for label, pattern in _NOISE_RULES:
        if re.search(pattern, text, flags=re.IGNORECASE):
            found.append(label)
    return found


def _product_name(text: str) -> str:
    name = text
    for _label, pattern in _NOISE_RULES:
        name = re.sub(pattern, " ", name, flags=re.IGNORECASE)
    name = _LEADING.sub("", name)
    name = re.sub(
        r"\b(?:theo|về)\s+(?:xu hướng|mùa vụ)\b",
        " ",
        name,
        flags=re.IGNORECASE,
    )
    name = _clean_space(name).strip(" .,;:-")
    return name[:80]


def _extract_category(text: str) -> str:
    patterns = (
        r"(?:mặt hàng|nhóm hàng|dòng hàng|loại hàng)\s+(.+?)(?=\s+bán chạy|\s+trên|\s+ở|\s+tại|$)",
        r"thống kê\s+(?:cho tôi\s+)?(?:các\s+)?(.+?)(?=\s+bán chạy|\s+trên|\s+ở|\s+tại|$)",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        chunk = _clean_space(match.group(1))
        chunk = re.sub(r"^(?:các|những|mọi)\s+", "", chunk, flags=re.IGNORECASE)
        chunk = chunk.strip(" .,;:-")
        if chunk:
            return chunk[:40]
    return ""


def _material_of(category: str) -> str:
    match = re.match(r"đồ\s+(\S+)", category, flags=re.IGNORECASE)
    return match.group(1).lower() if match else ""


def interpret_brief(text: str) -> Dict[str, Any]:
    """Decide whether the chairman named a product, a season, or a category."""
    raw = _clean_space(text)
    window_match = _WINDOW.search(raw)
    window = _clean_space(window_match.group(1) if window_match else "").strip(" .,;")
    occasion_id, occasion_label = _occasion(f"{window} {raw}")
    dropped = _dropped_noise(raw)
    has_marker = bool(_ADVISORY_MARKERS.search(raw))
    has_window = bool(window)
    advisory = has_window or (has_marker and len(raw) > 45)
    if len(raw) <= 40 and not has_window:
        advisory = False
    category = "" if advisory else _extract_category(raw)
    material = _material_of(category)
    broad = bool(re.match(r"^đồ\s+\S+$", category, flags=re.IGNORECASE))
    category_mode = (not advisory) and broad and bool(_CATEGORY_MARKERS.search(raw)) and len(raw) > 30
    if category_mode:
        for label, pattern in _CATEGORY_NOISE:
            if re.search(pattern, raw, flags=re.IGNORECASE):
                dropped.append(label)
        mode = "category"
        product_name = ""
        rank_by = "sales"
    else:
        mode = "advisory" if advisory else "product"
        if mode == "product" and category and not broad and _CATEGORY_MARKERS.search(raw):
            product_name = category[:80]
        else:
            product_name = "" if advisory else (_product_name(raw) or raw)
        rank_by = "fit"
        category = "" if mode != "product" else category
        material = ""
    return {
        "mode": mode,
        "raw": raw,
        "window": window,
        "occasion_id": occasion_id,
        "occasion_label": occasion_label,
        "category": category if mode == "category" else "",
        "material": material if mode == "category" else "",
        "rank_by": rank_by,
        "dropped_noise": dropped,
        "product_name": product_name,
    }


def _generic_products(theme: str) -> List[Dict[str, str]]:
    label = _clean_space(theme)[:40] or "mùa này"
    return [
        {
            "keyword": f"quà tặng {label}",
            "name": f"Quà tặng {label}",
            "reason": "Nhóm quà rộng, gõ được lên sàn để đo.",
        },
        {
            "keyword": f"đồ trang trí {label}",
            "name": f"Đồ trang trí {label}",
            "reason": "Đồ theo dịp, đo được số shop và khoảng giá.",
        },
        {
            "keyword": f"đặc sản {label}",
            "name": f"Đặc sản {label}",
            "reason": "Hàng ăn theo mùa, có trang bán để so.",
        },
    ]


def propose_products(brief: Dict[str, Any]) -> List[Dict[str, str]]:
    """Three or four concrete names. Never the chairman's whole sentence."""
    catalog = _CATALOG.get(str(brief.get("occasion_id") or ""))
    if catalog:
        return [dict(item) for item in catalog[:4]]
    theme = str(brief.get("window") or brief.get("occasion_label") or "mùa này")
    return _generic_products(theme)


def propose_category_products(brief: Dict[str, Any]) -> List[Dict[str, str]]:
    """Concrete names inside a broad category. Never the whole question."""
    material = str(brief.get("material") or "").lower()
    catalog = _MATERIAL_LINES.get(material)
    if catalog:
        return [dict(item) for item in catalog[:4]]
    category = _clean_space(str(brief.get("category") or "nhóm hàng"))[:40]
    match = re.match(r"đồ\s+(.+)", category, flags=re.IGNORECASE)
    tail = match.group(1) if match else category
    frames = ("bàn", "ghế", "kệ", "tủ")
    return [
        {
            "keyword": f"{frame} {tail}",
            "name": f"{frame[:1].upper()}{frame[1:]} {tail}",
            "reason": f"Tên cụ thể trong nhóm {category}, đo được lượt bán.",
        }
        for frame in frames
    ]


def fit_score(card: Dict[str, Any]) -> float:
    blue = float(card.get("blue_ocean_score") or 0)
    shops = int(card.get("sp_count") or 0)
    return blue * 10 + min(shops, 80)


def rank_products(cards: List[Dict[str, Any]], by: str = "fit") -> List[Dict[str, Any]]:
    indexed = list(enumerate(cards))
    if by == "sales":
        indexed.sort(
            key=lambda pair: (
                -int(pair[1].get("total_sold") or 0),
                -int(pair[1].get("total_revenue_vnd") or 0),
                pair[0],
            )
        )
    else:
        indexed.sort(key=lambda pair: (-fit_score(pair[1]), pair[0]))
    return [dict(card) for _index, card in indexed]


def _vnd(value: Any) -> str:
    try:
        amount = int(round(float(value or 0)))
    except (TypeError, ValueError):
        amount = 0
    return f"{amount:,} đ".replace(",", ".")


def _sold(value: Any) -> str:
    try:
        amount = int(round(float(value or 0)))
    except (TypeError, ValueError):
        amount = 0
    return f"{amount:,}".replace(",", ".")


def render_fit_note(brief: Dict[str, Any], cards: List[Dict[str, Any]]) -> str:
    """Four-part answer: scope, names, measurement cards, ranking."""
    lines: List[str] = []
    mode = brief.get("mode")
    rank_by = str(brief.get("rank_by") or ("sales" if mode == "category" else "fit"))
    if mode == "category":
        lines.append(f"1. Nhóm hàng: {brief.get('category') or 'nhóm được hỏi'}. Xếp theo lượt bán.")
    elif mode == "advisory":
        window = brief.get("window") or brief.get("occasion_label") or "mốc thời gian trong câu hỏi"
        lines.append(f"1. Khoảng đo: từ nay đến {window}." if brief.get("window") else f"1. Khoảng đo: {window}.")
    else:
        lines.append("1. Khoảng đo: câu hỏi đã là một tên sản phẩm, đo trực tiếp.")
    dropped = brief.get("dropped_noise") or []
    if dropped:
        lines.append(
            "Đã bỏ qua vì không nằm trong việc tìm và đo sản phẩm: " + ", ".join(dropped) + "."
        )
    lines.append("2. Tên hàng đem đi đo:")
    if not cards:
        lines.append("- Chưa có tên hàng.")
    for card in cards:
        lines.append(f"- {card.get('name')}: {card.get('reason') or 'Đo trên ba sàn.'}")
    lines.append("3. Phiếu đo:")
    for card in cards:
        price = (
            f" giá TB {_vnd(card.get('avg_price_vnd'))}"
            f" ({_vnd(card.get('min_price_vnd'))} – {_vnd(card.get('max_price_vnd'))})."
        )
        if rank_by == "sales":
            lines.append(
                f"- {card.get('name')}: {_sold(card.get('total_sold'))} lượt bán,"
                f" doanh thu {_vnd(card.get('total_revenue_vnd'))},"
                f" {card.get('sp_count', 0)} SP, {card.get('shop_count', 0)} shop,"
                f"{price}"
            )
        else:
            lines.append(
                f"- {card.get('name')}: đại dương xanh {card.get('blue_ocean_score', 0)}/100"
                f" ({card.get('blue_ocean_label') or 'chưa có nhãn'}),"
                f" {card.get('sp_count', 0)} SP, {card.get('shop_count', 0)} shop,"
                f"{price}"
            )
    if rank_by == "sales":
        lines.append("4. Xếp theo sức bán:")
    else:
        lines.append("4. Xếp hạng theo số đo:")
    if not cards:
        lines.append("Chưa đủ phiếu để xếp.")
    elif rank_by == "sales":
        lines.append(f"Bán chạy nhất: {cards[0].get('name')}.")
        if len(cards) > 1:
            lines.append(f"Đứng thứ hai: {cards[1].get('name')}.")
        if len(cards) >= 3:
            top_sold = int(cards[0].get("total_sold") or 0)
            last_sold = int(cards[-1].get("total_sold") or 0)
            if top_sold and last_sold >= top_sold * 0.9:
                lines.append(
                    f"Đã đo nhưng sức bán sát nhóm trên: {cards[-1].get('name')}."
                )
            else:
                lines.append(f"Đã đo nhưng bán yếu: {cards[-1].get('name')}.")
    else:
        lines.append(f"Phù hợp nhất: {cards[0].get('name')}.")
        if len(cards) > 1:
            lines.append(f"Đứng thứ hai: {cards[1].get('name')}.")
        if len(cards) >= 3:
            gap = fit_score(cards[0]) - fit_score(cards[-1])
            if gap < 30:
                lines.append(
                    f"Đã đo nhưng chưa thấy chỗ trống rõ: {cards[-1].get('name')} — điểm sát các tên phía trên."
                )
            else:
                lines.append(
                    f"Đã đo nhưng không còn chỗ: {cards[-1].get('name')} — đứng cuối nhóm đã đo."
                )
        if mode == "product":
            lines.append("Không tách thêm tên khác vì câu hỏi đã chỉ một sản phẩm.")
    if len(cards) > 1:
        lines.append("Link phía dưới là báo cáo của tất cả tên đã đo, mỗi tên một bảng.")
    else:
        lines.append("Link phía dưới là báo cáo đầy đủ của tên này.")
    return "\n".join(lines)


def fit_banner_html(note: str, title: str = "Xếp hạng sản phẩm phù hợp") -> str:
    safe = html.escape(note or "").replace("\n", "<br>\n")
    heading = html.escape(title or "Xếp hạng sản phẩm phù hợp")
    return (
        '<section style="margin:16px auto;max-width:1100px;padding:16px 18px;'
        'border:1px solid #38bdf8;border-radius:12px;background:#0f172a;color:#e2e8f0;'
        'font-family:system-ui">'
        f'<h2 style="margin:0 0 8px;font-size:18px">{heading}</h2>'
        f'<p style="margin:0;line-height:1.55;font-size:14px">{safe}</p>'
        "</section>"
    )


def _interpret_chairman_brief(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    del extras
    brief = interpret_brief(str(args.get("text") or ""))
    if brief["mode"] == "advisory":
        summary = f"Câu tư vấn, giữ mốc «{brief['window'] or brief['occasion_label'] or 'mùa vụ'}»"
    elif brief["mode"] == "category":
        summary = f"Nhóm hàng «{brief.get('category') or 'nhóm hàng'}», xếp theo lượt bán"
    else:
        summary = f"Đây là tên sản phẩm «{brief['product_name']}»"
    return {
        "ok": True,
        "mode": "computed",
        "provider": "Điều phối yêu cầu",
        "summary": summary,
        "data": brief,
    }


def _propose_seasonal_products(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    del extras
    brief = args.get("brief") if isinstance(args.get("brief"), dict) else {}
    products = propose_products(brief)
    names = ", ".join(item["name"] for item in products)
    return {
        "ok": True,
        "mode": "computed",
        "provider": "Thăm dò mùa vụ",
        "summary": f"Đề xuất đo: {names}",
        "data": {"products": products},
    }


def _propose_category_products(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    del extras
    brief = args.get("brief") if isinstance(args.get("brief"), dict) else {}
    products = propose_category_products(brief)
    names = ", ".join(item["name"] for item in products)
    return {
        "ok": True,
        "mode": "computed",
        "provider": "Thăm dò nhóm hàng",
        "summary": f"Tên trong nhóm: {names}",
        "data": {"products": products},
    }


def _rank_product_fit(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    del extras
    cards = args.get("cards") if isinstance(args.get("cards"), list) else []
    rank_by = "sales" if str(args.get("rank_by") or "") == "sales" else "fit"
    ranked = rank_products([card for card in cards if isinstance(card, dict)], by=rank_by)
    winner = str(ranked[0].get("name") or "") if ranked else ""
    label = "Bán chạy nhất" if rank_by == "sales" else "Phù hợp nhất"
    return {
        "ok": True,
        "mode": "computed",
        "provider": "Tổng hợp phù hợp",
        "summary": f"{label}: {winner}" if winner else "Chưa có phiếu đo",
        "data": {"cards": ranked, "winner": winner, "rank_by": rank_by},
    }


DEFAULT_TOOL_REGISTRY.tool(
    name="interpret_chairman_brief",
    provider="Điều phối yêu cầu",
    description="Nghe câu Chủ tịch, bỏ ý nhập hàng, giữ mốc thời gian hoặc đúng tên sản phẩm.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {"text": {"type": "string"}},
        "required": ["text"],
    },
    tags=["brief", "product-hunter"],
)(_interpret_chairman_brief)

DEFAULT_TOOL_REGISTRY.tool(
    name="propose_seasonal_products",
    provider="Thăm dò mùa vụ",
    description="Đổi dịp và mốc thời gian thành vài tên hàng có thể gõ lên sàn.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {"brief": {"type": "object"}},
        "required": ["brief"],
    },
    tags=["brief", "product-hunter"],
)(_propose_seasonal_products)

DEFAULT_TOOL_REGISTRY.tool(
    name="propose_category_products",
    provider="Thăm dò nhóm hàng",
    description="Tách một nhóm hàng rộng thành vài tên cụ thể để đo sức bán.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {"brief": {"type": "object"}},
        "required": ["brief"],
    },
    tags=["brief", "product-hunter"],
)(_propose_category_products)

DEFAULT_TOOL_REGISTRY.tool(
    name="rank_product_fit",
    provider="Tổng hợp phù hợp",
    description="Xếp các phiếu đo: tên hợp nhất, tên thứ hai, tên không còn chỗ.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {"cards": {"type": "array"}, "rank_by": {"type": "string"}},
        "required": ["cards"],
    },
    tags=["brief", "product-hunter"],
)(_rank_product_fit)
