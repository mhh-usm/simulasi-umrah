FROM caddy:2.8.4-alpine
COPY deploy/vps/Caddyfile /etc/caddy/Caddyfile
COPY index.html privacy.html sw.js manifest.json leaflet.js icon-192.png icon-512.png icon-maskable-512.png pano-k.jpg pano-s.jpg /srv/
COPY *.mp3 /srv/
COPY audio /srv/audio
COPY fonts /srv/fonts
EXPOSE 8080
