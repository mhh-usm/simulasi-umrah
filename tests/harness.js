// Shared test harness: serves the app from the repo root on localhost and drives headless Chrome
// over the DevTools protocol at phone size (390x844, touch), with real input events.
//
// A test file calls: require("./harness")(__filename, async T => { ... })
// T gives: ev(js) · send(method, params) · tap(selector) · back() · sleep(ms) · shot(name) · check(name, ok, detail)
//          PORT · served (paths requested from the server)
// Env: CHROME=path to Chrome/Chromium · OUT=folder for screenshots (default: OS temp folder)
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path"), { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".mp3": "audio/mpeg" };

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const c = {
    win32: [process.env.PROGRAMFILES + "/Google/Chrome/Application/chrome.exe", process.env["PROGRAMFILES(X86)"] + "/Google/Chrome/Application/chrome.exe",
      process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe", process.env["PROGRAMFILES(X86)"] + "/Microsoft/Edge/Application/msedge.exe"],
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"],
    linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  }[process.platform] || [];
  const hit = c.find(p => p && fs.existsSync(p));
  if (!hit) throw new Error("Chrome not found: set CHROME=/path/to/chrome");
  return hit;
}

module.exports = function run(file, body) {
  const name = path.basename(file, ".test.js");
  const OUT = path.join(process.env.OUT || path.join(os.tmpdir(), "simulasi-umrah-tests"), name);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const PORT = 8100 + Math.floor(Math.random() * 800), DBG = 9300 + Math.floor(Math.random() * 600);
  const served = [];
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]), f = path.join(ROOT, u === "/" ? "index.html" : u);
    served.push(u);
    if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); });
  }).listen(PORT);
  const chrome = spawn(findChrome(), ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${path.join(OUT, "profile")}`,
    "--window-size=390,844", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "about:blank"], { stdio: "ignore" });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let ws, id = 0, pass = 0, fail = 0; const pend = {}, logs = [];
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  async function ev(expr) { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) return "EXC: " + r.result.exceptionDetails.exception?.description; return r.result.result.value; }
  async function shot(n) { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, n + ".png"), Buffer.from(r.result.data, "base64")); }
  // real mouse press/release at the element centre (gives the page user activation, like a finger tap)
  async function tap(sel) { const p = await ev("(()=>{const e=document.querySelector('" + sel + "');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()");
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: p[0], y: p[1], button: "left", clickCount: 1 }); await sleep(250); }
  // browser Back (previous history entry), like the phone's Back button
  async function back() { const h = (await send("Page.getNavigationHistory")).result; if (h.currentIndex > 0) await send("Page.navigateToHistoryEntry", { entryId: h.entries[h.currentIndex - 1].id }); }
  const check = (n, ok, extra = "") => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (extra ? "  -> " + extra : "")); };
  const done = code => { try { ws && ws.close(); } catch (e) {} chrome.kill(); srv.close(); process.exit(code); };

  (async () => {
    let t; for (let i = 0; i < 40; i++) { try { t = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); break; } catch { await sleep(250); } }
    if (!t) throw new Error("Chrome did not start");
    ws = new WebSocket(t.find(x => x.type === "page").webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
      if (d.method === "Runtime.exceptionThrown") logs.push("EXC " + d.params.exceptionDetails.exception?.description);
      if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") logs.push("ERR " + d.params.args.map(a => a.value || a.description).join(" ")); };
    await send("Runtime.enable"); await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Page.navigate", { url: `http://localhost:${PORT}/` }); await sleep(4000);
    await body({ ev, send, tap, back, sleep, shot, check, PORT, served });
    check("no page errors", logs.length === 0, logs.join(" | "));
    console.log(`${name}: ${pass} passed, ${fail} failed. Screenshots: ${OUT}`);
    done(fail ? 1 : 0);
  })().catch(e => { console.log("TEST CRASH", e); done(2); });
};
