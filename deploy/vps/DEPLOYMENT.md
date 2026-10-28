# umrah.kilau.app deployment

## Application profile

- Application: Simulasi Umrah (`umrah`), source `D:\PcRepo\ag_umrah`
- Production URL: `https://umrah.kilau.app`; GitHub Pages (`https://mhh-usm.github.io/simulasi-umrah/`) stays up as the rollback
- Stack: static PWA, no build step, served by Caddy 2.8 (`caddy:2.8.4-alpine`) on internal port 8080, non-root, read-only root filesystem
- Authentication, database, secrets, external APIs, webhooks: none
- Health endpoint: `/health`
- Budget: 0.25 CPU, 64 MiB maximum; low traffic
- Persistence (`/opt/kilau/apps/umrah/state`, low value, no backup required):
  - `state/logs/`: access logs with no IP addresses or headers, rotated at 10 MiB and deleted after 30 days. Rebuildable: no.
  - `state/stats/history.json` and `stats.json`: daily usage totals written hourly by `deploy/vps/stats.py` (cron line tagged `# umrah-stats`). Losing them loses past counts only.
- Shared infrastructure: one `umrah.kilau.app` block in the shared Caddyfile, and the DNS A record. The block deliberately leaves out `import access_log`, because the shared proxy log keeps client IPs for 90 days. Caddy then skips logging this host there.

## Usage counting

The app (`index.html`, last script) sends `POST https://umrah.kilau.app/ping?e=…` with no body. It does this from any HTTPS host, including GitHub Pages, and never on localhost:

| Event | Sent | Counts as |
|---|---|---|
| `e=new` | first launch on a device | `new_devices` (tries) |
| `e=app` | first launch from the home screen | `installs` (Android and iPhone) |
| `e=day&m=app\|web&d=DATE` | once per device per day | `active_app` / `active_web` |

Events that fail offline are queued in `localStorage` (`su-cnt`) and sent later. Totals are at `https://umrah.kilau.app/stats.json` (public, counts only). Dates are UTC.

## Status (28 October 2026)

| Step | State |
|---|---|
| 1. Preflight | Done. No clashes. `fauzi` (uid 1001) owns `/opt/kilau/apps`. The shared Caddyfile is chmod 444. A wildcard `*.kilau.app` record already resolves. The shared `access_log` snippet keeps client IPs for 90 days, so the umrah block must not import it. |
| 2. Upload | Done, release `6f23e1f` |
| 3. Deploy app | Done. `umrah-web-1` is healthy and `/health` returns `ok`. **Still to check:** the `/` page, the `POST /ping` → 204 log line has no IP, `stats.json` exists, the `# umrah-stats` cron line, and `test_stats.py` prints "passed". |
| 4. DNS | Covered by the wildcard. The explicit A record is optional and not done. |
| 5. Caddy route | **Not done.** Run `route.sh` after the step 3 checks pass. |
| 6. Acceptance | Not done |

## First deployment

Each step needs your go-ahead; steps 4 and 5 change shared infrastructure.

1. **Read-only preflight** (PowerShell, repo root):
   ```powershell
   Get-Content deploy/vps/preflight.sh | ssh fauzi@194.233.80.191 "sh -s"
   ```
2. **Upload a committed release** (PowerShell, repo root; `git archive` only includes committed files):
   ```powershell
   $TAG = git rev-parse --short HEAD
   git archive --format=tar.gz -o "$env:TEMP\umrah-$TAG.tar.gz" HEAD
   scp "$env:TEMP\umrah-$TAG.tar.gz" fauzi@194.233.80.191:/tmp/
   ```
3. **Deploy the app only** (on the VPS; use `sudo mkdir`/`chown` only if `/opt/kilau/apps` is not writable by `fauzi`):
   ```sh
   mkdir -p /opt/kilau/apps/umrah
   tar -xzf /tmp/umrah-<TAG>.tar.gz -C /opt/kilau/apps/umrah
   python3 /opt/kilau/apps/umrah/deploy/vps/test_stats.py
   APP_IMAGE_TAG=<TAG> sh /opt/kilau/apps/umrah/deploy/vps/deploy.sh
   docker exec umrah-web-1 wget -qO- http://127.0.0.1:8080/health
   ```
4. **DNS**: a wildcard `*.kilau.app` record already points at the VPS, so the name works without this step. The standard still asks for an explicit A record `umrah` → `194.233.80.191` at the `kilau.app` DNS provider.
5. **Shared Caddy route** (backs up the file, appends one block, validates, reloads, and restores the backup on failure):
   ```sh
   sh /opt/kilau/apps/umrah/deploy/vps/route.sh
   ```
6. **Acceptance**:
   ```sh
   curl -fsS https://umrah.kilau.app/health
   curl -s -o /dev/null -w '%{http_code}\n' -X POST 'https://umrah.kilau.app/ping?e=test'   # 204
   curl -fsS https://umrah.kilau.app/stats.json
   ```
   Then open the app on a phone, install it, use it offline, and confirm that `scanner.kilau.app` and the other hosts still load.

## Routine update

Commit, then repeat steps 2 and 3 with the new tag. `deploy.sh` prints the rollback tag and keeps the active image plus one previous image. Caddy is not touched. Change `CACHE` in `sw.js` when cached assets change (see README).

## Rollback

- Bad release: set `APP_IMAGE_TAG=<previous>` in `/opt/kilau/apps/umrah/.env`, then `docker compose up -d --no-deps web`. State is untouched.
- Whole VPS route: GitHub Pages still serves the app. Remove the `umrah.kilau.app` block using the `Caddyfile.pre-umrah-*` backup procedure (validate, then reload).
