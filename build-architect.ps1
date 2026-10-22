$ErrorActionPreference='Stop'
$root=$PSScriptRoot
. (Join-Path $root 'build-auth.ps1')
foreach($asset in @('quest-auth.js','quest-auth.css','quest-cloud.js','quest-cloud.css')) { Copy-Item -LiteralPath (Join-Path $root $asset) -Destination (Join-Path $root ('public/'+$asset)) -Force }
foreach($page in @('architect.html','data.html')) {
  $path=Join-Path $root ('public/'+$page)
  $html=[IO.File]::ReadAllText($path)
  # Keep the source pages buildable without accumulating injected copies.
  $html=[regex]::Replace($html,'<!-- CLOUD START -->.*?<!-- CLOUD END -->','','Singleline')
  $boot='<link rel="stylesheet" href="quest-auth.css"><link rel="stylesheet" href="quest-cloud.css">'
  $html=$html.Replace('</head>',$boot+'</head>')
  $html=$html.Replace($boot+$boot,$boot)
  $scripts='<script src="vendor/supabase-2.49.8.js"></script><script src="quest-cloud.js"></script><script src="quest-auth.js"></script>'
  $html=$html.Replace('<body>','<body><!-- CLOUD START -->'+$scripts+'<!-- CLOUD END -->')
  $html=$html.Replace('<script src="architect/daily.js"></script><script src="architect/music.js"></script>','<script>QuestCloud.ready.then(async()=>{for(const src of ["architect/daily.js","architect/music.js"]){await new Promise((ok,bad)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=bad;document.head.append(s);});}});</script>')
  [IO.File]::WriteAllText($path,$html,[Text.UTF8Encoding]::new($false))
}
$target=Join-Path $root 'public/architect'
[IO.Directory]::CreateDirectory($target)|Out-Null
$css=[IO.File]::ReadAllText((Join-Path $root 'quest.css'))+"`n"+[IO.File]::ReadAllText((Join-Path $root 'quest-daily.css'))+"`n"+[IO.File]::ReadAllText((Join-Path $root 'quest-music.css'))
$css=[regex]::Replace($css,'@import\s+url\([^)]*\)\s*;','')
[IO.File]::WriteAllText((Join-Path $target 'shared.css'),$css,[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $root 'daily-runtime.js') -Destination (Join-Path $target 'daily.js') -Force
Copy-Item -LiteralPath (Join-Path $root 'quest-music.js') -Destination (Join-Path $target 'music.js') -Force
$files=@('architect.html','data.html','daily-bank.js')+@(Get-ChildItem $target -File -Recurse | ForEach-Object {'architect/'+$_.FullName.Substring($target.Length+1).Replace('\','/')})
$hash=[Security.Cryptography.SHA256]::Create()
$text=($files|ForEach-Object {$_+':'+(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $root ('public/'+$_))).Hash}) -join '|'
$version=[BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($text))).Replace('-','').Substring(0,12)
$cacheList=$files|ConvertTo-Json -Compress
$sw=@"
const CACHE='architect-$version',FILES=$cacheList;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('architect-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='architect-claim')e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;const p=u.pathname.replace(/^\//,'');if(!FILES.includes(p))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(p,copy));}return r;}).catch(()=>caches.match(p)));});
"@
[IO.File]::WriteAllText((Join-Path $root 'public/architect-sw.js'),$sw,[Text.UTF8Encoding]::new($false))
Write-Output 'Built Architect Quest shared assets and offline cache.'
