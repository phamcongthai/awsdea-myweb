const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=__dirname,qa=path.join(root,'.qa');fs.mkdirSync(qa,{recursive:true});
const results=[];const pass=s=>{results.push(s);console.log('PASS',s);};
for(let n=1;n<=4;n++){
 const bank=JSON.parse(fs.readFileSync(path.join(root,'exam-bank/test'+n+'.json'),'utf8'));assert.equal(bank.questions.length,65);
 assert.equal(fs.readFileSync(path.join(root,'public/exams/test'+n+'.js'),'utf8'),'window.REALTEST_DATA = '+JSON.stringify(bank)+';');
 for(const q of bank.questions)for(const html of [q.question,...q.answers,q.explanation])for(const match of html.matchAll(/src="(exams\/assets\/[^" ]+)"/g))assert.ok(fs.existsSync(path.join(root,'public',match[1])));
 const rawDir=path.join(root,'realtest/Tests');if(fs.existsSync(rawDir)){
  const file=fs.readdirSync(rawDir).find(f=>f.startsWith('00'+n)&&f.endsWith('.html'));
  const original=JSON.parse(fs.readFileSync(path.join(rawDir,file),'utf8').match(/<script id="quiz-data-script" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const extract=s=>s.replace(/data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=\r\n]+)/g,(_,type,b64)=>'exams/assets/'+crypto.createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex')+'.'+(type==='jpeg'?'jpg':type));
  original.assessments.forEach((q,i)=>{assert.equal(bank.questions[i].question,extract(q.prompt.question));assert.equal(bank.questions[i].explanation,extract(q.prompt.explanation));assert.deepEqual(bank.questions[i].answers,q.prompt.answers.map(extract));assert.deepEqual(bank.questions[i].correct,q.correct_response.map(c=>c.charCodeAt(0)-97));});
 }
}pass('Four banks preserve all 260 original questions, answers, keys and explanations; all images are packaged');
const server=http.createServer((req,res)=>{try{const p=path.resolve(root,'public','.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(path.join(root,'public')+path.sep))throw Error();const file=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);}catch{res.statusCode=404;res.end();}});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let chrome,ws;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{
 const profile=path.join(qa,'exam-profile-'+Date.now());chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 for(let n=0;!fs.existsSync(path.join(profile,'DevToolsActivePort'))&&n<100;n++)await delay(100);
 const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json')).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pending=new Map(),errors=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async fn=>{const r=await send('Runtime.evaluate',{expression:typeof fn==='function'?`(${fn})()`:fn,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expr=>{for(let n=0;n<150;n++){if(await evaluate(expr))return;await delay(50);}throw Error('Timeout '+expr);};
 const test=async(name,fn)=>{assert.equal(await evaluate(fn),true,name);pass(name);};
 const snap=async(name,w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});await delay(100);const s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(qa,name+'.png'),Buffer.from(s.data,'base64'));};

 await send('Runtime.enable');await send('Page.enable');
 await send('Page.navigate',{url:base+'/index.html?qa=1'});await waitFor('Boolean(window.Quest&&window.QuestTheory)');
 await evaluate(()=>{Quest.reset();document.querySelector('[data-page="theory"]').click();});
 await test('Theory navigation shows six topic cards',()=>document.querySelectorAll('.theory-card').length===6&&document.querySelector('.breadcrumb').textContent.includes('Lý thuyết nhanh'));
 await snap('theory-home-desktop',1440,1000);
 const ids=['compute','storage','s3','redshift','aurora','rds'];
 for(const id of ids){
  await evaluate(`document.querySelector('[data-theory="open"][data-id="${id}"]').click()`);
  await test(id+' article includes diagram, recall and AWS sources',()=>!!document.querySelector('.theory-diagram')&&!!document.querySelector('.theory-recall details:not([open])')&&Array.from(document.querySelectorAll('.theory-sources a')).every(a=>a.href.startsWith('https://docs.aws.amazon.com/')));
  await evaluate(()=>document.querySelector('.theory-recall summary').click());
  await test(id+' recall reveals answer',()=>document.querySelector('.theory-recall details').open);
  await snap('theory-'+id+'-mobile',320,780);
  await test(id+' fits narrow mobile',()=>document.documentElement.scrollWidth<=innerWidth);
  await evaluate(()=>document.querySelector('[data-theory="read"]').click());
  await evaluate(()=>document.querySelector('[data-theory="back"]').click());
 }
 await send('Page.reload');await waitFor('Boolean(window.Quest)');await evaluate(()=>Quest.go('theory'));
 await test('Read markers survive refresh',()=>document.querySelector('.theory-intro .pill').textContent.includes('6/6'));
 await evaluate(()=>{document.querySelector('[data-id="s3"]').click();document.querySelector('[data-theory="read"]').click();});
 await test('Read marker can be removed',()=>JSON.parse(localStorage.getItem('data-quest-theory-test-v1')).length===5);
 await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await evaluate(()=>{document.querySelector('[data-theory="back"]').click();document.querySelector('[data-id="aurora"]').click();});
 await test('Articles and diagrams work without network',()=>document.getElementById('theory-title').textContent==='Amazon Aurora'&&!!document.querySelector('.theory-diagram'));
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await evaluate(()=>{DailyGate.recordPractice('1-1',false);const s=JSON.parse(localStorage.getItem('data-quest-daily-test-v1'));s.day='2000-01-01';localStorage.setItem('data-quest-daily-test-v1',JSON.stringify(s));DailyGate.refresh();});
 await test('Daily review lock also protects theory',()=>DailyGate.isLocked&&document.getElementById('app').inert);
 assert.equal(errors.length,0,JSON.stringify(errors));pass('No browser exceptions');
 fs.writeFileSync(path.join(qa,'theory-verification.json'),JSON.stringify({passed:results.length,results},null,2));await send('Browser.close');
}finally{ws?.close();chrome?.kill();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});