'use strict';
(() => {
 if(document.getElementById('quest-header'))return;
 const header=document.createElement('header');header.id='quest-header';header.setAttribute('aria-label','Thanh điều hướng tài khoản');
 header.innerHTML='<div class="quest-header-brand"><span aria-hidden="true">✦</span><div>DATA QUEST<small>Mỗi ngày một bước tiến.</small></div></div><nav class="quest-header-actions" aria-label="Ngày, xếp hạng và tài khoản"></nav>';
 document.body.prepend(header);document.body.classList.add('has-quest-header');const actions=header.querySelector('nav');
 function collect(){for(const id of ['daily-date','quest-notebook','quest-social-open','quest-account']){const el=document.getElementById(id);if(el&&el.parentElement!==actions)actions.append(el);}const order=['daily-date','quest-notebook','quest-social-open','quest-account'];for(const el of actions.children)el.style.order=order.indexOf(el.id);}
 window.QuestCert.mount(header,actions);
 document.addEventListener('keydown',e=>{
  if(!['ArrowRight','Enter'].includes(e.key)||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.defaultPrevented)return;
  if(e.target.closest?.('input,textarea,select,[contenteditable="true"],#quest-music')||document.querySelector('dialog[open]')||window.QuestCloud?.blocked)return;
  const daily=window.DailyGate?.isLocked;
  if(e.key==='Enter'&&e.target.closest?.('button,a,summary')&&!e.target.closest('[data-action="select"],[data-action="check"],[data-action="next"],[data-exam="answer"],[data-exam="check"],[data-daily="answer"],[data-daily="check"],[data-daily="next"]'))return;
  const next=e.key==='Enter'?(daily?document.querySelector('#daily-gate [data-daily="check"]'):document.querySelector('[data-action="check"],[data-exam="check"]'))||(!daily?document.querySelector('[data-action="next"]'):null):daily?document.querySelector('#daily-gate [data-daily="next"]'):document.querySelector('[data-action="next"],.exam-move button:last-child[data-exam="jump"]');
  if(next&&!next.closest('[inert]')){e.preventDefault();if(e.key==='Enter')e.stopImmediatePropagation();if(!next.disabled)next.click();}
 },true);
 collect();new MutationObserver(collect).observe(document.body,{childList:true});
})();
