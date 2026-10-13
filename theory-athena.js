// Vietnamese teaching examples; diagrams describe responsibilities, not a fixed execution order.
(() => {
 const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const code=s=>`<pre class="theory-code" tabindex="0" aria-label="Ví dụ SQL hoặc bố cục dữ liệu"><code>${esc(s)}</code></pre>`;
 const table=(title,heads,rows)=>`<div class="theory-comparison"><strong>${esc(title)}</strong><div class="theory-table-wrap" role="region" aria-label="${esc(title)}" tabindex="0"><table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
 const diagram=(title,lines,note)=>`<figure class="theory-diagram theory-branches"><figcaption>${esc(title)}</figcaption><ul>${lines.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><small>${esc(note)}</small></figure>`;
 window.QUEST_ATHENA_THEORY=[{
  id:'athena-pushdown',icon:'🧭',title:'Athena đọc S3 thế nào? Pushdown & pruning từ gốc',subtitle:'Ai nhận SQL, ai đọc file, và dữ liệu nào được bỏ qua?',minutes:'20–25',updated:'13/10/2026',
  memory:'S3 giữ file · Catalog mô tả file · Athena xử lý SQL. Pushdown đưa việc xuống lớp dưới; pruning bỏ phần không cần.',
  flow:['SQL → Athena lập kế hoạch','Catalog: metadata | S3: file dữ liệu','Athena đọc phần cần thiết, lọc và trả kết quả'],
  sections:[
   ['1. Trước hết: một service truy vấn database như thế nào?',[
    ['Lambda gửi, PostgreSQL thực hiện','Giả sử một hàm Lambda cần đơn hàng trên 500.000 đồng. Code trong Lambda dùng thư viện kết nối database để gửi SQL đến RDS for PostgreSQL. PostgreSQL nhận câu lệnh, lập kế hoạch, truy cập dữ liệu nó quản lý, tính toán/lọc và gửi kết quả về. Lambda xử lý kết quả để phục vụ ứng dụng.'],
    ['Ba vai trò',diagram('Luồng yêu cầu và kết quả của ứng dụng',['Yêu cầu: Lambda (chương trình client) → SQL qua kết nối → RDS for PostgreSQL (database engine)','Thực thi: PostgreSQL → truy cập dữ liệu trên storage của RDS → lọc / tính toán','Kết quả: PostgreSQL → các dòng kết quả → Lambda'], 'RDS quản lý môi trường database và storage; Lambda không tự đọc file vật lý của PostgreSQL trong ví dụ này.')],
    ['Có WHERE chưa chứng minh optimizer pushdown','Lambda gửi SELECT ... WHERE amount > 500000 chỉ cho thấy ứng dụng yêu cầu PostgreSQL lọc. Để nói optimizer đã push down, phải chỉ ra công việc được chuyển từ operator/lớp nào xuống operator/lớp nào, hoặc từ query engine qua connector đến nguồn. Không thể nhìn mỗi chữ WHERE rồi kết luận.']],[0,1]],
   ['2. Với Athena, database engine và nơi lưu dữ liệu tách nhau',[
    ['S3 giữ các object/file','Trong ví dụ này, các dòng đơn hàng nằm trong file Parquet trên S3. S3 phục vụ yêu cầu lấy object hoặc các vùng byte; Athena không gửi SQL thông thường tới S3 để S3 chạy WHERE.'],
    ['Glue Data Catalog giữ bản mô tả','Catalog cho Athena biết tên/cấu trúc cột, định dạng, vị trí S3 và thông tin partition đã đăng ký. Database trong Catalog là nhóm định nghĩa bảng; table là metadata mô tả dataset. Nó không phải một PostgreSQL chứa các dòng đơn hàng.'],
    ['Athena là nơi xử lý truy vấn','Athena nhận SQL, dùng metadata để hiểu bảng và lập kế hoạch. Các thành phần thực thi/bộ đọc của Athena đọc dữ liệu cần thiết từ S3, lọc và xử lý kết quả. Không phải mỗi truy vấn Athena đều chạy một Glue ETL job.'],
    ['Hai luồng riêng',diagram('Bản đồ chức năng: metadata khác dữ liệu',['SQL: người dùng / ứng dụng → Athena','Tra metadata: Athena ↔ Glue Data Catalog — schema, định dạng, location, partition','Đọc dữ liệu: bộ đọc Athena ↔ S3 — metadata trong file và các vùng dữ liệu cần đọc','Kết quả: Athena → kết quả truy vấn → người dùng / ứng dụng'], 'Các nhánh thể hiện trách nhiệm và loại thông tin trao đổi, không quy định thứ tự từng request hay toàn bộ query plan thực tế.')]
   ],[2,3]],
   ['3. Một ví dụ đơn hàng dùng xuyên suốt',[
    ['Bố cục S3',code(`s3://example-data/orders/
  day=2026-10-12/part-001.parquet
  day=2026-10-13/part-001.parquet
  day=2026-10-14/part-001.parquet`)],
    ['Định nghĩa cần hiểu','Các cột trong file là order_id, customer_id, amount, status, address. Giả định amount là số nguyên tiền đồng, day là partition key kiểu STRING lấy từ vị trí partition và đã đăng ký đúng. day có thể là cột ảo của bảng, không cần lặp lại trong mỗi record của file. Tên prefix trên S3 tự nó chưa đủ thay thế định nghĩa bảng/partition.'],
    ['SQL cần trả lời',code(`SELECT order_id, amount
FROM orders
WHERE day = '2026-10-13'
  AND amount > 500000;`)],
    ['Dữ liệu nhỏ để hình dung',table('Một vài dòng trong partition ngày 13/10 (minh họa)', ['order_id','customer_id','amount','status','address'], [['O101','C01','100000','PAID','Hà Nội'],['O102','C02','700000','PAID','Đà Nẵng'],['O103','C03','900000','NEW','Huế']])],
    ['Kết quả mong muốn','Từ ba dòng minh họa, trả (O102, 700000) và (O103, 900000). Không có điều kiện status, nên đơn NEW vẫn được chọn. Dữ liệu các ngày khác không thuộc phạm vi câu hỏi. Ví dụ row group A/B/C ở phần 7 mở rộng dữ liệu để minh họa khối lưu trữ, không suy ra thống kê từ ba dòng này.']],[4,5]],
   ['4. Bỏ các ngày không liên quan: partitioning và partition pruning',[
    ['Partitioning là tổ chức','Khi tạo dữ liệu, ta gom đơn hàng theo day vào các partition. Đây là quyết định bố trí dữ liệu, không phải một thao tác WHERE. Partition theo ngày hợp lý khi truy vấn thường giới hạn theo ngày.'],
    ['Partition pruning là loại bớt','Với day = 2026-10-13, engine có thể loại các partition ngày 12 và 14. Đọc dữ liệu của ngày 13; bỏ dữ liệu các ngày còn lại. Có bảng partitioned nhưng truy vấn không ràng buộc day thì không tự nhiên chỉ đọc một ngày.'],
    ['Đọc / bỏ trong ví dụ',table('Phạm vi ở cấp partition',['Partition','Quyết định','Vì sao'],[['day=2026-10-12','BỎ dữ liệu','Không khớp day'],['day=2026-10-13','XÉT ĐỌC file bên trong','Khớp day; chưa biết dòng nào đạt amount'],['day=2026-10-14','BỎ dữ liệu','Không khớp day']])],
    ['Đừng lẫn partition projection','Partition projection là tính vị trí/giá trị partition từ các quy tắc cấu hình thay vì tra từng partition đã đăng ký. Nó khác projection pushdown chọn cột. Bài này dùng partition đã đăng ký để giữ ví dụ đơn giản.']],[4,5]],
   ['5. Bỏ các cột không dùng: projection pushdown và column pruning',[
    ['Cần cột nào?','Câu SQL cần order_id để trả kết quả và amount để vừa lọc vừa trả kết quả. Không cần nội dung customer_id, status, address. day được giải quyết ở cấp partition trong bố cục giả định. Cột dùng trong JOIN, phép tính hoặc điều kiện khác cũng phải được tính vào tập cột cần thiết.'],
    ['Column pruning','Là loại các cột không cần khỏi quá trình đọc/xử lý phù hợp. Trong ví dụ, bỏ payload của customer_id, status, address. Với định dạng cột, điều này có thể tránh đọc những vùng byte tương ứng, dù vẫn cần metadata.'],
    ['Projection pushdown','Là đưa yêu cầu “chỉ cần các cột này” xuống lớp đọc/connector/nguồn thay vì đọc tất cả rồi cắt cột ở trên. Đây là một cách hỗ trợ việc loại cột; tên gọi nhấn mạnh công việc được đưa xuống đâu.'],
    ['Không chỉ nhìn SELECT',code(`SELECT order_id
FROM orders
WHERE day = '2026-10-13'
  AND amount > 500000;
-- amount vẫn cần để đánh giá điều kiện, dù không nằm trong kết quả.`)],
    ['Đọc / bỏ theo cột',table('Các cột của truy vấn chính',['Cột','Cần cho việc gì?','Quyết định logic'],[['order_id','SELECT','ĐỌC cho các phần còn được xét'],['amount','SELECT và WHERE','ĐỌC / dùng thống kê để lọc'],['customer_id, status, address','Không được dùng','BỎ payload cột'],['day','Điều kiện partition','DÙNG giá trị partition, không cần một cột vật lý trong file']])]
   ],[1,6]],
   ['6. Predicate pushdown: hai tình huống, hai cách giảm công việc',[
    ['Nguồn là database từ xa','Ví dụ Trino truy vấn PostgreSQL qua connector hỗ trợ. Engine có thể đẩy điều kiện được hỗ trợ sang PostgreSQL; nguồn áp dụng điều kiện trước khi gửi các dòng lên Trino. Nhờ vậy giảm dòng truyền qua mạng và công việc ở engine phía trên.'],
    ['Giảm truyền chưa chắc giảm đọc','PostgreSQL có thể dùng index để tránh đọc nhiều dòng, hoặc vẫn phải quét rồi lọc, tùy kế hoạch và dữ liệu. Vì vậy chỉ biết ít dòng đi qua mạng chưa đủ chứng minh ít dữ liệu được đọc ở nguồn. Pushdown còn phụ thuộc tính tương thích và khả năng connector.'],
    ['Nguồn là Parquet/ORC trên S3','Điều kiện amount > 500000 được đưa tới lớp đọc có khả năng tận dụng thống kê. Bộ đọc có thể bỏ khối chắc chắn không chứa dòng phù hợp. S3 vẫn là nơi cung cấp byte dữ liệu, không biến thành PostgreSQL chạy câu WHERE này.'],
    ['Điều kiện còn lại vẫn phải kiểm tra','Một khối có thể chứa cả dòng đúng lẫn sai; sau khi đọc, engine/reader vẫn phải đánh giá điều kiện cần thiết. Predicate pushdown không bảo đảm mọi filter đều được đẩy, cũng không bảo đảm tránh toàn bộ scan.']],[7,3,8]],
   ['7. Min/max cho biết khi nào chắc chắn có thể bỏ một nhóm',[
    ['Thống kê không phải các dòng','Giả sử file ngày 13/10 có ba row groups Parquet, chứa amount dạng số, không NULL và thống kê min/max hợp lệ. Metadata chỉ tóm tắt miền giá trị, không chứa toàn bộ order_id hay mọi amount. Reader vẫn phải đọc metadata để quyết định.'],
    ['Ba nhóm A/B/C',table('Điều kiện amount > 500000; giả định không NULL',['Nhóm','Min → max','Cần làm gì?'],[['A','10000 → 200000','BỎ payload nhóm: max không vượt ngưỡng'],['B','100000 → 900000','ĐỌC cột cần thiết và LỌC từng dòng'],['C','600000 → 800000','Vẫn ĐỌC order_id, amount để trả kết quả']])],
    ['Vì sao A bỏ được?','Giá trị lớn nhất chỉ 200.000, nên không dòng nào có amount > 500.000. Không cần tải payload cột của nhóm A cho câu hỏi này. “Bỏ nhóm” không có nghĩa chưa từng đọc byte metadata nào.'],
    ['Vì sao B chưa kết luận được?','Khoảng 100.000–900.000 giao với miền cần tìm. Min/max không cho biết dòng nào, bao nhiêu dòng vượt 500.000; phải đọc phần cần thiết và lọc. Min/max càng rộng và chồng lấn, khả năng bỏ nhóm càng ít.'],
    ['Vì sao C không được bỏ?','Trong giả định không NULL, mọi amount đều đạt điều kiện. Nhưng truy vấn cần giá trị order_id và amount cụ thể, thống kê không cung cấp chúng. Có thể không cần đánh giá lại điều kiện này trong một số triển khai, nhưng vẫn phải lấy dữ liệu kết quả. Nếu có NULL, phải xét null statistics và semantics SQL; NULL không thỏa phép so sánh >.']],[3,8,9]],
   ['8. Đặt tên cơ chế sau khi đã hiểu việc đọc',[
    ['Query optimization','Tên chung của việc tối ưu truy vấn. Nó có thể bao gồm pruning, pushdown, chọn thứ tự JOIN, dùng thống kê và nhiều kỹ thuật khác. Không phải tên của một loại filter riêng.'],
    ['Data skipping','Bỏ phần dữ liệu mà metadata chứng minh không cần cho truy vấn. Row-group pruning thường nói đến bỏ row group trong Parquet; stripe pruning thường nói đến bỏ stripe trong ORC. Tùy reader/format còn có mức chi tiết hơn.'],
    ['Pushdown ≠ pruning','Pushdown mô tả đưa công việc xuống lớp thấp hơn/nguồn. Pruning mô tả loại phần không cần. Đẩy predicate xuống reader có thể dẫn đến bỏ row group, nhưng cũng có thể không bỏ được nhóm nào nếu min/max của mọi nhóm đều giao với điều kiện.'],
    ['Không học sơ đồ như một lịch chạy cố định',diagram('Ba câu hỏi chức năng, không phải thứ tự thực thi bắt buộc',['Partition: ngày nào cần xét? → giữ ngày 13, bỏ ngày khác','Column: cột nào cần dùng? → giữ order_id và amount, bỏ cột còn lại','Block: nhóm nào có thể chứa kết quả? → bỏ A, xét B và C'], 'Planner, connector và reader có thể phối hợp/đan xen các bước; bộ đọc phải lấy metadata cần thiết trước khi bỏ các phần dữ liệu tương ứng.')]
   ],[1,8,9,10]],
   ['9. CSV so với Parquet/ORC: khác ở cách bố trí dữ liệu',[
    ['CSV theo dòng','Một dòng chứa lần lượt order_id, customer_id, amount, status, address. Chỉ SELECT hai trường không làm các trường đó tự tách thành vùng byte độc lập để tải. Reader thường phải đi qua byte của các dòng được xét để xác định trường, dù không giữ/giải mã mọi trường vào kết quả. Partition pruning vẫn có ích cho CSV.'],
    ['Columnar theo cột trong nhóm','Parquet chia thành row groups với các column chunks; ORC tổ chức theo stripes với các luồng cột và metadata/index phù hợp. “Theo cột” không có nghĩa mỗi cột bắt buộc là một file S3 riêng. Truy vấn ít cột có thể đọc các phần cột cần thiết trong các nhóm còn lại.'],
    ['Minh họa cách bố trí',code(`CSV — đọc qua các dòng:
O101,C01,100000,PAID,Hà Nội
O102,C02,700000,PAID,Đà Nẵng

Columnar — minh họa logic trong một nhóm:
order_id:    [O101, O102]       ← CẦN
customer_id: [C01, C02]         ← BỎ
amount:      [100000, 700000]   ← CẦN
status:      [PAID, PAID]       ← BỎ
address:     [Hà Nội, Đà Nẵng]  ← BỎ
metadata:    thống kê / vị trí các phần dữ liệu`)],
    ['Lợi ích phụ thuộc workload','Truy vấn ít cột, nhiều dữ liệu không phù hợp và thống kê hữu ích thường có nhiều cơ hội giảm I/O. SELECT * cần nhiều cột hơn. Nếu hầu hết dữ liệu đều đạt điều kiện, predicate pushdown có thể không giảm nhiều bytes; không có hệ số tăng tốc cố định cho mọi dataset.']],[6,9,10]],
   ['10. Phân tích hai lựa chọn B và D trong đề',[
    ['Thông tin được cung cấp',table('Hai mô tả cần so sánh',['Đáp án','Bố cục','Từ dùng trong đề'],[['B','Một file Parquet mỗi ngày; partition ngày','predicate pushdown'],['D','Nhiều file ORC; partition ngày','“columnar pushdown filters”']])],
    ['Ý định ra đề và kết luận kỹ thuật','D có vẻ là đáp án người ra đề muốn chọn khi nhấn mạnh nhiều file và định dạng cột. Đây là suy luận từ hai mô tả, không phải xác nhận đáp án chính thức: chưa có toàn bộ câu hỏi, kích thước file, dữ liệu và query plan để kết luận D luôn nhanh hơn B.'],
    ['Cụm từ chưa rõ','“Columnar pushdown filters” không chỉ ra rõ đang nói projection/column pruning hay predicate pushdown vào reader. Cả Parquet và ORC đều hỗ trợ đọc chọn cột và tận dụng predicate/metadata. Không có quy tắc predicate pushdown chỉ thuộc Parquet hoặc column pruning chỉ thuộc ORC.'],
    ['Một file không đồng nghĩa một reader','Parquet và ORC có cấu trúc cho phép chia việc đọc thành các phần. Vì vậy một file Parquet vẫn có thể được đọc song song. Mức song song thực tế phụ thuộc bố cục nội bộ, kích thước và cách engine chia việc.'],
    ['Nhiều file không tự động nhanh hơn','Nhiều file vừa kích thước có thể thuận tiện xử lý phân tán, nhưng quá nhiều file nhỏ tăng chi phí liệt kê, mở file, đọc metadata và lập lịch. Cần biết tổng dung lượng, size/count file, row group/stripe, compression, độ chọn lọc và mức đồng thời truy vấn.'],
    ['Cách học đúng','Cả B và D đều đã có partition theo ngày. Tiếp theo xét cột cần đọc, khả năng bỏ khối và chi phí bố cục file. Nếu dữ kiện chỉ như trên, ghi nhận D là ý định có thể có của người ra đề, đồng thời giữ kết luận: chưa đủ thông tin chứng minh D luôn tốt hơn B.']],[3,6,11]],
   ['11. Kiểm chứng tối ưu thay vì chỉ đoán từ tên định dạng',[
    ['Xem kế hoạch','Dùng EXPLAIN để xem kế hoạch, các ràng buộc partition/cột và operator phù hợp. Tên hoặc sự hiện diện của một operator riêng lẻ không chứng minh mọi khối đã được skip. Athena có engine/version riêng; tài liệu Trino giải thích cơ chế không đồng nghĩa mọi tính năng của Trino mới nhất có trong Athena.'],
    ['Đo cùng điều kiện','So sánh cùng dataset, SQL, engine và cấu hình tương đương; ghi lại bytes scanned, thời gian lập kế hoạch và thực thi, lưu ý result reuse/cache và tải đồng thời. EXPLAIN ANALYZE thực thi truy vấn, nên có chi phí thực thi tương ứng. Bài này không công bố số benchmark giả định.'],
    ['Chốt ví dụ orders','Bỏ ngày không khớp → chỉ xét cột cần dùng → dùng metadata bỏ nhóm chắc chắn không đạt → đọc/lọc phần còn lại để trả order_id, amount. Đây là diễn giải chức năng để nhớ, không phải thứ tự request vật lý được bảo đảm.']],[12,13]]
  ],
  comparisons:[{title:'Từ điển theo việc làm — đọc gì, bỏ gì?',headers:['Kỹ thuật','Việc làm','Trong ví dụ orders'],rows:[
   ['Query optimization','Tên chung cho tối ưu kế hoạch/thực thi','Kết hợp các kỹ thuật phù hợp'],
   ['Partitioning','Tổ chức dữ liệu','File được gom theo day'],
   ['Partition pruning','Bỏ partition không khớp','Không đọc dữ liệu ngày 12 và 14'],
   ['Projection pushdown','Đưa yêu cầu cột xuống lớp đọc/nguồn','Reader được yêu cầu order_id, amount'],
   ['Column pruning','Loại cột không cần','Bỏ payload customer_id, status, address'],
   ['Predicate pushdown','Đưa điều kiện xuống lớp đọc/nguồn','Reader nhận amount > 500000'],
   ['Data skipping / row-group pruning / stripe pruning','Dùng metadata để bỏ phần dữ liệu','Bỏ nhóm A; vẫn xét B và đọc dữ liệu C']]}],
  diagrams:[{title:'Tự lần theo câu SQL',steps:['WHERE day: giới hạn partition ngày 13/10 — dữ liệu ngày khác bị loại','SELECT + WHERE: cần order_id và amount — cột không dùng được loại','amount > 500000 + min/max: A bị loại; B cần lọc; C vẫn cần đọc giá trị trả về'],note:'Metadata trong Data Catalog mô tả bảng/partition; metadata trong file giúp reader xét cấu trúc và thống kê. Hai loại metadata không phải một.'}],
  recall:['Athena gửi WHERE cho S3 chạy hay tự xử lý truy vấn?','Athena lập kế hoạch và thực thi qua các thành phần engine/reader. S3 cung cấp file/vùng byte; Glue Data Catalog cung cấp metadata bảng. S3 không chạy SQL thông thường của Athena trong ví dụ này.'],
  checks:[
   ['SELECT chỉ có order_id, WHERE dùng amount: bỏ cột amount được không?','Không chỉ vì nó vắng trong SELECT. amount vẫn cần cho điều kiện; metadata có thể giúp bỏ khối nhưng không loại nhu cầu đánh giá điều kiện ở phần chưa xác định được.'],
   ['Nhóm B có min=100000, max=900000: bao nhiêu dòng vượt 500000?','Không biết chỉ từ min/max. Khoảng giá trị cho biết nhóm có thể chứa kết quả; cần đọc và lọc để tìm các dòng cụ thể.'],
   ['Nhóm C toàn amount trên 500000: không cần đọc gì nữa?','Sai. Với giả định không NULL, điều kiện đều đạt, nhưng vẫn cần lấy order_id và amount cụ thể để trả kết quả.'],
   ['Một file Parquet mỗi ngày chắc chắn chậm hơn nhiều file ORC?','Không đủ dữ kiện. Parquet có thể chia đọc song song; cả hai định dạng có tối ưu cột/predicate; quá nhiều file nhỏ còn tăng overhead.'],
   ['Database từ xa trả ít dòng hơn: chắc chắn đọc ít bytes hơn ở nguồn?','Không. Nguồn có thể vẫn quét nhiều dữ liệu rồi lọc. Giảm dữ liệu truyền và giảm dữ liệu đọc là hai lợi ích cần kiểm tra riêng.']
  ],
  sources:[
   ['Lambda kết nối RDS','lambda/latest/dg/services-rds.html'],
   ['Trino: optimizer pushdown','https://trino.io/docs/current/optimizer/pushdown.html'],
   ['Athena: table, database, catalog','athena/latest/ug/understanding-tables-databases-and-the-data-catalog.html'],
   ['Athena: columnar storage','athena/latest/ug/columnar-storage.html'],
   ['Athena: partition dữ liệu','athena/latest/ug/partitions.html'],
   ['Athena: tối ưu bố cục dữ liệu','athena/latest/ug/performance-tuning-data-optimization-techniques.html'],
   ['AWS: performance tuning Athena','https://aws.amazon.com/blogs/big-data/top-10-performance-tuning-tips-for-amazon-athena/'],
   ['Trino: PostgreSQL connector','https://trino.io/docs/current/connector/postgresql.html'],
   ['Trino: Hive connector','https://trino.io/docs/current/connector/hive.html'],
   ['Apache Parquet: file format','https://parquet.apache.org/docs/file-format/'],
   ['Apache ORC: specification','https://orc.apache.org/specification/ORCv1/'],
   ['Athena: tối ưu dữ liệu và file nhỏ','athena/latest/ug/performance-tuning-data-optimization-techniques.html#performance-tuning-data-optimization-avoid-many-files'],
   ['Athena: EXPLAIN / EXPLAIN ANALYZE','athena/latest/ug/athena-explain-statement.html'],
   ['Athena engine version 3','athena/latest/ug/engine-versions-reference-0003.html']
  ]
 }];
})();
