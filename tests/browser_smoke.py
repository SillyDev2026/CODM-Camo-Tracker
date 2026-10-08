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
            assert page.evaluate("document.documentElement.dataset.cvReady") == "true", "Ready signal missing"
            assert page.locator("#categoryChips button").count() >= 9, "Weapon categories are blank"
            assert page.locator("#statsGrid .stat-card").count() == 4, "Progress cards are blank"
            assert page.locator("#weaponGrid .weapon-card").count() >= 100, "Weapon collection is blank"
            page.wait_for_function("document.querySelector('#seasonHealth').textContent.includes('Catalog checked') || document.querySelector('#seasonHealth').textContent.includes('Offline:')", timeout=12000)
            assert page.locator("#startupRecovery").is_hidden(), "Startup watchdog triggered incorrectly"
            page.wait_for_timeout(100)
            focus = page.locator("#focusTitle").bounding_box()
            assert focus and focus["width"] >= 155, f"Continue card text squeezed: {focus}"
            print("Weapon categories, stats, roster and Continue card fit Android viewport")
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
            page.locator("#gunsmithModal").wait_for(state="visible", timeout=15000)
            assert page.locator("#gunsmithName").inner_text() == "QQ9"
            page.wait_for_function("customElements.get('model-viewer') !== undefined", timeout=15000)
            model = page.locator("#gunsmithModal model-viewer.gs-real-model")
            assert model.count() == 1, "Imported GLB viewer is missing"
            assert model.get_attribute("src").endswith("/assets/models/smg.glb"), "Not loading self-hosted SMG model"
            model.wait_for(state="visible", timeout=25000)
            assert page.locator("#gunModelLabel").inner_text() == "IMPORTED CC0 GLB · REAL MESH", "3D model did not load"
            print("Real licensed GLB 3D model rendered in Chromium")
            assert "GENERAL SUGGESTIONS" not in page.locator("#gunsmithCoverage").inner_text()
            page.locator('[data-gs-slot="optic"]').select_option("__custom__")
            assert page.locator('[data-gs-custom="optic"]').is_visible()
            page.locator('[data-gs-custom="optic"]').fill("Red Dot Sight")
            page.locator('[data-gs-custom="optic"]').dispatch_event("change")
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight"
            assert "Red Dot Sight" in page.locator("#gunsmithMyParts").inner_text()
            assert page.locator("#gunsmithCapacity").inner_text().startswith("1 / 5")
            page.locator("#gunsmithFocus").select_option("control")
            assert "recoil" in page.locator("#gunsmithFocusTip").inner_text().lower()
            page.locator('[data-gs-preset="1"]').click()
            page.locator('[data-gs-slot="muzzle"]').select_option("OWC Light Compensator")
            page.locator('[data-gs-preset="0"]').click()
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight"
            assert page.locator('[data-gs-slot="muzzle"]').input_value() == ""
            print("Active preset BEFORE native code:", page.locator('.gs-preset[aria-pressed="true"]').get_attribute("data-gs-preset"))
            code = page.locator("#gunsmithShareCode").input_value()
            assert code.startswith("CV1."), "CamoVault share code missing"
            page.locator("#gunsmithGameCode").fill("QQ9-1T3A5B6A7M")
            page.locator("#gunsmithGameCode").dispatch_event("change")
            page.locator("#gunsmithGameMode").select_option("BATTLE ROYALE")
            print("Code mode after selection:", page.locator("#gunsmithGameMode").input_value())
            print("Active preset AFTER select:", page.locator('.gs-preset[aria-pressed="true"]').get_attribute("data-gs-preset"))
            page.locator('[data-gs-preset="2"]').click()
            print("Code mode preset 3:", page.locator("#gunsmithGameMode").input_value())
            print("Active preset AFTER choosing 3:", page.locator('.gs-preset[aria-pressed="true"]').get_attribute("data-gs-preset"))
            page.locator("#gunsmithImportCode").fill(code)
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator('[data-gs-share="import"]').click()
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight", "CamoVault code import did not restore attachments"
            page.locator('[data-gs-preset="0"]').click()
            print("Code mode preset 1 after switching:", page.locator("#gunsmithGameMode").input_value())
            print("Active preset AFTER choosing 1:", page.locator('.gs-preset[aria-pressed="true"]').get_attribute("data-gs-preset"))
            assert page.locator("#gunsmithGameCode").input_value() == "QQ9-1T3A5B6A7M", "Native CODM game code lost"
            assert page.locator("#gunsmithGameMode").input_value() == "BATTLE ROYALE"
            page.locator('[data-gs-stat="Accuracy"]').fill("85")
            page.locator('[data-gs-stat="Accuracy"]').dispatch_event("change")
            page.locator("#gunsmithClose").click()
            assert page.locator("#gunsmithModal").is_hidden(), "Gunsmith modal did not close"
            # Weapon-specific menus: no attachment leakage across SMGs.
            page.locator("#weaponSearch").fill("Fennec")
            page.locator('[data-build="smg:fennec"]').click()
            fennec_ammo = page.locator('[data-gs-slot="ammunition"] option').all_text_contents()
            assert "Extended Mag A" in fennec_ammo, "Fennec researched ammo missing"
            assert "10mm 30 Round Reload" not in fennec_ammo, "QQ9 ammunition leaked into Fennec"
            page.locator("#gunsmithClose").click()
            page.locator("#weaponSearch").fill("RUS-79U")
            page.locator('[data-build="smg:rus-79u"]').click()
            page.locator("#gunsmithModal").wait_for(state="visible",timeout=15000)
            rus_ammo = page.locator('[data-gs-slot="ammunition"] option').all_text_contents()
            assert "50 Round Extended Mag" in rus_ammo, "RUS documented ammo missing"
            assert page.locator("#gunsmithSource").is_visible(), "Researched RUS source link missing"
            assert page.locator("#gunsmithExamples [data-gs-example]").count() > 0, "Research-backed RUS builds missing"
            page.locator('[data-gs-slot="ammunition"]').select_option("__custom__")
            page.locator('[data-gs-custom="ammunition"]').fill("My RUS Magazine")
            page.locator('[data-gs-custom="ammunition"]').dispatch_event("change")
            assert "My RUS Magazine" in page.locator('[data-gs-slot="ammunition"] option').all_text_contents(), "RUS personal library not updated"
            page.locator('[data-gs-preset="1"]').click()
            page.locator('[data-gs-slot="ammunition"]').select_option("My RUS Magazine")
            assert page.locator('[data-gs-slot="ammunition"]').input_value()=="My RUS Magazine", "Personal part could not be selected in another preset"
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator('[data-gs-example="0"]').click()
            assert page.locator("#gunsmithCapacity").inner_text().startswith("5 / 5"), "Researched five-part loadout did not apply"
            assert "My RUS Magazine" in page.locator("#gunsmithMyParts").inner_text(), "Preset must not erase personal gun library"
            page.locator("#gunsmithClose").click()
            page.locator("#weaponSearch").fill("PDW-57")
            page.locator('[data-build="smg:pdw-57"]').click()
            page.locator("#gunsmithModal").wait_for(state="visible",timeout=15000)
            pdw_ammo=page.locator('[data-gs-slot="ammunition"] option').all_text_contents()
            assert len(pdw_ammo)==2, "Unresearched firearm must offer Empty and Custom only"
            assert "My RUS Magazine" not in pdw_ammo, "Attachment leaked to unrelated SMG"
            assert page.locator("#gunsmithSource").is_hidden(), "Unresearched weapon should not claim a source"
            page.locator("#gunsmithClose").click()
            page.locator("#weaponSearch").fill("")
            assert page.locator('[data-fav="smg:qq9"]').count() == 1
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
            assert page.locator('[data-gs-slot="optic"]').input_value() == "Red Dot Sight", "Saved personal attachment missing after reload"
            assert "Red Dot Sight" in page.locator("#gunsmithMyParts").inner_text(), "Personal library not saved"
            assert page.locator("#gunsmithFocus").input_value() == "control", "Build focus not saved"
            assert page.locator("#gunsmithGameCode").input_value() == "QQ9-1T3A5B6A7M", "Native CODM share code not saved"
            assert page.locator("#gunsmithGameMode").input_value() == "BATTLE ROYALE", "CODM code mode not saved"
            assert page.locator('[data-gs-stat="Accuracy"]').input_value() == "85", "Saved build stat missing after reload"
            page.locator('[data-gs-preset="1"]').click()
            assert page.locator('[data-gs-slot="muzzle"]').input_value() == "OWC Light Compensator", "Second loadout lost"
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
            # The screenshot failure occurs when app modules never execute:
            # verify that users get a recovery action rather than empty sections.
            recovery = browser.new_context(viewport={"width":375,"height":812})
            broken = recovery.new_page()
            broken.route("**/js/app.js*", lambda route: route.abort())
            broken.goto(url, wait_until="domcontentloaded")
            broken.locator("#startupRecovery").wait_for(state="visible",timeout=16000)
            assert "Weapons couldn't finish loading" in broken.locator("#startupRecovery").inner_text()
            assert broken.locator("#recoverSite").is_visible()
            print("Failed JavaScript displays non-destructive recovery instead of blank categories")
            recovery.close()
            browser.close()
    finally:
        server.shutdown()

if __name__ == "__main__":
    main()
