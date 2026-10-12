$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$groups = @{
  1 = @{
    stream = '18,26,27,38,41,48,52,53,56,59,62,63,65'
    etl = '1,5,9,15,21,25,32,44,49'
    storage = '14,19,24,29,34,35,37,39,42,43,54,58,64'
    lake = '4,10,11,13,17,20,33,36,46,47'
    warehouse = '8,16,30'
    security = '6,7,12,23,40,51,60'
    ops = '2,3,22,28,31,45,50,55,57,61'
  }
  2 = @{
    stream = '3,15,18,36,45,54'
    etl = '1,12,19,25,29,33,48,49,50,60,64'
    storage = '14,16,22,35,38,43,44,51,61,63,65'
    lake = '4,5,9,20,21,24'
    warehouse = '2,8,13,30,32,39,40,56'
    security = '6,10,17,28,31,34,37,47,55,58,59,62'
    ops = '7,11,23,26,27,41,42,46,52,53,57'
  }
  3 = @{
    stream = '7,19,22,26,29,41,44,47,52,59,60'
    etl = '16,30,42,48,57,58'
    storage = '11,12,21,23,25,27,38,51,55,61'
    lake = '1,2,3,10,20,28,31,33,50,56'
    warehouse = '8,9,13,18,24,32,35,37,45,49,54,62,65'
    security = '6,14,34,39,40,43,64'
    ops = '4,5,15,17,36,46,53,63'
  }
  4 = @{
    stream = '11,14,27,28,32,34,38,44,46,64'
    etl = '1,7,10,25,33,37,43,48,49,50,54,56'
    storage = '9,16,23,36,40,57,58,61'
    lake = '2,12,17,31,35,42,62,63,65'
    warehouse = '3,18,19,22,24,26,30,41,45,51,52,53'
    security = '4,8,13,15,39,47'
    ops = '5,6,20,21,29,55,59,60'
  }
}
$questions = @()
$vietnamese = @{}
$translationFiles = @((Join-Path $root 'explanations-vi.json')) + @(Get-ChildItem -LiteralPath (Join-Path $root 'translations') -Filter '*.json' | ForEach-Object { $_.FullName })
foreach ($translationFile in $translationFiles) {
  $part = [IO.File]::ReadAllText($translationFile) | ConvertFrom-Json
  foreach ($entry in $part.PSObject.Properties) {
    if ($vietnamese.ContainsKey($entry.Name)) { throw "Duplicate Vietnamese explanation: $($entry.Name)" }
    $vietnamese[$entry.Name] = @($entry.Value)
  }
}
$sources = @()
$test = 0
foreach ($file in (Get-ChildItem -LiteralPath $root -Filter '00*.html' | Sort-Object Name)) {
  $test++
  $match = [regex]::Match([IO.File]::ReadAllText($file.FullName), '<script id="quiz-data-script" type="application/json">(.*?)</script>', 'Singleline')
  if (!$match.Success) {throw "Missing quiz data: $file"}
  $data = $match.Groups[1].Value | ConvertFrom-Json
  if ($data.assessments.Count -ne 65) {throw "Expected 65 questions in $file"}
  $sources += @{test=$test; file=$file.Name; title=$data.title}
  $index = 0
  foreach ($q in $data.assessments) {
    $index++
    $assigned = @($groups[$test].Keys | Where-Object {($groups[$test][$_] -split ',') -contains "$index"})
    if ($assigned.Count -ne 1) {throw "Classification issue $test-$index"}
    $correct = @($q.correct_response | ForEach-Object {([int][char]$_)-97})
    foreach ($answer in $correct) {if ($answer -lt 0 -or $answer -ge $q.prompt.answers.Count) {throw "Invalid answer $test-$index"}}
    $vi = $vietnamese["$test-$index"]
    if (!$vi -or $vi.Count -ne $q.prompt.answers.Count -or @($vi | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count) { throw "Incomplete Vietnamese answer explanations: $test-$index" }
    $questions += @{id="$test-$index"; test=$test; number=$index; topic=$assigned[0]; section=$q.section; question=$q.prompt.question; answers=@($q.prompt.answers); correct=$correct; explanation=$q.prompt.explanation; explanationsVi=$vi}
  }
}
if ($test -ne 4 -or $questions.Count -ne 260) {throw 'Expected 260 questions from 4 tests'}
$bank = @{version=1; sources=$sources; questions=$questions} | ConvertTo-Json -Depth 20 -Compress
[IO.File]::WriteAllText((Join-Path $root 'quest-data.js'), 'window.QUEST_BANK = '+$bank+';', [Text.UTF8Encoding]::new($false))
& (Join-Path $root 'build-daily.ps1')
$template = [IO.File]::ReadAllText((Join-Path $root 'quest-shell.html'))
$css = [IO.File]::ReadAllText((Join-Path $root 'quest.css'))
$css += "`n" + [IO.File]::ReadAllText((Join-Path $root 'theory.css'))
$css += "`n" + [IO.File]::ReadAllText((Join-Path $root 'quest-daily.css'))
$js = [IO.File]::ReadAllText((Join-Path $root 'quest.js'))
$js = [IO.File]::ReadAllText((Join-Path $root 'theory.js')) + "`n" + $js
$js = [IO.File]::ReadAllText((Join-Path $root 'theory-advanced.js')) + "`n" + $js
$js = [IO.File]::ReadAllText((Join-Path $root 'theory-platform.js')) + "`n" + $js
$js = [IO.File]::ReadAllText((Join-Path $root 'quest-fun.js')) + "`n" + $js
$js = [IO.File]::ReadAllText((Join-Path $root 'quest-leaves.js')) + "`n" + $js
$js = [IO.File]::ReadAllText((Join-Path $root 'daily-runtime.js')) + "`n" + $js
$html = $template.Replace('<!-- QUEST_STYLE -->', '<style>'+$css+'</style>').Replace('<!-- QUEST_DATA -->', '<script>window.QUEST_BANK = '+$bank.Replace('</','<\/')+';</script>').Replace('<!-- QUEST_APP -->', '<script>'+$js+'</script>')
[IO.File]::WriteAllText((Join-Path $root 'AWS Data Quest.html'), $html, [Text.UTF8Encoding]::new($false))
$publishDirectory = Join-Path $root 'public'
[IO.Directory]::CreateDirectory($publishDirectory) | Out-Null
[IO.File]::WriteAllText((Join-Path $publishDirectory 'index.html'), $html, [Text.UTF8Encoding]::new($false))
foreach ($source in $sources) {
  Copy-Item -LiteralPath (Join-Path $root $source.file) -Destination (Join-Path $publishDirectory $source.file) -Force
}
$questions | Group-Object { $_.topic } | Select-Object Name,Count | Format-Table -AutoSize
Write-Output 'Built AWS Data Quest.html with 260 questions. Original files preserved.'
& (Join-Path $root 'build-exams.ps1')
