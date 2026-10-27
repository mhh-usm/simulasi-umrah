// Mini screen (picture-in-picture) with simulated PiP and page visibility: note, auto-close on return, cleanup
// Run: node tests/mini-screen.test.js   (or node tests/run-all.js)
require("./harness")(__filename, async ({ ev, send, tap, sleep, shot, check, PORT, served, back }) => {
  const sh = id => `getComputedStyle(document.getElementById("${id}")).display!=="none"`;
  for (let i = 0; i < 40 && !(await ev("document.querySelectorAll('#jbody *').length>0")); i++) await sleep(250);
  console.log("  headless PiP enabled:", await ev("document.pictureInPictureEnabled"));
  // Simulate the browser's PiP + page visibility so the app logic can be exercised the same way a phone drives it
  await ev(`(()=>{window.__pip=null;window.__vis="visible";
    Object.defineProperty(document,"pictureInPictureElement",{get:()=>window.__pip,configurable:true});
    Object.defineProperty(document,"pictureInPictureEnabled",{get:()=>true,configurable:true});
    Object.defineProperty(document,"visibilityState",{get:()=>window.__vis,configurable:true});
    HTMLVideoElement.prototype.requestPictureInPicture=function(){if(window.__vis!=="visible"&&!navigator.userActivation.isActive)return Promise.reject(new Error("gesture"));window.__pip=this;this.dispatchEvent(new Event("enterpictureinpicture"));return Promise.resolve({});};
    document.exitPictureInPicture=function(){const v=window.__pip;window.__pip=null;if(v)v.dispatchEvent(new Event("leavepictureinpicture"));return Promise.resolve();};
    window.__setVis=s=>{window.__vis=s;document.dispatchEvent(new Event("visibilitychange"));};})()`);
  const vids = () => ev("document.querySelectorAll('video[autopictureinpicture]').length");
  const label = () => ev("document.getElementById('miniBtn').textContent");
  const note = () => ev("!!document.getElementById('miniNote')&&getComputedStyle(document.getElementById('miniNote')).display!=='none'");
  for (let i = 0; i < 4; i++) await tap("#jnext");
  await tap('[data-act="tawaf"]'); await tap("#go"); await sleep(1500);
  await tap("#moreBtn"); await sleep(300);
  const l0 = await label();
  await tap("#miniBtn"); await sleep(900);
  check("mini screen opens", await ev("!!document.pictureInPictureElement"));
  check("note explains Home/swipe-up while app is still on screen", await note() && /Utama|Home/.test(await ev("document.getElementById('miniNote').innerText")));
  check("button now offers to close it", (await label()) !== l0 && /Tutup|Close/.test(await label()), await label());
  await shot("m1-mini-note");
  // user presses Home: app hidden, mini stays
  await ev("__setVis('hidden')"); await sleep(300);
  check("leaving the app keeps the mini screen", await ev("!!document.pictureInPictureElement"));
  // user returns: mini closes automatically, no duplicate
  await ev("__setVis('visible')"); await sleep(500);
  check("returning to the app closes the mini screen (not both at once)", !(await ev("!!document.pictureInPictureElement")));
  check("note hidden and label reset", !(await note()) && /Skrin mini|Mini screen/.test(await label()), await label());
  check("background drawing stopped (hidden video removed)", await vids() === 0);
  // open again, close with the ✕ in the note
  await tap("#moreBtn"); await sleep(300); await tap("#miniBtn"); await sleep(900);
  await tap("#miniX"); await sleep(500);
  check("✕ in the note closes mini screen and cleans up", !(await ev("!!document.pictureInPictureElement")) && !(await note()) && await vids() === 0);
  // OK keeps it open but dismisses the note
  await tap("#moreBtn"); await sleep(300); await tap("#miniBtn"); await sleep(900);
  await tap("#miniOk"); await sleep(300);
  check("OK dismisses the note, mini stays", !(await note()) && await ev("!!document.pictureInPictureElement"));
  await tap("#moreBtn"); await sleep(300); await tap("#miniBtn"); await sleep(500);
  check("pressing the button again closes it", !(await ev("!!document.pictureInPictureElement")) && /Skrin mini|Mini screen/.test(await label()));
  // tracker recording: hidden video is kept so it can reopen when leaving the app
  await tap("#guideBtn"); await sleep(500);
  await send("Browser.setPermission", { permission: { name: "geolocation" }, setting: "granted", origin: "http://localhost:" + PORT });
  await send("Emulation.setGeolocationOverride", { latitude: 5.356, longitude: 100.302, accuracy: 8 });
  await tap("#tabs [data-tab=trk]"); await sleep(1200); await tap("#kstart"); await sleep(1200);
  await ev("document.getElementById('kpocket').style.display='none'"); await sleep(300);
  await tap("#kmini"); await sleep(900);
  check("tracker: mini opens, kmini label switches", await ev("!!document.pictureInPictureElement") && /Tutup|Close/.test(await ev("document.getElementById('kmini').textContent")));
  await ev("__setVis('hidden')"); await sleep(200); await ev("__setVis('visible')"); await sleep(500);
  check("tracker: returning closes mini but keeps hidden video for next time", !(await ev("!!document.pictureInPictureElement")) && await vids() === 1);
});
