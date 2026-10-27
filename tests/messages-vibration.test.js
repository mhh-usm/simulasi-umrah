// On-screen messages (above every screen, 3-6 s), hair-cut vibration, tracker lap-count vibration on a simulated practice walk (~75 s)
// Run: node tests/messages-vibration.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  const origin = "http://localhost:" + PORT;
  await ev("window.__vib=[];navigator.vibrate=p=>{window.__vib.push(p);return true;};");
  const vib = () => ev("JSON.stringify(window.__vib)");
  // --- messages on the guide screen ---
  await tap("#jnext"); await tap("#jnext");
  await tap('[data-act="niat"]');
  const f0 = await ev("(()=>{const f=document.getElementById('flash');return {z:getComputedStyle(f).zIndex,t:f.textContent,live:f.getAttribute('aria-live')};})()");
  console.log("  flash:", JSON.stringify(f0));
  check("ihram message shows above the guide card", f0.z === "30" && f0.t.length > 0 && f0.live === "polite");
  await sleep(1800);
  check("message still visible after ~2 s", await ev("getComputedStyle(document.getElementById('flash')).opacity") === "1");
  await shot("b1-niat-message");
  await sleep(4800);
  check("message gone after ~6.6 s", await ev("document.getElementById('flash').style.opacity") === "0");
  // --- hair cut feedback ---
  for (let i = 0; i < 5; i++) await tap("#jnext");
  for (let i = 0; i < 3; i++) { await tap(".strand:not(.gone)"); await sleep(400); }
  const cv = await vib(); console.log("  cut vibrations:", cv);
  check("hair cut: short buzz x2 then celebration", cv === JSON.stringify([40, 40, [60, 80, 60, 80, 240]]));
  await ev("window.__vib=[]");
  // --- tracker practice mode, simulated walk ---
  await send("Browser.setPermission", { permission: { name: "geolocation" }, setting: "granted", origin });
  let lat = 5.3560, lon = 100.3020;
  await send("Emulation.setGeolocationOverride", { latitude: lat, longitude: lon, accuracy: 8 });
  await tap("#tabs [data-tab=trk]"); await sleep(1500);
  await tap("#kstart"); await sleep(1500);
  check("tracker recording started", await ev(sh("kpocket")));
  await ev("document.getElementById('kpocket').style.display='none'");
  await ev("document.querySelector('[data-kseg=\"1\"]').click()"); await sleep(500);
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    lat += 8.6 / 111320;
    await send("Emulation.setGeolocationOverride", { latitude: lat, longitude: lon, accuracy: 8 }); await sleep(3050);
    const v = JSON.parse(await vib()); if (v.some(p => JSON.stringify(p) === "[160,160,160]")) break;
  }
  const tv = await vib(); console.log("  tracker vibrations:", tv, "after", Math.round((Date.now() - t0) / 1000) + "s");
  const arr = JSON.parse(tv);
  check("lap 1 start: 1 buzz", arr.some(p => JSON.stringify(p) === "[160]"));
  check("lap 2 start: 2 buzzes", arr.some(p => JSON.stringify(p) === "[160,160,160]"));
  check("no old weak 120ms buzz", !arr.includes(120));
});
