'use strict';
(() => {
 const qa=new URLSearchParams(location.search).has('qa'),prefix=qa?'quest-highlight-test:':'quest-highlight:';
 const colors=['yellow','green','blue','pink'],names=['Vàng','Xanh lá','Xanh dương','Hồng'];
 const normalize=s=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
 const bar=document.createElement('div');bar.className='highlight-palette';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Bút tô sáng');
 bar.innerHTML='<span>Bôi đen đoạn chữ rồi chọn màu</span>'+colors.map((c,i)=>'<button type="button" data-highlight-color="'+c+'" class="highlight-color '+c+'" aria-label="Tô màu '+names[i]+'" title="'+names[i]+'"></button>').join('')+'<button type="button" data-highlight-erase title="Xóa màu của đoạn đang chọn">Tẩy</button><button type="button" data-highlight-clear title="Xóa tất cả màu trong câu này">Xóa màu câu</button><button type="button" data-highlight-close aria-label="Đóng bút tô sáng">✕</button><small role="status"></small>';
 document.body.append(bar);let selection=null,currentCard=null,timer=0;const seen=new WeakMap();
 const excluded='.answer-status,.answer-hint,.highlight-launch,.highlight-palette';
 function nodes(target){const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest(excluded)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}),out=[];while(walker.nextNode())out.push(walker.currentNode);return out;}
 function text(target){return nodes(target).map(n=>n.data).join('');}
 function identity(target){const card=target.closest('.question-card'),q=card?.querySelector('.question-text');if(!q)return null;return {card,key:prefix+normalize(q.textContent),region:target===q?'question':'answer:'+normalize(text(target))};}
 function read(key){try{const s=JSON.parse(QuestStorage.getItem(key)||'{}');return s.version===1&&s.regions&&typeof s.regions==='object'&&!Array.isArray(s.regions)?s:{version:1,regions:{}};}catch{return {version:1,regions:{}};}}
 function valid(m,length){return m&&Number.isInteger(m.start)&&Number.isInteger(m.end)&&m.start>=0&&m.start<m.end&&m.end<=length&&colors.includes(m.color);}
 function paint(target,info,data){
  const value=JSON.stringify(data),signature=info.key+'|'+info.region+'|'+value;if(seen.get(target)===signature)return;
  target.querySelectorAll('mark[data-quest-highlight]').forEach(mark=>mark.replaceWith(...mark.childNodes));target.normalize();
  const list=nodes(target),plain=list.map(n=>n.data).join('');let at=0;
  const ranges=data?.text===plain&&Array.isArray(data.marks)?data.marks.filter(m=>valid(m,plain.length)).slice(0,100):[];
  for(const node of list){const start=at,end=start+node.length;at=end;const hits=ranges.filter(m=>m.start<end&&m.end>start).sort((a,b)=>b.start-a.start);for(const m of hits){const left=Math.max(m.start,start)-start,right=Math.min(m.end,end)-start;if(right<node.length)node.splitText(right);const part=left?node.splitText(left):node,mark=document.createElement('mark');mark.dataset.questHighlight=m.color;mark.className='quest-highlight '+m.color;part.replaceWith(mark);mark.append(part);}}
  seen.set(target,signature);
 }
 function refresh(){if(currentCard&&!currentCard.isConnected){bar.hidden=true;selection=null;currentCard=null;}
  for(const card of document.querySelectorAll('.question-card')){const q=card.querySelector('.question-text');if(!q)continue;
   if(!card.querySelector('.highlight-launch')){const button=document.createElement('button');button.type='button';button.className='btn quiet small highlight-launch';button.textContent='🖍 Tô sáng';button.title='Chọn đoạn chữ trong câu hỏi hoặc đáp án để tô màu';button.onclick=()=>{currentCard=card;selection=null;show(button.getBoundingClientRect());};card.prepend(button);}
   for(const target of card.querySelectorAll('.question-text,.answer-copy')){const info=identity(target);if(info)paint(target,info,read(info.key).regions[info.region]);}
  }
 }
 function show(rect){bar.hidden=false;bar.querySelector('small').textContent='';const width=Math.min(480,innerWidth-20);bar.style.width=width+'px';bar.style.left=Math.max(10,Math.min(rect.left,innerWidth-width-10))+'px';bar.style.top=Math.max(10,Math.min(rect.bottom+8,innerHeight-bar.offsetHeight-10))+'px';}
 function capture(){const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;const range=s.getRangeAt(0),element=range.startContainer.nodeType===3?range.startContainer.parentElement:range.startContainer,target=element.closest?.('.question-text,.answer-copy');if(!target||element.closest(excluded)||!target.contains(range.endContainer))return;const info=identity(target);if(!info)return;const pre=document.createRange();pre.selectNodeContents(target);pre.setEnd(range.startContainer,range.startOffset);const start=pre.toString().length,end=start+range.toString().length,plain=text(target);if(end>plain.length||end<=start)return;selection={...info,target,start,end,text:plain};currentCard=info.card;show(range.getBoundingClientRect());}
 function update(color){if(!selection||!selection.target.isConnected){bar.querySelector('small').textContent='Hãy bôi đen đoạn chữ muốn tô trước.';return;}const s=selection,entry=read(s.key),old=entry.regions[s.region],marks=old?.text===s.text&&Array.isArray(old.marks)?old.marks.filter(m=>valid(m,s.text.length)):[],next=[];
  for(const m of marks){if(m.end<=s.start||m.start>=s.end)next.push(m);else{if(m.start<s.start)next.push({...m,end:s.start});if(m.end>s.end)next.push({...m,start:s.end});}}
  if(color)next.push({start:s.start,end:s.end,color});next.sort((a,b)=>a.start-b.start);const merged=[];for(const m of next){const last=merged.at(-1);if(last&&last.end===m.start&&last.color===m.color)last.end=m.end;else merged.push(m);}
  if(merged.length>100){bar.querySelector('small').textContent='Tối đa 100 đoạn tô trong mỗi phần chữ.';return;}
  if(merged.length)entry.regions[s.region]={text:s.text,marks:merged};else delete entry.regions[s.region];
  try{if(Object.keys(entry.regions).length)QuestStorage.setItem(s.key,JSON.stringify(entry));else QuestStorage.removeItem(s.key);paint(s.target,s,entry.regions[s.region]);getSelection()?.removeAllRanges();bar.querySelector('small').textContent='Đã ghi nhớ màu · đang đồng bộ tài khoản.';}catch{bar.querySelector('small').textContent='Chưa lưu được màu. Hãy giữ trang mở và kiểm tra kết nối.';}
 }
 bar.addEventListener('pointerdown',e=>e.preventDefault());bar.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-highlight-close')){bar.hidden=true;return;}if(b.hasAttribute('data-highlight-clear')){const q=currentCard?.querySelector('.question-text'),info=q&&identity(q);if(info){try{QuestStorage.removeItem(info.key);refresh();selection=null;getSelection()?.removeAllRanges();bar.querySelector('small').textContent='Đã xóa màu của câu này.';}catch{bar.querySelector('small').textContent='Chưa xóa được màu.';}}return;}update(b.dataset.highlightColor||null);});
 document.addEventListener('pointerup',e=>{if(!e.target.closest?.('.highlight-palette'))setTimeout(capture,0);});
 document.addEventListener('keyup',e=>{if(e.key==='Shift')capture();});let selectionTimer;document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(capture,100);});
 // Selecting text inside an answer must not choose that answer.
 document.addEventListener('click',e=>{if(e.target.closest?.('.answer')&&getSelection()&&!getSelection().isCollapsed){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')bar.hidden=true;});
 const observer=new MutationObserver(()=>{cancelAnimationFrame(timer);timer=requestAnimationFrame(refresh);});observer.observe(document.body,{subtree:true,childList:true});refresh();
})();
