'use strict';
(() => {
 const key='quest-color-theme-v1';
 let current=document.documentElement.dataset.theme||'dark';
 const button=document.createElement('button');button.id='quest-theme-toggle';button.type='button';
 function apply(theme,persist=false){
  current=theme==='light'?'light':'dark';document.documentElement.dataset.theme=current;
  button.textContent=current==='light'?'☾':'☀';
  button.title=current==='light'?'Chuyển sang giao diện tối':'Chuyển sang giao diện sáng';
  button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(current==='light'));
  if(persist)try{localStorage.setItem(key,current);}catch{}
 }
 button.onclick=()=>apply(current==='dark'?'light':'dark',true);
 function mount(){const actions=document.querySelector('.quest-header-actions');if(actions&&!button.isConnected)actions.prepend(button);}
 apply(current);mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue);});
})();
