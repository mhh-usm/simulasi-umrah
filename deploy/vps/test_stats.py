#!/usr/bin/env python3
"""Self-test for stats.py on sample logs in a temporary folder. Usage: python3 deploy/vps/test_stats.py"""
import gzip, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
T = 1761600000  # 2025-10-27 UTC


def line(method, uri, status, ts=T):
    return json.dumps({"ts": ts, "request": {"method": method, "uri": uri}, "status": status}) + "\n"


def run(app):
    subprocess.run([sys.executable, os.path.join(HERE, "stats.py"), app], check=True)
    with open(os.path.join(app, "state/stats/stats.json"), encoding="utf-8") as f:
        return json.load(f)


with tempfile.TemporaryDirectory() as app:
    logs = os.path.join(app, "state/logs")
    os.makedirs(logs)
    with open(os.path.join(logs, "access.log"), "w", encoding="utf-8") as f:
        f.write(line("POST", "/ping?e=new", 204) + line("POST", "/ping?e=app", 204)
                + line("POST", "/ping?e=day&m=app&d=2025-10-26", 204)   # queued offline: counts on the 26th
                + line("POST", "/ping?e=day&m=web&d=2099-01-01", 204)   # future date: counts on log day
                + line("GET", "/", 200) + line("GET", "/index.html?x=1", 304) + line("GET", "/sw.js", 200)
                + "not json\n" + line("POST", "/ping?e=new", 204, T + 86400))
    old = os.path.join(logs, "access-2025-10-01T00-00-00.000.log.gz")
    with gzip.open(old, "wt", encoding="utf-8") as f:
        f.write(line("POST", "/ping?e=new", 204, T - 86400 * 20))

    s = run(app)
    days = {d["date"]: d for d in s["days"]}
    assert (s["devices_total"], s["installs_total"]) == (3, 1), s
    assert days["2025-10-26"]["active_app"] == 1, days
    assert days["2025-10-27"]["active_web"] == 1 and days["2025-10-27"]["page_loads"] == 2, days
    assert s["since"] == "2025-10-07", s

    os.remove(old)  # rotation removes old logs: totals must not drop
    s = run(app)
    assert (s["devices_total"], s["installs_total"]) == (3, 1), s
print("stats.py self-test passed")
