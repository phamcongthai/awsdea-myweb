# Dot-source this helper from HTML builders. No server secrets are embedded.
function Add-QuestAuth([string]$html, [string]$assetBase='') {
  $authCss=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.css'))
  $authJs=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'quest-auth.js'))
  $html=$html.Replace('</head>',"<style>$authCss</style></head>")
  return $html.Replace('</body>',"<script src=`"${assetBase}vendor/supabase-2.49.8.js`"></script><script>$authJs</script></body>")
}
