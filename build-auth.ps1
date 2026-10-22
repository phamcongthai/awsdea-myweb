# Dot-source this helper from HTML builders. No server secrets are embedded.
function Add-QuestAuth([string]$html, [string]$assetBase='') {
  $authCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.css'))
  $authJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.js'))
  $cloudCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-cloud.css'))
  $cloudJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-cloud.js'))
  $socialCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-social.css'))
  $socialJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-social.js'))
  $headerCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-header.css'))
  $headerJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-header.js'))
  $html=$html.Replace('</head>',"<style>$authCss`n$cloudCss`n$socialCss`n$headerCss</style></head>")
  return $html.Replace('<body>',"<body><script src=`"${assetBase}vendor/supabase-2.49.8.js`"></script><script>$cloudJs</script><script>$authJs</script><script>$socialJs</script><script>$headerJs</script>")
}
