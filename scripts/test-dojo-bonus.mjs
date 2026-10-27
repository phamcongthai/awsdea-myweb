import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const bank=JSON.parse(fs.readFileSync('exam-bank/test9.json','utf8'));
assert.equal(bank.title,'Dojo Bonus · 6 câu mới');
assert.deepEqual(bank.questions.map(q=>q.sourceNumber),[1,2,4,5,7,9]);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
try {
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(process.cwd()+'/public/realtest.html').href+'?qa=1&cert=dea');
 await p.waitForFunction(()=>window.Exam);
 assert.equal(await p.locator('.exam-cards > article').count(),9);
 await p.evaluate(()=>Exam.start(9,'timed'));
 assert.equal(await p.evaluate(()=>Exam.bank.questions.length),6);
 assert.equal(await p.evaluate(()=>Exam.state.active.deadline-Exam.state.active.started),720000);
 for(let i=0;i<6;i++)await p.evaluate(i=>{Exam.state.active.pos=i;Exam.bank.questions[i].correct.forEach(c=>Exam.choose(c));},i);
 await p.evaluate(()=>Exam.submit());assert.equal(await p.evaluate(()=>Exam.state.history.at(-1).score),6);
 await p.locator('[data-exam="hub"]').click();
 await p.evaluate(()=>Exam.start(9,'review'));
 await p.evaluate(()=>Exam.bank.questions[Exam.state.active.pos].correct.forEach(c=>Exam.choose(c)));
 await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>Exam.state.active.checked.filter(Boolean).length),1);
 assert.ok(await p.evaluate(()=>Exam.bank.questions.every(q=>q.explanation.length>100)));
 for(const width of [390,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);
 console.log('PASS: 6 source questions, 9 cards, 12-minute timed score 6/6, review check, explanations, desktop/mobile.');
}finally{await browser.close();}
