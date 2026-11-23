"""Unit tests for External Tool Registry, E-Commerce Providers, HITL Bridge & Autonomous Product Hunter Flow."""

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

from env_loader import get_crew_port, get_crew_portal_base_url, load_project_dotenv  # noqa: E402
from pixel_office_sdk import PixelOfficeBridge  # noqa: E402
from tool_registry import DEFAULT_TOOL_REGISTRY  # noqa: E402
from providers.ecommerce_providers import (  # noqa: E402
    _parse_price_vnd,
    _parse_sold_count,
    _to_commission_pct,
)
from flows.product_hunter_flow import (  # noqa: E402
    _compute_market_overview_metrics,
    run_product_hunter_flow,
)


class TestExternalToolsAndHitl(unittest.IsolatedAsyncioTestCase):
    async def test_registered_tools_and_sandbox_fallback(self) -> None:
        tools = {t["name"]: t for t in DEFAULT_TOOL_REGISTRY.list_tools_metadata()}
        self.assertIn("addlivetag_market_search", tools)
        self.assertIn("addlivetag_product_batch", tools)
        self.assertIn("apify_lazada_search", tools)
        self.assertIn("apify_tiktok_shop_search", tools)
        self.assertIn("serper_ecommerce_search", tools)
        self.assertIn("calc_platform_net_margin", tools)

        with patch.dict(
            os.environ,
            {"ADDLIVETAG_API_KEY": "", "APIFY_API_TOKEN": "", "SERPER_API_KEY": ""},
            clear=False,
        ):
            shopee_res = await DEFAULT_TOOL_REGISTRY.invoke(
                "addlivetag_market_search",
                {"query": "khăn giấy gấu trúc", "max_items": 15},
                extras={},
            )
            self.assertTrue(shopee_res["ok"])
            self.assertEqual(shopee_res["mode"], "sandbox")
            items = shopee_res["data"]["items"]
            self.assertEqual(len(items), 15)

            metrics = _compute_market_overview_metrics(items, platform_key="shopee", mode="sandbox", provider="Test")
            self.assertGreaterEqual(metrics["blue_ocean_score"], 1)
            self.assertLessEqual(metrics["blue_ocean_score"], 100)
            self.assertGreater(metrics["shop_count"], 1)
            self.assertGreater(metrics["hhi"], 0.0)
            self.assertLessEqual(metrics["hhi"], 1.0)
            self.assertGreater(metrics["avg_commission_pct"], 0.0)
            self.assertGreaterEqual(metrics["gift_count"], 1)
            self.assertEqual(len(metrics["price_bins_6"]), 6)

            laz_res = await DEFAULT_TOOL_REGISTRY.invoke(
                "apify_lazada_search",
                {"keyword": "khăn giấy gấu trúc", "max_items": 10},
                extras={},
            )
            laz_metrics = _compute_market_overview_metrics(
                laz_res["data"]["items"], platform_key="lazada", mode="sandbox", provider="Lazada Test"
            )
            self.assertEqual(laz_metrics["avg_commission_display"], "(API đang phát triển)")
            self.assertEqual(laz_metrics["history_coverage_display"], "(API đang phát triển)")

    async def test_hitl_bridge_future_resolution(self) -> None:
        bridge = PixelOfficeBridge()

        async def approve_soon() -> None:
            await asyncio.sleep(0.05)
            ok = bridge.resolve_human_approval(
                "hitl_unit_01",
                {
                    "approval_id": "hitl_unit_01",
                    "decision": "edit",
                    "selected_choices": ["shopee", "tiktok_shop"],
                    "inputs": {"cost_price_vnd": 75000},
                    "note": "Test HITL approval",
                },
            )
            self.assertTrue(ok)

        resolver_task = asyncio.create_task(approve_soon())
        resp = await bridge.request_human_approval(
            agent_id="agent_market_auditor",
            step_title="Gate #2 Test",
            summary_md="Verify HITL pause and resume",
            approval_id="hitl_unit_01",
            timeout_sec=5.0,
        )
        await resolver_task
        self.assertEqual(resp["decision"], "edit")
        self.assertEqual(resp["inputs"]["cost_price_vnd"], 75000)

    async def test_product_hunter_autonomous_default_report(self) -> None:
        bridge = PixelOfficeBridge()
        with patch.dict(
            os.environ,
            {
                "ADDLIVETAG_API_KEY": "",
                "APIFY_API_TOKEN": "",
                "SERPER_API_KEY": "",
                "TELEGRAM_BOT_TOKEN": "",
                "TELEGRAM_CHAT_ID": "",
                "REPORT_PUBLISH": "off",
            },
            clear=False,
        ), patch("telegram_office.bot_token", return_value=""), patch(
            "telegram_office.chat_id", return_value=""
        ), patch("telegram_office.publish_product_report", return_value=""):
            with tempfile.TemporaryDirectory() as tmpdir:
                result = await run_product_hunter_flow(
                    keyword_prompt="khăn giấy gấu trúc",
                    bridge=bridge,
                    output_root=Path(tmpdir),
                    step_delay=0.05,
                    options={},  # Defaults cleanly to auto_skip without pausing for boss
                )
                overall = result["master_blueprint"]["overall"]
                self.assertGreater(overall["sp_count"], 15)
                self.assertGreater(overall["blue_ocean_score"], 0)
                self.assertIn("shopee", result["master_blueprint"]["per_platform"])
                self.assertIn("lazada", result["master_blueprint"]["per_platform"])
                self.assertIn("tiktok_shop", result["master_blueprint"]["per_platform"])

                html_file = Path(tmpdir, "product_hunter", result["slug"], "index.html")
                self.assertTrue(html_file.is_file())
                html_content = html_file.read_text(encoding="utf-8")
                self.assertIn("Điểm Đại dương xanh", html_content)
                self.assertIn("Chỉ số toàn cảnh", html_content)
                self.assertIn("HHI", html_content)
                self.assertIn("Hoa hồng trung bình", html_content)
                self.assertIn("(API đang phát triển)", html_content)
                self.assertIn("Logs Request / Response", html_content)
                self.assertIn("Cách xử lý dữ liệu để ra số liệu", html_content)
                self.assertGreaterEqual(result["master_blueprint"]["api_logs_count"], 6)
                self.assertEqual(result["topic"], "khăn giấy gấu trúc")
                self.assertEqual(result["fit_mode"], "product")
                self.assertTrue(Path(tmpdir, result["zip_filename"]).is_file())

    def test_live_schema_parsers(self) -> None:
        self.assertEqual(_parse_price_vnd("₫88,000"), 88000)
        self.assertEqual(_parse_price_vnd("112670.00"), 112670)
        self.assertEqual(_parse_sold_count("494 sold"), 494)
        self.assertEqual(_parse_sold_count("1.2K sold"), 1200)
        self.assertEqual(_to_commission_pct(0.025), 2.5)
        self.assertEqual(_to_commission_pct(6.3), 6.3)

    def test_dotenv_ports_and_secret_loading(self) -> None:
        env_path = load_project_dotenv()
        self.assertIsNotNone(env_path)
        self.assertEqual(get_crew_port(), 34214)
        self.assertEqual(get_crew_portal_base_url(), "http://localhost:34214")


if __name__ == "__main__":
    unittest.main()
