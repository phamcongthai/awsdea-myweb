'use strict';
(() => {
  // Recordings and credits are bundled with the site; keep audio outside #app.
  const tracks=[
    ['fur-elise','Für Elise','Beethoven','V Gao (Gaodifan)','FurElise.ogg','CC0 / Public domain','https://creativecommons.org/publicdomain/zero/1.0/'],
    ['moonlight','Moonlight Sonata · Chương I','Beethoven','Juan Felipe Arjona','Moonlight.ogg','CC BY 2.5','https://creativecommons.org/licenses/by/2.5/'],
    ['clair-de-lune','Clair de lune','Debussy','Laurens Goedhart','Clair de lune (Claude Debussy) Suite bergamasque.ogg','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/'],
    ['nocturne','Nocturne Op. 9 No. 2','Chopin','Martha Goldstein','Frederic Chopin - Nocturne Eb major Opus 9, number 2.ogg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/'],
    ['canon','Canon in D · Piano','Pachelbel','Lee Galloway',"Pachelbel's Canon.ogg",'CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/'],
    ["swan-lake","Swan Lake · Hồ thiên nga · Kết màn II","Tchaikovsky","European Archive / Musopen","Tchaikovsky - Swan Lake Op.20 - Act II Concl.ogg","Public domain","https://creativecommons.org/publicdomain/mark/1.0/"],
    ["pathetique","Pathétique Sonata · Chương II","Beethoven","Jmfayard","Beethoven - Pathétique - 2e mouvement adagio cantabile.ogg","CC BY-SA 3.0","https://creativecommons.org/licenses/by-sa/3.0/"],
    ["symphony-5","Symphony No. 5 · Định mệnh · Chương I","Beethoven","Skidmore College Orchestra / Musopen","Ludwig van Beethoven - symphony no. 5 in c minor, op. 67 - i. allegro con brio.ogg","Public domain / Attribution","https://commons.wikimedia.org/wiki/File:Ludwig%20van%20Beethoven%20-%20symphony%20no.%205%20in%20c%20minor%2C%20op.%2067%20-%20i.%20allegro%20con%20brio.ogg"],
    ["nachtmusik","Eine kleine Nachtmusik · Chương I","Mozart","Advent Chamber Orchestra · Roxanna Pavel Goldstein / Al Goldstein, Pandora (ibiblio)","Mozart - Eine kleine Nachtmusik - 1. Allegro.ogg","CC BY-SA 2.0","https://creativecommons.org/licenses/by-sa/2.0/"],
    ["turkish-march","Turkish March · Rondo alla turca","Mozart","Romuald Greiss","Mozart-Marsz turecki-(Romuald Greiss).ogg","Public domain","https://creativecommons.org/publicdomain/mark/1.0/"],
    ["sonata-16","Piano Sonata No. 16, K. 545 · Chương I","Mozart","Musopen (https://musopen.org/)","Wolfgang Amadeus Mozart - sonata no. 16 in c major, k.545 'sonata facile' - i. allegro.ogg","Public domain / Attribution","https://commons.wikimedia.org/wiki/File:Wolfgang%20Amadeus%20Mozart%20-%20sonata%20no.%2016%20in%20c%20major%2C%20k.545%20'sonata%20facile'%20-%20i.%20allegro.ogg"]
  ];
  // Playlists published by An Coong Piano (@AnCoongPiano), checked 19/10/2026.
  // Stream through the official YouTube player; no recordings are copied or rehosted.
  const anCoong=[
    ['PLdt6smzQ3N1bIlioBf97z8DAqtmqNYAsB','Tuyển tập piano hay nhất',167],
    ['PLdt6smzQ3N1ZJCbJDetRrJwcY3hmRXkp_','Tuyển tập piano cover',66],
    ['PLdt6smzQ3N1Yb4ylsnknVaw4j9m42dxBS','Piano cover nước ngoài',24],
    ['PLdt6smzQ3N1bH8vSL2AdbNGeikboamtky','Nhạc phim OST',17],
    ['PLdt6smzQ3N1ZA6OF-7Cf7CaP_-9Te-DKq','Sơn Tùng Collection',8],
    ['PLdt6smzQ3N1a2CZLzOfGqDWLjI5fsEVmw','Christmas piano',6]
  ];
  const qa=new URLSearchParams(location.search).has('qa'),key=qa?'data-quest-music-test':'data-quest-music';
  let volume=.65,enabled=true,index=0,blocked=false,failed=false,request=0,source='classical',listIndex=0,youtubeIndex=0;
  let player=null,ytReady=false,ytState=-1,creating=false,apiPromise=null,ytTimeout=null;
  try{const s=JSON.parse(localStorage.getItem(key));if(Number.isFinite(s?.volume))volume=Math.max(0,Math.min(1,s.volume));if(s?.version===3){if(Number.isInteger(s.index)&&tracks[s.index])index=s.index;if(s.source==='ancoong')source='ancoong';if(Number.isInteger(s.listIndex)&&anCoong[s.listIndex])listIndex=s.listIndex;if(Number.isInteger(s.youtubeIndex)&&s.youtubeIndex>=0)youtubeIndex=s.youtubeIndex;}}catch(_){}
  const dock=document.createElement('aside');dock.id='quest-music';dock.setAttribute('aria-label','Góc nhạc học tập');
  dock.innerHTML=`<section id="music-an-player" hidden aria-label="Trình phát An Coong Piano"><div id="music-youtube-mount"><p>Đang kết nối YouTube…</p></div><a class="music-an-link" target="_blank" rel="noopener noreferrer">Mở playlist trên YouTube ↗</a></section><div class="music-buttons"><button type="button" class="music-power" aria-pressed="true">🔇 Tắt nhạc</button><button type="button" class="music-toggle" aria-expanded="false" aria-controls="music-panel">♫ Góc nhạc</button></div>
  <section id="music-panel" hidden aria-label="Danh sách nhạc"><strong>🎹 Góc nhạc học tập</strong><label for="music-source">Bạn muốn nghe gì?</label><select id="music-source"><option value="classical">Cổ điển · 11 bản</option><option value="ancoong">An Coong Piano · 6 playlist</option></select><p class="music-current"></p><div class="music-transport"><button type="button" data-music="prev" aria-label="Bài trước">⏮</button><span class="music-count"></span><button type="button" data-music="next" aria-label="Bài tiếp theo">⏭</button></div><div class="music-classical"><label for="music-track">Chọn bản nhạc</label><select id="music-track">${tracks.map((t,i)=>`<option value="${i}">${i+1}. ${t[1]} — ${t[2]}</option>`).join('')}</select></div><div class="music-an-options" hidden><label for="music-an-list">Chọn playlist An Coong</label><select id="music-an-list">${anCoong.map((t,i)=>`<option value="${i}">${t[1]} · ${t[2]} video*</option>`).join('')}</select><small>*Số lượng ghi nhận ngày 19/10/2026, có thể thay đổi. Các playlist có thể trùng bài. Chọn bài cụ thể trong danh sách của trình phát YouTube.</small></div><label>Âm lượng <input class="music-volume" type="range" min="0" max="100" value="${Math.round(volume*100)}"><output>${Math.round(volume*100)}%</output></label><p class="music-status" role="status"></p><p class="music-hint"></p><details><summary>Nghệ sĩ & nguồn bản thu</summary><p class="music-credit"></p><small class="music-license"></small></details></section>`;
  document.body.append(dock);
  const audio=document.createElement('audio');audio.preload='metadata';audio.volume=volume;dock.append(audio);
  const power=dock.querySelector('.music-power'),toggle=dock.querySelector('.music-toggle'),panel=dock.querySelector('#music-panel'),status=dock.querySelector('.music-status'),select=dock.querySelector('#music-track'),sourceSelect=dock.querySelector('#music-source'),listSelect=dock.querySelector('#music-an-list'),video=dock.querySelector('#music-an-player');
  function save(){try{localStorage.setItem(key,JSON.stringify({version:3,volume,index,source,listIndex,youtubeIndex}));}catch(_){} }
  const playlistUrl=()=>`https://www.youtube.com/playlist?list=${anCoong[listIndex][0]}`;
  function show(){
    const artist=source==='ancoong';video.hidden=!artist||!enabled;dock.classList.toggle('with-an-coong',artist&&enabled);
    power.textContent=enabled?'🔇 Tắt nhạc':'▶ Bật nhạc';power.setAttribute('aria-pressed',String(enabled));
    if(artist){status.textContent=!enabled?'Đã tắt nhạc.':failed?'Chưa phát được YouTube. Thử bài tiếp hoặc mở playlist qua liên kết bên dưới trình phát.':blocked?'Chạm nút phát trong khung YouTube để nghe.':ytState===1?'Đang phát · An Coong Piano':ytState===2?'YouTube đang tạm dừng. Chạm nút phát để tiếp tục.':'Đang kết nối playlist An Coong…';dock.querySelector('.music-count').textContent=`Bài ${youtubeIndex+1} · Lặp playlist`;}
    else status.textContent=!enabled?'Đã tắt nhạc.':failed?'Không tải được bản nhạc. Nhấn bài tiếp theo hoặc tắt rồi bật để thử lại.':blocked?'Chạm vào trang để bắt đầu nghe.':audio.paused?'Đang tải bản nhạc…':'Đang phát · '+tracks[index][1];
  }
  function credits(entries,prefix){const credit=dock.querySelector('.music-credit');credit.replaceChildren(document.createTextNode(prefix));for(const [text,href] of entries){const a=document.createElement('a');a.textContent=text;a.href=href;a.target='_blank';a.rel='noopener noreferrer';credit.append(a,document.createTextNode(' · '));}}
  function sourceUI(){
    const artist=source==='ancoong';sourceSelect.value=source;select.value=String(index);listSelect.value=String(listIndex);dock.querySelector('.music-classical').hidden=artist;dock.querySelector('.music-an-options').hidden=!artist;
    if(artist){dock.querySelector('.music-current').textContent='An Coong Piano · '+anCoong[listIndex][1];dock.querySelector('.music-an-link').href=playlistUrl();credits([['Kênh chính thức','https://www.youtube.com/@AnCoongPiano'],['Playlist',playlistUrl()]],'An Coong Piano. ');dock.querySelector('.music-license').textContent='Phát bằng trình phát YouTube chính thức. Bản thu thuộc chủ sở hữu; không lưu MP3 trên website.';dock.querySelector('.music-hint').textContent='Cần Internet. Thu gọn phần chọn nhạc vẫn giữ khung YouTube hiển thị để tiếp tục nghe. Nút tắt dừng cả âm thanh và khung phát.';}
    else{const t=tracks[index];dock.querySelector('.music-current').textContent=t[1]+' — '+t[2];dock.querySelector('.music-count').textContent=`${tracks.length} bản · Lặp danh sách`;credits([['Nguồn bản thu','https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(t[4])],[t[5],t[6]]],'Biểu diễn: '+t[3]+'. ');dock.querySelector('.music-license').textContent='Bản MP3 từ Wikimedia Commons; giữ nguyên bản thu, không cắt ghép.';dock.querySelector('.music-hint').textContent='Tự chuyển bài khi nghe hết. Chuyển câu và thu gọn vẫn tiếp tục phát.';}show();
  }
  function youtubeApi(){
    if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady,script=document.createElement('script'),timer=setTimeout(()=>{script.remove();reject(Error('YouTube timeout'));},15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);if(typeof previous==='function')previous();resolve();};script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('YouTube unavailable'));};document.head.append(script);}).catch(e=>{apiPromise=null;throw e;});return apiPromise;
  }
  function loadPlaylist(){if(!ytReady||source!=='ancoong')return;failed=false;blocked=false;ytState=-1;const options={listType:'playlist',list:anCoong[listIndex][0],index:youtubeIndex};player.setVolume(Math.round(volume*100));player.setLoop(true);if(enabled)player.loadPlaylist(options);else player.cuePlaylist(options);show();}
  async function ensureArtist(){
    if(player||creating)return;creating=true;
    try{await youtubeApi();if(source!=='ancoong')return;const mount=document.createElement('div');mount.id='music-youtube';dock.querySelector('#music-youtube-mount').replaceChildren(mount);
      player=new window.YT.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:200,playerVars:{playsinline:1,controls:1,autoplay:0,...(/^https?:$/.test(location.protocol)?{origin:location.origin}:{})},events:{
        onReady:()=>{clearTimeout(ytTimeout);ytReady=true;const iframe=player.getIframe();iframe.title='An Coong Piano · YouTube';iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');if(source==='ancoong')loadPlaylist();else player.pauseVideo();},
        onStateChange:e=>{ytState=e.data;if(e.data===1){if(!enabled||source!=='ancoong'){player.pauseVideo();return;}blocked=false;failed=false;}if(source==='ancoong'){const pos=player.getPlaylistIndex();if(Number.isInteger(pos)&&pos>=0){youtubeIndex=pos;save();}show();}},
        onAutoplayBlocked:()=>{if(source==='ancoong'){blocked=true;show();}},
        onError:()=>{if(source==='ancoong'){failed=true;show();}}
      }});
      ytTimeout=setTimeout(()=>{if(!ytReady&&source==='ancoong'){failed=true;show();}},15000);
    }catch(_){if(source==='ancoong'){failed=true;show();}}finally{creating=false;}
  }
  async function play(){
    if(!enabled||failed)return;if(source==='ancoong'){show();if(ytReady)player.playVideo();else await ensureArtist();return;}const token=++request;
    try{await audio.play();if(token!==request)return;blocked=false;if(!enabled||source!=='classical')audio.pause();show();}
    catch(e){if(token!==request)return;if(e.name==='NotAllowedError')blocked=true;else if(e.name!=='AbortError')failed=true;show();}
  }
  function choose(n){
    request++;audio.pause();index=(n+tracks.length)%tracks.length;failed=false;blocked=false;sourceUI();
    const localRoot=location.protocol==='file:'&&!/\/public\//i.test(location.pathname)?'public/':'';audio.src=localRoot+'music/'+tracks[index][0]+'.mp3';save();if(enabled)play();
  }
  function changeSource(value){if(!['classical','ancoong'].includes(value))return;request++;audio.pause();if(ytReady)player.pauseVideo();source=value;failed=false;blocked=false;sourceUI();save();if(source==='classical')choose(index);else if(ytReady)loadPlaylist();else ensureArtist();}
  function step(delta){if(source==='classical'){choose(index+delta);return;}if(!ytReady)return;const ids=player.getPlaylist();if(!ids?.length)return;youtubeIndex=(youtubeIndex+delta+ids.length)%ids.length;failed=false;blocked=false;if(enabled)player.playVideoAt(youtubeIndex);else player.cuePlaylist({listType:'playlist',list:anCoong[listIndex][0],index:youtubeIndex});save();show();}
  power.addEventListener('click',()=>{enabled=!enabled;request++;if(enabled){if(failed){failed=false;if(source==='classical')audio.load();else if(ytReady){loadPlaylist();return;}else if(player){player.destroy();player=null;ytReady=false;clearTimeout(ytTimeout);}}play();}else{audio.pause();if(ytReady)player.pauseVideo();}show();});
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
  sourceSelect.addEventListener('change',()=>changeSource(sourceSelect.value));
  listSelect.addEventListener('change',()=>{const n=Number(listSelect.value);if(!anCoong[n])return;listIndex=n;youtubeIndex=0;failed=false;blocked=false;sourceUI();save();if(ytReady)loadPlaylist();else ensureArtist();});
  dock.querySelector('[data-music=prev]').addEventListener('click',()=>step(-1));dock.querySelector('[data-music=next]').addEventListener('click',()=>step(1));select.addEventListener('change',()=>choose(Number(select.value)));
  dock.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  dock.querySelector('.music-volume').addEventListener('input',e=>{volume=Number(e.target.value)/100;audio.volume=volume;if(ytReady)player.setVolume(Math.round(volume*100));dock.querySelector('output').textContent=e.target.value+'%';save();});
  audio.addEventListener('ended',()=>{if(enabled&&source==='classical')choose(index+1);});audio.addEventListener('playing',()=>{if(!enabled||source!=='classical')audio.pause();else{blocked=false;show();}});audio.addEventListener('pause',show);audio.addEventListener('error',()=>{if(source==='classical'){failed=true;show();}});
  function gesture(e){if(e.target.closest?.('#quest-music'))return;if(enabled&&source==='classical'&&audio.paused&&!failed)play();}
  document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
  window.addEventListener('pagehide',()=>{request++;audio.pause();if(ytReady)player.pauseVideo();});window.addEventListener('pageshow',()=>{if(enabled)play();});
  if(qa)window.QuestMusic={get state(){return {enabled,volume,index,source,listIndex,youtubeIndex,ytReady,paused:source==='classical'?audio.paused:ytState!==1,blocked,failed,count:tracks.length,playlistCount:anCoong.length,youtubePlaylistLength:ytReady?player.getPlaylist()?.length||0:0};}};
  if(source==='classical')choose(index);else{sourceUI();ensureArtist();}
})();
