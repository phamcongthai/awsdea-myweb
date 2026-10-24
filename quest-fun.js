'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const qa = new URLSearchParams(location.search).has('qa');
  const key = qa ? 'data-quest-fun-test' : 'data-quest-fun';
  let prefs = {version:2,effects:true,sound:true};
  try {const saved=JSON.parse(window.QuestStorage.getItem(key));if(saved){prefs.effects=saved.effects!==false;prefs.sound=saved.version===2?saved.sound!==false:true;}} catch (_) {}
  let audio, burstTimer, lastCelebration=0;
  let soundRequest=0;
  const voices=new Set();
  const icons=['🚀','🧪','🎒','🔎','🏰','🛡️','🛰️'];
  const wins=['Kiến thức đã vào kho. Stonks! 📈','Đúng bài luôn, chef! 🧑‍🍳','Não vừa được buff 🧠✨','Ấy, trình đang lên đó 😎','Câu này nằm trong lòng bàn tay 🤌'];
  const misses=['Plot twist thôi. Đọc lời giải rồi comeback 🐸','Não đang tải thêm dữ liệu… 🧠📥','Sai một câu, mở khóa một bài học 🔓','Không mất mạng. Chỉ thêm kinh nghiệm 🍄'];
  const greetings=['🐸 Ếch Data đã vào party. Đi nhặt kiến thức thôi!','Một câu nữa thôi. Phiên bản tương lai đang cảm ơn bạn 🫶','Học tới đâu, gom kiến thức tới đó. Không cần speedrun 🌱'];
  function streak(state) {
    const a=state.active;if(!a)return 0;
    const records=a.results.map(r=>r.correct);
    if(a.checked){const q=[...window.QUEST_BANK.questions,...(window.QUEST_LOG?.extra||[])].find(q=>q.id===a.ids[a.pos]);if(q)records.push(a.selected.length===q.correct.length&&a.selected.every(i=>q.correct.includes(i)));}
    let n=0;for(let i=records.length-1;i>=0&&records[i];i--)n++;return n;
  }
  function line(state,finished) {
    if(finished)return finished.status==='complete'?'🏆 Nhiệm vụ hoàn tất. Bạn vừa thắng boss trì hoãn!':'Camp ở đây nhé. Hành trình vẫn còn chờ 🌿';
    const a=state.active;if(!a)return greetings[0];
    if(a.breakUntil)return '☕ Checkpoint! Uống miếng nước, sạc lại mana.';
    if(a.returnNotice)return '🫡 Party đủ người rồi. Ếch giữ chỗ cho bạn nãy giờ!';
    if(a.checked){const n=streak(state);return n>=3?`🔥 COMBO ×${n} · ${n>=5?'Não đang vào chế độ ultra instinct!':'Đang vào guồng rồi đó!'}`:n?wins[a.pos%wins.length]:misses[a.pos%misses.length];}
    return a.pos===a.ids.length-1?'🏁 Câu cuối rồi! Boss trì hoãn còn 1 HP.':greetings[a.pos%greetings.length];
  }
  function applyPrefs() {
    document.body.classList.toggle('quiet-effects',!prefs.effects||reduced.matches);
    document.querySelectorAll('[data-fun="effects"]').forEach(b=>{b.textContent=prefs.effects?'✨ Hiệu ứng':'🌿 Êm dịu';b.setAttribute('aria-pressed',String(prefs.effects));});
    document.querySelectorAll('[data-fun="sound"]').forEach(b=>{b.textContent=prefs.sound?'🔊 Âm báo: Bật':'🔇 Âm báo: Tắt';b.setAttribute('aria-pressed',String(prefs.sound));b.title=prefs.sound?'Tắt âm báo trả lời đúng / sai':'Bật âm báo trả lời đúng / sai';});
  }
  function decorate(state,finished) {
    const total=Object.keys(state.progress).length*10+state.history.filter(h=>h.status==='complete').length*50;
    const level=Math.floor(total/200)+1,combo=streak(state);
    const host=document.querySelector('.focus-meta')||document.querySelector('.finish-card')||document.querySelector('.topbar');
    if(!host)return;
    const hud=document.createElement('section');hud.className='game-hud';hud.setAttribute('aria-label','Bạn đồng hành và kinh nghiệm học tập');
    hud.innerHTML=`<button class="frog-pal" data-fun="pet" aria-label="Chạm Ếch Data để nhận lời động viên" title="Ếch Data · Chạm để high five"><span aria-hidden="true">🐸</span><i aria-hidden="true">✦</i></button><div class="pal-dialog"><div class="pal-name">ẾCH DATA <span>đồng đội của bạn</span></div><p class="pal-line" role="status"></p></div><div class="game-level"><div><strong>LV.${level}</strong><span>${total} XP</span></div><div class="xp-track" role="progressbar" aria-label="Kinh nghiệm tới cấp tiếp theo" aria-valuenow="${total%200}" aria-valuemin="0" aria-valuemax="200"><i style="width:${total%200/2}%"></i></div><small>+10 / câu mới · +50 / trọn phiên</small></div><div class="fun-controls"><button data-fun="effects" type="button"></button><button data-fun="sound" type="button"></button></div>`;
    hud.querySelector('.pal-line').textContent=line(state,finished);
    if(host.matches('.topbar'))host.after(hud);else host.before(hud);
    if(combo>=3){const badge=document.createElement('span');badge.className='combo-badge';badge.textContent=`🔥 COMBO ×${combo}`;document.querySelector('.focus-meta .row')?.append(badge);}
    document.querySelectorAll('.session-icon').forEach((el,i)=>{el.textContent=icons[i];el.classList.add('quest-emoji');});
    const hero=document.querySelector('.hero-art');
    if(hero){const sticker=document.createElement('span');sticker.className='meme-sticker';sticker.textContent='🧠 +10 INT mỗi ngày';hero.append(sticker);}
    const checkpoint=document.querySelector('.finish-card .finish-icon');if(checkpoint)checkpoint.textContent=finished?(finished.status==='complete'?'🏆':'🏕️'):'🧋';
    if(finished?.status==='complete'){
      const badge=document.createElement('div');badge.className='loot-badge';badge.textContent='🎁 +50 XP · Huy hiệu: Giữ lời với bản thân';document.querySelector('.finish-card h1')?.after(badge);
    }
    applyPrefs();
  }
  function stopSound() {
    soundRequest++;
    for(const osc of voices){try{osc.stop();}catch(_){} }
    voices.clear();
  }
  function primeSound(e) {
    if(!e.isTrusted||!prefs.sound)return;
    try{if(!audio||audio.state==='closed')audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(_){}
  }
  // Unlock during the real gesture, before cloud saves replay clicks asynchronously.
  document.addEventListener('pointerdown',primeSound,true);
  document.addEventListener('keydown',primeSound,true);
  async function tone(kind) {
    if(!prefs.sound)return;
    stopSound();
    const request=soundRequest;
    try {
      if(!audio||audio.state==='closed')audio=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state!=='running')await audio.resume();
      if(!prefs.sound||request!==soundRequest)return;
      // Bright rising chimes for success; a soft descending pair for a mistake.
      const notes=kind==='wrong'?[294,220]:kind==='finish'?[523,659,784,1047]:[659,988,1319];
      const step=kind==='wrong'?.15:.095,tail=kind==='wrong'?.26:.36;
      notes.forEach((freq,i)=>{
        const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+.015+i*step;
        osc.type=kind==='wrong'?'triangle':'sine';osc.frequency.setValueAtTime(freq,t);
        if(kind==='wrong')osc.frequency.exponentialRampToValueAtTime(freq*.9,t+tail);
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(kind==='wrong'?.055:.075,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+tail);
        osc.connect(gain);gain.connect(audio.destination);voices.add(osc);
        osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
        osc.start(t);osc.stop(t+tail+.02);
      });
    }catch(_){}
  }
  function celebrate(kind) {
    tone(kind);
    const now=performance.now();
    if(now-lastCelebration<300 && kind!=='finish')return;
    lastCelebration=now;
    if(!prefs.effects||reduced.matches)return;
    let layer=document.getElementById('quest-confetti');
    if(!layer){layer=document.createElement('div');layer.id='quest-confetti';layer.setAttribute('aria-hidden','true');document.body.append(layer);}
    layer.replaceChildren();clearTimeout(burstTimer);
    const count=kind==='finish'?42:kind==='wrong'?7:20;
    const symbols=kind==='wrong'?['🌱','🧩','💡']:kind==='finish'?['🎉','🏆','⭐','✨','🎊']:['⭐','✨','🍀','⚡'];
    for(let i=0;i<count;i++){
      const particle=document.createElement('span');particle.className='confetti-piece';particle.textContent=symbols[i%symbols.length];
      particle.style.cssText=`left:${5+Math.random()*90}%;--drift:${Math.round(Math.random()*180-90)}px;--spin:${Math.round(Math.random()*400-200)}deg;animation-delay:${Math.random()*.3}s;animation-duration:${1.2+Math.random()*.8}s;font-size:${14+Math.random()*13}px`;
      layer.append(particle);
    }
    const target=document.querySelector('.frog-pal');target?.classList.add('pal-cheer');
    const card=document.querySelector('.question-card');if(kind!=='wrong')card?.classList.add('quest-win');
    burstTimer=setTimeout(()=>{layer.replaceChildren();target?.classList.remove('pal-cheer');card?.classList.remove('quest-win');},2400);
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-fun]');if(!button)return;
    if(button.dataset.fun==='pet'){
      const lines=['High five! 🐸🤚 Giờ mình xử câu tiếp nào.','Ếch không biết đáp án. Nhưng ếch tin bạn tìm ra 🫡','Me: mở Facebook? · Ếch: thêm một câu đã 👀','Một ít kiến thức, một ít dopamine. Hợp lý 🤌'];
      document.querySelector('.pal-line').textContent=lines[Math.floor(Math.random()*lines.length)];celebrate('right');return;
    }
    if(button.dataset.fun==='effects')prefs.effects=!prefs.effects;
    if(button.dataset.fun==='sound'){prefs.sound=!prefs.sound;if(prefs.sound)tone('right');else stopSound();}
    try{window.QuestStorage.setItem(key,JSON.stringify(prefs));}catch(_){}
    applyPrefs();
    if(!prefs.effects)document.getElementById('quest-confetti')?.replaceChildren();
  });
  reduced.addEventListener('change',()=>{applyPrefs();if(reduced.matches)document.getElementById('quest-confetti')?.replaceChildren();});
  window.QuestFun={decorate,celebrate,playSound:tone,applyPrefs};
})();
