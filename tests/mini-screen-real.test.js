// Mini screen with the browser's real picture-in-picture: opens, note, closes and cleans up
// Run: node tests/mini-screen-real.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  console.log("  headless PiP enabled:", await ev("document.pictureInPictureEnabled"));
  const vids = () => ev("document.querySelectorAll('video[autopictureinpicture]').length");
  const label = () => ev("document.getElementById('miniBtn').textContent");
  const note = () => ev("!!document.getElementById('miniNote')&&getComputedStyle(document.getElementById('miniNote')).display!=='none'");
  for (let i = 0; i < 4; i++) await tap("#jnext");
  await tap('[data-act="tawaf"]'); await tap("#go"); await sleep(1500);
  await tap("#moreBtn"); await sleep(300);
  const l0 = await label();
  await tap("#miniBtn"); await sleep(900);
  check("REAL PiP: mini screen opens", await ev("!!document.pictureInPictureElement"));
  check("note explains Home/swipe-up while app is still on screen", await note() && /Utama|Home/.test(await ev("document.getElementById('miniNote').innerText")));
  check("button now offers to close it", (await label()) !== l0 && /Tutup|Close/.test(await label()), await label());
  await shot("m1-mini-note");
  await tap("#miniX"); await sleep(800);
  check("REAL PiP: close via note cleans up", !(await ev("!!document.pictureInPictureElement")) && !(await note()) && await vids() === 0);
});
