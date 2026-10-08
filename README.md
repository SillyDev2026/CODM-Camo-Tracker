# CamoVault Armory — COD Mobile weapon tracker

**Version 1.3 — Multiplayer and Zombies Aether Crystal camos, seasonal weapons, no custom server required.** A dark, fully responsive weapon armory for tracking **Gold, Platinum, Damascus, Diamond**, basic camo families, weapon level, Diamond challenges, favorites, and per-weapon notes. Includes a manually curated 2026-era weapon catalog (32 SMGs and additional primary/secondary categories).

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
- **Optional GitHub backup**: Create **your own private repository** for your saves; create a **fine-grained GitHub PAT** limited to that one repository with Contents read/write. In Settings, enter owner, repo and PAT, then upload. The backup goes to `camovault/profiles/<profile-id>.json`. You may restore the same profile when you have its profile ID from an imported backup. Your PAT is used only for direct GitHub API calls from the browser. By default it stays in memory, and closing Settings clears the token field. **Optional encrypted device vault:** enter the username, backup repository, token, and a separate password (at least 12 characters), then click **Save encrypted token**. This stores AES-256-GCM ciphertext (PBKDF2-SHA-256, 310,000 iterations, random salt/IV) in browser localStorage. Return later, enter the vault password and click **Unlock saved token**; GitHub owner, repo, and token are restored for that session. **Forget token** removes the encrypted copy. Neither the plaintext PAT nor password is committed to GitHub, put in exported JSON, or sent to our server. The vault is device/browser-specific. Clearing site data removes it. Lost vault passwords cannot be recovered. GitHub is a third-party service, not a self-hosted backend.

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

## Zombies & future seasons

The Zombies tab tracks Aether Crystal separately from Multiplayer camos. Each eligible weapon has a manually confirmed checkbox, qualifying completed Undead Siege wins (default six), and editable kills-per-match. Reference requirements: AR/SMG/LMG 25, pistols 15, shotguns 12, sniper/marksman 8 zombie kills in completed Hard/Nightmare games. Requirements should be checked in-game. Melee and launcher eligibility is unverified, so no Aether target is assigned. The same local storage and GitHub JSON backups retain both modes.

The site loads `data/seasonal-weapons.json` with a network-first policy and offline cache. Weapons become visible automatically when a **reviewed official announcement** entry reaches its releaseAt timestamp; IDs and previously saved progress are preserved. Grav (AR) is configured for October 14, 2026 at 5 PM Pacific, according to https://www.callofduty.com/blog/2026/10/call-of-duty-mobile-season-9-vampires-werewolves. Future seasons need reviewed manifest entries. New-release monitoring can create issues for review rather than adding unverified gear.

## Startup recovery v1.3.1
The app loads the local save and weapon catalog before requesting upcoming seasonal data. Assets are cache-busted and loaded network-first by the service worker so partial deployments cannot combine outdated HTML and new JavaScript. Browser initialization failures now display their real error instead of falsely blaming storage or clearing the page. This upgrade keeps all original IndexedDB profile data intact.

## Season tracking and QoL (v1.4)

- **Season Command** displays current and previous approved season announcements plus the next confirmed launch. It never guesses next season dates. The timeline grows using the `seasons` and `weapons` arrays in `data/seasonal-weapons.json`. Official info is reviewed first; approved new weapons are automatically enabled at their configured `releaseAt` without losing previous saves.
- **Refresh** updates the season catalog without replacing any player data. It also refreshes on returning to the page after 10 minutes and while open every 30 minutes.
- **Quick actions** mark Gold or Aether Crystal with one tap from the weapon grid; the star toggles favorites independently, and opening a card still shows full challenges and levels.
- **Continue grinding** returns to your most recently updated weapon for the selected mode. New-season and recently edited weapon filters help reduce scrolling.
- The site remembers the chosen mode and category in local browser storage. Weapon progress remains in the existing v1 IndexedDB database and continues to work with JSON/GitHub backups.
- The official blog checker opens human-review issues for new season announcements; it does **not** scrape Activision user accounts or automatically invent new guns. Admins add new approved season entries to the manifest without app-code changes.

## v1.4.1 — UI and data reliability

- Fixes missing quick Gold/Aether/favorite controls after searching, sorting, or filtering weapons.
- Camo and favorite changes save immediately; notes are debounced to reduce storage writes.
- Chooses the newest valid IndexedDB/localStorage save, mirrors successful saves to a fallback when possible, and does not silently reset damaged or blocked storage.
- Offline cache matches versioned JavaScript/CSS URLs even if their query strings change.
- Browser regression tests cover filtering, UI responsiveness and recovery.

## Gunsmith Build Lab and 3D Inspector (v1.5.0)

Every weapon card now offers **Build / 3D**. The same shortcut is available from Multiplayer and Zombies camo editors. Each player profile has **three named Gunsmith presets for each weapon**. For firearm classes the editor shows potential slot categories (Muzzle, Barrel, Optic, Stock, Perk, Laser, Underbarrel, Ammunition and Rear Grip) where applicable. Enter each weapon's **actual attachment name from COD Mobile**—the site does not claim every slot or attachment exists on every individual weapon. Up to **five** attachments can be equipped per preset. Melee weapons and launchers have a concept preview and notes without unverified Gunsmith attachment slots.

**3D viewer:** a lightweight offline-capable procedural, class-shaped mesh rendered from rotating 3D geometry. Drag to rotate, pinch or use buttons to zoom, reset or auto-rotate. This preview is **not an extracted or exact 3D model from COD Mobile**; importing accurate licensed models would require authorized model assets supplied separately. Equipped attachment categories change simple features on the preview.

**Stats:** optional 0–100 values manually entered from your in-game Gunsmith for Damage, Fire Rate, Accuracy, Mobility, Range and Control. We do not fabricate base weapon values, predict attachment effects or claim access to CODM data. Each preset may include private notes and a copyable build text summary. All builds are included in JSON exports and optional private GitHub profile backups, while your Gold, Diamond and Aether Crystal records continue unchanged.

## Real 3D model imports (v1.5.1)

Gunsmith now loads self-hosted GLB 3D meshes through the Apache-2.0 `<model-viewer>` component, with PBR materials, shadows, an orbit camera, touch gestures, zoom and auto-spin. Models are stored directly in `assets/models/*.glb`, and the model-viewer JavaScript is stored in `assets/vendor/model-viewer.min.js` for offline-friendly GitHub Pages delivery. The prior software renderer remains as a fallback if WebGL or a model is unavailable. The service worker caches the engine and model files.

**License and provenance:** `assets/models/manifest.json` pins the upstream source revision, original source path, CC0-1.0 license and a description for each of the nine representative weapon-class models. Firearm meshes come from the Flat Guns East/West CC0 pack via [fps-asset-kit](https://github.com/petroulacl/fps-asset-kit), and the representative sword/blaster are from Kenney CC0 collections via [tge-assets](https://github.com/Hidencod/tge-assets). The locally vendored `@google/model-viewer` v4.1.0 is Apache-2.0 licensed; see `assets/vendor/MODEL-VIEWER-LICENSE.txt`. CC0 attribution is not required, but upstream credit is retained voluntarily.

**Accuracy:** These are correctly shaped imported 3D meshes, **not actual COD Mobile gun models**. Each in-game weapon currently uses a representative model for its weapon class (AR, SMG, LMG, etc.). The LMG uses a long-rifle stand-in; the launcher uses a sci-fi blaster stand-in. Attachment slots stay player-entered, and the exact attachment model is **not automatically composited onto the imported GLB**. Licensed weapon-specific models can be introduced in the manifest later, after rights and compatibility checks.

**Updating:** `scripts/import_models.py` fetches GLB models from pinned CC0 source commits and checks the glTF 2.0 header and download size. `scripts/vendor_viewer.py` vendors a pinned WebGL runtime. The `Import licensed Gunsmith 3D models` workflow runs automatically when its workflow file is updated, or can be started manually via GitHub Actions. Avoid importing ripped Activision/CODM assets without permission.

## v1.6.0 — Gunsmith attachment menus and share codes

**Weapon-specific dropdowns:** Each firearm has named dropdown menus for the CODM Gunsmith categories (muzzle, barrel, optics, stock, perk, laser, underbarrel, ammunition, rear grip), up to five simultaneously equipped. An **Empty** choice removes a part; **Custom/unlisted** preserves actual attachment names absent from the catalog. The catalog lives in `js/attachments.js`, separately from saved player builds so season updates do not erase custom selections. Weapon-specific researched examples currently cover **12 guns**: QQ9, MX9, M4, Man-O-War, Type 25, AK-47, Cordite, CBR4, DL Q33, LW3-Tundra and VMP. The other firearm dropdowns use clearly labelled **general suggestions, not verified fit**. A source link and coverage label are visible for each gun. These are selected community examples, **not a claim of a complete real-time Gunsmith inventory**, and exact slot availability/attachment effects must be checked in CODM.

**Two kinds of share codes, deliberately distinct:**
- **Real CODM native Gunsmith code:** paste the code issued by COD Mobile into the field. CamoVault preserves it unchanged per saved preset and lets you copy it. **CamoVault does not generate or decode native CODM attachment codes**, and cannot automatically fill attachment slots from them.
- **CamoVault `CV1.…` code:** automatically generated from the current weapon ID, build name, up to five attachment names and manually entered stats. This compact text code includes a checksum; other CamoVault users can paste it to **import into a preset for the same weapon**, after confirmation. It is **not accepted by COD Mobile**. The code deliberately excludes private notes, profiles, GitHub authentication and the player's real CODM code.

Both code fields and all preset attachments survive local saving, JSON backup and optional GitHub profile backup. The original Multiplayer and Zombies camo schema is unchanged. For season weapons, the community-attachment catalog can be curated incrementally as newly verified weapons arrive, and user-entered data is retained.

### v1.6.0 correction
CODM displays some weapon stats above 100, so manually entered Gunsmith statistics accept values from 0 to 999. The visual progress bars are capped at full width without changing the original saved value. Previously saved values and existing builds remain readable.

## v1.6.1 — Gunsmith polish

The new share-code panel records the **Multiplayer** or **Battle Royale** mode for each saved CODM code and includes the selected mode in CamoVault CV1 share codes. Gunsmith numbers entered from the game are preserved up to 999 instead of being incorrectly clipped at 100. The v1.6.1 cache version ensures the new attachment menus, share-code logic and source data are refreshed together across GitHub Pages updates.

**Static HV:** Community-reported CODM attachments from [Zilliongamer](https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/static-hv-cod-mobile-loadout) now appear under the Static HV's researched choices: Supe-SIL Suppressed Barrel, SL Tac Hive V.4 Stock, Kimura RYL33 Laser Sight, Paracord Grip and Thar-V1.2 Grip. This expands weapon-specific coverage to **12 guns**. The referenced loadout is an example rather than the game's full attachment inventory.

## v1.6.2 — reliability release

The final Gunsmith patch stops text-field blur from re-rendering and destroying the preset button being clicked. Battle Royale/Multiplayer code mode now remains attached to the correct preset across swaps and reloads. Updated queries and the `camovault-assets-v1.6.2` service-worker cache prevent older Gunsmith scripts from being reused on refresh. The researched attachment examples include the new Static HV entry; no native CODM code is fabricated.

## v1.6.3 — Strict per-weapon Gunsmith attachments

The gunsmith attachment dropdowns no longer reuse generic category suggestions. Every named option is indexed by **exact weapon ID** and attachment slot in `js/attachments.js`, and has a weapon-specific community reference. Currently **24 guns** have researched example attachments. These are illustrative documented choices, **not complete current attachment inventories**. Guns without researched data display only **Empty slot** and **Custom / unlisted** for each available firearm slot; the UI never guesses names from another weapon. Unsupported/unverified slots on researched guns also show only Empty/Custom.

The **Custom** option is always available and is intentionally not claimed as verified. Previous custom/manual saved attachments, three build presets, CODM share codes, CamoVault CV1 sharing, Zombies/Multiplayer progress, local IndexedDB backups and optional GitHub backups remain compatible. The site checks the selected weapon's attachment whitelist before accepting a named dropdown selection. The catalog can be expanded incrementally with cited per-weapon entries as official gunsmith data or reliable loadout references appear.

## v1.6.4 — Blank mobile dashboard and startup recovery

- Fixes the empty categories/statistics/weapons state caused by failing or unavailable optional JavaScript dependencies. The core camo tracker no longer imports the heavy Gunsmith/3D code at startup; the Gunsmith editor and the self-hosted ~1 MB 3D renderer only load on demand. A failure to load Gunsmith no longer takes down the armory.
- Adds a visible browser-level startup watchdog and a **Reload latest website files** recovery action after 10 seconds if categories/cards never initialize. Recovery unregisters only this site's worker and removes only CamoVault asset caches; it never clears localStorage, IndexedDB, player profiles, camos or the encrypted token vault.
- Fixes the narrow mobile **Continue grinding** card using a responsive grid: full weapon name and goal at top, progress meter and full-width continue button below.
- Season catalog requests are aborted after 8 seconds and fall back to an offline status; the page no longer hangs indefinitely on “Checking season roster…”.
- Corrects loading placeholders and counts to avoid empty panels while initial scripts are starting.
- Installs the service worker using a small core asset list and caches licensed 3D models only when requested; failures downloading optional GLB assets no longer prevent new app versions from activating.
- Browser smoke tests now verify >100 weapon cards, all category navigation, four progress cards, season completion status, small-screen readable focus cards, and an explicit recovery panel when the main module is blocked.
