#!/bin/sh
# One-time shared-proxy change: append the umrah.kilau.app block to the shared Caddyfile,
# validate, reload (not restart). Restores the backup if validation fails.
set -eu

PROXY=/opt/kilau/proxy
CADDYFILE=$PROXY/Caddyfile
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
caddy() { docker compose -f "$PROXY/compose.yaml" exec -T caddy caddy "$@"; }

if grep -q '^umrah\.kilau\.app' "$CADDYFILE"; then
  echo "umrah.kilau.app is already in $CADDYFILE; nothing to do."
  exit 0
fi
# the live file is kept read-only; unlock only for this change and always relock
MODE=$(stat -c %a "$CADDYFILE")
trap 'chmod "$MODE" "$CADDYFILE"' EXIT
chmod u+w "$CADDYFILE"

BEFORE=$(grep -c '^[a-z0-9.-]*kilau\.app' "$CADDYFILE" || true)
cp "$CADDYFILE" "$CADDYFILE.pre-umrah-$STAMP"
# deliberately no "import access_log": that shared log keeps client IPs for 90 days, and the
# privacy page promises none are recorded for umrah (the app container logs without IPs)
printf '\numrah.kilau.app {\n    encode zstd gzip\n    reverse_proxy umrah-web:8080\n}\n' >> "$CADDYFILE"

AFTER=$(grep -c '^[a-z0-9.-]*kilau\.app' "$CADDYFILE")
if [ "$AFTER" -ne $((BEFORE + 1)) ] || ! caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  cp "$CADDYFILE.pre-umrah-$STAMP" "$CADDYFILE"
  echo "Validation failed; Caddyfile restored from $CADDYFILE.pre-umrah-$STAMP" >&2
  exit 1
fi
caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Backup: $CADDYFILE.pre-umrah-$STAMP"
