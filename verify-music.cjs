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
 for(const page of ['index.html','realtest.html']){
 await send('Page.navigate',{url:base+'/'+page+'?qa=1'});await waitFor('Boolean(window.QuestMusic)');
 await test(page+' default on and playlist present',()=>QuestMusic.state.enabled&&QuestMusic.state.volume===.65&&document.querySelectorAll('#music-track option').length===11);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x:300,y:150,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:300,y:150,button:'left',clickCount:1});
 await waitFor('!QuestMusic.state.paused&&document.querySelector("#quest-music audio").currentTime>0');
 for(let i=0;i<11;i++){
 await evaluate(`document.querySelector('#music-track').value='${i}';document.querySelector('#music-track').dispatchEvent(new Event('change'));`);
 await waitFor('document.querySelector("#quest-music audio").readyState>=2&&!QuestMusic.state.paused');
 assert.ok(await evaluate(()=>document.querySelector('#quest-music audio').duration)>120);pass(page+' track '+i+' decoded and playing');
 }
 await evaluate(()=>document.querySelector('#quest-music audio').dispatchEvent(new Event('ended')));await waitFor('QuestMusic.state.index===0&&!QuestMusic.state.paused');pass(page+' end of playlist loops to first');
 await test(page+' question render preserves audio element',()=>{const a=document.querySelector('#quest-music audio');window.Quest?.render();return a===document.querySelector('#quest-music audio')&&!a.paused;});
 await evaluate(()=>document.querySelector('.music-power').click());
 await test(page+' mute persists while selecting track',()=>{document.querySelector('[data-music=next]').click();return !QuestMusic.state.enabled&&QuestMusic.state.paused&&QuestMusic.state.index===1;});
 await evaluate(()=>document.querySelector('.music-power').click());await waitFor('!QuestMusic.state.paused');
 await evaluate(()=>{const ids=['p:1-15'];localStorage.setItem('data-quest-daily-test-v1',JSON.stringify({version:1,wrong:ids,day:DailyGate.today(),pool:ids,unlocked:false,round:null,result:null,history:[]}));DailyGate.refresh();});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await test(page+' mute accessible above daily gate',()=>{const b=document.querySelector('.music-power'),r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b;});
 await evaluate(()=>{if(document.querySelector('#music-panel').hidden)document.querySelector('.music-toggle').click();});await snap('classical-'+page,390,844);await test(page+' daily gate permits mute without unlocking',()=>{document.querySelector('.music-power').click();return !QuestMusic.state.enabled&&QuestMusic.state.paused&&!DailyGate.state.unlocked;});
 await test(page+' mobile panel fits',()=>{const r=document.querySelector('#music-panel').getBoundingClientRect();return r.width>0&&r.height>0&&r.x>=0&&r.right<=innerWidth&&r.y>=0;});
 await evaluate(()=>{localStorage.removeItem('data-quest-daily-test-v1');const v=document.querySelector('.music-volume');v.value='78';v.dispatchEvent(new Event('input'));});
 await send('Page.reload');await waitFor('Boolean(window.QuestMusic)');await test(page+' track and volume saved, defaults on again',()=>QuestMusic.state.index===1&&QuestMusic.state.volume===.78&&QuestMusic.state.enabled);
 await evaluate(()=>localStorage.removeItem('data-quest-music-test'));
 }
 assert.equal(errors.length,0,JSON.stringify(errors));pass('No browser errors');await send('Browser.close');
}finally{ws?.close();chrome?.kill();server.closeAllConnections();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});