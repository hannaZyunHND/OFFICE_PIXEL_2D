"""Offline tests for seasonal questions. No Telegram and no market APIs."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from brief_fit import (  # noqa: E402
    interpret_brief,
    propose_category_products,
    propose_products,
    rank_products,
    render_fit_note,
)
from flows.product_hunter_flow import run_product_hunter_flow  # noqa: E402
from pixel_office_sdk import PixelOfficeBridge  # noqa: E402
from tool_registry import DEFAULT_TOOL_REGISTRY  # noqa: E402

WOOD = "Hãy thống kê cho tôi mặt hàng đồ gỗ bán chạy trên các sàn thương mại điện tử Việt"
BOSS = (
    "Hãy phân tích và tư vấn cho tôi để có thể nhập một sản phẩm về bán "
    "theo xu hướng mùa vụ từ nay đến Tết Nguyên Đán"
)


class TestBriefFit(unittest.TestCase):
    def test_boss_question_is_advisory_and_drops_purchasing_words(self) -> None:
        brief = interpret_brief(BOSS)
        self.assertEqual(brief["mode"], "advisory")
        self.assertIn("Tết", brief["window"])
        self.assertEqual(brief["occasion_id"], "tet")
        self.assertIn("nhập sản phẩm", brief["dropped_noise"])
        self.assertIn("về bán", brief["dropped_noise"])
        self.assertEqual(brief["product_name"], "")

        products = propose_products(brief)
        keywords = [item["keyword"] for item in products]
        self.assertGreaterEqual(len(products), 3)
        self.assertLessEqual(len(products), 5)
        self.assertNotIn(BOSS, keywords)
        self.assertTrue(all("nhập" not in name.lower() for name in keywords))
        self.assertTrue(any("Tết" in item["name"] or "tết" in item["keyword"].lower() for item in products))

        note = render_fit_note(
            brief,
            rank_products(
                [
                    {"name": "Hộp quà Tết", "keyword": "hộp quà Tết", "reason": "Quà biếu", "blue_ocean_score": 40, "blue_ocean_label": "Vừa", "sp_count": 20, "shop_count": 8, "avg_price_vnd": 150000, "min_price_vnd": 50000, "max_price_vnd": 400000},
                    {"name": "Lịch để bàn Tết", "keyword": "lịch để bàn Tết", "reason": "Đồ Tết", "blue_ocean_score": 70, "blue_ocean_label": "Thưa", "sp_count": 12, "shop_count": 5, "avg_price_vnd": 80000, "min_price_vnd": 30000, "max_price_vnd": 150000},
                    {"name": "Bánh kẹo Tết", "keyword": "bánh kẹo Tết", "reason": "Hàng ăn", "blue_ocean_score": 20, "blue_ocean_label": "Đông", "sp_count": 80, "shop_count": 40, "avg_price_vnd": 90000, "min_price_vnd": 20000, "max_price_vnd": 200000},
                ]
            ),
        )
        self.assertIn("Tết Nguyên Đán", note)
        self.assertIn("Phù hợp nhất: Lịch để bàn Tết", note)
        self.assertIn("Đứng thứ hai:", note)
        self.assertIn("không còn chỗ", note)
        self.assertNotIn(BOSS, note)

    def test_named_products_stay_on_the_single_product_path(self) -> None:
        for text in ("keycap resin pikachu", "khăn giấy gấu trúc", "phân tích hộp quà tết"):
            brief = interpret_brief(text)
            self.assertEqual(brief["mode"], "product", text)
            self.assertNotIn("nhập", brief["product_name"].lower())
        short = interpret_brief("phân tích hộp quà tết")
        self.assertIn("hộp quà", short["product_name"].lower())

    def test_tools_are_registered(self) -> None:
        names = {item["name"] for item in DEFAULT_TOOL_REGISTRY.list_tools_metadata()}
        self.assertIn("interpret_chairman_brief", names)
        self.assertIn("propose_seasonal_products", names)
        self.assertIn("propose_category_products", names)
        self.assertIn("rank_product_fit", names)

    def test_wood_question_is_a_category_ranked_by_sales(self) -> None:
        brief = interpret_brief(WOOD)
        self.assertEqual(brief["mode"], "category")
        self.assertEqual(brief["category"], "đồ gỗ")
        self.assertEqual(brief["rank_by"], "sales")
        self.assertIn("thống kê", brief["dropped_noise"])
        self.assertIn("mặt hàng", brief["dropped_noise"])
        self.assertIn("các sàn thương mại điện tử", brief["dropped_noise"])
        products = propose_category_products(brief)
        keywords = [item["keyword"] for item in products]
        self.assertIn("bàn gỗ", keywords)
        self.assertIn("ghế gỗ", keywords)
        self.assertNotIn(WOOD, keywords)
        self.assertTrue(all("thống kê" not in name.lower() for name in keywords))
        ranked = rank_products(
            [
                {"name": "Bàn gỗ", "keyword": "bàn gỗ", "total_sold": 10, "total_revenue_vnd": 100},
                {"name": "Tủ gỗ", "keyword": "tủ gỗ", "total_sold": 90, "total_revenue_vnd": 500},
                {"name": "Ghế gỗ", "keyword": "ghế gỗ", "total_sold": 40, "total_revenue_vnd": 200},
            ],
            by="sales",
        )
        self.assertEqual(ranked[0]["name"], "Tủ gỗ")
        note = render_fit_note(brief, ranked)
        self.assertIn("Bán chạy nhất: Tủ gỗ", note)
        self.assertIn("đồ gỗ", note)
        self.assertNotIn(WOOD, note)

    def test_advisory_flow_ranks_products_without_searching_the_sentence(self) -> None:
        bridge = PixelOfficeBridge()
        with patch.dict(
            os.environ,
            {
                "ADDLIVETAG_API_KEY": "",
                "APIFY_API_TOKEN": "",
                "SERPER_API_KEY": "",
                "REPORT_PUBLISH": "off",
            },
            clear=False,
        ), patch("telegram_office.bot_token", return_value=""), patch(
            "telegram_office.chat_id", return_value=""
        ), patch("telegram_office.publish_product_report", return_value=""):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = asyncio.run(
                    run_product_hunter_flow(
                        keyword_prompt=BOSS,
                        bridge=bridge,
                        output_root=Path(tmpdir),
                        step_delay=0,
                        options={},
                    )
                )
                html_file = Path(tmpdir) / "product_hunter" / result["slug"] / "index.html"
                self.assertTrue(html_file.is_file())
                html_content = html_file.read_text(encoding="utf-8")
        self.assertEqual(result["fit_mode"], "advisory")
        self.assertNotEqual(result["topic"], BOSS)
        self.assertNotIn("nhập", result["topic"].lower())
        self.assertIn("tet", result["slug"])
        self.assertGreaterEqual(len(result["fit_ranking"]), 3)
        self.assertTrue(
            any(
                result["topic"].lower() in name.lower() or name.lower() in result["topic"].lower()
                for name in result["fit_ranking"]
            )
        )
        self.assertIn("tết", " ".join(result["fit_ranking"]).lower())
        self.assertIn("Phù hợp nhất", result["fit_note"])
        self.assertIn("nhập sản phẩm", result["fit_note"])
        self.assertNotIn(BOSS, result["fit_note"])
        hero = html_content.split("Logs Request")[0]
        self.assertIn("Xếp hạng sản phẩm phù hợp", hero)
        self.assertIn("Các từ khóa", hero)
        for name in result["fit_ranking"]:
            self.assertIn(name, html_content)
        self.assertNotIn("nhập một sản phẩm về bán", hero)

    def test_category_flow_puts_every_wood_name_in_the_report(self) -> None:
        bridge = PixelOfficeBridge()
        with patch.dict(
            os.environ,
            {
                "ADDLIVETAG_API_KEY": "",
                "APIFY_API_TOKEN": "",
                "SERPER_API_KEY": "",
                "REPORT_PUBLISH": "off",
            },
            clear=False,
        ), patch("telegram_office.bot_token", return_value=""), patch(
            "telegram_office.chat_id", return_value=""
        ), patch("telegram_office.publish_product_report", return_value=""):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = asyncio.run(
                    run_product_hunter_flow(
                        keyword_prompt=WOOD,
                        bridge=bridge,
                        output_root=Path(tmpdir),
                        step_delay=0,
                        options={},
                    )
                )
                html_content = (
                    Path(tmpdir) / "product_hunter" / result["slug"] / "index.html"
                ).read_text(encoding="utf-8")
        self.assertEqual(result["fit_mode"], "category")
        self.assertEqual(result["slug"], "do_go")
        self.assertNotIn("thống kê", result["topic"].lower())
        self.assertIn("Bán chạy nhất", result["fit_note"])
        self.assertIn("đồ gỗ", result["fit_note"])
        self.assertNotIn(WOOD, result["fit_note"])
        self.assertGreaterEqual(len(result["fit_ranking"]), 3)
        self.assertIn("Xếp hạng sức bán", html_content)
        for name in result["fit_ranking"]:
            self.assertIn(name, html_content)


if __name__ == "__main__":
    unittest.main()
