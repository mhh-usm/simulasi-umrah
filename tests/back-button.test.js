// Device Back button scenarios; every history entry added during a user tap (Chrome skips the others)
// Run: node tests/back-button.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  // record every pushState and whether a real user tap was active (Chrome skips entries added without one)
  await ev(`window.__push=[];const _ps=history.pushState.bind(history);history.pushState=function(s,t,u){window.__push.push({k:s&&s.k,active:navigator.userActivation?navigator.userActivation.isActive:null});return _ps(s,t,u);};`);
  const stepNo = async () => { const t = await ev("(document.getElementById('jtitle')||{}).textContent||''"); const m = /^(\d+)\./.exec(t); return shownJ() ? (m ? +m[1] : 0) : null; };
  const shownJ = () => ev(sh("journey"));
  let baseIdx = 0;
  const hist = async () => { for (let i = 0; i < 20; i++) { const r = (await send("Page.getNavigationHistory")).result; if (r && r.entries) return r; await sleep(250); } throw new Error("no history"); };
  const onApp = async () => { const h = await hist(); return h.currentIndex >= baseIdx && /localhost/.test(h.entries[h.currentIndex].url); };
  const back = async () => { const h = await hist(); if (h.currentIndex > 0) await send("Page.navigateToHistoryEntry", { entryId: h.entries[h.currentIndex - 1].id }); await sleep(700); };
  const where = async () => (await onApp()) ? ((await shownJ()) ? "guide step " + (await stepNo()) : "other screen") : "LEFT APP";
  const expect = async (name, want) => { const w = await where(); check(name, w === want, w); };
  const fresh = async () => { await keepPush(); await send("Page.navigate", { url: `http://localhost:${PORT}/` }); await sleep(3500);
    for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
    await ev("localStorage.removeItem('su-state')"); await send("Page.navigate", { url: `http://localhost:${PORT}/` }); await sleep(3500);
    for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
    baseIdx = (await hist()).currentIndex;
    await ev(`window.__push=[];const _ps=history.pushState.bind(history);history.pushState=function(s,t,u){window.__push.push({k:s&&s.k,active:navigator.userActivation?navigator.userActivation.isActive:null});return _ps(s,t,u);};`); };
  let pushLog = [];
  const keepPush = async () => { try { pushLog = pushLog.concat(JSON.parse(await ev("JSON.stringify(window.__push||[])"))); } catch (e) {} };
  const allActive = async () => { await keepPush(); const p = pushLog; return { ok: p.every(x => x.active !== false), n: p.length, bad: p.filter(x => x.active === false) }; };

  // A. Next x3 then Back walks back through steps, then leaves
  await fresh();
  for (let i = 0; i < 3; i++) await tap("#jnext");
  await back(); await expect("A1 Back from step 3 -> step 2", "guide step 2");
  await back(); await expect("A2 Back -> step 1", "guide step 1");
  await back(); await expect("A3 Back -> step 0 (welcome)", "guide step 0");
  await back(); await expect("A4 Back on first step leaves the app", "LEFT APP");

  // B. Kembali button shares the same history
  await fresh();
  await tap("#jnext"); await tap("#jnext");
  const iB = (await hist()).currentIndex;
  await tap("#jprev"); await sleep(600);
  await expect("B1 Kembali goes to step 1", "guide step 1");
  check("B2 Kembali did not add a history entry (moved back in it)", (await hist()).currentIndex === iB - 1);
  await back(); await expect("B3 device Back -> step 0", "guide step 0");
  await back(); await expect("B4 then Back leaves", "LEFT APP");

  // C. other screen -> Back -> guide at same step
  await fresh();
  await tap("#jnext"); await tap("#jnext");
  await tap("#tabs [data-tab=trk]"); await sleep(1000);
  await back(); await expect("C1 Back from tracker -> guide step 2", "guide step 2");
  await back(); await expect("C2 Back again -> step 1", "guide step 1");

  // D. the reported bug: return to guide with an in-app button, then Back must NOT close the app
  await fresh();
  await tap("#jnext"); await tap("#jnext");
  await tap("#tabs [data-tab=reader]"); await sleep(600);
  await tap("#tabs [data-tab=journey]"); await sleep(1000);
  await expect("D1 returned to guide by tab", "guide step 2");
  await back(); await expect("D2 Back -> step 1 (used to close the app)", "guide step 1");
  await tap("#tabs [data-tab=ziarah]"); await sleep(600);
  await tap("#zback"); await sleep(1000);
  await back(); await expect("D3 after '‹ Panduan' button, Back -> step 0", "guide step 0");

  // E. tawaf view with More sheet open
  await fresh();
  for (let i = 0; i < 4; i++) await tap("#jnext");
  await tap('[data-act="tawaf"]'); await tap("#go"); await sleep(1500);
  await tap("#moreBtn"); await sleep(300);
  await back(); check("E1 Back closes More sheet, stays in tawaf", !(await ev(sh("more"))) && await ev(sh("bar")) && await onApp());
  await back(); await expect("E2 Back -> guide step 4", "guide step 4");
  await back(); await expect("E3 Back -> step 3", "guide step 3");

  // F. step bar jump
  await fresh();
  await tap('#jsteps [data-js="5"]');
  await back(); await expect("F1 after jump to 5, Back -> step 4", "guide step 4");

  // G. switching between tabs keeps a single guard
  await fresh();
  await tap("#jnext");
  await tap("#tabs [data-tab=trk]"); await sleep(800); await tap("#tabs [data-tab=reader]"); await sleep(500); await tap("#tabs [data-tab=ziarah]"); await sleep(500);
  await back(); await expect("G1 after 3 tab switches, one Back -> guide step 1", "guide step 1");

  // H. every history entry was added during a real tap (so Chrome will not skip it)
  const act = await allActive();
  check("H1 every history entry added during a user tap", act.ok, act.n + " pushes, bad: " + JSON.stringify(act.bad));
  // I. deep link (?open=trk) adds no entry without a tap; first tap arms Back
  await send("Page.navigate", { url: `http://localhost:${PORT}/?open=trk` }); await sleep(4000); baseIdx = (await hist()).currentIndex;
  for (let i=0;i<30 && !(await ev(sh("trk")));i++) await sleep(250);
  check("I1 deep link opens tracker", await ev(sh("trk")));
  check("I1b deep link added no history entry without a tap", (await hist()).currentIndex === baseIdx);
  await tap("#kchkb"); await sleep(600);
  await back(); await expect("I2 after a tap, Back -> guide", "guide step " + (await ev("JSON.parse(localStorage.getItem('su-state')||'{}').jstep||0")));
});
