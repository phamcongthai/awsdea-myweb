'use strict';
(() => {
 const params=new URLSearchParams(location.search),qa=params.has('qa'),test=qa&&!params.has('cloud');
 const client=window.supabase.createClient('https://mvycbcgzjqfyhtzctdrb.supabase.co','sb_publishable_JoH1K-UyR92C1oSLfXPh1g_j1rh7aaQ',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:location.protocol!=='file:',storageKey:qa?'data-quest-auth-test-v1':'data-quest-auth-v1'},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})}});
 const keys=new Set(qa?['aws-data-quest-test-v1','aws-realtest-qa-v1','data-quest-daily-test-v1','data-quest-flashcards-test-v1','architect-quest-qa-v1','architect-data-qa','data-quest-fun-test']:['aws-data-quest-v1','aws-realtest-v1','data-quest-daily-v1','data-quest-flashcards-v1','architect-quest-v1','data-quest-fun']);
 keys.add(qa?'data-quest-music-test':'data-quest-music');
 keys.add(qa?'quest-notebook-test-v1':'quest-notebook-v1');
 const allowed=k=>keys.has(k)||k.startsWith(qa?'quest-note-test:':'quest-note:');
 let data={},revision=0,dirty=false,user=null,started=false,loaded=false,blocked=false,inflight=null,timer=null,generation=0,resolveReady;
 const ready=new Promise(r=>resolveReady=r),copy=v=>JSON.parse(JSON.stringify(v));
 const panel=document.createElement('section');panel.id='quest-cloud-gate';panel.setAttribute('role','region');panel.setAttribute('aria-label','Đồng bộ tài khoản');
 const badge=document.createElement('button');badge.id='quest-cloud-status';badge.type='button';badge.setAttribute('aria-live','polite');badge.textContent='☁ Đang kết nối…';document.body.append(panel,badge);
 function state(text){badge.textContent=text;}
 function gate(title,message,buttons){panel.hidden=false;panel.replaceChildren();const box=document.createElement('div');box.className='cloud-box';const h=document.createElement('h1');h.textContent=title;const p=document.createElement('p');p.textContent=message;box.append(h,p);for(const [label,action] of buttons){const b=document.createElement('button');b.type='button';b.className='btn primary';b.textContent=label;b.onclick=()=>Promise.resolve().then(action).catch(fail);box.append(b);}panel.append(box);blocked=true;}
 function errorMessage(e){return /PGRST20[25]|42P01|does not exist|schema cache/i.test((e?.code||'')+' '+(e?.message||''))?'Chưa có bảng đồng bộ. Hãy chạy supabase/schema.sql trong SQL Editor của Supabase, sau đó thử lại.':(e?.message||'Không kết nối được Supabase. Kiểm tra mạng rồi thử lại.');}
 function fail(e){if(e?.cloudHandled)return;state('☁ Chưa lưu DB');gate('Chưa đồng bộ được',errorMessage(e)+' Dữ liệu chưa gửi chỉ nằm tạm trong RAM; hãy giữ trang mở.',[['Thử lại',async()=>{if(loaded){blocked=false;await flush();panel.hidden=true;}else await connect(user,true);}]]);}
 function validPayload(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Object.entries(p).every(([k,v])=>allowed(k)&&typeof v==='string');}
 async function read(){const {data:rows,error}=await client.from('quest_learning_state').select('payload,revision,updated_at').eq('user_id',user.id).limit(1);if(error)throw error;const row=rows[0]||{payload:{},revision:0};if(!validPayload(row.payload))throw Error('Dữ liệu tài khoản không hợp lệ.');return row;}
 function begin(row){data=copy(row.payload);revision=row.revision;dirty=false;loaded=true;blocked=false;panel.hidden=true;state('☁ Đã lưu trên DB');if(!started){started=true;resolveReady();}}
 async function commit(payload,expected){const {data:row,error}=await client.rpc('save_quest_learning_state',{p_payload:payload,p_revision:expected});if(error)throw error;return row;}
 async function connect(next,force=false){
  if(test)return;if(next?.id===user?.id&&loaded&&!force)return;
  if(!next){if(started){location.reload();return;}user=null;loaded=false;gate('Đăng nhập để tiếp tục','Bấm Đăng nhập ở góc trên để vào tài khoản. Tiến độ được tải từ DB; tài khoản mới bắt đầu từ đầu.',[]);state('☁ Cần đăng nhập');return;}
  if(started&&user&&user.id!==next.id){location.reload();return;}
  user=next;gate('Đang tải tiến độ…','Đang lấy dữ liệu của tài khoản từ Supabase.',[]);
  try{begin(await read());}catch(e){fail(e);}
 }
 async function conflict(){const row=await read();gate('Tiến độ đã thay đổi trên thiết bị khác','Để tránh ghi đè âm thầm, hãy chọn bản muốn giữ. Bản đang làm chưa được lưu lên DB.',[
  ['Mở bản trên DB',()=>{dirty=false;location.reload();}],['Giữ bản đang làm và lưu lên DB',async()=>{revision=row.revision;blocked=false;await flush();if(!blocked)panel.hidden=true;}]
 ]);state('☁ Có thay đổi từ thiết bị khác');}
 async function flush(){
  if(test||!dirty)return;if(!loaded||!user)throw Error('Cần đăng nhập và tải dữ liệu trước.');if(blocked)throw Error('Hãy xử lý thông báo đồng bộ trước.');if(inflight){await inflight;if(dirty&&!blocked)return flush();return;}
  const snapshot=copy(data),gen=generation,id=user.id;state('☁ Đang lưu DB…');
  inflight=(async()=>{try{const row=await commit(snapshot,revision);if(user?.id!==id)return;revision=row.revision;if(gen===generation)dirty=false;state(dirty?'☁ Đang chờ lưu…':'☁ Đã lưu trên DB');}catch(e){if(e.code==='40001'){await conflict();e.cloudHandled=true;}else{fail(e);}throw e;}})();
  try{await inflight;}finally{inflight=null;}
  if(dirty&&!blocked)return flush();
 }
 function schedule(){dirty=true;generation++;state(blocked?'☁ Chưa lưu DB':'☁ Đang chờ lưu…');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),180);}
 // Timers (e.g. Hardcore expiry) may still advance while the network gate is up.
 // Retain their writes in RAM too; blocking UI must not discard a new deadline.
 window.QuestStorage=test?localStorage:{getItem:k=>data[k]??null,setItem(k,value){if(!allowed(k))throw Error('Unsupported learning key');if(!loaded)throw Error('Cloud data not ready');value=String(value);if(data[k]!==value){data[k]=value;schedule();}},removeItem(k){if(!loaded)throw Error('Cloud data not ready');if(k in data){delete data[k];schedule();}}};
 window.QuestCloud={client,ready,flush,get dirty(){return dirty;},get loaded(){return loaded;},get blocked(){return blocked;}};
 badge.onclick=()=>{if(blocked)panel.hidden=false;else if(dirty)flush().catch(()=>{});else window.QuestAuth.show();};
 if(test){panel.hidden=true;badge.hidden=true;resolveReady();return;}
 // Never navigate away while a save is pending. LocalStorage holds auth only.
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty&&!blocked)flush().catch(()=>{});});
 document.addEventListener('click',e=>{if(!dirty||blocked||e.target.closest('#quest-auth-dialog,#quest-cloud-gate,#quest-cloud-status'))return;const el=e.target.closest('a,button');if(!el)return;e.preventDefault();e.stopImmediatePropagation();flush().then(()=>{if(!blocked&&!dirty&&el.isConnected)el.click();}).catch(()=>{});},true);
 async function check(){if(!loaded||blocked||inflight)return;if(dirty){await flush();return;}const row=await read();if(!dirty&&!inflight&&row.revision>revision){gate('Có tiến độ mới trên DB','Một thiết bị khác đã cập nhật tài khoản. Mở lại trang để tiếp tục bằng bản mới nhất.',[['Mở tiến độ mới',()=>location.reload()]]);state('☁ Có tiến độ mới');}}
 window.addEventListener('focus',()=>check().catch(fail));window.addEventListener('online',()=>check().catch(fail));setInterval(()=>{if(!document.hidden)check().catch(fail);},20000);
 client.auth.onAuthStateChange((event,session)=>{if(event!=='INITIAL_SESSION')setTimeout(()=>connect(session?.user||null).catch(fail),0);});
 client.auth.getSession().then(({data,error})=>{if(error)throw error;return connect(data.session?.user||null);}).catch(fail);
})();
