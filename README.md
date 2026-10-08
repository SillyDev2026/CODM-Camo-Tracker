# CamoVault — COD Mobile Camo Tracker

A free, unofficial, mobile-first COD Mobile camo progress tracker. Tracks Gold, Platinum, Damascus and Diamond, 145 weapons across 9 categories, weapon levels, individual camo families, and notes. No Activision login is required. This is not affiliated with Activision.

## Install the website (one ZIP upload)

The repository includes a GitHub Actions installer that automatically extracts the website files when the release archive is uploaded.

1. Download **CamoVault-GitHub-Pages-v1.0.zip** from the ChatGPT conversation where this project was generated.
2. Open [Add file → Upload files](https://github.com/SillyDev2026/CODM-Camo-Tracker/upload/main).
3. Drag **CamoVault-GitHub-Pages-v1.0.zip** into GitHub and commit to **main**. Keep that exact filename.
4. Open the repository **Actions** tab and wait for **Install CamoVault site** to finish. The action extracts the archive and commits the full source to the main branch.
5. Open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, **main**, **/(root)**, and save.

Website address once GitHub Pages is enabled:
https://sillydev2026.github.io/CODM-Camo-Tracker/

## Features

- Browsable weapon catalog by class; search, sorting, favorites and filters
- Per-weapon Gold, Platinum, Damascus, Diamond and base camo family checklists
- Diamond challenge counters, leveling progress and notes
- Device-local, persistent IndexedDB autosave, with localStorage fallback
- Multiple browser profiles and JSON import/export
- Optional GitHub cloud backup to a repository chosen by the player

## Privacy and limits

This is a manual tracker, not an official Activision account sync. We never ask for Activision credentials. Local progress is saved on the current browser/device only, so players should export a backup for transfer. Optional GitHub API backup uses a fine-grained token entered by the player at runtime; do not put tokens in public files.

## Maintenance

The website is static. The GitHub Actions installer is only needed for importing the initial ZIP or updating from a later ZIP with the same filename. After importing, edit HTML/CSS/JS normally. Source project includes tests runnable using `npm test`. GitHub Pages does not run a database backend.
