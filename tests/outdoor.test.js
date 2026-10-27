// Outdoor high-contrast mode: measured contrast ratios in light and dark, persistence, tawaf panel, More sheet
// Run: node tests/outdoor.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  // contrast ratio of an element's text vs the nearest opaque-ish background
  const CR = `((sel)=>{const el=document.querySelector(sel);const p=c=>c.match(/[\\d.]+/g).map(Number);
    const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
    let n=el,bg=null,a=0;while(n&&n.nodeType===1){const c=p(getComputedStyle(n).backgroundColor);if(c.length===3||c[3]>0){bg=c;a=c.length===3?1:c[3];break;}n=n.parentElement;}
    const fg=p(getComputedStyle(el).color);const l1=L(fg),l2=L(bg||[255,255,255]);const r=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);return {ratio:+r.toFixed(1),bgAlpha:a};})`;
  const cr = async sel => ev(CR + "(" + JSON.stringify(sel) + ")");
  for (let i=0;i<40 && !(await ev("document.querySelectorAll('#jbody p').length>0"));i++) await sleep(250);
  await tap("#jnext"); await sleep(300);
  const before = await cr("#jbody p, #jbody li"), softB = await cr("#jcard .credit");
  check("outdoor off by default", await ev("document.documentElement.getAttribute('data-contrast')") === null && await ev("document.querySelector('#jtop .hcBtn').getAttribute('aria-pressed')") === "false");
  await tap("#jtop .hcBtn"); await sleep(300);
  const after = await cr("#jbody p, #jbody li"), softA = await cr("#jcard .credit");
  console.log("  body text contrast:", before.ratio, "->", after.ratio, "| small grey text:", softB.ratio, "->", softA.ratio, "| card alpha:", after.bgAlpha);
  check("outdoor on: attribute + pressed", await ev("document.documentElement.getAttribute('data-contrast')") === "high" && await ev("document.querySelector('#jtop .hcBtn').getAttribute('aria-pressed')") === "true");
  check("light outdoor: body text near max contrast (>=18:1)", after.ratio >= 18);
  check("light outdoor: small grey text >=12:1", softA.ratio >= 12);
  check("guide card fully opaque", after.bgAlpha === 1);
  await shot("b1-outdoor-light");
  await tap("#jtop .themeBtn"); await sleep(300);
  const dk = await cr("#jbody p, #jbody li"), dks = await cr("#jcard .credit");
  console.log("  dark outdoor:", dk.ratio, "| small:", dks.ratio);
  check("dark outdoor: body >=18:1, small >=12:1", dk.ratio >= 18 && dks.ratio >= 12);
  await shot("b2-outdoor-dark");
  const SCAN = `(()=>{const p=c=>c.match(/[\\d.]+/g).map(Number);const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
    const bad=[];document.querySelectorAll("button,a.pmap").forEach(b=>{if(!b.offsetParent||!b.textContent.trim())return;let n=b,bg=null;while(n&&n.nodeType===1){const c=p(getComputedStyle(n).backgroundColor);if(c.length===3||c[3]>=.99){bg=c;break;}n=n.parentElement;}
      const fg=p(getComputedStyle(b).color),r=(Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05);if(r<4.5)bad.push((b.id||b.textContent.trim().slice(0,18))+":"+r.toFixed(1));});return bad;})()`;
  let bad = await ev(SCAN); check("dark outdoor: every visible button text >=4.5:1", bad.length===0, JSON.stringify(bad));
  await tap("#jtop .themeBtn"); await sleep(300); bad = await ev(SCAN); check("light outdoor: every visible button text >=4.5:1", bad.length===0, JSON.stringify(bad)); await tap("#jtop .themeBtn"); await sleep(300);
  await tap("#jtop .themeBtn");
  await send("Page.reload"); await sleep(3500);
  check("outdoor mode survives reload", await ev("document.documentElement.getAttribute('data-contrast')") === "high" && await ev("document.querySelector('#jtop .hcBtn').getAttribute('aria-pressed')") === "true");
  // tawaf view: HUD solid over the panorama, button in More sheet
  await tap("#jnext"); await tap("#jnext"); await tap("#jnext");
  await tap('[data-act="tawaf"]'); await tap("#go"); await sleep(2500);
  const hud = await cr("#guide");
  console.log("  HUD text contrast:", hud.ratio, "alpha", hud.bgAlpha);
  check("tawaf HUD solid and high contrast", hud.bgAlpha === 1 && hud.ratio >= 15);
  await tap("#moreBtn"); await sleep(300);
  check("outdoor toggle in More sheet, shows pressed", await ev("document.querySelector('#more .hcBtn').getAttribute('aria-pressed')") === "true");
  await shot("b3-tawaf-outdoor");
  await tap("#more .hcBtn"); await sleep(300);
  check("turning off from More sheet syncs header button", await ev("document.querySelector('#jtop .hcBtn').getAttribute('aria-pressed')") === "false" && await ev("document.documentElement.getAttribute('data-contrast')") === null);
  const hudOff = await cr("#guide");
  check("normal mode restored (glass panel again)", hudOff.bgAlpha < 1, "alpha " + hudOff.bgAlpha);
});
