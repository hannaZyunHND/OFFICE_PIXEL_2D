"""Sandbox runs for Product Hunter v2. No live market calls."""

from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile
import unittest
from typing import Any, Dict, List, Tuple
from unittest.mock import patch

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from flows.product_hunter_v2_flow import _tool_args, run_product_hunter_v2_flow  # noqa: E402
from pixel_office_sdk import PixelOfficeBridge  # noqa: E402


def _trace(bridge: PixelOfficeBridge) -> Tuple[List[str], List[Tuple[str, str]], List[str]]:
    tools: List[str] = []
    handoffs: List[Tuple[str, str]] = []
    queries: List[str] = []
    for event in bridge.event_history:
        if event.get("event_type") == "AGENT_TOOL_CALL":
            payload = (event.get("metadata") or {}).get("input_payload") or {}
            name = str(payload.get("external_function") or "")
            if name:
                tools.append(name)
            if name == "addlivetag_market_search":
                queries.append(str((payload.get("args") or {}).get("query") or ""))
        if event.get("event_type") == "AGENT_HANDOFF":
            handoffs.append((str(event.get("agent_id")), str(event.get("target_agent_id") or "")))
    return tools, handoffs, queries


class TestProductHunterV2Flow(unittest.IsolatedAsyncioTestCase):
    async def _run(self, prompt: str) -> Tuple[Dict[str, Any], List[str], List[Tuple[str, str]], Path]:
        bridge = PixelOfficeBridge()
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        with patch.dict(
            os.environ,
            {
                "ADDLIVETAG_API_KEY": "",
                "APIFY_API_TOKEN": "",
                "SERPER_API_KEY": "",
                "TELEGRAM_BOT_TOKEN": "",
                "TELEGRAM_CHAT_ID": "",
                "REPORT_PUBLISH": "off",
                "QUESTION_READER": "rules",
            },
            clear=False,
        ):
            result = await run_product_hunter_v2_flow(
                keyword_prompt=prompt,
                bridge=bridge,
                output_root=Path(tmp.name),
                step_delay=0,
                options={"extras": {"allowSandboxFallback": True}},
            )
        tools, handoffs, queries = _trace(bridge)
        result["queries"] = queries
        return result, tools, handoffs, Path(tmp.name)

    def test_san_cam_asks_for_every_page(self) -> None:
        tool, args = _tool_args("shopee", "ps5", 20)
        self.assertEqual(tool, "addlivetag_market_search")
        self.assertEqual(args["max_items"], 0)
        _other, lazada = _tool_args("lazada", "ps5", 20)
        self.assertEqual(lazada["max_items"], 20)
        _other, tiktok = _tool_args("tiktok_shop", "ps5", 20)
        self.assertEqual(tiktok["max_items"], 20)

    async def test_keyword_measures_san_cam_only(self) -> None:
        result, tools, handoffs, _root = await self._run("Thị trường kem chống nắng đang thế nào?")
        self.assertIn("addlivetag_market_search", tools)
        self.assertIn("serper_ecommerce_search", tools)
        self.assertNotIn("apify_lazada_search", tools)
        self.assertNotIn("apify_tiktok_shop_search", tools)
        self.assertIn(("agent_v2_router", "agent_v2_market_keyword"), handoffs)
        self.assertIn(("agent_v2_router", "agent_v2_san_cam"), handoffs)
        self.assertNotIn(("agent_v2_router", "agent_v2_san_xanh"), handoffs)
        self.assertNotIn(("agent_v2_router", "agent_v2_san_den"), handoffs)
        self.assertIn("HHI", result["answer"])
        page = Path(_root) / "product_hunter_v2" / result["slug"] / "index.html"
        self.assertTrue(page.is_file())

    async def test_san_xanh_is_added_without_tiktok(self) -> None:
        _result, tools, handoffs, _root = await self._run("Top khăn giấy trên Sàn Xanh")
        self.assertIn("addlivetag_market_search", tools)
        self.assertIn("apify_lazada_search", tools)
        self.assertNotIn("apify_tiktok_shop_search", tools)
        self.assertIn(("agent_v2_router", "agent_v2_san_xanh"), handoffs)
        self.assertNotIn(("agent_v2_router", "agent_v2_san_den"), handoffs)
        self.assertNotIn("agent_shopee_hunter", " ".join(agent for pair in handoffs for agent in pair))

    async def test_vague_question_does_not_measure(self) -> None:
        result, tools, handoffs, root = await self._run("Thị trường đang thế nào?")
        self.assertEqual(result["route"]["intent"], "clarify")
        self.assertNotIn("addlivetag_market_search", tools)
        self.assertNotIn("apify_lazada_search", tools)
        self.assertNotIn(("agent_v2_router", "agent_v2_san_cam"), handoffs)
        self.assertEqual(list(root.glob("product_hunter_v2/**/index.html")), [])

    async def test_full_report_stays_on_v2_desks(self) -> None:
        result, _tools, handoffs, root = await self._run("Làm báo cáo đầy đủ cho khăn giấy")
        self.assertIn(("agent_v2_router", "agent_v2_full_report"), handoffs)
        self.assertNotIn("agent_shopee_hunter", " ".join(agent for pair in handoffs for agent in pair))
        page = Path(root) / "product_hunter_v2" / result["slug"] / "index.html"
        text = page.read_text(encoding="utf-8")
        self.assertIn("Khoảng giá", text)

    async def test_month_is_named_but_not_appended_to_the_search(self) -> None:
        result, tools, _handoffs, _root = await self._run("Thị trường kem chống nắng trong tháng 11")
        self.assertEqual(result["route"]["when"]["kind"], "month")
        self.assertIn("addlivetag_market_search", tools)
        self.assertEqual(result["queries"], ["kem chống nắng"])
        self.assertIn("tháng 11", result["answer"])
        self.assertIn("không phải số riêng", result["answer"])

    async def test_tet_search_keeps_the_season_on_the_product(self) -> None:
        result, _tools, _handoffs, _root = await self._run("Thị trường hộp quà dịp Tết")
        self.assertEqual(result["route"]["when"]["id"], "tet")
        self.assertEqual(result["queries"], ["hộp quà Tết"])
        self.assertIn("Tết", result["answer"])


if __name__ == "__main__":
    unittest.main()
