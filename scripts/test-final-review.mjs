import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const bank=JSON.parse(fs.readFileSync('exam-bank/test10.json','utf8'));
assert.equal(bank.questions.length,20);assert.equal(bank.reviewOnly,true);
for(const q of bank.questions){const old=JSON.parse(fs.readFileSync(`exam-bank/test${q.sourceTest}.json`,'utf8')).questions.find(o=>o.id===q.sourceQuestion);for(const key of ['question','answers','correct','explanation'])assert.deepEqual(q[key],old[key]);}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(process.cwd()+'/public/realtest.html').href+'?qa=1&cert=dea');await p.waitForFunction(()=>window.Exam);
const card=p.locator('.exam-cards article').filter({hasText:bank.title});assert.ok((await card.textContent()).includes('Chỉ Review'));assert.ok(!(await card.textContent()).includes('Hardcore'));
await card.locator('[data-exam="prepare"]').click();await p.waitForFunction(()=>Exam.bank?.id===10);assert.equal(await p.evaluate(()=>Exam.state.active.mode),'review');assert.equal(await p.locator('#exam-clock').count(),0);
await p.evaluate(()=>Exam.bank.questions[Exam.state.active.pos].correct.forEach(i=>Exam.choose(i)));await p.locator('[data-exam="check"]').click();assert.equal(await p.locator('.explanation[open]').count(),1);
await p.locator('[data-exam="hub"]').click();await p.reload();await p.waitForFunction(()=>Exam.bank?.id===10);assert.equal(await p.evaluate(()=>Exam.state.active.checked.filter(Boolean).length),1);
for(const mode of ['timed','hardcore','ultra']){await p.evaluate(()=>Exam.reset());await p.evaluate(mode=>Exam.start(10,mode),mode);assert.equal(await p.evaluate(()=>Exam.state.active.mode),'review');}
assert.deepEqual(errors,[]);console.log('PASS 20 exact source questions/answers, Review-only card, forced Review for all entry modes, check/explanation, persisted resume.');
}finally{await browser.close();}
