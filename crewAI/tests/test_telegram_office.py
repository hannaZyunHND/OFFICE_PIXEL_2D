"""Offline tests for the chairman Telegram helpers. No network."""

from __future__ import annotations

import asyncio
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from telegram_office import (  # noqa: E402
    build_delivery_message,
    clean_request_text,
    decode_jpeg,
    is_command,
    pick_group_chat,
)
from tool_registry import DEFAULT_TOOL_REGISTRY  # noqa: E402
import telegram_office  # noqa: E402,F401


class TestTelegramOffice(unittest.TestCase):
    def test_picks_latest_group_and_ignores_private_chat(self) -> None:
        updates = [
            {"update_id": 1, "message": {"text": "riêng", "chat": {"id": 7, "type": "private", "first_name": "A"}}},
            {"update_id": 2, "message": {"text": "cũ", "chat": {"id": -100, "type": "supergroup", "title": "Cũ"}}},
            {"update_id": 3, "message": {"text": "mới", "chat": {"id": -200, "type": "group", "title": "Chủ tịch"}}},
        ]
        chat = pick_group_chat(updates)
        self.assertIsNotNone(chat)
        assert chat is not None
        self.assertEqual(chat["id"], -200)
        self.assertEqual(chat["title"], "Chủ tịch")

    def test_commands_are_not_product_names(self) -> None:
        self.assertTrue(is_command("/start"))
        self.assertEqual(clean_request_text("  Hộp gỗ   @BaoCaoBot  "), "Hộp gỗ")
        self.assertFalse(is_command("Hộp đựng giấy gỗ"))

    def test_delivery_message_includes_public_link(self) -> None:
        text = build_delivery_message("Hộp gỗ", "https://example.github.io/pixel-office-reports/hop_go/")
        self.assertIn("Hộp gỗ", text)
        self.assertIn("https://example.github.io/pixel-office-reports/hop_go/", text)
        missing = build_delivery_message("Hộp gỗ", "", "đẩy lỗi")
        self.assertIn("chưa có link", missing)
        self.assertIn("đẩy lỗi", missing)
        noted = build_delivery_message(
            "Hộp quà Tết",
            "https://example.github.io/pixel-office-reports/tet/",
            note="Phù hợp nhất: Hộp quà Tết",
        )
        self.assertTrue(noted.startswith("Phù hợp nhất: Hộp quà Tết"))
        self.assertIn("https://example.github.io/pixel-office-reports/tet/", noted)

    def test_decode_jpeg_rejects_non_jpeg(self) -> None:
        self.assertEqual(decode_jpeg(""), b"")
        self.assertEqual(decode_jpeg("aGVsbG8="), b"")

    def test_tools_are_registered(self) -> None:
        names = {item["name"] for item in DEFAULT_TOOL_REGISTRY.list_tools_metadata()}
        self.assertIn("telegram_receive_request", names)
        self.assertIn("telegram_deliver_report", names)
        self.assertIn("telegram_send_office_photo", names)

    def test_deliver_stays_offline_without_token(self) -> None:
        with patch("telegram_office.bot_token", return_value=""), patch(
            "telegram_office.chat_id", return_value=""
        ), patch("telegram_office.publish_product_report", return_value=""):
            result = telegram_office._deliver_report(
                {"html_path": "missing.html", "slug": "hop", "title": "Hộp"},
                {},
            )
        self.assertTrue(result["ok"])
        self.assertEqual(result["mode"], "sandbox")
        self.assertEqual(result["data"]["public_url"], "")
        self.assertFalse(result["data"]["sent"])

    def test_registry_passes_extras_keyword(self) -> None:
        with patch("telegram_office.bot_token", return_value=""), patch(
            "telegram_office.chat_id", return_value=""
        ), patch("telegram_office.publish_product_report", return_value=""):
            result = asyncio.run(
                DEFAULT_TOOL_REGISTRY.invoke(
                    "telegram_deliver_report",
                    {"html_path": "missing.html", "slug": "hop", "title": "Hộp"},
                    extras={},
                )
            )
        self.assertTrue(result["ok"])
        self.assertEqual(result["mode"], "sandbox")
        self.assertEqual(result["data"]["public_url"], "")
        self.assertNotIn("unexpected keyword", str(result.get("error") or ""))
        self.assertNotIn("unexpected keyword", str(result.get("summary") or ""))


if __name__ == "__main__":
    unittest.main()
