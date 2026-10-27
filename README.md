# Simulasi Umrah: Niat hingga Tahallul (V2)

A step-by-step umrah guide for pilgrims' phones, from the intention (niat) at the miqat to tahallul, with 3D and 360° simulations of tawaf and sa'ie, a GPS umrah tracker, Makkah ziarah notes and Friday readings.

*Panduan umrah langkah demi langkah untuk telefon jemaah: dari niat di miqat hingga tahallul, dengan simulasi 3D/360° tawaf dan sa'ie, penjejak umrah (masa, jarak, langkah), ziarah Makkah dan bacaan Jumaat.*

**Live app:** https://mhh-usm.github.io/simulasi-umrah/

Developed by Ir. Ts. Dr. Muhammad Hafiz HASSAN, School of Mechanical Engineering, Universiti Sains Malaysia.

## Features

- **Guide (Panduan):** 9 steps following Lembaga Tabung Haji notes (Shafi'i school), with rukun/wajib/sunat badges, Arabic text with transliteration and meaning, ihram state and a tap-to-cut tahallul step.
- **Tawaf and sa'ie simulation:** 360° panorama photos or a 3D model (three.js), with lap counting, raml and the green-light zone for men, a minimap, gyroscope look-around, VR, and spoken readings.
- **Umrah tracker (Penjejak):** detects tawaf, sa'ie and the walk back to the hotel by GPS, and estimates time, distance and steps. It includes:
  - a practice mode for use at home;
  - a lap-count vibration (one buzz per lap number);
  - a phone check before starting;
  - a pocket mode and a picture-in-picture mini screen.
- **Ziarah:** places in and around Makkah, food and family tips, photo spots, useful apps and practical information.
- **Friday readings:** Yasin and al-Ma'thurat. Quran audio streams from MP3Quran.net and can be saved for offline use.
- **Usability:** four languages (Malay, English, Indonesian, Arabic with right-to-left layout), larger-text control (A− / A+), an outdoor high-contrast mode, light and dark themes, and the phone's Back button steps back through the guide.
- **Installable and offline:** a PWA that works offline after the first visit. No account, no ads, no tracking; see [privacy.html](privacy.html).

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

If you change any other cached file (`pano-*.jpg`, `leaflet.js`, the icons), bump `CACHE` in [sw.js](sw.js) so phones replace their saved copies.

## Files

| File | Purpose |
|---|---|
| [index.html](index.html) | The whole app: styles, markup and script in one file. It embeds the Friday-reading texts and the USM logo |
| [pano-k.jpg](pano-k.jpg), [pano-s.jpg](pano-s.jpg) | 360° panoramas of the mataf and the mas'a, loaded when 360° view is opened |
| [leaflet.js](leaflet.js) | Leaflet 1.9.4 map library (BSD-2-Clause), loaded when the tracker opens |
| [sw.js](sw.js) | Service worker: offline cache |
| [manifest.json](manifest.json), `icon-*.png` | Install metadata, home-screen shortcuts and icons |
| [privacy.html](privacy.html) | Privacy policy (Malay and English) |
| `*.mp3`, `audio/` | Surah audio from an earlier version. The current app streams audio and does not use these files |

External libraries: three.js r128 (cdnjs), Google Fonts, OpenStreetMap tiles, MP3Quran.net audio.

For maintainers, see [HANDOFF.md](HANDOFF.md) for the code map, design decisions, testing notes and open items.
