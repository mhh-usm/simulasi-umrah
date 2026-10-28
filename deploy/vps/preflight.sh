#!/bin/sh
# Read-only checks before deploying umrah. Changes nothing.
# From PowerShell (strips the Windows line endings PowerShell adds when piping):
#   Get-Content deploy/vps/preflight.sh | ssh fauzi@194.233.80.191 "tr -d '\r' | sh"
echo "== host";      hostname; id; python3 --version; docker compose version --short
echo "== disk/ram";  df -h / | tail -1; free -h | sed -n 2p
echo "== apps";      ls -la /opt/kilau/apps
echo "== proxy";     ls -la /opt/kilau/proxy/Caddyfile /opt/kilau/proxy/logs; lsattr /opt/kilau/proxy/Caddyfile 2>/dev/null
echo "== hostnames in shared Caddyfile"; grep -nE '^[^#[:space:]].*\{' /opt/kilau/proxy/Caddyfile
echo "== logging in shared Caddyfile"; grep -nE -A8 '^[[:space:]]*log([[:space:]]|$)' /opt/kilau/proxy/Caddyfile | grep -viE 'basic_?auth|password|token|secret'
echo "== proxy services"; docker compose -f /opt/kilau/proxy/compose.yaml config --services
echo "== kilau_proxy"; docker network inspect kilau_proxy --format '{{.Name}}: {{len .Containers}} containers'
echo "== crontab (schedules only)"; crontab -l 2>/dev/null | grep -v '^#' | awk '{print $1,$2,$3,$4,$5,"..."}'
echo "== DNS";       getent hosts umrah.kilau.app || echo "umrah.kilau.app has no DNS record"
echo "== wildcard?"; getent hosts no-such-host-check.kilau.app || echo "no wildcard record"
