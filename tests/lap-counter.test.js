// Manual lap counter (tawaf & sa'ie): open from guide and tracker, count, double-tap guard, undo, reset, voice,
// vibration, saved across reload, Back button closes it without moving the guide, shortcut ?open=lapc
// Run: node tests/lap-counter.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, back, sleep, shot, check, PORT }) => {
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  const stub = "window.__vib=[];navigator.vibrate=p=>{window.__vib.push(p);return true;};window.__say=[];speechSynthesis.speak=u=>window.__say.push(u.text);";
  await ev(stub);
  const on = () => ev("document.getElementById('lapc').classList.contains('on')");
  const num = () => ev("document.querySelector('#lcN b').textContent");
  const title = () => ev("document.getElementById('jtitle').textContent");
  const lastVib = () => ev("JSON.stringify(window.__vib.at(-1))");
  await ev("localStorage.removeItem('su-lapc')");
  for (let i = 0; i < 4; i++) await tap("#jnext");
  const t4 = await title();
  check("tawaf step has a counter button", await ev("!!document.querySelector('#jbody [data-lc=\"t\"]')"));
  await tap('#jbody [data-lc="t"]'); await sleep(300);
  check("counter opens in tawaf mode at circuit 1", await on() && await num() === "1" && await ev("document.querySelector('[data-lcm=\"t\"]').getAttribute('aria-pressed')") === "true");
  check("counter covers the tab bar", await ev("(()=>{const t=document.getElementById('tabs').getBoundingClientRect();return document.getElementById('lapc').contains(document.elementFromPoint(t.left+t.width/2,t.top+t.height/2));})()"));
  await shot("l1-tawaf-start");
  // tap 1: circuit 1 done, 2 buzzes (circuit 2 starts), spoken
  await tap("#lcTap"); await sleep(200);
  check("tap counts circuit 1, now on circuit 2", await num() === "2" && await ev("document.querySelectorAll('#lcDots i.on').length") === 1);
  check("vibration: 2 buzzes for circuit 2", await lastVib() === "[160,160,160]", await lastVib());
  check("spoken: circuit 1 done", await ev("window.__say.join('|')").then(s => s.includes("Pusingan 1 selesai")), await ev("window.__say.join('|')"));
  check("last-tap time shown", (await ev("document.getElementById('lcLast').textContent")).length > 5);
  await shot("l2-after-tap");
  // accidental second tap within 4 s is ignored
  await tap("#lcTap"); await sleep(200);
  check("second tap within 4 s ignored", await num() === "2");
  await sleep(4200);
  await tap("#lcTap"); await sleep(200);
  check("tap after 4 s counts", await num() === "3");
  await tap("#lcU"); await sleep(200);
  check("undo goes back one", await num() === "2" && await ev("window.__say.at(-1)").then(s => s.includes("1")));
  // saved across reload, and the ?open=lapc shortcut opens it
  await send("Page.navigate", { url: `http://localhost:${PORT}/?open=lapc` }); await sleep(4000);
  await ev(stub);
  check("shortcut ?open=lapc opens counter, count kept", await on() && await num() === "2");
  await tap("#lcX"); await sleep(300);
  check("close button closes counter", !(await on()));
  // Back closes the counter and leaves the guide step alone
  await send("Page.navigate", { url: `http://localhost:${PORT}/` }); await sleep(4000);
  await ev(stub);
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  check("reload resumes on the tawaf step", await title() === t4, await title());
  await tap("#jnext"); await sleep(200);
  const t5 = await title();
  await tap("#jnext"); await sleep(200);
  const t6 = await title();
  await tap('#jbody [data-lc="s"]'); await sleep(300);
  check("sa'ie step opens counter in sa'ie mode", await on() && await ev("document.querySelector('[data-lcm=\"s\"]').getAttribute('aria-pressed')") === "true");
  check("sa'ie: direction Safa to Marwah, tap at Marwah", await ev("document.getElementById('lcDir').textContent") === "Safa ke Marwah" && (await ev("document.getElementById('lcTap').textContent")).includes("Marwah"));
  await shot("l3-sai");
  await back(); await sleep(600);
  check("device Back closes counter, guide step unchanged", !(await on()) && await title() === t6, await title());
  await tap('#jbody [data-lc="s"]'); await sleep(300);
  await tap("#lcX"); await sleep(600);
  await back(); await sleep(600);
  check("after closing with ✕, Back steps the guide back one", !(await on()) && await title() === t5, await title());
  // completion: 6 done, last tap finishes
  await ev("localStorage.setItem('su-lapc',JSON.stringify({m:'t',t:[1,2,3,4,5,6],s:[],v:1}))");
  await tap("#jnext"); await tap('#jbody [data-lc]'); await sleep(300);
  await ev("document.querySelector('[data-lcm=\"t\"]').click()"); await sleep(200);
  await tap("#lcTap"); await sleep(300);
  check("7th tap: done state, button disabled", await ev("document.getElementById('lcTap').classList.contains('done')&&document.getElementById('lcTap').disabled") && await num() === "7");
  check("7th tap: long finish vibration", await lastVib() === "[500,150,500]", await lastVib());
  await shot("l4-done");
  // the long finish text ("Istilam terakhir…") must not be squeezed under the 7 / 7 button on small phones or with large text
  const fits = () => ev(`(()=>{const d=document.getElementById('lcDir'),t=document.getElementById('lcTap');
    return d.scrollHeight<=d.clientHeight+1&&d.getBoundingClientRect().bottom<=t.getBoundingClientRect().top+1;})()`);
  for (const [w, h, fs] of [[360, 640, "1"], [320, 568, "1.3"]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await ev(`document.documentElement.style.setProperty('--fs','${fs}')`); await sleep(300);
    check(`${w}x${h} text ${fs}: finish text clear of the 7 / 7 button (screen scrolls)`, await fits());
  }
  await shot("l4b-done-small");
  await ev("document.documentElement.style.setProperty('--fs','1')");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(300);
  // reset needs a second tap
  await tap("#lcR"); await sleep(200);
  check("reset asks for confirmation first", await num() === "7");
  await tap("#lcR"); await sleep(200);
  check("second tap resets", await num() === "1");
  // voice off: nothing spoken
  await tap("#lcV"); await ev("window.__say=[]"); await tap("#lcTap"); await sleep(200);
  check("voice off: tap not spoken", await ev("window.__say.length") === 0 && await num() === "2");
  // language
  await ev("(()=>{document.getElementById('lcX').click();const s=document.getElementById('jlang');s.value='en';s.dispatchEvent(new Event('change'));})()"); await sleep(300);
  await tap('#jbody [data-lc]'); await sleep(300);
  check("English labels", await ev("document.getElementById('lcTitle').textContent") === "Lap counter" && await ev("document.querySelector('#lcN span').textContent") === "Lap");
  await ev("document.getElementById('lcX').click()"); await sleep(600);
  // tracker
  await tap("#tabs [data-tab=trk]"); await sleep(1200);
  check("tracker has a counter button", await ev("!!document.querySelector('#kbody [data-lc]')"));
  // outdoor + dark: tap-button text readable
  await tap("#kbody [data-lc]"); await sleep(300);
  await ev("document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-contrast','high')"); await sleep(600);
  const cr = await ev(`(()=>{const L=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const s=getComputedStyle(document.getElementById('lcTap')),a=L(s.color),b=L(s.backgroundColor);return Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*10)/10;})()`);
  check("outdoor dark: tap button contrast >= 4.5", cr >= 4.5, cr + ":1");
  await shot("l5-outdoor-dark");
});
