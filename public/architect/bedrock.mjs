// Educational deterministic simulator, not an AWS SDK or a language model.
// Traditional KB sync: https://docs.aws.amazon.com/bedrock/latest/userguide/kb-data-source-sync-ingest.html
// Classic Agents/action groups: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-how.html
const copy = value => JSON.parse(JSON.stringify(value));
const normal = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g,'d');
const words = value => normal(value).match(/[a-z0-9]+/g) || [];
const signature = documents => JSON.stringify(documents);

export function runBedrock(graph, request = {}, runtime = {}) {
  const state = copy(runtime), trace = [], nodes = graph.nodes || [], edges = graph.edges || [];
  state.indexes ||= {}; state.events ||= [];
  const config = n => n?.config || {};
  const find = type => nodes.find(n => n.type === type);
  const outgoing = (n,type) => nodes.find(v => v.type === type && edges.some(e => e.source === n?.id && e.target === v.id));
  const incoming = (n,type) => nodes.find(v => v.type === type && edges.some(e => e.target === n?.id && e.source === v.id));
  const log = (n,stage,message,data,status='success') => trace.push({node:n?.id || null,stage,message,...(data === undefined ? {} : {data}),status});
  const fail = (n,code,message) => { log(n,code,message,undefined,'error'); throw Object.assign(new Error(message),{code,node:n?.id}); };
  const need = (n,type,message) => n || fail(find(type), 'ConfigurationException', message);
  function permit(n,action,resource=n?.id) {
    const roles = nodes.filter(v => v.type === 'iam' && edges.some(e => e.source === v.id && e.target === n?.id));
    const allows = roles.some(role => {
      const c=config(role), list=Array.isArray(c.allow)?c.allow:[];
      return (c.resource === '*' || c.resource === resource) && list.some(a => a === '*' || a === action || a === action.split(':')[0]+':*');
    });
    if (!allows) fail(n,'AccessDeniedException',`${n?.type}: thiếu quyền ${action} trên ${resource}. Nối IAM role đúng vào thành phần thực thi.`);
    log(n,'IAM',`Cho phép ${action}`,{resource});
  }
  function components(kb) {
    const source=need(incoming(kb,'s3'),'kb','Knowledge Base chưa được nối với nguồn S3.');
    const embed=need(outgoing(kb,'embedding'),'kb','Knowledge Base thiếu embedding model.');
    const vector=need(outgoing(embed,'vector'),'embedding','Embedding chưa nối với vector store.');
    if (!config(embed).model) fail(embed,'ValidationException','Chọn embedding model.');
    const dim=Number(config(embed).dimensions);
    if (![256,512,1024].includes(dim) || dim !== Number(config(vector).dimensions)) fail(vector,'DimensionMismatchException','Số chiều embedding và vector store phải tương thích (256, 512 hoặc 1024 trong lab).');
    return {source,embed,vector};
  }
  function ingest(kb) {
    const {source,embed,vector}=components(kb), c=config(kb), dim=Number(config(embed).dimensions);
    permit(kb,'s3:GetObject',source.id);
    if(config(source).encrypted) permit(kb,'kms:Decrypt',config(source).kmsKey || source.id);
    permit(embed,'bedrock:InvokeModel',embed.id);
    permit(kb,'aoss:APIAccessAll',vector.id);
    const size=Number(c.chunkSize ?? 100), overlap=Number(c.overlap ?? 20);
    if(!Number.isInteger(size)||size<5||size>2000||!Number.isInteger(overlap)||overlap<0||overlap>=size) fail(kb,'ValidationException','Chunk size phải từ 5–2000 từ; overlap >= 0 và nhỏ hơn chunk size.');
    const docs=config(source).documents;
    if(!Array.isArray(docs)||docs.some(d=>!d.id||typeof d.text!=='string')||new Set(docs.map(d=>d.id)).size!==docs.length) fail(source,'ValidationException','S3 cần documents [{id, text, version}]; id phải duy nhất.');
    const old=state.indexes[kb.id], previous=old?.documents || [];
    const added=docs.filter(d=>!previous.some(p=>p.id===d.id)).length;
    const updated=docs.filter(d=>previous.some(p=>p.id===d.id&&signature(p)!==signature(d))).length;
    const deleted=previous.filter(d=>!docs.some(p=>p.id===d.id)).length;
    log(source,'ReadSource','Đọc danh sách tài liệu và phát hiện thay đổi.',{added,updated,deleted});
    const chunks=[], ingestionConfig=signature({size,overlap,dim,model:config(embed).model});
    let processed=0;
    for(const d of docs) {
      const unchanged=old?.ingestionConfig===ingestionConfig&&previous.some(p=>p.id===d.id&&signature(p)===signature(d));
      if(unchanged){chunks.push(...copy(old.chunks.filter(ch=>ch.documentId===d.id)));continue;}
      processed++;
      const tokens=d.text.split(/\s+/).filter(Boolean);
      for(let start=0;start<tokens.length;start+=size-overlap) {
        chunks.push({id:`${d.id}:${start}`,documentId:d.id,text:tokens.slice(start,start+size).join(' '),version:d.version ?? 1,year:d.year,owner:d.owner});
        if(start+size>=tokens.length)break;
      }
    }
    log(kb,'Chunking','Chia văn bản theo số từ; đây là mô hình đơn giản hóa tokenizer AWS.',{size,overlap,chunks});
    log(embed,'Embedding',`Xử lý ${processed} tài liệu mới/thay đổi; tái sử dụng đoạn của tài liệu không đổi. Chỉ mục xác định, không gọi mô hình thật.`,{dimensions:dim,processed});
    const indexVersion=(old?.version || 0)+1;
    state.indexes[kb.id]={documents:copy(docs),chunks,version:indexVersion,signature:signature(docs),dimensions:dim,embeddingModel:config(embed).model,ingestionConfig};
    log(vector,'Index','Ghi chỉ mục và loại bỏ tài liệu đã xóa.',{indexVersion,chunks:chunks.length});
    log(kb,'StartIngestionJob','COMPLETE — đồng bộ nguồn hoàn tất.',{added,updated,deleted});
    return {synced:true,indexVersion,added,updated,deleted,chunks:chunks.length};
  }
  function generate(model,answer,citations=[]) {
    need(model,'model','Chưa nối generation model.');
    if(!config(model).model || !String(config(model).prompt || '').trim()) fail(model,'ValidationException','Chọn model và nhập system prompt.');
    permit(model,'bedrock:InvokeModel');
    if(config(model).throttled)fail(model,'ThrottlingException','Mô phỏng hết quota. Tắt sự cố throttled trong cấu hình để thử lại.');
    log(model,'Generate','Tạo câu trả lời xác định từ ngữ cảnh; không gọi AI thật.',{answer,citations});
    return {answer,citations};
  }
  function retrieve(kb,query) {
    const {source,embed,vector}=components(kb), c=config(kb), index=state.indexes[kb.id];
    permit(kb,'aoss:APIAccessAll',vector.id); permit(embed,'bedrock:InvokeModel',embed.id);
    if(!index)fail(kb,'ResourceNotReadyException','Knowledge Base chưa có chỉ mục. Chạy đồng bộ trước khi hỏi.');
    if(index.dimensions!==Number(config(embed).dimensions)||index.embeddingModel!==config(embed).model)fail(kb,'IndexConfigurationChanged','Embedding đã thay đổi; cần đồng bộ lại.');
    if(c.search==='hybrid' && !config(vector).hybrid)fail(vector,'ValidationException','Vector store được chọn không hỗ trợ hybrid search trong lab.');
    const topK=Number(c.topK ?? 3);
    if(!Number.isInteger(topK)||topK<1||topK>20)fail(kb,'ValidationException','topK phải là số nguyên từ 1–20.');
    const stale=index.signature!==signature(config(source).documents);
    if(stale)log(kb,'STALE','Nguồn S3 đã thay đổi. Truy vấn vẫn dùng bản chỉ mục cũ đến khi đồng bộ.',undefined,'warning');
    const q=normal(query), tokens=words(query), code=q.match(/[a-z]{2}-\d{4}-\d+/)?.[0];
    let candidates=index.chunks.filter(ch=>(!c.filterYear||String(ch.year)===String(c.filterYear))&&(!ch.owner||ch.owner==='public'||ch.owner===request.customerId));
    if(candidates.length<index.chunks.length)log(kb,'AuthorizationAndFilter','Áp dụng quyền tài liệu theo customerId và bộ lọc metadata trước khi truy xuất.',{remaining:candidates.length});
    const scored=candidates.map(ch=>{
      const text=normal(ch.text), set=new Set(words(ch.text));
      let score=tokens.reduce((sum,t)=>sum+(set.has(t)?1:0),0);
      if(/return|doi tra|hoan tra/.test(q)&&/return|doi tra|hoan tra/.test(text))score+=4;
      if(/damaged|hu hong|vo/.test(q)&&/damaged|hu hong/.test(text))score+=4;
      if(c.search==='hybrid'&&code&&text.includes(code))score+=20;
      if(c.rerank&&code&&text.includes(code))score+=10;
      return {...ch,score};
    }).filter(ch=>ch.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const retrieved=scored.slice(0,topK);
    const citations=retrieved.map(ch=>({documentId:ch.documentId,chunkId:ch.id,version:ch.version}));
    log(kb,'Retrieve',`Tìm được ${retrieved.length} đoạn phù hợp. Điểm là quy tắc lab, không phải vector similarity AWS.`,{query,retrieved,search:c.search || 'semantic',rerank:!!c.rerank});
    const answer=retrieved.length ? retrieved.map(ch=>ch.text).join('\n') : 'Không tìm thấy thông tin phù hợp trong những tài liệu bạn được phép đọc.';
    const output=generate(outgoing(kb,'model'),answer,citations);
    const truth=Array.isArray(request.relevantDocumentIds)?new Set(request.relevantDocumentIds):null;
    const relevantReturned=truth ? new Set(retrieved.filter(ch=>truth.has(ch.documentId)).map(ch=>ch.documentId)).size : null;
    return {...output,retrieved,stale,indexVersion:index.version,metrics:{label:'Đơn vị mô phỏng, không đo AWS; recall theo tài liệu chuẩn của nhiệm vụ',relevantReturned,recall:truth?.size ? relevantReturned/truth.size : null,returnedChunks:retrieved.length,latencyUnits:2+retrieved.length+(c.rerank?2:0),costUnits:1+retrieved.length+(c.rerank?1:0)}};
  }
  function agentQuery(agent,query) {
    const order=query.match(/DH\d+/i)?.[0]?.toUpperCase();
    log(agent,'Intent',order?'Tra cứu đơn hàng bằng công cụ.':'Tra chính sách qua Knowledge Base.',{query});
    if(!order)return retrieve(need(outgoing(agent,'kb'),'agent','Agent chưa nối Knowledge Base cho câu hỏi tài liệu.'),query);
    if(config(agent).schema!=='order_id')fail(agent,'SchemaValidationException','Action schema phải có tham số order_id.');
    permit(agent,'bedrock:InvokeModel');
    const lambda=need(outgoing(agent,'lambda'),'agent','Agent thiếu Lambda action group.');
    permit(agent,'lambda:InvokeFunction',lambda.id);
    if(config(lambda).action!=='lookup')fail(lambda,'ToolConfigurationException','Lambda action phải là lookup để tra đơn hàng.');
    const db=need(outgoing(lambda,'dynamodb'),'lambda','Lambda chưa nối DynamoDB.');
    log(agent,'ActionSelection','Gọi action group lookupOrder.',{order_id:order});
    permit(lambda,'dynamodb:Query',db.id);
    if(config(db).partitionKey!=='order_id')fail(db,'ValidationException','Query phải khớp partition key order_id của mô hình đơn hàng.');
    const item=(config(db).items || []).find(v=>v.order_id===order);
    if(!item)fail(db,'ResourceNotFoundException','Không tìm thấy đơn hàng.');
    if(!config(agent).authorize)fail(agent,'AuthorizationConfigurationError','Bật kiểm tra chủ sở hữu đơn hàng. Guardrail không thay thế phân quyền dữ liệu.');
    if(!request.customerId||item.customer_id!==request.customerId)fail(lambda,'AccessDeniedException','Người dùng không có quyền xem đơn hàng này. Không trả dữ liệu của khách khác.');
    log(lambda,'Authorization','Chủ sở hữu khớp người dùng đã xác thực.',{customerId:request.customerId});
    log(db,'Query','Truy vấn chính xác partition key.',{item});
    const answer=`Đơn hàng ${order}: ${item.status}. Ngày giao dự kiến: ${item.estimated_delivery}.`;
    log(agent,'FinalResponse',answer);
    return {answer,order:copy(item),citations:[]};
  }
  function events() {
    const source=need(find('s3'),'s3','Thiếu nguồn S3.'), bridge=outgoing(source,'eventbridge');
    let lambda=outgoing(source,'lambda');
    if(!lambda&&bridge) {
      if(!config(bridge).enabled)fail(bridge,'EventDeliveryDisabled','Bật EventBridge rule.');
      log(bridge,'RouteEvent','EventBridge chuyển sự kiện đến Lambda.'); lambda=outgoing(bridge,'lambda');
    } else if(lambda&&!config(source).notify)fail(source,'NotificationDisabled','Chưa bật S3 Event Notification.');
    need(lambda,'lambda','Không có tuyến S3 → Lambda hoặc S3 → EventBridge → Lambda.');
    if(config(lambda).action!=='sync')fail(lambda,'ToolConfigurationException','Lambda phải gọi StartIngestionJob (action sync).');
    const kb=need(outgoing(lambda,'kb'),'lambda','Lambda chưa nối Knowledge Base đích.');
    permit(lambda,'bedrock:StartIngestionJob',kb.id);
    const supplied=request.events || [{id:`event-${state.events.length+1}`}], fresh=[], seen=new Set(state.events); let duplicates=0;
    for(const ev of supplied) { const id=String(ev.id ?? JSON.stringify(ev)); if(seen.has(id)&&config(lambda).deduplicate){duplicates++;continue;}fresh.push(id);seen.add(id); }
    log(lambda,'EventBatch','Nhận sự kiện S3 (có thể giao trùng).',{received:supplied.length,duplicates,queued:fresh.length});
    if(fresh.length>1&&!config(lambda).coalesce)fail(lambda,'ConflictException','Nhiều yêu cầu đồng bộ đồng thời cùng nguồn. Bật coalesce để gộp lô; deduplicate chỉ loại sự kiện trùng.');
    if(!fresh.length)return {synced:false,received:supplied.length,duplicates,coalesced:0,answer:'Đã bỏ qua sự kiện trùng; không chạy lại ingestion.'};
    const output=ingest(kb);state.events=[...seen].slice(-1000);
    return {...output,received:supplied.length,duplicates,coalesced:fresh.length};
  }
  try {
    let output;
    if(request.action==='ingest')output=ingest(need(find('kb'),'kb','Thiếu Knowledge Base.'));
    else if(request.action==='events')output=events();
    else {
      const app=need(find('app'),'app','Thêm Application làm điểm bắt đầu.'), query=String(request.query || 'Chính sách đổi trả của cửa hàng là gì?');
      const guard=outgoing(app,'guardrail');
      if(guard) {
        const blocked=(config(guard).blockTopics || []).find(t=>String(t).trim()&&normal(query).includes(normal(t)));
        if(blocked)fail(guard,'GuardrailIntervened',`Câu hỏi bị quy tắc nội dung chặn: ${blocked}. Kiểm tra chặn nhầm; đây không phải IAM.`);
        log(guard,'ContentFilter','Câu hỏi vượt qua bộ lọc nội dung; phân quyền được kiểm tra riêng.');
      }
      log(app,'Request','Nhận câu hỏi của người dùng.',{query});
      const agent=outgoing(app,'agent'), kb=outgoing(app,'kb');
      if(agent)output=agentQuery(agent,query);
      else if(kb)output=retrieve(kb,query);
      else output=generate(need(outgoing(app,'model'),'app','Nối Application với Model, Knowledge Base hoặc Agent.'),'Tôi chưa có quyền truy cập tài liệu chính sách riêng của cửa hàng. Cần cung cấp ngữ cảnh hoặc Knowledge Base để trả lời.',[]);
      if(guard&&config(guard).maskPII) {
        output.answer=output.answer.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[EMAIL ĐÃ CHE]');
        log(guard,'OutputFilter','Che email trong câu trả lời mô phỏng. Không thay thế quyền truy cập dữ liệu.');
      }
    }
    return {status:'success',output,trace,runtime:state};
  } catch(error) {
    return {status:'failure',output:{answer:error.message},error:{code:error.code || 'SimulationError',message:error.message,node:error.node},trace,runtime:state};
  }
}
