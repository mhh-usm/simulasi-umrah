// Guide: tappable step bar, swipe, arrow keys, Space fix, folded tawaf settings, screen-reader focus
// Run: node tests/guide-nav.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  const title = () => ev("document.getElementById('jtitle').textContent");
  const key = async k => { for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code: k === " " ? "Space" : k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, " ": 32 }[k] }); await sleep(250); };
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  // ---- 9. step bar ----
  const nb = await ev("document.querySelectorAll('#jsteps button[data-js]').length");
  const lbl = await ev("document.querySelector('#jsteps [data-js=\"3\"]').getAttribute('aria-label')");
  check("step bar has 9 labelled buttons", nb === 9 && /^3\./.test(lbl), nb + " / " + lbl);
  await tap('#jsteps [data-js="3"]');
  check("tap segment 4 jumps to step 3", /^3\./.test(await title()) && await ev("document.querySelector('#jsteps [aria-current=step]').dataset.js") === "3", await title());
  // swipe left = next
  const swipe = async (x0, x1) => {
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: 600 }] });
    for (let k = 1; k <= 5; k++) await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + (x1 - x0) * k / 5, y: 605 }] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(300);
  };
  await swipe(320, 80);
  check("swipe left goes to next step", /^4\./.test(await title()), await title());
  await swipe(80, 320);
  check("swipe right goes back", /^3\./.test(await title()), await title());
  await swipe(320, 290);
  check("small drag does not change step", /^3\./.test(await title()));
  // keyboard
  await key("ArrowRight");
  check("ArrowRight = next step on guide", /^4\./.test(await title()), await title());
  const playTxt = await ev("document.getElementById('play').getAttribute('aria-label')");
  await key(" ");
  check("Space on guide no longer toggles hidden Play", await ev("document.getElementById('play').getAttribute('aria-label')") === playTxt && !(await ev(sh("bar"))));
  check("HUD Arabic marked lang=ar", await ev("document.getElementById('ar').getAttribute('lang')") === "ar");
  // ---- 10 + 13. tawaf setup ----
  await tap('[data-act="tawaf"]'); await sleep(400);
  const goTop = await ev("Math.round(document.getElementById('go').getBoundingClientRect().top)");
  check("Start button visible without scrolling", goTop > 0 && goTop < 700, "top " + goTop + "px");
  check("settings folded by default", !(await ev("document.getElementById('tset').open")));
  const sum1 = await ev("document.getElementById('t-set').textContent");
  console.log("  summary:", sum1);
  check("summary lists view, sex, crowd", /Tetapan: .+ · .+ · .+/.test(sum1));
  check("focus moved to tawaf title (screen reader)", await ev("document.activeElement.id") === "t-title");
  await shot("a1-intro-folded");
  await tap("#t-set"); await sleep(300);
  await tap('[data-sex="f"]'); await sleep(200);
  const sum2 = await ev("document.getElementById('t-set').textContent");
  check("summary updates when a setting changes", sum2 !== sum1, sum2);
  await tap('[data-sex="m"]');
  await shot("a2-intro-open");
  await tap("#toGuide"); await sleep(400);
  check("focus moved to guide title", await ev("document.activeElement.id") === "jtitle");
  await tap("#tabs [data-tab=ziarah]"); await sleep(600);
  check("focus moved to ziarah heading", await ev("document.activeElement.tagName") === "H2", await ev("document.activeElement.textContent.slice(0,40)"));
});
