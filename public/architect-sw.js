// Retire the previous lab offline cache when an existing installation checks for updates.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(/architect|data-quest-lab/.test(key))await caches.delete(key);
 await self.clients.claim();
 for(const client of await self.clients.matchAll({type:'window'}))if(/\/(architect|data)\.html$/.test(new URL(client.url).pathname))await client.navigate('/index.html');
 await self.registration.unregister();
})()));
