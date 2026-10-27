// Core flows: Back to guide, resume progress, on-demand panoramas/maps, tawaf bar, text size, theme, credit, offline
// Run: node tests/core.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  check("first load: journey visible", await ev(sh("journey")));
  const pageReq = await ev("performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname)");
  check("first load: page itself fetches no panorama or leaflet", !pageReq.some(u => /pano|leaflet/.test(u)), pageReq.filter(u=>!/fonts|three/.test(u)).join(" "));
  await shot("1-journey");
  check("welcome step shows full credit", await ev("(()=>{const c=document.querySelector('#jcard .credit');return !c.classList.contains('mini')&&!!c.querySelector('img');})()"));

  // ---- 2. persistence ----
  for (let i = 0; i < 4; i++) await tap("#jnext");
  await ev(`(()=>{const s=document.getElementById("jlang");s.value="en";s.dispatchEvent(new Event("change"));})()`);
  await ev(`document.querySelector('[data-sex="f"]').click()`);
  const before = await ev(`document.getElementById("jtitle").textContent`);
  await send("Page.reload"); await sleep(3500);
  const after = await ev(`document.getElementById("jtitle").textContent`);
  check("reload keeps step + language", before === after && /Tawaf/.test(after), `${before} | ${after}`);
  check("other steps show compact credit", await ev("(()=>{const c=document.querySelector('#jcard .credit');return c.classList.contains('mini')&&c.getBoundingClientRect().height<70;})()"), await ev("Math.round(document.querySelector('#jcard .credit').getBoundingClientRect().height)+'px'"));
  check("phone: body text left-aligned", await ev("getComputedStyle(document.querySelector('#jbody p')).textAlign")==="start");
  const small = await ev("[...document.querySelectorAll('#jcard button,#jcard select')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44&&!b.classList.contains('strand')).map(b=>b.id||b.textContent.slice(0,12)+':'+Math.round(b.getBoundingClientRect().height))");
  check("guide buttons are at least 44px tall", small.length===0, JSON.stringify(small));
  const fs0 = await ev("parseFloat(getComputedStyle(document.getElementById('jbody')).fontSize)");
  for(let i=0;i<4;i++) await tap("#fsUp");
  const fs1 = await ev("parseFloat(getComputedStyle(document.getElementById('jbody')).fontSize)");
  check("A+ enlarges text to 1.45x and stops there", Math.abs(fs1-fs0*1.45)<0.2 && await ev("document.getElementById('fsUp').disabled"), fs0+"px -> "+fs1+"px");
  await shot("1b-large-text");
  // theme follows phone until picked
  const theme = () => ev("document.documentElement.getAttribute('data-theme')");
  const waitTheme = async want => { for (let i=0;i<30;i++){ if (await theme()===want) return want; await sleep(100);} return await theme(); };
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:"dark"}]});
  const t1 = await waitTheme("dark");
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:"light"}]});
  const t2 = await waitTheme("light");
  check("theme follows phone setting", t1==="dark"&&t2==="light", t1+","+t2);
  await tap("#jtop .themeBtn");
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:"light"}]}); await sleep(1500);
  check("chosen theme sticks over phone setting", await theme()==="dark");
  await shot("1c-dark-picked");
  await tap("#jtop .themeBtn");
  check("reload keeps sex choice", await ev(`document.querySelector('[data-sex="f"]').getAttribute("aria-pressed")`) === "true");

  // ---- 1 + 4. tawaf view, More sheet, Back button ----
  await tap("[data-act=\"tawaf\"]");
  check("intro opened, history guard pushed", await ev(sh("intro")) && await ev(`!!(history.state&&history.state.su)`));
  await tap("#go"); await sleep(3000);
  check("text size survives reload", Math.abs(await ev("parseFloat(getComputedStyle(document.getElementById('jbody')).fontSize)")-fs1)<0.2);
  check("tawaf view: bar visible", await ev(sh("bar")));
  check("panorama fetched on demand", served.includes("/pano-k.jpg"));
  const barH = await ev(`document.getElementById("bar").getBoundingClientRect().height`);
  check("bar is compact (<=2 rows)", barH < 120, "height " + barH);
  await shot("2-tawaf-bar");
  await tap("#moreBtn"); await sleep(300);
  for(const lg of ["bm","id","ar","en"]){await ev("(()=>{const s=document.getElementById('jlang');s.value='"+lg+"';s.dispatchEvent(new Event('change'));})()");for(const pl of [0,1]){await tap("#play");console.log("  "+lg+" play-toggle"+pl+" bar height:",await ev("document.getElementById('bar').getBoundingClientRect().height"));}}
  check("More sheet opens", await ev(sh("more")));
  const offscreen = await ev(`[...document.querySelectorAll("#more button")].filter(b=>getComputedStyle(b).display!=="none").some(b=>{const r=b.getBoundingClientRect();return r.left<0||r.right>innerWidth||r.top<0;})`);
  check("More sheet fits on screen", !offscreen);
  await shot("3-more-sheet");
  await back(); await sleep(500);
  check("Back #1 closes sheet, stays in tawaf", !(await ev(sh("more"))) && await ev(sh("bar")));
  await back(); await sleep(800);
  check("Back #2 returns to guide", await ev(sh("journey")) && !(await ev(sh("bar"))));

  // ---- reader + tracker via Back ----
  await tap("#tabs [data-tab=reader]"); await sleep(400);
  await back(); await sleep(600);
  check("Back from reader returns to guide", await ev(sh("journey")) && !(await ev(sh("reader"))));
  await tap("#tabs [data-tab=trk]"); await sleep(2000);
  check("tracker loads leaflet on demand", served.includes("/leaflet.js") && await ev(`typeof L!=="undefined"`));
  await shot("4-tracker");
  await back(); await sleep(600);
  check("Back from tracker returns to guide", await ev(sh("journey")) && !(await ev(sh("trk"))));

  check("service worker registered", await ev(`navigator.serviceWorker.getRegistration().then(r=>!!r)`));
  // ---- sa'ie panorama ----
  await tap("#jnext");await tap("#jnext");
  const sai = await ev(`!!document.querySelector('[data-act="sai"]')`);
  if (sai) { await tap("[data-act=\"sai\"]"); await sleep(2500); check("sa'ie panorama fetched on demand", served.includes("/pano-s.jpg")); await shot("5-sai"); }
});
