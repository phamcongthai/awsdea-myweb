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
 const vm=require('node:vm'),context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'quest-data.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/daily-bank.js'),'utf8'),context);
 const expected={};
 for(const q of context.window.QUEST_BANK.questions)expected['p:'+q.id]={question:q.question,answers:q.answers,correct:q.correct,vi:q.explanationsVi};
 for(let n=1;n<=4;n++){const b=JSON.parse(fs.readFileSync(path.join(root,'exam-bank/test'+n+'.json'),'utf8'));for(const q of b.questions)expected[`e:${n}:${q.id}`]={question:q.question,answers:q.answers,correct:q.correct,explanation:q.explanation};}
 const runtime=fs.readFileSync(path.join(root,'daily-runtime.js'),'utf8');
 const keys=JSON.parse(runtime.slice('window.DAILY_KEYS = '.length,runtime.indexOf(';')));
 for(const [id,q] of Object.entries(expected)){const actual=context.window.DAILY_REVIEW_BANK[id];assert.equal(actual.question,q.question,id);assert.equal(JSON.stringify(actual.answers),JSON.stringify(q.answers),id);assert.equal(JSON.stringify(actual.correct),JSON.stringify(q.correct),id);assert.equal(JSON.stringify(keys[id].correct),JSON.stringify(q.correct),id);assert.equal(keys[id].count,q.answers.length,id);if(q.vi)assert.equal(JSON.stringify(actual.vi),JSON.stringify(q.vi),id);else assert.equal(actual.explanation,q.explanation,id);}
 assert.equal(Object.keys(expected).length,520);pass('All 520 daily questions, answer content, correct keys and explanations match their source banks');
 await send('Page.navigate',{url:base+'/index.html?qa=1'});await waitFor('Boolean(window.DailyGate&&window.Quest)');
 await evaluate(`window.QAexpected=${JSON.stringify(expected)}`);
 await evaluate(async()=>{const ids=Object.keys(QAexpected);localStorage.setItem('data-quest-daily-test-v1',JSON.stringify({version:1,wrong:ids,day:DailyGate.today(),pool:ids,unlocked:false,round:null,result:null,history:[]}));DailyGate.refresh();await DailyGate.start();});
 const ids=Object.keys(expected);
 for(let offset=0;offset<ids.length;offset+=20){
  const batch=ids.slice(offset,offset+20);
  await evaluate(`window.QAbatch=${JSON.stringify(batch)}`);
  const outcome=await evaluate(()=>{
   const plain=html=>new DOMParser().parseFromString(html,'text/html').body.textContent.trim();
   const all=Object.keys(QAexpected);
   function setup(id,order){const ids=[id,...all.filter(x=>x!==id)],s=JSON.parse(localStorage.getItem('data-quest-daily-test-v1'));s.round={ids,pos:0,orders:ids.map((x,i)=>i===0?order:QAexpected[x].answers.map((_,j)=>j)),answers:ids.map(()=>[]),results:ids.map(()=>null)};s.result=null;s.unlocked=false;localStorage.setItem('data-quest-daily-test-v1',JSON.stringify(s));DailyGate.refresh();}
   function clickOriginal(index){document.querySelector('#daily-gate .answer[data-index="'+index+'"]').click();}
   for(const id of QAbatch){const q=QAexpected[id],n=q.answers.length;const orders=[q.answers.map((_,i)=>n-1-i),q.answers.map((_,i)=>(i+1)%n)];
    for(const order of orders){setup(id,order);
     const buttons=[...document.querySelectorAll('#daily-gate .answer')];
     for(let i=0;i<n;i++){if(Number(buttons[i].dataset.index)!==order[i]||buttons[i].querySelector('.answer-letter').textContent!==String.fromCharCode(65+i)||buttons[i].querySelector('.answer-copy').textContent.trim()!==plain(q.answers[order[i]]))throw Error(id+' display mapping');}
     if(q.correct.length>1){clickOriginal(q.correct[0]);DailyGate.check();if(DailyGate.state.round.results[0]!==null||!document.querySelector('[data-daily="check"]').disabled)throw Error(id+' partial answer accepted');clickOriginal(q.correct[0]);}
     for(const i of q.correct)clickOriginal(i);document.querySelector('[data-daily="check"]').click();
     if(DailyGate.state.round.results[0]!==true)throw Error(id+' correct set rejected '+order);
     for(const b of document.querySelectorAll('#daily-gate .answer'))if(b.classList.contains('correct')!==q.correct.includes(Number(b.dataset.index)))throw Error(id+' wrong highlight');
     for(let i=0;i<n;i++){clickOriginal(i);const d=document.getElementById('daily-explanation');const letter=String.fromCharCode(65+order.indexOf(i));if(!d.open||!d.querySelector('#daily-reader-title').textContent.endsWith(letter)||d.querySelector('.reader-verdict').classList.contains('is-correct')!==q.correct.includes(i)||d.querySelector('.reader-answer').textContent.trim()!==plain(q.answers[i]))throw Error(id+' explanation mapping');if(q.vi&&d.querySelector('.option-explanation-text').textContent!==q.vi[i])throw Error(id+' Vietnamese explanation');document.querySelector('[data-daily="close-reader"]').click();}
     setup(id,order);const wrong=q.correct.slice();wrong[0]=q.answers.findIndex((_,i)=>!q.correct.includes(i));for(const i of wrong)clickOriginal(i);document.querySelector('[data-daily="check"]').click();if(DailyGate.state.round.results[0]!==false)throw Error(id+' wrong set accepted');
    }
   }
   return true;
  });
  assert.equal(outcome,true);pass(`UI answer and explanation mapping verified for source questions ${offset+1}–${Math.min(offset+20,ids.length)} with reversed and rotated answers`);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));pass('No browser errors during exhaustive daily mapping audit');
 fs.writeFileSync(path.join(qa,'daily-mapping-verification.json'),JSON.stringify({passed:results.length,results},null,2));await send('Browser.close');
}finally{ws?.close();chrome?.kill();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
