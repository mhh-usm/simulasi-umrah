// Tracker phone check before Start: GPS blocked/allowed, motion, screen-on, battery, confirm on blocked GPS
// Run: node tests/tracker-check.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  const origin = `http://localhost:${PORT}`;
  const rows = () => ev("[...document.querySelectorAll('#kchkv li')].map(l=>l.className+': '+l.innerText.replace(/\\s+/g,' '))");
  // A. GPS blocked
  await send("Browser.setPermission",{permission:{name:"geolocation"},setting:"denied",origin});
  await tap("#tabs [data-tab=trk]"); await sleep(2800);
  let r = await rows(); console.log("  rows (blocked):", JSON.stringify(r,null,1));
  check("checklist shows GPS blocked with fix instructions", /^err: .*Lokasi.*Tetapan/.test(r[0]||""));
  const needsAsk = await ev("typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'");
  console.log("  motion needs permission prompt in this browser:", needsAsk);
  check("motion row correct before asking", needsAsk ? /^unk/.test(r[1]) : !/^unk/.test(r[1]));
  check("screen-on row resolved", !/^unk/.test(r[2]));
  await tap("#kstart"); await sleep(300);
  check("Start with GPS blocked asks to confirm, does not start", !(await ev(sh("kpocket"))) && /sekali lagi/.test(await ev("document.getElementById('kstart').textContent")));
  await ev("document.getElementById('kchkv').scrollIntoView({block:'center'})"); await sleep(200); await shot("t1-blocked");
  // B. GPS allowed, located in Makkah
  await send("Browser.setPermission",{permission:{name:"geolocation"},setting:"granted",origin});
  await send("Emulation.setGeolocationOverride",{latitude:21.4232,longitude:39.8250,accuracy:12});
  await sleep(800);
  r = await rows(); check("permission change updates GPS row live", /^ok/.test(r[0]||""), r[0]);
  await tap("#kchkb"); await sleep(3500);
  r = await rows(); console.log("  rows (allowed):", JSON.stringify(r,null,1));
  check("after Check & allow: GPS ok", /^ok/.test(r[0]||""));
  check("location card shows the fix", /21.4232/.test(await ev("document.getElementById('klocv').innerText")));
  await ev("document.getElementById('kchkv').scrollIntoView({block:'center'})"); await sleep(200); await shot("t2-allowed");
  // C. Start works normally
  await tap("#kstart"); await sleep(800);
  check("Start with GPS ok starts recording (pocket mode)", await ev(sh("kpocket")));
});
