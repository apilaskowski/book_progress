"""
Unit tests for site builder and frontend assets.
"""

import json
import os
import tempfile
import unittest
from src.builder import build

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(REPO_ROOT, "docs")
DATA_PATH = os.path.join(REPO_ROOT, "data", "books.json")


class TestSiteBuilder(unittest.TestCase):
    def test_build_creates_data_json(self):
        """Verify build writes valid data.json with complete analytics."""
        with tempfile.TemporaryDirectory() as temp_out:
            payload = build(output_dir=temp_out, data_path=DATA_PATH)
            
            data_file = os.path.join(temp_out, "data.json")
            self.assertTrue(os.path.isfile(data_file))

            with open(data_file, "r", encoding="utf-8") as f:
                saved = json.load(f)

            self.assertIn("kpis", saved)
            self.assertIn("yearly_stats", saved)
            self.assertIn("books", saved)
            self.assertIn("timeline", saved)
            self.assertIn("monthly_stats", saved)
            self.assertGreaterEqual(len(saved["books"]), 2)
            self.assertGreaterEqual(saved["kpis"]["total_finished_books"], 2)

    def test_frontend_assets_exist(self):
        """Verify core HTML, CSS, JS, and favicon frontend files exist and are non-empty."""
        index_html = os.path.join(DOCS_DIR, "index.html")
        style_css = os.path.join(DOCS_DIR, "style.css")
        app_js = os.path.join(DOCS_DIR, "app.js")
        favicon_svg = os.path.join(DOCS_DIR, "favicon.svg")

        self.assertTrue(os.path.isfile(index_html))
        self.assertTrue(os.path.isfile(style_css))
        self.assertTrue(os.path.isfile(app_js))
        self.assertTrue(os.path.isfile(favicon_svg))

        self.assertGreater(os.path.getsize(index_html), 500)
        self.assertGreater(os.path.getsize(style_css), 1000)
        self.assertGreater(os.path.getsize(app_js), 1000)
        self.assertGreater(os.path.getsize(favicon_svg), 200)

    def test_html_contains_critical_dom_elements(self):
        """Verify index.html contains necessary hooks for app.js and favicon."""
        index_html = os.path.join(DOCS_DIR, "index.html")
        with open(index_html, "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn('rel="icon"', html)
        self.assertIn('href="favicon.svg"', html)
        self.assertIn('id="kpi-books"', html)
        self.assertIn('id="kpi-pages"', html)
        self.assertIn('id="kpi-audio"', html)
        self.assertIn('id="kpi-words"', html)
        self.assertIn('id="theme-toggle"', html)
        self.assertIn('id="reading-books-list"', html)
        self.assertIn('id="yearly-sections-container"', html)
        self.assertIn('id="cumulativeChart"', html)
        self.assertIn('id="monthlyChart"', html)
        self.assertIn('id="genreChart"', html)
        self.assertIn('id="formatChart"', html)


if __name__ == "__main__":
    unittest.main()
