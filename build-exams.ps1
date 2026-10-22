$ErrorActionPreference='Stop'
$root=$PSScriptRoot
. (Join-Path $root 'build-auth.ps1')
$bank=Join-Path $root 'exam-bank'
$target=Join-Path $root 'public/exams'
[IO.Directory]::CreateDirectory($target) | Out-Null
Copy-Item -LiteralPath (Join-Path $bank 'assets') -Destination $target -Recurse -Force
foreach($file in (Get-ChildItem -LiteralPath $bank -Filter 'test*.json')) {
  $json=[IO.File]::ReadAllText($file.FullName)
  [IO.File]::WriteAllText((Join-Path $target ($file.BaseName+'.js')), 'window.REALTEST_DATA = '+$json+';', [Text.UTF8Encoding]::new($false))
}
$template=[IO.File]::ReadAllText((Join-Path $root 'exam-shell.html'))
$css=[IO.File]::ReadAllText((Join-Path $root 'quest.css'))+"`n"+[IO.File]::ReadAllText((Join-Path $root 'exam.css'))
$css+="`n"+[IO.File]::ReadAllText((Join-Path $root 'quest-daily.css'))
$css+="`n"+[IO.File]::ReadAllText((Join-Path $root 'quest-music.css'))
$js=[IO.File]::ReadAllText((Join-Path $root 'exam.js'))
$js=[IO.File]::ReadAllText((Join-Path $root 'quest-fun.js'))+"`n"+$js
$js=[IO.File]::ReadAllText((Join-Path $root 'quest-leaves.js'))+"`n"+$js
$js=[IO.File]::ReadAllText((Join-Path $root 'daily-runtime.js'))+"`n"+$js
$js=[IO.File]::ReadAllText((Join-Path $root 'quest-music.js'))+"`n"+$js
$css += "`n" + [IO.File]::ReadAllText((Join-Path $root 'question-notes.css'))
$js = [IO.File]::ReadAllText((Join-Path $root 'question-notes.js')) + "`n" + $js
$js = "window.QuestCloud.ready.then(()=>{`n"+$js+"`n});"
$html=$template.Replace('<!-- STYLE -->','<style>'+$css+'</style>').Replace('<!-- APP -->','<script>'+$js+'</script>')
$html=Add-QuestAuth $html
[IO.File]::WriteAllText((Join-Path $root 'public/realtest.html'),$html,[Text.UTF8Encoding]::new($false))
Write-Output 'Built exam banks and public/realtest.html'
