'use strict';
(() => {
  // Keep the player outside #app so question renders never restart the music.
  const key=new URLSearchParams(location.search).has('qa')?'data-quest-music-test':'data-quest-music';
  let volume=.25;
  try {const saved=JSON.parse(localStorage.getItem(key));if(Number.isFinite(saved?.volume))volume=Math.max(0,Math.min(1,saved.volume));}catch(_){}
  const dock=document.createElement('aside');
  dock.id='quest-music';dock.setAttribute('aria-label','Nhạc nền học tập');
  dock.innerHTML=`<button type="button" class="music-toggle" aria-expanded="false" aria-controls="music-panel">🎵 Nhạc Minecraft</button>
    <section id="music-panel" hidden aria-label="Trình phát nhạc">
      <div class="music-heading"><strong>🌱 Một chút bình yên</strong><button type="button" class="music-stop">Tắt nhạc</button></div>
      <p>Minecraft · Volume Alpha — C418</p>
      <div class="music-online"></div>
      <p class="music-hint">Nhấn ▶ trong trình phát để nghe. Thu gọn vẫn tiếp tục phát; chuyển câu không ngắt nhạc. Âm lượng nhạc online chỉnh bằng âm lượng thiết bị.</p>
      <a href="https://c418.bandcamp.com/album/minecraft-volume-alpha" target="_blank" rel="noopener noreferrer">Mở album chính thức ↗</a>
      <details class="music-local"><summary>Nghe file nhạc trên máy · có lặp lại</summary>
        <label>Chọn file MP3, M4A, OGG…<input type="file" accept="audio/*" class="music-file"></label>
        <audio controls loop preload="none" aria-label="Nhạc từ máy của bạn"></audio>
        <label>Âm lượng file nhạc <input class="music-volume" type="range" min="0" max="100" value="${Math.round(volume*100)}"><output>${Math.round(volume*100)}%</output></label>
        <small>File chỉ phát trên thiết bị, không được tải lên. Cần chọn lại file khi tải lại trang.</small>
      </details>
      <p class="music-status" role="status"></p>
    </section>`;
  document.body.append(dock);
  const toggle=dock.querySelector('.music-toggle'),panel=dock.querySelector('#music-panel'),host=dock.querySelector('.music-online'),audio=dock.querySelector('audio'),status=dock.querySelector('.music-status');
  let fileURL=null;
  audio.volume=volume;
  function online(){
    if(host.firstChild||fileURL)return;
    const frame=document.createElement('iframe');
    frame.title='Minecraft Volume Alpha — C418, trình phát Bandcamp';
    frame.src='https://bandcamp.com/EmbeddedPlayer/album=1349219244/size=large/bgcol=18251d/linkcol=c9ee76/artwork=small/tracklist=false/transparent=true/';
    frame.allow='autoplay';frame.referrerPolicy='strict-origin-when-cross-origin';host.append(frame);
  }
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)online();});
  dock.querySelector('.music-stop').addEventListener('click',()=>{host.replaceChildren();audio.pause();panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();});
  dock.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  dock.querySelector('.music-file').addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    audio.pause();host.replaceChildren();if(fileURL)URL.revokeObjectURL(fileURL);
    fileURL=URL.createObjectURL(file);audio.src=fileURL;status.textContent='Đã chọn: '+file.name+'. Nhấn ▶ để nghe.';
  });
  audio.addEventListener('error',()=>{status.textContent='Không đọc được file nhạc này. Hãy thử file MP3 hoặc M4A khác.';});
  dock.querySelector('.music-volume').addEventListener('input',e=>{
    volume=Number(e.target.value)/100;audio.volume=volume;dock.querySelector('output').textContent=e.target.value+'%';
    try{localStorage.setItem(key,JSON.stringify({volume}));}catch(_){}
  });
})();
