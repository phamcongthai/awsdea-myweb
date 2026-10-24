'use strict';
(() => {
 if(document.getElementById('quest-notebook'))return;
 const qa=new URLSearchParams(location.search).has('qa'),key=qa?'quest-notebook-test-v1':'quest-notebook-v1';
 let ready=false,entry={version:1,text:'',lastReadSlot:''},saveTimer,boundaryTimer;
 const button=document.createElement('button');button.id='quest-notebook';button.type='button';button.title='Sổ tay cá nhân';button.setAttribute('aria-haspopup','dialog');button.innerHTML='<span class="notebook-icon" aria-hidden="true">📓</span><span class="notebook-dot" aria-hidden="true"></span>';
 const dialog=document.createElement('dialog');dialog.id='quest-notebook-dialog';dialog.setAttribute('aria-labelledby','notebook-title');dialog.innerHTML='<header class="notebook-heading"><div><span class="eyebrow">GÓC GHI NHỚ CỦA BẠN</span><h2 id="notebook-title">Sổ tay của tôi</h2></div><button type="button" class="btn quiet small" data-notebook-close aria-label="Đóng sổ tay">✕</button></header><p class="notebook-intro">Ghi mẹo nhớ, bẫy đề và những điều muốn đọc lại. Chỉ tài khoản của bạn xem được.</p><label class="notebook-label" for="notebook-text">Ghi chú cá nhân</label><textarea id="notebook-text" maxlength="20000" rows="8" placeholder="Hôm nay mình cần nhớ…&#10;&#10;• CloudTrail: ai đã gọi API nào?&#10;• CloudWatch: hệ thống đang hoạt động ra sao?&#10;&#10;Mẹo phân biệt những đáp án dễ nhầm…"></textarea><footer class="notebook-footer"><span id="notebook-save" role="status" aria-live="polite"></span><span id="notebook-count"></span></footer><div class="notebook-reminder">🔔 Nhắc đọc lúc <b>07:00</b> và <b>19:00</b> mỗi ngày · giờ Việt Nam. Mở sổ tay sẽ bỏ chấm đỏ của mốc hiện tại.</div><button type="button" class="btn primary notebook-done" data-notebook-close>Xong, mình đã đọc →</button>';
 document.body.append(button,dialog);const input=dialog.querySelector('textarea'),status=dialog.querySelector('#notebook-save'),count=dialog.querySelector('#notebook-count');
 function slotAt(value=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p=>[p.type,p.value]));
  const day=p.year+'-'+p.month+'-'+p.day,h=Number(p.hour);
  if(h>=19)return day+'T19:00:00+07:00';if(h>=7)return day+'T07:00:00+07:00';
  const yesterday=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)-1)).toISOString().slice(0,10);return yesterday+'T19:00:00+07:00';
 }
 function save(){window.QuestStorage.setItem(key,JSON.stringify(entry));status.textContent='Đang lưu lên DB…';}
 function refresh(){let due=ready&&entry.lastReadSlot!==slotAt();if(ready&&dialog.open&&due){entry.lastReadSlot=slotAt();save();flush();due=false;}button.classList.toggle('needs-reading',due);button.setAttribute('aria-label',due?'Sổ tay · Đến giờ đọc lại ghi chú':'Mở sổ tay cá nhân');button.title=due?'Đến giờ đọc lại sổ tay · 07:00 và 19:00':'Sổ tay cá nhân';}
 function schedule(){clearTimeout(boundaryTimer);boundaryTimer=setTimeout(()=>{refresh();schedule();},Math.max(50,Date.parse(slotAt())+12*3600000-Date.now()+50));}
 async function flush(){try{await window.QuestCloud.flush();status.textContent='✓ Đã lưu trên DB theo tài khoản.';return true;}catch{status.textContent='Chưa lưu được. Giữ trang mở và thử lại khi có mạng.';return false;}}
 function open(){if(!ready){window.QuestAuth.show();return;}if(window.QuestCloud.blocked)return;input.value=entry.text;count.textContent=input.value.length.toLocaleString('vi-VN')+' / 20.000 ký tự';entry.lastReadSlot=slotAt();save();refresh();dialog.showModal();dialog.scrollTop=0;dialog.querySelector('[data-notebook-close]').focus({preventScroll:true});input.scrollTop=0;pictureNotes.open();flush();}
 const pictureNotes=window.QuestNotebookImages.mount({dialog,input,getEntry:()=>entry,save,flush});
 button.onclick=open;
 input.addEventListener('input',()=>{entry.text=input.value;count.textContent=input.value.length.toLocaleString('vi-VN')+' / 20.000 ký tự';save();clearTimeout(saveTimer);saveTimer=setTimeout(flush,650);});
 dialog.querySelectorAll('[data-notebook-close]').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('close',()=>{clearTimeout(saveTimer);flush();});
 window.addEventListener('focus',()=>{refresh();schedule();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();schedule();}});
 window.QuestCloud.ready.then(()=>{try{const saved=JSON.parse(window.QuestStorage.getItem(key));if(saved?.version===1&&typeof saved.text==='string'&&saved.text.length<=20000&&typeof saved.lastReadSlot==='string')entry=saved;}catch{}ready=true;refresh();schedule();});
 window.QuestNotebook={open,slotAt,refresh};
})();
