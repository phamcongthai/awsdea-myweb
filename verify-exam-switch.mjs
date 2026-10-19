import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.cwd();const server=http.createServer((req,res)=>{try{const f=path.resolve(root,'public','.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(path.join(root,'public')+path.sep))throw Error();res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(f).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);}catch{res.statusCode=404;res.end();}});let browser;const pass=(n,v)=>{assert.ok(v,n);console.log('PASS',n);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/realtest.html?qa=1`);await page.waitForFunction(()=>window.Exam);
 const open=async(n,mode)=>{await page.locator(`.exam-cards [data-test="${n}"]`).click();if(mode)await page.locator(`[data-mode="${mode}"]`).click();await page.waitForFunction(n=>Exam.state.active?.test===n&&Exam.bank?.id===n,n);};
 await open(1,'review');await page.locator('.answer').first().click();await page.locator('[data-exam="flag"]').click();await page.locator('.exam-cell[data-index="2"]').click();
 const saved1=await page.evaluate(()=>JSON.stringify(Exam.state.active));await page.reload();await page.waitForFunction(()=>window.Exam?.bank);
 pass('Existing one-active-exam saves still load',await page.evaluate(()=>JSON.stringify(Exam.state.active))===saved1);
 await page.locator('[data-exam="hub"]').click();pass('Leaving exam 1 keeps exam 5 enabled',!await page.locator('.exam-cards [data-test="5"]').isDisabled());
 await open(5,'review');await page.locator('.answer').first().click();await page.locator('[data-exam="flag"]').click();await page.locator('.exam-cell[data-index="4"]').click();const saved5=await page.evaluate(()=>JSON.stringify(Exam.state.active));
 await page.locator('[data-exam="hub"]').click();await open(1);pass('Returning to exam 1 restores answers, position, flags and shuffle',await page.evaluate(()=>JSON.stringify(Exam.state.active))===saved1);
 await page.reload();await page.waitForFunction(()=>window.Exam?.bank);await page.locator('[data-exam="hub"]').click();await open(5);
 pass('Exam 5 and exam 1 survive reload independently',await page.evaluate(()=>JSON.stringify(Exam.state.active))===saved5&&await page.evaluate(()=>JSON.stringify(Exam.state.parked[1]))===saved1);
 pass('Unchecked answers and unanswered parked questions are not added to daily mistakes',await page.evaluate(()=>DailyGate.state.wrong.length===0));
 await page.screenshot({path:'.qa/exam-switch-dojo-mobile.png'});
 await page.locator('[data-exam="confirm"]').click();await page.locator('[data-exam="submit"]').click();await page.locator('[data-exam="hub"]').click();await open(1);
 pass('Submitting exam 5 does not remove unfinished exam 1',await page.evaluate(()=>JSON.stringify(Exam.state.active))===saved1&&await page.evaluate(()=>Exam.state.history.length===1&&Exam.state.history[0].test===5));
 // Work with a clean daily archive to isolate the unsent-review regression.
 await page.evaluate(()=>{Exam.reset();localStorage.removeItem('aws-data-quest-test-v1');localStorage.removeItem('data-quest-daily-test-v1');});await page.reload();await page.waitForFunction(()=>window.Exam);
 await open(1,'review');await page.evaluate(()=>{const q=Exam.bank.questions[0];for(const n of q.correct.slice(0,-1))Exam.choose(n);Exam.choose(q.answers.findIndex((_,i)=>!q.correct.includes(i)));});await page.locator('[data-exam="check"]').click();await page.locator('[data-exam="hub"]').click();await open(5,'review');
 await page.evaluate(()=>localStorage.removeItem('data-quest-daily-test-v1'));await page.reload();await page.waitForFunction(()=>window.DailyGate?.isLocked);
 pass('Mistakes in parked Review are recovered without counting all its blank questions',await page.evaluate(()=>JSON.stringify(DailyGate.state.pool)===JSON.stringify(['e:1:1'])&&Exam.state.parked[1].everWrong[0]));
 await page.evaluate(()=>{Exam.reset();localStorage.removeItem('data-quest-daily-test-v1');});await page.reload();await page.waitForFunction(()=>window.Exam);
 await open(2,'timed');await page.evaluate(()=>{const a=Exam.state.active;a.started=Date.now()-7201000;a.deadline=a.started+7200000;localStorage.setItem('aws-realtest-qa-v1',JSON.stringify(Exam.state));});
 // Programmatic switch models elapsed time while a timed test is parked.
 await page.evaluate(async()=>{await Exam.start(4,'review');});await page.locator('[data-exam="hub"]').click();await page.locator('.exam-cards [data-test="2"]').click();await page.waitForFunction(()=>!Exam.state.active&&Exam.state.history.some(h=>h.test===2));
 pass('Resuming an expired parked timed test auto-submits at its original deadline',await page.evaluate(()=>{const h=Exam.state.history.find(h=>h.test===2);return h.reason==='timeout'&&h.ended===h.deadline&&Exam.state.parked[4].mode==='review';}));
 pass('No browser errors',errors.length===0);
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
