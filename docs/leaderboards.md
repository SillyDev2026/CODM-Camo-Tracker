# CamoVault leaderboard architecture

## Implemented: local-only rankings (v2)

CamoVault GitHub Pages is static and does not run a game server. All statistics are **manually entered**, not read from Activision. The shipped dashboard has:
- Your personal Top 3 weapons and sortable ranking by tracking score, CODM Weapon Master points, kills, K/D, headshots, wins and completed camo stages.
- A leaderboard of **profiles in this browser's saved CamoVault state only**, which is useful for friends sharing a device or testing multiple profiles.
- Weapon-class filters, ten computed achievement badges, and downloadable CSV results. CSV formula-like cells are escaped to avoid spreadsheet injection.
- Screenshot-inspired Weapon Master tiers: Iron 0, Gold 400, Platinum 1,000, Diamond 2,000, Master 3,500, Master I 5,000, Master II 6,500, Master III 8,000+. These are **illustrative reference thresholds**, not a verified live CODM tier feed.
- Per-weapon manual points/kills/deaths/headshots/matches/wins, optional match entries, Undo for the most recently retained entry, and K/D, headshot and win rate. Up to 12 recent match details are retained per weapon (lifetime counters persist); the entire profile, including match history, is included in JSON/optional private GitHub backups.

### "Best weapon" is a transparent personal tracking score

The ranking score is an **activity index**, not MMR, matchmaking skill, official CODM Weapon Master points, DPS, meta ranking or global rating. See `trackingScore()` in `js/mastery.js`. To rank by an objective field, change the "Rank by" selector to Mastery points, Kills, K/D, Wins, Headshots or Camos. K/D rankings exclude fewer than 20 manually recorded weapon kills to avoid tiny-sample records winning.

### Data policy

Mastery is stored inside each local profile's `mastery[weaponId]` data, separate from camos and weapon build data, and is validated by `cleanMasteryCollection()`. Previous saves load without migration prompts or resetting any progress. This local leaderboard **never transmits scores or profile names publicly**, and the optional GitHub backup is a separate user-requested operation to the private repository/token selected in Settings.

## Proposed (not implemented): online community leaderboard

An internet-wide leaderboard cannot be made trustworthy or writable from static GitHub Pages alone. GitHub Pages has no authenticated write endpoint or anti-spam processing. **Never put a GitHub Personal Access Token, OAuth client secret, or database service-role key in front-end JavaScript.**

Recommended deployable architecture:

1. A Cloudflare Worker (or another serverless API) handles `GET /v1/leaderboard?metric=...`, `GET /v1/players/:publicId`, and authenticated `POST /v1/submissions`. Use Cloudflare D1 or a similar managed relational store for player opt-in public profiles and score submissions. Keep database credentials and OAuth secrets on the server.
2. Add optional Discord OAuth Authorization Code + PKCE or an equivalent supported login provider. Keep the CODM player UID **optional, private, and unverified** unless there is a documented authorization flow that supplies gameplay stats. Avoid storing any CODM password or session cookies.
3. Distinguish **Self-reported community scores** from **Verified gameplay scores**. Without an authorized Activision/CODM gameplay API or an auditable official verification process, only self-reported results can be displayed. A login identifies the reporter, not the accuracy of their weapon stats.
4. Validate IDs, metrics, ranking fields, lengths, and numeric boundaries on the server, not just in the browser. Rate-limit submissions by account/IP and reject excessive updates; store timestamps, versioned schemas and moderation status. Allow report/delete/account opt-out. Expose only the chosen nickname and public statistics.
5. Rank by clear comparable rules. Use independent leaderboards for lifetime kills, mastery points, headshot totals, wins, camo completion, and per-weapon results. Show data provenance, update age, ties, minimum sample thresholds and a "self-reported" label everywhere.
6. Add optional read-only public leaderboard fetching to the GitHub Pages front end with clear loading, offline/error handling and no dependency for normal weapon tracking. Keep local profile data separate. Global posts require an explicit **Publish** confirmation.

**Not currently delivered:** public accounts, global leaderboard, CODM/Activision sign-in, automatic game stats, validated official CODM leaderboard data, and anti-cheat verification. Building those would require a chosen backend and permission to configure it.
