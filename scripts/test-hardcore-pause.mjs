import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
try{
 const p=await browser.newPage();await p.goto(pathToFileURL(process.cwd()+'/public/realtest.html').href+'?qa=1&cert=dea');await p.waitForFunction(()=>window.Exam);
 await p.evaluate(()=>{window.testNow=Date.now();Date.now=()=>window.testNow;document.hasFocus=()=>true;});
 await p.evaluate(()=>Exam.start(1,'hardcore'));
 const initial=await p.evaluate(()=>Exam.state.active.hardcoreRemaining);
 await p.evaluate(()=>{testNow+=2000;Exam.clock();});
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),initial-2000);
 await p.evaluate(()=>{window.dispatchEvent(new Event('blur'));testNow+=600000;window.dispatchEvent(new Event('focus'));});
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),initial-2000);
 await p.evaluate(()=>{testNow+=3600000;Exam.clock();});
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),initial-2000);
 for(let i=0;i<12;i++){
  await p.evaluate(()=>Exam.bank.questions[Exam.state.active.pos].correct.forEach(c=>Exam.choose(c)));
  await p.locator('[data-exam="check"]').click();
  if(i<11)await p.keyboard.press('ArrowRight');
 }
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),initial-2000+600000);
 const remaining=initial-2000+600000;
 await p.locator('[data-exam="hub"]').click();
 await p.evaluate(()=>{testNow+=3600000;});await p.evaluate(()=>Exam.resume(1));
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),remaining);
 await p.reload();await p.waitForFunction(()=>Exam.bank?.id===1);
 assert.ok(Math.abs(await p.evaluate(()=>Exam.state.active.hardcoreRemaining)-remaining)<2000);
 await p.evaluate(()=>Exam.reset());await p.evaluate(()=>Exam.start(1,'timed'));
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),undefined);
 console.log('PASS active countdown, blur/focus pause, sleep gap, hub/resume, reload, timed unchanged');
}finally{await browser.close();}
