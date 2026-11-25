"""Report numbers stay on the layer they came from. No live calls."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from market_answer import render_prose  # noqa: E402
from market_metrics import build_floor_sample  # noqa: E402
from market_report import render_report_html  # noqa: E402


def _live_result() -> dict:
    return {
        "ok": True,
        "mode": "live",
        "provider": "test",
        "data": {
            "items": [
                {
                    "title": "Kem mẫu",
                    "price_vnd": 999999,
                    "sold_30d": 5265,
                    "gmv_30d_vnd": 5264994735,
                    "sold_7d": 2160,
                    "sold_window_30d": 3675,
                    "sold_all": 5265,
                    "gmv_window_30d": 3340905750,
                    "gmv_all": 5264994735,
                    "shop_name": "Nhà mẫu",
                    "shop_id": "562665255",
                    "shop_url": "https://shopee.vn/shop/562665255",
                    "image_url": "https://cf.shopee.vn/file/sg-11134207-example",
                    "url": "https://shopee.vn/product/562665255/23765209302",
                    "rating": 4.9,
                    "commission_pct": 7.5,
                    "price_min_vnd": 860000,
                    "price_max_vnd": 999999,
                    "price_cv": 0.0498,
                    "days_tracked": 59,
                    "growth": 2.519,
                    "item_id": "23765209302",
                }
            ],
            "market_summary": {
                "market": {
                    "totalProducts": 28926,
                    "totalShops": 7036,
                    "totalSold": 727121,
                    "totalRevenue": 259973337976,
                    "avgPrice": 389428,
                    "minPrice": 1000,
                    "maxPrice": 71500000,
                    "avgCommissionRate": 0.0883,
                    "maxCommissionRate": 0.87,
                    "productsWithSales": 7619,
                    "sellThroughRate": 0.2634,
                    "hhi": 0.0275,
                    "blueOceanScore": 40.7,
                },
                "last30Days": {
                    "totalSold": 52570,
                    "totalRevenue": 23073602855,
                    "trackedProducts": 8603,
                    "coverage": 0.2974,
                },
                "giftsExcluded": {"products": 241, "revenue": 46352133903},
                "scopeNote": "Crawled data only. totalSold is an under-estimate.",
                "topShops": [{"shopId": 562665255, "revenue": 29088747746, "products": 30}],
            },
        },
    }


class TestMarketReport(unittest.TestCase):
    def test_market_totals_are_not_replaced_by_the_top_item(self) -> None:
        sample = build_floor_sample("kem chống nắng", "shopee", _live_result())
        self.assertEqual(sample["scope"], "market_block")
        self.assertEqual(sample["avg_price_vnd"], 389428)
        self.assertEqual(sample["hhi"], 0.0275)
        self.assertEqual(sample["blue_ocean_score"], 40.7)
        self.assertEqual(sample["blue_ocean_label"], "Trung bình")
        self.assertEqual(sample["sweet_spot_label"], "")
        self.assertEqual(sample["avg_commission_pct"], 8.83)
        self.assertEqual(sample["window_tracked_30d"]["total_sold"], 52570)
        self.assertEqual(sample["gifts_excluded"]["products"], 241)
        self.assertEqual(sample["top_shops"][0]["shop_name"], "Nhà mẫu")
        self.assertEqual(sample["top_shops"][0]["share_pct"], 11.2)
        self.assertEqual(sample["items"][0]["growth"], 2.519)
        self.assertTrue(sample["items"][0]["image_url"].startswith("https://cf.shopee.vn/"))
        route = {
            "intent": "market_keyword",
            "names": ["kem chống nắng"],
            "when": {"kind": "month", "label": "tháng 11", "query_hint": ""},
        }
        prose = render_prose(route, [sample], [])
        self.assertIn("389.428", prose)
        self.assertIn("0.0275", prose)
        self.assertIn("40.7", prose)
        self.assertNotIn("999.999", prose)
        self.assertIn("không phải tháng lịch", prose)
        page = render_report_html("Kem", prose, [sample], ["kem chống nắng cho da dầu"])
        self.assertIn("Khoảng giá", page)
        self.assertIn("danh sách đang xem", page)
        self.assertIn("cf.shopee.vn", page)
        self.assertIn("2,519", page)
        self.assertNotIn("Đại dương xanh", page)
        self.assertIn("Trung bình", page)
        self.assertIn("tab-btn", page)
        self.assertIn("Sàn Cam", page)
        self.assertIn("Trước", page)
        self.assertIn("Sau", page)
        self.assertIn('class="help"', page)
        self.assertIn("Là gì", page)
        self.assertIn("Tính từ", page)
        self.assertIn("Dùng để", page)
        self.assertIn("khối tổng", page)
        self.assertNotIn("mẫu vừa lấy", page)

    def test_missing_rating_is_not_filled(self) -> None:
        sample = build_floor_sample(
            "quạt",
            "lazada",
            {
                "ok": True,
                "mode": "live",
                "data": {
                    "items": [
                        {
                            "title": "Quạt không điểm",
                            "price_vnd": 120000,
                            "sold_30d": 10,
                            "gmv_30d_vnd": 1200000,
                            "shop_name": "Shop gió",
                            "url": "https://www.lazada.vn/example",
                            "rating": None,
                            "item_id": "laz-1",
                        }
                    ]
                },
            },
        )
        page = render_report_html("Quạt", "Mẫu.", [sample], [])
        self.assertIn("Mẫu tìm kiếm", page)
        self.assertIn("mẫu vừa lấy", page)
        self.assertNotIn("4.7", page)
        self.assertNotIn("4,7", page)


if __name__ == "__main__":
    unittest.main()
