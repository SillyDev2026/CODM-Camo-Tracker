from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text()
CSS = (ROOT / 'assets/style.css').read_text().split('\n', 1)[1]
JS = '\n'.join(re.sub(r'^import .*?;\s*$', '', (ROOT / 'js' / name).read_text(), flags=re.M).replace('export { createProfile };', '').replace('export ', '') for name in ['catalog.js','storage.js','github.js','app.js'])
MOCK = """
Object.defineProperty(window,'localStorage',{configurable:true,value:(()=>{const data={};return {getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]}})()});
Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined});
"""

def setup(page):
    page.set_content(HTML, wait_until='domcontentloaded')
    page.add_style_tag(content=CSS)
    page.add_script_tag(content=MOCK + JS)
    page.locator('.weapon-card').first.wait_for()

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox', '--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':900})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        setup(page)
        print('Desktop SMGs displayed:', page.locator('.weapon-card').count())
        page.screenshot(path='/mnt/data/camovault-desktop.png',full_page=True)
        page.locator('[data-action="open-settings"]').first.click()
        page.once('dialog',lambda d:d.accept())
        page.locator('[data-action="starter"]').click()
        page.locator('[data-action="close-settings"]').click()
        page.wait_for_timeout(300)
        print('Gold count after preset:',page.locator('.stat-big.gold').inner_text())
        print('Mock browser saved:',page.evaluate('localStorage.getItem("camovault-state-v1") !== null'))
        page.locator('[data-weapon="smg:qq9"]').click()
        print('QQ9 Gold checked:',page.locator('input[data-tier="gold"]').is_checked())
        page.locator('#weaponNotes').fill('Note survives save')
        page.wait_for_timeout(500)
        print('Saved QQ9 notes:',page.evaluate('JSON.parse(localStorage.getItem("camovault-state-v1")).profiles[0].progress["smg:qq9"].notes'))
        page.locator('[data-action="close-drawer"]').click()
        mobile=browser.new_page(viewport={'width':375,'height':812},device_scale_factor=2,is_mobile=True,has_touch=True)
        mobile.on('pageerror',lambda err:errors.append(str(err)))
        setup(mobile)
        dims=mobile.evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
        print('Mobile dimensions:',dims)
        mobile.screenshot(path='/mnt/data/camovault-mobile.png',full_page=True)
        mobile.locator('[data-weapon="smg:qq9"]').click()
        print('Mobile drawer opens:',mobile.locator('#weaponDrawer').is_visible())
        print('Browser JS errors:',errors)
        assert not errors,errors
        assert dims['scroll'] <= dims['width'],'Mobile viewport overflows horizontally'
        assert page.evaluate('JSON.parse(localStorage.getItem("camovault-state-v1")).profiles[0].progress["smg:qq9"].notes')=='Note survives save'
        browser.close()

if __name__=='__main__':main()
