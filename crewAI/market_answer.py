"""Vietnamese answers built only from measured samples."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from market_report import write_report_page


_FLOOR = {"shopee": "Sàn Cam", "lazada": "Sàn Xanh", "tiktok_shop": "Sàn Đen"}


def _vnd(value: Any) -> str:
    try:
        amount = int(round(float(value or 0)))
    except (TypeError, ValueError):
        amount = 0
    return f"{amount:,} đ".replace(",", ".")


def _num(value: Any) -> str:
    try:
        amount = int(round(float(value or 0)))
    except (TypeError, ValueError):
        amount = 0
    return f"{amount:,}".replace(",", ".")


def _scope_line(sample: Dict[str, Any]) -> str:
    floor = _FLOOR.get(str(sample.get("platform")), str(sample.get("platform")))
    if sample.get("mode") == "error":
        return f"{floor}: chưa lấy được số."
    if sample.get("scope") == "market_block":
        origin = "số từ bức tranh thị trường"
    else:
        origin = "số từ mẫu vừa lấy"
    if sample.get("mode") == "sandbox":
        origin += ", mẫu mô phỏng"
    return f"{floor}: {origin}."


def _size_line(sample: Dict[str, Any]) -> str:
    if sample.get("mode") == "error":
        return _scope_line(sample)
    commission = sample.get("avg_commission_pct")
    commission_text = "chưa có hoa hồng" if commission is None else f"hoa hồng {commission}%"
    sweet = str(sample.get("sweet_spot_label") or "")
    sweet_text = f" Khoảng giá bán chạy của danh sách đang xem: {sweet}." if sweet else ""
    tracked = sample.get("window_tracked_30d") if isinstance(sample.get("window_tracked_30d"), dict) else {}
    tracked_text = ""
    if tracked:
        tracked_text = (
            f" Nhịp 30 ngày của nhóm có lịch sử: {_num(tracked.get('total_sold'))} lượt, "
            f"doanh thu {_vnd(tracked.get('total_revenue_vnd'))}. Nhịp này không phải tháng lịch."
        )
    return (
        f"{_scope_line(sample)} "
        f"{_num(sample.get('sp_count'))} SP, {_num(sample.get('shop_count'))} shop, "
        f"{_num(sample.get('total_sold'))} lượt bán, doanh thu {_vnd(sample.get('total_revenue_vnd'))}. "
        f"Giá thường gặp {_vnd(sample.get('avg_price_vnd'))} "
        f"({_vnd(sample.get('min_price_vnd'))} – {_vnd(sample.get('max_price_vnd'))})."
        f"{sweet_text} "
        f"Độ tập trung HHI {sample.get('hhi')}. "
        f"Chỗ còn trống {sample.get('blue_ocean_score')}/100 ({sample.get('blue_ocean_label') or 'chưa có nhãn'}). "
        f"{commission_text}.{tracked_text}"
    )


def _top_items(sample: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
    rows = [row for row in (sample.get("items") or []) if isinstance(row, dict)]
    rows.sort(key=lambda row: int(row.get("gmv_vnd") or 0), reverse=True)
    return rows[:limit]


def _median(values: List[int]) -> int:
    ordered = sorted(values)
    if not ordered:
        return 0
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return int(round((ordered[mid - 1] + ordered[mid]) / 2))


def _pick_item(sample: Dict[str, Any], query: str) -> Dict[str, Any] | None:
    rows = [row for row in (sample.get("items") or []) if isinstance(row, dict)]
    if not rows:
        return None
    tokens = [part for part in query.lower().split() if len(part) > 3]
    def score(row: Dict[str, Any]) -> tuple[int, int]:
        title = str(row.get("title") or "").lower()
        hits = sum(1 for token in tokens if token in title)
        return (hits, int(row.get("sold") or 0))
    return max(rows, key=score)


def _when_line(route: Dict[str, Any]) -> str:
    when = route.get("when") if isinstance(route.get("when"), dict) else {}
    label = str(when.get("label") or "").strip()
    if not label:
        return ""
    if str(when.get("kind") or "") == "occasion":
        hint = str(when.get("query_hint") or label)
        return (
            f"Cửa sổ hỏi: {label}. Tên tìm trên sàn gắn “{hint}” nếu tên gốc chưa có chữ đó. "
            "Số là số sàn trả lúc đo."
        )
    return (
        f"Cửa sổ hỏi: {label}. Số là số sàn trả lúc đo, không phải số riêng của cả {label}."
    )


def render_prose(route: Dict[str, Any], samples: List[Dict[str, Any]], related: List[str]) -> str:
    intent = str(route.get("intent") or "")
    if intent == "clarify":
        return str(route.get("clarify") or "Ngành nào, hay một tên hàng?")
    lines: List[str] = []
    window = _when_line(route)
    if window:
        lines.append(window)
    if any(sample.get("mode") == "sandbox" for sample in samples):
        lines.append("Một phần số liệu là mẫu mô phỏng vì sàn chưa trả số thật.")
    if intent == "top_products":
        lines.append("Top của mẫu vừa lấy, xếp theo doanh thu.")
        for sample in samples:
            lines.append(_scope_line(sample))
            rows = _top_items(sample)
            if not rows:
                lines.append(f"- {_FLOOR.get(sample.get('platform'), '')}: chưa có món.")
                continue
            for index, row in enumerate(rows, start=1):
                lines.append(
                    f"- {index}. {row.get('title')}: giá {_vnd(row.get('price_vnd'))}, "
                    f"{_num(row.get('sold'))} lượt, doanh thu {_vnd(row.get('gmv_vnd'))}, "
                    f"shop {row.get('shop_name')}."
                )
    elif intent == "product_eval":
        query = " ".join(route.get("names") or [])
        lines.append(f"Đánh giá theo mặt bằng “{query}”. Không kết luận từ lời bình.")
        for sample in samples:
            lines.append(_scope_line(sample))
            chosen = _pick_item(sample, query)
            if chosen is None:
                lines.append("Chưa có món để đặt cạnh mặt bằng.")
                continue
            prices = [int(row.get("price_vnd") or 0) for row in sample.get("items") or []]
            solds = [int(row.get("sold") or 0) for row in sample.get("items") or []]
            price = int(chosen.get("price_vnd") or 0)
            sold = int(chosen.get("sold") or 0)
            mid_price = _median([value for value in prices if value > 0])
            mid_sold = _median(solds)
            price_place = "cao hơn giá thường gặp" if price > mid_price else "không cao hơn giá thường gặp"
            sold_place = "bán mạnh hơn mặt bằng" if sold > mid_sold else "không bán mạnh hơn mặt bằng"
            shop = "shop chính hãng" if chosen.get("is_mall") else "shop thường"
            commission = chosen.get("commission_pct")
            commission_text = "chưa có hoa hồng" if commission is None else f"hoa hồng {commission}%"
            rating = chosen.get("rating")
            rating_text = "chưa có điểm" if rating is None else f"điểm {rating}"
            lines.append(
                f"- {chosen.get('title')}: giá {_vnd(price)} {price_place} của mẫu ({_vnd(mid_price)}), "
                f"{_num(sold)} lượt, {sold_place} (trung vị {_num(mid_sold)}), {rating_text}, {shop}, {commission_text}."
            )
    elif intent == "compare":
        lines.append("Hai tên, cùng bộ số, cùng các sàn đã chọn.")
        for name in route.get("names") or []:
            lines.append(f"{name}:")
            named = [sample for sample in samples if sample.get("name") == name]
            if not named:
                lines.append("- Chưa đo.")
            for sample in named:
                lines.append(f"- {_size_line(sample)}")
    elif intent == "market_category":
        when = route.get("when") if isinstance(route.get("when"), dict) else {}
        category = str(route.get("category") or "")
        if str(when.get("kind") or "") == "occasion" and category == str(when.get("label") or ""):
            lines.append(f"Dịp {when.get('label')}. So các tên mùa này trên sàn đã chọn.")
        else:
            lines.append(f"Ngành {category}. So các tên trên sàn đã chọn.")
        for sample in samples:
            lines.append(f"- {sample.get('name')}: {_size_line(sample)}")
        if samples:
            best = max(samples, key=lambda sample: int(sample.get("total_sold") or 0))
            lines.append(f"Bán nhiều nhất trong nhóm vừa đo: {best.get('name')}. Muốn đo sâu thì xin báo cáo đầy đủ tên này.")
    else:
        for sample in samples:
            lines.append(_size_line(sample))
        if related:
            lines.append("Cụm tìm kèm: " + ", ".join(related[:5]) + ".")
        if intent == "full_report":
            lines.append("Trang dài phía dưới gồm từng sàn đã chọn.")
    return "\n".join(lines).strip()


def write_answer_page(
    path: Path,
    title: str,
    prose: str,
    samples: List[Dict[str, Any]],
    related: List[str],
    long_form: bool = False,
) -> None:
    del long_form
    write_report_page(path, title, prose, samples, related)
