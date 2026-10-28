// Doa umrah (Bacaan tab): default view, items in ritual order, meanings from the Guide, translation toggle, 4 languages, remembered view.
// Emergency card: header 🆘, empty -> form, hotel from tracker, save -> Arabic+English card, tap-to-call, escaping, gender, Back, shortcut, Ziarah link, outdoor dark.
// Run: node tests/doa-sos.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, back, sleep, shot, check, PORT }) => {
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  const stub = "window.__say=[];speechSynthesis.speak=u=>window.__say.push(u.text);";
  await ev(stub);
  const setLang = l => ev(`(()=>{const s=document.getElementById('jlang');s.value='${l}';s.dispatchEvent(new Event('change'));})()`);
  const txt = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||""`);
  const fitsWidth = () => ev("document.scrollingElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('#rcard,#sos')].every(e=>e.scrollWidth<=e.clientWidth+1)");
  // ---------- Doa ----------
  await tap("#tabs [data-tab=reader]"); await sleep(800);
  check("Bacaan opens on the Doa tab by default", await ev("document.querySelector('[data-rv=doa]').getAttribute('aria-pressed')") === "true" && await txt("#rhead .ztitle") === "Doa & lafaz umrah");
  check("6 recitations in 3 groups (ihram, tawaf, sa'ie)", await ev("document.querySelectorAll('#rbody .doa').length") === 6 && await ev("[...document.querySelectorAll('#rbody .zh3')].map(e=>e.textContent).join('|')") === "Ihram di miqat|Tawaf|Sa'ie");
  check("niat: title and meaning taken from the Guide", (await txt("#rbody .doa .mname")).startsWith("Lafaz niat") && (await txt("#rbody .doa .qtr")).startsWith("Sahaja aku mengerjakan umrah"));
  const items = await ev("[...document.querySelectorAll('#rbody .doa')].map(d=>d.querySelector('.qar').textContent.slice(0,6)+' / '+(d.querySelector('.dtr')||{}).textContent?.slice(0,14)+' / '+((d.querySelector('.qtr')||{}).textContent||'').slice(0,20))");
  console.log("  items:", JSON.stringify(items));
  check("every item has Arabic, transliteration and meaning", await ev("[...document.querySelectorAll('#rbody .doa')].every(d=>d.querySelector('.qar').textContent.length>5&&d.querySelector('.dtr')&&d.querySelector('.qtr'))"));
  check("Rabbana atina with its meaning", await ev("[...document.querySelectorAll('#rbody .doa')].some(d=>d.querySelector('.qar').textContent.startsWith('رَبَّنَا')&&d.querySelector('.qtr').textContent.includes('al-Baqarah: 201'))"));
  await shot("d1-doa");
  check("no synthetic-voice Listen button on the du'a (text-to-speech mispronounces Quranic Arabic)", await ev("document.querySelectorAll('#rbody .doa button').length") === 0);
  check("translation toggle says Maksud", (await txt("#rhead .rtr")).trim() === "Maksud");
  await tap("#rtrc"); await sleep(300);
  check("toggle off hides meanings, keeps transliteration", await ev("document.querySelectorAll('#rbody .qtr').length") === 0 && await ev("document.querySelectorAll('#rbody .dtr').length") === 6);
  await tap("#rtrc"); await sleep(300);
  check("no sideways scroll", await fitsWidth());
  await tap("[data-rv=yasin]"); await sleep(400);
  await tap("#tabs [data-tab=journey]"); await sleep(400); await tap("#tabs [data-tab=reader]"); await sleep(600);
  check("reader remembers the last tab (Yasin)", await ev("document.querySelector('[data-rv=yasin]').getAttribute('aria-pressed')") === "true");
  await tap("[data-rv=doa]"); await sleep(300);
  for (const [l, title] of [["en", "Umrah du'a & recitations"], ["id", "Doa & lafaz umrah"], ["ar", "أدعية العمرة وأذكارها"]]) {
    await tap("#tabs [data-tab=journey]"); await sleep(300); await setLang(l); await sleep(200); await tap("#tabs [data-tab=reader]"); await sleep(600);
    const n = await ev("document.querySelectorAll('#rbody .doa').length"), t = await txt("#rhead .ztitle");
    const okM = l === "ar" ? await ev("document.querySelectorAll('#rbody .dtr,#rbody .qtr,#rtrc').length") === 0 : await ev("[...document.querySelectorAll('#rbody .doa')].every(d=>d.querySelector('.qtr'))");
    check(`${l}: 6 items, title, ${l === "ar" ? "no transliteration/meaning" : "meanings"}`, n === 6 && t === title && okM, `${n} ${t} ${await txt("#rbody .doa .qtr")}`);
    if (l === "ar") await shot("d2-doa-ar");
  }
  await tap("#tabs [data-tab=journey]"); await sleep(300); await setLang("bm"); await sleep(300);
  // ---------- Emergency card ----------
  await ev("localStorage.removeItem('su-sos');localStorage.setItem('su-trk-prof',JSON.stringify({hid:'abraj.0'}))");
  check("guide header has 🆘", await ev("!!document.querySelector('#jtop #sosBtn')"));
  await tap("#sosBtn"); await sleep(400);
  check("empty card opens the form", await ev("document.getElementById('sos').classList.contains('on')") && await ev("!!document.getElementById('sos_name')"));
  check("hotel filled in from the tracker", await ev("document.getElementById('sos_hotel').value") === "Fairmont Makkah Clock Royal Tower", await ev("document.getElementById('sos_hotel').value"));
  check("sos covers the tab bar", await ev("(()=>{const t=document.getElementById('tabs').getBoundingClientRect();return document.getElementById('sos').contains(document.elementFromPoint(t.left+t.width/2,t.top+t.height/2));})()"));
  await shot("s1-form");
  await ev(`(()=>{const v={name:'Aminah binti Ali',nat:'Malaysia',room:'1204',group:'Kumpulan 7',leader:'Ustaz Rahman',phone:'+966 50 123 4567',meet:'Pintu 1, King Abdulaziz',family:'+60 12-345 6789',med:'Diabetes <b>insulin</b>'};for(const k in v)document.getElementById('sos_'+k).value=v[k];})()`);
  await tap('[data-sg="f"]');
  await tap("#sosSave"); await sleep(400);
  check("save shows the card", await ev("!!document.querySelector('#sosB .soscard')") && await ev("!document.getElementById('sos_name')"));
  check("card headline in Arabic (female form) and English", (await txt(".sosh .ar")) === "أنا تائهة، أرجو المساعدة" && (await txt(".sosh .en")) === "I am lost. Please help me.");
  check("card labels Arabic + English", (await txt(".sosdl dt")).includes("الاسم") && (await txt(".sosdl dt")).includes("Name"));
  check("leader phone is tap-to-call", await ev("[...document.querySelectorAll('.sosdl a')].map(a=>a.getAttribute('href')).join(',')") === "tel:+966501234567,tel:+60123456789");
  check("typed HTML shown as text, not markup", (await ev("document.querySelector('.sosdl').textContent")).includes("<b>insulin</b>") && await ev("!document.querySelector('.sosdl dd b')"));
  check("emergency numbers 911, 937, 1966", await ev("[...document.querySelectorAll('#sosB .sosn')].map(a=>a.getAttribute('href')).join(',')") === "tel:911,tel:937,tel:1966");
  check("card is white with dark text", await ev("getComputedStyle(document.querySelector('.soscard')).backgroundColor") === "rgb(255, 255, 255)");
  check("no sideways scroll", await fitsWidth());
  await shot("s2-card");
  await back(); await sleep(500);
  check("device Back closes the card, guide still showing", !(await ev("document.getElementById('sos').classList.contains('on')")) && await ev("getComputedStyle(document.getElementById('journey')).display!=='none'"));
  await tap("#sosBtn"); await sleep(400);
  check("saved card reopens straight to the card", await ev("!!document.querySelector('#sosB .soscard')"));
  await tap("#sosE"); await sleep(300);
  check("Edit shows saved values", await ev("document.getElementById('sos_name').value") === "Aminah binti Ali" && await ev("document.querySelector('[data-sg=f]').getAttribute('aria-pressed')") === "true");
  await tap('[data-sg="m"]'); await tap("#sosSave"); await sleep(300);
  check("male form after changing gender", (await txt(".sosh .ar")) === "أنا تائه، أرجو المساعدة");
  await tap("#sosX"); await sleep(400);
  // outdoor + dark: card keeps its own high contrast
  await ev("document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-contrast','high')");
  await tap("#sosBtn"); await sleep(500);
  const cr = await ev(`(()=>{const L=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const d=document.querySelector('.sosdl dd'),a=L(getComputedStyle(d).color),b=L(getComputedStyle(document.querySelector('.soscard')).backgroundColor);return Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*10)/10;})()`);
  check("outdoor dark: card text contrast >= 12:1", cr >= 12, cr + ":1");
  await shot("s3-card-dark");
  await tap("#sosX"); await sleep(300);
  await ev("document.documentElement.setAttribute('data-theme','light');document.documentElement.removeAttribute('data-contrast')");
  // English UI: card still Arabic + English, buttons English
  await setLang("en"); await sleep(200);
  await tap("#sosBtn"); await sleep(400);
  check("English: Edit button, card unchanged", (await txt("#sosE")) === "✏️ Edit" && (await txt(".sosh .en")) === "I am lost. Please help me.");
  await tap("#sosX"); await sleep(300); await setLang("bm");
  // Ziarah > Info penting button
  await tap("#tabs [data-tab=ziarah]"); await sleep(700);
  await tap('[data-zv="info"]'); await sleep(400);
  await tap("#zlist [data-sos]"); await sleep(400);
  check("Ziarah Info penting opens the card", await ev("document.getElementById('sos').classList.contains('on')"));
  await back(); await sleep(500);
  check("Back from card stays on Ziarah", !(await ev("document.getElementById('sos').classList.contains('on')")) && await ev("getComputedStyle(document.getElementById('ziarah')).display!=='none'"));
  // shortcut
  await send("Page.navigate", { url: `http://localhost:${PORT}/?open=sos` }); await sleep(4000);
  check("shortcut ?open=sos opens the card", await ev("document.getElementById('sos').classList.contains('on')") && await ev("!!document.querySelector('#sosB .soscard')"));
});
