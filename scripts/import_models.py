#!/usr/bin/env python3
"""Import pinned CC0 GLB models into the GitHub Pages repository.

Runs in GitHub Actions, using public upstream assets. Does not use/require
any Activision assets, credentials, game file extraction or user uploads.
"""
from __future__ import annotations

import json
import pathlib
import struct
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets" / "models" / "manifest.json"
HEADERS = {"User-Agent": "CamoVault-CC0-Model-Importer/1.0"}


def source_url(model: dict) -> str:
    repo = model["sourceRepo"]
    revision = model["sourceCommit"]
    if repo not in {"petroulacl/fps-asset-kit", "Hidencod/tge-assets"}:
        raise ValueError("Unknown asset source repo")
    if len(revision) != 40 or not all(char in "0123456789abcdef" for char in revision):
        raise ValueError("Source commit must be pinned to SHA40")
    if model["license"] != "CC0-1.0":
        raise ValueError("Importer only accepts audited CC0 assets")
    if ".." in pathlib.PurePosixPath(model["sourcePath"]).parts:
        raise ValueError("Unsafe source path")
    return "https://raw.githubusercontent.com/" + repo + "/" + revision + "/" + urllib.parse.quote(model["sourcePath"], safe="/-_.~")


def validated_glb(content: bytes) -> bool:
    if not (20 <= len(content) <= 1_500_000):
        return False
    magic, version, size = struct.unpack_from("<4sII", content, 0)
    return magic == b"glTF" and version == 2 and size == len(content)


def import_models(fetcher=None) -> list[str]:
    models = json.loads(MANIFEST.read_text(encoding="utf-8"))["models"]
    if set(models) != {"ar", "smg", "lmg", "sniper", "marksman", "shotgun", "pistol", "melee", "launcher"}:
        raise ValueError("Expected exactly the nine supported weapon classes")
    changed = []
    for weapon_class, model in models.items():
        expected_path = "assets/models/" + weapon_class + ".glb"
        if model["file"] != expected_path:
            raise ValueError("Unexpected model asset destination")
        url = source_url(model)
        if fetcher:
            content = fetcher(url)
        else:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=45) as response:
                content = response.read(1_500_001)
        if not validated_glb(content):
            raise ValueError("Downloaded asset is not a valid bounded glTF 2.0 binary: " + weapon_class)
        dest = ROOT / expected_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_bytes() == content:
            print(weapon_class, "unchanged", len(content), "bytes")
            continue
        dest.write_bytes(content)
        changed.append(expected_path)
        print(weapon_class, "imported", len(content), "bytes")
    return changed


if __name__ == "__main__":
    changes = import_models()
    print("Updated", len(changes), "licensed GLB model assets.")
