import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(process.cwd()+'/public/realtest.html').href+'?qa=1');await p.waitForFunction(()=>window.Exam);
await p.evaluate(()=>Exam.start(9,'review'));await p.evaluate(()=>Exam.submit());const history=await p.evaluate(()=>JSON.stringify(Exam.state.history));await p.locator('[data-exam="hub"]').click();
for(const mode of ['review','timed','hardcore','ultra']){
 await p.evaluate(mode=>Exam.start(1,mode,true),mode);const id=await p.evaluate(()=>Exam.state.active.id);
 await p.locator('.exam-top [data-exam="cancel-run"]').click();await p.locator('[data-exam="close"]').click();assert.equal(await p.evaluate(()=>Exam.state.active.id),id);
 await p.locator('.exam-top [data-exam="cancel-run"]').click();await p.locator('[data-exam="cancel-confirm"]').click();assert.equal(await p.evaluate(()=>Exam.state.active),null);assert.ok(await p.locator('.exam-cards').isVisible());assert.equal(await p.evaluate(()=>JSON.stringify(Exam.state.history)),history);
 await p.locator('[data-exam="prepare"][data-test="1"]').click();assert.ok(await p.locator('[data-mode="review"]').isVisible());await p.locator('[data-exam="close"]').click();
}
await p.evaluate(()=>Exam.start(2,'review'));await p.locator('[data-exam="hub"]').click();await p.evaluate(()=>Exam.start(3,'timed'));await p.locator('[data-exam="hub"]').click();
await p.locator('[data-exam="cancel-run"][data-test="2"]').click();await p.locator('[data-exam="cancel-confirm"]').click();assert.equal(await p.evaluate(()=>Exam.state.parked[2]),undefined);assert.equal(await p.evaluate(()=>Exam.state.active.test),3);
await p.reload();await p.waitForFunction(()=>Exam.bank?.id===3);assert.equal(await p.evaluate(()=>Exam.state.parked[2]),undefined);assert.equal(await p.evaluate(()=>JSON.stringify(Exam.state.history)),history);assert.deepEqual(errors,[]);
console.log('PASS cancel/back for all four modes including Ultra, mode reselection, parked cancel isolated, saved results retained, reload persistence.');
}finally{await browser.close();}
