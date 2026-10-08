#!/usr/bin/env python3
"""Vendor the pinned Apache-2.0 model-viewer web component locally.

A local copy avoids a CDN dependency for GitHub Pages / Android. Keep the
distribution version pinned, and retain the upstream Apache-2.0 license.
"""
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
VERSION = "4.1.0"
URL = f"https://cdnjs.cloudflare.com/ajax/libs/model-viewer/{VERSION}/model-viewer.min.js"
DEST = ROOT / "assets/vendor/model-viewer.min.js"

def main():
    req = Request(URL, headers={"User-Agent": "CamoVault-ModelViewer-Vendor/1.0"})
    with urlopen(req, timeout=45) as response:
        data = response.read(3_500_001)
    if not (100_000 < len(data) < 3_500_000) or b"<html" in data[:300].lower():
        raise RuntimeError("Model-viewer vendor file is not valid JavaScript")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    if not DEST.exists() or DEST.read_bytes() != data:
        DEST.write_bytes(data)
        print("Vendored model-viewer", VERSION, len(data), "bytes")
    else:
        print("Model-viewer already present")

if __name__ == "__main__":
    main()
