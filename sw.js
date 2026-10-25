const CACHE="simulasi-umrah-v2-11";
const CORE=["./","index.html","manifest.json","icon-192.png","icon-512.png","privacy.html",
 "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  if(r.headers.has("range")||r.url.endsWith(".mp4"))return; // video streams from network
  if(r.url.includes("tile.openstreetmap.org")||r.url.includes("google.com/maps"))return; // map tiles: network only, never cached
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res&&(res.ok||res.type==="opaque")){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}
    return res;}).catch(()=>caches.match("index.html"))));
});
