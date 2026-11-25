# Dot-source this helper from HTML builders. No server secrets are embedded.
function Add-QuestAuth([string]$html, [string]$assetBase='') {
  if($assetBase){$html=$html.Replace('url("assets/galaxy-bg.jpg")',('url("'+$assetBase+'assets/galaxy-bg.jpg")'))}
  $deaTestsJs='window.QUEST_DEA_TESTS = '+[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'exam-bank/manifest.json'))+';'
  $certJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-cert.js'))
  $authCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.css'))
  $authJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.js'))
  $cloudCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-cloud.css'))
  $cloudJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-cloud.js'))
  $socialCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-social.css'))
  $socialJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-social.js'))
  $headerCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-header.css'))
  $headerJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-header.js'))
  $notebookCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-notebook.css'))
  $notebookPenJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-notebook-pen.js'))
  $notebookImageJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-notebook-images.js'))
  $notebookJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-notebook.js'))
  $themeCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-theme.css'))
  $themeJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-theme.js'))
  $themeBoot="<script>try{document.documentElement.dataset.theme=localStorage.getItem('quest-color-theme-v1')==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}</script>"
  $html=$html.Replace('<head>',('<head>'+$themeBoot))
  $html=$html.Replace('</head>',"<style>$authCss`n$cloudCss`n$socialCss`n$headerCss`n$notebookCss`n$themeCss</style><script defer src=`"${assetBase}quest-theme.js`"></script></head>")
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'public/quest-theme.js'),$themeJs,[Text.UTF8Encoding]::new($false))
  return $html.Replace('<body>',"<body><script src=`"${assetBase}vendor/supabase-2.49.8.js`"></script><script>$deaTestsJs</script><script>$certJs</script><script>$cloudJs</script><script>$authJs</script><script>$socialJs</script><script>$headerJs</script><script>$notebookPenJs</script><script>$notebookImageJs</script><script>$notebookJs</script>")
}
