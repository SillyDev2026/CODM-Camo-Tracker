#!/usr/bin/env python3
"""Report new official COD Mobile season articles for review. Never imports weapons."""
import json
import re
import sys
from html.parser import HTMLParser
from datetime import date, timedelta
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from pathlib import Path

OFFICIAL = "https://www.callofduty.com/blog/mobile"
PATTERN = re.compile(r"^/blog/20\d{2}/\d{2}/(?:introducing-)?call-of-duty-mobile-season-\d+[-a-z0-9]*$")
ROOT = Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        url = urljoin(OFFICIAL, href).split("?")[0].rstrip("/")
        parsed = urlparse(url)
        if parsed.netloc in ("www.callofduty.com", "callofduty.com") and PATTERN.fullmatch(parsed.path) and url not in self.urls:
            self.urls.append(url)

def new_articles(html, baseline, today=None):
    parser = Links()
    parser.feed(html)
    if not parser.urls:
        return []
    if baseline in parser.urls:
        return parser.urls[:parser.urls.index(baseline)][:4]
    # After several seasons the baseline can disappear from the blog landing
    # page. Continue finding recently announced seasons instead of going silent.
    today = today or date.today()
    cutoff = today - timedelta(days=100)
    recent = []
    for url in parser.urls:
        parsed = urlparse(url).path.split("/")
        year, month = int(parsed[2]), int(parsed[3])
        article_month = date(year, month, 1)
        if article_month >= date(cutoff.year, cutoff.month, 1):
            recent.append(url)
    return recent[:4]

def main():
    watch = json.loads((ROOT/"data"/"season-watch.json").read_text(encoding="utf-8"))
    request = Request(OFFICIAL, headers={"User-Agent": "CamoVault-SeasonWatcher/1.0 (+https://github.com/SillyDev2026/CODM-Camo-Tracker)"})
    try:
        with urlopen(request, timeout=25) as response:
            raw = response.read(3_000_000)
        candidates = new_articles(raw.decode("utf-8", errors="replace"), watch["baseline"])
    except Exception as error:
        print("Warning: season watcher could not read the official CODM blog:", error, file=sys.stderr)
        candidates = []
    (ROOT/"season-candidates.json").write_text(json.dumps(candidates, indent=2), encoding="utf-8")
    print("Found", len(candidates), "new official season announcement(s), pending review")

if __name__ == "__main__":
    main()
