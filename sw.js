const CACHE="simulasi-umrah-v2-20";
const CORE=["./","index.html","manifest.json","icon-192.png","icon-512.png","privacy.html","pano-k.jpg","pano-s.jpg","leaflet.js",
 "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  if(r.headers.has("range")||r.url.endsWith(".mp4"))return; // video streams from network
  if(r.url.includes("tile.openstreetmap.org")||r.url.includes("google.com/maps")||r.url.includes("mp3quran.net"))return; // map tiles: network only, never cached
  const page=r.mode==="navigate"||/\/(index\.html|privacy\.html|manifest\.json)?(\?.*)?$/.test(new URL(r.url).pathname);
  if(page){ // network first: always show the newest version when online, cached copy when offline
    e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r).then(hit=>hit||caches.match("index.html"))));return;}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res&&(res.ok||res.type==="opaque")){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}
    return res;}).catch(()=>caches.match("index.html"))));
});
