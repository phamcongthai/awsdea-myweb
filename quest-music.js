'use strict';
(() => {
  // Recordings and credits are bundled with the site; keep audio outside #app.
  const tracks=[
    ['fur-elise','Für Elise','Beethoven','V Gao (Gaodifan)','FurElise.ogg','CC0 / Public domain','https://creativecommons.org/publicdomain/zero/1.0/'],
    ['moonlight','Moonlight Sonata · Chương I','Beethoven','Juan Felipe Arjona','Moonlight.ogg','CC BY 2.5','https://creativecommons.org/licenses/by/2.5/'],
    ['clair-de-lune','Clair de lune','Debussy','Laurens Goedhart','Clair de lune (Claude Debussy) Suite bergamasque.ogg','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/'],
    ['nocturne','Nocturne Op. 9 No. 2','Chopin','Martha Goldstein','Frederic Chopin - Nocturne Eb major Opus 9, number 2.ogg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/'],
    ['canon','Canon in D · Piano','Pachelbel','Lee Galloway',"Pachelbel's Canon.ogg",'CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/']
  ];
  const qa=new URLSearchParams(location.search).has('qa'),key=qa?'data-quest-music-test':'data-quest-music';
  let volume=.65,enabled=true,index=0,blocked=false,failed=false,request=0;
  try{const s=JSON.parse(localStorage.getItem(key));if(Number.isFinite(s?.volume))volume=Math.max(0,Math.min(1,s.volume));if(s?.version===3&&Number.isInteger(s.index)&&tracks[s.index])index=s.index;}catch(_){}
  const dock=document.createElement('aside');dock.id='quest-music';dock.setAttribute('aria-label','Nhạc cổ điển');
  dock.innerHTML=`<div class="music-buttons"><button type="button" class="music-power" aria-pressed="true">🔇 Tắt nhạc</button><button type="button" class="music-toggle" aria-expanded="false" aria-controls="music-panel">♫ Nhạc cổ điển</button></div>
  <section id="music-panel" hidden aria-label="Danh sách nhạc cổ điển"><strong>🎹 Góc nhạc cổ điển</strong><p class="music-current"></p><div class="music-transport"><button type="button" data-music="prev" aria-label="Bài trước">⏮</button><span>5 bản · Lặp danh sách</span><button type="button" data-music="next" aria-label="Bài tiếp theo">⏭</button></div><label for="music-track">Chọn bản nhạc</label><select id="music-track">${tracks.map((t,i)=>`<option value="${i}">${i+1}. ${t[1]} — ${t[2]}</option>`).join('')}</select><label>Âm lượng <input class="music-volume" type="range" min="0" max="100" value="${Math.round(volume*100)}"><output>${Math.round(volume*100)}%</output></label><p class="music-status" role="status"></p><p class="music-hint">Tự chuyển bài khi nghe hết. Chuyển câu và thu gọn vẫn tiếp tục phát.</p><details><summary>Nghệ sĩ & nguồn bản thu</summary><p class="music-credit"></p><small>Bản MP3 từ Wikimedia Commons; giữ nguyên bản thu, không cắt ghép.</small></details></section>`;
  document.body.append(dock);
  const audio=document.createElement('audio');audio.preload='metadata';audio.volume=volume;dock.append(audio);
  const power=dock.querySelector('.music-power'),toggle=dock.querySelector('.music-toggle'),panel=dock.querySelector('#music-panel'),status=dock.querySelector('.music-status'),select=dock.querySelector('select');
  function save(){try{localStorage.setItem(key,JSON.stringify({version:3,volume,index}));}catch(_){} }
  function show(){power.textContent=enabled?'🔇 Tắt nhạc':'▶ Bật nhạc';power.setAttribute('aria-pressed',String(enabled));status.textContent=!enabled?'Đã tắt nhạc.':failed?'Không tải được bản nhạc. Nhấn bài tiếp theo hoặc tắt rồi bật để thử lại.':blocked?'Chạm vào trang để bắt đầu nghe.':audio.paused?'Đang tải bản nhạc…':'Đang phát · '+tracks[index][1];}
  async function play(){
    if(!enabled||failed)return;const token=++request;
    try{await audio.play();if(token!==request)return;blocked=false;if(!enabled)audio.pause();show();}
    catch(e){if(token!==request)return;if(e.name==='NotAllowedError')blocked=true;else if(e.name!=='AbortError')failed=true;show();}
  }
  function choose(n){
    request++;audio.pause();index=(n+tracks.length)%tracks.length;failed=false;blocked=false;
    const t=tracks[index];select.value=String(index);dock.querySelector('.music-current').textContent=t[1]+' — '+t[2];
    const credit=dock.querySelector('.music-credit');credit.replaceChildren(document.createTextNode('Biểu diễn: '+t[3]+'. '));
    for(const [text,href] of [['Nguồn bản thu','https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(t[4])],[t[5],t[6]]]){const a=document.createElement('a');a.textContent=text;a.href=href;a.target='_blank';a.rel='noopener noreferrer';credit.append(a,document.createTextNode(' · '));}
    const localRoot=location.protocol==='file:'&&!/\/public\//i.test(location.pathname)?'public/':'';
    audio.src=localRoot+'music/'+t[0]+'.mp3';save();show();if(enabled)play();
  }
  power.addEventListener('click',()=>{enabled=!enabled;request++;if(enabled){if(failed){failed=false;audio.load();}play();}else audio.pause();show();});
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
  dock.querySelector('[data-music=prev]').addEventListener('click',()=>choose(index-1));dock.querySelector('[data-music=next]').addEventListener('click',()=>choose(index+1));select.addEventListener('change',()=>choose(Number(select.value)));
  dock.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  dock.querySelector('.music-volume').addEventListener('input',e=>{volume=Number(e.target.value)/100;audio.volume=volume;dock.querySelector('output').textContent=e.target.value+'%';save();});
  audio.addEventListener('ended',()=>{if(enabled)choose(index+1);});audio.addEventListener('playing',()=>{if(!enabled)audio.pause();else{blocked=false;show();}});audio.addEventListener('pause',show);
  audio.addEventListener('error',()=>{failed=true;show();});
  function gesture(e){if(e.target.closest?.('.music-power, [data-music], #music-track'))return;if(enabled&&audio.paused&&!failed)play();}
  document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
  window.addEventListener('pagehide',()=>{request++;audio.pause();});window.addEventListener('pageshow',()=>{if(enabled)play();});
  if(qa)window.QuestMusic={get state(){return {enabled,volume,index,paused:audio.paused,blocked,failed,count:tracks.length};}};
  choose(index);
})();
