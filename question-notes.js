'use strict';
(() => {
 const qa=new URLSearchParams(location.search).has('qa'),prefix=qa?'quest-note-test:':'quest-note:';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Use question content, never its shuffled position or displayed answer letters.
 const key=html=>prefix+new DOMParser().parseFromString(html,'text/html').body.textContent.normalize('NFKC').replace(/\s+/g,' ').trim();
 const read=k=>{try{return localStorage.getItem(k)||'';}catch{return '';}};
 let current='',opener=null;
 const dialog=document.createElement('dialog');dialog.id='question-note-dialog';dialog.setAttribute('aria-labelledby','question-note-title');
 dialog.innerHTML='<div class="row between"><h2 id="question-note-title">📝 Ghi nhớ cho câu này</h2><button type="button" class="btn small quiet" data-note-close aria-label="Đóng ghi chú">✕</button></div><label for="question-note-text">Viết ngắn điều dễ nhầm hoặc mẹo nhớ của bạn</label><textarea id="question-note-text" maxlength="1500" rows="6" placeholder="Ví dụ: Query lọc theo key; FilterExpression không giảm RCU…"></textarea><p id="question-note-status" role="status"></p><small>Lưu tự động trên trình duyệt này. Xóa hết nội dung để bỏ ghi chú.</small>';
 document.body.append(dialog);const input=dialog.querySelector('textarea'),status=dialog.querySelector('[role=status]');
 function update(){document.querySelectorAll('[data-question-note]').forEach(b=>{const exists=!!read(b.dataset.questionNote);b.classList.toggle('has-note',exists);b.setAttribute('aria-label',exists?'Mở ghi chú đã lưu cho câu này':'Thêm ghi chú cho câu này');});}
 input.addEventListener('input',()=>{try{if(input.value.trim())localStorage.setItem(current,input.value);else localStorage.removeItem(current);status.textContent='Đã lưu · '+input.value.length+'/1500 ký tự';update();}catch{status.textContent='Chưa lưu được. Hãy sao chép ghi chú trước khi đóng.';}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-question-note]');if(!b)return;opener=b;current=b.dataset.questionNote;input.value=read(current);status.textContent=input.value?'Ghi chú đã lưu':'Ghi chú mới';dialog.showModal();input.focus();});
 dialog.querySelector('[data-note-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
 window.addEventListener('storage',e=>{if(e.key?.startsWith(prefix))update();});
 window.QuestionNotes={button(html){const k=key(html);return `<button type="button" class="question-note-button ${read(k)?'has-note':''}" data-question-note="${esc(k)}" aria-label="${read(k)?'Mở ghi chú đã lưu cho câu này':'Thêm ghi chú cho câu này'}" title="Ghi chú cho câu này">📝</button>`;}};
})();
