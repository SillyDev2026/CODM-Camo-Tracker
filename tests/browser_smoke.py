"""Smoke-test the actual GitHub Pages browser startup with real browser storage."""
import contextlib
import http.server
import socketserver
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *_args):
        pass

def wait_ready(page, errors):
    try:
        page.locator(".weapon-card").first.wait_for(timeout=15000)
    except Exception:
        raise AssertionError("Tracker startup failed. Browser errors: " + repr(errors) +
            " | body=" + page.locator("body").inner_text()[:500] +
            " | scripts=" + str(page.evaluate("Array.from(document.scripts).map(x=>({src:x.src,type:x.type}))")))
    if errors:
        raise AssertionError("Browser errors: " + repr(errors))

def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = "http://127.0.0.1:" + str(server.server_port) + "/"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 375, "height": 812})
            errors = []
            page.on("pageerror", lambda error: errors.append("JS: " + str(error)))
            page.on("console", lambda msg: errors.append("Console: " + msg.text) if msg.type == "error" else None)
            page.on("requestfailed", lambda request: errors.append("Request failed: " + request.url + " " + str(request.failure)))
            page.on("response", lambda response: errors.append("HTTP " + str(response.status) + ": " + response.url) if response.status >= 400 and response.url.startswith(url) else None)
            page.goto(url, wait_until="domcontentloaded")
            wait_ready(page, errors)
            print("Startup passed with IndexedDB")
            dimensions = page.evaluate("({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
            print("Mobile layout dimensions:", dimensions)
            assert dimensions["scroll"] <= dimensions["width"], "Mobile layout has horizontal overflow"
            for width in [320, 360, 375, 414, 768, 1024, 1440]:
                page.set_viewport_size({"width": width, "height": 850})
                dims = page.evaluate("({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
                assert dims["scroll"] <= dims["width"], f"Horizontal scroll at {width}px: {dims}"
            page.set_viewport_size({"width": 375, "height": 812})
            assert page.locator("#seasonTitle").count() == 1, "Season command missing"
            assert page.locator("#focusResume").count() == 1, "Continue button missing"
            assert page.locator('[data-quick="smg:qq9"]').count() == 1, "One-tap Gold action missing"
            page.locator("#weaponSearch").fill("qq9")
            assert page.locator(".weapon-card").count() == 1, "Search is not narrowing results"
            assert page.locator('[data-quick="smg:qq9"]').count() == 1, "Search dropped Gold quick action"
            assert page.locator('[data-fav="smg:qq9"]').count() == 1, "Search dropped favorite button"
            page.locator("#sortBy").select_option("az")
            assert page.locator('[data-quick="smg:qq9"]').count() == 1, "Sorting dropped quick actions"
            page.locator('[data-filter="unstarted"]').click()
            assert page.locator('[data-quick="smg:qq9"]').count() == 1, "Filtering dropped quick actions"
            page.locator('[data-filter="all"]').click()
            page.locator("#weaponSearch").fill("")
            assert page.locator('[data-quick="smg:qq9"]').count() == 1, "Restoring results dropped quick actions"
            # New Gunsmith editor is reachable from every weapon card.
            page.locator('[data-build="smg:qq9"]').click()
            assert page.locator("#gunsmithModal").is_visible(), "Gunsmith modal did not open"
            assert page.locator("#gunsmithName").inner_text() == "QQ9"
            assert page.locator("#gunsmithCanvas").is_visible()
            page.wait_for_timeout(120)
            assert page.locator("#gunsmithCanvas").evaluate("(c) => c.width > 10 && c.height > 10"), "3D canvas not initialized"
            page.locator('[data-gs-slot="optic"]').fill("Red Dot Sight")
            page.locator('[data-gs-slot="optic"]').dispatch_event("change")
            assert page.locator("#gunsmithCapacity").inner_text().startswith("1 / 5")
            page.locator('[data-gs-preset="1"]').click()
            page.locator('[data-gs-slot="muzzle"]').fill("Suppressor")
            page.locator('[data-gs-slot="muzzle"]').dispatch_event("change")
            page.locator('[data-gs-preset="0"]').click()
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight"
            assert page.locator('[data-gs-slot="muzzle"]').input_value() == ""
            page.locator('[data-gs-stat="Accuracy"]').fill("85")
            page.locator('[data-gs-stat="Accuracy"]').dispatch_event("change")
            page.locator("#gunsmithClose").click()
            assert page.locator("#gunsmithModal").is_hidden(), "Gunsmith modal did not close"
            page.locator('[data-fav="smg:qq9"]').click()
            assert page.locator('[data-fav="smg:qq9"]').get_attribute("aria-label").startswith("Remove favorite"), "Quick favorite toggle failed"
            page.locator('[data-quick="smg:qq9"]').click()
            page.locator('[data-weapon="smg:qq9"]').click()
            assert page.locator('input[data-tier="gold"]').is_checked(), "Gold quick toggle failed"
            page.locator('#weaponNotes').fill('Note saved when drawer is closed')
            page.locator('[data-action="close-drawer"]').click()
            page.wait_for_timeout(180)
            page.locator('[data-mode="zombies"]').last.click()
            page.locator('[data-weapon="smg:qq9"]').click()
            page.locator('input[data-zombie-check="aetherCrystal"]').check()
            page.locator('input[data-zombie-number="matches"]').fill("3")
            page.locator('input[data-zombie-number="matches"]').dispatch_event("change")
            page.locator('[data-action="close-drawer"]').click()
            page.wait_for_timeout(600)
            page.reload()
            wait_ready(page, errors)
            assert page.locator('[data-mode="zombies"].mode-tab').get_attribute("aria-pressed") == "true", "Mode preference did not persist"
            page.locator('[data-mode="mp"].mode-tab').click()
            page.locator('[data-build="smg:qq9"]').click()
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight", "Saved loadout missing after reload"
            assert page.locator('[data-gs-stat="Accuracy"]').input_value() == "85", "Saved build stat missing after reload"
            page.locator('[data-gs-preset="1"]').click()
            assert page.locator('[data-gs-slot="muzzle"]').input_value() == "Suppressor", "Second loadout lost"
            page.locator("#gunsmithClose").click()
            page.locator('[data-weapon="smg:qq9"]').click()
            assert page.locator('input[data-tier="gold"]').is_checked(), "Gold data lost on reload"
            assert page.locator('#weaponNotes').input_value() == 'Note saved when drawer is closed', "Notes were lost after editor close"
            page.locator('[data-action="close-drawer"]').click()
            page.locator('[data-mode="zombies"]').last.click()
            page.locator('[data-weapon="smg:qq9"]').click()
            assert page.locator('input[data-zombie-check="aetherCrystal"]').is_checked(), "Zombies data lost on reload"
            assert page.locator('input[data-zombie-number="matches"]').input_value() == "3"
            print("MP and Zombies data survive reload; mode preference and quick actions work")
            print("Quick camo controls survive sorting/search/filters; responsive widths 320–1440px fit")
            assert page.locator("#seasonTitle").is_visible(), "Season hub is not visible"
            page.close()
            context = browser.new_context(viewport={"width": 375, "height": 812})
            context.add_init_script("Object.defineProperty(window, 'indexedDB', {value:undefined, configurable:true});")
            other = context.new_page()
            other.on("pageerror", lambda error: errors.append(str(error)))
            other.goto(url, wait_until="domcontentloaded")
            wait_ready(other, errors)
            print("Storage fallback startup passed")
            context.close()
            browser.close()
    finally:
        server.shutdown()

if __name__ == "__main__":
    main()
