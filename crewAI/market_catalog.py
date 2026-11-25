"""Ten industries the office can measure without guessing new names."""

from __future__ import annotations

import unicodedata
from typing import Dict, List, Optional


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFD", str(text or "").lower())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").replace("đ", "d")


INDUSTRIES: List[Dict[str, List[str] | str]] = [
    {"label": "mỹ phẩm", "names": ["kem chống nắng", "serum", "son môi", "sữa rửa mặt"]},
    {"label": "mẹ và bé", "names": ["tã bỉm", "bình sữa", "xe đẩy", "đồ chơi trẻ em"]},
    {"label": "nhà cửa", "names": ["bàn gỗ", "ghế gỗ", "kệ gỗ", "đèn ngủ"]},
    {"label": "đồ gỗ", "names": ["bàn gỗ", "ghế gỗ", "kệ gỗ", "tủ gỗ"]},
    {"label": "đồ ăn", "names": ["mì ăn liền", "cà phê", "bánh kẹo", "nước mắm"]},
    {"label": "đồ điện", "names": ["tai nghe", "sạc dự phòng", "quạt mini", "đèn led"]},
    {"label": "thời trang", "names": ["áo thun", "quần jean", "váy", "túi xách"]},
    {"label": "thể thao", "names": ["giày chạy bộ", "thảm yoga", "áo bóng đá", "bình nước thể thao"]},
    {"label": "thú cưng", "names": ["thức ăn cho chó", "cát vệ sinh mèo", "vòng cổ chó", "đồ chơi cho mèo"]},
    {"label": "văn phòng phẩm", "names": ["bút bi", "sổ tay", "giấy in", "kẹp tài liệu"]},
]


def lookup_industry(text: str) -> Optional[Dict[str, List[str] | str]]:
    folded = _fold(text)
    for industry in sorted(INDUSTRIES, key=lambda row: len(str(row["label"])), reverse=True):
        if _fold(str(industry["label"])) in folded:
            return industry
    return None
