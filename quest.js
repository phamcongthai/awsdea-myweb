'use strict';
(() => {
  const BANK = window.QUEST_BANK;
  const QA = new URLSearchParams(location.search).has('qa');
  const KEY = QA ? 'aws-data-quest-test-v1' : 'aws-data-quest-v1';
  const TOPICS = [
    {id:'stream',name:'Đưa dữ liệu vào',icon:'↯',color:'#d0f179',bg:'#3b492b',desc:'Streaming, messaging và di chuyển dữ liệu.',groups:[['Di chuyển & kết nối',/\bdms\b|snowball|appflow|transfer acceleration|zero.etl/i],['Kafka & xử lý luồng',/flink|\bmsk\b|kafka|emr on eks/i],['Hàng đợi & sự kiện',/\bsqs\b|batch messages/i],['Kinesis & Firehose',/./]]},
    {id:'etl',name:'Xử lý & chất lượng',icon:'⌘',color:'#b5b5f5',bg:'#35354b',desc:'Glue, DataBrew, Spark và kiểm tra chất lượng.',groups:[['Chất lượng dữ liệu',/quality|dqdl|referentialintegrity|columnvalues|completeness|profile|findmatches/i],['Chuẩn bị & biến đổi',/databrew|recipe|pandas|knowledge base|mask/i],['Hiệu năng & xử lý lỗi',/shuffle|spark ui|groupfiles|auto.scal|worker|bookmark|flex job|compac/i],['Thiết kế ETL',/./]]},
    {id:'storage',name:'Lưu trữ & database',icon:'▤',color:'#f4c889',bg:'#4b3d2c',desc:'S3, vòng đời dữ liệu, DynamoDB và RDS.',groups:[['DynamoDB & caching',/dynamodb|\bttl\b|secondary index|dax|elasticache/i],['Vòng đời & lớp lưu trữ',/lifecycle|lifecycle|tiering|infrequent|glacier|s3 standard|s3 one zone/i],['Độ bền & bảo vệ dữ liệu',/checksum|backup|versioning|mfa|replication/i],['Thiết kế & hiệu năng lưu trữ',/./]]},
    {id:'lake',name:'Data lake & Athena',icon:'◈',color:'#86d3e0',bg:'#293f43',desc:'Catalog, phân vùng, định dạng và truy vấn S3.',groups:[['Catalog & phân vùng',/partition|crawler|prefix|glue data catalog/i],['Định dạng & tối ưu',/parquet|\borc\b|snappy|explain|larger table|compact/i],['Workgroup & kiểm soát chi phí',/workgroup|reuse/i],['Truy vấn & kết nối nguồn',/./]]},
    {id:'warehouse',name:'Redshift & analytics',icon:'▥',color:'#edb0cb',bg:'#4b3240',desc:'Nạp dữ liệu, SQL, hiệu năng và quyền truy cập.',groups:[['Nạp dữ liệu & tích hợp',/streaming ingestion|\bcopy\b|external schema|zero.etl|\bmsk\b|firehose/i],['Hiệu năng & thiết kế bảng',/distribution|distribution key|vacuum|concurrency|materialized|\bsuper\b/i],['Chia sẻ & quyền dữ liệu',/grant|role.based|security|masking|permissions|datashare|data sharing/i],['SQL & phân tích',/./]]},
    {id:'security',name:'Bảo mật & quản trị',icon:'◇',color:'#b9d7a4',bg:'#334532',desc:'IAM, mã hóa, dữ liệu nhạy cảm và governance.',groups:[['Quản trị & phân quyền dữ liệu',/lake formation|datazone|domain unit|sagemaker assets|data exchange|lf.tags/i],['Bảo vệ dữ liệu nhạy cảm',/pii|mask|redact|data protection/i],['Danh tính, khóa & bí mật',/secrets manager|\bkms\b|encrypt|customer.managed|iam role|iam polic/i],['Mạng & kiểm soát truy cập',/./]]},
    {id:'ops',name:'Điều phối & giám sát',icon:'◎',color:'#f2b599',bg:'#4c392d',desc:'Workflow, sự kiện, logging và xử lý sự cố.',groups:[['Workflow & điều phối',/step functions|map state|glue workflow|airflow/i],['Theo dõi & kiểm toán',/cloudtrail|audit|config|cloudwatch|opensearch/i],['Tự động hóa & sự kiện',/eventbridge|notification|sns|sam template/i],['Xử lý lỗi & vận hành',/./]]}
  ];
  const byId = new Map(BANK.questions.map(q => [q.id,q]));
  const $ = id => document.getElementById(id);
  const escape = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = html => new DOMParser().parseFromString(html,'text/html').body.textContent || '';
  const cleanCache = new Map();
  function clean(html) {
    if (cleanCache.has(html)) return cleanCache.get(html);
    const doc = new DOMParser().parseFromString(html,'text/html');
    const allowed = new Set('P BR STRONG B EM I U UL OL LI CODE PRE BLOCKQUOTE DIV SPAN A IMG TABLE THEAD TBODY TR TD TH H2 H3 H4 HR'.split(' '));
    [...doc.body.querySelectorAll('*')].forEach(el => {
      if (!allowed.has(el.tagName)) {el.remove();return;}
      [...el.attributes].forEach(a => {if (!['href','src','alt','colspan','rowspan'].includes(a.name)) el.removeAttribute(a.name);});
      if(el.tagName === 'A') {
        if(!/^https?:\/\//i.test(el.getAttribute('href') || '')) el.removeAttribute('href');
        el.target='_blank';el.rel='noopener noreferrer';
      }
      if(el.tagName === 'IMG') {
        if(!/^https?:\/\//i.test(el.getAttribute('src') || '')) el.removeAttribute('src');
        el.loading='lazy';el.alt=el.alt || 'Hình minh họa trong lời giải gốc (cần Internet)';
      }
    });
    const result=doc.body.innerHTML;cleanCache.set(html,result);return result;
  }
  BANK.questions.forEach(q => {
    const topic=TOPICS.find(t=>t.id===q.topic);
    const text=q.correct.map(i=>plain(q.answers[i])).join(' ');
    q.group=topic.groups.findIndex(g=>g[1].test(text));
  });
  function topicQuestions(id) {
    return BANK.questions.filter(q=>q.topic===id).sort((a,b)=>a.group-b.group || a.test-b.test || a.number-b.number);
  }
  function chunks(ids) {
    const parts=[];
    ids.forEach(id=>{
      const q=byId.get(id),last=parts[parts.length-1];
      if(!last || last.topic!==q.topic || last.group!==q.group || last.ids.length>=10) parts.push({topic:q.topic,group:q.group,ids:[id]});
      else last.ids.push(id);
    });
    return parts;
  }
  const fresh=()=>({version:1,progress:{},history:[],active:null});
  let state=fresh(), page='map', finished=null, breakTimer=null, storageOK=true;
  function validState(s) {
    if(!s || s.version!==1 || !s.progress || typeof s.progress!=='object' || Array.isArray(s.progress) || !Array.isArray(s.history)) return false;
    for(const [id,p] of Object.entries(s.progress)) {
      if(!byId.has(id) || !p || typeof p.correct!=='boolean' || typeof p.certain!=='boolean' || !Number.isFinite(p.at) || !Number.isInteger(p.seen) || p.seen<1 || !Number.isInteger(p.streak) || p.streak<0) return false;
    }
    if(s.history.some(h=>!h || typeof h.label!=='string' || !['complete','early'].includes(h.status) || !Number.isFinite(h.at) || !Number.isInteger(h.total) || h.total<1 || h.total>260 || !Number.isInteger(h.done) || h.done<0 || h.done>h.total || !Number.isInteger(h.correct) || h.correct<0 || h.correct>h.done || !Number.isInteger(h.interruptions) || h.interruptions<0)) return false;
    const a=s.active;
    if(a!=null) {
      if(!a || !Array.isArray(a.ids) || a.ids.length<1 || a.ids.length>260 || new Set(a.ids).size!==a.ids.length || a.ids.some(id=>!byId.has(id)) || !Number.isInteger(a.pos) || a.pos<0 || a.pos>=a.ids.length || typeof a.label!=='string' || !Array.isArray(a.results) || a.results.length!==a.pos || typeof a.checked!=='boolean' || typeof a.certain!=='boolean' || typeof a.reviewed!=='boolean' || !Number.isInteger(a.interruptions) || a.interruptions<0 || !Number.isFinite(a.started) || !Number.isFinite(a.breakUntil)) return false;
      if(a.results.some((r,i)=>!r || r.id!==a.ids[i] || typeof r.correct!=='boolean' || typeof r.certain!=='boolean')) return false;
      const q=byId.get(a.ids[a.pos]);
      if(!Array.isArray(a.order) || a.order.length!==q.answers.length || new Set(a.order).size!==q.answers.length || a.order.some(i=>!Number.isInteger(i)||i<0||i>=q.answers.length)) return false;
      if(!Array.isArray(a.selected) || new Set(a.selected).size!==a.selected.length || a.selected.some(i=>!Number.isInteger(i)||i<0||i>=q.answers.length) || a.selected.length>q.correct.length) return false;
      if(a.checked && a.selected.length!==q.correct.length) return false;
    }
    return true;
  }
  try {
    const stored=localStorage.getItem(KEY);
    if(stored) {const parsed=JSON.parse(stored);if(!validState(parsed)) throw Error('Dữ liệu lưu không hợp lệ');state=parsed;}
  } catch(e) {
    storageOK=false;
    $('storage-warning').hidden=false;
    $('storage-warning').textContent='Không đọc được tiến độ trên trình duyệt này. Bạn vẫn có thể học; hãy xuất bản sao tiến độ trước khi đóng trang.';
  }
  function save() {
    try {localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}
    catch(e) {storageOK=false;$('storage-warning').hidden=false;$('storage-warning').textContent='Trình duyệt không lưu được tiến độ. Hãy xuất bản sao tiến độ trước khi đóng trang.';}
  }
  function toast(message) {$('toast').textContent=message;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),4000);}
  function shuffle(items) {
    const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
  }
  function correct(q,selected) {return selected.length===q.correct.length && selected.every(i=>q.correct.includes(i));}
  function mastered(p) {return !!p && p.correct && p.certain && p.streak>=2;}
  function weakIds() {return BANK.questions.filter(q=>state.progress[q.id] && (!state.progress[q.id].correct || !state.progress[q.id].certain)).sort((a,b)=>TOPICS.findIndex(t=>t.id===a.topic)-TOPICS.findIndex(t=>t.id===b.topic) || a.group-b.group || state.progress[a.id].at-state.progress[b.id].at).map(q=>q.id);}
  const brand=()=>'<div class="brand"><span class="brand-mark">⌘</span><div>Data Quest<small>AWS · LEARNING ADVENTURE</small></div></div>';
  function go(next) {if(window.DailyGate && !window.DailyGate.allow())return;if(state.active) return;if(next==='lab'){location.href=(location.protocol==='file:'?'public/architect.html':'architect.html')+(QA?'?qa=1':'');return;}if(next==='exam'){location.href=(location.protocol==='file:'&&decodeURIComponent(location.pathname).endsWith('/AWS Data Quest.html')?'public/realtest.html':'realtest.html')+(QA?'?qa=1':'');return;}page=next;finished=null;render();window.scrollTo(0,0);}
  function metrics() {
    const progress=Object.values(state.progress);
    return {seen:progress.length,mastered:progress.filter(mastered).length,weak:weakIds().length,commitments:state.history.filter(h=>h.status==='complete').length};
  }
  function sidebar() {
    const m=metrics();
    return `<aside class="sidebar">${brand()}<div class="nav-label">HÀNH TRÌNH CỦA BẠN</div><nav>${[['map','◈','Bản đồ nhiệm vụ'],['review','↻','Ôn câu chưa chắc'],['theory','📚','Lý thuyết nhanh'],['lab','◈','Architect Quest · Lab'],['history','⚑','Nhật ký cam kết'],['exam','🎯','Phòng thi · 5 đề'],['originals','▤','Bốn đề gốc']].map(([id,icon,label])=>`<button class="nav-item ${page===id?'active':''}" data-action="page" data-page="${id}" ${page===id?'aria-current="page"':''}><span>${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="side-card"><div class="eyebrow">Từng phiên, từng bước</div><strong>${m.commitments}</strong> <small>cam kết đã giữ</small><p>Không cần đúng tất cả.<br>Hãy hoàn thành điều đã hứa.</p></div><span class="sidebar-note">Tiến độ lưu trên trình duyệt này.<br>Câu hỏi & lời giải giữ nguyên từ 4 đề.</span><div class="row wrap spaced"><button class="btn small quiet" data-action="export">↓ Sao lưu</button><button class="btn small quiet" data-action="import">↑ Khôi phục</button></div></div></aside>`;
  }
  function render() {
    renderScreen();
    window.QuestFun?.decorate(state,finished);
  }
  function renderScreen() {
    if(breakTimer){clearInterval(breakTimer);breakTimer=null;}
    if(state.active){renderFocus();return;}
    if(finished){renderFinish();return;}
    $('app').innerHTML=`<div class="shell">${sidebar()}<main class="main"><header class="topbar row between"><span class="breadcrumb">Không gian học tập <span class="muted">/</span> ${page==='map'?'Bản đồ nhiệm vụ':page==='review'?'Ôn tập':page==='history'?'Cam kết':page==='theory'?'Lý thuyết nhanh':'Đề gốc'}</span><div class="row"><span class="pill lime">● Tự học · Có cam kết</span><span class="avatar" aria-label="Người học">D</span></div></header>${page==='map'?mapView():page==='review'?reviewView():page==='history'?historyView():page==='theory'?window.QuestTheory.view():originalsView()}<footer class="footnote row between wrap"><span>260 câu gốc · 7 phiên theo chủ đề · Lưu tự động</span><div class="row"><button class="btn quiet small" data-action="export">↓ Xuất tiến độ</button><button class="btn quiet small" data-action="import">↑ Nhập tiến độ</button></div></footer></main></div>`;
  }
  function mapView() {
    const m=metrics(),recommended=TOPICS.find(t=>topicQuestions(t.id).some(q=>!state.progress[q.id])) || TOPICS[0];
    return `<section class="hero"><div><span class="eyebrow">YOUR NEXT LEVEL STARTS HERE</span><h1>Biến kiến thức rời rạc<br>thành một hành trình.</h1><p>7 vùng kiến thức. Mỗi phiên khoảng 40 câu.<br>Chọn nhiệm vụ, giữ cam kết, hiểu thêm một chút về AWS.</p><button class="btn primary" data-action="commit" data-topic="${recommended.id}">▶ ${m.seen?'Tiếp tục hành trình':'Bắt đầu hành trình'} <span>→</span></button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit second"></div><span class="spark">✧</span><div class="core"><strong>260</strong><span>QUESTIONS</span></div><span class="sat one">↯ INGEST</span><span class="sat two">⌘ TRANSFORM</span><span class="sat three">◈ ANALYZE</span></div></section><section class="stats" aria-label="Tiến độ"><div class="stat"><div class="stat-value">${m.seen}<small> / 260</small></div><div class="stat-label">Câu đã trả lời</div></div><div class="stat"><div class="stat-value" style="color:var(--mint)">${m.mastered}</div><div class="stat-label">Đã nắm qua các ngày ôn</div></div><div class="stat"><div class="stat-value" style="color:var(--yellow)">${m.weak}</div><div class="stat-label">Câu cần ôn lại</div></div><div class="stat"><div class="stat-value" style="color:var(--lime)">${m.commitments}</div><div class="stat-label">Phiên giữ trọn cam kết</div></div></section><div class="section-head row between"><div><h2>Bản đồ nhiệm vụ</h2><p>Học các câu liên quan cạnh nhau. Mọi phiên đều đã mở.</p></div><span class="pill">7 PHIÊN · 32–42 CÂU / PHIÊN</span></div><div class="session-grid">${TOPICS.map((t,i)=>{
      const qs=topicQuestions(t.id),seen=qs.filter(q=>state.progress[q.id]).length,done=state.history.some(h=>h.topic===t.id && h.status==='complete'),rec=t.id===recommended.id;
      return `<article class="session-card ${rec?'recommended':''}" style="--accent:${t.color};--accent-bg:${t.bg}"><div class="row between"><span class="session-icon" aria-hidden="true">${t.icon}</span><span class="pill ${done||rec?'lime':''}">${done?'✓ Đã giữ cam kết':rec?'✧ Gợi ý tiếp theo':`PHIÊN 0${i+1}`}</span></div><h3>${t.name}</h3><p>${t.desc}</p><div class="card-bottom"><div class="row between"><small>${qs.length} câu · ${chunks(qs.map(q=>q.id)).length} chặng nhỏ</small><small>${seen}/${qs.length} đã học</small></div><div class="progress-track"><div class="progress-fill" style="width:${seen/qs.length*100}%;background:${t.color}"></div></div><button class="btn ${rec?'primary':''} full" data-action="commit" data-topic="${t.id}">${done?'Chơi lại phiên':'Nhận nhiệm vụ'} <span>→</span></button></div></article>`;
    }).join('')}</div><p class="footnote">Mỗi câu có một vị trí học chính. Số câu linh hoạt để giữ các nhóm kiến thức liên quan trong cùng phiên. “Đã nắm” cần ít nhất hai lượt đúng, tự tin, cách nhau từ 24 giờ.</p>`;
  }
  function reviewView() {
    const ids=weakIds();
    return `<span class="eyebrow">TRAINING GROUNDS</span><h1 class="spaced">Ôn đúng chỗ còn yếu.</h1><p class="muted spaced">Câu sai và câu đúng do đoán được gom lại theo chủ đề. Lượt ôn tối đa 40 câu; không thêm câu bất tận.</p>${ids.length?`<div class="callout row between wrap"><div><strong>${ids.length} câu đang chờ ôn</strong><p class="muted">Phiên tiếp theo: ${Math.min(40,ids.length)} câu, đảo vị trí đáp án.</p></div><button class="btn primary" data-action="review">Cam kết ôn ${Math.min(40,ids.length)} câu →</button></div>${TOPICS.map(t=>{const n=ids.filter(id=>byId.get(id).topic===t.id).length;return n?`<div class="list-row row between"><div><h3>${t.icon} ${t.name}</h3><p>${n} câu cần ôn</p></div><span class="pill">Chọn trong phiên ôn</span></div>`:'';}).join('')}`:`<div class="empty"><div class="finish-icon">✧</div><h2>Chưa có câu cần ôn.</h2><p class="muted">Học một phiên và đánh dấu “Chưa chắc” nếu bạn đang đoán.</p><button class="btn primary spaced" data-action="page" data-page="map">Về bản đồ →</button></div>`}`;
  }
  function historyView() {
    return `<span class="eyebrow">PROMISES YOU KEPT</span><h1 class="spaced">Nhật ký cam kết.</h1><p class="muted spaced">Hoàn thành phiên được ghi nhận riêng với độ chính xác. Sai là một phần của việc học.</p>${state.history.length?state.history.slice().reverse().map(h=>`<div class="list-row"><div class="row between wrap"><h3>${escape(h.label)}</h3><span class="history-status ${h.status==='early'?'early':''}">${h.status==='complete'?'✓ Giữ trọn cam kết':'◷ Kết thúc sớm'}</span></div><p>${new Date(h.at).toLocaleString('vi-VN')} · ${h.done}/${h.total} câu hoàn thành · ${h.correct} đúng · ${h.interruptions} lần rời trang</p></div>`).join(''):'<div class="empty"><h2>Cam kết đầu tiên đang chờ bạn.</h2><p class="muted">Bắt đầu một phiên trong bản đồ nhiệm vụ.</p></div>'}`;
  }
  function originalsView() {
    return `<span class="eyebrow">THE ORIGINAL COLLECTION</span><h1 class="spaced">Bốn đề. Một ngân hàng.</h1><p class="muted spaced">Mở lại bài kiểm tra gốc khi muốn tự đánh giá. Kết quả trong đề gốc và Data Quest được lưu riêng.</p>${BANK.sources.map(s=>`<div class="list-row row between wrap"><div><h3>Đề ${s.test} · AWS Data Engineer Associate</h3><p>65 câu · Đáp án và giải thích gốc</p></div><a class="btn" href="${escape(encodeURIComponent(s.file))}" target="_blank" rel="noopener">Mở đề gốc ↗</a></div>`).join('')}<div class="callout">Các đề gốc giữ nguyên câu hỏi và lời giải tiếng Anh. Trong Data Quest, mỗi đáp án có lời giải tiếng Việt riêng để bạn bấm xem sau khi kiểm tra. Hình minh họa và liên kết tham khảo trong đề gốc cần Internet.</div>`;
  }
  let pending=null;
  function openCommit(topic,review=false) {
    if(window.DailyGate && !window.DailyGate.allow())return;
    if(state.active) return;
    const t=TOPICS.find(t=>t.id===topic),ids=review?weakIds().slice(0,40):topicQuestions(topic).map(q=>q.id);
    if(!ids.length) return;
    pending={topic:review?'review':topic,ids,label:review?'Ôn câu chưa chắc':t.name};
    const parts=chunks(ids);
    $('modal').innerHTML=`<span class="eyebrow">MỘT CAM KẾT VỚI CHÍNH MÌNH</span><h2 id="modal-title">${escape(pending.label)}</h2><div class="commit-count">${ids.length} <small>câu trong phiên này</small></div><p>Chia thành ${parts.length} chặng nhỏ theo nhóm kiến thức. Bạn có thể nghỉ tại chỗ giữa các chặng.</p><div class="commit-steps">${parts.map((p,i)=>`<span>${i+1}<br><strong>${p.ids.length} câu</strong></span>`).join('')}</div><p>Cam kết hoàn thành đủ câu. Sau khi kiểm tra, bấm từng đáp án để đọc lời giải tiếng Việt. Rời trang hay đóng trình duyệt, phiên vẫn chờ bạn quay lại.</p><p><small>Trang học không thể khóa Facebook hoặc các website khác.</small></p><div class="modal-actions"><button class="btn quiet" data-action="close">Để sau</button><button class="btn primary" data-action="start">Tôi cam kết · Bắt đầu →</button></div>`;
    $('modal').showModal();
  }
  function startSession(spec) {
    if(window.DailyGate && !window.DailyGate.allow())return;
    if(state.active || !spec || !spec.ids.length) return;
    const q=byId.get(spec.ids[0]);
    state.active={...spec,ids:spec.ids.slice(),pos:0,order:shuffle(q.answers.map((_,i)=>i)),selected:[],checked:false,certain:true,reviewed:false,results:[],started:Date.now(),interruptions:0,breakUntil:0,returnNotice:false};
    finished=null;save();$('modal').close();render();window.scrollTo(0,0);
  }
  function select(index) {
    if(window.DailyGate && !window.DailyGate.allow())return;
    const a=state.active;if(!a || a.checked || a.breakUntil) return;
    const q=byId.get(a.ids[a.pos]);
    if(!a.order.includes(index)) return;
    if(q.correct.length===1) a.selected=[index];
    else if(a.selected.includes(index)) a.selected=a.selected.filter(i=>i!==index);
    else if(a.selected.length<q.correct.length) a.selected.push(index);
    else {toast(`Chỉ chọn ${q.correct.length} đáp án. Bỏ một lựa chọn trước khi đổi.`);return;}
    save();render();
    document.querySelector(`[data-action="select"][data-index="${index}"]`)?.focus({preventScroll:true});
  }
  function checkAnswer() {
    if(window.DailyGate && !window.DailyGate.allow())return;
    const a=state.active;if(!a || a.checked || a.breakUntil) return;
    const q=byId.get(a.ids[a.pos]);if(a.selected.length!==q.correct.length) return;
    a.checked=true;
    const right=correct(q,a.selected),old=state.progress[q.id],now=Date.now();
    let streak=right && a.certain ? 1 : 0;
    if(right && a.certain && old?.correct && old.certain) streak=old.streak+(now-old.at>=86400000?1:0);
    state.progress[q.id]={correct:right,certain:a.certain,seen:(old?.seen||0)+1,streak,at:now,everWrong:!right || old?.everWrong===true || old?.correct===false};
    a.reviewed=true;save();window.DailyGate?.recordPractice(q.id,right);render();
    window.QuestFun?.celebrate(right?'right':'wrong');
  }
  function scrollToQuestion() {
    const card=document.querySelector('.focus-shell .question-card');
    const offset=(document.getElementById('daily-date')?.getBoundingClientRect().bottom||0)+12;
    window.scrollTo({top:matchMedia('(max-width:780px)').matches&&card?Math.max(0,scrollY+card.getBoundingClientRect().top-offset):0,behavior:'instant'});
  }
  function nextQuestion() {
    if(window.DailyGate && !window.DailyGate.allow())return;
    const a=state.active;if(!a || !a.checked || a.breakUntil) return;
    const q=byId.get(a.ids[a.pos]);
    a.results.push({id:q.id,correct:correct(q,a.selected),certain:a.certain});
    if(a.pos===a.ids.length-1){finishSession('complete');return;}
    const parts=chunks(a.ids),boundary=parts.some((p,i)=>i<parts.length-1 && p.ids[p.ids.length-1]===q.id);
    a.pos++;a.selected=[];a.checked=false;a.certain=true;a.reviewed=false;
    a.order=shuffle(byId.get(a.ids[a.pos]).answers.map((_,i)=>i));
    if(boundary) a.breakUntil=Date.now()+60000;
    save();render();scrollToQuestion();
  }
  function finishSession(status) {
    if(window.DailyGate && !window.DailyGate.allow())return;
    const a=state.active;if(!a) return;
    const summary={label:a.label,topic:a.topic,at:Date.now(),total:a.ids.length,done:a.results.length,correct:a.results.filter(r=>r.correct).length,uncertain:a.results.filter(r=>!r.certain).length,status,interruptions:a.interruptions};
    state.history.push(summary);state.active=null;finished=summary;save();$('modal').close();render();window.scrollTo(0,0);
    if(status==='complete')window.QuestFun?.celebrate('finish');
  }
  function renderFocus() {
    const a=state.active,q=byId.get(a.ids[a.pos]),topic=TOPICS.find(t=>t.id===q.topic),parts=chunks(a.ids),partIndex=parts.findIndex(p=>p.ids.includes(q.id)),part=parts[partIndex];
    if(a.breakUntil){renderBreak(parts,partIndex);return;}
    const right=a.checked && correct(q,a.selected);
    $('app').innerHTML=`<main class="focus-shell"><header class="focus-header row between">${brand()}<div class="row"><button class="btn quiet small" data-action="export" title="Sao lưu phiên đang học">↓ Sao lưu</button><button class="btn quiet small" data-action="quit">Kết thúc sớm</button></div></header>${a.returnNotice?`<div class="resume-banner" role="status"><div><strong>Phiên của bạn vẫn đang chờ.</strong><br><small>Còn ${a.ids.length-a.pos} câu để giữ trọn cam kết. Quay lại từ câu này nhé.</small></div><button class="btn small" data-action="return">Tôi quay lại rồi →</button></div>`:''}<section class="focus-meta"><div class="row between wrap"><span class="eyebrow">${escape(a.label)}</span><span class="pill lime">⚑ ${a.pos} / ${a.ids.length} hoàn thành</span></div><div class="checkpoint-row" aria-label="${a.pos} trên ${a.ids.length} câu hoàn thành">${a.ids.map((_,i)=>`<span class="checkpoint ${i<a.pos?'done':i===a.pos?'current':''}"></span>`).join('')}</div><div class="row between spaced"><small>CHẶNG ${partIndex+1}/${parts.length} · ${escape(topic.groups[q.group][0])}</small><small>${part.ids.indexOf(q.id)+1}/${part.ids.length} câu trong chặng</small></div></section><article class="question-card"><div class="row between wrap"><span class="pill">CÂU ${a.pos+1} <span class="muted">/ ${a.ids.length}</span></span><small>${q.correct.length>1?`Chọn ${q.correct.length} đáp án`:'Chọn 1 đáp án'}</small></div><div class="question-text">${clean(q.question)}</div><div class="answer-list" role="group" aria-label="Các đáp án">${a.order.map((index,i)=>{
      const chosen=a.selected.includes(index),isCorrect=q.correct.includes(index),cls=a.checked?(isCorrect?'correct':chosen?'wrong':''):chosen?'selected':'';
      return `<button type="button" class="answer ${cls}" data-action="${a.checked?'explain':'select'}" data-index="${index}" ${a.checked?'aria-haspopup="dialog"':`aria-pressed="${chosen}"`}><span class="answer-letter">${String.fromCharCode(65+i)}</span><span class="answer-copy">${clean(q.answers[index])}${a.checked?`<span class="answer-status">${isCorrect?(chosen?'✓ Đáp án đúng · Bạn đã chọn':'✓ Đáp án đúng · Bạn chưa chọn'):chosen?'✕ Bạn đã chọn':'Không phải đáp án đúng'}</span><span class="answer-hint">💡 Bấm để hiểu vì sao</span>`:''}</span></button>`;
    }).join('')}</div>${a.checked?`<div class="answer-actions" id="answer-result"><div role="status">${right?'<span class="correct-tick" role="img" aria-label="Chính xác">✓</span>':'<span class="incorrect-note">Chưa đúng · Bấm đáp án để hiểu vì sao.</span>'}${!a.certain?'<small class="uncertain-note">Đã ghi nhận “Chưa chắc” để ôn lại.</small>':''}</div><button class="btn primary" data-action="next">${a.pos===a.ids.length-1?'Hoàn thành cam kết ✓':'Tiếp tục →'}</button></div>`:`<div class="question-actions"><div><small>Mức độ chắc chắn</small><div class="confidence"><button class="btn small quiet" data-action="certainty" data-value="true" aria-pressed="${a.certain}">Tôi chắc</button><button class="btn small quiet" data-action="certainty" data-value="false" aria-pressed="${!a.certain}">Chưa chắc / Đoán</button></div></div><button class="btn primary" data-action="check" ${a.selected.length!==q.correct.length?'disabled':''}>Kiểm tra đáp án →</button></div>`}</article><p class="kbd-note">Phím 1–${q.answers.length}: ${a.checked?'xem lời giải':'chọn đáp án'} · Enter: kiểm tra / tiếp tục · Tiến độ tự lưu</p></main>`;
  }
  function showOptionExplanation(index) {
    const a=state.active;
    if(!a?.checked || a.breakUntil)return;
    const q=byId.get(a.ids[a.pos]);
    if(!a.order.includes(index))return;
    const letter=String.fromCharCode(65+a.order.indexOf(index)),isCorrect=q.correct.includes(index),modal=$('modal'),wasOpen=modal.open;
    modal.innerHTML=`<section class="option-reader"><header class="reader-header"><div><span class="eyebrow">💡 GỠ RỐI KIẾN THỨC</span><h2 id="modal-title">Giải thích đáp án ${letter}</h2></div><button type="button" class="btn small quiet" data-action="close" aria-label="Đóng giải thích" autofocus>✕</button></header><nav class="reader-options" aria-label="Giải thích từng đáp án">${a.order.map((n,i)=>`<button type="button" class="reader-tab ${q.correct.includes(n)?'is-correct':''}" data-action="explain" data-index="${n}" aria-current="${n===index?'true':'false'}" aria-label="Xem giải thích đáp án ${String.fromCharCode(65+i)}${q.correct.includes(n)?', đáp án đúng':''}">${String.fromCharCode(65+i)}${q.correct.includes(n)?' ✓':''}</button>`).join('')}</nav><div class="reader-scroll"><div class="reader-verdict ${isCorrect?'is-correct':'is-wrong'}">${isCorrect?'✓ Đây là đáp án đúng':'✕ Lựa chọn này chưa phù hợp'}${a.selected.includes(index)?'<small> · Bạn đã chọn</small>':''}</div><div class="reader-answer">${clean(q.answers[index])}</div><p class="option-explanation-text" data-option="${index}">${escape(q.explanationsVi[index])}</p></div><footer class="reader-footer"><span>Chọn chữ cái phía trên để xem lời giải khác</span></footer></section>`;
    if(!wasOpen)modal.showModal();
    else modal.querySelector('[aria-current="true"]').focus({preventScroll:true});
  }
  function renderBreak(parts,partIndex) {
    const a=state.active;
    $('app').innerHTML=`<main class="focus-shell"><header class="focus-header row between">${brand()}<button class="btn quiet small" data-action="quit">Kết thúc sớm</button></header><section class="finish-card"><span class="eyebrow">CHECKPOINT REACHED</span><div class="finish-icon">⚑</div><h1>Thêm một chặng hoàn thành.</h1><p>Đã xong ${a.pos}/${a.ids.length} câu. Còn ${a.ids.length-a.pos} câu để giữ cam kết.</p><div class="progress-track"><div class="progress-fill" style="width:${a.pos/a.ids.length*100}%"></div></div><p>Thả lỏng vai, uống một ngụm nước.<br>Nghỉ tại đây một chút rồi vào chặng ${partIndex+1}/${parts.length}.</p><div class="break-clock" id="break-clock"></div><p><small>Điểm nghỉ trong phiên · Chưa kết thúc cam kết</small></p><button class="btn primary spaced" data-action="continue">Tôi sẵn sàng · Tiếp tục →</button></section></main>`;
    const tick=()=>{const remaining=Math.max(0,Math.ceil((a.breakUntil-Date.now())/1000));if($('break-clock'))$('break-clock').textContent=remaining?`0:${String(remaining).padStart(2,'0')}`:'Sẵn sàng!';};
    tick();breakTimer=setInterval(tick,500);
  }
  function renderFinish() {
    const h=finished,complete=h.status==='complete';
    $('app').innerHTML=`<main class="focus-shell"><header>${brand()}</header><section class="finish-card"><span class="eyebrow">${complete?'COMMITMENT COMPLETE':'PROGRESS SAVED'}</span><div class="finish-icon">${complete?'✧':'◷'}</div><h1>${complete?'Bạn đã giữ lời với chính mình.':'Phần đã học vẫn được giữ lại.'}</h1><p>${escape(h.label)} · ${h.done}/${h.total} câu hoàn thành</p><div class="stats"><div class="stat"><div class="stat-value">${h.correct}</div><div class="stat-label">Trả lời đúng</div></div><div class="stat"><div class="stat-value">${h.done-h.correct}</div><div class="stat-label">Câu cần học lại</div></div><div class="stat"><div class="stat-value">${h.interruptions}</div><div class="stat-label">Lần rời trang</div></div></div><p>${complete?'Bạn có thể nghỉ tại đây. Kiến thức còn chưa chắc đã được đưa vào khu ôn tập.':'Phiên được ghi nhận là kết thúc sớm. Khi sẵn sàng, hãy nhận lại nhiệm vụ trong bản đồ.'}</p><div class="row wrap spaced"><button class="btn primary" data-action="page" data-page="map">Về bản đồ →</button><button class="btn quiet" data-action="page" data-page="review">Xem câu cần ôn</button></div></section></main>`;
  }
  function quit() {
    if(!state.active)return;
    $('modal').innerHTML=`<span class="eyebrow">DỪNG LẠI MỘT NHỊP</span><h2 id="modal-title">Bạn còn ${state.active.ids.length-state.active.pos} câu.</h2><p>Cam kết của bạn vẫn đang dở. Tiếp tục câu hiện tại, hoặc chủ động kết thúc sớm. Phần đã học vẫn được lưu.</p><div class="modal-actions"><button class="btn danger" data-action="end">Kết thúc sớm</button><button class="btn primary" data-action="close">Làm tiếp một câu →</button></div>`;
    $('modal').showModal();
  }
  function exportState() {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`data-quest-progress-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã xuất bản sao tiến độ, gồm cả phiên đang học.');
  }
  let importCandidate=null;
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>5000000)throw Error('Tệp quá lớn');
      const imported=JSON.parse(await file.text());if(!validState(imported))throw Error('Không đúng định dạng tiến độ Data Quest');
      importCandidate=imported;
      $('modal').innerHTML=`<h2 id="modal-title">Khôi phục bản sao tiến độ?</h2><p>Bản sao có ${Object.keys(imported.progress).length} câu đã học và ${imported.history.length} phiên trong nhật ký. Thao tác này thay thế tiến độ hiện tại trên trình duyệt.</p><div class="modal-actions"><button class="btn quiet" data-action="close">Hủy</button><button class="btn primary" data-action="restore">Khôi phục</button></div>`;$('modal').showModal();
    }catch(error){toast(`Không thể nhập: ${error.message}.`);}finally{e.target.value='';}
  });
  document.addEventListener('click',e=>{
    const theoryEl=e.target.closest('[data-theory]');if(theoryEl){window.QuestTheory.handle(theoryEl,render);return;}
    const el=e.target.closest('[data-action]');if(!el || el.disabled)return;
    const action=el.dataset.action;
    switch(action){
      case 'page':go(el.dataset.page);break;
      case 'commit':openCommit(el.dataset.topic);break;
      case 'review':openCommit(null,true);break;
      case 'close':$('modal').close();break;
      case 'start':startSession(pending);pending=null;break;
      case 'select':select(Number(el.dataset.index));break;
      case 'explain':showOptionExplanation(Number(el.dataset.index));break;
      case 'certainty':if(state.active && !state.active.checked){state.active.certain=el.dataset.value==='true';save();render();}break;
      case 'check':checkAnswer();break;
      case 'next':nextQuestion();break;
      case 'continue':if(state.active){state.active.breakUntil=0;state.active.returnNotice=false;save();render();scrollToQuestion();}break;
      case 'return':if(state.active){state.active.returnNotice=false;save();render();}break;
      case 'quit':quit();break;
      case 'end':finishSession('early');break;
      case 'export':exportState();break;
      case 'import':if(!state.active)$('import-file').click();break;
      case 'restore':if(importCandidate && !state.active){state=importCandidate;importCandidate=null;save();$('modal').close();finished=null;render();toast('Đã khôi phục tiến độ.');}break;
    }
  });
  document.addEventListener('keydown',e=>{
    if(!state.active || $('modal').open || state.active.breakUntil || /INPUT|TEXTAREA|SELECT|A|SUMMARY/.test(e.target.tagName) || e.ctrlKey || e.altKey || e.metaKey)return;
    if(/^[1-6]$/.test(e.key)){const index=state.active.order[Number(e.key)-1];if(index!==undefined){e.preventDefault();state.active.checked?showOptionExplanation(index):select(index);}}
    else if(e.key==='Enter' && (e.target.tagName!=='BUTTON' || e.target.dataset.action==='select')){e.preventDefault();state.active.checked?nextQuestion():checkAnswer();}
  });
  document.addEventListener('visibilitychange',()=>{
    if(!state.active)return;
    if(document.hidden){state.active.interruptions++;state.active.returnNotice=true;save();}
    else render();
  });
  window.addEventListener('pagehide',save);
  window.addEventListener('storage',e=>{if(e.key===KEY && e.newValue){try{const other=JSON.parse(e.newValue);if(validState(other)){state=other;finished=null;render();toast('Tiến độ vừa được cập nhật từ tab khác.');}}catch(_){}}});
  if(state.active){state.active.returnNotice=true;save();}
  render();
  if(QA) window.Quest={BANK,TOPICS,byId,topicQuestions,chunks,correct,validState,startSession,select,checkAnswer,nextQuestion,finishSession,weakIds,mastered,render,save,go,get state(){return state;},reset(){state=fresh();finished=null;page='map';save();render();}};
})();
