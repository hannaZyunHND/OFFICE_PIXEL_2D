"""Turn one tool response into a FloorSample. Numbers come from that response."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from flows.product_hunter_flow import _compute_market_overview_metrics


def _int(value: Any) -> Optional[int]:
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _float(value: Any) -> Optional[float]:
    if value is None or value == "" or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct_points(value: Any) -> Optional[float]:
    number = _float(value)
    if number is None:
        return None
    if 0 < number < 1:
        number *= 100.0
    return round(number, 2)


def _rate_percent(value: Any) -> Optional[float]:
    number = _float(value)
    if number is None:
        return None
    if 0 <= number <= 1:
        number *= 100.0
    return round(number, 2)


def _ocean_label(score: float) -> str:
    if score >= 68:
        return "Đại dương xanh"
    if score >= 45:
        return "Khá tiềm năng"
    if score >= 28:
        return "Trung bình"
    return "Cạnh tranh gắt"


def _map_item(row: Dict[str, Any]) -> Dict[str, Any]:
    split = "sold_all" in row or "sold_window_30d" in row or "gmv_all" in row
    sold_all = _int(row.get("sold_all")) if split else None
    sold_window = _int(row.get("sold_window_30d")) if split else None
    gmv_all = _int(row.get("gmv_all")) if split else None
    gmv_window = _int(row.get("gmv_window_30d")) if split else None
    if split:
        sold = sold_all if sold_all is not None else int(row.get("sold_30d") or 0)
        gmv = gmv_all if gmv_all is not None else int(row.get("gmv_30d_vnd") or 0)
    else:
        sold = int(row.get("sold_30d") or 0)
        gmv = int(row.get("gmv_30d_vnd") or 0)
        sold_window = sold
        gmv_window = gmv
    rating = _float(row.get("rating"))
    return {
        "title": str(row.get("title") or ""),
        "image_url": str(row.get("image_url") or ""),
        "price_vnd": int(row.get("price_vnd") or 0),
        "price_min_vnd": _int(row.get("price_min_vnd")),
        "price_max_vnd": _int(row.get("price_max_vnd")),
        "price_cv": _float(row.get("price_cv")),
        "sold": sold,
        "sold_7d": _int(row.get("sold_7d")),
        "sold_30d": sold_window,
        "sold_all": sold_all,
        "gmv_vnd": gmv,
        "gmv_30d_vnd": gmv_window,
        "gmv_all_vnd": gmv_all,
        "shop_name": str(row.get("shop_name") or ""),
        "shop_id": str(row.get("shop_id") or ""),
        "shop_url": str(row.get("shop_url") or ""),
        "rating": rating,
        "url": str(row.get("url") or ""),
        "is_mall": bool(row.get("is_mall")),
        "is_gift": bool(row.get("is_gift")),
        "commission_pct": row.get("commission_pct"),
        "item_id": str(row.get("item_id") or ""),
        "days_tracked": _int(row.get("days_tracked")),
        "growth": _float(row.get("growth")),
    }


def _window_all_time(market: Dict[str, Any]) -> Dict[str, Any]:
    score = _float(market.get("blueOceanScore"))
    return {
        "label": "Tích lũy toàn bộ món đã thu thập",
        "sp_count": _int(market.get("totalProducts")) or 0,
        "shop_count": _int(market.get("totalShops")) or 0,
        "total_sold": _int(market.get("totalSold")) or 0,
        "total_revenue_vnd": _int(market.get("totalRevenue")) or 0,
        "avg_price_vnd": _int(market.get("avgPrice")) or 0,
        "min_price_vnd": _int(market.get("minPrice")) or 0,
        "max_price_vnd": _int(market.get("maxPrice")) or 0,
        "products_with_sales": _int(market.get("productsWithSales")) or 0,
        "sell_through_pct": _rate_percent(market.get("sellThroughRate")) or 0,
        "hhi": round(_float(market.get("hhi")) or 0, 4),
        "blue_ocean_score": round(score, 1) if score is not None else 0,
        "avg_commission_pct": _pct_points(market.get("avgCommissionRate")),
        "max_commission_pct": _pct_points(market.get("maxCommissionRate")),
    }


def _window_30d(block: Any) -> Dict[str, Any]:
    if not isinstance(block, dict):
        return {}
    sold = _int(block.get("totalSold"))
    revenue = _int(block.get("totalRevenue"))
    if sold is None and revenue is None:
        return {}
    coverage = _rate_percent(block.get("coverage"))
    return {
        "label": "Khoảng 30 ngày, chỉ món có ít nhất 8 ngày lịch sử",
        "total_sold": sold or 0,
        "total_revenue_vnd": revenue or 0,
        "tracked_products": _int(block.get("trackedProducts")) or 0,
        "coverage_pct": coverage or 0,
        "note": "Nhịp này không phải tháng lịch trong câu hỏi.",
    }


def _gifts(block: Any) -> Dict[str, Any]:
    if not isinstance(block, dict):
        return {}
    products = _int(block.get("products"))
    revenue = _int(block.get("revenue"))
    if products is None and revenue is None:
        return {}
    return {"products": products or 0, "revenue_vnd": revenue or 0, "note": str(block.get("note") or "")}


def _top_shops(rows: Any, items: List[Dict[str, Any]], revenue_total: int) -> List[Dict[str, Any]]:
    if not isinstance(rows, list):
        return []
    names = {str(item.get("shop_id") or ""): item for item in items}
    shops: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        shop_id = str(row.get("shopId") or row.get("shop_id") or "")
        if not shop_id:
            continue
        revenue = _int(row.get("revenue")) or 0
        known = names.get(shop_id) or {}
        share = round((revenue / revenue_total) * 100.0, 1) if revenue_total else 0
        shops.append(
            {
                "shop_id": shop_id,
                "shop_name": str(known.get("shop_name") or ""),
                "shop_url": str(known.get("shop_url") or (f"https://shopee.vn/shop/{shop_id}" if shop_id.isdigit() else "")),
                "revenue_vnd": revenue,
                "product_count": _int(row.get("products")) or 0,
                "share_pct": share,
            }
        )
    return shops


def _source_note(text: Any) -> str:
    raw = str(text or "").strip()
    if not raw:
        return ""
    folded = raw.lower()
    if "crawled" in folded or "under-estimate" in folded or "underestimate" in folded:
        return "Nguồn là dữ liệu đã thu thập, không phải toàn bộ sàn. Lượt bán có thể thấp hơn thực tế vì không phải món nào cũng có số bán."
    return raw


def empty_sample(name: str, platform: str, error: str) -> Dict[str, Any]:
    return {
        "name": name,
        "platform": platform,
        "mode": "error",
        "scope": "sample",
        "sp_count": 0,
        "shop_count": 0,
        "total_sold": 0,
        "total_revenue_vnd": 0,
        "avg_price_vnd": 0,
        "min_price_vnd": 0,
        "max_price_vnd": 0,
        "sweet_spot_label": "",
        "hhi": 0.0,
        "blue_ocean_score": 0,
        "blue_ocean_label": "",
        "avg_commission_pct": None,
        "max_commission_pct": None,
        "sell_through_pct": None,
        "products_with_sales": 0,
        "window_all_time": {},
        "window_tracked_30d": {},
        "gifts_excluded": {},
        "source_note": "",
        "sample_note": "",
        "top_shops": [],
        "detail_items": [],
        "error": error or "Chưa lấy được số.",
        "items": [],
        "price_bins": [],
    }


def build_floor_sample(name: str, platform: str, result: Dict[str, Any]) -> Dict[str, Any]:
    if not result or not result.get("ok"):
        return empty_sample(name, platform, str((result or {}).get("summary") or "Chưa lấy được số."))
    data = result.get("data") if isinstance(result.get("data"), dict) else {}
    raw_items = data.get("items") if isinstance(data.get("items"), list) else []
    items = [_map_item(row) for row in raw_items if isinstance(row, dict)]
    mode = str(result.get("mode") or "sandbox")
    metrics = _compute_market_overview_metrics(
        raw_items,
        platform_key=platform,
        mode=mode,
        provider=str(result.get("provider") or ""),
    )
    summary = data.get("market_summary") if isinstance(data.get("market_summary"), dict) else {}
    market = summary.get("market") if isinstance(summary.get("market"), dict) else {}
    window = _window_all_time(market) if market else {}
    tracked = _window_30d(summary.get("last30Days"))
    gifts = _gifts(summary.get("giftsExcluded"))
    scope = "sample"
    sweet = ""
    bins = metrics.get("price_bins_6") if isinstance(metrics.get("price_bins_6"), list) else []
    for band in bins:
        if isinstance(band, dict) and band.get("is_sweet_spot"):
            sweet = str(band.get("label") or "")
            break
    headline = {
        "sp_count": int(metrics.get("sp_count") or 0),
        "shop_count": int(metrics.get("shop_count") or 0),
        "total_sold": int(metrics.get("total_sold") or 0),
        "total_revenue_vnd": int(metrics.get("total_revenue_vnd") or 0),
        "avg_price_vnd": int(metrics.get("avg_price_vnd") or 0),
        "min_price_vnd": int(metrics.get("min_price_vnd") or 0),
        "max_price_vnd": int(metrics.get("max_price_vnd") or 0),
        "hhi": round(float(metrics.get("hhi") or 0), 4),
        "blue_ocean_score": float(metrics.get("blue_ocean_score") or 0),
        "blue_ocean_label": str(metrics.get("blue_ocean_label") or ""),
        "avg_commission_pct": metrics.get("avg_commission_pct"),
        "sell_through_pct": metrics.get("sell_through_pct"),
        "products_with_sales": int(metrics.get("products_with_sales") or 0),
        "sweet_spot_label": sweet,
        "sample_note": "Số trong mục danh sách là của danh sách đang xem, không phải toàn bộ món trên sàn.",
    }
    if platform == "shopee" and mode == "live" and window and (window["total_sold"] or window["total_revenue_vnd"]):
        scope = "market_block"
        headline.update(
            {
                "sp_count": window["sp_count"],
                "shop_count": window["shop_count"],
                "total_sold": window["total_sold"],
                "total_revenue_vnd": window["total_revenue_vnd"],
                "avg_price_vnd": window["avg_price_vnd"],
                "min_price_vnd": window["min_price_vnd"],
                "max_price_vnd": window["max_price_vnd"],
                "hhi": window["hhi"],
                "blue_ocean_score": window["blue_ocean_score"],
                "blue_ocean_label": _ocean_label(float(window["blue_ocean_score"])),
                "avg_commission_pct": window["avg_commission_pct"],
                "sell_through_pct": window["sell_through_pct"],
                "products_with_sales": window["products_with_sales"],
                "sweet_spot_label": "",
            }
        )
    return {
        "name": name,
        "platform": platform,
        "mode": mode,
        "scope": scope,
        **headline,
        "max_commission_pct": window.get("max_commission_pct") if window else None,
        "window_all_time": window if scope == "market_block" else {},
        "window_tracked_30d": tracked,
        "gifts_excluded": gifts,
        "source_note": _source_note(summary.get("scopeNote")),
        "top_shops": _top_shops(summary.get("topShops"), items, int(headline["total_revenue_vnd"])),
        "detail_items": [],
        "error": "",
        "items": items,
        "price_bins": bins,
        "list_truncated": bool(data.get("list_truncated")),
    }
