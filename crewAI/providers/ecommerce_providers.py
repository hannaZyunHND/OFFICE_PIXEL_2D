"""
E-Commerce Market Intelligence External Tools for Product Hunter Crew:
- Shopee (Sàn Cam): AddLiveTag API (`data.addlivetag.com`)
- Lazada (Sàn Xanh): Apify Free-Tier Actor (`memo23~lazada-scraper`)
- TikTok Shop (Sàn Đen): Apify Pay-Per-Event Actor (`pro100chok~tiktok-shop-scraper-usage`)
- Cross-Platform Search Signal: Serper.dev Google Search (`gl=vn`, `hl=vi`)
- Unit Economics Calculator: Net profit & margin across Shopee / Lazada / TikTok Shop

Every invocation attaches a full sanitized Request/Response & Data-Processing trace
(`trace`) so developers can inspect exact payloads, masked endpoints, raw samples,
and transformation rules inside Tab 5 ("Logs Request / Response").
"""

from __future__ import annotations

import hashlib
import json
import os
import random
from typing import Any, Dict, List, Optional, Tuple
import urllib.error
import urllib.parse
import urllib.request

from env_loader import load_project_dotenv
from tool_registry import DEFAULT_TOOL_REGISTRY

load_project_dotenv()


PLATFORM_API_CAPABILITIES: Dict[str, Dict[str, str]] = {
    "all": {
        "sp_count": "ok",
        "shop_count": "ok",
        "total_sold": "ok",
        "total_revenue": "ok",
        "avg_price": "ok",
        "price_range": "ok",
        "sell_through": "ok",
        "hhi": "ok",
        "avg_commission": "ok",
        "history_30d": "ok",
        "koc_creators": "ok",
        "video_live_split": "partial",
        "keyword_search_volume": "(API đang phát triển)",
    },
    "shopee": {
        "sp_count": "ok",
        "shop_count": "ok",
        "total_sold": "ok",
        "total_revenue": "ok",
        "avg_price": "ok",
        "price_range": "ok",
        "sell_through": "ok",
        "hhi": "ok",
        "avg_commission": "ok",
        "history_30d": "ok",
        "koc_creators": "(API đang phát triển)",
        "video_live_split": "(API đang phát triển)",
        "keyword_search_volume": "(API đang phát triển)",
    },
    "lazada": {
        "sp_count": "ok",
        "shop_count": "ok",
        "total_sold": "ok",
        "total_revenue": "ok",
        "avg_price": "ok",
        "price_range": "ok",
        "sell_through": "ok",
        "hhi": "ok",
        "avg_commission": "(API đang phát triển)",
        "history_30d": "(API đang phát triển)",
        "koc_creators": "(API đang phát triển)",
        "video_live_split": "(API đang phát triển)",
        "keyword_search_volume": "(API đang phát triển)",
    },
    "tiktok_shop": {
        "sp_count": "ok",
        "shop_count": "ok",
        "total_sold": "ok",
        "total_revenue": "ok",
        "avg_price": "ok",
        "price_range": "ok",
        "sell_through": "ok",
        "hhi": "ok",
        "avg_commission": "ok",
        "history_30d": "(API đang phát triển)",
        "koc_creators": "ok",
        "video_live_split": "ok",
        "keyword_search_volume": "(API đang phát triển)",
    },
}


def get_platform_capabilities(platform: str) -> Dict[str, str]:
    return dict(PLATFORM_API_CAPABILITIES.get(platform, PLATFORM_API_CAPABILITIES["all"]))


def _mask_secret(secret: str) -> str:
    clean = secret.strip()
    if not clean:
        return "(none)"
    if len(clean) <= 6:
        return "***"
    return f"{clean[:2]}***{clean[-4:]}"


def _make_trace(
    *,
    method: str,
    url_masked: str,
    headers_masked: Dict[str, str],
    request_payload: Any,
    http_status: int | str,
    raw_response_sample: Any,
    records_received: int,
    processing_steps: List[str],
    warning: str = "",
) -> Dict[str, Any]:
    return {
        "request": {
            "method": method,
            "url": url_masked,
            "headers": headers_masked,
            "payload": request_payload,
        },
        "response": {
            "http_status": http_status,
            "records_received": records_received,
            "warning": warning,
            "raw_sample": raw_response_sample,
        },
        "processing_steps": processing_steps,
    }


def _resolve_secret(extras: Dict[str, Any], extras_key: str, env_key: str) -> str:
    val = str(extras.get(extras_key) or "").strip()
    if val:
        return val
    return os.environ.get(env_key, "").strip()


def _allow_fallback(extras: Dict[str, Any]) -> bool:
    flag = extras.get("allowSandboxFallback")
    return True if flag is None else bool(flag)


def _parse_price_vnd(raw: Any, default: int = 0) -> int:
    """Parses integer/float VND prices cleanly (e.g. 88000, '₫88,000', '112670.00')."""
    if raw is None or isinstance(raw, bool):
        return default
    if isinstance(raw, (int, float)):
        return int(round(raw))
    s = str(raw).strip()
    if not s:
        return default
    # Handle plain decimal numeric strings like "112670.00" without inflating cents
    try:
        if all(ch.isdigit() or ch == "." for ch in s) and s.count(".") == 1 and len(s.split(".")[1]) <= 2:
            return int(round(float(s)))
    except ValueError:
        pass
    digits = "".join(ch for ch in s if ch.isdigit())
    return int(digits) if digits else default


def _parse_sold_count(raw: Any, default: int = 0) -> int:
    """Parses sold counters including '494 sold', '1.2K sold', '2,5k', or integers."""
    if raw is None or isinstance(raw, bool):
        return default
    if isinstance(raw, (int, float)):
        return max(0, int(round(raw)))
    s = str(raw).strip().lower()
    if not s:
        return default
    import re
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*([km])?\b", s)
    if not m:
        digits = "".join(ch for ch in s if ch.isdigit())
        return int(digits) if digits else default
    num_str = m.group(1)
    suffix = m.group(2)
    if suffix == "k":
        return int(round(float(num_str.replace(",", ".")) * 1000))
    if suffix == "m":
        return int(round(float(num_str.replace(",", ".")) * 1_000_000))
    # Vietnamese thousands separator e.g. "1.200" when followed by 3 digits without k/m
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", num_str):
        return int(num_str.replace(".", "").replace(",", ""))
    return int(round(float(num_str.replace(",", "."))))


def _to_commission_pct(raw: Any) -> Optional[float]:
    """Converts AddLiveTag decimal fraction (0.025 -> 2.5%) or percentage number cleanly."""
    if raw is None or isinstance(raw, bool):
        return None
    try:
        if isinstance(raw, str):
            raw = raw.replace("%", "").strip()
            if not raw:
                return None
        val = float(raw)
        if val <= 0:
            return 0.0
        return round(val * 100.0, 2) if val < 1.0 else round(val, 2)
    except (TypeError, ValueError):
        return None


def _http_json_request(
    url: str,
    *,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 22,
) -> Tuple[bool, int, Any, str]:
    req_headers = {
        "Accept": "application/json",
        "User-Agent": "PixelAgentOffice-ProductHunter/1.0",
        **(headers or {}),
    }
    body_bytes: Optional[bytes] = None
    if payload is not None:
        req_headers.setdefault("Content-Type", "application/json")
        body_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            raw_text = resp.read().decode("utf-8", errors="replace")
            return True, status, json.loads(raw_text) if raw_text.strip() else {}, ""
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:260]
        return False, int(err.code or 500), None, f"HTTP {err.code}: {detail or err.reason}"
    except Exception as exc:
        return False, 0, None, str(exc)


def _infer_keyword_price_band(keyword: str) -> Tuple[int, int, str]:
    lower = keyword.lower()
    if any(k in lower for k in ("ghế", "bàn", "nệm", "tủ", "máy lọc", "robot", "xe")):
        return (490_000, 1_850_000, "Nội thất / Thiết bị cỡ vừa-lớn")
    if any(k in lower for k in ("máy xay", "nồi", "bếp", "máy hút", "quạt", "tai nghe", "loa")):
        return (165_000, 480_000, "Gia dụng nhỏ / Tech tiêu dùng")
    if any(k in lower for k in ("serum", "kem", "son", "mỹ phẩm", "sữa rửa mặt", "chống nắng")):
        return (110_000, 360_000, "Chăm sóc cá nhân / Làm đẹp")
    if any(k in lower for k in ("khăn", "giấy", "tã", "bỉm", "vớ", "tất", "ốp", "cáp")):
        return (29_000, 260_000, "Hàng tiêu dùng / Phụ kiện quay vòng nhanh")
    return (89_000, 320_000, "Hàng tiêu dùng phổ thông")


def _build_sandbox_items(keyword: str, platform: str, count: int) -> List[Dict[str, Any]]:
    seed = int(hashlib.sha256(f"{platform}:{keyword.lower()}".encode("utf-8")).hexdigest()[:12], 16)
    rng = random.Random(seed)
    low_p, high_p, _ = _infer_keyword_price_band(keyword)

    platform_styles = {
        "shopee": ("Shopee Mall", "Shop Yêu Thích+", "https://shopee.vn"),
        "lazada": ("LazMall", "Shop Uy Tín Lazada", "https://www.lazada.vn"),
        "tiktok_shop": ("TikTok Mall", "Creator Hot Shop", "https://shop.tiktok.com"),
    }
    mall_label, regular_label, base_url = platform_styles.get(
        platform, ("Mall", "Shop Thường", "https://example.com")
    )

    variants = [
        "Thùng Tiết Kiệm Gia Đình",
        "Combo 10 Gói Dùng Thử",
        "Bản Cao Cấp Chính Hãng",
        "Set Tiện Lợi Mini",
        "Phiên Bản Nội Địa Cao Cấp",
        "Combo Kèm Quà Độc Quyền",
        "Mẫu Bán Chạy Top Tuần",
        "Phiên Bản Không Hương Liệu",
    ]

    caps = get_platform_capabilities(platform)
    supports_comm = caps.get("avg_commission") == "ok"
    supports_history = caps.get("history_30d") == "ok"
    supports_koc = caps.get("koc_creators") == "ok"

    items: List[Dict[str, Any]] = []
    safe_count = max(6, min(count, 35))
    for i in range(safe_count):
        tier_factor = [0.55, 0.85, 1.0, 1.15, 1.48, 0.72, 1.25, 1.85][i % 8]
        raw_price = int(round(rng.uniform(low_p, high_p) * tier_factor / 1000.0) * 1000)
        price = max(9_000, raw_price)
        discount_pct = rng.choice([10, 15, 22, 30, 38])
        original_price = int(round(price / (1 - discount_pct / 100.0) / 1000.0) * 1000)

        is_gift = i == safe_count - 1 and count >= 12
        has_sales = (i < max(3, int(safe_count * 0.65))) and not is_gift
        if is_gift:
            price = 1_000
            sold_30d = 0
        elif has_sales:
            weight = 2.8 if i < 2 else (1.4 if i < 5 else 0.45)
            base_sold = rng.randint(25, 950) if platform != "lazada" else rng.randint(15, 520)
            sold_30d = max(1, int(base_sold * weight))
        else:
            sold_30d = 0

        has_history_30d = (i % 3 == 0 or i < 4) if supports_history else None
        is_mall = i % 4 == 0 if platform == "lazada" else (i == 0 or i % 5 == 0)
        rating = round(rng.uniform(4.35, 4.95), 2)
        koc_count = rng.randint(12, 190) if supports_koc else None
        comm_rate = round(rng.uniform(4.5, 16.5), 1) if supports_comm else None
        shop_idx = (i // 2) + 1 if i > 4 else i + 1

        items.append(
            {
                "item_id": f"{platform[:3]}_{seed % 100000}_{i + 1}",
                "title": (
                    f"[Quà tặng] Mẫu dùng thử kèm {keyword.strip()}"
                    if is_gift
                    else f"{keyword.strip().title()} — {variants[i % len(variants)]}"
                ),
                "platform": platform,
                "shop_id": f"shop_{platform[:3]}_{shop_idx}",
                "shop_name": f"{mall_label if is_mall else regular_label} #{shop_idx}",
                "is_mall": is_mall,
                "is_gift": is_gift,
                "has_history_30d": has_history_30d,
                "price_vnd": price,
                "original_price_vnd": original_price,
                "discount_pct": discount_pct,
                "sold_30d": sold_30d,
                "gmv_30d_vnd": price * sold_30d,
                "rating": rating,
                "review_count": max(0, int(sold_30d * rng.uniform(0.18, 0.35))),
                "commission_pct": comm_rate,
                "koc_creators_count": koc_count,
                "url": f"{base_url}/search?keyword={urllib.parse.quote(keyword)}",
            }
        )
    return items


@DEFAULT_TOOL_REGISTRY.tool(
    name="addlivetag_market_search",
    provider="AddLiveTag API (Sàn Cam / Shopee)",
    description="Tra cứu bức tranh thị trường Shopee theo từ khóa qua data.addlivetag.com/search/market.php (tổng lượt bán, doanh thu, HHI, điểm đại dương xanh, hoa hồng).",
    cost_tier="free",
    estimated_cost_usd=0.0,
    requires_hitl=False,
    tags=["shopee", "market", "addlivetag"],
    parameters_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "price_min": {"type": "integer"},
            "sort": {"type": "string"},
            "max_items": {"type": "integer"},
        },
        "required": ["query"],
    },
)
def addlivetag_market_search(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    query = str(args.get("query") or "").strip()
    price_min = int(args.get("price_min") or 0)
    sort = str(args.get("sort") or "revenue")
    max_items = int(args.get("max_items") or 20)
    api_key = _resolve_secret(extras, "addlivetagApiKey", "ADDLIVETAG_API_KEY")

    params: Dict[str, Any] = {"q": query, "sort": sort}
    if price_min > 0:
        params["price_min"] = price_min
    url = f"https://data.addlivetag.com/search/market.php?{urllib.parse.urlencode(params)}"
    headers_masked = {"X-API-Key": _mask_secret(api_key)}

    warning = ""
    http_status: int | str = "NOT_SENT (No API Key)"
    raw_sample: Any = None

    if api_key:
        ok, status, payload, err_msg = _http_json_request(
            url, headers={"X-API-Key": api_key}
        )
        http_status = status
        raw_sample = payload if isinstance(payload, dict) else str(payload)[:400]
        if ok and isinstance(payload, dict):
            raw_items = (
                payload.get("products")
                or payload.get("items")
                or (payload.get("data", {}).get("items") if isinstance(payload.get("data"), dict) else payload.get("data"))
                or []
            )
            if isinstance(raw_items, list) and len(raw_items) > 0:
                normalized: List[Dict[str, Any]] = []
                for idx, row in enumerate(raw_items[:max_items]):
                    if not isinstance(row, dict):
                        continue
                    price = _parse_price_vnd(row.get("price") or row.get("price_vnd"), 0)
                    raw_sold = (
                        row.get("sales")
                        if row.get("sales") is not None
                        else (
                            row.get("sold")
                            if row.get("sold") is not None
                            else (row.get("sold_30d") if row.get("sold_30d") is not None else row.get("sold30d"))
                        )
                    )
                    sold = _parse_sold_count(raw_sold, 0)
                    raw_rev = (
                        row.get("revenueAll")
                        if row.get("revenueAll") is not None
                        else (row.get("revenue") if row.get("revenue") is not None else row.get("revenue30d"))
                    )
                    gmv = _parse_price_vnd(raw_rev, price * sold) if raw_rev is not None else price * sold
                    title_txt = str(row.get("productName") or row.get("name") or row.get("title") or query)
                    is_gift = bool(row.get("is_gift")) or (0 < price <= 2000) or ("quà tặng" in title_txt.lower())
                    shop_name = str(
                        row.get("shopName")
                        or row.get("shop_name")
                        or row.get("shop_location")
                        or f"Shopee Seller #{idx + 1}"
                    )
                    comm_raw = (
                        row.get("commissionRate")
                        if row.get("commissionRate") is not None
                        else (row.get("comm_rate") if row.get("comm_rate") is not None else row.get("commission_pct"))
                    )
                    comm_pct = _to_commission_pct(comm_raw)
                    has_hist = (
                        int(row.get("daysTracked") or 0) >= 8
                        if "daysTracked" in row
                        else bool(row.get("has_history_30d", True))
                    )
                    normalized.append(
                        {
                            "item_id": str(row.get("itemId") or row.get("item_id") or row.get("itemid") or f"shp_{idx + 1}"),
                            "title": title_txt,
                            "platform": "shopee",
                            "shop_id": str(row.get("shopId") or row.get("shop_id") or row.get("shopid") or shop_name),
                            "shop_name": shop_name,
                            "is_mall": bool(row.get("is_official_shop") or row.get("is_mall") or "official" in shop_name.lower() or "mall" in shop_name.lower()),
                            "is_gift": is_gift,
                            "has_history_30d": has_hist,
                            "days_tracked": row.get("daysTracked"),
                            "price_vnd": price,
                            "sold_30d": sold,
                            "gmv_30d_vnd": gmv,
                            "rating": float(row.get("rating") or row.get("rating_star") or 4.7),
                            "commission_pct": comm_pct,
                            "koc_creators_count": None,
                            "url": str(row.get("productLink") or row.get("url") or f"https://shopee.vn/search?keyword={urllib.parse.quote(query)}"),
                        }
                    )
                if normalized:
                    market_summary = {
                        "market": payload.get("market"),
                        "last30Days": payload.get("last30Days"),
                        "giftsExcluded": payload.get("giftsExcluded"),
                        "scopeNote": payload.get("scopeNote"),
                    }
                    trimmed_sample = {
                        "keys": list(payload.keys()),
                        "market": payload.get("market"),
                        "last30Days": payload.get("last30Days"),
                        "total_raw_items": len(raw_items),
                        "sample_items": raw_items[:2],
                    }
                    return {
                        "ok": True,
                        "mode": "live",
                        "provider": "AddLiveTag Market API (LIVE)",
                        "summary": f"Đã lấy {len(normalized)} SKU thật từ AddLiveTag cho '{query}'",
                        "data": {
                            "platform": "shopee",
                            "capabilities": get_platform_capabilities("shopee"),
                            "market_summary": market_summary,
                            "items": normalized,
                        },
                        "trace": _make_trace(
                            method="GET",
                            url_masked=url,
                            headers_masked=headers_masked,
                            request_payload=params,
                            http_status=status,
                            raw_response_sample=trimmed_sample,
                            records_received=len(raw_items),
                            processing_steps=[
                                f"1. Bóc danh sách sản phẩm thật từ payload['products'] ({len(raw_items)} bản ghi, lấy {len(normalized)} SKU) + block market/last30Days.",
                                "2. Chuẩn hóa camelCase Shopee: itemId, productName, shopId, shopName, price, sales -> sold_30d, revenueAll -> gmv_30d_vnd, commissionRate*100 -> commission_pct (%).",
                                "3. Độ phủ lịch sử 30d đánh giá theo quy tắc AddLiveTag (`daysTracked >= 8`); quà tặng <= 2.000đ tách khỏi Giá trung bình.",
                                "4. KOC/Creator & phân tách Video/Live nội sàn chưa có trên endpoint search -> gắn cờ (API đang phát triển).",
                            ],
                        ),
                    }
        warning = f"AddLiveTag API không trả dữ liệu trực tiếp ({err_msg or 'empty response'}); đã chuyển Sandbox."
    else:
        warning = "Chưa cấu hình ADDLIVETAG_API_KEY; dùng dữ liệu mô phỏng Sandbox chuẩn schema."

    if not _allow_fallback(extras):
        return {
            "ok": False,
            "mode": "error",
            "provider": "AddLiveTag API",
            "summary": warning,
            "data": {"platform": "shopee", "items": [], "capabilities": get_platform_capabilities("shopee")},
        }

    items = _build_sandbox_items(query, "shopee", max_items)
    return {
        "ok": True,
        "mode": "sandbox",
        "provider": "AddLiveTag Adapter (Sandbox)",
        "warning": warning,
        "summary": f"Mô phỏng {len(items)} SKU Shopee (tổng {sum(i['sold_30d'] for i in items):,} lượt bán 30 ngày)",
        "data": {
            "platform": "shopee",
            "capabilities": get_platform_capabilities("shopee"),
            "items": items,
        },
        "trace": _make_trace(
            method="GET",
            url_masked=url,
            headers_masked=headers_masked,
            request_payload=params,
            http_status=http_status,
            raw_response_sample={"sandbox_sample": items[:2], "live_attempt_response": raw_sample},
            records_received=len(items),
            warning=warning,
            processing_steps=[
                "1. Không nhận được payload live -> kích hoạt _build_sandbox_items(keyword, 'shopee') theo heuristic dải giá ngành hàng.",
                "2. Phân phối lượt bán dạng Long-tail (top SKU chiếm tỷ trọng lớn, ~35% SKU có sold_30d=0) để phản ánh đúng Tỷ lệ có bán & HHI.",
                "3. Đánh dấu is_gift=True cho SKU mẫu tặng kèm giá <= 2.000đ để test bộ lọc Quà tặng.",
                "4. Gán cờ (API đang phát triển) cho chỉ số Video/Livestream & số lượng KOC trên Sàn Cam.",
            ],
        ),
    }


@DEFAULT_TOOL_REGISTRY.tool(
    name="addlivetag_product_batch",
    provider="AddLiveTag Batch API (Sàn Cam / Shopee)",
    description="Truy vấn chi tiết giá, tỷ lệ hoa hồng affiliate và lịch sử biến động cho danh sách SKU Shopee.",
    cost_tier="free",
    estimated_cost_usd=0.0,
    requires_hitl=False,
    tags=["shopee", "commission", "batch"],
    parameters_schema={
        "type": "object",
        "properties": {
            "item_ids": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["item_ids"],
    },
)
def addlivetag_product_batch(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    item_ids = [str(x).strip() for x in (args.get("item_ids") or [])[:20] if str(x).strip()]
    req_item_ids: List[int | str] = [int(x) if x.isdigit() else x for x in item_ids]
    api_key = _resolve_secret(extras, "addlivetagApiKey", "ADDLIVETAG_API_KEY")
    url = "https://data.addlivetag.com/product-data/product-data-batch.php"
    headers_masked = {"X-API-Key": _mask_secret(api_key)}

    warning = ""
    http_status: int | str = "NOT_SENT (No API Key)"
    if api_key and req_item_ids:
        ok, status, payload, err_msg = _http_json_request(
            url,
            method="POST",
            headers={"X-API-Key": api_key},
            payload={"itemIds": req_item_ids},
        )
        http_status = status
        if ok and isinstance(payload, dict):
            rows = payload.get("products") or payload.get("data") or payload.get("items") or []
            if isinstance(rows, list) and rows:
                parsed_rows: List[Dict[str, Any]] = []
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    info = row.get("productInfo") if isinstance(row.get("productInfo"), dict) else row
                    parsed_rows.append(
                        {
                            "item_id": str(row.get("itemId") or info.get("itemId") or row.get("input") or ""),
                            "product_name": info.get("productName") or info.get("name"),
                            "cat_name": info.get("catName"),
                            "price_vnd": _parse_price_vnd(info.get("price"), 0),
                            "sales": _parse_sold_count(info.get("sales"), 0),
                            "shopee_commission_pct": float(info.get("shopeeRatePercent") or 0.0),
                            "seller_commission_pct": float(info.get("sellerRatePercent") or 0.0),
                            "total_commission_pct": float(info.get("totalRatePercent") or 0.0),
                            "is_xtra": bool(info.get("isXtra")),
                            "cap_vnd": info.get("cap"),
                            "data_source": row.get("dataSource"),
                        }
                    )
                return {
                    "ok": True,
                    "mode": "live",
                    "provider": "AddLiveTag Batch API (LIVE)",
                    "summary": f"Đã lấy batch {len(parsed_rows)} SKU Shopee thật (hoa hồng Seller/Shopee & ngành hàng)",
                    "data": {"items": parsed_rows},
                    "trace": _make_trace(
                        method="POST",
                        url_masked=url,
                        headers_masked=headers_masked,
                        request_payload={"itemIds": req_item_ids},
                        http_status=status,
                        raw_response_sample=parsed_rows[:2],
                        records_received=len(parsed_rows),
                        processing_steps=[
                            f"1. Gửi mảng itemIds ({len(req_item_ids)} SKU) lên product-data-batch.php trong 1 HTTP POST.",
                            "2. Bóc `productInfo` từ `payload['products']`: shopeeRatePercent, sellerRatePercent, totalRatePercent, isXtra, catName, cap.",
                        ],
                    ),
                }
        warning = f"Batch API fallback ({err_msg or 'empty'})"
    else:
        warning = "Chưa có ADDLIVETAG_API_KEY; dùng phân tích hoa hồng mô phỏng."

    enriched = [
        {
            "item_id": iid,
            "seller_commission_pct": round(6.5 + (idx % 5) * 2.1, 1),
            "xtra_commission_pct": 4.0 if idx % 2 == 0 else 1.5,
            "price_trend_30d": "stable" if idx % 2 == 0 else "slight_discount",
        }
        for idx, iid in enumerate(item_ids)
    ]
    return {
        "ok": True,
        "mode": "sandbox",
        "provider": "AddLiveTag Batch (Sandbox)",
        "warning": warning,
        "summary": f"Ước lượng hoa hồng & xu hướng giá cho {len(enriched)} SKU",
        "data": {"items": enriched},
        "trace": _make_trace(
            method="POST",
            url_masked=url,
            headers_masked=headers_masked,
            request_payload={"item_ids": item_ids},
            http_status=http_status,
            raw_response_sample=enriched[:2],
            records_received=len(enriched),
            warning=warning,
            processing_steps=[
                "1. Tổng hợp chi tiết hoa hồng seller & hoa hồng Xtra cho nhóm SKU top đầu.",
            ],
        ),
    }


@DEFAULT_TOOL_REGISTRY.tool(
    name="apify_lazada_search",
    provider="Apify Lazada Actor (Sàn Xanh / Lazada)",
    description="Cào danh sách sản phẩm Lazada theo từ khóa (LazMall, giá niêm yết vs Flash Sale, đánh giá). Tiêu tốn credit Apify ($5 free/tháng).",
    cost_tier="credit",
    estimated_cost_usd=0.04,
    requires_hitl=True,
    tags=["lazada", "apify"],
    parameters_schema={
        "type": "object",
        "properties": {
            "keyword": {"type": "string"},
            "max_items": {"type": "integer"},
        },
        "required": ["keyword"],
    },
)
def apify_lazada_search(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    keyword = str(args.get("keyword") or "").strip()
    max_items = max(3, min(int(args.get("max_items") or 20), 50))
    token = _resolve_secret(extras, "apifyApiToken", "APIFY_API_TOKEN")
    actor_id = os.environ.get("APIFY_LAZADA_ACTOR", "memo23~lazada-scraper")
    masked_url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={_mask_secret(token)}&limit={max_items}"
    req_body = {
        "searchQueries": [keyword],
        "country": "vn",
        "maxItems": max_items,
        "scrapeDetails": False,
    }

    warning = ""
    http_status: int | str = "NOT_SENT (No Token)"
    raw_sample: Any = None
    if token:
        url = (
            f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
            f"?token={urllib.parse.quote(token)}&limit={max_items}"
        )
        ok, status, payload, err_msg = _http_json_request(
            url, method="POST", payload=req_body, timeout=65
        )
        http_status = status
        raw_sample = payload[:2] if isinstance(payload, list) else str(payload)[:400]
        if ok and isinstance(payload, list) and len(payload) > 0:
            items: List[Dict[str, Any]] = []
            for idx, row in enumerate(payload[:max_items]):
                if not isinstance(row, dict):
                    continue
                raw_price = (
                    row.get("priceValue")
                    if row.get("priceValue") is not None
                    else (row.get("price") or row.get("priceShow"))
                )
                price = _parse_price_vnd(raw_price, 210_000)
                raw_sold = (
                    row.get("soldCount")
                    if row.get("soldCount") is not None
                    else row.get("itemSoldCntShow")
                )
                sold = _parse_sold_count(raw_sold, 0)
                sname = str(row.get("sellerName") or f"Lazada Seller #{idx + 1}")
                title_txt = str(row.get("name") or row.get("title") or keyword)
                shop_badge = str(row.get("shopBadge") or row.get("badge") or "").lower()
                items.append(
                    {
                        "item_id": str(row.get("itemId") or f"laz_{idx + 1}"),
                        "title": title_txt,
                        "platform": "lazada",
                        "shop_id": str(row.get("sellerId") or sname),
                        "shop_name": sname,
                        "is_mall": bool(
                            row.get("isLazMall")
                            or "lazmall" in shop_badge
                            or "mall" in sname.lower()
                            or "official" in sname.lower()
                        ),
                        "is_gift": (0 < price <= 2000) or ("quà tặng" in title_txt.lower()),
                        "has_history_30d": None,
                        "price_vnd": price,
                        "sold_30d": sold,
                        "gmv_30d_vnd": price * sold,
                        "rating": round(float(row.get("ratingScore") or 4.6), 2),
                        "review_count": int(row.get("reviewCount") or 0),
                        "commission_pct": None,
                        "koc_creators_count": None,
                        "url": str(row.get("productUrl") or f"https://www.lazada.vn/catalog/?q={urllib.parse.quote(keyword)}"),
                    }
                )
            if items:
                return {
                    "ok": True,
                    "mode": "live",
                    "provider": f"Apify Lazada Scraper ({actor_id} · LIVE)",
                    "summary": f"Đã lấy {len(items)} SKU Lazada thật từ Apify (tổng {sum(i['sold_30d'] for i in items):,} lượt bán)",
                    "data": {
                        "platform": "lazada",
                        "capabilities": get_platform_capabilities("lazada"),
                        "items": items,
                    },
                    "trace": _make_trace(
                        method="POST",
                        url_masked=masked_url,
                        headers_masked={"Content-Type": "application/json"},
                        request_payload=req_body,
                        http_status=status,
                        raw_response_sample=raw_sample,
                        records_received=len(payload),
                        processing_steps=[
                            f"1. Gọi đồng bộ Apify Actor `{actor_id}` (country='vn', scrapeDetails=False) nhận {len(payload)} bản ghi.",
                            "2. Đọc `priceValue` (fallback chuỗi `price`/`priceShow`) và parse `soldCount` (VD '494 sold', '1.2K sold') -> tính `gmv = price_vnd * sold`.",
                            "3. Nhận diện LazMall qua cờ `isLazMall` hoặc nhãn gian hàng Mall/Official.",
                            "4. Do Lazada Scraper chưa trả Hoa hồng Affiliate & Lịch sử 30 ngày -> gắn nhãn (API đang phát triển).",
                        ],
                    ),
                }
        warning = f"Apify Lazada không trả dữ liệu trực tiếp ({err_msg or 'empty dataset'}); chuyển Sandbox."
    else:
        warning = "Chưa cấu hình APIFY_API_TOKEN; chạy Sandbox Lazada."

    if not _allow_fallback(extras):
        return {
            "ok": False,
            "mode": "error",
            "provider": "Apify Lazada",
            "summary": warning,
            "data": {"platform": "lazada", "items": [], "capabilities": get_platform_capabilities("lazada")},
        }

    items = _build_sandbox_items(keyword, "lazada", max_items)
    return {
        "ok": True,
        "mode": "sandbox",
        "provider": "Apify Lazada Actor (Sandbox)",
        "warning": warning,
        "summary": f"Mô phỏng {len(items)} SKU Lazada (LazMall & giá sau mã giảm)",
        "data": {
            "platform": "lazada",
            "capabilities": get_platform_capabilities("lazada"),
            "items": items,
        },
        "trace": _make_trace(
            method="POST",
            url_masked=masked_url,
            headers_masked={"Content-Type": "application/json"},
            request_payload=req_body,
            http_status=http_status,
            raw_response_sample={"sandbox_sample": items[:2], "live_attempt_response": raw_sample},
            records_received=len(items),
            warning=warning,
            processing_steps=[
                "1. Tạo tập mẫu mô phỏng Lazada cân đối tỷ lệ LazMall (~25-35%) và giá khuyến mãi.",
                "2. Giữ `commission_pct = None` và `has_history_30d = None` để báo cáo thể hiện trung thực mục `(API đang phát triển)` cho Sàn Xanh.",
            ],
        ),
    }


@DEFAULT_TOOL_REGISTRY.tool(
    name="apify_tiktok_shop_search",
    provider="Apify TikTok Shop Actor (Sàn Đen / TikTok Shop)",
    description="Thu thập sản phẩm xu hướng trên TikTok Shop Việt Nam (GMV video/live, số lượng KOC affiliate, tỷ lệ hoa hồng).",
    cost_tier="credit",
    estimated_cost_usd=0.05,
    requires_hitl=True,
    tags=["tiktok_shop", "apify", "koc"],
    parameters_schema={
        "type": "object",
        "properties": {
            "keyword": {"type": "string"},
            "region": {"type": "string"},
            "max_items": {"type": "integer"},
        },
        "required": ["keyword"],
    },
)
def apify_tiktok_shop_search(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    keyword = str(args.get("keyword") or "").strip()
    region = str(args.get("region") or "VN")
    max_items = max(3, min(int(args.get("max_items") or 20), 50))
    token = _resolve_secret(extras, "apifyApiToken", "APIFY_API_TOKEN")
    actor_id = os.environ.get("APIFY_TIKTOK_ACTOR", "pro100chok~tiktok-shop-scraper-usage")
    masked_url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={_mask_secret(token)}&limit={max_items}"
    if "pro100chok" in actor_id:
        req_body: Dict[str, Any] = {
            "region": region.lower(),
            "scrapeType": "search",
            "searchKeywords": [keyword],
            "maxItems": max_items,
            "sortBy": "best_sellers",
        }
    else:
        req_body = {"keyword": keyword, "region": region, "limit": max_items}

    warning = ""
    http_status: int | str = "NOT_SENT (No Token)"
    raw_sample: Any = None
    if token:
        url = (
            f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
            f"?token={urllib.parse.quote(token)}&limit={max_items}"
        )
        ok, status, payload, err_msg = _http_json_request(
            url, method="POST", payload=req_body, timeout=65
        )
        http_status = status
        raw_sample = payload[:2] if isinstance(payload, list) else str(payload)[:400]
        if ok and isinstance(payload, list) and len(payload) > 0:
            items: List[Dict[str, Any]] = []
            for idx, row in enumerate(payload[:max_items]):
                if not isinstance(row, dict):
                    continue
                raw_price = (
                    row.get("currentPrice")
                    if row.get("currentPrice") is not None
                    else row.get("price")
                )
                price = _parse_price_vnd(raw_price, 180_000)
                raw_sold = (
                    row.get("salesVolume")
                    if row.get("salesVolume") is not None
                    else (row.get("soldCount") if row.get("soldCount") is not None else row.get("sales"))
                )
                sold = _parse_sold_count(raw_sold, 0)
                sname = str(row.get("sellerName") or row.get("shopName") or f"TikTok Creator Shop #{idx + 1}")
                title_txt = str(row.get("title") or row.get("name") or keyword)
                koc_raw = row.get("creatorCount")
                koc_cnt = int(koc_raw) if koc_raw is not None else None
                comm_raw = row.get("commissionRate") if row.get("commissionRate") is not None else row.get("commission")
                comm_pct = _to_commission_pct(comm_raw)
                items.append(
                    {
                        "item_id": str(row.get("productId") or f"tts_{idx + 1}"),
                        "title": title_txt,
                        "platform": "tiktok_shop",
                        "shop_id": str(row.get("shopId") or sname),
                        "shop_name": sname,
                        "is_mall": bool(row.get("isMall") or "official" in sname.lower() or "mall" in sname.lower()),
                        "is_gift": (0 < price <= 2000) or ("quà tặng" in title_txt.lower()),
                        "has_history_30d": None,
                        "price_vnd": price,
                        "sold_30d": sold,
                        "gmv_30d_vnd": price * sold,
                        "rating": round(float(row.get("rating") or 4.7), 2),
                        "review_count": _parse_sold_count(row.get("reviewCount"), 0),
                        "koc_creators_count": koc_cnt,
                        "commission_pct": comm_pct,
                        "url": str(row.get("productUrl") or "https://shop.tiktok.com"),
                    }
                )
            if items:
                caps = dict(get_platform_capabilities("tiktok_shop"))
                if not any(i.get("commission_pct") for i in items):
                    caps["avg_commission"] = "(API đang phát triển)"
                if not any(i.get("koc_creators_count") is not None for i in items):
                    caps["koc_creators"] = "(API đang phát triển)"
                    caps["video_live_split"] = "(API đang phát triển)"
                return {
                    "ok": True,
                    "mode": "live",
                    "provider": f"Apify TikTok Shop ({actor_id} · LIVE)",
                    "summary": f"Đã lấy {len(items)} SKU TikTok Shop thật từ Apify ({region}, {sum(i['sold_30d'] for i in items):,} lượt bán)",
                    "data": {
                        "platform": "tiktok_shop",
                        "capabilities": caps,
                        "items": items,
                    },
                    "trace": _make_trace(
                        method="POST",
                        url_masked=masked_url,
                        headers_masked={"Content-Type": "application/json"},
                        request_payload=req_body,
                        http_status=status,
                        raw_response_sample=raw_sample,
                        records_received=len(payload),
                        processing_steps=[
                            f"1. Thu thập dataset TikTok Shop ({region}) từ Actor `{actor_id}` ({len(payload)} mục).",
                            "2. Ánh xạ `currentPrice`, `salesVolume`, `sellerName`, `rating`, `reviewCount` -> tính GMV = price_vnd * salesVolume.",
                            "3. Kiểm tra thực tế payload: chỉ số KOC / Hoa hồng Affiliate / Video-Live / Lịch sử 30d nếu chưa có trong kết quả tìm kiếm sẽ đánh dấu minh bạch (API đang phát triển).",
                        ],
                    ),
                }
        warning = f"Apify TikTok không trả dữ liệu trực tiếp ({err_msg or 'empty dataset'}); chuyển Sandbox."
    else:
        warning = "Chưa cấu hình APIFY_API_TOKEN; chạy Sandbox TikTok Shop."

    if not _allow_fallback(extras):
        return {
            "ok": False,
            "mode": "error",
            "provider": "Apify TikTok Shop",
            "summary": warning,
            "data": {"platform": "tiktok_shop", "items": [], "capabilities": get_platform_capabilities("tiktok_shop")},
        }

    items = _build_sandbox_items(keyword, "tiktok_shop", max_items)
    avg_koc = round(sum(i.get("koc_creators_count") or 0 for i in items) / max(1, len(items)), 1)
    return {
        "ok": True,
        "mode": "sandbox",
        "provider": "Apify TikTok Shop Actor (Sandbox)",
        "warning": warning,
        "summary": f"Mô phỏng {len(items)} SKU TikTok Shop (TB {avg_koc} KOC/SP)",
        "data": {
            "platform": "tiktok_shop",
            "capabilities": get_platform_capabilities("tiktok_shop"),
            "items": items,
        },
        "trace": _make_trace(
            method="POST",
            url_masked=masked_url,
            headers_masked={"Content-Type": "application/json"},
            request_payload=req_body,
            http_status=http_status,
            raw_response_sample={"sandbox_sample": items[:2], "live_attempt_response": raw_sample},
            records_received=len(items),
            warning=warning,
            processing_steps=[
                "1. Sinh dataset TikTok Shop kèm chỉ số hoa hồng KOC (`commission_pct`) và số lượng creator (`koc_creators_count`).",
                "2. Đánh dấu `has_history_30d = None` để chỉ số độ phủ lịch sử 30d ghi rõ `(API đang phát triển)` ở tab Sàn Đen.",
            ],
        ),
    }


@DEFAULT_TOOL_REGISTRY.tool(
    name="serper_ecommerce_search",
    provider="Serper.dev Google Search (VN)",
    description="Quét tín hiệu SEO và từ khóa mở rộng trên Google VN (2.500 queries miễn phí).",
    cost_tier="free",
    estimated_cost_usd=0.0,
    requires_hitl=False,
    tags=["search", "serper", "seo"],
    parameters_schema={
        "type": "object",
        "properties": {
            "keyword": {"type": "string"},
            "site_filter": {"type": "string"},
        },
        "required": ["keyword"],
    },
)
def serper_ecommerce_search(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    keyword = str(args.get("keyword") or "").strip()
    site_filter = str(args.get("site_filter") or "").strip()
    api_key = _resolve_secret(extras, "serperApiKey", "SERPER_API_KEY")
    q = f"{site_filter} {keyword}".strip()
    url = "https://google.serper.dev/search"
    headers_masked = {"X-API-KEY": _mask_secret(api_key)}
    req_body = {"q": q, "gl": "vn", "hl": "vi", "num": 8}

    warning = ""
    http_status: int | str = "NOT_SENT (No API Key)"
    raw_sample: Any = None
    if api_key:
        ok, status, payload, err_msg = _http_json_request(
            url, method="POST", headers={"X-API-KEY": api_key}, payload=req_body
        )
        http_status = status
        raw_sample = {k: payload.get(k) for k in ("organic", "relatedSearches")} if isinstance(payload, dict) else str(payload)[:300]
        if ok and isinstance(payload, dict) and isinstance(payload.get("organic"), list):
            organic = [
                {
                    "title": str(item.get("title") or ""),
                    "link": str(item.get("link") or ""),
                    "snippet": str(item.get("snippet") or ""),
                }
                for item in payload["organic"][:8]
                if isinstance(item, dict)
            ]
            related = [
                r.get("query") for r in (payload.get("relatedSearches") or []) if isinstance(r, dict)
            ][:5]
            if organic:
                return {
                    "ok": True,
                    "mode": "live",
                    "provider": "Serper.dev Google Search (LIVE)",
                    "summary": f"Thu thập {len(organic)} kết quả Google VN thật cho '{q}'",
                    "data": {"query": q, "related_searches": related, "items": organic},
                    "trace": _make_trace(
                        method="POST",
                        url_masked=url,
                        headers_masked=headers_masked,
                        request_payload=req_body,
                        http_status=status,
                        raw_response_sample={"organic_sample": organic[:2], "relatedSearches": related},
                        records_received=len(organic),
                        processing_steps=[
                            "1. Gửi truy vấn đa sàn Google VN (`gl=vn`, `hl=vi`) tới Serper.dev.",
                            f"2. Trích xuất {len(related)} cụm từ khóa tìm kiếm liên quan (`relatedSearches`) làm ma trận mở rộng.",
                        ],
                    ),
                }
        warning = f"Serper API fallback ({err_msg or 'empty'})"
    else:
        warning = "Chưa có SERPER_API_KEY; dùng từ khóa mở rộng Sandbox."

    expanded = [
        keyword,
        f"{keyword} chính hãng",
        f"{keyword} giá rẻ",
        f"{keyword} thùng tiết kiệm",
        f"review {keyword} tiktok",
    ]
    sample_items = [
        {"title": f"[Shopee] Top bán chạy {keyword}", "link": f"https://shopee.vn/search?keyword={urllib.parse.quote(keyword)}"},
        {"title": f"[Lazada] {keyword} LazMall chính hãng", "link": f"https://www.lazada.vn/catalog/?q={urllib.parse.quote(keyword)}"},
        {"title": f"[TikTok Shop] Trend video {keyword}", "link": f"https://www.tiktok.com/search?q={urllib.parse.quote(keyword)}"},
    ]
    return {
        "ok": True,
        "mode": "sandbox",
        "provider": "Serper Google Signals (Sandbox)",
        "warning": warning,
        "summary": f"Mở rộng {len(expanded)} cụm từ khóa tìm kiếm tại VN",
        "data": {"query": q, "related_searches": expanded, "items": sample_items},
        "trace": _make_trace(
            method="POST",
            url_masked=url,
            headers_masked=headers_masked,
            request_payload=req_body,
            http_status=http_status,
            raw_response_sample={"related_searches": expanded, "items": sample_items, "live_attempt": raw_sample},
            records_received=len(sample_items),
            warning=warning,
            processing_steps=[
                "1. Sinh 5 cụm từ khóa mở rộng đại diện theo ý định tìm kiếm (giá rẻ, chính hãng, combo/thùng, review).",
            ],
        ),
    }


@DEFAULT_TOOL_REGISTRY.tool(
    name="calc_platform_net_margin",
    provider="VN E-Commerce Unit Economics Calculator",
    description="Tính biên lợi nhuận ròng sau phí sàn, phí thanh toán, gói freeship, affiliate KOC và hoàn đơn.",
    cost_tier="free",
    estimated_cost_usd=0.0,
    requires_hitl=False,
    tags=["pricing", "margin", "finance"],
    parameters_schema={
        "type": "object",
        "properties": {
            "selling_price_vnd": {"type": "number"},
            "cost_price_vnd": {"type": "number"},
            "platform": {"type": "string"},
            "affiliate_pct": {"type": "number"},
        },
        "required": ["selling_price_vnd", "cost_price_vnd", "platform"],
    },
)
def calc_platform_net_margin(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    del extras
    sell = max(1.0, float(args.get("selling_price_vnd") or 189_000))
    cost = max(0.0, float(args.get("cost_price_vnd") or 85_000))
    platform = str(args.get("platform") or "shopee").lower()
    pack_vnd = float(args.get("shipping_pack_vnd") or 6_500)
    return_pct = float(args.get("return_rate_pct") or (5.5 if "tiktok" in platform else 3.5))

    fee_presets = {
        "shopee": {"platform_fee_pct": 11.5, "default_aff_pct": 4.0},
        "lazada": {"platform_fee_pct": 10.0, "default_aff_pct": 3.0},
        "tiktok_shop": {"platform_fee_pct": 9.5, "default_aff_pct": 12.0},
    }
    preset = fee_presets.get(platform, fee_presets["shopee"])
    plat_pct = preset["platform_fee_pct"]
    aff_pct = float(args.get("affiliate_pct") if args.get("affiliate_pct") is not None else preset["default_aff_pct"])

    platform_fee_vnd = round(sell * (plat_pct / 100.0))
    affiliate_fee_vnd = round(sell * (aff_pct / 100.0))
    return_loss_vnd = round(sell * (return_pct / 100.0) * 0.45)
    total_cost = cost + platform_fee_vnd + affiliate_fee_vnd + pack_vnd + return_loss_vnd
    net_profit = round(sell - total_cost)
    net_margin_pct = round((net_profit / sell) * 100.0, 2)
    breakeven_roas = round(sell / net_profit, 2) if net_profit > 0 else None

    result_data = {
        "platform": platform,
        "selling_price_vnd": int(sell),
        "cost_price_vnd": int(cost),
        "platform_fee_pct": plat_pct,
        "platform_fee_vnd": platform_fee_vnd,
        "affiliate_pct": aff_pct,
        "affiliate_fee_vnd": affiliate_fee_vnd,
        "packaging_vnd": int(pack_vnd),
        "return_risk_loss_vnd": return_loss_vnd,
        "net_profit_vnd": net_profit,
        "net_margin_pct": net_margin_pct,
        "breakeven_roas": breakeven_roas,
    }
    return {
        "ok": True,
        "mode": "live",
        "provider": "VN Unit Economics Engine",
        "summary": f"{platform.upper()}: Lãi ròng {net_profit:,}đ / đơn ({net_margin_pct}%)",
        "data": result_data,
        "trace": _make_trace(
            method="INTERNAL_CALC",
            url_masked="internal://unit-economics/margin",
            headers_masked={},
            request_payload=args,
            http_status=200,
            raw_response_sample=result_data,
            records_received=1,
            processing_steps=[
                f"Công thức: Lãi ròng = Giá bán ({int(sell):,}đ) - Vốn ({int(cost):,}đ) - Phí sàn {plat_pct}% ({platform_fee_vnd:,}đ) - Affiliate {aff_pct}% ({affiliate_fee_vnd:,}đ) - Đóng gói ({int(pack_vnd):,}đ) - Dự phòng hoàn ({return_loss_vnd:,}đ).",
            ],
        ),
    }
