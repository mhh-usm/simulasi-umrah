# Simulasi Umrah: Niat hingga Tahallul (V2)

A step-by-step umrah guide for pilgrims' phones, from the intention (niat) at the miqat to tahallul, with 3D and 360° simulations of tawaf and sa'ie, a GPS umrah tracker, Makkah ziarah notes and Friday readings.

*Panduan umrah langkah demi langkah untuk telefon jemaah: dari niat di miqat hingga tahallul, dengan simulasi 3D/360° tawaf dan sa'ie, penjejak umrah (masa, jarak, langkah), ziarah Makkah dan bacaan Jumaat.*

**Live app:** https://mhh-usm.github.io/simulasi-umrah/

Developed by Ir. Ts. Dr. Muhammad Hafiz HASSAN, School of Mechanical Engineering, Universiti Sains Malaysia.

## Features

- **Guide (Panduan):** 9 steps following Lembaga Tabung Haji notes (Shafi'i school), with rukun/wajib/sunat badges, Arabic text with transliteration and meaning, ihram state and a tap-to-cut tahallul step.
- **Tawaf and sa'ie simulation:** 360° panorama photos or a 3D model (three.js), with lap counting, raml and the green-light zone for men, a minimap, gyroscope look-around, VR, and spoken readings.
- **Lap counter (Pengira pusingan):** a full-screen counter for tawaf and sa'ie. Tap once at the end of each circuit or lap; it works without GPS or internet, ignores a second tap within 4 seconds, and gives a voice announcement and a vibration with one buzz per lap number. The count stays saved if the app closes. Open it from the tawaf or sa'ie step, the tracker, or the home-screen shortcut.
- **Doa umrah (in Bacaan):** the six recitations from the guide, in one place and in the order of the rites (niat, talbiah, Hajar Aswad, Rabbana atina, the Safa verse, and the Safa–Marwah dhikr). Each one shows the Arabic, a transliteration and the meaning, with a button to hear the Arabic read aloud.
- **Emergency card (🆘):** the pilgrim fills it in before travelling. If they are lost or unwell, it shows their name, hotel, room, group leader, meeting point, family phone and medical notes in Arabic and English, ready to show to an officer. The phone numbers can be called with one tap, as can 911, 937 and 1966. It works offline and stays on the phone.
- **Umrah tracker (Penjejak):** detects tawaf, sa'ie and the walk back to the hotel by GPS, and estimates time, distance and steps. It includes:
  - a practice mode for use at home;
  - a lap-count vibration (one buzz per lap number);
  - a phone check before starting;
  - a pocket mode and a picture-in-picture mini screen.
- **Ziarah:** places in and around Makkah, food and family tips, photo spots, useful apps and practical information.
- **Friday readings:** Yasin and al-Ma'thurat. Quran audio streams from MP3Quran.net and can be saved for offline use.
- **Usability:** four languages (Malay, English, Indonesian, Arabic with right-to-left layout), larger-text control (A− / A+), an outdoor high-contrast mode, and light and dark themes, all in the ⚙ Settings sheet. Kembali / Seterusnya (Back / Next) stay on screen while reading, and the phone's Back button steps back through the guide.
- **Installable and offline:** a PWA that works offline after the first visit, including its fonts, 360° photos and 3D view. **⚙ → Sedia untuk perjalanan** (ready for travel) checks before the trip whether everything is saved, and whether the app is installed, the surah audio is saved, the emergency card is filled in and the phone has an Arabic voice. Only maps and audio that hasn't been saved need internet. No account, no ads, no tracking; see [privacy.html](privacy.html).

## Run locally

There is no build step. Serve the folder over HTTP; the service worker and GPS need `http://localhost` or HTTPS, not `file://`.

```sh
python -m http.server 8000      # or: npx serve .
# open http://localhost:8000/
```

## Test

Automated browser tests drive headless Chrome at phone size. They need Node 22+ and Chrome or Edge.

```sh
node tests/run-all.js
```

See [HANDOFF.md](HANDOFF.md) §5 for details.

## Deploy

GitHub Pages serves the repository root (Settings → Pages → Deploy from a branch).

`index.html`, `privacy.html` and `manifest.json` are fetched fresh whenever the phone is online, so changing them needs nothing extra.

If you change any other cached file (`pano-*.jpg`, `leaflet.js`, the icons, `fonts/`), bump `CACHE` in [sw.js](sw.js) so phones replace their saved copies.

## Files

| File | Purpose |
|---|---|
| [index.html](index.html) | The whole app: styles, markup and script in one file. It embeds the Friday-reading texts and the USM logo |
| [pano-k.jpg](pano-k.jpg), [pano-s.jpg](pano-s.jpg) | 360° panoramas of the mataf and the mas'a, loaded when 360° view is opened |
| [leaflet.js](leaflet.js) | Leaflet 1.9.4 map library (BSD-2-Clause), loaded when the tracker opens |
| [fonts/](fonts/) | Manrope, Amiri, Amiri Quran and Noto Sans Arabic (SIL Open Font License 1.1; licence files included). Only the Arabic, Latin and Latin Extended subsets, about 580 KB, so the app needs no font server |
| [sw.js](sw.js) | Service worker: offline cache |
| [manifest.json](manifest.json), `icon-*.png` | Install metadata, home-screen shortcuts and icons |
| [privacy.html](privacy.html) | Privacy policy (Malay and English) |
| `*.mp3`, `audio/` | Surah audio from an earlier version. The current app streams audio and does not use these files |

External services: three.js r128 (cdnjs, saved for offline after the first visit), OpenStreetMap tiles, MP3Quran.net audio.

For maintainers, see [HANDOFF.md](HANDOFF.md) for the code map, design decisions, testing notes and open items.
