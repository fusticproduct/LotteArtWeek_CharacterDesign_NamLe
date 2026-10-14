# Geofolk — notes for Claude

Geofolk is a character generator for Lotte Art Week: geometric figures built from simple shapes,
shown as flat 2D art, driven by a seed, with lock/reroll per part, drag-to-restack layers,
basket-weave torso patterns and MediaPipe live pose.

## Read first

- `README.md` — the current state of the app (Vietnamese): how to run it, UI, design rules, file
  map, data model, rig, pose solver, known gaps. Treat it as the source of truth and keep it
  up to date when behaviour changes.
- `docs/GEOFOLK_APP_BRIEF.md` — the original brief plus a dated decision log (sections 15–16 are
  the latest). Its early sections describe the old 3D build; where it disagrees with the README,
  the README wins. Append new design decisions there as a new dated section.

## Working with the user

- The user (Nam) writes in Vietnamese: reply in Vietnamese, plain language, no jargon dumps.
- They iterate in rounds of visual feedback, often with reference images or files from `~/Downloads`.
- Check every visual change in the browser before reporting it, and say what was not checked.
- The design rules in README section 4 are deliberate decisions. Do not "fix" them unprompted.
- When a request suggests an approach, weigh it and propose a better one if there is one, with the reason.

## Commands

```sh
npm run dev -- --port 5178 --strictPort   # app at http://127.0.0.1:5178
npm test                                  # 36 Vitest tests (Node, no canvas)
npm run build                             # tsc + vite build
npm run pose                              # MediaPipe pose server, webcam (ws://localhost:8080)
npm run pose:video                        # same, looping mediapipe/test_video.mp4
npx vite-node scripts/bake-dance.ts <landmarks.json>   # rebake src/dance.json (landmarks from scripts/extract_landmarks.py)
```

The pose server runs through `uv` with Python 3.11 because the system Python is 3.9 and
`mediapipe/server.py` needs 3.10+. Under `npm run dev` the app starts and stops it by itself
(`mediapipe/vite-plugin.js`), so the `pose` scripts are only needed for static builds.
Start long-running servers in the Terminal panel, not Bash.

## Things that have bitten before

- **Blank canvas in the browser pane:** when the pane is hidden the browser pauses
  `requestAnimationFrame`, so screenshots show an empty canvas. Front the tab (`tabs_select`)
  before judging a render. It is not an app bug.
- **Automated mouse drags do not start native HTML5 drag-and-drop.** To test the layer list,
  dispatch `dragstart` / `dragover` / `drop` events, or use the handle's ↑/↓ keys.
- **Tests cannot see textures or UI** (no canvas in Node). Passing tests do not mean the picture is right.
- **Seeds:** append new shapes to the end of a `variants` list; adding a bone changes the seed
  length, so add the old order to `legacyOrders` in `src/model.ts`. Replacing a whole catalogue
  bumps the seed version and needs a mapping table (see `legacyTorso`, seed version 2).
- **Head, body pieces and face mark are flat** (`paper()` outlines; body pieces in `src/body.ts`); every other
  part is still a turned 3D shape. Nam approved this mix on 2026-10-11; do not flatten the rest unprompted.
- **Body pieces must stay joined:** both pieces of a two-piece body hold a disc around the waist pivot
  (`holdsDisc` test). Keep that invariant when adding shapes or changing `widths` / `seams` in `body.ts`.
- **Branches:** Nam wants every change on a feature branch so `main` keeps the original (2026-10-14).
- **Code style is very dense** (many statements per line). Match the file you are editing.
- **Exports** (FBX/OBJ) were verified in Blender only for the old 22-bone 3D build.
- **Checking motion:** eyeballing Live pose misses most problems. Run MediaPipe over every frame of
  `mediapipe/test_video.mp4`, feed the landmarks through `solvePose` / `smoothPose` / `updateLayers`
  (e.g. with `npx vite-node`), and measure error against the true segment directions. To look at a
  specific frame, replay recorded landmarks over ws://localhost:8080 instead of the live server.
- **`src/proportions.json` is written by the app** (Proportions → Save as default, dev server only). Expect it
  to change in `git status`; it is the project's default part proportions.
- **Port 8080 is shared** with the `lotte-visual-haidoan` pose server, which the user also runs
  (sometimes from Codex). Geofolk connects to whichever server is listening, so check `lsof -iTCP:8080`
  before trusting a Live pose test.

## Repository

- GitHub: `fusticproduct/LotteArtWeek_CharacterDesign_NamLe` (public, branch `main`). Commit or push only when asked.
- The last 3D build is archived next to this folder at `../geofolk_3D_v1_20261006` (not in git).
