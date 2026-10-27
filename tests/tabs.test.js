// Bottom tab bar: switching, keeps step, hidden in tawaf/pocket, labels, largest text, content clear of the bar
// Run: node tests/tabs.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  const cur = () => ev("(document.querySelector('#tabs [aria-current=page]')||{}).dataset?.tab||null");
  const tabsOn = () => ev("getComputedStyle(document.getElementById('tabs')).display!=='none'");
  const labels = () => ev("[...document.querySelectorAll('#tabs .tl')].map(e=>e.textContent).join(',')");
  check("tab bar visible on guide, Panduan current", await tabsOn() && await cur() === "journey", await labels());
  check("old coloured buttons hidden", !(await ev("document.getElementById('kopen').offsetParent")) && !(await ev("document.getElementById('zopen').offsetParent")));
  await tap("#jnext"); await tap("#jnext"); await tap("#jnext");
  const step = await ev("document.getElementById('jtitle').textContent");
  await tap("#tabs [data-tab=trk]"); await sleep(1200);
  check("Penjejak tab opens tracker", await ev(sh("trk")) && !(await ev(sh("journey"))) && await cur() === "trk");
  await tap("#tabs [data-tab=reader]"); await sleep(600);
  check("Bacaan tab opens reader, tracker hidden", await ev(sh("reader")) && !(await ev(sh("trk"))) && await cur() === "reader");
  await tap("#tabs [data-tab=ziarah]"); await sleep(600);
  check("Ziarah tab opens ziarah, reader hidden", await ev(sh("ziarah")) && !(await ev(sh("reader"))) && await cur() === "ziarah");
  await shot("c1-ziarah-tabs");
  await tap("#tabs [data-tab=journey]"); await sleep(600);
  check("Panduan tab returns to the same step", await ev(sh("journey")) && !(await ev(sh("ziarah"))) && await ev("document.getElementById('jtitle').textContent") === step, step);
  // content not hidden behind the bar
  await ev("(()=>{const c=document.getElementById('jcard');c.scrollTop=c.scrollHeight;document.getElementById('journey').scrollTop=1e6;})()"); await sleep(300);
  const gap = await ev("(()=>{const els=[...document.querySelectorAll('#jcard > *')].filter(e=>e.offsetParent);const last=els[els.length-1];return Math.round(document.getElementById('tabs').getBoundingClientRect().top-last.getBoundingClientRect().bottom);})()");
  check("last guide item scrolls clear of the tab bar", gap >= 0, "gap " + gap + "px");
  await shot("c2-guide-bottom");
  // Back button from a tab returns to guide
  await tap("#tabs [data-tab=reader]"); await sleep(500);
  const h = (await send("Page.getNavigationHistory")).result; await send("Page.navigateToHistoryEntry", { entryId: h.entries[h.currentIndex - 1].id }); await sleep(700);
  check("device Back from a tab returns to guide", await ev(sh("journey")) && await cur() === "journey");
  // hidden during tawaf
  await tap("#jnext"); await sleep(300);
  await tap('[data-act="tawaf"]'); await sleep(300);
  check("tab bar hidden on tawaf setup", !(await tabsOn()));
  await tap("#go"); await sleep(1500);
  check("tab bar hidden during tawaf", !(await tabsOn()));
  await tap("#guideBtn"); await sleep(500);
  check("tab bar back after leaving tawaf", await tabsOn() && await cur() === "journey");
  // language + biggest text
  await ev("(()=>{const s=document.getElementById('jlang');s.value='en';s.dispatchEvent(new Event('change'));})()"); await sleep(300);
  check("labels follow language", await labels() === "Guide,Tracker,Readings,Ziarah", await labels());
  await ev("(()=>{const s=document.getElementById('jlang');s.value='bm';s.dispatchEvent(new Event('change'));})()");
  for (let i = 0; i < 4; i++) await tap("#fsUp");
  const clip = await ev("[...document.querySelectorAll('#tabs .tl')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)");
  check("at largest text, labels still fit (no cut-off)", clip.length === 0, JSON.stringify(clip));
  check("tab bar stays one row", await ev("document.getElementById('tabs').getBoundingClientRect().height") < 90);
  await shot("c3-large-text-tabs");
  // pocket mode hides it
  await tap("#tabs [data-tab=trk]"); await sleep(1000);
  await ev("document.getElementById('kpocket').style.display='flex'"); await sleep(200);
  check("tab bar hidden in pocket mode", !(await tabsOn()));
});
