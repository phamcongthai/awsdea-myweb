import {chromium} from 'playwright';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
const base=pathToFileURL(process.cwd()+'/public/').href,errors=[];
try{
const c=await browser.newContext(),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
for(const [cert,count] of [['dea',260],['saa',390],['clf',340]]){
 await p.goto(base+'index.html?qa=1&cert='+cert);await p.waitForFunction(()=>window.Quest);
 assert.equal(await p.evaluate(()=>Quest.BANK.questions.length),count);
 await p.evaluate(()=>QuestStorage.setItem('quest-note-test:shared-id',QuestCert.id));
 for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,cert+' width '+width);}
 await p.evaluate(()=>{const q=Quest.BANK.questions[0];Quest.startSession({topic:q.topic,ids:[q.id],label:'QA'});q.correct.forEach(i=>Quest.select(i));Quest.checkAnswer();});
 assert.equal(await p.evaluate(()=>Quest.state.active.checked),true);assert.equal(await p.evaluate(()=>Object.values(Quest.state.progress)[0].correct),true);
 console.log('PASS practice '+cert+' '+count+' questions, correct answer mapping, mobile header');
}
for(const cert of ['dea','saa','clf']){await p.goto(base+'index.html?qa=1&cert='+cert);await p.waitForFunction(()=>window.Quest);assert.equal(await p.evaluate(()=>QuestStorage.getItem('quest-note-test:shared-id')),cert);assert.equal(await p.evaluate(()=>Object.keys(Quest.state.progress).length),1);}
for(const cert of ['saa','clf']){
 await p.goto(base+'realtest.html?qa=1&cert='+cert);await p.waitForFunction(()=>window.Exam);assert.equal(await p.locator('.exam-cards > *').count(),6);
 for(let test=1;test<=6;test++){
  await p.evaluate(t=>Exam.start(t,'review'),test);await p.waitForFunction(t=>Exam.bank?.id===t,test);
  assert.equal(await p.evaluate(()=>Exam.bank.questions.length),cert==='clf'&&test===1?15:65);
  await p.evaluate(()=>{Exam.bank.questions[Exam.state.active.pos].correct.forEach(i=>Exam.choose(i));});await p.locator('[data-exam="check"]').click();
  assert.equal(await p.evaluate(()=>Exam.state.active.checked.filter(Boolean).length),1);
  const selected=await p.evaluate(()=>JSON.stringify(Exam.state.active.answers));await p.evaluate(()=>Exam.choose(0));assert.equal(await p.evaluate(()=>JSON.stringify(Exam.state.active.answers)),selected);
  await p.locator('[data-exam="hub"]').click();
 }
 console.log('PASS all 6 '+cert+' exams, exact source sizes, review check locks answers');
}
await p.evaluate(()=>Exam.reset());await p.evaluate(()=>Exam.start(1,'hardcore'));const deadline=await p.evaluate(()=>Exam.state.active.deadline);
for(let j=0;j<15;j++){
 await p.evaluate(()=>Exam.bank.questions[Exam.state.active.pos].correct.forEach(i=>Exam.choose(i)));await p.locator('[data-exam="check"]').click();
 if(j<14)await p.evaluate(()=>{const a=Exam.state.active,n=a.questionOrder.find(i=>!a.checked[i]);document.querySelector('[data-exam="jump"][data-index="'+n+'"]').click();});
}
assert.equal(await p.evaluate(()=>Exam.state.active.checked.filter(Boolean).length),15);assert.equal(await p.evaluate(()=>Exam.state.active.deadline),deadline+1200000);
await p.reload();await p.waitForFunction(()=>Exam.bank?.id===1);assert.equal(await p.evaluate(()=>Exam.state.active.checked.filter(Boolean).length),15);
console.log('PASS CLF diagnostic Hardcore has 12+3 stages, two time bonuses, reload preserves run');
await p.goto(base+'index.html?qa=1&cert=dea');await p.waitForFunction(()=>window.Quest);await p.locator('#quest-cert-select').selectOption('saa');await p.waitForFunction(()=>window.Quest&&QuestCert.id==='saa');assert.equal(await p.evaluate(()=>Quest.BANK.questions.length),390);

const d=await c.newPage();d.on('pageerror',e=>errors.push(e.message));await d.clock.install({time:new Date('2026-10-23T08:00:00+07:00')});await d.goto(base+'index.html?qa=1&cert=clf');await d.waitForFunction(()=>window.Quest);await d.evaluate(()=>{Quest.reset();Quest.go('flashcards');});assert.equal(await d.locator('.fc-list > article').count(),340);await d.locator('[data-fc="start"]').click();assert.ok(await d.locator('[data-fc="flip"]').count());
await d.evaluate(()=>{DailyGate.recordPractice('1-1',false);DailyGate.recordExamAnswer(1,1,false);});assert.deepEqual(await d.evaluate(()=>DailyGate.state.wrong),['p:1-1']);
await d.clock.setSystemTime(new Date('2026-10-24T08:00:00+07:00'));await d.evaluate(()=>DailyGate.refresh());assert.equal(await d.evaluate(()=>DailyGate.isLocked),true);await d.evaluate(()=>DailyGate.start());
await d.evaluate(()=>{const r=DailyGate.state.round,k=QuestCert.dailyKeys[r.ids[0]],wrong=Array.from({length:k.count},(_,i)=>i).filter(i=>!k.correct.includes(i));const selected=k.correct.slice();selected[0]=wrong[0];selected.forEach(i=>DailyGate.choose(i));DailyGate.check();});assert.equal(await d.evaluate(()=>DailyGate.state.round.results[0]),null);assert.equal(await d.evaluate(()=>DailyGate.state.history.at(-1).passed),false);
await d.evaluate(()=>{const r=DailyGate.state.round;QuestCert.dailyKeys[r.ids[0]].correct.forEach(i=>DailyGate.choose(i));DailyGate.check();DailyGate.next();});assert.equal(await d.evaluate(()=>DailyGate.isLocked),false);
console.log('PASS CLF flashcards, practice/review wrong deduplicated, next-day gate source loading and shuffled answer grading, immediate failed-round reset');
await p.screenshot({path:'.qa/certificates-desktop.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS certificate picker navigation; notes/progress isolation, no JS errors');
}finally{await browser.close();}
