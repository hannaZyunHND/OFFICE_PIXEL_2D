"""Pure tests for the GitHub Pages report publisher. No network."""

from __future__ import annotations

import os
from pathlib import Path
import sys
import unittest
import urllib.error
from unittest.mock import patch

CREWAI_DIR = Path(__file__).resolve().parents[1]
if str(CREWAI_DIR) not in sys.path:
    sys.path.insert(0, str(CREWAI_DIR))

from publish_pages import (  # noqa: E402
    pages_site_url,
    publish_enabled,
    publish_product_report,
    render_catalog,
    wait_until_live,
)


class TestPublishPages(unittest.TestCase):
    def test_pages_url_uses_lowercase_host(self) -> None:
        self.assertEqual(
            pages_site_url("HannaZyun", "pixel-office-reports", "hop_dung"),
            "https://hannazyun.github.io/pixel-office-reports/hop_dung/",
        )

    def test_catalog_escapes_title(self) -> None:
        html = render_catalog([("hop_dung", 'Báo cáo <script>alert("x")</script>')])
        self.assertIn('href="./hop_dung/"', html)
        self.assertNotIn("<script>alert", html)
        self.assertIn("&lt;script&gt;", html)

    def test_wait_until_live_retries_a_404(self) -> None:
        calls = {"n": 0}

        def fake_open(request, timeout=15):
            calls["n"] += 1
            if calls["n"] == 1:
                raise urllib.error.HTTPError(request.full_url, 404, "missing", None, None)

            class Response:
                status = 200

                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return False

            return Response()

        with patch("publish_pages.urllib.request.urlopen", fake_open), patch("publish_pages.time.sleep"):
            self.assertTrue(wait_until_live("https://example.github.io/report/", attempts=3, pause=0))
        self.assertEqual(calls["n"], 2)

    def test_publish_skips_when_disabled(self) -> None:
        with patch.dict(os.environ, {"REPORT_PUBLISH": "off"}, clear=False):
            self.assertFalse(publish_enabled())
            self.assertEqual(publish_product_report(Path("missing.html"), "hop", "Hop"), "")


if __name__ == "__main__":
    unittest.main()
