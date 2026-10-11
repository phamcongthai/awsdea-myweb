$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$practice=[IO.File]::ReadAllText((Join-Path $root 'quest-data.js'))
$practice=$practice.Substring('window.QUEST_BANK = '.Length).TrimEnd(';') | ConvertFrom-Json
$review=@{}
foreach($q in $practice.questions){
  $review['p:'+$q.id]=@{id='p:'+$q.id;label="Luyện tập · Đề $($q.test) · Câu $($q.number)";question=$q.question;answers=$q.answers;correct=$q.correct;vi=$q.explanationsVi}
}
foreach($file in (Get-ChildItem (Join-Path $root 'exam-bank') -Filter 'test*.json')){
  $test=[IO.File]::ReadAllText($file.FullName)|ConvertFrom-Json
  foreach($q in $test.questions){
    $id="e:$($test.id):$($q.id)"
    $review[$id]=@{id=$id;label="Phòng thi · Đề $($test.id) · Câu $($q.id)";question=$q.question;answers=$q.answers;correct=$q.correct;explanation=$q.explanation}
  }
}
$keys=@{}
foreach($id in $review.Keys){$keys[$id]=@{correct=$review[$id].correct;count=$review[$id].answers.Count}}
$config=$keys|ConvertTo-Json -Depth 12 -Compress
$runtime='window.DAILY_KEYS = '+$config+';'+"`n"+[IO.File]::ReadAllText((Join-Path $root 'quest-daily.js'))
[IO.File]::WriteAllText((Join-Path $root 'daily-runtime.js'),$runtime,[Text.UTF8Encoding]::new($false))
[IO.Directory]::CreateDirectory((Join-Path $root 'public'))|Out-Null
[IO.File]::WriteAllText((Join-Path $root 'public/daily-bank.js'),'window.DAILY_REVIEW_BANK = '+($review|ConvertTo-Json -Depth 12 -Compress)+';',[Text.UTF8Encoding]::new($false))
