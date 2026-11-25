"""Time window on a market question: a season, or a calendar month.

A season is attached to the search name when the name does not already say it.
A month is recorded on the route and in the answer. The floors this office
calls do not filter by a past or future month, so the month is never appended
to the search name and never turned into a made-up monthly total.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List


EMPTY_WHEN: Dict[str, str] = {"id": "", "label": "", "kind": "", "query_hint": ""}

_OCCASIONS: tuple[Dict[str, Any], ...] = (
    {
        "id": "tet",
        "label": "Tết",
        "query_hint": "Tết",
        "pattern": r"tết|tet|nguyên đán|nguyen dan",
        "aliases": ["tết", "tet", "nguyên đán", "nguyen dan"],
        "names": ["hộp quà Tết", "lịch để bàn Tết", "đồ trang trí Tết", "bánh kẹo Tết"],
    },
    {
        "id": "mid_autumn",
        "label": "Trung thu",
        "query_hint": "trung thu",
        "pattern": r"trung thu",
        "aliases": ["trung thu"],
        "names": ["bánh trung thu", "đèn lồng trung thu", "hộp quà trung thu"],
    },
    {
        "id": "christmas",
        "label": "Noel",
        "query_hint": "Noel",
        "pattern": r"noel|giáng sinh|giang sinh",
        "aliases": ["noel", "giáng sinh", "giang sinh"],
        "names": ["cây thông Noel", "hộp quà Giáng sinh", "đồ trang trí Noel"],
    },
    {
        "id": "back_to_school",
        "label": "khai giảng",
        "query_hint": "khai giảng",
        "pattern": r"khai giảng|khai giang|tựu trường|tuu truong",
        "aliases": ["khai giảng", "khai giang", "tựu trường", "tuu truong"],
        "names": ["balo học sinh", "hộp bút học sinh", "đồ dùng học tập"],
    },
    {
        "id": "womens_day",
        "label": "8/3",
        "query_hint": "8/3",
        "pattern": r"8\s*/\s*3|8 tháng 3|quốc tế phụ nữ|quoc te phu nu",
        "aliases": ["8/3", "8 tháng 3", "quốc tế phụ nữ"],
        "names": ["hộp quà 8/3", "hoa sáp", "nước hoa mini"],
    },
    {
        "id": "vn_womens_day",
        "label": "20/10",
        "query_hint": "20/10",
        "pattern": r"20\s*/\s*10|20 tháng 10|phụ nữ việt nam|phu nu viet nam",
        "aliases": ["20/10", "20 tháng 10", "phụ nữ việt nam"],
        "names": ["hộp quà 20/10", "hoa sáp", "set mỹ phẩm"],
    },
    {
        "id": "valentine",
        "label": "Valentine",
        "query_hint": "Valentine",
        "pattern": r"valentine|lễ tình nhân|le tinh nhan|14\s*/\s*2",
        "aliases": ["valentine", "lễ tình nhân", "14/2"],
        "names": ["socola Valentine", "gấu bông", "hộp quà Valentine"],
    },
    {
        "id": "mega_11",
        "label": "11.11",
        "query_hint": "11.11",
        "pattern": r"(?<!\d)11\s*[./]\s*11(?!\d)|ngày đôi 11|ngay doi 11",
        "aliases": ["11.11", "11/11", "ngày đôi 11"],
        "names": ["tai nghe 11.11", "mỹ phẩm 11.11", "nồi chiên 11.11", "sạc dự phòng 11.11"],
    },
    {
        "id": "mega_12",
        "label": "12.12",
        "query_hint": "12.12",
        "pattern": r"(?<!\d)12\s*[./]\s*12(?!\d)|ngày đôi 12|ngay doi 12",
        "aliases": ["12.12", "12/12", "ngày đôi 12"],
        "names": ["tai nghe 12.12", "mỹ phẩm 12.12", "nồi chiên 12.12", "sạc dự phòng 12.12"],
    },
    {
        "id": "summer",
        "label": "mùa hè",
        "query_hint": "mùa hè",
        "pattern": r"mùa hè|mùa nóng|mua he|mua nong|dịp hè|dip he",
        "aliases": ["mùa hè", "mùa nóng", "mua he", "dịp hè"],
        "names": ["quạt mini", "kem chống nắng", "đồ bơi"],
    },
)

_BY_ID = {str(item["id"]): item for item in _OCCASIONS}

_MONTH = re.compile(
    r"(?:trong|vào|vao|dịp|dip)?\s*(?:tháng|thang)\s*"
    r"(này|nay|tới|toi|sau|trước|truoc|vừa\s+qua|vua\s+qua|qua|rồi|roi|1[0-2]|0?[1-9])\b"
    r"(?:\s*/\s*20\d{2}|\s*năm\s*20\d{2})?",
    re.IGNORECASE,
)
_DIP = re.compile(r"\b(?:dịp|dip)\b", re.IGNORECASE)
_VAO = re.compile(r"\b(?:vào|vao)\b", re.IGNORECASE)
_SUMMER_WORD = re.compile(r"\b(?:mùa hè|mùa nóng|mua he|mua nong|hè)\b", re.IGNORECASE)
_GLUE = {"vao", "trong", "dip", "mua", "cua"}


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFD", str(text or "").lower())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").replace("đ", "d")


def _space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _copy_empty() -> Dict[str, str]:
    return dict(EMPTY_WHEN)


def _month_from(text: str) -> Dict[str, str]:
    cleaned = text
    for item in _OCCASIONS:
        cleaned = re.sub(str(item["pattern"]), " ", cleaned, flags=re.IGNORECASE)
    haystack = f"{cleaned.lower()} {_fold(cleaned)}"
    match = _MONTH.search(haystack)
    if not match:
        return {}
    token = _fold(match.group(1))
    if token in {"nay"}:
        return {"id": "month-current", "label": "tháng này"}
    if token in {"toi", "sau"}:
        return {"id": "month-next", "label": "tháng tới"}
    if token in {"truoc", "roi"}:
        return {"id": "month-prev", "label": "tháng trước"}
    if token in {"qua", "vua qua"}:
        return {"id": "month-prev", "label": "tháng qua"}
    number = int(token)
    if number < 1 or number > 12:
        return {}
    return {"id": f"month-{number}", "label": f"tháng {number}"}


def parse_when(text: str) -> Dict[str, str]:
    """Read a season, a month, or both. Both keeps the season as the search hint."""
    raw = _space(text)
    if not raw:
        return _copy_empty()
    haystack = f"{raw.lower()} {_fold(raw)}"
    occasion: Dict[str, Any] | None = None
    for item in _OCCASIONS:
        if re.search(str(item["pattern"]), haystack, flags=re.IGNORECASE):
            occasion = item
            break
    month = _month_from(raw)
    if occasion is None and not month:
        return _copy_empty()
    if occasion is not None and month:
        return {
            "id": str(occasion["id"]),
            "label": f"{occasion['label']} ({month['label']})",
            "kind": "occasion",
            "query_hint": str(occasion["query_hint"]),
        }
    if occasion is not None:
        return {
            "id": str(occasion["id"]),
            "label": str(occasion["label"]),
            "kind": "occasion",
            "query_hint": str(occasion["query_hint"]),
        }
    return {
        "id": month["id"],
        "label": month["label"],
        "kind": "month",
        "query_hint": "",
    }


def occasion_names(when: Dict[str, Any]) -> List[str]:
    item = _BY_ID.get(str(when.get("id") or ""))
    if item is None:
        return []
    return [str(name) for name in item["names"][:4]]


def strip_when(text: str, when: Dict[str, Any]) -> str:
    """Drop the window words. Leave the product words, including a season already in the name."""
    if not str(when.get("kind") or ""):
        return _space(text)
    cleaned = _MONTH.sub(" ", text)
    cleaned = _DIP.sub(" ", cleaned)
    if str(when.get("kind")) == "occasion":
        cleaned = _VAO.sub(" ", cleaned)
    if str(when.get("id") or "") == "summer":
        cleaned = _SUMMER_WORD.sub(" ", cleaned)
    return _space(cleaned)


def is_window_only(name: str, when: Dict[str, Any]) -> bool:
    """True when the leftover name is the season itself, not a product."""
    if str(when.get("kind") or "") != "occasion":
        return False
    if not _space(name):
        return True
    item = _BY_ID.get(str(when.get("id") or ""))
    folded = _fold(name)
    tokens = [str(when.get("query_hint") or ""), str(when.get("label") or "")]
    if item is not None:
        tokens.extend(str(token) for token in item["aliases"])
    for token in tokens:
        folded_token = _fold(token)
        if not folded_token:
            continue
        folded = re.sub(rf"\b{re.escape(folded_token)}\b", " ", folded)
    words = [word for word in _space(folded).split(" ") if word and word not in _GLUE]
    return not words


def search_query(name: str, when: Dict[str, Any]) -> str:
    """Season hint is added once. A month never changes the words sent to a floor."""
    clean = _space(name)[:80]
    if str(when.get("kind") or "") != "occasion":
        return clean
    hint = _space(str(when.get("query_hint") or ""))
    if not hint or is_window_only(clean, when):
        return clean
    item = _BY_ID.get(str(when.get("id") or ""))
    aliases = [hint, str(when.get("label") or "")]
    if item is not None:
        aliases.extend(str(token) for token in item["aliases"])
    folded = _fold(clean)
    if any(_fold(token) and _fold(token) in folded for token in aliases):
        return clean
    return _space(f"{clean} {hint}")[:80]
