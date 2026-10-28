import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
try{
 const p=await browser.newPage();await p.goto(pathToFileURL(process.cwd()+'/public/realtest.html').href+'?qa=1');await p.waitForFunction(()=>window.Exam);
 await p.evaluate(()=>{window.now=Date.now();Date.now=()=>now;document.hasFocus=()=>true;window.points=2999;QuestCloud.client.rpc=async()=>({data:{me:{points}},error:null});});
 await p.evaluate(()=>Exam.refreshTimerRank());await p.evaluate(()=>Exam.start(1,'hardcore'));
 assert.equal(await p.locator('[data-exam="pause-time"]').count(),0);
 await p.evaluate(()=>{points=3000;return Exam.refreshTimerRank();});
 await p.locator('[data-exam="pause-time"]').click();
 assert.equal(await p.evaluate(()=>Exam.state.active.timerPaused),true);
 const remaining=await p.evaluate(()=>Exam.state.active.hardcoreRemaining);
 await p.evaluate(()=>{now+=3000;Exam.clock();});assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),remaining);
 await p.locator('[data-exam="pause-time"]').click();await p.evaluate(()=>{now+=2000;Exam.clock();});
 assert.equal(await p.evaluate(()=>Exam.state.active.hardcoreRemaining),remaining-2000);
 await p.locator('[data-exam="pause-time"]').click();
 await p.reload();await p.waitForFunction(()=>Exam.bank?.id===1);
 assert.equal(await p.evaluate(()=>Exam.state.active.timerPaused),true);
 await p.evaluate(()=>{QuestCloud.client.rpc=async()=>({data:{me:{points:6000}},error:null});return Exam.refreshTimerRank();});
 assert.equal(await p.locator('[data-exam="pause-time"]').getAttribute('aria-pressed'),'true');
 await p.evaluate(()=>Exam.reset());await p.evaluate(()=>Exam.start(1,'timed'));
 assert.equal(await p.locator('[data-exam="pause-time"]').count(),0);
 console.log('PASS rank <3000 hidden, Gold+ button, manual pause/resume, persisted pause, timed excluded');
}finally{await browser.close();}
