// Runs every tests/*.test.js one after another and prints a summary. Exit code 1 if any fail.
// Usage: node tests/run-all.js [name-filter]      e.g. node tests/run-all.js back
const { spawnSync } = require("child_process"), fs = require("fs"), path = require("path");
const only = process.argv[2] || "";
const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js") && f.includes(only)).sort();
let bad = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length;
  const ok = r.status === 0;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${f.padEnd(28)} ${String(pass).padStart(3)} passed, ${fail} failed  (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (!ok) out.split("\n").filter(l => /^(FAIL|TEST CRASH)/.test(l)).forEach(l => console.log("       " + l));
}
console.log(bad ? `\n${bad} of ${files.length} test files failed.` : `\nAll ${files.length} test files passed.`);
process.exit(bad ? 1 : 0);
