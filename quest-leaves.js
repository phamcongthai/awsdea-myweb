'use strict';
(() => {
  if(document.getElementById('maple-garden'))return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const key=new URLSearchParams(location.search).has('qa')?'data-quest-fun-test':'data-quest-fun';
  const layer=document.createElement('div');
  layer.id='maple-garden';layer.setAttribute('aria-hidden','true');layer.inert=true;
  const colors=['#d69a56','#bd704b','#d6ba73','#a9b87a','#ce895b'];
  // Fixed particles and negative delays keep the autumn scene steady from the first frame.
  for(let i=0;i<20;i++){
    const leaf=document.createElement('span');leaf.className='maple-fall';
    leaf.style.cssText=`--left:${[2,96,7,91,14,85,4,98,10,94,20,78,30,65,45,57,1,88,17,82][i]}%;--size:${20+i%5*5}px;--duration:${32+i%7*4}s;--delay:-${i*7.3+9}s;--drift:${i%2?'-':''}${24+i%4*14}px;--sway:${7+i%4}s;--turn:${i*43}deg;--leaf-color:${colors[i%colors.length]};--alpha:${.22+i%4*.055}`;
    leaf.innerHTML='<span class="maple-sway"><svg viewBox="0 0 80 90" focusable="false"><path d="M40 3 48 22 56 17 54 36 65 27 66 38 78 36 66 52 71 58 47 63 44 67 43 83 38 85 39 66 34 63 10 58 15 52 3 36 15 38 16 27 27 36 25 17 33 22Z" fill="currentColor"/><path d="M41 74 40 24M40 57 21 45M41 56 60 45M40 44 32 31M41 44 49 31" fill="none" stroke="#49351f" stroke-opacity=".32" stroke-width="1.3" stroke-linecap="round"/></svg></span>';
    layer.append(leaf);
  }
  document.body.prepend(layer);
  function sync(){let enabled=true;try{enabled=JSON.parse(localStorage.getItem(key))?.effects!==false;}catch{}
    layer.hidden=!enabled||reduced.matches||document.body.classList.contains('quiet-effects');
    layer.classList.toggle('maple-paused',document.hidden);
  }
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);window.addEventListener('storage',sync);reduced.addEventListener('change',sync);sync();
})();
