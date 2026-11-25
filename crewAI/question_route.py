"""Turn a chairman sentence into one question type and the floors to measure.

Sàn Cam is always included once a measurement starts. Sàn Xanh and Sàn Đen
are added only when the sentence names them. A vague sentence asks one question
and measures nothing.
"""

from __future__ import annotations

import os
import re
import unicodedata
from typing import Any, Callable, Dict, List

from market_catalog import lookup_industry
from market_when import is_window_only, occasion_names, parse_when, strip_when


INTENTS = (
    "market_keyword",
    "market_category",
    "top_products",
    "product_eval",
    "compare",
    "full_report",
    "clarify",
)

_INTENT_LABEL = {
    "market_keyword": "thị trường theo tên",
    "market_category": "ngành hàng",
    "top_products": "top sản phẩm",
    "product_eval": "đánh giá một sản phẩm",
    "compare": "so sánh",
    "full_report": "báo cáo đầy đủ",
    "clarify": "hỏi lại",
}

_FLOOR_LABEL = {"shopee": "Cam", "lazada": "Xanh", "tiktok_shop": "Đen"}

_ALL_FLOORS = re.compile(
    r"cả\s*ba\s*sàn|ca\s*ba\s*san|đủ\s*ba\s*sàn|du\s*ba\s*san|\bba\s*sàn\b|\bba\s*san\b|"
    r"\b3\s*sàn\b|\b3\s*san\b|tất\s*cả\s*(?:các\s*)?sàn|tat\s*ca\s*(?:cac\s*)?san|"
    r"mọi\s*sàn|moi\s*san|đa\s*sàn|da\s*san|(?:trên|ở|o|tại|tai)\s+các\s*sàn|(?:tren|o|tai)\s+cac\s*san|"
    r"\bcác\s*sàn\b|\bcac\s*san\b",
    re.IGNORECASE,
)
_LAZADA = re.compile(r"lazada|sàn\s*xanh|san\s*xanh", re.IGNORECASE)
_TIKTOK = re.compile(r"tiktok(?:\s*shop)?|sàn\s*đen|san\s*den", re.IGNORECASE)
_PLATFORM_WORDS = re.compile(
    r"(?:trên|tren)\s+(?:cả|ca)\s*(?:ba|3)\s*(?:sàn|san)(?:\s+(?:thương\s*mại\s*điện\s*tử|thuong\s*mai\s*dien\s*tu))?|"
    r"(?:cả|ca)\s*(?:ba|3)\s*(?:sàn|san)(?:\s+(?:thương\s*mại\s*điện\s*tử|thuong\s*mai\s*dien\s*tu))?|"
    r"(?:thương\s*mại\s*điện\s*tử|thuong\s*mai\s*dien\s*tu)|"
    r"(?:trên\s+)?(?:sàn\s+)?(?:xanh|đen|cam)|lazada|tiktok(?:\s*shop)?|shopee|"
    r"cả\s*ba\s*sàn|đủ\s*ba\s*sàn|\bba\s*sàn\b|\b3\s*sàn\b|tất\s*cả\s*(?:các\s*)?sàn|mọi\s*sàn|đa\s*sàn|"
    r"(?:trên|ở|tại)\s+các\s+sàn|\bcác\s+sàn\b|(?:trên|ở|tại)\s+sàn\b|"
    r"chỉ\s*xem|\briêng\b|\bchỉ\b",
    re.IGNORECASE,
)
_MATERIAL_GLUE = re.compile(r"\b(?:chất liệu|chat lieu|làm từ|lam tu|làm bằng|lam bang)\s+", re.IGNORECASE)
_LEADING = re.compile(
    r"^(?:hãy|xin|nhờ|giúp)?\s*(?:so sánh|so|đánh giá|review|top|xếp hạng|"
    r"làm báo cáo|báo cáo đầy đủ|báo cáo chi tiết|báo cáo đủ ba sàn|báo cáo)\s*",
    re.IGNORECASE,
)
_FILLER = re.compile(
    r"\b(?:thị trường|đang thế nào|thế nào|ra sao|như thế nào|như nào|hiện nay|tháng này|"
    r"doanh số|doanh thu|số liệu|tình hình|lượt bán|"
    r"món nào đang bán|món nào|cho tôi|cho biết|cho|về|một|các|hãy|xin|trên|"
    r"nhỉ|nhé|ạ|vậy)\b",
    re.IGNORECASE,
)
_FULL = re.compile(r"báo cáo\s+(?:đầy đủ|chi tiết|dài)|làm báo cáo|báo cáo đủ", re.IGNORECASE)
_COMPARE = re.compile(r"\bso sánh\b|\bvới\b", re.IGNORECASE)
_EVAL = re.compile(r"đánh giá|\breview\b|đáng bán|có đáng", re.IGNORECASE)
_TOP = re.compile(r"\btop\b|bán chạy|xếp hạng", re.IGNORECASE)
_EMPTY_NAME = {"", "nào", "gì", "thế nào", "ra sao", "này", "kia"}


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").replace("đ", "d")


def _space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _platforms(text: str) -> List[str]:
    haystack = f"{text.lower()} {_fold(text)}"
    lazada = bool(_LAZADA.search(haystack))
    tiktok = bool(_TIKTOK.search(haystack))
    if _ALL_FLOORS.search(haystack) or (lazada and tiktok):
        return ["shopee", "lazada", "tiktok_shop"]
    floors = ["shopee"]
    if lazada:
        floors.append("lazada")
    if tiktok:
        floors.append("tiktok_shop")
    return floors


def _clean_name(text: str, when: Dict[str, Any]) -> str:
    name = _LEADING.sub("", _space(text))
    name = _PLATFORM_WORDS.sub(" ", name)
    name = _FILLER.sub(" ", name)
    name = strip_when(name, when)
    name = _space(name).strip(" .,;:?!-")
    dangling = re.sub(r"\s+sàn$", "", name, flags=re.IGNORECASE).strip()
    if dangling and dangling != name and _fold(dangling) in _fold(text):
        name = dangling
    name = re.sub(r"^bán\s+", "", name, flags=re.IGNORECASE).strip()
    name = _space(_MATERIAL_GLUE.sub(" ", name))
    name = re.sub(r"\s+(?:cả|ca)$", "", name, flags=re.IGNORECASE).strip()
    if is_window_only(name, when) or _fold(name) in _EMPTY_NAME or len(name) < 2:
        return ""
    return name[:80]


def _status(
    intent: str,
    platforms: List[str],
    when: Dict[str, Any],
    category: str = "",
    names: List[str] | None = None,
) -> str:
    if intent == "clarify":
        text = "Câu này chưa đủ tên. Hỏi lại."
    else:
        floors = ", ".join(_FLOOR_LABEL[item] for item in platforms)
        window_label = str(when.get("label") or "")
        if str(when.get("kind") or "") == "occasion" and category and category == window_label:
            text = f"Câu này là dịp {window_label}. Sàn: {floors}."
        else:
            text = f"Câu này là {_INTENT_LABEL[intent]}. Sàn: {floors}."
            if window_label:
                text += f" Thời điểm: {window_label}."
    shown = [str(item) for item in (names or []) if str(item).strip()]
    if intent != "clarify" and shown:
        text = "Đo " + " · ".join(shown[:2]) + ". " + text
    return text[:180]


def _ask(base: str, when: Dict[str, Any]) -> str:
    label = str(when.get("label") or "").strip()
    if not label:
        return base
    if base == "Ngành nào, hay một tên hàng?" and str(when.get("kind") or "") == "month":
        shown = label[:1].upper() + label[1:]
        return f"{shown} đo tên hàng nào?"
    if base.endswith("?"):
        return base[:-1] + f" cho {label}?"
    return base


def _pack(
    raw: str,
    intent: str,
    platforms: List[str],
    names: List[str],
    clarify: str = "",
    category: str = "",
    when: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    clean_names = []
    for name in names:
        item = _space(name)
        if item and item not in clean_names:
            clean_names.append(item[:80])
    if intent == "clarify":
        platforms = []
        clean_names = []
        clarify = _space(clarify) or "Ngành nào, hay một tên hàng?"
    else:
        clarify = ""
        if "shopee" not in platforms:
            platforms = ["shopee", *platforms]
    window = dict(when or parse_when(""))
    return {
        "raw": raw,
        "intent": intent,
        "platforms": platforms,
        "names": clean_names[:4],
        "clarify": clarify,
        "category": category,
        "when": window,
        "status_text": _status(intent, platforms, window, category, clean_names),
        "reader": "rules",
    }


def _with_occasion(intent: str, floors: List[str], raw: str, when: Dict[str, Any], category: str = "") -> Dict[str, Any] | None:
    if str(when.get("kind") or "") != "occasion":
        return None
    names = occasion_names(when)
    if not names:
        return None
    return _pack(raw, intent, floors, names, category=category or str(when.get("label") or ""), when=when)


def route_question(text: str) -> Dict[str, Any]:
    """One route. Measurement routes always include shopee."""
    raw = _space(text)
    when = parse_when(raw)
    if not raw:
        return _pack(raw or " ", "clarify", [], [], "Ngành nào, hay một tên hàng?", when=when)
    floors = _platforms(raw)
    industry = lookup_industry(raw)

    if _FULL.search(raw):
        name = _clean_name(raw, when)
        if name:
            return _pack(raw, "full_report", floors, [name], when=when)
        seasonal = _with_occasion("full_report", floors, raw, when)
        if seasonal is not None:
            return seasonal
        return _pack(raw, "clarify", [], [], _ask("Báo cáo cho tên hàng nào?", when), when=when)

    if _COMPARE.search(raw):
        parts = re.split(r"\s+với\s+", raw, maxsplit=1, flags=re.IGNORECASE)
        if len(parts) == 2:
            left = _clean_name(parts[0], when)
            right = _clean_name(parts[1], when)
            if left and right:
                return _pack(raw, "compare", floors, [left, right], when=when)
        return _pack(raw, "clarify", [], [], _ask("So với tên hàng nào?", when), when=when)

    if _EVAL.search(raw):
        name = _clean_name(raw, when)
        if not name:
            return _pack(raw, "clarify", [], [], _ask("Đánh giá món nào?", when), when=when)
        return _pack(raw, "product_eval", floors, [name], when=when)

    if _TOP.search(raw):
        name = _clean_name(raw, when)
        if name:
            return _pack(raw, "top_products", floors, [name], when=when)
        seasonal = _with_occasion("top_products", floors, raw, when)
        if seasonal is not None:
            return seasonal
        return _pack(raw, "clarify", [], [], _ask("Top của tên hàng nào?", when), when=when)

    if industry is not None or re.search(r"ngành", raw, flags=re.IGNORECASE):
        if industry is not None:
            return _pack(
                raw,
                "market_category",
                floors,
                list(industry["names"]),
                category=str(industry["label"]),
                when=when,
            )
        tail = _clean_name(re.sub(r"^.*?\bngành\b", " ", raw, count=1, flags=re.IGNORECASE), when)
        if tail:
            return _pack(raw, "market_category", floors, [], category=tail, when=when)
        return _pack(raw, "clarify", [], [], _ask("Ngành nào, hay một tên hàng?", when), when=when)

    name = _clean_name(raw, when)
    if name:
        return _pack(raw, "market_keyword", floors, [name], when=when)
    seasonal = _with_occasion("market_category", floors, raw, when)
    if seasonal is not None:
        return seasonal
    return _pack(raw, "clarify", [], [], _ask("Ngành nào, hay một tên hàng?", when), when=when)


_PLATFORM_ALIAS = {
    "shopee": "shopee",
    "cam": "shopee",
    "san_cam": "shopee",
    "lazada": "lazada",
    "xanh": "lazada",
    "san_xanh": "lazada",
    "tiktok": "tiktok_shop",
    "tiktok_shop": "tiktok_shop",
    "den": "tiktok_shop",
    "đen": "tiktok_shop",
    "san_den": "tiktok_shop",
}


def _codex_prompt(raw: str) -> str:
    return (
        "Đọc một câu hỏi thị trường thương mại điện tử Việt Nam. "
        "Trả về đúng một JSON, không markdown, không giải thích.\n"
        f"Câu: {raw}\n"
        "Luật:\n"
        "- intent chỉ được một trong: market_keyword, market_category, top_products, "
        "product_eval, compare, full_report, clarify.\n"
        "- names là từ khóa gõ lên ô tìm của sàn, không phải cả câu. "
        "Bỏ doanh số, bán, như nào, nhé, thương mại điện tử, cả 3 sàn, các sàn. "
        "“chất liệu”, “làm bằng” chỉ là cách nói nguyên liệu: lược chất liệu ngà thành lược ngà.\n"
        "- Mỗi chữ trong names phải có trong câu. Không bịa thêm. Sàn gỗ giữ chữ sàn.\n"
        "- platforms: shopee luôn có khi đi đo. Thêm lazada khi câu nói Lazada hoặc Sàn Xanh. "
        "Thêm tiktok_shop khi câu nói TikTok hoặc Sàn Đen. "
        "Các sàn, mọi sàn, ba sàn, tất cả sàn, đa sàn nghĩa là cả ba. Không nhắc thì chỉ shopee.\n"
        "- when.kind là chuỗi rỗng, month hoặc occasion. "
        "Tháng qua, tháng trước, tháng rồi là month, id month-prev, label tháng qua. "
        "Tháng và dịp không nằm trong names.\n"
        "- category là tên ngành nếu intent là market_category, không thì chuỗi rỗng.\n"
        "- clarify là câu hỏi lại nếu thiếu tên hàng, không thì chuỗi rỗng.\n"
        "Ví dụ câu “doanh số bán lược chất liệu ngà trên cả 3 sàn thương mại điện tử nhé” "
        'trả về {"intent":"market_keyword","names":["lược ngà"],'
        '"platforms":["shopee","lazada","tiktok_shop"],'
        '"when":{"kind":"","id":"","label":""},'
        '"category":"","clarify":""}'
    )


def _intent_supported(intent: str, raw: str) -> bool:
    if intent == "full_report":
        return bool(_FULL.search(raw))
    if intent == "compare":
        return bool(_COMPARE.search(raw))
    if intent == "product_eval":
        return bool(_EVAL.search(raw))
    if intent == "top_products":
        return bool(_TOP.search(raw))
    if intent == "market_category":
        return lookup_industry(raw) is not None or bool(re.search(r"ngành", raw, flags=re.IGNORECASE))
    return intent in {"market_keyword", "clarify"}


def _when_from_model(raw: str, data: Dict[str, Any], fallback_when: Dict[str, Any]) -> Dict[str, Any]:
    if str(fallback_when.get("kind") or ""):
        return dict(fallback_when)
    proposed = data.get("when") if isinstance(data.get("when"), dict) else {}
    label = _space(str(proposed.get("label") or ""))
    if not label or _fold(label) not in _fold(raw):
        return dict(fallback_when)
    parsed = parse_when(label)
    if not parsed.get("kind"):
        parsed = parse_when(f"trong {label}")
    if parsed.get("kind"):
        return parsed
    return dict(fallback_when)


def _words_in_order(name: str, raw: str) -> bool:
    """Each kept word must occur in the question, in the same order. Gaps are allowed."""
    folded_raw = _fold(raw)
    cursor = 0
    words = [word for word in _fold(name).split() if word]
    if not words:
        return False
    for word in words:
        match = re.search(rf"\b{re.escape(word)}\b", folded_raw[cursor:])
        if match is None:
            return False
        cursor += match.end()
    return True


def _names_from_model(raw: str, data: Dict[str, Any], when: Dict[str, Any]) -> List[str]:
    found: List[str] = []
    values = data.get("names")
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return found
    for item in values:
        cleaned = _clean_name(str(item), when)
        if cleaned and _words_in_order(cleaned, raw) and cleaned not in found:
            found.append(cleaned)
    return found[:4]


def _platforms_from_model(raw: str, data: Dict[str, Any], fallback: List[str]) -> List[str]:
    floors = list(fallback)
    values = data.get("platforms")
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return floors
    plural = bool(_ALL_FLOORS.search(f"{raw.lower()} {_fold(raw)}"))
    if not plural:
        return floors
    for item in values:
        key = _PLATFORM_ALIAS.get(str(item).strip().lower().replace(" ", "_"), "")
        if key and key not in floors:
            floors.append(key)
    if floors and "shopee" not in floors:
        floors.insert(0, "shopee")
    return floors


def _merge_codex(raw: str, data: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    when = _when_from_model(raw, data, fallback.get("when") or parse_when(""))
    if fallback.get("intent") == "market_category" and fallback.get("names"):
        return _pack(
            raw,
            "market_category",
            _platforms_from_model(raw, data, list(fallback.get("platforms") or [])),
            list(fallback.get("names") or []),
            category=str(fallback.get("category") or ""),
            when=when,
        )
    intent = str(data.get("intent") or "")
    if not _intent_supported(intent, raw):
        intent = str(fallback.get("intent") or "clarify")
    names = _names_from_model(raw, data, when)
    if intent == "compare" and len(names) < 2:
        intent = str(fallback.get("intent") or intent)
        names = list(fallback.get("names") or names)
    if not names:
        names = list(fallback.get("names") or [])
        if names:
            intent = str(fallback.get("intent") or intent)
    if intent == "clarify" or not names:
        if fallback.get("names"):
            return _pack(
                raw,
                str(fallback.get("intent") or "market_keyword"),
                list(fallback.get("platforms") or []),
                list(fallback.get("names") or []),
                category=str(fallback.get("category") or ""),
                when=when,
            )
        clarify = _space(str(data.get("clarify") or "")) or str(fallback.get("clarify") or "")
        return _pack(raw, "clarify", [], [], clarify or "Ngành nào, hay một tên hàng?", when=when)
    return _pack(
        raw,
        intent,
        _platforms_from_model(raw, data, list(fallback.get("platforms") or [])),
        names,
        category=str(fallback.get("category") or ""),
        when=when,
    )


def route_question_codex(
    text: str,
    runner: Callable[..., Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    """Read the sentence with Codex. Keep the rule route when Codex is off or unusable."""
    raw = _space(text)
    fallback = route_question(raw)
    if os.environ.get("QUESTION_READER", "").strip().lower() == "rules":
        return fallback
    if runner is None:
        from codex_cli_llm import run_codex_json

        def runner(prompt: str) -> Dict[str, Any]:
            return run_codex_json(prompt, timeout_sec=45)

    try:
        result = runner(_codex_prompt(raw))
    except Exception:
        result = {"ok": False}
    if not isinstance(result, dict) or not result.get("ok") or not isinstance(result.get("data"), dict):
        fallback["status_text"] = ("Luật chữ, Codex không đọc được. " + str(fallback.get("status_text") or ""))[:180]
        fallback["reader"] = "rules"
        return fallback
    route = _merge_codex(raw, result["data"], fallback)
    route["reader"] = "codex"
    route["status_text"] = ("Codex. " + str(route.get("status_text") or ""))[:180]
    return route
