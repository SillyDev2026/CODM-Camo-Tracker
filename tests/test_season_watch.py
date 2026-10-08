import unittest
from scripts.season_watch import new_articles

BASE = "https://www.callofduty.com/blog/2026/10/call-of-duty-mobile-season-9-vampires-werewolves"
NEW = "https://www.callofduty.com/blog/2026/11/call-of-duty-mobile-season-10-future"

class SeasonWatchTest(unittest.TestCase):
    def test_new_before_baseline(self):
        html = f'<a href="{NEW}">new</a><a href="{BASE}">old</a>'
        self.assertEqual(new_articles(html,BASE),[NEW])
    def test_baseline_missing_does_not_flood(self):
        self.assertEqual(new_articles(f'<a href="{NEW}">new</a>',BASE),[])
    def test_ignores_external_and_unknown_content(self):
        html = f'<a href="https://evil.example/blog/2026/11/call-of-duty-mobile-season-10-future"></a><a href="{BASE}"></a>'
        self.assertEqual(new_articles(html,BASE),[])

if __name__ == "__main__":
    unittest.main()
