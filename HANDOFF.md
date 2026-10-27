# Handoff: Simulasi Umrah V2

*Last updated 27 October 2026. Branch `poji`.*

This is for whoever picks up the code next. It covers:
- what state `poji` is in;
- how `index.html` is organised;
- the traps found during the October 2026 UX work;
- what was tested, and how;
- what is still open.

## 1. Current state

- **`main`** still holds the original upload.
- **`poji`** has 12 commits on top of `main` (listed below): UX improvements, bug fixes, docs and an automated test suite. Everything is tested in headless Chrome but not yet on real phones.
- **GitHub Pages is temporarily serving `poji`** at https://mhh-usm.github.io/simulasi-umrah/ so it can be tested on phones.

**To release:**
1. Test on an Android and an iPhone (checklist in §7).
2. Merge `poji` into `main` (https://github.com/mhh-usm/simulasi-umrah/pull/new/poji).
3. Switch Pages back to `main` in Settings → Pages.

| Commit | Change |
|---|---|
| `2c165bf` | Sync the newer local V2 build: Quran audio from MP3Quran.net, app shortcuts, updated privacy text |
| `007087b` | Back button returns to the guide; progress remembered; panoramas and Leaflet split out and loaded on demand (`index.html` 1.54 MB → 0.37 MB); compact tawaf bar with a ⋯ menu |
| `6355167` | Bigger text and A− / A+; left-aligned text on phones; one-line credit; theme follows the phone |
| `51cc2dd` | Tracker phone check before Start (GPS, motion, screen-on, battery) |
| `53ed88d` | Privacy policy: on-device progress, phone check, Google links |
| `6f37f8d` | Messages last 3–6 s and show above every screen; tracker lap-count vibration |
| `2b97697` | Tappable step bar, swipe and arrow keys; folded tawaf settings; screen-reader fixes; fixes Space and arrow keys controlling the hidden player |
| `9f3fd2f` | Outdoor high-contrast mode (◐) |
| `f73b9d9` | Bottom tab bar: Panduan · Penjejak · Bacaan · Ziarah |
| `0650c0f` | Back steps through the guide instead of closing the app; the mini screen closes when you return to the app |
| `b4032c4` | README and this handoff |
| *(latest)* | Automated tests in `tests/` |

## 2. Architecture

The app is one static page with no build step and no framework. Almost everything is in `index.html`.

**`index.html`, top to bottom:**
1. `<head>`, including a small script that applies theme, text size and contrast before the first paint.
2. App CSS, the first `<style>`. It is built on CSS variables (`--ink`, `--glass`, `--fs` …).
3. Leaflet's CSS, the second `<style>`.
4. Markup: the screens `#journey`, `#intro`, `#ziarah`, `#reader`, `#trk` and `#kpocket`, plus `#hud`, `#map`, `#bar` and `#tabs`.
5. three.js from cdnjs.
6. The main script, one IIFE.
7. A small install and update-banner script.

**Main script sections.** Search for the `/* ---------- … ----------` markers; line numbers shift, so don't rely on them.

| Marker | What it does |
|---|---|
| `renderer & scene` … `Crowd` | three.js scene: Kaaba, Maqam, arcades, instanced crowd |
| `Pilgrim (you)` | Tawaf position is an angle `th` from `TH_START` to `TOTAL = 14π` (7 laps) |
| `Real footage` | View modes `sim` / `pano` / `real` / `v360`; panoramas load on demand in `panoLoad()` |
| `HUD` | `SEGS` maps the angle around the Kaaba to the prayer text in `TXT` / `AR` |
| `V2: IndexedDB` / `Audio bacaan` | IndexedDB wrapper `IDB`; Quran player (`qPlay`, `qStop` …) streaming from MP3Quran.net |
| `Bacaan suara` | Spoken readings (`vSpeak`, `vTawaf`, `vSai`) |
| `Controls` | Tawaf bar, ⋯ menu (`moreSet`), drag-look, gyroscope, WebXR, keyboard |
| `Intro` | Tawaf setup, languages (`LANGS`, `MISC`, `setLang`), folded settings summary (`setTset`) |
| `Umrah journey` | Guide content `J[lang]` (9 steps) and `JT`; `renderJourney()`, `saveState()`, step bar, swipe |
| `Sa'ie scene` | Separate scene `sScene`; trip logic in `updateSai` |
| `Ziarah` / `Spot gambar…` | Data `Z`, `FOOD`, `APPS`, `PHOTO`, `INFO`; `renderZiarah()` |
| `Bacaan Jumaat` | Reader; the texts are in the huge `RD` constant |
| `Penjejak Umrah` | Tracker state `TS`; `autoStage()` (Makkah zones), `pracStage()` (practice), `onFix()` (GPS), `lapBuzz()` |
| `Peta sebenar` | Leaflet maps; `loadLeaflet()` / `trkMaps()` |
| `Semakan telefon` | Pre-start checklist: `chkPassive()` (no prompts), `chkRun()` (asks for permissions; iOS motion first) |
| `Skrin mini` | Picture-in-picture: a canvas drawn every second → video → PiP; `miniUI()`, `miniExit()`, `miniLeft()` |
| `Light / dark theme` | Theme, outdoor mode (`hcSet`), text size (`fsSet`) |
| `Loop` | Render loop |
| `Butang Kembali peranti` | Back-button and history model (§4) |
| `bar tab bawah` | Tab bar (`tabsSync`, `tabGo`) |

**Very long lines.** The `RD` texts (about 68 KB) and the `USM_LOGO` image are single lines. Avoid opening those lines whole in an editor. Edit around them, or with a script.

**Language helpers.** Content objects are keyed `bm` / `en` / `id` / `ar`. Some smaller tables only have `bm` and `en`; helpers pick the fallback:
- `kl()`, `zl()`, `mt()` and `qt()` map Indonesian to the Malay text and Arabic to the English text;
- `rl()` uses the reader's own text when it exists, otherwise Malay.

**Code style.** Code comments are in Malay. The code is dense and minified-looking (`$ = getElementById`). Match that when editing.

## 3. Saved state

Everything stays on the device; nothing is sent to a server.

**`localStorage` keys:**

| Key | Holds |
|---|---|
| `su-state` | Language, journey step, ihram state, hair-cut count, sex, crowd |
| `su-fs` | Text size (1, 1.15, 1.3 or 1.45) |
| `su-contrast` | Outdoor mode |
| `su-theme-pick` | Theme the user chose. With no choice, the app follows the phone. `su-theme` is an old key, removed on load |
| `su-voice` | Spoken readings on/off |
| `su-qari`, `su-qsel` | Quran reciter and selected surahs |
| `su-rsize` | Reader text size |
| `su-ziarah` | Places ticked as visited |
| `su-trk-prof`, `su-trk-cur`, `su-trk-hist` | Tracker profile, current recording, history (history moves to IndexedDB) |

**IndexedDB:**
- `audio` holds surahs saved for offline;
- `kv` holds the tracker history.

## 4. Traps learned the hard way

1. **Chrome's history rule.** Chrome's Back button skips history entries a page added without a real tap. So `pushState` must only run during a tap; the helper `hPush()` checks `navigator.userActivation.isActive`.
   - Never push on load or inside `popstate`. Doing so made Back close the app.
   - **The model:**
     - each forward step on the guide adds one entry (`hStep` counts them);
     - leaving the guide adds one guard entry (`hGuard`);
     - returning to the guide with an in-app button removes the guard (`hSkip` plus `history.back()`);
     - **Kembali** moves back through the same history (`stepTo`), so on-screen and device Back agree.
   - **Remaining limit:** after a reload that resumes on a saved step, Back closes the app until the user moves between steps.
2. **Picture-in-picture can't send the browser away.** A page can't put itself in the background, so after the mini screen opens the app stays visible until the user presses Home. The app explains this in `#miniNote` and closes the mini screen when the user returns (`visibilitychange`).
   - iPhone Safari uses `webkitSetPresentationMode` instead.
   - **iPhones can't vibrate from web pages**, so lap vibration is Android-only.
3. **Swipes need `touch-action`.** `#jcard` has `touch-action: pan-y pinch-zoom`, and the page has `overscroll-behavior-x: none`. Without them the browser treats a sideways swipe as back/forward navigation.
4. **Old three.js API.** The app pins three.js r128, where textures have no `userData`. The panorama loader stores its flag as `t._ld`.
5. **Service worker caching.** Only `index.html`, `privacy.html` and `manifest.json` are network-first. The panoramas, `leaflet.js` and the icons are served from cache, so bump `CACHE` in `sw.js` whenever you change them.
6. **The page is registered as `sw.js`.** The local file was once named `sw-1.js`, which silently disabled offline mode.
7. **Text-size scaling.** All app font sizes are `calc(Npx * var(--fs))`. The tawaf panel and tab bar use `--fsh` (capped at 1.15×), and the tawaf control bar uses fixed sizes so it stays on one row in all four languages.

## 5. Testing

Tested in headless Chrome over the DevTools protocol:
- phone size 390×844, with real simulated taps, swipes and the browser's own Back;
- simulated GPS walks for the tracker;
- recorded vibration patterns;
- measured contrast ratios.

The last full run passed all suites with no page errors.

| Area | Checks |
|---|---|
| Core flows: Back, resume, lazy loading, tawaf bar, text size, theme, credit | 25 |
| Tracker phone check | 8 |
| Step bar, swipe, keys, tawaf setup, focus | 15 |
| Outdoor mode (text 21:1; every button ≥ 4.5:1 in both themes) | 13 |
| Tab bar | 15 |
| Messages, hair-cut vibration, 74 s practice walk (1 buzz at lap 1, 2 at lap 2) | 8 |
| Back-button scenarios, including every history entry added during a tap | 22 |
| Mini screen (simulated and real picture-in-picture) | 16 |

**The tests are in [tests/](tests/).**

```sh
node tests/run-all.js            # all files, about 6 minutes; exit code 1 if anything fails
node tests/run-all.js back       # only files whose name contains "back"
node tests/core.test.js          # one file, with PASS/FAIL detail
```

- **Requirements:** Node 22 or newer (it uses the built-in `fetch` and `WebSocket`) and Chrome or Edge. The browser is found automatically, or set `CHROME=/path/to/chrome`.
- **Screenshots** go to the system temp folder under `simulasi-umrah-tests/`, or to `OUT=…`.
- **How it works:** [tests/harness.js](tests/harness.js) serves the repo on a random localhost port and drives headless Chrome at phone size. Each `*.test.js` contains only its checks, and the harness adds a "no page errors" check to each file.
- **The headless browser is slow,** because it draws the 3D scene in software. Use generous waits, and run checks before taking screenshots: each screenshot takes about a second.

**Not covered by headless testing:**
- real GPS and motion sensors;
- iPhone permission prompts and Add to Home Screen;
- vibration feel in a pocket;
- pressing Home with the mini screen open (simulated only);
- Makkah-mode tracking around the Kaaba (only practice mode was walked).

## 6. Open items

- **`tawaf_footage.mp4` is missing.** `VIDEO_URL` points to it, so the "real video" view mode fails. Add the file, or hide the `#t-real` option.
- **Unused MP3s.** `*.mp3` and `audio/` (about 26 MB) are unused by the current app. Remove them in a separate commit if the author agrees.
- **No license file.** Confirm the intended license with the author.
- **Merge and Pages.** Merge `poji` into `main` and switch GitHub Pages back to `main`.
- **Optional.** Add a short "About" page for the full credit, which now appears only on the welcome step.

## 7. Phone test checklist (before merging)

**Android Chrome:**
1. **Install** from the ⋮ menu.
2. **Back on the guide:** tap Seterusnya ×3, then Back ×4. It should step back, then close.
3. **Back from a tab:** open Penjejak, then Panduan, then Back. It should go back one step.
4. **Swipe** between steps; try **A+** up to the largest size; try **◐** outdoors.
5. **Tracker in practice mode:** do Semak & benarkan, Start, then walk. Expect 1 buzz at lap 1 and 2 buzzes at lap 2.
6. **Mini screen:** tawaf, ⋯, Skrin mini. Read the note, press Home (the mini screen should stay), then reopen the app (the mini screen should close).

**iPhone Safari:**
1. Share → **Add to Home Screen**.
2. **Tracker Semak & benarkan:** the motion permission prompt should appear.
3. **Voice announcements** should be heard. There is no vibration on iPhone.
