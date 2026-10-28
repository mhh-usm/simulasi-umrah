#!/bin/sh
# Build and start one release of umrah. Touches only this app (and its owner's crontab line).
# Usage: APP_IMAGE_TAG=<commit> sh deploy/vps/deploy.sh
set -eu

APP_DIR=/opt/kilau/apps/umrah
cd "$APP_DIR"
: "${APP_IMAGE_TAG:?set APP_IMAGE_TAG to the release commit}"

mkdir -p state/logs state/stats
[ -f state/stats/stats.json ] || python3 deploy/vps/stats.py "$APP_DIR"

if [ -f .env ]; then
  PREVIOUS=$(sed -n 's/^APP_IMAGE_TAG=//p' .env)
  sed -i "s/^APP_IMAGE_TAG=.*/APP_IMAGE_TAG=$APP_IMAGE_TAG/" .env
else
  PREVIOUS=
  umask 077
  printf 'APP_IMAGE_TAG=%s\nAPP_UID=%s\nAPP_GID=%s\n' "$APP_IMAGE_TAG" "$(id -u)" "$(id -g)" > .env
fi
chmod 600 .env
echo "Rollback release: ${PREVIOUS:-none}"

docker compose config --quiet
docker compose build web
docker compose up -d --no-deps web

attempt=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' umrah-web-1 2>/dev/null)" = healthy ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker compose logs --tail=100 web
    exit 1
  fi
  sleep 2
done
[ "$(docker inspect -f '{{.Config.Image}}' umrah-web-1)" = "umrah-web:$APP_IMAGE_TAG" ]

# keep the active image and the newest previous one
docker image ls umrah-web --format '{{.Tag}}' | grep -v "^${APP_IMAGE_TAG}$" | tail -n +2 | while read -r tag; do
  [ -z "$tag" ] || docker image rm "umrah-web:$tag" || true
done

# hourly usage summary (app-owned line in this user's crontab)
CRON="17 * * * * python3 $APP_DIR/deploy/vps/stats.py $APP_DIR >/dev/null 2>&1 # umrah-stats"
crontab -l 2>/dev/null | grep -qF '# umrah-stats' || { crontab -l 2>/dev/null || true; echo "$CRON"; } | crontab -

docker compose ps
