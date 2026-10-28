// Guide layout: compact header (step bar + ⚙), Settings sheet (open/close/Back, credit, language, RTL, largest text),
// Kembali/Seterusnya always visible above the tab bar while scrolling, no credit line on other screens
// Run: node tests/guide-layout.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, back, sleep, shot, check }) => {
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  const R = sel => ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right)};})()`);
  const ssOn = () => ev("document.getElementById('sset').classList.contains('on')");
  const title = () => ev("document.getElementById('jtitle').textContent");
  const scroll = y => ev(`(()=>{document.getElementById('journey').scrollTop=${y};document.getElementById('jcard').scrollTop=${y};})()`);
  // nav visible: fully on screen and above the tab bar
  const navOk = async () => { const n = await R("#jnext"), t = await R("#tabs"); return n.top >= 0 && n.bottom <= t.top + 1; };
  // sticky nav sits directly on the tab bar (no gap showing content underneath)
  const navGap = async () => (await R("#tabs")).top - (await R("#jnav")).bottom;
  check("welcome step keeps full credit", await ev("(()=>{const c=document.querySelector('#jcard .credit');return !c.hidden&&!!c.querySelector('img');})()"));
  for (let i = 0; i < 4; i++) await tap("#jnext");
  // ---- header ----
  const top = await R("#jtop");
  check("header is one row (step bar + ⚙)", top.h <= 52 && await ev("!document.querySelector('#jtop select,#jtop .themeBtn,#jtop .fsz')"), "height " + top.h);
  check("step title starts near the top", (await R("#jtitle")).top < 140, (await R("#jtitle")).top + "px");
  check("ihram pill shares the badge row", Math.abs((await R("#jstate")).top - (await R("#jbadges .badge")).top) < 12);
  // ---- sticky nav on a long step ----
  check("long step: Seterusnya visible without scrolling", await navOk(), JSON.stringify(await R("#jnext")));
  check("sticky nav sits right on the tab bar", Math.abs(await navGap()) <= 1, "gap " + await navGap());
  await shot("g1-tawaf-top");
  await scroll(400); await sleep(200);
  check("mid-scroll: Seterusnya still visible above tab bar", await navOk());
  await shot("g2-tawaf-mid");
  await scroll(1e6); await sleep(200);
  check("end of step: Seterusnya visible above tab bar", await navOk());
  const gap = await ev("(()=>{const els=[...document.querySelectorAll('#jcard > *')].filter(e=>e.offsetParent);const last=els[els.length-1];return Math.round(document.getElementById('tabs').getBoundingClientRect().top-last.getBoundingClientRect().bottom);})()");
  check("end of step: last item clear of the tab bar", gap >= 0, "gap " + gap);
  check("nav background is fully opaque", await ev("(()=>{const c=getComputedStyle(document.getElementById('jnav')).backgroundColor.match(/[\\d.]+/g);return c.length===3||+c[3]===1;})()"));
  await tap("#jnext"); await sleep(300);
  check("tapping sticky Seterusnya moves to the next step and scrolls to top", (await title()).startsWith("5") && await ev("document.getElementById('journey').scrollTop") === 0, await title());
  // ---- Settings sheet ----
  const t5 = await title();
  await tap("#setBtn"); await sleep(300);
  check("⚙ opens Settings sheet", await ssOn() && await ev("document.getElementById('setBtn').getAttribute('aria-expanded')") === "true");
  check("sheet covers the tab bar", await ev("(()=>{const t=document.getElementById('tabs').getBoundingClientRect();return document.getElementById('sset').contains(document.elementFromPoint(t.left+t.width/2,t.top+t.height/2));})()"));
  check("sheet has language, text size, theme, outdoor and full credit", await ev("['#sset #jlang','#sset #fsUp','#sset .themeBtn','#sset .hcBtn','#sset .credit img'].every(s=>{const e=document.querySelector(s);return e&&e.offsetParent;})"));
  check("sheet labels in Malay", await ev("document.getElementById('ssT').textContent") === "⚙️ Tetapan" && await ev("document.getElementById('ssSize').textContent") === "Saiz teks");
  check("sheet fits on screen", await ev("(()=>{const r=document.querySelector('#sset .ssc').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1;})()"));
  await shot("g3-settings");
  await back(); await sleep(500);
  check("device Back closes the sheet, step unchanged", !(await ssOn()) && await title() === t5, await title());
  await tap("#setBtn"); await sleep(300);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 195, y: 40, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 195, y: 40, button: "left", clickCount: 1 }); await sleep(500);
  check("tapping the dimmed area closes the sheet", !(await ssOn()));
  await back(); await sleep(500);
  check("after closing, Back steps the guide back one", (await title()).startsWith("4"), await title());
  // language from the sheet
  await tap("#setBtn"); await sleep(300);
  await ev("(()=>{const s=document.getElementById('jlang');s.value='en';s.dispatchEvent(new Event('change'));})()"); await sleep(300);
  check("language change updates sheet, guide and tabs", await ev("document.getElementById('ssT').textContent") === "⚙️ Settings" && /Tawaf/.test(await title()) && await ev("document.querySelector('#tabs .tl').textContent") === "Guide");
  await ev("(()=>{const s=document.getElementById('jlang');s.value='ar';s.dispatchEvent(new Event('change'));})()"); await sleep(300);
  check("Arabic: sheet right-to-left, no sideways scroll", await ev("getComputedStyle(document.querySelector('#sset .ssc')).direction") === "rtl" && await ev("document.scrollingElement.scrollWidth<=innerWidth"));
  await shot("g4-settings-ar");
  await ev("(()=>{const s=document.getElementById('jlang');s.value='bm';s.dispatchEvent(new Event('change'));})()");
  // largest text
  for (let i = 0; i < 4; i++) await tap("#fsUp");
  check("largest text: sheet still fits", await ev("(()=>{const r=document.querySelector('#sset .ssc').getBoundingClientRect();return r.top>=0&&r.right<=innerWidth+1;})()"));
  await tap("#ssX"); await sleep(300);
  check("largest text: header one row, nav visible", (await R("#jtop")).h <= 52 && await navOk());
  await shot("g5-large-text");
  // ---- other screens: no credit line ----
  for (const t of ["trk", "reader", "ziarah"]) {
    await tap(`#tabs [data-tab=${t}]`); await sleep(900);
    check(`${t}: no credit line`, await ev(`[...document.querySelectorAll('#${t} .credit')].every(c=>!c.offsetParent)`));
  }
});
