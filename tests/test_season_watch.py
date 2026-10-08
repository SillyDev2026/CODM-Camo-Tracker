import unittest
from datetime import date
from scripts.season_watch import new_articles

BASE = "https://www.callofduty.com/blog/2026/10/call-of-duty-mobile-season-9-vampires-werewolves"
NEW = "https://www.callofduty.com/blog/2026/11/call-of-duty-mobile-season-10-future"

class SeasonWatchTest(unittest.TestCase):
    def test_new_before_baseline(self):
        html = f'<a href="{NEW}">new</a><a href="{BASE}">old</a>'
        self.assertEqual(new_articles(html,BASE),[NEW])
    def test_missing_baseline_still_finds_recent_official_season(self):
        self.assertEqual(new_articles(f'<a href="{NEW}">new</a>', BASE, date(2026,11,12)), [NEW])
    def test_missing_baseline_ignores_old_seasons(self):
        old = 'https://www.callofduty.com/blog/2024/01/call-of-duty-mobile-season-1-old'
        self.assertEqual(new_articles(f'<a href="{old}">old</a>', BASE, date(2027,6,12)), [])
    def test_ignores_external_and_unknown_content(self):
        html = f'<a href="https://evil.example/blog/2026/11/call-of-duty-mobile-season-10-future"></a><a href="{BASE}"></a>'
        self.assertEqual(new_articles(html,BASE),[])

if __name__ == "__main__":
    unittest.main()
