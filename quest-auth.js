'use strict';
(() => {
 if(document.getElementById('quest-account'))return;
 const qa=new URLSearchParams(location.search).has('qa');
 const client=window.QuestCloud.client;
 let user=null,mode='login',busy=false,storageOK=true;
 try{const k='dq-auth-storage-check';localStorage.setItem(k,'1');localStorage.removeItem(k);}catch{storageOK=false;}
 const button=document.createElement('button');button.id='quest-account';button.type='button';button.setAttribute('aria-haspopup','dialog');button.textContent='♙ Đăng nhập';
 const dialog=document.createElement('dialog');dialog.id='quest-auth-dialog';dialog.setAttribute('aria-labelledby','quest-auth-title');
 document.body.append(button,dialog);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(text,error=false){const el=dialog.querySelector('[data-auth-status]');if(el){el.textContent=text;el.classList.toggle('auth-error',error);}}
 function errorText(e){const code=e?.code||'',message=e?.message||'';
  if(code==='invalid_credentials'||/invalid login/i.test(message))return 'Email hoặc mật khẩu chưa đúng.';
  if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return 'Bạn cần xác nhận email trước. Hãy mở thư Supabase gửi đến hộp thư hoặc mục Spam.';
  if(/rate|too many|over_email_send/i.test(code+' '+message))return 'Bạn thao tác quá nhanh hoặc đã chạm giới hạn gửi email. Vui lòng thử lại sau.';
  if(/weak_password|password.*least/i.test(code+' '+message))return 'Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự, kết hợp chữ và số.';
  if(/user_already_exists|already registered/i.test(code+' '+message))return 'Email này đã có tài khoản. Hãy chuyển sang Đăng nhập.';
  if(/signup_disabled|email_provider_disabled/i.test(code))return 'Project Supabase chưa bật đăng ký bằng email. Cần bật Email trong Authentication.';
  if(/fetch|network|timeout|Failed to fetch/i.test(message))return 'Chưa kết nối được máy chủ. Kiểm tra mạng rồi thử lại; tiến độ học vẫn được giữ.';
  return 'Không hoàn tất được. '+(message||'Vui lòng thử lại.');
 }
 function paint(){
  dialog.dataset.user=user?.id||'';
  dialog.innerHTML=`<div class="auth-heading"><span class="auth-symbol">⌘</span><button type="button" class="btn quiet small" data-auth="close" aria-label="Đóng tài khoản">✕</button></div><span class="eyebrow">DATA QUEST · TÀI KHOẢN</span><h2 id="quest-auth-title">${user?'Chào bạn, nhà thám hiểm!':mode==='register'?'Tạo tài khoản của bạn':'Chào mừng bạn trở lại'}</h2>${user?`<p class="auth-email">${escape(user.email||'Tài khoản đã đăng nhập')}</p><p class="auth-session">✓ Phiên được lưu trên trình duyệt này.</p><button class="btn auth-primary" data-auth="profile">🏆 Hồ sơ, avatar & xếp hạng</button><button class="btn auth-primary" data-auth="logout">Đăng xuất trên thiết bị này</button>`:`<div class="auth-tabs" role="group" aria-label="Chọn đăng nhập hoặc đăng ký"><button type="button" data-auth="login" aria-pressed="${mode==='login'}">Đăng nhập</button><button type="button" data-auth="register" aria-pressed="${mode==='register'}">Đăng ký</button></div><form id="quest-auth-form"><label for="quest-auth-email">Email</label><input id="quest-auth-email" name="email" type="email" autocomplete="email" placeholder="ban@example.com" maxlength="254" required><label for="quest-auth-password">Mật khẩu</label><div class="auth-password"><input id="quest-auth-password" name="password" type="password" autocomplete="${mode==='register'?'new-password':'current-password'}" ${mode==='register'?'minlength="8"':''} maxlength="128" required><button type="button" data-auth="show" aria-label="Hiện mật khẩu" aria-pressed="false">Hiện</button></div>${mode==='register'?'<small>Ít nhất 8 ký tự. Nên kết hợp chữ và số.</small><label for="quest-auth-repeat">Nhập lại mật khẩu</label><input id="quest-auth-repeat" name="repeat" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>':''}<p class="auth-session">✓ Tự giữ đăng nhập khi tải lại hoặc mở lại trình duyệt.</p><button class="btn auth-primary" type="submit">${mode==='register'?'Tạo tài khoản →':'Đăng nhập →'}</button></form>`}<p data-auth-status role="status" aria-live="polite"></p><p class="auth-footnote">Tiến độ học, câu sai, ghi chú và lịch sử được lưu trên DB theo tài khoản. Chờ trạng thái “Đã lưu trên DB” trước khi đóng trang.</p>`;
  if(!storageOK)status('Trình duyệt đang chặn lưu trữ, nên không thể giữ phiên sau khi đóng trang.',true);
 }
 function update(){button.textContent=user?'♙ Tài khoản':'♙ Đăng nhập';button.title=user?.email||'Đăng nhập hoặc đăng ký';button.classList.toggle('signed-in',!!user);if(dialog.open&&!busy&&(dialog.dataset.user||'')!==(user?.id||''))paint();}
 function show(){paint();dialog.showModal();}
 function setBusy(value){busy=value;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=value);dialog.setAttribute('aria-busy',String(value));}
 button.addEventListener('click',show);
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{const p=dialog.querySelector('[name=password]'),r=dialog.querySelector('[name=repeat]');if(p)p.value='';if(r)r.value='';});
 dialog.addEventListener('click',async e=>{
  const el=e.target.closest('[data-auth]');if(!el||busy)return;
  const action=el.dataset.auth;
  if(action==='close'){dialog.close();return;}if(action==='profile'){dialog.close();window.QuestSocial.show();return;}
  if(action==='show'){const input=dialog.querySelector('[name=password]'),show=input.type==='password';input.type=show?'text':'password';el.textContent=show?'Ẩn':'Hiện';el.setAttribute('aria-pressed',String(show));el.setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');return;}
  if(action==='login'||action==='register'){const email=dialog.querySelector('[name=email]')?.value;mode=action;paint();dialog.querySelector('[name=email]').value=email||'';return;}
  if(action==='logout'){setBusy(true);try{await window.QuestCloud.flush();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;user=null;mode='login';setBusy(false);update();status('Đã đăng xuất. Tiến độ đã lưu trên DB.');}catch(err){setBusy(false);status(errorText(err),true);}}
 });
 dialog.addEventListener('submit',async e=>{
  if(e.target.id!=='quest-auth-form')return;e.preventDefault();if(busy)return;
  const values=new FormData(e.target),email=String(values.get('email')).trim(),password=String(values.get('password'));
  if(mode==='register'&&password!==values.get('repeat')){status('Hai mật khẩu chưa trùng nhau.',true);dialog.querySelector('[name=repeat]').focus();return;}
  setBusy(true);status(mode==='register'?'Đang tạo tài khoản…':'Đang đăng nhập…');
  try{
   const result=mode==='register'?await client.auth.signUp({email,password,options:location.protocol==='file:'?{}:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   user=result.data.session?.user||null;
   if(!user&&mode==='register'){setBusy(false);mode='login';paint();dialog.querySelector('[name=email]').value=email;status('Đã gửi yêu cầu đăng ký. Nếu email chưa có tài khoản, hãy mở thư xác nhận (kiểm tra cả Spam), sau đó đăng nhập.');}
   else{setBusy(false);update();status('Đăng nhập thành công! Phiên sẽ được tự động giữ lại.');}
  }catch(err){setBusy(false);status(errorText(err),true);}
 });
 // Keep callbacks synchronous: Supabase owns token refresh and cross-tab sessions.
 client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;update();});
 client.auth.getSession().then(({data,error})=>{if(error){button.title='Chưa khôi phục được phiên. Bấm để đăng nhập lại.';return;}user=data.session?.user||null;update();}).catch(()=>{button.title='Chưa kết nối được tài khoản.';});
 window.QuestAuth={client,get user(){return user;},show};
})();
