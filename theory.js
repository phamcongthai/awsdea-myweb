(() => {
  'use strict';
  const docs='https://docs.aws.amazon.com/';
  const lessons=[
    {id:'compute',icon:'📦',title:'Compute & Containers',subtitle:'Ai điều phối? Chạy ở đâu?',memory:'ECR giữ image → ECS/EKS điều phối → EC2/Fargate chạy.',flow:['ECR · kho image','ECS / EKS · điều phối','EC2 / Fargate · compute'],sections:[
      ['Nhớ trong 60 giây',[
        ['EC2','Máy ảo: bạn chọn cấu hình, hệ điều hành và quản lý phần mềm. AMI là mẫu khởi tạo; instance type là cấu hình CPU/RAM. C phù hợp tác vụ nặng CPU, R phù hợp tác vụ cần nhiều RAM.'],
        ['ECR / ECS / EKS','ECR lưu image container. ECS điều phối container theo cơ chế AWS. EKS cung cấp Kubernetes được quản lý. Docker đóng gói ứng dụng; ECR không chạy ứng dụng.'],
        ['Fargate','Cấp compute cho ECS task hoặc EKS pod, không cần quản lý máy chủ. ECS/EKS là cách điều phối; EC2/Fargate là nơi workload chạy.'],
        ['Lambda','Chạy hàm theo sự kiện; hợp với xử lý ngắn. Với ETL container dài hoặc cần cấu hình riêng, cân nhắc ECS/Fargate, Batch hoặc dịch vụ xử lý dữ liệu.']]],
      ['Ghép thành một job ETL',[
        ['Task Definition → Task → Service','Task Definition mô tả image, CPU, RAM, role, volume. Task là một lần chạy. RunTask hợp job chạy một lần; Service giữ số task mong muốn và thay task bị dừng.'],
        ['Batch / EMR / Glue','Batch xếp hàng và lập lịch batch jobs. EMR dành cho framework như Spark: có EC2, EKS và Serverless. Glue cung cấp ETL serverless cùng Data Catalog. Chọn theo framework và mức quản lý cần thiết.'],
        ['Spot','Hợp job chịu gián đoạn, có retry/checkpoint. Không dùng giả định job luôn chạy liền mạch để chọn Spot.']]],
      ['Điểm dễ nhầm',[
        ['Fargate và ổ đĩa','ECS Fargate Linux có thể dùng EFS và EBS theo điều kiện hỗ trợ. EKS Fargate không mount EBS; EFS dùng static provisioning. Đừng suy luận hai nền tảng có cùng khả năng.'],
        ['Ví dụ nối kiến thức','ETL đã đóng gói container, không muốn quản lý server, nhiều task cần chung thư mục POSIX: ECS + Fargate + EFS là một phương án phù hợp.']]]],recall:['ECR có thay thế Fargate được không?','Không. ECR giữ image, Fargate cung cấp compute để chạy container.'],sources:[['EC2 concepts','AWSEC2/latest/UserGuide/concepts.html'],['ECS overview','AmazonECS/latest/developerguide/Welcome.html'],['ECS storage','AmazonECS/latest/developerguide/using_data_volumes.html'],['EKS Fargate','eks/latest/userguide/fargate.html'],['Glue ETL','glue/latest/dg/how-it-works.html']]},
    {id:'storage',icon:'💾',title:'EBS, EFS & mạng',subtitle:'Ổ đĩa, thư mục chung, quyền truy cập',memory:'EBS = block · EFS = file chung · S3 = object.',flow:['EC2 / container','EBS · ổ riêng | EFS · file chung','IAM + mạng → truy cập S3'],sections:[
      ['Ba kiểu lưu trữ',[
        ['EBS · block','Ổ đĩa cho compute; volume gắn EC2 phải cùng AZ. Thường gắn một instance; Multi-Attach chỉ hỗ trợ trong điều kiện cụ thể, không tự biến EBS thành file system chia sẻ.'],
        ['EFS · file','File system NFS dùng chung cho nhiều máy/container Linux. EFS Regional có thể phục vụ máy ở nhiều AZ; One Zone là lựa chọn khác với độ chịu lỗi khác.'],
        ['S3 · object','Truy cập qua API bằng bucket/key; phù hợp data lake và Parquet. Không coi S3 như ổ block hoặc NFS thông thường.']]],
      ['Vòng đời và kết nối',[
        ['Reboot / Stop / Terminate','Reboot giữ EBS và instance store. Stop giữ EBS nhưng mất instance store. Terminate xóa instance; EBS giữ hay xóa tùy DeleteOnTermination, instance store mất dữ liệu.'],
        ['VPC / Security Group / IAM','VPC là mạng; subnet thuộc một AZ. Security Group kiểm soát traffic, IAM role cấp quyền API. Có quyền S3 vẫn cần đường mạng; có đường mạng vẫn cần quyền.'],
        ['Private subnet → S3','S3 Gateway VPC Endpoint tạo đường truy cập S3 qua route table, không cần NAT cho traffic đó. Vẫn xét IAM, bucket policy và endpoint policy.']]],
      ['Tăng tải đúng tầng',[
        ['ALB','Phân phối HTTP/HTTPS request đến target khỏe; không tự tạo thêm EC2.'],
        ['Auto Scaling','EC2 ASG tăng/giảm instance; ECS Service Auto Scaling tăng/giảm task; Kubernetes HPA tăng/giảm pod. Với ECS trên EC2, tăng task còn cần đủ capacity máy.']]]],recall:['5 máy Linux cùng ghi vào /shared: EBS hay EFS?','EFS: các máy mount chung NFS. EBS thông thường là block volume gắn với một instance.'],sources:[['EC2 lifecycle','AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html'],['EBS volumes','ebs/latest/userguide/ebs-volumes.html'],['EFS overview','efs/latest/ug/whatisefs.html'],['S3 endpoints','vpc/latest/privatelink/vpc-endpoints-s3.html']]},
    {id:'s3',icon:'🪣',title:'Amazon S3',subtitle:'Kho object của data lake',memory:'Chọn storage class bằng tần suất đọc + thời gian chờ + khả năng tái tạo.',flow:['Dữ liệu nguồn','S3 · raw → curated','Athena / Redshift Spectrum'],sections:[
      ['Nhớ trong 60 giây',[
        ['Bucket / key / object','Bucket chứa object; key là tên định danh, prefix dùng nhóm dữ liệu. Ví dụ sales/year=2026/month=10/ để tổ chức dữ liệu theo thời gian.'],
        ['Consistency','S3 có strong read-after-write cho PUT/DELETE và LIST. Không cần đợi eventual consistency cho một object vừa ghi thành công. Điều này không tạo transaction nhiều object.'],
        ['Data lake','Lưu dữ liệu thô và dữ liệu đã xử lý; Glue/Athena/EMR có thể sử dụng. Với analytics, tổ chức partition và định dạng cột giúp giảm dữ liệu phải quét.']]],
      ['Chọn lớp lưu trữ',[
        ['Standard / Intelligent-Tiering','Standard cho truy cập thường xuyên. Intelligent-Tiering cho tần suất khó đoán; có phí theo dõi, và tầng archive tùy chọn cần restore.'],
        ['Standard-IA / One Zone-IA','Ít đọc nhưng cần truy xuất nhanh. IA có phí truy xuất và thời gian lưu tối thiểu. One Zone-IA chỉ ở một AZ: cần chấp nhận rủi ro mất AZ.'],
        ['Glacier','Instant Retrieval: đọc mili giây. Flexible Retrieval và Deep Archive: cần restore, có độ trễ. Đừng thấy chữ Glacier là mặc định tải tức thì.']]],
      ['Bảo vệ và quản lý',[
        ['Versioning / Lifecycle','Versioning giữ các phiên bản object để phục hồi ghi đè/xóa. Lifecycle chuyển lớp hoặc hết hạn theo rule; cần xét riêng noncurrent versions.'],
        ['Replication','Sao chép object sang bucket khác, cùng hoặc khác Region. Live replication cần versioning ở nguồn và đích; object có sẵn cần xem xét Batch Replication.'],
        ['Quyền và mã hóa','IAM/bucket policy kiểm soát truy cập, Block Public Access hạn chế public. SSE-S3 dùng khóa do S3 quản lý; SSE-KMS cần xét cả quyền KMS. Mã hóa không thay thế phân quyền.']]]],recall:['Log hiếm đọc nhưng bắt buộc truy xuất ngay: có chọn Deep Archive không?','Không. Deep Archive cần restore. Cân nhắc lớp truy xuất tức thì như Glacier Instant Retrieval hoặc IA theo yêu cầu và chi phí.'],sources:[['S3 overview & consistency','AmazonS3/latest/userguide/Welcome.html'],['Storage classes','AmazonS3/latest/userguide/storage-class-intro.html'],['Replication','AmazonS3/latest/userguide/replication.html']]},
    {id:'redshift',icon:'📊',title:'Amazon Redshift',subtitle:'Kho dữ liệu để phân tích',memory:'COPY nạp vào · Spectrum đọc S3 · UNLOAD xuất ra.',flow:['S3 · dữ liệu nguồn','COPY → Redshift · SQL phân tích','UNLOAD → S3'],sections:[
      ['Nhớ trong 60 giây',[
        ['OLAP','Phù hợp tổng hợp, báo cáo và join dữ liệu lớn. Lưu trữ theo cột, xử lý song song. Giao dịch ứng dụng với nhiều cập nhật nhỏ thường phù hợp RDS/Aurora hơn.'],
        ['Provisioned / Serverless','Provisioned quản lý cluster capacity; Serverless quản lý compute tự động trong các thiết lập của bạn. Serverless vẫn có chi phí và cần theo dõi mức sử dụng.'],
        ['COPY / UNLOAD','COPY nạp dữ liệu hàng loạt vào bảng, ví dụ từ S3. UNLOAD xuất kết quả truy vấn ra S3. Dùng IAM role phù hợp cho truy cập dữ liệu.']]],
      ['Tối ưu đúng vấn đề',[
        ['Distribution key','Quyết định phân bố hàng giữa các node/slice. Đặt dữ liệu join cùng nơi giúp giảm di chuyển mạng; tránh key gây lệch dữ liệu. AUTO có thể giúp chọn distribution.'],
        ['Sort key','Sắp xếp dữ liệu để bỏ qua block không liên quan khi lọc. Ví dụ lọc theo thời gian thường xuyên thì cột thời gian đáng cân nhắc. Khác nhiệm vụ distribution key.'],
        ['Spectrum','Dùng SQL truy vấn external tables trên S3 mà không cần COPY toàn bộ vào bảng nội bộ. Có thể kết hợp dữ liệu ngoài và bảng Redshift; định dạng/partition ảnh hưởng lượng quét.']]],
      ['Nhận diện tình huống',[
        ['Nạp hay đọc ngoài?','Cần dữ liệu trong warehouse để dùng lặp lại: cân nhắc COPY. Cần query dữ liệu vẫn ở lake: nghĩ Spectrum.'],
        ['Chẩn đoán','Join chậm do di chuyển dữ liệu: xem distribution. Quét quá nhiều block: xem sort key/filter. Hàng đợi truy vấn: xem quản lý workload, không chỉ tăng dung lượng lưu trữ.']]]],recall:['Đề muốn SQL trên Parquet ở S3 mà không nạp vào bảng: COPY hay Spectrum?','Spectrum. COPY dùng khi muốn nạp dữ liệu vào bảng Redshift.'],sources:[['Redshift overview','redshift/latest/mgmt/welcome.html'],['COPY','redshift/latest/dg/r_COPY.html'],['UNLOAD','redshift/latest/dg/r_UNLOAD.html'],['Distribution','redshift/latest/dg/c_choosing_dist_sort.html'],['Sort keys','redshift/latest/dg/t_Sorting_data.html'],['Spectrum','redshift/latest/dg/c-using-spectrum.html']]},
    {id:'aurora',icon:'✨',title:'Amazon Aurora',subtitle:'Database quan hệ với storage phân tán',memory:'Writer ghi · Reader mở rộng đọc · Storage dùng chung nhiều AZ.',flow:['Ứng dụng · kết nối SQL','Writer | Aurora Readers','Shared storage · 3 AZ / 6 bản sao'],sections:[
      ['Nhớ trong 60 giây',[
        ['Aurora là gì?','Database quan hệ tương thích MySQL hoặc PostgreSQL, thuộc họ dịch vụ RDS. Compute tách khỏi cluster storage; các instance cùng cluster dùng chung tầng lưu trữ.'],
        ['Độ bền dữ liệu','Storage có 6 bản sao trải trên 3 AZ. Đây là bản sao ở tầng lưu trữ, không có nghĩa bạn tự động có 6 reader instance.'],
        ['Writer / Reader endpoint','Writer endpoint trỏ tới primary để ghi. Reader endpoint cân bằng kết nối đọc giữa các replica, không phân phối từng câu SQL trong cùng kết nối. Nếu không có replica, reader endpoint nối tới primary.']]],
      ['Chọn tính năng theo yêu cầu',[
        ['Aurora Replicas','Mở rộng đọc và có thể được promote khi writer lỗi. Nên phân bố instance giữa các AZ để có compute dự phòng. Storage đa AZ không thay cho thiết kế instance phù hợp.'],
        ['Serverless v2','Compute tăng/giảm theo tải trong phạm vi cấu hình, dùng Aurora Capacity Units (ACU). Không hiểu serverless là vô hạn hoặc miễn phí khi chưa đọc điều kiện phiên bản/cấu hình.'],
        ['Global Database','Kiến trúc nhiều Region, sao chép phục vụ đọc ở xa và khôi phục thảm họa. Phân biệt với replica trong một Region; mục tiêu độ trễ và DR quyết định lựa chọn.']]],
      ['Đặt cạnh các dịch vụ khác',[
        ['Aurora vs Redshift','Aurora phục vụ giao dịch ứng dụng; Redshift phục vụ analytics trên dữ liệu lớn. Cùng có SQL nhưng thiết kế workload khác nhau.']]]],recall:['6 bản sao storage có đồng nghĩa 6 reader để chạy SELECT không?','Không. Bản sao storage bảo vệ dữ liệu; reader instance là compute cần cấu hình riêng.'],sources:[['Aurora clusters','AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html'],['High availability','AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html'],['Reader endpoint','AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html'],['Serverless v2','AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html'],['Global Database','AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html']]},
    {id:'rds',icon:'🗃️',title:'Amazon RDS',subtitle:'Giao dịch, dự phòng và mở rộng đọc',memory:'Multi-AZ để sẵn sàng · Read replica để mở rộng đọc · Backup để phục hồi.',flow:['Ứng dụng · đọc / ghi','Primary → standby · dự phòng','Read replica · giảm tải đọc'],sections:[
      ['Nhớ trong 60 giây',[
        ['Database được quản lý','RDS hỗ trợ database quan hệ, ví dụ MySQL/PostgreSQL. AWS quản lý nhiều tác vụ hạ tầng; bạn vẫn quản lý schema, truy vấn, quyền và cấu hình sao lưu phù hợp.'],
        ['Multi-AZ DB instance','Một primary và một standby đồng bộ ở AZ khác. Standby hỗ trợ failover, không phục vụ query đọc. Dùng khi cần tăng tính sẵn sàng.'],
        ['Multi-AZ DB cluster','Một writer và hai reader ở ba AZ; reader vừa phục vụ đọc vừa là mục tiêu failover. Vì vậy phải đọc rõ đề nói DB instance hay DB cluster.']]],
      ['Mở rộng và phục hồi',[
        ['Read replica','Thông thường sao chép bất đồng bộ để mở rộng đọc, có thể lag. Không mặc định đọc replica sẽ thấy ngay bản ghi vừa ghi vào primary. Hỗ trợ cụ thể tùy engine.'],
        ['Backup / PITR','Automated backups cho phép khôi phục tới thời điểm trong khoảng lưu giữ. Snapshot thủ công dùng lưu mốc lâu hơn. Restore tạo database mới, không tua ngược database đang chạy tại chỗ.'],
        ['RDS Proxy','Pool và tái sử dụng kết nối database, hữu ích khi ứng dụng tạo nhiều kết nối ngắn. Không thay thế index, tối ưu SQL hoặc read replica.']]],
      ['Nhận diện tình huống',[
        ['Chọn theo mục tiêu','Chịu lỗi AZ: Multi-AZ. Báo cáo làm primary quá tải đọc: read replica và chấp nhận độ trễ dữ liệu. Xóa nhầm bảng: backup/PITR; standby cũng có thể nhận thao tác xóa.']]]],recall:['Có Multi-AZ rồi thì có bỏ backup được không?','Không. Dữ liệu xóa nhầm có thể được replicate sang standby. Backup/PITR giúp phục hồi trạng thái trước lỗi.'],sources:[['RDS overview','AmazonRDS/latest/UserGuide/Welcome.html'],['Multi-AZ','AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html'],['Read replicas','AmazonRDS/latest/UserGuide/USER_ReadRepl.html'],['Point-in-time restore','AmazonRDS/latest/UserGuide/USER_PIT.html'],['RDS Proxy','AmazonRDS/latest/UserGuide/rds-proxy.html']]}
  ];
  lessons.push(...(window.QUEST_ADVANCED_THEORY||[]),...(window.QUEST_PLATFORM_THEORY||[]),...(window.QUEST_BACKUP_THEORY||[]),...(window.QUEST_GLUE_THEORY||[]),...(window.QUEST_ATHENA_THEORY||[]));
  const groups=[
    {id:'storage',icon:'🗄️',title:'Lưu trữ & backup',intro:'Lưu ở đâu, bảo vệ thế nào, khôi phục ra sao?',ids:['storage','s3','backup']},
    {id:'databases',icon:'🧩',title:'Cơ sở dữ liệu',intro:'Từ giao dịch đến warehouse và truy cập theo key.',ids:['rds','aurora','redshift','dynamodb']},
    {id:'pipelines',icon:'🔄',title:'ETL & kiến trúc dữ liệu',intro:'Đọc dữ liệu, truyền sự kiện và ghép thành pipeline.',ids:['athena-pushdown','glue-dynamodb','messaging','architectures','sagemaker']},
    {id:'infrastructure',icon:'🌐',title:'Compute & Network',intro:'Nền tảng chạy ứng dụng và kết nối các dịch vụ.',ids:['compute','network']},
    {id:'delivery',icon:'🚀',title:'Triển khai & CI/CD',intro:'Từ hạ tầng bằng code đến tự động phát hành.',ids:['deployment','cicd']}
  ];
  const groupFor=id=>groups.find(g=>g.ids.includes(id));
  const sourceUrl=url=>url.startsWith('https://')?url:docs+url;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sourcesFor(l,refs=[]){return refs.length?`<div class="theory-section-sources">Nguồn chính thức: ${refs.map(i=>{const [name,url]=l.sources[i];return `<a href="${sourceUrl(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`;}).join(' · ')}</div>`:'';}
  function contents(l){return l.minutes?`<nav class="theory-toc" aria-label="Mục lục bài học"><strong>🧭 Đọc nhanh theo phần · ${l.minutes} phút</strong><div>${l.sections.map(([title],i)=>`<a href="#theory-section-${i}">${esc(title)}</a>`).join('')}<a href="#theory-compare">Bảng chọn dịch vụ & sơ đồ</a><a href="#theory-recall">Tự kiểm tra kiến thức</a></div></nav>`:'';}
  function comparisons(l){return `<div id="theory-compare">${(l.comparisons||[]).map(t=>`<section class="theory-comparison"><h2>${esc(t.title)}</h2><div class="theory-table-wrap" role="region" aria-label="${esc(t.title)}" tabindex="0"><table><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((c,i)=>i?`<td>${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('')}${(l.diagrams||[]).map(d=>`<figure class="theory-diagram theory-branches"><figcaption>${esc(d.title)}</figcaption><ul>${d.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><small>${esc(d.note)}</small></figure>`).join('')}</div>`;}
  function recall(l){return `<section class="theory-recall" id="theory-recall"><span class="eyebrow">🐸 THỬ NHỚ, ĐỪNG NHÌN VỘI</span>${[l.recall,...(l.checks||[])].map(([q,a],i)=>`<div class="theory-check"><h2>${l.checks?`${i+1}. `:''}${esc(q)}</h2><details><summary>Mình nghĩ xong rồi · Xem giải thích</summary><p>${esc(a)}</p></details></div>`).join('')}</section>`;}
  const key=new URLSearchParams(location.search).has('qa')?'data-quest-theory-test-v1':'data-quest-theory-v1';
  let selected=null,openGroup=null,read=[];
  try{const value=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(value))read=value.filter(id=>lessons.some(l=>l.id===id));}catch{}
  function view(){
    const l=lessons.find(x=>x.id===selected);
    if(!l)return `<section class="theory-intro"><span class="eyebrow">📚 TRẠM NẠP KIẾN THỨC</span><h1>Lý thuyết nhanh</h1><p>${groups.length} nhóm kiến thức. Mở một nhóm, chọn chương cần nhớ lại.</p><span class="pill lime">${read.length}/${lessons.length} chương đã đọc</span></section><div class="theory-groups">${groups.map(g=>`<details class="theory-group" data-group="${g.id}" ${openGroup===g.id?'open':''}><summary><span class="theory-group-icon" aria-hidden="true">${g.icon}</span><span class="theory-group-copy"><strong>${g.title}</strong><span>${g.intro}</span><small>${g.ids.filter(id=>read.includes(id)).length}/${g.ids.length} chương đã đọc</small></span><span class="theory-group-chevron" aria-hidden="true">⌄</span></summary><div class="theory-chapters">${g.ids.map((id,i)=>{const x=lessons.find(l=>l.id===id);return `<button class="theory-card theory-chapter" data-theory="open" data-id="${x.id}"><small>CHƯƠNG ${i+1} · ${x.minutes||'3–5'} PHÚT${x.id==='athena-pushdown'?' · MỚI':''}</small><h2>${x.title}</h2><p>${x.subtitle}</p><span class="theory-card-foot">${read.includes(x.id)?'✓ Đã đọc · Đọc lại':'Đọc chương'} →</span></button>`;}).join('')}</div></details>`).join('')}</div><p class="footnote">Các bài liên quan đã gom thành chương trong cùng nhóm. Mỗi chương có nguồn chính thức, sơ đồ và phần tự nhẩm; đọc được cả khi offline. Dấu đã đọc cũ vẫn được giữ trên trình duyệt này.</p>`;
    const index=lessons.indexOf(l),group=groupFor(l.id),chapter=group.ids.indexOf(l.id),next=lessons.find(x=>x.id===group.ids[chapter+1]);
    return `<article class="theory-article"><button class="btn quiet small" data-theory="back">← Các nhóm kiến thức</button><header class="theory-intro"><span class="eyebrow">${l.icon} ${esc(group.title)} · CHƯƠNG ${chapter+1}/${group.ids.length}</span><h1 tabindex="-1" id="theory-title">${l.title}</h1><p>${l.subtitle}</p></header><nav class="theory-related" aria-label="Các chương cùng nhóm">${group.ids.map(id=>{const x=lessons.find(l=>l.id===id);return `<button class="btn small quiet" data-theory="open" data-id="${id}" ${id===l.id?'aria-current="page"':' '}>${esc(x.title)}</button>`;}).join('')}</nav><aside class="theory-memory"><small>🧠 MỘT CÂU ĐỂ NHỚ</small><p>${l.memory}</p></aside><figure class="theory-diagram"><figcaption>Bức tranh trong 10 giây</figcaption><ol>${l.flow.map(s=>`<li>${s}</li>`).join('')}</ol><small>Sơ đồ khái niệm · các nhánh / lựa chọn được ghi trong từng ô.</small></figure>${contents(l)}${l.sections.map(([title,rows,refs],i)=>`<section class="theory-section" id="theory-section-${i}"><h2>${title}</h2><dl>${rows.map(([name,body])=>`<div><dt>${name}</dt><dd>${body}</dd></div>`).join('')}</dl>${sourcesFor(l,refs)}</section>`).join('')}${comparisons(l)}${recall(l)}<section class="theory-sources"><h2>Tài liệu chính thức</h2><p>Tổng hợp / đối chiếu ngày ${l.updated||'12/10/2026'}. Các giới hạn và tính năng có thể thay đổi theo engine, phiên bản và Region.</p><div class="row wrap">${l.sources.map(([name,url])=>`<a href="${sourceUrl(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`).join('')}</div></section><div class="theory-bottom row between wrap"><button class="btn ${read.includes(l.id)?'':'primary'}" data-theory="read" data-id="${l.id}" aria-pressed="${read.includes(l.id)}">${read.includes(l.id)?'✓ Đã đọc · Bỏ đánh dấu':'✓ Đánh dấu đã đọc'}</button>${next?`<button class="btn" data-theory="open" data-id="${next.id}">Tiếp: ${next.title} →</button>`:'<button class="btn" data-theory="back">Về sổ tay →</button>'}<span id="theory-status" role="status"></span></div></article>`;
  }
  function handle(el,render){
    if(window.DailyGate&&!window.DailyGate.allow())return;
    const action=el.dataset.theory;
    if(action==='read'){
      const id=el.dataset.id;if(!lessons.some(l=>l.id===id))return;
      read=read.includes(id)?read.filter(x=>x!==id):[...read,id];
      let saved=true;try{localStorage.setItem(key,JSON.stringify(read));}catch{saved=false;}
      el.setAttribute('aria-pressed',String(read.includes(id)));el.classList.toggle('primary',!read.includes(id));el.textContent=read.includes(id)?'✓ Đã đọc · Bỏ đánh dấu':'✓ Đánh dấu đã đọc';
      document.getElementById('theory-status').textContent=saved?'Đã lưu.':'Không lưu được trên trình duyệt này.';return;
    }
    selected=action==='open'&&lessons.some(l=>l.id===el.dataset.id)?el.dataset.id:null;if(selected)openGroup=groupFor(selected).id;render();window.scrollTo(0,0);document.getElementById('theory-title')?.focus({preventScroll:true});
  }
  window.QuestTheory={view,handle};
})();
