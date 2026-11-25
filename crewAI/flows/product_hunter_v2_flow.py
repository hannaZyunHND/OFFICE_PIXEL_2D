"""Product Hunter v2: one question, one lit path on the office map."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List

from env_loader import get_crew_portal_base_url
from flows.product_hunter_flow import slugify_keyword
from market_answer import _pick_item, render_prose, write_answer_page
from market_metrics import build_floor_sample
from market_when import search_query
from pixel_office_sdk import PixelOfficeBridge
from question_route import route_question_codex
from telegram_office import send_message
from tool_registry import execute_tool_for_agent
import providers.ecommerce_providers  # noqa: F401
import telegram_office  # noqa: F401


QUESTION_AGENT = {
    "market_keyword": "agent_v2_market_keyword",
    "market_category": "agent_v2_market_category",
    "top_products": "agent_v2_top_products",
    "product_eval": "agent_v2_product_eval",
    "compare": "agent_v2_compare",
    "full_report": "agent_v2_full_report",
}
PLATFORM_AGENT = {
    "shopee": "agent_v2_san_cam",
    "lazada": "agent_v2_san_xanh",
    "tiktok_shop": "agent_v2_san_den",
}
QUESTION_IDS = list(QUESTION_AGENT.values())
PLATFORM_IDS = list(PLATFORM_AGENT.values())


def _tool_args(platform: str, name: str, max_items: int) -> tuple[str, Dict[str, Any]]:
    if platform == "lazada":
        return "apify_lazada_search", {"keyword": name, "max_items": max_items}
    if platform == "tiktok_shop":
        return "apify_tiktok_shop_search", {"keyword": name, "region": "VN", "max_items": max_items}
    return "addlivetag_market_search", {"query": name, "max_items": 0}


async def _idle(bridge: PixelOfficeBridge, agent_id: str, text: str) -> None:
    await bridge.emit_event("AGENT_START", agent_id, text[:180], icon="message", tokens_used=10, duration_ms=400)
    await bridge.emit_event("AGENT_COMPLETE", agent_id, text[:180], icon="check", tokens_used=10, duration_ms=400)


async def run_product_hunter_v2_flow(
    keyword_prompt: str,
    bridge: PixelOfficeBridge,
    output_root: Path,
    step_delay: float = 0.2,
    options: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    del step_delay
    t0 = time.time()
    opts = options or {}
    extras = dict(opts.get("extras") or {})
    asked = " ".join(str(keyword_prompt or "").split()) or " "
    max_items = int(extras.get("apifyMaxItemsPerPlatform") or 20)
    samples: List[Dict[str, Any]] = []
    related: List[str] = []

    liaison = "agent_v2_liaison"
    router = "agent_v2_router"
    await bridge.emit_event("AGENT_START", liaison, f"Nhận câu: {asked[:140]}", tokens_used=40)
    await bridge.emit_event(
        "AGENT_HANDOFF",
        liaison,
        "Mở camera",
        target_agent_id="agent_office_camera",
        icon="message",
        tokens_used=20,
    )
    await _idle(bridge, "agent_office_camera", "Chụp toàn cảnh khi văn phòng đang mở.")
    await bridge.emit_event(
        "AGENT_HANDOFF",
        liaison,
        "Chuyển câu sang Điều phối",
        target_agent_id=router,
        icon="message",
        tokens_used=20,
    )
    await bridge.emit_event("AGENT_COMPLETE", liaison, "Đã chuyển câu", icon="check", tokens_used=20)
    await bridge.emit_event("AGENT_START", router, "Codex đang đọc câu.", tokens_used=40)
    route = route_question_codex(asked)
    await bridge.emit_event(
        "AGENT_COMPLETE",
        router,
        str(route.get("status_text") or "")[:180],
        icon="check",
        input_payload={
            "intent": route.get("intent"),
            "platforms": route.get("platforms"),
            "names": route.get("names"),
            "clarify": route.get("clarify"),
            "when": route.get("when"),
            "reader": route.get("reader"),
        },
        tokens_used=40,
    )

    intent = str(route.get("intent") or "clarify")
    chosen = QUESTION_AGENT.get(intent, "")
    for agent_id in QUESTION_IDS:
        if agent_id == chosen:
            continue
        await _idle(bridge, agent_id, "Đứng yên — không phải câu này")

    if intent == "clarify":
        for agent_id in PLATFORM_IDS:
            await _idle(bridge, agent_id, "Đứng yên — câu không nhắc sàn này")
        question = str(route.get("clarify") or "Ngành nào, hay một tên hàng?")
        send_message(question)
        return _result(asked, route, question, "", "", t0)

    await bridge.emit_event(
        "AGENT_HANDOFF",
        router,
        str(route.get("status_text") or "")[:180],
        target_agent_id=chosen,
        icon="message",
        tokens_used=20,
    )
    await bridge.emit_event("AGENT_START", chosen, str(route.get("status_text") or "")[:180], tokens_used=30)

    names = [str(item) for item in (route.get("names") or []) if str(item).strip()]
    if intent == "market_category" and not names:
        category = str(route.get("category") or "")
        serper = await execute_tool_for_agent(
            bridge,
            chosen,
            "serper_ecommerce_search",
            {"keyword": search_query(category, route.get("when") or {})},
            extras=extras,
            icon="search",
            tokens_used=40,
        )
        related = [str(item) for item in ((serper.get("data") or {}).get("related_searches") or []) if str(item).strip()]
        names = related[:4]
        route["names"] = names
        if not names:
            route["intent"] = "clarify"
            route["clarify"] = f"Chưa tách được tên trong ngành {category}. Đo tên hàng nào?"
            route["platforms"] = []
            await bridge.emit_event("AGENT_COMPLETE", chosen, "Chưa tách được tên hàng", icon="check", tokens_used=20)
            for agent_id in PLATFORM_IDS:
                await _idle(bridge, agent_id, "Đứng yên — câu không nhắc sàn này")
            send_message(str(route["clarify"]))
            return _result(asked, route, str(route["clarify"]), "", "", t0)

    if intent in {"market_keyword", "top_products", "product_eval", "full_report", "compare"} and names:
        serper = await execute_tool_for_agent(
            bridge,
            chosen,
            "serper_ecommerce_search",
            {"keyword": search_query(names[0], route.get("when") or {})},
            extras=extras,
            icon="search",
            tokens_used=40,
        )
        related = [str(item) for item in ((serper.get("data") or {}).get("related_searches") or []) if str(item).strip()]
    await bridge.emit_event("AGENT_COMPLETE", chosen, "Đã chốt tên cần đo", icon="check", tokens_used=20)

    selected = [str(item) for item in (route.get("platforms") or [])]
    for platform, agent_id in PLATFORM_AGENT.items():
        if platform not in selected:
            await _idle(bridge, agent_id, "Đứng yên — câu không nhắc sàn này")
            continue
        await bridge.emit_event(
            "AGENT_HANDOFF",
            router,
            f"Đo {platform}",
            target_agent_id=agent_id,
            icon="message",
            tokens_used=20,
        )
        await bridge.emit_event("AGENT_START", agent_id, "Đang lấy số.", tokens_used=30)
        platform_errors: List[str] = []
        for name in names:
            tool_name, args = _tool_args(platform, search_query(name, route.get("when") or {}), max_items)
            try:
                result = await execute_tool_for_agent(
                    bridge,
                    agent_id,
                    tool_name,
                    args,
                    extras=extras,
                    icon="search",
                    tokens_used=80,
                    status_prefix=f"Đo «{name}»",
                )
            except Exception as exc:
                result = {"ok": False, "mode": "error", "summary": str(exc), "data": {"items": []}}
            sample = build_floor_sample(name, platform, result)
            if platform == "shopee" and sample.get("items") and (intent == "product_eval" or sample.get("mode") == "live"):
                sample = await _attach_batch(bridge, agent_id, extras, sample, route)
            if sample.get("mode") == "error":
                platform_errors.append(str(sample.get("error") or "lỗi"))
            samples.append(sample)
        done = platform_errors[0] if platform_errors and len(platform_errors) == len(names) else "Đã có số."
        await bridge.emit_event("AGENT_COMPLETE", agent_id, done[:180], icon="check", tokens_used=20)
        await bridge.emit_event(
            "AGENT_HANDOFF",
            agent_id,
            "Gửi số sang viết bài",
            target_agent_id="agent_v2_answer",
            icon="message",
            tokens_used=20,
        )

    prose = render_prose(route, samples, related)
    slug_source = " ".join(names) or intent
    slug = slugify_keyword(slug_source)
    page = output_root / "product_hunter_v2" / slug / "index.html"
    title = " · ".join(names)[:80] or asked[:80]
    write_answer_page(page, title, prose, samples, related, long_form=intent == "full_report")
    portal = f"{get_crew_portal_base_url().rstrip('/')}/product_hunter_v2/{slug}/index.html"

    answer = "agent_v2_answer"
    await bridge.emit_event("AGENT_START", answer, "Ghép số thành bài.", tokens_used=30)
    first_line = prose.split("\n", 1)[0][:180]
    await bridge.emit_event("AGENT_COMPLETE", answer, first_line, icon="check", tokens_used=20)
    await bridge.emit_event(
        "AGENT_HANDOFF",
        answer,
        "Đưa bài cho thư ký",
        target_agent_id="agent_v2_courier",
        icon="message",
        tokens_used=20,
    )
    courier = "agent_v2_courier"
    await bridge.emit_event("AGENT_START", courier, "Gửi bài cho Chủ tịch.", tokens_used=20)
    deliver = await execute_tool_for_agent(
        bridge,
        courier,
        "telegram_deliver_report",
        {"html_path": str(page), "slug": slug, "title": title, "note": prose},
        extras=extras,
        icon="message",
        tokens_used=40,
    )
    public_url = str((deliver.get("data") or {}).get("public_url") or "")
    await bridge.emit_event(
        "AGENT_COMPLETE",
        courier,
        "Đã gửi bài" if (public_url or (deliver.get("data") or {}).get("sent")) else "Đã soạn bài",
        icon="check",
        tokens_used=20,
    )
    return _result(asked, route, prose, portal, public_url, t0, slug=slug)


def _detail_ids(sample: Dict[str, Any], route: Dict[str, Any]) -> List[str]:
    rows = [row for row in (sample.get("items") or []) if isinstance(row, dict)]
    rows.sort(key=lambda row: int(row.get("gmv_vnd") or 0), reverse=True)
    ids: List[str] = []
    for row in rows:
        item_id = str(row.get("item_id") or "").strip()
        if item_id and item_id not in ids:
            ids.append(item_id)
        if len(ids) == 5:
            break
    if str(route.get("intent") or "") == "product_eval":
        chosen = _pick_item(sample, " ".join(route.get("names") or []))
        chosen_id = str((chosen or {}).get("item_id") or "").strip()
        if chosen_id:
            if chosen_id in ids:
                ids.remove(chosen_id)
            ids.insert(0, chosen_id)
            ids = ids[:5]
    return ids


def _optional_number(value: Any) -> Any:
    if value is None or value == "" or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def _attach_batch(
    bridge: PixelOfficeBridge,
    agent_id: str,
    extras: Dict[str, Any],
    sample: Dict[str, Any],
    route: Dict[str, Any],
) -> Dict[str, Any]:
    item_ids = _detail_ids(sample, route)
    if not item_ids:
        return sample
    try:
        batch = await execute_tool_for_agent(
            bridge,
            agent_id,
            "addlivetag_product_batch",
            {"item_ids": item_ids},
            extras=extras,
            icon="db",
            tokens_used=40,
        )
    except Exception:
        return sample
    rows = (batch.get("data") or {}).get("items") if isinstance(batch.get("data"), dict) else None
    if not isinstance(rows, list):
        return sample
    by_id = {str(row.get("item_id") or row.get("itemId") or ""): row for row in rows if isinstance(row, dict)}
    if str(batch.get("mode") or "") != "live":
        return sample
    details: List[Dict[str, Any]] = []
    list_prices = {str(item.get("item_id") or ""): item.get("price_vnd") for item in sample.get("items") or [] if isinstance(item, dict)}
    for item_id in item_ids:
        detail = by_id.get(item_id)
        if not isinstance(detail, dict):
            continue
        stats = detail.get("price_stats") if isinstance(detail.get("price_stats"), dict) else {}
        history = detail.get("latest_price_history") if isinstance(detail.get("latest_price_history"), dict) else {}
        cap = detail.get("cap_vnd")
        try:
            cap_vnd = int(cap) if cap not in (None, "") else None
        except (TypeError, ValueError):
            cap_vnd = None
        details.append(
            {
                "item_id": item_id,
                "category_name": str(detail.get("cat_name") or ""),
                "seller_commission_pct": detail.get("seller_commission_pct"),
                "platform_commission_pct": detail.get("shopee_commission_pct"),
                "commission_cap_vnd": cap_vnd,
                "price_change_7d": _optional_number(stats.get("priceChange7d")),
                "price_change_30d": _optional_number(stats.get("priceChange30d")),
                "discount_pct": _optional_number(history.get("discountPercent")),
                "stock": int(history["stockAvailable"]) if str(history.get("stockAvailable") or "").lstrip("-").isdigit() else None,
                "list_price_vnd": list_prices.get(item_id),
                "detail_price_vnd": detail.get("price_vnd"),
            }
        )
        item = next((row for row in sample.get("items") or [] if str(row.get("item_id") or "") == item_id), None)
        if isinstance(item, dict) and detail.get("seller_commission_pct") is not None:
            item["commission_pct"] = detail.get("seller_commission_pct")
    sample["detail_items"] = details[:5]
    return sample


def _result(
    asked: str,
    route: Dict[str, Any],
    prose: str,
    portal: str,
    public_url: str,
    t0: float,
    slug: str = "",
) -> Dict[str, Any]:
    return {
        "slug": slug,
        "topic": asked,
        "prompt": asked,
        "route": route,
        "answer": prose,
        "portal_url": portal,
        "result_url": public_url or portal,
        "public_url": public_url,
        "pages_attempted": True,
        "elapsed_seconds": round(time.time() - t0, 2),
    }
