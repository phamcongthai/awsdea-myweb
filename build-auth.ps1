# Dot-source this helper from HTML builders. No server secrets are embedded.
function Add-QuestAuth([string]$html, [string]$assetBase='') {
  if($assetBase){$html=$html.Replace('url("assets/galaxy-bg.jpg")',('url("'+$assetBase+'assets/galaxy-bg.jpg")'))}
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
  $notebookJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-notebook.js'))
  $html=$html.Replace('</head>',"<style>$authCss`n$cloudCss`n$socialCss`n$headerCss`n$notebookCss</style></head>")
  return $html.Replace('<body>',"<body><script src=`"${assetBase}vendor/supabase-2.49.8.js`"></script><script>$certJs</script><script>$cloudJs</script><script>$authJs</script><script>$socialJs</script><script>$headerJs</script><script>$notebookJs</script>")
}
