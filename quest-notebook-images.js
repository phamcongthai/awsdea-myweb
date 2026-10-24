'use strict';
(() => {
 const bucket='quest-notebook-images',maxImages=20;
 window.QuestNotebookImages={mount({dialog,input,getEntry,save,flush}){
  const tools=document.createElement('div');tools.className='notebook-image-tools';
  tools.innerHTML='<button type="button" class="btn quiet small" data-notebook-add-image>🖼 Thêm ảnh</button><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden><span>Dán ảnh bằng Ctrl+V / ⌘V khi đang viết, hoặc chọn ảnh trên điện thoại.</span>';
  const gallery=document.createElement('div');gallery.className='notebook-images';gallery.setAttribute('aria-label','Ảnh trong sổ tay');
  const message=document.createElement('p');message.className='notebook-image-message';message.setAttribute('role','status');
  input.before(tools);input.after(gallery,message);
  const picker=tools.querySelector('input'),add=tools.querySelector('button'),urls=new Map();let busy=false,renderId=0;
  const uid=()=>window.QuestAuth?.user?.id;
  const own=path=>typeof path==='string'&&path.startsWith(uid()+'/')&&/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(webp|png|jpg)$/.test(path);
  const store=()=>window.QuestCloud.client.storage.from(bucket);
  const images=()=>getEntry().images||[];
  function normalize(){const e=getEntry();e.images=Array.isArray(e.images)?e.images.filter(i=>i&&own(i.path)).slice(0,maxImages):[];e.imageTrash=Array.isArray(e.imageTrash)?e.imageTrash.filter(own):[];}
  function lock(value){busy=value;add.disabled=value;picker.disabled=value;gallery.querySelectorAll('button').forEach(b=>b.disabled=value);}
  function error(e){const text=String(e?.message||e);message.textContent=/bucket|row.level|policy|not found|permission/i.test(text)?'Chưa bật kho ảnh. Hãy chạy supabase/notebook-images.sql trong Supabase SQL Editor rồi thử lại.':'Chưa lưu được ảnh: '+text;}
  async function signed(path){const old=urls.get(path);if(old&&old.until>Date.now())return old.url;const {data,error:e}=await store().createSignedUrl(path,3600);if(e)throw e;const url=new URL(data.signedUrl);if(url.protocol!=='https:')throw Error('Đường dẫn ảnh không hợp lệ.');urls.set(path,{url:url.href,until:Date.now()+3300000});return url.href;}
  async function render(){normalize();const id=++renderId;gallery.replaceChildren();for(const image of images()){
   const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),remove=document.createElement('button');
   img.alt=image.name||'Ảnh ghi chú';img.loading='lazy';caption.textContent=image.name||'Ảnh ghi chú';remove.type='button';remove.className='btn quiet small';remove.textContent='Xóa ảnh';remove.setAttribute('aria-label','Xóa '+img.alt);remove.disabled=busy;
   remove.onclick=()=>removeImage(image.path);figure.append(img,caption,remove);gallery.append(figure);
   signed(image.path).then(url=>{if(id===renderId&&img.isConnected)img.src=url;}).catch(e=>{if(id===renderId){img.alt='Chưa tải được ảnh. Mở lại sổ để thử lại.';error(e);}});
  }}
  async function cleanup(){const paths=(getEntry().imageTrash||[]).filter(own);if(!paths.length)return;const {error:e}=await store().remove(paths);if(e)throw e;getEntry().imageTrash=getEntry().imageTrash.filter(p=>!paths.includes(p));save();await flush();}
  async function removeImage(path){if(busy||window.QuestCloud.blocked)return;lock(true);try{const e=getEntry();e.images=images().filter(i=>i.path!==path);e.imageTrash=[...new Set([...(e.imageTrash||[]),path])];save();await render();if(!await flush())throw Error('Đang chờ đồng bộ DB; ảnh vẫn an toàn trong kho.');await cleanup();urls.delete(path);message.textContent='Đã xóa ảnh khỏi sổ tay.';}catch(e){error(e);}finally{lock(false);}}
  async function compress(file){
   if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Chọn ảnh PNG, JPG hoặc WebP.');
   if(file.size>20*1024*1024)throw Error('Ảnh đầu vào tối đa 20 MB.');
   const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.86));if(!blob||blob.size>2097152)throw Error('Ảnh sau tối ưu vẫn quá 2 MB. Hãy cắt nhỏ ảnh rồi dán lại.');return blob;}finally{bitmap.close();}
  }
  async function upload(files){if(busy||!files.length||window.QuestCloud.blocked)return;if(!uid()){message.textContent='Đăng nhập để lưu ảnh theo tài khoản.';return;}lock(true);try{
   for(const file of files){if(images().length>=maxImages)throw Error('Sổ tay tối đa '+maxImages+' ảnh. Xóa bớt ảnh để thêm ảnh mới.');message.textContent='Đang tối ưu và tải ảnh lên…';const owner=uid(),blob=await compress(file);if(uid()!==owner)return;const ext=blob.type==='image/webp'?'webp':'png',path=owner+'/'+crypto.randomUUID()+'.'+ext;
    const {error:e}=await store().upload(path,blob,{contentType:blob.type,upsert:false});if(e)throw e;if(uid()!==owner)return;
    getEntry().images=[...images(),{path,name:(file.name||'Ảnh đã dán').slice(0,100)}];save();await render();if(!await flush())throw Error('Ảnh đã tải lên, đang chờ lưu ghi chú vào DB. Giữ trang mở để thử lại.');
   }message.textContent='✓ Đã lưu ảnh theo tài khoản. Bạn có thể xem trên thiết bị khác.';
  }catch(e){error(e);}finally{picker.value='';lock(false);}}
  add.onclick=()=>picker.click();picker.onchange=()=>upload([...picker.files]);
  dialog.addEventListener('paste',e=>{if(e.target!==input)return;const files=[...(e.clipboardData?.items||[])].filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();upload(files);}});
  return {open(){message.textContent='';render();if(!busy&&(getEntry().imageTrash||[]).length)cleanup().catch(error);}};
 }};
})();
