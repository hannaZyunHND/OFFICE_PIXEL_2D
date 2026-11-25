"""Routes chairman sentences without calling a market API."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from market_when import search_query  # noqa: E402
from question_route import route_question, route_question_codex  # noqa: E402


class TestQuestionRoute(unittest.TestCase):
    def test_keyword_market_stays_on_san_cam(self) -> None:
        route = route_question("Thị trường kem chống nắng đang thế nào?")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["platforms"], ["shopee"])
        self.assertEqual(route["names"], ["kem chống nắng"])
        self.assertEqual(route["clarify"], "")
        self.assertLessEqual(len(route["status_text"]), 180)
        self.assertIn("Cam", route["status_text"])

    def test_top_on_san_xanh_keeps_san_cam(self) -> None:
        route = route_question("Top khăn giấy trên Sàn Xanh")
        self.assertEqual(route["intent"], "top_products")
        self.assertEqual(route["platforms"], ["shopee", "lazada"])
        self.assertEqual(route["names"], ["khăn giấy"])

    def test_compare_on_tiktok_keeps_san_cam(self) -> None:
        route = route_question("So quạt mini với quạt điều hòa trên TikTok Shop")
        self.assertEqual(route["intent"], "compare")
        self.assertEqual(route["platforms"], ["shopee", "tiktok_shop"])
        self.assertEqual(route["names"], ["quạt mini", "quạt điều hòa"])

    def test_vague_question_asks_again(self) -> None:
        route = route_question("Thị trường đang thế nào?")
        self.assertEqual(route["intent"], "clarify")
        self.assertEqual(route["platforms"], [])
        self.assertEqual(route["names"], [])
        self.assertTrue(route["clarify"])

    def test_only_san_den_still_includes_san_cam_when_a_name_exists(self) -> None:
        route = route_question("kem chống nắng chỉ xem Sàn Đen")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["platforms"], ["shopee", "tiktok_shop"])

    def test_all_three_floors_and_full_report(self) -> None:
        route = route_question("Làm báo cáo đầy đủ cho khăn giấy")
        self.assertEqual(route["intent"], "full_report")
        self.assertEqual(route["platforms"], ["shopee"])
        both = route_question("Báo cáo đủ ba sàn cho khăn giấy")
        self.assertEqual(both["intent"], "full_report")
        self.assertEqual(both["platforms"], ["shopee", "lazada", "tiktok_shop"])
        self.assertEqual(both["names"], ["khăn giấy"])

    def test_industry_expands_to_four_names(self) -> None:
        route = route_question("Ngành nhà cửa, món nào đang bán?")
        self.assertEqual(route["intent"], "market_category")
        self.assertEqual(route["platforms"], ["shopee"])
        self.assertEqual(len(route["names"]), 4)

    def test_eval_without_a_name_asks_again(self) -> None:
        route = route_question("Đánh giá")
        self.assertEqual(route["intent"], "clarify")
        named = route_question("Đánh giá kem chống nắng Anessa")
        self.assertEqual(named["intent"], "product_eval")
        self.assertIn("Anessa", named["names"][0])

    def test_month_stays_a_window_and_leaves_the_product_name(self) -> None:
        route = route_question("Thị trường kem chống nắng trong tháng 11")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["names"], ["kem chống nắng"])
        self.assertEqual(route["platforms"], ["shopee"])
        self.assertEqual(route["when"]["kind"], "month")
        self.assertEqual(route["when"]["label"], "tháng 11")
        self.assertEqual(route["when"]["query_hint"], "")
        self.assertIn("tháng 11", route["status_text"])
        self.assertNotEqual(route["when"]["id"], "mega_11")
        self.assertEqual(search_query(route["names"][0], route["when"]), "kem chống nắng")

    def test_tet_occasion_is_a_search_parameter(self) -> None:
        route = route_question("Thị trường hộp quà dịp Tết")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["names"], ["hộp quà Tết"])
        self.assertEqual(route["when"]["kind"], "occasion")
        self.assertEqual(route["when"]["id"], "tet")
        self.assertEqual(search_query(route["names"][0], route["when"]), "hộp quà Tết")
        plain = route_question("Thị trường hộp quà")
        self.assertEqual(search_query(plain["names"][0], route["when"]), "hộp quà Tết")

    def test_noel_without_a_product_uses_the_season_names(self) -> None:
        route = route_question("Thị trường dịp Noel")
        self.assertEqual(route["intent"], "market_category")
        self.assertEqual(route["category"], "Noel")
        self.assertGreaterEqual(len(route["names"]), 3)
        self.assertTrue(any("Noel" in name or "Giáng" in name for name in route["names"]))
        self.assertIn("Noel", route["status_text"])
        self.assertEqual(route["platforms"], ["shopee"])

    def test_month_without_a_product_asks_which_name(self) -> None:
        route = route_question("Thị trường trong tháng 11")
        self.assertEqual(route["intent"], "clarify")
        self.assertEqual(route["platforms"], [])
        self.assertIn("Tháng 11", route["clarify"])

    def test_sales_across_floors_keeps_only_the_product_name(self) -> None:
        route = route_question("doanh số lược ngà trên các sàn trong tháng qua như nào nhỉ")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["names"], ["lược ngà"])
        self.assertEqual(route["platforms"], ["shopee", "lazada", "tiktok_shop"])
        self.assertEqual(route["when"]["id"], "month-prev")
        self.assertEqual(route["when"]["label"], "tháng qua")
        self.assertEqual(search_query(route["names"][0], route["when"]), "lược ngà")
        wood = route_question("doanh số sàn gỗ trong tháng qua")
        self.assertEqual(wood["names"], ["sàn gỗ"])
        self.assertEqual(wood["platforms"], ["shopee"])
        dirty = route_question("doanh số lược ngà sàn trong tháng qua như nào nhỉ")
        self.assertEqual(dirty["names"], ["lược ngà"])

    def test_ivory_comb_keyword_is_the_product_not_the_marketplace(self) -> None:
        route = route_question("doanh số bán lược chất liệu ngà trên cả 3 sàn thương mại điện tử nhé")
        self.assertEqual(route["intent"], "market_keyword")
        self.assertEqual(route["names"], ["lược ngà"])
        self.assertEqual(route["platforms"], ["shopee", "lazada", "tiktok_shop"])
        self.assertEqual(route["when"]["kind"], "")
        self.assertEqual(search_query(route["names"][0], route["when"]), "lược ngà")
        machine = route_question("Thị trường máy bán nước")
        self.assertEqual(machine["names"], ["máy bán nước"])
        self.assertEqual(machine["platforms"], ["shopee"])

    def test_codex_keeps_the_product_and_rejects_an_invented_name(self) -> None:
        sentence = "doanh số lược ngà trên các sàn trong tháng qua như nào nhỉ"

        def good(_prompt: str) -> dict:
            return {
                "ok": True,
                "data": {
                    "intent": "market_keyword",
                    "names": ["lược ngà"],
                    "platforms": ["shopee", "lazada", "tiktok_shop"],
                    "when": {"kind": "month", "id": "month-prev", "label": "tháng qua"},
                    "category": "",
                    "clarify": "",
                },
            }

        route = route_question_codex(sentence, runner=good)
        self.assertEqual(route["reader"], "codex")
        self.assertEqual(route["names"], ["lược ngà"])
        self.assertEqual(route["platforms"], ["shopee", "lazada", "tiktok_shop"])
        self.assertEqual(route["when"]["label"], "tháng qua")
        self.assertEqual(search_query(route["names"][0], route["when"]), "lược ngà")
        self.assertIn("Codex", route["status_text"])

        def invented(_prompt: str) -> dict:
            return {"ok": True, "data": {"intent": "market_keyword", "names": ["lược chải tóc nhung"], "platforms": ["shopee"]}}

        rejected = route_question_codex(sentence, runner=invented)
        self.assertEqual(rejected["names"], ["lược ngà"])
        self.assertNotIn("nhung", " ".join(rejected["names"]))

        failed = route_question_codex(sentence, runner=lambda _prompt: {"ok": False})
        self.assertEqual(failed["reader"], "rules")
        self.assertEqual(failed["names"], ["lược ngà"])
        self.assertIn("Luật chữ", failed["status_text"])

        def dirty_span(_prompt: str) -> dict:
            return {
                "ok": True,
                "data": {
                    "intent": "market_keyword",
                    "names": ["bán lược chất liệu ngà cả thương mại điện tử"],
                    "platforms": ["shopee", "lazada", "tiktok_shop"],
                },
            }

        comb = "doanh số bán lược chất liệu ngà trên cả 3 sàn thương mại điện tử nhé"
        tightened = route_question_codex(comb, runner=dirty_span)
        self.assertEqual(tightened["names"], ["lược ngà"])
        self.assertEqual(tightened["platforms"], ["shopee", "lazada", "tiktok_shop"])

    def test_eval_on_a_season_still_asks_which_product(self) -> None:
        route = route_question("Đánh giá dịp Tết")
        self.assertEqual(route["intent"], "clarify")
        self.assertIn("Tết", route["clarify"])
        self.assertEqual(route["when"]["kind"], "occasion")


if __name__ == "__main__":
    unittest.main()
