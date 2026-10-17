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
const server=http.createServer((req,res)=>{try{const p=path.resolve(root,'public','.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(path.join(root,'public')+path.sep))throw Error();const file=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);}catch{res.statusCode=404;res.end();}});
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
 await send('Page.navigate',{url:base+'/architect.html?qa=1'});await waitFor('Boolean(window.ArchitectQA)');await snap('architect-home',1440,1000);
 await test('Only first mission in each world initially unlocked',()=>{document.querySelector('[data-world=network]').click();return document.querySelector('[data-mission=n1]').disabled===false&&document.querySelector('[data-mission=n2]').disabled;});
 await evaluate(()=>ArchitectQA.open('b1'));await snap('architect-mission',1440,1000);
 await test('Can add model and connect actual typed ports',()=>{document.querySelector('[data-add=model]').click();document.querySelector('[data-port=out][data-id=app]').click();document.querySelector('[data-port=in][data-id=model]').click();document.querySelector('[data-port=out][data-id=role]').click();document.querySelector('[data-port=in][data-id=model]').click();return ArchitectQA.session.graph.edges.length===2;});
 await test('Undo and redo restore the actual graph',()=>{document.querySelector('[data-do=undo]').click();const undone=ArchitectQA.session.graph.edges.length===1;document.querySelector('[data-do=redo]').click();return undone&&ArchitectQA.session.graph.edges.length===2;});
 await test('Incompatible ports cannot create decorative connections',()=>{document.querySelector('[data-port=out][data-id=model]').click();document.querySelector('[data-port=in][data-id=role]').click();return ArchitectQA.session.graph.edges.length===2;});
 await evaluate(()=>{ArchitectQA.execute('verify');ArchitectQA.finishTrace();});
 await test('Real UI b1 success awards XP and unlocks b2',()=>ArchitectQA.result.status==='success'&&ArchitectQA.store.xp===150&&!!ArchitectQA.store.completed.b1);
 await evaluate(()=>{ArchitectQA.execute('verify');ArchitectQA.finishTrace();});await test('Replay cannot farm XP',()=>ArchitectQA.store.xp===150);
 await evaluate(()=>ArchitectQA.unlockAll());
 for(const id of ['b2','b3','b4','b5','b6','b7','n1','n2','n3','n4','n5','n6','n7','n8','n9']){
 await evaluate(`ArchitectQA.open('${id}',true);`);
 await evaluate(()=>{const m=ArchitectQA.missions.find(m=>m.id===ArchitectQA.store.last),g=m.solution();if(m.id==='b3')g.nodes.find(n=>n.id==='s3').config.documents[0].text=g.nodes.find(n=>n.id==='s3').config.documents[0].text.replace('7 days','30 days');let runtime={};if(m.world==='bedrock')runtime=ArchitectQA.run('bedrock',g,{action:'ingest'},{}).runtime;ArchitectQA.load(g,runtime);ArchitectQA.execute('verify');ArchitectQA.finishTrace();});
 await test(id+' UI renders successful trace and business outcome',()=>ArchitectQA.result.status==='success'&&document.querySelector('#trace details')&&document.querySelector('.aq-output.success')!==null);
 await evaluate(()=>document.querySelector('[data-do=quiz]').click());await test(id+' three question explanations available',()=>{document.querySelector('[data-answer="0:0"]').click();return document.querySelectorAll('.aq-quiz').length===3&&document.querySelector('.aq-quiz p').textContent.length>30;});
 }
 await evaluate(()=>ArchitectQA.open('b1',true));await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const tap=async selector=>{const r=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 await evaluate(()=>window.scrollTo(0,0));await tap('[data-do=palette]');await tap('[data-add=model]');await evaluate(()=>document.querySelector('[data-do=fit]').click());
 await tap('[data-port=out][data-id=app]');await tap('[data-port=in][data-id=model]');await tap('[data-port=out][data-id=role]');await tap('[data-port=in][data-id=model]');
 await test('Real mobile touch inserts node and connects two ports',()=>ArchitectQA.session.graph.edges.length===2);
 await tap('[data-do=properties]');await snap('architect-mobile-properties',390,844);await tap('#inspector [data-do=close-sheet]');
 await test('Visible mobile close control dismisses configuration sheet',()=>!document.querySelector('#inspector').classList.contains('open'));
 await evaluate(()=>{ArchitectQA.execute('verify');ArchitectQA.finishTrace();});await snap('architect-mobile-success',390,844);
 await test('Mobile page fits width',()=>document.documentElement.scrollWidth<=innerWidth+1);
 for(const id of ['b2','b3','b4','b5','b6','b7','n1','n2','n3','n4','n5','n6','n7','n8','n9']){
  await evaluate(`ArchitectQA.open('${id}',true);`);
  await test(id+' mobile canvas and configuration sheet are usable',()=>{const n=document.querySelector('[data-node]');n.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:100,clientY:300}));document.querySelector('[data-do=properties]').click();const host=document.querySelector('#inspector');return document.documentElement.scrollWidth<=innerWidth+1&&host.classList.contains('open')&&host.querySelector('input,textarea')!==null;});
 }
 await test('Incident seed creates a different reproducible fault',()=>{const before=ArchitectQA.session.seed;const original=window.confirm;window.confirm=()=>true;document.querySelector('[data-do=new-seed]').click();window.confirm=original;return ArchitectQA.session.seed===before+1;});
 await evaluate(()=>ArchitectQA.open('b1'));
 await evaluate(()=>document.querySelector('[data-do=home]').click());await send('Page.reload');await waitFor('Boolean(window.ArchitectQA)');await test('Progress persists across reload',()=>!!ArchitectQA.store.completed.b1&&ArchitectQA.store.saves.b1.graph.edges.length===2);
 await send('Page.navigate',{url:base+'/architect.html'});
 await waitFor('Boolean(document.querySelector("[data-do=continue]"))');
 await evaluate(async()=>{await navigator.serviceWorker.ready;});
 await waitFor('Boolean(navigator.serviceWorker.controller)');
 await send('Network.enable');
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await send('Page.reload');
 await waitFor('Boolean(document.querySelector("[data-do=continue]"))');
 await test('Offline reload loads application, modules and official icons',()=>document.querySelector('.aq-orbit img').complete&&document.querySelector('.aq-orbit img').naturalWidth>0);
 await evaluate(()=>document.querySelector('[data-do=continue]').click());
 await test('Offline mission opens and simulation produces a real failure trace',()=>{document.querySelector('[data-do=run]').click();return document.querySelector('#trace').textContent.length>20&&document.querySelectorAll('[data-node]').length===2;});
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 assert.equal(errors.length,0,JSON.stringify(errors));pass('No uncaught JavaScript errors');console.log(results.length+' browser checks passed');await send('Browser.close');
}finally{ws?.close();chrome?.kill();server.closeAllConnections();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
