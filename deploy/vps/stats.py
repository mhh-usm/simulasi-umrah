#!/usr/bin/env python3
"""Summarise the umrah web container's access logs into state/stats/stats.json.

Run hourly from the app owner's crontab. Logs are kept for 30 days, so per-day
counts are also stored in state/stats/history.json and never shrink: a day's count
is only raised, because rotation can drop lines from the oldest day but never add.

Events come from the app (index.html): e=new (first launch on a device),
e=app (first launch from the home screen, i.e. installed), e=day&m=app|web&d=DATE
(once per device per day). Dates are UTC.
"""
import glob, gzip, json, os, re, sys
from datetime import datetime, timezone
from urllib.parse import urlsplit, parse_qs

APP_DIR = sys.argv[1] if len(sys.argv) > 1 else "/opt/kilau/apps/umrah"
LOGS = os.path.join(APP_DIR, "state/logs")
OUT = os.path.join(APP_DIR, "state/stats")
FIELDS = ("new_devices", "installs", "active_web", "active_app", "page_loads")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def lines():
    for path in sorted(glob.glob(os.path.join(LOGS, "access*.log*"))):
        opener = gzip.open if path.endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8", errors="replace") as f:
            yield from f


def count():
    days = {}
    for line in lines():
        try:
            r = json.loads(line)
            req = r["request"]
            day = datetime.fromtimestamp(r["ts"], timezone.utc).strftime("%Y-%m-%d")
        except (ValueError, KeyError, TypeError):
            continue
        url = urlsplit(req.get("uri", ""))
        status = r.get("status", 0)
        if req.get("method") == "POST" and url.path == "/ping" and status == 204:
            q = parse_qs(url.query)
            e, m, d = (q.get(k, [""])[0] for k in ("e", "m", "d"))
            field = {"new": "new_devices", "app": "installs"}.get(e)
            if e == "day" and m in ("app", "web"):
                field = "active_" + m
                if DATE.match(d) and d <= day:  # queued offline: count on the day it happened
                    day = d
        elif req.get("method") == "GET" and url.path in ("/", "/index.html") and status in (200, 304):
            field = "page_loads"
        else:
            continue
        if field:
            days.setdefault(day, dict.fromkeys(FIELDS, 0))[field] += 1
    return days


def write(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, sort_keys=True)
    os.replace(tmp, path)


def main():
    os.makedirs(OUT, exist_ok=True)
    hist_path = os.path.join(OUT, "history.json")
    try:
        with open(hist_path, encoding="utf-8") as f:
            hist = json.load(f)
    except (OSError, ValueError):
        hist = {}
    for day, c in count().items():
        old = hist.setdefault(day, dict.fromkeys(FIELDS, 0))
        for k in FIELDS:
            old[k] = max(old.get(k, 0), c[k])
    write(hist_path, hist)

    days = sorted(hist)
    write(os.path.join(OUT, "stats.json"), {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "since": days[0] if days else None,
        "devices_total": sum(hist[d]["new_devices"] for d in days),
        "installs_total": sum(hist[d]["installs"] for d in days),
        "days": [dict(date=d, **hist[d]) for d in days[-90:]],
    })


if __name__ == "__main__":
    main()
