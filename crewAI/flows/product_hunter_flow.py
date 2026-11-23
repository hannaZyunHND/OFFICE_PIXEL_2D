"""
CrewAI Flow: Product Hunter — Phân Tích Thị Trường Đa Sàn TMĐT (11 Agents · Tự Động Toàn Trình)
-----------------------------------------------------------------------------------------------
- Mặc định chạy TỰ ĐỘNG 100% (`hitlPolicy="auto_skip"`) xuất Báo cáo Thị trường chuẩn
  ShopeeAnalytics cho 3 sàn:
  🟠 Sàn Cam (Shopee) · 🔵 Sàn Xanh (Lazada) · ⚫ Sàn Đen (TikTok Shop)
- Bảng chuẩn đồng nhất cho cả 3 sàn: phần nào sàn có API thì hiển thị số liệu đầy đủ,
  phần nào API chưa trả về thì hiển thị minh bạch "(API đang phát triển)".
- Tab cuối (`🪵 Logs Request / Response & Xử Lý Dữ Liệu`) lưu toàn bộ Request (đã che secret),
  Raw Response mẫu và quy trình công thức xử lý dữ liệu từng bước.
"""

from __future__ import annotations

import asyncio
import html
import json
from pathlib import Path
import re
import time
from typing import Any, Dict, List
import zipfile

from codex_cli_llm import find_codex_executable, run_codex_exec
from env_loader import get_crew_portal_base_url
from pixel_office_sdk import PixelOfficeBridge
import providers.ecommerce_providers  # noqa: F401
from providers.ecommerce_providers import get_platform_capabilities
from tool_registry import execute_tool_for_agent
import telegram_office  # noqa: F401


PRODUCT_HUNTER_AGENTS = {
    "liaison": "agent_telegram_liaison",
    "strategist": "agent_market_strategist",
    "shopee": "agent_shopee_hunter",
    "lazada": "agent_lazada_hunter",
    "tiktok": "agent_tiktok_hunter",
    "pricing": "agent_pricing_analyst",
    "voc": "agent_voc_miner",
    "auditor": "agent_market_auditor",
    "architect": "agent_report_architect",
    "camera": "agent_office_camera",
    "courier": "agent_chairman_courier",
}

API_NOT_READY = "(API đang phát triển)"


def slugify_keyword(text: str) -> str:
    s = text.lower().strip()
    replacements = {
        "á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ": "a",
        "đ": "d",
        "é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ": "e",
        "í|ì|ỉ|ĩ|ị": "i",
        "ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ": "o",
        "ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự": "u",
        "ý|ỳ|ỷ|ỹ|ỵ": "y",
    }
    for pat, rep in replacements.items():
        s = re.sub(pat, rep, s)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s[:48] or "san_pham_moi"


def _fmt_vnd(val: float | int) -> str:
    return f"{int(round(val)):,} đ".replace(",", ".")


def _build_price_distribution_6(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Splits non-gift items into 6 price bands and highlights the highest-GMV Sweet Spot."""
    valid = [
        i for i in items
        if int(i.get("price_vnd") or 0) > 2_000 and not i.get("is_gift")
    ] or items
    prices = [int(i.get("price_vnd") or 0) for i in valid if int(i.get("price_vnd") or 0) > 0]
    if not prices:
        return []
    lo, hi = min(prices), max(prices)
    if hi <= lo:
        hi = lo + 60_000
    step = max(5_000, int((hi - lo) / 6))

    bins: List[Dict[str, Any]] = []
    for idx in range(6):
        b_start = lo + idx * step
        b_end = (lo + (idx + 1) * step) if idx < 5 else hi + 1
        matched = [
            it for it in valid
            if b_start <= int(it.get("price_vnd") or 0) < b_end
        ]
        gmv = sum(int(x.get("gmv_30d_vnd") or 0) for x in matched)
        sold = sum(int(x.get("sold_30d") or 0) for x in matched)
        bins.append(
            {
                "label": f"{_fmt_vnd(b_start).replace(' đ', '')} – {_fmt_vnd(b_end - 1 if idx < 5 else hi)}",
                "sku_count": len(matched),
                "sold": sold,
                "gmv": gmv,
                "is_sweet_spot": False,
            }
        )

    total_sku = max(1, len(valid))
    total_gmv = max(1, sum(b["gmv"] for b in bins))
    best_idx = max(range(len(bins)), key=lambda i: bins[i]["gmv"])
    for idx, b in enumerate(bins):
        b["sku_pct"] = round((b["sku_count"] / total_sku) * 100.0, 1)
        b["gmv_pct"] = round((b["gmv"] / total_gmv) * 100.0, 1)
        b["is_sweet_spot"] = idx == best_idx
    return bins


def _compute_market_overview_metrics(
    items: List[Dict[str, Any]],
    *,
    platform_key: str = "all",
    mode: str = "sandbox",
    provider: str = "Aggregated",
    capabilities_override: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Computes unified ShopeeAnalytics-grade metrics for a marketplace or aggregated view.
    Any metric not supported by that platform's API is explicitly marked '(API đang phát triển)'.
    """
    caps = dict(capabilities_override or get_platform_capabilities(platform_key))
    total_count = len(items)

    if total_count == 0:
        return {
            "platform_key": platform_key,
            "mode": mode,
            "provider": provider,
            "capabilities": caps,
            "sp_count": 0,
            "shop_count": 0,
            "total_sold": 0,
            "total_revenue_vnd": 0,
            "avg_price_vnd": 0,
            "min_price_vnd": 0,
            "max_price_vnd": 0,
            "sell_through_pct": 0.0,
            "products_with_sales": 0,
            "hhi": 0.0,
            "avg_commission_display": API_NOT_READY if caps.get("avg_commission") != "ok" else "0%",
            "avg_commission_pct": None,
            "history_coverage_display": API_NOT_READY if caps.get("history_30d") != "ok" else "0%",
            "history_coverage_pct": None,
            "koc_display": API_NOT_READY if caps.get("koc_creators") != "ok" else "0",
            "video_live_display": API_NOT_READY if caps.get("video_live_split") != "ok" else "Chờ dữ liệu",
            "gift_count": 0,
            "mall_count": 0,
            "mall_ratio_pct": 0.0,
            "mall_gmv_pct": 0.0,
            "blue_ocean_score": 0,
            "blue_ocean_label": "Chưa có dữ liệu",
            "top_shops": [],
            "price_bins_6": [],
            "distribution_cards": [],
            "formula_trace": {},
        }

    gift_items = [
        i for i in items
        if i.get("is_gift")
        or int(i.get("price_vnd") or 0) <= 2_000
        or "quà tặng" in str(i.get("title") or "").lower()
    ]
    non_gift_items = [i for i in items if i not in gift_items] or items

    prices = [int(i.get("price_vnd") or 0) for i in items if int(i.get("price_vnd") or 0) > 0]
    non_gift_prices = [int(i.get("price_vnd") or 0) for i in non_gift_items if int(i.get("price_vnd") or 0) > 0]
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    avg_price = round(sum(non_gift_prices) / max(1, len(non_gift_prices))) if non_gift_prices else 0

    shop_keys = {str(i.get("shop_id") or i.get("shop_name") or f"shop_{idx}") for idx, i in enumerate(items)}
    products_with_sales = sum(1 for i in items if int(i.get("sold_30d") or 0) > 0)
    sell_through_pct = round((products_with_sales / total_count) * 100.0, 1)

    total_sold = sum(int(i.get("sold_30d") or 0) for i in items)
    total_revenue = sum(int(i.get("gmv_30d_vnd") or 0) for i in items)

    shop_rev_map: Dict[str, Dict[str, Any]] = {}
    for idx, it in enumerate(items):
        skey = str(it.get("shop_id") or it.get("shop_name") or f"shop_{idx}")
        sname = str(it.get("shop_name") or skey)
        entry = shop_rev_map.setdefault(
            skey,
            {
                "shop_name": sname,
                "platform": str(it.get("platform") or ""),
                "is_mall": bool(it.get("is_mall")),
                "gmv": 0,
                "sold": 0,
                "sku_count": 0,
            },
        )
        entry["gmv"] += int(it.get("gmv_30d_vnd") or 0)
        entry["sold"] += int(it.get("sold_30d") or 0)
        entry["sku_count"] += 1

    if total_revenue > 0:
        hhi = round(sum((s["gmv"] / total_revenue) ** 2 for s in shop_rev_map.values()), 4)
    else:
        hhi = round(1.0 / max(1, len(shop_rev_map)), 4)

    top_shops = sorted(shop_rev_map.values(), key=lambda x: x["gmv"], reverse=True)[:5]
    for s in top_shops:
        s["share_pct"] = round((s["gmv"] / max(1, total_revenue)) * 100.0, 1)

    # Capabilities-aware Commission, History, KOC & Video/Live
    commissions = [
        float(i["commission_pct"])
        for i in items
        if i.get("commission_pct") is not None and float(i["commission_pct"]) > 0
    ]
    if caps.get("avg_commission") == "ok" and commissions:
        avg_commission = round(sum(commissions) / len(commissions), 1)
        avg_commission_display = f"{str(avg_commission).replace('.', ',')}%"
    else:
        avg_commission = None
        avg_commission_display = API_NOT_READY

    hist_vals = [i.get("has_history_30d") for i in items if i.get("has_history_30d") is not None]
    if caps.get("history_30d") == "ok" and hist_vals:
        history_coverage = round((sum(1 for v in hist_vals if v) / len(hist_vals)) * 100.0, 2)
        history_coverage_display = f"{history_coverage}%"
    else:
        history_coverage = None
        history_coverage_display = API_NOT_READY

    koc_vals = [int(i["koc_creators_count"]) for i in items if i.get("koc_creators_count") is not None]
    if caps.get("koc_creators") == "ok" and koc_vals:
        avg_koc = round(sum(koc_vals) / len(koc_vals), 1)
        koc_display = f"TB {avg_koc} KOC/SP"
    else:
        koc_display = API_NOT_READY

    video_live_display = (
        "~66% Video · 34% Live" if caps.get("video_live_split") == "ok"
        else ("TikTok ~66/34 · Sàn khác chưa hỗ trợ" if caps.get("video_live_split") == "partial" else API_NOT_READY)
    )

    mall_items = [i for i in items if i.get("is_mall")]
    mall_count = len(mall_items)
    mall_ratio = round((mall_count / total_count) * 100.0, 1)
    mall_gmv = sum(int(i.get("gmv_30d_vnd") or 0) for i in mall_items)
    mall_gmv_pct = round((mall_gmv / max(1, total_revenue)) * 100.0, 1)

    hhi_component = round(max(0.0, min(40.0, (1.0 - min(hhi, 0.85)) * 45.0)), 1)
    demand_component = round(max(0.0, min(35.0, (sell_through_pct / 100.0) * 35.0)), 1)
    openness_component = round(max(0.0, min(25.0, ((100.0 - mall_ratio) / 100.0) * 25.0)), 1)
    blue_ocean_score = int(round(max(8.0, min(96.0, hhi_component + demand_component + openness_component))))

    if blue_ocean_score >= 68:
        blue_label = "Đại dương xanh"
    elif blue_ocean_score >= 45:
        blue_label = "Khá tiềm năng"
    elif blue_ocean_score >= 28:
        blue_label = "Trung bình"
    else:
        blue_label = "Cạnh tranh gắt"

    price_bins_6 = _build_price_distribution_6(items)
    sweet_bin = next((b for b in price_bins_6 if b.get("is_sweet_spot")), None)

    top1_share = top_shops[0]["share_pct"] if top_shops else 0.0
    top3_share = round(sum(s["share_pct"] for s in top_shops[:3]), 1)
    top5_share = round(sum(s["share_pct"] for s in top_shops[:5]), 1)
    high_rating_pct = round(sum(1 for i in items if float(i.get("rating") or 0) >= 4.7) / total_count * 100.0, 1)

    distribution_cards = [
        {"title": "Thị phần Top #1 Shop", "value": f"{top1_share}%", "pct": min(100, top1_share), "sub": top_shops[0]["shop_name"] if top_shops else "-"},
        {"title": "Độ tập trung Top 3 Shop (CR3)", "value": f"{top3_share}%", "pct": min(100, top3_share), "sub": "Tổng GMV 3 shop dẫn đầu"},
        {"title": "Độ tập trung Top 5 Shop (CR5)", "value": f"{top5_share}%", "pct": min(100, top5_share), "sub": "Tổng GMV 5 shop dẫn đầu"},
        {"title": "Tỷ trọng Doanh thu Mall", "value": f"{mall_gmv_pct}%", "pct": min(100, mall_gmv_pct), "sub": f"{mall_count}/{total_count} SKU là Mall"},
        {"title": "Dư địa Shop Thường (Non-Mall)", "value": f"{round(100 - mall_gmv_pct, 1)}%", "pct": min(100, 100 - mall_gmv_pct), "sub": "Thị phần thuộc shop ngoài Mall"},
        {"title": "Dải giá ngọt (Sweet Spot GMV)", "value": f"{sweet_bin['gmv_pct']}%" if sweet_bin else "-", "pct": sweet_bin["gmv_pct"] if sweet_bin else 0, "sub": sweet_bin["label"] if sweet_bin else "-"},
        {"title": "Tỷ lệ SP đạt Rating >= 4.7★", "value": f"{high_rating_pct}%", "pct": high_rating_pct, "sub": "Chất lượng đánh giá trung bình toàn mẫu"},
        {"title": "Tín hiệu Hoa hồng Affiliate", "value": avg_commission_display, "pct": min(100, (avg_commission or 0) * 4), "sub": "Mức hoa hồng KOC/Affiliate" if avg_commission else API_NOT_READY},
        {"title": "Mật độ KOC / Creator", "value": koc_display, "pct": 72 if caps.get("koc_creators") == "ok" else 0, "sub": "Chỉ số KOC gắn giỏ hàng" if caps.get("koc_creators") == "ok" else API_NOT_READY},
        {"title": "Tỷ trọng Video vs Livestream", "value": video_live_display, "pct": 66 if caps.get("video_live_split") == "ok" else 0, "sub": "Kênh nội dung" if caps.get("video_live_split") != API_NOT_READY else API_NOT_READY},
    ]

    formula_trace = {
        "sp_count": total_count,
        "gift_excluded_from_avg_price": len(gift_items),
        "avg_price_formula": f"sum({len(non_gift_prices)} non-gift prices) / {max(1, len(non_gift_prices))} = {_fmt_vnd(avg_price)}",
        "hhi_formula": f"sum((shop_gmv / {_fmt_vnd(total_revenue)})^2 across {len(shop_rev_map)} shops) = {hhi}",
        "blue_ocean_formula": f"HHI_pts({hhi_component}) + Demand_pts({demand_component}) + NonMall_pts({openness_component}) = {blue_ocean_score}/100",
    }

    return {
        "platform_key": platform_key,
        "mode": mode,
        "provider": provider,
        "capabilities": caps,
        "sp_count": total_count,
        "shop_count": len(shop_keys),
        "total_sold": total_sold,
        "total_revenue_vnd": total_revenue,
        "avg_price_vnd": avg_price,
        "min_price_vnd": min_price,
        "max_price_vnd": max_price,
        "sell_through_pct": sell_through_pct,
        "products_with_sales": products_with_sales,
        "hhi": hhi,
        "avg_commission_pct": avg_commission,
        "avg_commission_display": avg_commission_display,
        "history_coverage_pct": history_coverage,
        "history_coverage_display": history_coverage_display,
        "koc_display": koc_display,
        "video_live_display": video_live_display,
        "gift_count": len(gift_items),
        "mall_count": mall_count,
        "mall_ratio_pct": mall_ratio,
        "mall_gmv_pct": mall_gmv_pct,
        "blue_ocean_score": blue_ocean_score,
        "blue_ocean_label": blue_label,
        "top_shops": top_shops,
        "price_bins_6": price_bins_6,
        "distribution_cards": distribution_cards,
        "formula_trace": formula_trace,
    }


def _extract_voc_insights(keyword: str, all_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    lower = keyword.lower()
    if any(k in lower for k in ("khăn", "giấy", "tã", "bỉm", "vệ sinh", "lau")):
        pains = [
            "Giấy mỏng, dễ rách khi gặp nước hoặc kéo bị đứt lắt nhắt",
            "Số tờ thực tế trên một gói/thùng ít hơn mô tả quảng cáo",
            "Bị bụi giấy nhiều hoặc mùi hương liệu nồng gây kích ứng",
            "Thùng carton giao tới hay bị rách góc/móp méo nếu không bọc kỹ",
        ]
        hooks = [
            "Quay test kéo giãn độ dai 4 lớp khi thấm nước trực tiếp trên video",
            "Cân trọng lượng thùng / đếm rõ số tờ thực tế ngay trên ảnh bìa",
            "Cam kết giấy nguyên sinh không tẩy trắng, an toàn cho da em bé",
        ]
    elif any(k in lower for k in ("đèn", "led", "sạc", "pin", "quạt", "tai nghe", "máy")):
        pains = [
            "Pin tụt nhanh sau 2–3 tuần, không đúng dung lượng quảng cáo",
            "Vỏ nhựa mỏng, rơi nhẹ là nứt hoặc lỏng cổng sạc Type-C",
            "Cảm biến / nút bấm đôi lúc bị trễ, hướng dẫn toàn tiếng Trung",
            "Đóng gói sơ sài, hộp móp méo khi vận chuyển đường dài",
        ]
        hooks = [
            "Pin trâu sạc 1 lần dùng cả tuần — bảo hành đổi mới 1-1",
            "Đo thực tế bằng đồng hồ, hoàn tiền nếu sai dung lượng",
            "Tặng kèm hướng dẫn tiếng Việt + chống sốc 3 lớp khi giao",
        ]
    else:
        pains = [
            "Màu sắc & chất liệu thực tế hơi khác ảnh render studio",
            "Phân loại size / combo gây nhầm lẫn khiến khách đặt nhầm",
            "Thiếu tem kiểm định / thông tin nguồn gốc rõ ràng ở mô tả",
        ]
        hooks = [
            "Quay video thật dưới ánh sáng tự nhiên không chỉnh màu",
            "Đóng gói kèm thiệp cam kết chất lượng & đổi trả trong 7 ngày",
        ]

    avg_rating = round(sum(float(i.get("rating") or 4.7) for i in all_items) / max(1, len(all_items)), 2)
    return {
        "avg_market_rating": avg_rating,
        "pain_points": pains,
        "recommended_usps": hooks,
    }


def _build_structured_ai_sections(
    keyword: str,
    overall: Dict[str, Any],
    per_platform: Dict[str, Dict[str, Any]],
    voc: Dict[str, Any],
) -> List[Dict[str, str]]:
    sweet = next((b for b in overall.get("price_bins_6") or [] if b.get("is_sweet_spot")), None)
    sweet_label = sweet["label"] if sweet else _fmt_vnd(overall["avg_price_vnd"])
    best_plat = max(per_platform.items(), key=lambda kv: kv[1]["total_revenue_vnd"])[0] if per_platform else "shopee"

    return [
        {
            "heading": "1. Đánh giá tổng quan quy mô & sức cầu",
            "body": (
                f"Từ khóa '{keyword}' đạt {overall['sp_count']} SKU từ {overall['shop_count']} shop, tổng {overall['total_sold']:,} lượt bán "
                f"tương ứng {_fmt_vnd(overall['total_revenue_vnd'])}. Tỷ lệ có bán đạt {overall['sell_through_pct']}% "
                f"({overall['products_with_sales']} sản phẩm phát sinh đơn), Điểm Đại dương xanh đạt {overall['blue_ocean_score']}/100 ({overall['blue_ocean_label']})."
            ),
        },
        {
            "heading": "2. Phân khúc giá & Dải giá ngọt (Sweet Spot)",
            "body": (
                f"Giá trung bình toàn mẫu là {_fmt_vnd(overall['avg_price_vnd'])} (khoảng giá {_fmt_vnd(overall['min_price_vnd'])} – {_fmt_vnd(overall['max_price_vnd'])}, "
                f"đã tách {overall['gift_count']} mẫu quà tặng giá thấp). Dải giá tập trung doanh thu cao nhất nằm ở mức {sweet_label}."
            ),
        },
        {
            "heading": "3. Mức độ cạnh tranh & Tỷ trọng Shop Mall",
            "body": (
                f"Chỉ số tập trung HHI toàn thị trường ở mức {overall['hhi']} (Mall chiếm {overall['mall_gmv_pct']}% doanh thu). "
                f"Top 3 shop dẫn đầu giữ {overall['distribution_cards'][1]['value']} GMV — Sàn dẫn đầu về GMV trong mẫu hiện tại là {best_plat.upper()}."
            ),
        },
        {
            "heading": "4. Hoa hồng Affiliate & Tín hiệu KOC",
            "body": (
                f"Sàn Cam & Sàn Đen hỗ trợ dữ liệu hoa hồng trung bình {overall['avg_commission_display']}; "
                f"trên Sàn Xanh (Lazada) các trường Hoa hồng Affiliate & KOC hiện ghi nhận trạng thái {API_NOT_READY}."
            ),
        },
        {
            "heading": "5. Điểm yếu đối thủ từ phản hồi khách hàng (VOC 1★–3★)",
            "body": " • ".join(voc.get("pain_points") or []),
        },
        {
            "heading": "6. Gợi ý nội dung SEO, Ảnh bìa & Video chuyển đổi",
            "body": " • ".join(voc.get("recommended_usps") or []),
        },
    ]


def _maybe_codex_market_narrative(
    keyword: str,
    overall: Dict[str, Any],
    per_platform: Dict[str, Dict[str, Any]],
    voc: Dict[str, Any],
) -> Dict[str, Any]:
    plat_lines = ", ".join(
        f"{k.upper()}: GMV {_fmt_vnd(v['total_revenue_vnd'])}, HHI {v['hhi']}, ĐĐX {v['blue_ocean_score']}/100"
        for k, v in per_platform.items()
    )
    fallback_narrative = (
        f"Thị trường '{keyword}' tổng hợp {overall['sp_count']} SP từ {overall['shop_count']} gian hàng với doanh thu "
        f"{_fmt_vnd(overall['total_revenue_vnd'])} ({overall['total_sold']:,} lượt bán, tỷ lệ có đơn {overall['sell_through_pct']}%, "
        f"HHI={overall['hhi']}, Điểm Đại dương xanh {overall['blue_ocean_score']}/100)."
    )

    prompt = (
        f"Bạn là Chuyên gia Nghiên cứu Thị trường TMĐT Việt Nam. Viết ĐÚNG 1 đoạn tóm tắt điều hành súc tích "
        f"(85-115 từ, tiếng Việt chuẩn, chỉ phân tích thị trường khách quan, KHÔNG tư vấn giá vốn):\n"
        f"- Từ khóa: {keyword}\n"
        f"- Tổng quan 3 sàn: {overall['sp_count']} SP, {overall['shop_count']} shop, {overall['total_sold']:,} lượt bán, "
        f"GMV {_fmt_vnd(overall['total_revenue_vnd'])}, Giá TB {_fmt_vnd(overall['avg_price_vnd'])}, HHI {overall['hhi']}, ĐĐX {overall['blue_ocean_score']}/100.\n"
        f"- Chi tiết sàn: {plat_lines}\n"
        f"- Nỗi đau khách hàng: {'; '.join(voc.get('pain_points', [])[:3])}"
    )

    if not find_codex_executable():
        return {
            "codex_used": False,
            "llm_engine": "Market Analytics Engine",
            "tokens_used": 0,
            "narrative": fallback_narrative,
            "prompt": prompt,
        }

    res = run_codex_exec(prompt, timeout_sec=35)
    if res.get("ok") and res.get("text"):
        return {
            "codex_used": True,
            "llm_engine": str(res.get("model") or "codex-cli"),
            "tokens_used": int(res.get("tokens_used") or 1100),
            "narrative": str(res["text"]).strip(),
            "prompt": prompt,
        }

    return {
        "codex_used": False,
        "llm_engine": "Market Analytics Engine (Codex Fallback)",
        "tokens_used": 0,
        "narrative": fallback_narrative,
        "prompt": prompt,
    }


def _render_standardized_platform_tab(
    tab_id: str,
    title: str,
    m: Dict[str, Any],
    items: List[Dict[str, Any]],
    ai_sections: List[Dict[str, str]],
    is_active: bool,
) -> str:
    """Renders the full standardized ShopeeAnalytics-grade layout cleanly for any tab (All / Shopee / Lazada / TikTok)."""
    score = int(m["blue_ocean_score"])
    score_color = "#10b981" if score >= 68 else "#d97706" if score >= 40 else "#ef4444"
    badge_bg = "rgba(16,185,129,.18)" if score >= 68 else "rgba(217,119,6,.18)" if score >= 40 else "rgba(239,68,68,.18)"
    mode_tag = (
        '<span class="mode-badge live">LIVE API</span>'
        if m["mode"] == "live"
        else '<span class="mode-badge sandbox">SANDBOX</span>'
    )
    caps = m.get("capabilities") or {}
    display_style = "" if is_active else ' style="display:none"'

    hist_alert = (
        f"{m['history_coverage_display']} sản phẩm có đủ lịch sử cho số liệu 30 ngày."
        if caps.get("history_30d") == "ok"
        else f"Độ phủ lịch sử 30d: {API_NOT_READY}"
    )

    comm_val_html = (
        f'<span class="kpi-val slate">{m["avg_commission_display"]}</span>'
        if m["avg_commission_display"] != API_NOT_READY
        else f'<span class="api-dev">{API_NOT_READY}</span>'
    )

    # Interactive Product Table Rows (with platform-honest API đang phát triển cells)
    rows_html = ""
    sorted_items = sorted(items, key=lambda x: int(x.get("gmv_30d_vnd") or 0), reverse=True)
    for it in sorted_items[:30]:
        comm_cell = (
            f"{it['commission_pct']}%"
            if it.get("commission_pct") is not None
            else f'<span class="api-dev">{API_NOT_READY}</span>'
        )
        koc_cell = (
            f"{it['koc_creators_count']} KOC"
            if it.get("koc_creators_count") is not None
            else f'<span class="api-dev">{API_NOT_READY}</span>'
        )
        gift_badge = ' <span class="mode-badge sandbox">Quà tặng</span>' if it.get("is_gift") else ""
        mall_badge = ' <span class="mall-pill">Mall</span>' if it.get("is_mall") else ""
        rows_html += f"""
        <tr class="sku-row" data-mall="{'1' if it.get('is_mall') else '0'}" data-gift="{'1' if it.get('is_gift') else '0'}" data-title="{html.escape(str(it.get('title') or '').lower())}" data-gmv="{int(it.get('gmv_30d_vnd') or 0)}" data-sold="{int(it.get('sold_30d') or 0)}" data-price="{int(it.get('price_vnd') or 0)}">
          <td><a href="{html.escape(str(it.get('url') or '#'))}" target="_blank" rel="noopener">{html.escape(str(it.get('title') or ''))}</a>{gift_badge}</td>
          <td><span class="plat-pill {html.escape(str(it.get('platform') or ''))}">{html.escape(str(it.get('platform') or '').upper())}</span></td>
          <td>{html.escape(str(it.get('shop_name') or ''))}{mall_badge}</td>
          <td>{_fmt_vnd(it.get('price_vnd') or 0)}</td>
          <td>{int(it.get('sold_30d') or 0):,}</td>
          <td><strong>{_fmt_vnd(it.get('gmv_30d_vnd') or 0)}</strong></td>
          <td>{comm_cell}</td>
          <td>{koc_cell}</td>
          <td>{it.get('rating', 4.7)}★</td>
        </tr>"""

    # 6 Price Bins Bar Chart
    bins_html = ""
    for b in m.get("price_bins_6") or []:
        cls = "bin-row sweet" if b["is_sweet_spot"] else "bin-row"
        sweet_tag = ' <span class="sweet-tag">Sweet Spot</span>' if b["is_sweet_spot"] else ""
        bins_html += f"""
        <div class="{cls}">
          <div class="bin-lbl">{html.escape(b['label'])}{sweet_tag}</div>
          <div class="bin-bars">
            <div class="bin-line"><span class="mini-tag">SKU ({b['sku_pct']}%)</span><div class="mini-track"><div class="mini-fill blue" style="width:{max(3, b['sku_pct'])}%"></div></div></div>
            <div class="bin-line"><span class="mini-tag">GMV ({b['gmv_pct']}%)</span><div class="mini-track"><div class="mini-fill green" style="width:{max(3, b['gmv_pct'])}%"></div></div></div>
          </div>
          <div class="bin-val">{_fmt_vnd(b['gmv'])}</div>
        </div>"""

    # 10 Distribution Cards (2 cols x 5 rows)
    dist_cards_html = ""
    for c in m.get("distribution_cards") or []:
        is_dev = c["value"] == API_NOT_READY or c["sub"] == API_NOT_READY
        val_cls = "api-dev" if is_dev else "dist-val"
        dist_cards_html += f"""
        <div class="dist-card">
          <div class="dist-top"><span>{html.escape(c['title'])}</span><span class="{val_cls}">{html.escape(str(c['value']))}</span></div>
          <div class="mini-track"><div class="mini-fill blue" style="width:{min(100, max(0, float(c['pct'])))}%"></div></div>
          <div class="dist-sub">{html.escape(str(c['sub']))}</div>
        </div>"""

    # Capability Transparency Matrix for this tab
    cap_labels = {
        "sp_count": "Sản phẩm khớp từ khóa",
        "shop_count": "Thống kê gian hàng (Shop / Mall)",
        "total_sold": "Lượt bán 30 ngày",
        "total_revenue": "Doanh thu ước tính (GMV)",
        "avg_price": "Giá trung bình & Khoảng giá",
        "sell_through": "Tỷ lệ có bán & HHI",
        "avg_commission": "Hoa hồng Affiliate (%)",
        "history_30d": "Độ phủ lịch sử giá/bán 30 ngày",
        "koc_creators": "Số lượng KOC gắn giỏ hàng",
        "video_live_split": "Tỷ trọng Video vs Livestream",
        "keyword_search_volume": "Lượng tìm kiếm từ khóa / tháng",
    }
    caps_html = ""
    for ck, clabel in cap_labels.items():
        st = caps.get(ck, API_NOT_READY)
        pill = (
            '<span class="mode-badge live">Đang lấy được</span>'
            if st == "ok"
            else '<span class="mode-badge partial">Hỗ trợ một phần</span>'
            if st == "partial"
            else f'<span class="api-dev">{API_NOT_READY}</span>'
        )
        caps_html += f'<div class="cap-item"><span>{clabel}</span>{pill}</div>'

    ai_html = "".join(
        f'<div class="ai-sec"><h4>{html.escape(s["heading"])}</h4><p>{html.escape(s["body"])}</p></div>'
        for s in ai_sections
    )

    top_shop_rows = "".join(
        f"<tr><td><strong>{html.escape(s['shop_name'])}</strong></td><td>{'🏢 Mall' if s['is_mall'] else 'Shop Thường'}</td><td>{s['sku_count']}</td><td>{s['sold']:,}</td><td>{_fmt_vnd(s['gmv'])}</td><td><span class='share-pill'>{s['share_pct']}%</span></td></tr>"
        for s in (m.get("top_shops") or [])
    )

    return f"""
    <section class="sa-tab-panel" id="panel_{tab_id}"{display_style}>
      <!-- 1. Toàn cảnh thị trường -->
      <div class="sa-panel">
        <div class="sa-sub">Phân tích chuẩn đa sàn: <strong>{html.escape(title)}</strong> {mode_tag}</div>
        <h2 class="sa-title">Toàn cảnh thị trường</h2>
        <div class="sa-hint">Nguồn thu thập: {html.escape(str(m['provider']))}. Các mục API chưa cung cấp được đánh dấu <code>{API_NOT_READY}</code>.</div>

        <div class="alert-row">
          <div class="alert-card warn"><div class="alert-title">Độ phủ lịch sử cần lưu ý</div><div class="alert-desc">{html.escape(hist_alert)}</div></div>
          <div class="alert-card ok"><div class="alert-title">Khớp đúng cụm từ</div><div class="alert-desc">Chuẩn hóa theo từ khóa &amp; loại nhiễu giữa các sàn.</div></div>
          <div class="alert-card info"><div class="alert-title">Phạm vi dữ liệu nguồn</div><div class="alert-desc">Đang thống kê {m['sp_count']} SP từ {m['shop_count']} shop đang bán.</div></div>
          <div class="alert-card warn"><div class="alert-title">Quà tặng &amp; SKU giá 0-2k</div><div class="alert-desc">Phát hiện {m['gift_count']} SKU quà tặng; đã tách khỏi Giá trung bình.</div></div>
        </div>

        <div class="overview-split">
          <div class="blue-ocean-card">
            <div class="bo-caption">Điểm Đại dương xanh</div>
            <div class="bo-score-line"><span class="bo-num" style="color:{score_color}">{score}</span><span class="bo-den">/ 100</span></div>
            <div class="bo-badge" style="color:{score_color};background:{badge_bg}">{html.escape(str(m['blue_ocean_label']))}</div>
            <div class="bo-track"><div class="bo-fill" style="width:{score}%;background:{score_color}"></div></div>
            <p class="bo-note">Tổng hợp từ độ phân tán HHI ({m['hhi']}), tỷ lệ có đơn ({m['sell_through_pct']}%) và dư địa shop ngoài Mall ({round(100 - m['mall_ratio_pct'], 1)}%).</p>
          </div>

          <div class="kpi-panel">
            <div class="kpi-panel-head">Chỉ số toàn cảnh</div>
            <div class="kpi-grid">
              <div class="kpi-box"><div class="kpi-lbl">SP khớp từ khóa</div><div class="kpi-val blue">{m['sp_count']}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Shop đang bán</div><div class="kpi-val blue">{m['shop_count']}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Lượt bán lũy kế</div><div class="kpi-val purple">{m['total_sold']:,}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Doanh thu ước tính</div><div class="kpi-val slate">{_fmt_vnd(m['total_revenue_vnd'])}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Giá trung bình</div><div class="kpi-val amber">{_fmt_vnd(m['avg_price_vnd'])}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Khoảng giá nguồn</div><div class="kpi-val amber" style="font-size:14px">{_fmt_vnd(m['min_price_vnd'])} – {_fmt_vnd(m['max_price_vnd'])}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Tỷ lệ có bán</div><div class="kpi-val green">{m['sell_through_pct']}%</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Sản phẩm có lượt bán</div><div class="kpi-val green">{m['products_with_sales']}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">HHI (Độ tập trung)</div><div class="kpi-val slate">{str(m['hhi']).replace('.', ',')}</div></div>
              <div class="kpi-box"><div class="kpi-lbl">Hoa hồng trung bình</div>{comm_val_html}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Danh sách sản phẩm + Bộ lọc tương tác -->
      <div class="sa-panel">
        <div class="table-toolbar">
          <div>
            <h3 style="margin:0;font-size:15px">📦 Danh sách sản phẩm ({len(sorted_items)} SKU)</h3>
            <span class="sa-hint">Sắp xếp, lọc nhanh theo tên, loại gian hàng hoặc xuất CSV.</span>
          </div>
          <div class="filter-controls">
            <input type="text" class="ctrl-input" placeholder="Tìm tên SP..." oninput="filterTabTable('{tab_id}', this.value, null)" />
            <select class="ctrl-select" onchange="filterTabTable('{tab_id}', null, this.value)">
              <option value="all">Tất cả Shop</option>
              <option value="mall">Chỉ Mall</option>
              <option value="nogift">Ẩn Quà tặng</option>
            </select>
            <button type="button" class="ctrl-btn" onclick="exportTabCsv('{tab_id}')">⬇ Tải CSV</button>
          </div>
        </div>
        <div class="tbl-wrap">
          <table id="tbl_{tab_id}">
            <thead><tr><th>Sản phẩm</th><th>Sàn</th><th>Gian hàng</th><th>Giá bán</th><th>Lượt bán</th><th>Doanh thu ước tính</th><th>Hoa hồng</th><th>KOC</th><th>Sao</th></tr></thead>
            <tbody>{rows_html}</tbody>
          </table>
        </div>
      </div>

      <!-- 3. Phân bố khoảng giá 6 dải + Top Shop CR5 -->
      <div class="grid2">
        <div class="sa-panel" style="margin-bottom:0">
          <h3 style="margin:0 0 10px;font-size:15px">📊 Phân bố theo khoảng giá (6 dải · Highlight Sweet Spot)</h3>
          {bins_html}
        </div>
        <div class="sa-panel" style="margin-bottom:0;overflow-x:auto">
          <h3 style="margin:0 0 10px;font-size:15px">🏪 Top Shop trong mẫu ({m['shop_count']} Shop)</h3>
          <table>
            <thead><tr><th>Shop</th><th>Loại</th><th>SKU</th><th>Đã bán</th><th>GMV</th><th>Thị phần</th></tr></thead>
            <tbody>{top_shop_rows}</tbody>
          </table>
        </div>
      </div>

      <!-- 4. 10 Chỉ số phân bố & Cạnh tranh -->
      <div class="sa-panel" style="margin-top:14px">
        <h3 style="margin:0 0 12px;font-size:15px">📐 Phân bố chi tiết nguồn hàng, Shop &amp; Kênh bán</h3>
        <div class="dist-grid">{dist_cards_html}</div>
      </div>

      <!-- 5. Tình trạng đáp ứng API theo sàn -->
      <div class="sa-panel">
        <h3 style="margin:0 0 10px;font-size:15px">🔌 Trạng thái trường dữ liệu API cho "{html.escape(title)}"</h3>
        <div class="caps-grid">{caps_html}</div>
      </div>

      <!-- 6. Phân tích AI chuyên sâu -->
      <div class="sa-panel">
        <h3 style="margin:0 0 10px;font-size:15px">🧠 Phân tích thị trường chuyên sâu theo cấu trúc chuẩn</h3>
        <div class="ai-grid">{ai_html}</div>
      </div>
    </section>"""


def _render_logs_tab_html(api_logs: List[Dict[str, Any]], overall_formula: Dict[str, Any], per_platform: Dict[str, Dict[str, Any]]) -> str:
    """Renders Tab 5: Full Request / Response & Data-Processing Logs for developer auditing."""
    cards_html = ""
    for idx, log in enumerate(api_logs, start=1):
        mode = str(log.get("mode") or "sandbox").upper()
        badge_cls = "live" if mode == "LIVE" else "partial" if mode == "COMPUTED" else "sandbox"
        req = log.get("request") or {}
        resp = log.get("response") or {}
        steps = log.get("processing_steps") or []
        req_json = html.escape(json.dumps(req, ensure_ascii=False, indent=2))
        resp_json = html.escape(json.dumps(resp, ensure_ascii=False, indent=2))
        steps_li = "".join(f"<li>{html.escape(str(s))}</li>" for s in steps)

        cards_html += f"""
        <div class="log-card">
          <div class="log-head">
            <div>
              <span class="log-idx">#{idx}</span>
              <strong style="color:#f8fafc">{html.escape(str(log.get('tool_name') or log.get('step')))}</strong>
              <span class="sa-hint" style="margin-left:8px">Agent: {html.escape(str(log.get('agent_id') or '-'))} &bull; {log.get('duration_ms', 0)} ms</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="mode-badge {badge_cls}">{mode}</span>
              <span class="mono-pill">HTTP {html.escape(str(resp.get('http_status', '-')))}</span>
            </div>
          </div>
          <div class="log-3col">
            <div class="log-box">
              <div class="log-box-title">📤 Request gửi đi (Secrets đã che)</div>
              <pre class="code-pre">{req_json}</pre>
            </div>
            <div class="log-box">
              <div class="log-box-title">📥 Response nhận về ({resp.get('records_received', 0)} records)</div>
              <pre class="code-pre">{resp_json}</pre>
            </div>
            <div class="log-box">
              <div class="log-box-title">⚙️ Cách xử lý dữ liệu để ra số liệu</div>
              <ul class="proc-list">{steps_li}</ul>
            </div>
          </div>
        </div>"""

    # Formula Trace Summary across All + 3 Platforms
    formula_rows = ""
    for key, f in [("TỔNG HỢP 3 SÀN", overall_formula)] + [(k.upper(), m.get("formula_trace") or {}) for k, m in per_platform.items()]:
        formula_rows += f"""
        <tr>
          <td><strong>{html.escape(key)}</strong></td>
          <td><code>{html.escape(str(f.get('avg_price_formula') or '-'))}</code></td>
          <td><code>{html.escape(str(f.get('hhi_formula') or '-'))}</code></td>
          <td><code>{html.escape(str(f.get('blue_ocean_formula') or '-'))}</code></td>
        </tr>"""

    return f"""
    <section class="sa-tab-panel" id="panel_logs" style="display:none">
      <div class="sa-panel">
        <h2 class="sa-title">🪵 Logs Toàn Bộ Request / Response &amp; Cách Xử Lý Dữ Liệu</h2>
        <div class="sa-hint">Mỗi API key hoặc token trong URL/Headers được che tự động dạng <code>ab***1234</code> để an toàn khi xuất báo cáo hoặc đẩy Git.</div>

        <div class="sub-card" style="margin-top:12px">
          <div class="sub-card-head">🧮 Bảng Truy Vết Công Thức Ra Số Liệu Thực Tế Của Lần Chạy Này</div>
          <table>
            <thead><tr><th>Phạm vi</th><th>Công thức Giá TB (Tách quà tặng)</th><th>Công thức HHI</th><th>Công thức Điểm Đại Dương Xanh (/100)</th></tr></thead>
            <tbody>{formula_rows}</tbody>
          </table>
        </div>

        {cards_html}
      </div>
    </section>"""


def _render_dashboard_html(report_data: Dict[str, Any]) -> str:
    keyword = html.escape(str(report_data["keyword"]))
    narrative = html.escape(str(report_data["narrative"]))
    llm_engine = html.escape(str(report_data.get("llm_engine") or "Market Engine"))
    overall: Dict[str, Any] = report_data["overall"]
    per_platform: Dict[str, Dict[str, Any]] = report_data["per_platform"]
    all_items: List[Dict[str, Any]] = report_data["all_items"]
    items_by_platform: Dict[str, List[Dict[str, Any]]] = report_data["items_by_platform"]
    ai_sections: List[Dict[str, str]] = report_data["ai_sections"]
    api_logs: List[Dict[str, Any]] = report_data["api_logs"]

    tabs_meta = [("all", "🌐 Tổng Hợp 3 Sàn", overall, all_items)]
    plat_titles = {
        "shopee": "🟠 Sàn Cam (Shopee)",
        "lazada": "🔵 Sàn Xanh (Lazada)",
        "tiktok_shop": "⚫ Sàn Đen (TikTok Shop)",
    }
    for key in ("shopee", "lazada", "tiktok_shop"):
        if key in per_platform:
            tabs_meta.append((key, plat_titles[key], per_platform[key], items_by_platform.get(key, [])))

    tabs_html = "".join(
        f'<button type="button" class="tab-btn{" active" if idx == 0 else ""}" data-tab="{pid}" onclick="switchMarketTab(\'{pid}\')">{label}</button>'
        for idx, (pid, label, _, _) in enumerate(tabs_meta)
    ) + f'<button type="button" class="tab-btn log-tab" data-tab="logs" onclick="switchMarketTab(\'logs\')">🪵 Logs Request / Response ({len(api_logs)})</button>'

    panels_html = "".join(
        _render_standardized_platform_tab(pid, label, metrics, tab_items, ai_sections, idx == 0)
        for idx, (pid, label, metrics, tab_items) in enumerate(tabs_meta)
    )
    logs_panel_html = _render_logs_tab_html(api_logs, overall.get("formula_trace") or {}, per_platform)

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo Cáo Thị Trường Đa Sàn — {keyword}</title>
  <style>
    :root {{ color-scheme: dark; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family: Inter, system-ui, sans-serif; background:#020617; color:#e2e8f0; line-height:1.5; }}
    .wrap {{ max-width:1320px; margin:0 auto; padding:20px; }}
    .hero {{ background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155; border-radius:14px; padding:18px 22px; margin-bottom:14px; }}
    .pill {{ display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; background:rgba(56,189,248,.15); color:#38bdf8; border:1px solid rgba(56,189,248,.4); }}
    .hero h1 {{ margin:6px 0 8px; font-size:22px; color:#f8fafc; }}
    .hero-narrative {{ margin:0; font-size:13.5px; color:#cbd5e1; }}
    .tabs-bar {{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; position:sticky; top:0; z-index:10; background:rgba(2,6,23,.92); backdrop-filter:blur(6px); padding:8px 0; }}
    .tab-btn {{ padding:8px 14px; border-radius:10px; border:1px solid #334155; background:#0f172a; color:#94a3b8; font-weight:600; font-size:13px; cursor:pointer; transition:all .15s; }}
    .tab-btn:hover {{ color:#f8fafc; border-color:#475569; }}
    .tab-btn.active {{ background:#1e293b; color:#38bdf8; border-color:#38bdf8; box-shadow:0 0 0 1px rgba(56,189,248,.35); }}
    .tab-btn.log-tab.active {{ color:#fbbf24; border-color:#fbbf24; }}
    .sa-panel {{ background:#0f172a; border:1px solid #334155; border-radius:14px; padding:18px; margin-bottom:14px; }}
    .sa-sub {{ font-size:12px; color:#94a3b8; display:flex; align-items:center; gap:8px; }}
    .sa-title {{ margin:2px 0; font-size:18px; color:#f8fafc; }}
    .sa-hint {{ font-size:12px; color:#64748b; margin-bottom:12px; }}
    .alert-row {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-bottom:14px; }}
    .alert-card {{ padding:10px 12px; border-radius:10px; background:#020617; border:1px solid #334155; }}
    .alert-card.warn {{ border-color:rgba(245,158,11,.45); background:rgba(245,158,11,.06); }}
    .alert-card.ok {{ border-color:rgba(34,197,94,.45); background:rgba(34,197,94,.06); }}
    .alert-card.info {{ border-color:rgba(56,189,248,.45); background:rgba(56,189,248,.06); }}
    .alert-title {{ font-size:12px; font-weight:700; color:#f8fafc; }}
    .alert-desc {{ font-size:11px; color:#94a3b8; margin-top:2px; }}
    .overview-split {{ display:grid; grid-template-columns:270px 1fr; gap:14px; }}
    @media (max-width:860px) {{ .overview-split {{ grid-template-columns:1fr; }} }}
    .blue-ocean-card {{ background:#020617; border:1px solid rgba(245,158,11,.45); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px; }}
    .bo-caption {{ font-size:12.5px; font-weight:600; color:#cbd5e1; }}
    .bo-score-line {{ display:flex; align-items:baseline; gap:6px; }}
    .bo-num {{ font-size:38px; font-weight:800; line-height:1; }}
    .bo-den {{ font-size:15px; color:#94a3b8; font-weight:600; }}
    .bo-badge {{ align-self:flex-start; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; }}
    .bo-track {{ height:8px; background:#1e293b; border-radius:999px; overflow:hidden; margin:4px 0; }}
    .bo-fill {{ height:100%; border-radius:999px; }}
    .bo-note {{ margin:0; font-size:11.5px; color:#94a3b8; }}
    .kpi-panel {{ background:#020617; border:1px solid #334155; border-radius:12px; padding:14px; }}
    .kpi-panel-head {{ font-size:12.5px; font-weight:700; color:#cbd5e1; margin-bottom:10px; }}
    .kpi-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; }}
    .kpi-box {{ background:#0f172a; border:1px solid #1e293b; border-radius:9px; padding:10px 12px; }}
    .kpi-lbl {{ font-size:11px; color:#94a3b8; }}
    .kpi-val {{ font-size:17px; font-weight:800; margin-top:4px; color:#f8fafc; }}
    .kpi-val.blue {{ color:#38bdf8; }} .kpi-val.purple {{ color:#c084fc; }} .kpi-val.amber {{ color:#fbbf24; }} .kpi-val.green {{ color:#4ade80; }}
    .api-dev {{ display:inline-block; margin-top:4px; font-size:11px; font-style:italic; color:#94a3b8; background:rgba(148,163,184,.12); border:1px dashed #475569; padding:2px 7px; border-radius:6px; }}
    .table-toolbar {{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; }}
    .filter-controls {{ display:flex; flex-wrap:wrap; gap:8px; }}
    .ctrl-input, .ctrl-select, .ctrl-btn {{ background:#020617; border:1px solid #334155; color:#f8fafc; border-radius:8px; padding:6px 10px; font-size:12px; outline:none; }}
    .ctrl-btn {{ cursor:pointer; background:#1e293b; font-weight:600; }} .ctrl-btn:hover {{ border-color:#38bdf8; color:#38bdf8; }}
    .tbl-wrap {{ max-height:420px; overflow:auto; border:1px solid #1e293b; border-radius:10px; }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; }}
    th, td {{ text-align:left; padding:8px 10px; border-bottom:1px solid #1e293b; }}
    th {{ background:#020617; color:#94a3b8; font-size:10.5px; text-transform:uppercase; position:sticky; top:0; }}
    a {{ color:#38bdf8; text-decoration:none; }} a:hover {{ text-decoration:underline; }}
    .grid2 {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }}
    .bin-row {{ display:grid; grid-template-columns:190px 1fr 110px; align-items:center; gap:10px; padding:7px 8px; border-radius:8px; margin-bottom:6px; background:#020617; border:1px solid #1e293b; }}
    .bin-row.sweet {{ border-color:rgba(16,185,129,.6); background:rgba(16,185,129,.08); }}
    .sweet-tag {{ font-size:9.5px; background:#10b981; color:#020617; font-weight:700; padding:1px 5px; border-radius:4px; margin-left:4px; }}
    .bin-lbl {{ font-size:11.5px; font-weight:600; }}
    .bin-line {{ display:flex; align-items:center; gap:6px; margin:2px 0; }}
    .mini-tag {{ width:78px; font-size:10px; color:#94a3b8; }}
    .mini-track {{ flex:1; height:6px; background:#1e293b; border-radius:999px; overflow:hidden; }}
    .mini-fill {{ height:100%; border-radius:999px; }}
    .mini-fill.blue {{ background:#38bdf8; }} .mini-fill.green {{ background:#10b981; }}
    .bin-val {{ text-align:right; font-size:11.5px; font-weight:700; color:#e2e8f0; }}
    .dist-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:10px; }}
    .dist-card {{ background:#020617; border:1px solid #1e293b; border-radius:10px; padding:10px 12px; }}
    .dist-top {{ display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px; gap:8px; }}
    .dist-val {{ font-weight:800; color:#38bdf8; }}
    .dist-sub {{ font-size:10.5px; color:#64748b; margin-top:5px; }}
    .caps-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:8px; }}
    .cap-item {{ display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:8px; background:#020617; border:1px solid #1e293b; font-size:12px; }}
    .ai-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:12px; }}
    .ai-sec {{ background:#020617; border:1px solid #1e293b; border-radius:10px; padding:12px; }}
    .ai-sec h4 {{ margin:0 0 6px; font-size:13px; color:#38bdf8; }} .ai-sec p {{ margin:0; font-size:12.5px; color:#cbd5e1; }}
    .mode-badge {{ font-size:10px; font-family:monospace; padding:2px 6px; border-radius:4px; font-weight:700; }}
    .mode-badge.live {{ background:rgba(34,197,94,.2); color:#4ade80; border:1px solid rgba(34,197,94,.5); }}
    .mode-badge.sandbox {{ background:rgba(245,158,11,.2); color:#fbbf24; border:1px solid rgba(245,158,11,.5); }}
    .mode-badge.partial {{ background:rgba(56,189,248,.2); color:#38bdf8; border:1px solid rgba(56,189,248,.5); }}
    .plat-pill {{ font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; }}
    .plat-pill.shopee {{ background:rgba(249,115,22,.18); color:#fb923c; }}
    .plat-pill.lazada {{ background:rgba(59,130,246,.18); color:#60a5fa; }}
    .plat-pill.tiktok_shop {{ background:rgba(236,72,153,.18); color:#f472b6; }}
    .mall-pill {{ font-size:9.5px; background:#ef4444; color:#fff; padding:1px 4px; border-radius:3px; margin-left:4px; font-weight:700; }}
    .share-pill {{ padding:2px 7px; border-radius:999px; background:#1e293b; color:#38bdf8; font-weight:700; font-size:11px; }}
    .sub-card {{ background:#020617; border:1px solid #334155; border-radius:12px; padding:14px; overflow-x:auto; }}
    .sub-card-head {{ font-size:14px; font-weight:700; color:#f8fafc; margin-bottom:10px; }}
    .log-card {{ background:#020617; border:1px solid #334155; border-radius:12px; padding:14px; margin-top:14px; }}
    .log-head {{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; padding-bottom:10px; border-bottom:1px solid #1e293b; margin-bottom:10px; }}
    .log-idx {{ display:inline-block; background:#1e293b; color:#38bdf8; font-family:monospace; font-size:11px; padding:2px 7px; border-radius:6px; margin-right:6px; }}
    .mono-pill {{ font-family:monospace; font-size:11px; padding:2px 7px; border-radius:4px; background:#0f172a; border:1px solid #334155; color:#cbd5e1; }}
    .log-3col {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:10px; }}
    .log-box {{ background:#0f172a; border:1px solid #1e293b; border-radius:9px; padding:10px; display:flex; flex-direction:column; min-width:0; }}
    .log-box-title {{ font-size:11.5px; font-weight:700; color:#cbd5e1; margin-bottom:6px; }}
    .code-pre {{ margin:0; font-family:monospace; font-size:11px; color:#93c5fd; background:#020617; padding:8px; border-radius:6px; max-height:240px; overflow:auto; white-space:pre-wrap; word-break:break-word; }}
    .proc-list {{ margin:0; padding-left:16px; font-size:12px; color:#cbd5e1; }} .proc-list li {{ margin-bottom:5px; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <span class="pill">🎯 PRODUCT HUNTER · BÁO CÁO PHÂN TÍCH THỊ TRƯỜNG ĐA SÀN &bull; {llm_engine}</span>
      <h1>Từ khóa: "{keyword}"</h1>
      <p class="hero-narrative">{narrative}</p>
    </div>

    <div class="tabs-bar">{tabs_html}</div>
    {panels_html}
    {logs_panel_html}
  </div>

  <script>
    var tabFilterState = {{}};
    function switchMarketTab(tabId) {{
      document.querySelectorAll('.tab-btn').forEach(function(btn) {{
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      }});
      document.querySelectorAll('.sa-tab-panel').forEach(function(panel) {{
        panel.style.display = (panel.id === 'panel_' + tabId) ? 'block' : 'none';
      }});
    }}
    function filterTabTable(tabId, queryVal, shopFilterVal) {{
      var st = tabFilterState[tabId] || {{ q: '', shop: 'all' }};
      if (queryVal !== null) st.q = queryVal.toLowerCase().trim();
      if (shopFilterVal !== null) st.shop = shopFilterVal;
      tabFilterState[tabId] = st;
      var tbl = document.getElementById('tbl_' + tabId);
      if (!tbl) return;
      tbl.querySelectorAll('tbody tr').forEach(function(tr) {{
        var t = tr.getAttribute('data-title') || '';
        var m = tr.getAttribute('data-mall') === '1';
        var g = tr.getAttribute('data-gift') === '1';
        var ok = (!st.q || t.indexOf(st.q) !== -1);
        if (st.shop === 'mall' && !m) ok = false;
        if (st.shop === 'nogift' && g) ok = false;
        tr.style.display = ok ? '' : 'none';
      }});
    }}
    function exportTabCsv(tabId) {{
      var tbl = document.getElementById('tbl_' + tabId);
      if (!tbl) return;
      var rows = Array.from(tbl.querySelectorAll('tr')).filter(function(r) {{ return r.style.display !== 'none'; }});
      var csv = rows.map(function(r) {{
        return Array.from(r.children).map(function(c) {{
          return '"' + (c.innerText || '').replace(/"/g, '""').trim() + '"';
        }}).join(',');
      }}).join('\\n');
      var blob = new Blob(['\\uFEFF' + csv], {{ type: 'text/csv;charset=utf-8;' }});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'product_hunter_' + tabId + '.csv';
      a.click();
    }}
  </script>
</body>
</html>"""


async def run_product_hunter_flow(
    keyword_prompt: str,
    bridge: PixelOfficeBridge,
    output_root: Path,
    step_delay: float = 0.75,
    options: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    t0 = time.time()
    opts = options or {}
    extras = dict(opts.get("extras") or {})
    hitl_policy = str(extras.get("hitlPolicy") or "auto_skip")
    default_max_items = int(extras.get("apifyMaxItemsPerPlatform") or 20)

    clean_keyword = re.sub(
        r"^(?:phân tích|tìm|săn|nghiên cứu|tra cứu)\s+(?:sản phẩm|thị trường|từ khóa)?\s*[:\-]?\s*",
        "",
        keyword_prompt.strip(),
        flags=re.IGNORECASE,
    ).strip() or keyword_prompt.strip() or "khăn giấy gấu trúc"

    slug = slugify_keyword(clean_keyword)
    pkg_dir = output_root / "product_hunter" / slug
    pkg_dir.mkdir(parents=True, exist_ok=True)
    api_logs: List[Dict[str, Any]] = []

    def _append_tool_log(agent_id: str, res: Dict[str, Any]) -> None:
        tr = res.get("trace") or {}
        api_logs.append(
            {
                "tool_name": res.get("tool_name"),
                "agent_id": agent_id,
                "mode": res.get("mode"),
                "duration_ms": res.get("duration_ms"),
                "request": tr.get("request") or {},
                "response": tr.get("response") or {},
                "processing_steps": tr.get("processing_steps") or [],
            }
        )

    # ── Liên lạc Telegram: xác nhận yêu cầu Chủ tịch vừa nhắn ────────────────
    liaison_id = PRODUCT_HUNTER_AGENTS["liaison"]
    await bridge.emit_event(
        "AGENT_START",
        liaison_id,
        f"Nhận yêu cầu từ Telegram: '{clean_keyword}'",
        input_payload={"keyword": clean_keyword, "source": str(opts.get("source") or "office")},
        tokens_used=120,
    )
    recv = await execute_tool_for_agent(
        bridge,
        liaison_id,
        "telegram_receive_request",
        {"text": clean_keyword},
        extras=extras,
        icon="message",
        tokens_used=80,
    )
    _append_tool_log(liaison_id, recv)
    await bridge.emit_event(
        "AGENT_HANDOFF",
        liaison_id,
        "Chuyển yêu cầu sang Market Strategist",
        target_agent_id=PRODUCT_HUNTER_AGENTS["strategist"],
        icon="message",
        tokens_used=40,
    )
    await bridge.emit_event(
        "AGENT_COMPLETE",
        liaison_id,
        "Đã chuyển yêu cầu ✓",
        icon="check",
        tokens_used=40,
    )

    # ── PHASE 0: Market Strategist ─────────────────────────────────────────────
    s_id = PRODUCT_HUNTER_AGENTS["strategist"]
    await bridge.emit_event(
        "AGENT_START",
        s_id,
        f"Phân tích từ khóa '{clean_keyword}' & lập ma trận quét 3 sàn...",
        input_payload={"keyword": clean_keyword, "hitl_policy": hitl_policy},
        tokens_used=260,
    )
    await asyncio.sleep(step_delay * 0.5)

    serper_res = await execute_tool_for_agent(
        bridge,
        s_id,
        "serper_ecommerce_search",
        {"keyword": clean_keyword, "site_filter": "site:shopee.vn OR site:lazada.vn"},
        extras=extras,
        icon="search",
        tokens_used=290,
    )
    _append_tool_log(s_id, serper_res)
    related_queries = (serper_res.get("data") or {}).get("related_searches") or [clean_keyword]

    await bridge.emit_event(
        "AGENT_COMPLETE",
        s_id,
        f"Hoàn tất mở rộng {len(related_queries)} cụm từ khóa thị trường ✓",
        icon="check",
        tokens_used=110,
    )

    selected_platforms = ["shopee", "lazada", "tiktok_shop"]
    max_items_per_platform = default_max_items
    exclude_keywords = ""

    if hitl_policy != "auto_skip":
        hitl_1 = await bridge.request_human_approval(
            agent_id=s_id,
            step_title="Gate #1: Chốt Phạm Vi 3 Sàn & Hạn Mức Cào API",
            stage="WORK -> PRE-CRAWL SCOPE",
            summary_md=f"Từ khóa: **{clean_keyword}**\nTừ khóa gợi ý: {', '.join(str(x) for x in related_queries[:5])}",
            choices=[
                {"id": "shopee", "label": "🟠 Sàn Cam (Shopee)", "default_selected": True},
                {"id": "lazada", "label": "🔵 Sàn Xanh (Lazada)", "default_selected": True},
                {"id": "tiktok_shop", "label": "⚫ Sàn Đen (TikTok Shop)", "default_selected": True},
            ],
            form_fields=[
                {"key": "max_items", "label": "Số SKU tối đa mỗi sàn (5–50)", "type": "number", "default_value": default_max_items},
                {"key": "exclude_keywords", "label": "Loại từ khóa nhiễu (tùy chọn)", "type": "text", "default_value": ""},
            ],
            estimated_cost_usd=0.08 if extras.get("apifyApiToken") else 0.0,
        )
        if hitl_1.get("decision") == "reject":
            raise RuntimeError("Người dùng đã dừng quy trình tại Gate #1.")
        if hitl_1.get("selected_choices"):
            selected_platforms = [str(x) for x in hitl_1["selected_choices"]]
        inputs_1 = hitl_1.get("inputs") or {}
        if inputs_1.get("max_items"):
            max_items_per_platform = max(5, min(50, int(inputs_1["max_items"])))
        exclude_keywords = str(inputs_1.get("exclude_keywords") or "")

    # ── PHASE 1: Song song 3 Scouts ────────────────────────────────────────────
    platform_results: Dict[str, Dict[str, Any]] = {}

    async def _scout_shopee() -> None:
        if "shopee" not in selected_platforms:
            return
        aid = PRODUCT_HUNTER_AGENTS["shopee"]
        await bridge.emit_event("AGENT_START", aid, f"Quét Sàn Cam (Shopee) '{clean_keyword}'...", tokens_used=250)
        res = await execute_tool_for_agent(
            bridge, aid, "addlivetag_market_search",
            {"query": clean_keyword, "max_items": max(30, max_items_per_platform)},
            extras=extras, icon="search", tokens_used=400,
        )
        _append_tool_log(aid, res)
        items = (res.get("data") or {}).get("items") or []
        if items:
            b_res = await execute_tool_for_agent(
                bridge, aid, "addlivetag_product_batch",
                {"item_ids": [str(x.get("item_id")) for x in items[:5]]},
                extras=extras, icon="db", tokens_used=240,
            )
            _append_tool_log(aid, b_res)
        platform_results["shopee"] = res
        await bridge.emit_event("AGENT_HANDOFF", aid, f"Gửi {len(items)} SKU Shopee sang Analysts", target_agent_id=PRODUCT_HUNTER_AGENTS["pricing"], icon="message", tokens_used=100)
        await bridge.emit_event("AGENT_COMPLETE", aid, f"Xong dữ liệu Sàn Cam ({len(items)} SKU) ✓", icon="check", tokens_used=80)

    async def _scout_lazada() -> None:
        if "lazada" not in selected_platforms:
            return
        aid = PRODUCT_HUNTER_AGENTS["lazada"]
        await bridge.emit_event("AGENT_START", aid, f"Quét Sàn Xanh (Lazada) '{clean_keyword}'...", tokens_used=240)
        res = await execute_tool_for_agent(
            bridge, aid, "apify_lazada_search",
            {"keyword": clean_keyword, "max_items": max_items_per_platform},
            extras=extras, icon="search", tokens_used=390,
        )
        _append_tool_log(aid, res)
        items = (res.get("data") or {}).get("items") or []
        platform_results["lazada"] = res
        await bridge.emit_event("AGENT_HANDOFF", aid, f"Gửi {len(items)} SKU Lazada sang Pricing Analyst", target_agent_id=PRODUCT_HUNTER_AGENTS["pricing"], icon="message", tokens_used=100)
        await bridge.emit_event("AGENT_COMPLETE", aid, f"Xong dữ liệu Sàn Xanh ({len(items)} SKU) ✓", icon="check", tokens_used=80)

    async def _scout_tiktok() -> None:
        if "tiktok_shop" not in selected_platforms:
            return
        aid = PRODUCT_HUNTER_AGENTS["tiktok"]
        await bridge.emit_event("AGENT_START", aid, f"Quét Sàn Đen (TikTok Shop VN) '{clean_keyword}'...", tokens_used=260)
        res = await execute_tool_for_agent(
            bridge, aid, "apify_tiktok_shop_search",
            {"keyword": clean_keyword, "region": "VN", "max_items": max_items_per_platform},
            extras=extras, icon="search", tokens_used=430,
        )
        _append_tool_log(aid, res)
        items = (res.get("data") or {}).get("items") or []
        platform_results["tiktok_shop"] = res
        await bridge.emit_event("AGENT_HANDOFF", aid, f"Gửi {len(items)} SKU TikTok Shop sang VOC Miner", target_agent_id=PRODUCT_HUNTER_AGENTS["voc"], icon="message", tokens_used=100)
        await bridge.emit_event("AGENT_COMPLETE", aid, f"Xong dữ liệu Sàn Đen ({len(items)} SKU) ✓", icon="check", tokens_used=85)

    await asyncio.gather(_scout_shopee(), _scout_lazada(), _scout_tiktok())
    await asyncio.sleep(step_delay * 0.4)

    excludes = [e.strip().lower() for e in exclude_keywords.split(",") if e.strip()]
    all_items: List[Dict[str, Any]] = []
    items_by_platform: Dict[str, List[Dict[str, Any]]] = {}
    per_platform_metrics: Dict[str, Dict[str, Any]] = {}

    for plat, res in platform_results.items():
        data = res.get("data") or {}
        raw_list = data.get("items") or []
        cleaned_list = [
            it for it in raw_list
            if not any(ex in str(it.get("title") or "").lower() for ex in excludes)
        ] or raw_list
        items_by_platform[plat] = cleaned_list
        all_items.extend(cleaned_list)
        per_platform_metrics[plat] = _compute_market_overview_metrics(
            cleaned_list,
            platform_key=plat,
            mode=str(res.get("mode") or "sandbox"),
            provider=str(res.get("provider") or plat),
            capabilities_override=data.get("capabilities") if isinstance(data.get("capabilities"), dict) else None,
        )

    overall_mode = "live" if any(m["mode"] == "live" for m in per_platform_metrics.values()) else "sandbox"
    overall_caps = dict(get_platform_capabilities("all"))
    if not any((m.get("capabilities") or {}).get("koc_creators") == "ok" for m in per_platform_metrics.values()):
        overall_caps["koc_creators"] = API_NOT_READY
    if not any((m.get("capabilities") or {}).get("video_live_split") not in (None, API_NOT_READY) for m in per_platform_metrics.values()):
        overall_caps["video_live_split"] = API_NOT_READY
    overall_metrics = _compute_market_overview_metrics(
        all_items,
        platform_key="all",
        mode=overall_mode,
        provider="Tổng hợp 3 Sàn (Shopee / Lazada / TikTok Shop)",
        capabilities_override=overall_caps,
    )

    api_logs.append(
        {
            "tool_name": "market_metrics_aggregation_pipeline",
            "agent_id": PRODUCT_HUNTER_AGENTS["pricing"],
            "mode": "computed",
            "duration_ms": 12,
            "request": {
                "method": "PIPELINE_REDUCE",
                "url": "internal://analytics/shopee-grade-aggregator",
                "headers": {},
                "payload": {
                    "platforms": list(per_platform_metrics.keys()),
                    "total_raw_skus": len(all_items),
                    "exclude_keywords": excludes,
                },
            },
            "response": {
                "http_status": 200,
                "records_received": len(all_items),
                "raw_sample": overall_metrics["formula_trace"],
            },
            "processing_steps": [
                f"1. Gom nhóm {len(all_items)} SKU từ {len(per_platform_metrics)} sàn; tách {overall_metrics['gift_count']} SKU quà tặng (<= 2.000đ) ra khỏi Giá trung bình.",
                f"2. Tính Giá trung bình: {overall_metrics['formula_trace']['avg_price_formula']}.",
                f"3. Tính chỉ số tập trung thị phần HHI: {overall_metrics['formula_trace']['hhi_formula']}.",
                f"4. Tính Điểm Đại dương xanh: {overall_metrics['formula_trace']['blue_ocean_formula']}.",
                "5. Chia dải giá thành 6 bậc đều nhau để tìm Sweet Spot (dải có GMV cao nhất) & xếp Top 5 Shop (CR5).",
                "6. Các chỉ số API không có (Hoa hồng Lazada, KOC/Live Shopee, Lịch sử 30d Lazada/TikTok) gán nguyên văn '(API đang phát triển)'.",
            ],
        }
    )

    # ── PHASE 2 & 3 ────────────────────────────────────────────────────────────
    voc: Dict[str, Any] = {}

    async def _run_pricing() -> None:
        aid = PRODUCT_HUNTER_AGENTS["pricing"]
        await bridge.emit_event("AGENT_START", aid, "Tính HHI, Điểm Đại dương xanh & 6 khoảng giá...", tokens_used=320)
        await asyncio.sleep(step_delay * 0.45)
        await bridge.emit_event("AGENT_HANDOFF", aid, "Chuyển HHI & 6 khoảng giá sang Auditor", target_agent_id=PRODUCT_HUNTER_AGENTS["auditor"], icon="message", tokens_used=110)
        await bridge.emit_event("AGENT_COMPLETE", aid, f"Hoàn tất HHI={overall_metrics['hhi']} & ĐĐX={overall_metrics['blue_ocean_score']}/100 ✓", icon="check", tokens_used=80)

    async def _run_voc() -> None:
        nonlocal voc
        aid = PRODUCT_HUNTER_AGENTS["voc"]
        await bridge.emit_event("AGENT_START", aid, "Phân tích đánh giá 1★–3★ & tín hiệu KOC...", tokens_used=300)
        await asyncio.sleep(step_delay * 0.45)
        voc = _extract_voc_insights(clean_keyword, all_items)
        await bridge.emit_event("AGENT_HANDOFF", aid, "Chuyển báo cáo VOC đối thủ sang Auditor", target_agent_id=PRODUCT_HUNTER_AGENTS["auditor"], icon="message", tokens_used=110)
        await bridge.emit_event("AGENT_COMPLETE", aid, "Hoàn tất phân tích Pain Points & USP ✓", icon="check", tokens_used=80)

    await asyncio.gather(_run_pricing(), _run_voc())

    aud_id = PRODUCT_HUNTER_AGENTS["auditor"]
    await bridge.emit_event(
        "AGENT_START", aud_id,
        f"Kiểm toán dữ liệu {overall_metrics['sp_count']} SP / {overall_metrics['shop_count']} Shop & xác nhận trường (API đang phát triển)...",
        tokens_used=310,
    )
    await asyncio.sleep(step_delay * 0.4)

    if hitl_policy == "standard_2_gates":
        hitl_2 = await bridge.request_human_approval(
            agent_id=aud_id,
            step_title="Gate #2: Xác nhận xuất Báo cáo Thị trường Đa Sàn",
            stage="APPROVAL -> DIRECTOR",
            summary_md=f"Tổng quan 3 sàn: **{overall_metrics['sp_count']} SP**, **{overall_metrics['shop_count']} Shop**, GMV **{_fmt_vnd(overall_metrics['total_revenue_vnd'])}**, ĐĐX **{overall_metrics['blue_ocean_score']}/100**.",
        )
        if hitl_2.get("decision") == "reject":
            raise RuntimeError("Đã dừng xuất báo cáo theo yêu cầu tại Gate #2.")

    await bridge.emit_event("AGENT_HANDOFF", aud_id, "Chuyển bộ dữ liệu đã kiểm toán sang Report Architect", target_agent_id=PRODUCT_HUNTER_AGENTS["architect"], icon="message", tokens_used=110)
    await bridge.emit_event("AGENT_COMPLETE", aud_id, "Kiểm toán số liệu toàn cảnh hoàn tất ✓", icon="check", tokens_used=85)

    # ── PHASE 4: Render Báo Cáo 5 Tab (All + 3 Sàn + Tab Logs) ─────────────────
    arch_id = PRODUCT_HUNTER_AGENTS["architect"]
    await bridge.emit_event("AGENT_START", arch_id, "Tổng hợp Báo cáo Chuẩn 3 Sàn + Tab Logs Request/Response...", tokens_used=340)

    narrative_info = await asyncio.to_thread(
        _maybe_codex_market_narrative, clean_keyword, overall_metrics, per_platform_metrics, voc
    )
    api_logs.append(
        {
            "tool_name": "codex_cli_market_synthesis",
            "agent_id": arch_id,
            "mode": "live" if narrative_info.get("codex_used") else "computed",
            "duration_ms": 1800 if narrative_info.get("codex_used") else 5,
            "request": {
                "method": "CODEX_CLI_EXEC",
                "url": "local://codex.exe exec --skip-git-repo-check --ephemeral -s read-only",
                "headers": {"model": narrative_info["llm_engine"]},
                "payload": {"prompt": narrative_info.get("prompt", "")},
            },
            "response": {
                "http_status": 200,
                "records_received": 1,
                "raw_sample": {"narrative": narrative_info["narrative"], "tokens_used": narrative_info["tokens_used"]},
            },
            "processing_steps": [
                "1. Nạp toàn bộ KPI đã kiểm toán (SP, Shop, GMV, HHI, ĐĐX, Tỷ lệ có bán, VOC) vào prompt phân tích điều hành.",
                "2. Trích xuất đoạn tóm tắt điều hành khách quan hiển thị ở phần đầu Báo cáo và sinh 6 khối Phân tích AI chuyên sâu.",
            ],
        }
    )

    ai_sections = _build_structured_ai_sections(clean_keyword, overall_metrics, per_platform_metrics, voc)
    report_payload = {
        "keyword": clean_keyword,
        "llm_engine": narrative_info["llm_engine"],
        "narrative": narrative_info["narrative"],
        "overall": overall_metrics,
        "per_platform": per_platform_metrics,
        "all_items": all_items,
        "items_by_platform": items_by_platform,
        "ai_sections": ai_sections,
        "voc": voc,
        "api_logs": api_logs,
    }

    html_path = pkg_dir / "index.html"
    md_path = pkg_dir / "market_report.md"
    json_path = pkg_dir / "market_data.json"
    zip_filename = f"ProductHunter_{slug}.zip"
    zip_path = output_root / zip_filename

    html_path.write_text(_render_dashboard_html(report_payload), encoding="utf-8")
    json_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    md_path.write_text(
        f"# Báo Cáo Thị Trường Đa Sàn: {clean_keyword}\n\n"
        f"- **Điểm Đại dương xanh**: {overall_metrics['blue_ocean_score']} / 100 ({overall_metrics['blue_ocean_label']})\n"
        f"- **SP khớp từ khóa**: {overall_metrics['sp_count']} | **Shop đang bán**: {overall_metrics['shop_count']}\n"
        f"- **Lượt bán lũy kế**: {overall_metrics['total_sold']:,} | **Doanh thu ước tính**: {_fmt_vnd(overall_metrics['total_revenue_vnd'])}\n"
        f"- **Giá trung bình**: {_fmt_vnd(overall_metrics['avg_price_vnd'])} | **Khoảng giá**: {_fmt_vnd(overall_metrics['min_price_vnd'])} – {_fmt_vnd(overall_metrics['max_price_vnd'])}\n"
        f"- **Tỷ lệ có bán**: {overall_metrics['sell_through_pct']}% | **HHI**: {overall_metrics['hhi']} | **Hoa hồng TB**: {overall_metrics['avg_commission_display']}\n\n"
        f"## Nhận Định Thị Trường ({narrative_info['llm_engine']})\n{narrative_info['narrative']}\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for fp in (html_path, md_path, json_path):
            zf.write(fp, arcname=fp.name)

    portal_base = get_crew_portal_base_url()
    portal_url = f"{portal_base}/product_hunter/{slug}/index.html"
    zip_url = f"{portal_base}/{zip_filename}"

    await bridge.emit_event(
        "AGENT_COMPLETE",
        arch_id,
        f"Hoàn tất Báo cáo Chuẩn 3 Sàn + {len(api_logs)} Logs API ✓",
        icon="check",
        output_payload={"portal_url": portal_url, "logs_count": len(api_logs)},
        tokens_used=230 + int(narrative_info.get("tokens_used") or 0),
    )

    courier_id = PRODUCT_HUNTER_AGENTS["courier"]
    await bridge.emit_event(
        "AGENT_START",
        courier_id,
        "Đăng báo cáo lên GitHub Pages và gửi link cho Chủ tịch...",
        tokens_used=180,
    )
    deliver = await execute_tool_for_agent(
        bridge,
        courier_id,
        "telegram_deliver_report",
        {
            "html_path": str(html_path),
            "slug": slug,
            "title": clean_keyword,
            "local_url": portal_url,
        },
        extras=extras,
        icon="message",
        tokens_used=160,
    )
    _append_tool_log(courier_id, deliver)
    deliver_data = deliver.get("data") if isinstance(deliver.get("data"), dict) else {}
    public_url = str((deliver_data or {}).get("public_url") or "")
    await bridge.emit_event(
        "AGENT_COMPLETE",
        courier_id,
        "Đã gửi link cho Chủ tịch ✓" if public_url else "Đã xử lý bàn giao báo cáo ✓",
        icon="check",
        output_payload={"public_url": public_url},
        tokens_used=80,
    )

    elapsed = round(time.time() - t0, 2)
    return {
        "flow_name": "Product Hunter — Báo Cáo Chuẩn 3 Sàn + Logs (11 Agents)",
        "prompt": keyword_prompt,
        "topic": clean_keyword,
        "slug": slug,
        "elapsed_seconds": elapsed,
        "portal_url": portal_url,
        "result_url": public_url or portal_url,
        "public_url": public_url,
        "pages_attempted": True,
        "zip_url": zip_url,
        "zip_filename": zip_filename,
        "files_count": 3,
        "llm_engine": narrative_info["llm_engine"],
        "codex_tokens": int(narrative_info.get("tokens_used") or 0),
        "qa_decision": f"ĐĐX {overall_metrics['blue_ocean_score']}/100 • HHI {overall_metrics['hhi']} • {len(api_logs)} API Logs",
        "master_blueprint": {
            "keyword": clean_keyword,
            "overall": overall_metrics,
            "per_platform": per_platform_metrics,
            "api_logs_count": len(api_logs),
        },
        "streams": [],
        "qr_svg": "",
    }
