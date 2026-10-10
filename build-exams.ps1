$ErrorActionPreference='Stop'
$root=$PSScriptRoot
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
$js=[IO.File]::ReadAllText((Join-Path $root 'exam.js'))
$html=$template.Replace('<!-- STYLE -->','<style>'+$css+'</style>').Replace('<!-- APP -->','<script>'+$js+'</script>')
[IO.File]::WriteAllText((Join-Path $root 'public/realtest.html'),$html,[Text.UTF8Encoding]::new($false))
Write-Output 'Built four separate exam banks and public/realtest.html'
