'use strict';
(() => {
  // Original ambient score. Outside #app so question renders preserve playback.
  const qa=new URLSearchParams(location.search).has('qa'),key=qa?'data-quest-music-test':'data-quest-music';
  let volume=.65,enabled=true,ctx,master,timer,next=0,step=0;
  const voices=new Set();
  try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===2&&Number.isFinite(s.volume))volume=Math.max(0,Math.min(1,s.volume));}catch(_){}
  const dock=document.createElement('aside');dock.id='quest-music';dock.setAttribute('aria-label','Nhạc nền Dark Fantasy');
  dock.innerHTML=`<div class="music-buttons"><button type="button" class="music-power" aria-pressed="true">🔇 Tắt nhạc</button><button type="button" class="music-toggle" aria-expanded="false" aria-controls="music-panel">♫ Dark Fantasy</button></div><section id="music-panel" hidden aria-label="Cài đặt nhạc nền"><strong>🌙 Khu rừng cổ tích</strong><p>Dark fantasy ambient · giai điệu nguyên bản</p><p class="music-hint">Hợp âm trầm, chuông ngân và giai điệu chậm. Phát lặp khi học, kể cả ôn đầu ngày.</p><label>Âm lượng <input class="music-volume" type="range" min="0" max="100" value="${Math.round(volume*100)}"><output>${Math.round(volume*100)}%</output></label><p class="music-status" role="status"></p></section>`;
  document.body.append(dock);
  const power=dock.querySelector('.music-power'),toggle=dock.querySelector('.music-toggle'),panel=dock.querySelector('#music-panel'),status=dock.querySelector('.music-status');
  function show(){power.textContent=enabled?'🔇 Tắt nhạc':'▶ Bật nhạc';power.setAttribute('aria-pressed',String(enabled));status.textContent=!enabled?'Đã tắt nhạc.':ctx?.state==='running'?'Đang phát · Khu rừng cổ tích':'Nhạc sẽ bắt đầu khi bạn chạm vào trang.';}
  function note(midi,time,duration,level,type='sine'){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=440*Math.pow(2,(midi-69)/12);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+.12);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(master);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+duration+.03);
  }
  const chords=[[38,50,53,57],[34,46,50,53],[31,43,46,50],[33,45,48,52]];
  const melody=[74,null,77,76,69,null,72,70,67,null,70,74,69,null,72,73,74,null,81,77,74,72,70,null,67,69,70,74,76,73,69,null];
  function schedule(){
    if(!enabled||ctx.state!=='running')return;
    if(next<ctx.currentTime)next=ctx.currentTime+.06;
    while(next<ctx.currentTime+.25){const chord=chords[Math.floor(step/4)%4];
      if(step%4===0){note(chord[0],next,4.8,.17);for(const p of chord.slice(1))note(p,next,4.7,.065,'triangle');}
      const p=melody[step];if(p!==null){note(p,next,2.8,.13);note(p+12,next,1.6,.025);}
      step=(step+1)%32;next+=60/64;
    }
  }
  async function start(){
    if(!enabled)return;
    try{
      if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=volume*.7;
        const compressor=ctx.createDynamicsCompressor();master.connect(compressor);compressor.connect(ctx.destination);
        ctx.onstatechange=()=>{show();if(ctx.state==='running'&&enabled)schedule();};
      }
      await ctx.resume();if(!enabled){ctx.suspend().catch(()=>{});return;}
      if(!timer)timer=setInterval(schedule,100);schedule();show();
    }catch(_){status.textContent='Không phát được nhạc. Thử tắt rồi bật nhạc lại.';}
  }
  function stop(){clearInterval(timer);timer=null;for(const osc of voices){try{osc.stop();}catch(_){}}voices.clear();next=0;if(ctx?.state==='running')ctx.suspend().catch(()=>{});show();}
  power.addEventListener('click',()=>{enabled=!enabled;if(enabled)start();else stop();show();});
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
  dock.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  dock.querySelector('.music-volume').addEventListener('input',e=>{volume=Number(e.target.value)/100;if(master)master.gain.setTargetAtTime(volume*.7,ctx.currentTime,.1);dock.querySelector('output').textContent=e.target.value+'%';try{localStorage.setItem(key,JSON.stringify({version:2,volume}));}catch(_){} });
  function gesture(e){if(e.target.closest?.('.music-power'))return;if(enabled&&ctx?.state!=='running')start();}
  document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&enabled)start();});
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',()=>{if(enabled)start();});
  if(qa)window.QuestMusic={get state(){return {enabled,volume,contextState:ctx?.state,voices:voices.size,step};}};
  show();start();
})();
