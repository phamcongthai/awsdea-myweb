'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const qa = new URLSearchParams(location.search).has('qa');
  const key = qa ? 'data-quest-fun-test' : 'data-quest-fun';
  let prefs = {effects:true,sound:false};
  try {const saved=JSON.parse(localStorage.getItem(key));if(saved){prefs.effects=saved.effects!==false;prefs.sound=saved.sound===true;}} catch (_) {}
  let audio, burstTimer, lastCelebration=0;
  const icons=['🚀','🧪','🎒','🔎','🏰','🛡️','🛰️'];
  const wins=['Kiến thức đã vào kho. Stonks! 📈','Đúng bài luôn, chef! 🧑‍🍳','Não vừa được buff 🧠✨','Ấy, trình đang lên đó 😎','Câu này nằm trong lòng bàn tay 🤌'];
  const misses=['Plot twist thôi. Đọc lời giải rồi comeback 🐸','Não đang tải thêm dữ liệu… 🧠📥','Sai một câu, mở khóa một bài học 🔓','Không mất mạng. Chỉ thêm kinh nghiệm 🍄'];
  const greetings=['🐸 Ếch Data đã vào party. Đi nhặt kiến thức thôi!','Một câu nữa thôi. Phiên bản tương lai đang cảm ơn bạn 🫶','Học tới đâu, gom kiến thức tới đó. Không cần speedrun 🌱'];
  function streak(state) {
    const a=state.active;if(!a)return 0;
    const records=a.results.map(r=>r.correct);
    if(a.checked){const q=window.QUEST_BANK.questions.find(q=>q.id===a.ids[a.pos]);records.push(a.selected.length===q.correct.length&&a.selected.every(i=>q.correct.includes(i)));}
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
    document.querySelectorAll('[data-fun="sound"]').forEach(b=>{b.textContent=prefs.sound?'🔊 Âm thanh':'🔇 Âm thanh';b.setAttribute('aria-pressed',String(prefs.sound));});
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
  function tone(kind) {
    if(!prefs.sound)return;
    try {
      audio=audio||new (window.AudioContext||window.webkitAudioContext)();
      audio.resume().catch(()=>{});
      const notes=kind==='wrong'?[330,294]:kind==='finish'?[523,659,784,1047]:[523,659,784];
      notes.forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.085;osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.18);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.2);});
    }catch(_){}
  }
  function celebrate(kind) {
    const now=performance.now();
    if(now-lastCelebration<300 && kind!=='finish')return;
    lastCelebration=now;
    tone(kind);
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
    if(button.dataset.fun==='sound'){prefs.sound=!prefs.sound;if(prefs.sound)tone('right');}
    try{localStorage.setItem(key,JSON.stringify(prefs));}catch(_){}
    applyPrefs();
    if(!prefs.effects)document.getElementById('quest-confetti')?.replaceChildren();
  });
  reduced.addEventListener('change',()=>{applyPrefs();if(reduced.matches)document.getElementById('quest-confetti')?.replaceChildren();});
  window.QuestFun={decorate,celebrate};
})();
