# CamoVault Armory — COD Mobile weapon tracker

**Version 1.1 — WEAPONS ONLY, no backend required.** A dark, fully responsive weapon armory for tracking **Gold, Platinum, Damascus, Diamond**, basic camo families, weapon level, Diamond challenges, favorites, and per-weapon notes. Includes a manually curated 2026-era weapon catalog (32 SMGs and additional primary/secondary categories).

> **Unofficial community tool.** Not affiliated with or endorsed by Activision or Call of Duty. No Activision authentication, credential harvesting, automated account scraping, or claims of in-game verification. Always compare available weapons and camo rules with your game build.

## Live hosting with GitHub Pages

1. Create a dedicated public repository, e.g. `codm-camo-tracker`.
2. Upload the contents of this folder to the repository **root** (`index.html`, `assets/`, `js/`, `.nojekyll`, etc.). You can upload everything from the ZIP.
3. Open repository **Settings → Pages** and select **Deploy from a branch → main → / (root)**, then save.
4. Your site will be `https://YOUR-USERNAME.github.io/codm-camo-tracker/`. You can use an existing custom domain if you own it and configure DNS.

It works from a subdirectory path without build commands or server-side code. To run locally, use `python -m http.server 8000` from this directory and visit `http://localhost:8000`. Opening `index.html` directly via `file://` is *not* recommended because browser modules/storage have restrictions.

## Weapon-only scope

**Included:** ARs, SMGs, LMGs, sniper rifles, marksman rifles, shotguns, pistols, melee weapons and launchers. **Excluded:** tactical/lethal equipment, perks, operator skills and scorestreaks. This is a camo tracker, not a loadout builder.

The site opens into the searchable weapon list. Weapon class chips work on phones and desktops. Mark basic and completionist camos, Diamond progress, weapon levels, favorites and notes.

**v1.0 save compatibility:** weapon IDs, IndexedDB database, profiles, and backup JSON remain unchanged. Existing progress is retained. The six Gold SMG preset is optional.

## Saving and restoring

- **Automatic saving**: per-profile IndexedDB after each action. A localStorage fallback is attempted when IndexedDB is blocked. Opening and closing the site maintains progress **on the same browser/device** as long as browser site data remains intact.
- **Portable backup**: Settings → Export JSON and Import JSON. Exporting includes all local profiles. Importing a full backup asks before overwriting existing profiles. Individual profile JSON is also supported.
- **Six Gold starter import**: Settings → Load my six Gold SMGs. Adds Cordite, QQ9, CBR4, Switchblade X9, OTs 9, TEC-9 without removing any existing progress. Other visitors may leave this unused.
- **Optional GitHub backup**: Create **your own private repository** for your saves; create a **fine-grained GitHub PAT** limited to that one repository with Contents read/write. In Settings, enter owner, repo and PAT, then upload. The backup goes to `camovault/profiles/<profile-id>.json`. You may restore the same profile when you have its profile ID from an imported backup. Your PAT is used only for direct API calls from your browser, and is not persisted in localStorage, IndexedDB or JSON backup. Closing Settings clears the token field. GitHub is a third-party service, not a self-hosted backend.

**Limitations:** GitHub backup is explicit/manual (not a live background sync). It is intended as an advanced opt-in, not a general consumer login. GitHub fine-grained PATs require granting repository access. **Never** ask users for Activision credentials; **never** place GitHub tokens in a public repository or in source control. Multi-device synchronized login requires a trusted authentication service / backend, which this no-server architecture intentionally avoids.

## Weapon roster maintenance

Edit `js/catalog.js` to add/reorder newly released weapons. The keys generated from category/name are stable across reorderings. When changing a weapon's displayed name, plan an ID migration to preserve existing saves. Diamond target defaults are community-reported estimates (AR 150 matches, SMG/LMG/Sniper/Shotgun/Marksman 120 matches, Pistol 80 matches, Melee 500 kills, Launcher 100 objectives); each target can be edited per weapon. Standard camo families are a **manual six-family checklist**, not individual in-game skin variants. Some class-specific requirements differ.

## Developer checks

- Requires a current browser with modern JavaScript, Fetch and IndexedDB.
- `npm test` executes catalog and persistence-schema tests (no install needed).
- No npm dependencies, analytics, tracking scripts, remote database, or embedded Activision assets.
- The installable site caches its own public assets via a service worker on HTTPS; browser data still requires backup.
- Fonts load from Google Fonts if available; system fallbacks remain readable offline.

## Camo-specific details

A Gold checkbox marks all six basic camo families as completed in the local checklist. Turning Gold off leaves the basic series checked, allowing correction. Platinum, Damascus, and Diamond are **manual** so a misleading automatic completion rule never reports an in-game unlock that may not have happened. Diamond match counters help with tracking but are not connected to Activision.
