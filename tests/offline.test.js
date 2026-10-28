// Offline readiness: fonts served from the app (no Google Fonts), service worker caches everything, Settings "Ready for the trip" check,
// then with the network cut: reload works, fonts still load, guide / lap counter / du'a / emergency card work, offline message, map notice.
// Run: node tests/offline.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT }) => {
  const origin = "http://localhost:" + PORT;
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  const res = await ev("performance.getEntriesByType('resource').map(e=>e.name)");
  check("no requests to Google Fonts", !res.some(u => /fonts\.(googleapis|gstatic)\.com/.test(u)), res.filter(u => /font/.test(u)).join(" "));
  check("local font files used", res.some(u => u.includes("/fonts/fonts.css")) && res.some(u => /\/fonts\/manrope-latin\.woff2$/.test(u)));
  check("body text uses Manrope", await ev("document.fonts.check('16px Manrope')"));
  // service worker: wait until it controls the page
  await ev("navigator.serviceWorker.ready.then(()=>1)");
  for (let i = 0; i < 20 && !(await ev("!!navigator.serviceWorker.controller")); i++) { await send("Page.reload"); await sleep(2500); }
  check("service worker controls the page", await ev("!!navigator.serviceWorker.controller"));
  // Settings: Ready for the trip
  await tap("#setBtn"); await sleep(400);
  for (let i = 0; i < 30 && (await ev("document.querySelector('#offL li').textContent")).includes("Buka semula"); i++) await sleep(300);
  const items = await ev("[...document.querySelectorAll('#offL li')].map(l=>(l.classList.contains('ok')?'OK ':'!! ')+l.textContent.trim())");
  console.log("  " + items.join("\n  "));
  check("readiness list shows app, install, audio, card, voice", items.length >= 5 && await ev("document.getElementById('offT').textContent") === "📶 Sedia untuk perjalanan");
  check("all app files saved for offline (incl. fonts, 360° photos, three.js)", items[0].startsWith("OK ✅Aplikasi, gambar 360° dan fon"), items[0]);
  check("empty emergency card flagged with a Fill-in button", await ev("!!document.querySelector('#offL [data-sos]')"));
  await tap("#offB"); await sleep(300);
  for (let i = 0; i < 40 && await ev("document.getElementById('offB').disabled"); i++) await sleep(250);
  check("Check & save again finishes", !(await ev("document.getElementById('offB').disabled")) && (await ev("document.getElementById('offB').textContent")) === "🔄 Semak & simpan semula");
  await ev("document.getElementById('sset').scrollTop=0;document.querySelector('#sset .ssc').scrollTop=400"); await sleep(200);
  await shot("o1-ready");
  await tap("#offL [data-sos]"); await sleep(400);
  check("Fill-in opens the emergency card over Settings", await ev("document.getElementById('sos').classList.contains('on')"));
  await tap("#sosX"); await sleep(300); await tap("#ssX"); await sleep(300);
  // ---- cut the network ----
  await send("Network.enable");
  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(800);
  check("going offline shows a reassuring message", (await ev("document.getElementById('flash').textContent")).startsWith("📴 Tiada internet"), await ev("document.getElementById('flash').textContent"));
  await send("Page.reload"); await sleep(4500);
  check("offline reload: guide loads", await ev("document.querySelectorAll('#jbody *').length>0") && !(await ev("navigator.onLine")));
  const arOk = await ev("document.fonts.load(\"26px 'Amiri Quran'\",'بسم').then(f=>f.length>0)");
  check("offline: Arabic Quran font still loads", arOk && await ev("document.fonts.check(\"26px 'Amiri Quran'\",'بسم')"));
  check("offline: three.js available (3D view)", await ev("typeof THREE!=='undefined'"));
  await tap("#tabs [data-tab=reader]"); await sleep(600);
  check("offline: du'a tab works", await ev("document.querySelectorAll('#rbody .doa').length") === 6);
  await shot("o2-offline-doa");
  await tap("#tabs [data-tab=journey]"); await sleep(400);
  await tap("#sosBtn"); await sleep(400);
  check("offline: emergency card opens", await ev("document.getElementById('sos').classList.contains('on')"));
  await tap("#sosX"); await sleep(300);
  for (let i = 0; i < 4; i++) await tap("#jnext");
  await tap('#jbody [data-lc="t"]'); await sleep(300); await tap("#lcTap"); await sleep(200);
  check("offline: lap counter counts", await ev("document.querySelector('#lcN b').textContent") === "2");
  await tap("#lcX"); await sleep(300);
  // map notice: tracker location map while offline
  await send("Browser.setPermission", { permission: { name: "geolocation" }, setting: "granted", origin });
  await send("Emulation.setGeolocationOverride", { latitude: 21.4225, longitude: 39.8262, accuracy: 10 });
  await tap("#tabs [data-tab=trk]"); await sleep(1500);
  await tap("#kloc"); await sleep(2500);
  check("offline: map shows 'needs internet' notice", (await ev("(document.querySelector('.kmapoff')||{}).textContent||''")).startsWith("📴 Peta memerlukan internet"), await ev("typeof L"));
  await shot("o3-offline-map");
  await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(800);
  check("back online message", (await ev("document.getElementById('flash').textContent")) === "📶 Internet kembali.");
});
