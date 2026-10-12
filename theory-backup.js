// Vietnamese explanations and illustrative scenarios, with AWS references per section.
window.QUEST_BACKUP_THEORY = [{
 id:'backup',icon:'🛟',title:'Backup, Vault & khôi phục dữ liệu',subtitle:'Gỡ rối backup plan, Data Vault, S3, RDS/Aurora và Redshift',minutes:'25–30',
 memory:'Plan là kế hoạch · Vault tổ chức bản sao · Recovery point là mốc phục hồi · Data Vault là mô hình dữ liệu.',
 flow:['Chọn dữ liệu + mục tiêu phục hồi','Tạo và bảo vệ các bản sao','Khôi phục → kiểm tra → đưa vào sử dụng'],
 sections:[
 ['1. Bắt đầu bằng một cửa hàng online',[
 ['Ba nơi, ba nhiệm vụ','Giả sử cửa hàng giữ ảnh và file đơn hàng trong S3, giao dịch đang chạy trong RDS, báo cáo doanh thu trong Redshift. Cả ba đều lưu dữ liệu, nhưng kiểu dữ liệu và cách khôi phục khác nhau. Sao lưu RDS không tự sao lưu các ảnh ở S3 hay bảng tổng hợp ở Redshift.'],
 ['Hai câu hỏi khác nhau','“Dữ liệu của tôi được tổ chức thế nào?” thuộc thiết kế dữ liệu. “Nếu bị xóa hoặc hỏng, tôi lấy lại thế nào?” thuộc backup và recovery. Data Vault trả lời câu đầu; backup plan và backup vault phục vụ câu sau.'],
 ['Cách đọc bài này','Đọc phần 2–5 để hiểu từ vựng; phần 6–10 để phân biệt dịch vụ; phần 11–13 để ghép thành kế hoạch thực tế; phần 14 để hiểu Data Vault. Các con số trong ví dụ là giả định học tập, không phải cấu hình mặc định AWS.']],[0,19]],
 ['2. Backup plan, rule, vault, job và recovery point',[
 ['Backup plan = bản kế hoạch','Quy định cách bảo vệ tài nguyên: lịch chạy, lưu bao lâu, lưu vào vault nào và các quy tắc sao chép phù hợp. Tạo plan chưa có nghĩa đã có bản backup thành công.'],
 ['Rule + resource assignment','Rule là một quy tắc trong plan, ví dụ chụp mỗi ngày và giữ 30 ngày. Resource assignment chọn tài nguyên bằng danh sách hoặc điều kiện tag, cùng IAM role để thực hiện. Tag không khớp hoặc quyền thiếu có thể khiến tài nguyên không được bảo vệ như dự định.'],
 ['Backup job = một lần thực hiện','Đến lịch, hệ thống thực hiện công việc backup. Cần kiểm tra trạng thái hoàn tất, không chỉ thấy lịch đã được đặt. Copy job và restore job là những công việc riêng.'],
 ['Backup vault = nơi tổ chức backup','Đây là container logic trong AWS Backup, dùng quản lý các recovery point và quyền truy cập. Nó không phải bucket S3 do bạn tự tạo, không phải database và cũng không phải mô hình Data Vault.'],
 ['Recovery point = mốc có thể phục hồi','Một bản sao/mốc phục hồi của tài nguyên do AWS Backup quản lý. Ví dụ bản ngày 12/10 khác bản ngày 13/10. Với continuous backup, bạn có cửa sổ thời gian phục hồi; không nên hình dung mọi recovery point chỉ là một file ZIP.']],[0,1,4]],
 ['3. Snapshot, incremental và PITR khác nhau ở đâu?',[
 ['Snapshot','Lưu trạng thái tại một thời điểm. Ví dụ snapshot lúc 02:00 không tự chứa giao dịch lúc 09:00 cùng ngày. Snapshot là hình ảnh logic của dữ liệu; cách lưu vật lý có thể tối ưu theo các phần thay đổi.'],
 ['Full và incremental','Full sao lưu toàn bộ phạm vi cần bảo vệ; incremental lưu phần thay đổi so với lần trước theo cơ chế dịch vụ. Không cần tự tải và ghép từng mảnh incremental khi dùng luồng restore do dịch vụ quản lý. Không mặc định mọi loại tài nguyên có cùng cơ chế.'],
 ['PITR = point-in-time recovery','Cho phép chọn thời điểm nằm trong cửa sổ phục hồi, thay vì chỉ chọn các snapshot rời rạc. Ví dụ xóa nhầm lúc 10:03, cần trở về 10:02. Phải có cơ chế continuous backup/log phù hợp từ trước; bật lên sau sự cố không tạo lại lịch sử đã mất.'],
 ['Không phải quay lui vô hạn','PITR bị giới hạn bởi thời gian lưu giữ và thời điểm dữ liệu đã sẵn sàng để phục hồi. Một snapshot giữ một năm không đồng nghĩa chọn được bất kỳ giây nào trong cả năm đó.']],[0,4,11]],
 ['4. RPO, RTO, retention: ba câu phải hỏi trước',[
 ['RPO — chấp nhận mất bao nhiêu dữ liệu?','RPO 15 phút nghĩa là mục tiêu không mất quá 15 phút dữ liệu gần nhất khi sự cố. Nếu chỉ có một bản chụp lúc 00:00, hỏng lúc 23:59 có thể mất gần một ngày thay đổi. Lịch backup hằng ngày không đáp ứng mục tiêu 15 phút đó.'],
 ['RTO — chấp nhận ngừng bao lâu?','RTO 2 giờ là mục tiêu đưa hệ thống hoạt động lại trong 2 giờ. Thời gian này gồm khôi phục, kiểm tra, cấu hình kết nối và chuyển ứng dụng sang nơi phục hồi; không chỉ thời gian bấm nút Restore.'],
 ['Retention — giữ lịch sử bao lâu?','Giữ 30 ngày trả lời “có thể tìm bản cũ tới đâu”. Backup mỗi giờ trả lời “có bao nhiêu mốc”. Hai tham số độc lập. Một bản mỗi tháng giữ 7 năm vẫn có khoảng trống lớn giữa hai lần chụp.'],
 ['Tự tính một ví dụ','Bản mới nhất hoàn tất lúc 08:00, sự cố lúc 10:00, phục vụ lại lúc 11:30: khoảng dữ liệu có nguy cơ mất là 2 giờ, thời gian gián đoạn là 1,5 giờ. Đây là kết quả đo của tình huống; RPO/RTO là mục tiêu để so sánh với kết quả đó.']],[18]],
 ['5. Vault Lock, mã hóa và cô lập bản sao',[
 ['Mã hóa không ngăn mọi thao tác xóa','Mã hóa bảo vệ khả năng đọc dữ liệu. IAM và vault access policy kiểm soát quyền thao tác. Vault dùng khóa KMS cho những loại backup phù hợp; một số loại phụ thuộc cơ chế mã hóa của dịch vụ nguồn. Cần giữ khả năng sử dụng khóa khi restore.'],
 ['Vault Lock = bảo vệ thời hạn lưu giữ','Governance mode có thể gỡ bằng quyền phù hợp. Compliance mode trở nên bất biến sau thời gian grace; khi còn recovery point được bảo vệ, không thể đơn giản nhờ root hoặc AWS gỡ khóa. Chọn chế độ phải dựa trên yêu cầu lưu giữ thực tế.'],
 ['Không có nghĩa giữ vĩnh viễn','Lock ngăn xóa hoặc thay đổi trái quy định trong thời hạn bảo vệ. Recovery point vẫn có thể hết hạn theo lifecycle. Giới hạn retention của vault và retention trong rule phải tương thích, nếu không job mới có thể thất bại.'],
 ['Logically air-gapped vault','Là lựa chọn vault nhằm tăng cô lập bản sao và hỗ trợ các luồng phục hồi/chia sẻ được AWS quy định. “Logically” không có nghĩa mang ổ cứng ra khỏi mạng. Cần kiểm tra loại tài nguyên được hỗ trợ, không áp dụng đồng loạt cho mọi dịch vụ.']],[1,2,3,5]],
 ['6. S3: Versioning, Replication, Lifecycle và Object Lock',[
 ['Versioning — giữ các phiên bản object','Ghi đè file có thể tạo version mới, giúp tìm lại bản trước. Xóa không chỉ định version ID thường tạo delete marker thay vì xóa vĩnh viễn bản cũ. Nhưng người có quyền vẫn có thể xóa cụ thể một version nếu nó không được bảo vệ.'],
 ['Replication — sao chép sang bucket khác','Dùng cho các nhu cầu sao chép và phân bố dữ liệu. Delete marker có thể được sao chép tùy cấu hình; không nên học rằng “xóa ở nguồn luôn xóa ở đích” hoặc “không bao giờ ảnh hưởng đích”. Cần chính sách lịch sử và quyền độc lập để phục hồi an toàn.'],
 ['Lifecycle / Glacier — quản lý tuổi và chi phí','Chuyển object sang storage class lưu trữ lâu dài không tự tạo một bản độc lập. Nếu đó là bản duy nhất và bị xóa vĩnh viễn, việc từng đặt nó trong Glacier không giúp tái tạo. Lifecycle còn có thể xóa version cũ theo rule.'],
 ['Object Lock — bảo vệ object version','Áp dụng mô hình WORM cho phiên bản object theo retention/legal hold. Khác với Vault Lock bảo vệ recovery point trong AWS Backup. Object Lock không phải lịch backup; Versioning cũng không tự bật yêu cầu bất biến cho mọi phiên bản.']],[6,7,8,9]],
 ['7. AWS Backup cho S3: thêm lớp quản lý backup',[
 ['Cần bật Versioning','AWS Backup cho S3 yêu cầu Versioning. Có periodic backup và continuous backup/PITR theo hỗ trợ. Continuous backup dùng các sự kiện S3 qua EventBridge; phải duy trì cấu hình cần thiết, không tùy tiện tắt rule liên quan.'],
 ['Một bucket, hai lớp bảo vệ','Ví dụ Versioning giúp lấy nhanh file vừa bị ghi đè; AWS Backup quản lý bản sao theo lịch, retention và chính sách bảo vệ tập trung. Hai lớp có thể bổ sung cho nhau, không cần xem chúng là hai tên gọi của cùng tính năng.'],
 ['Khôi phục ra đâu?','Có thể khôi phục vào bucket nguồn hoặc bucket đích mới theo điều kiện hỗ trợ, toàn bộ phạm vi hoặc các object được chọn. Phải kiểm tra phiên bản, quyền, mã hóa và metadata cần giữ; đừng mặc định mọi cấu hình bucket cũng được tái tạo y nguyên.'],
 ['Ví dụ thực tế','Job ETL ghi đè nhầm prefix raw/orders/. Xác định thời điểm và danh sách bị ảnh hưởng; phục hồi vào nơi kiểm tra trước, so số object và dữ liệu mẫu, rồi mới đưa vào luồng xử lý. Tránh để job lỗi tiếp tục ghi đè dữ liệu vừa cứu.']],[10,12]],
 ['8. RDS: snapshot và PITR phục hồi database',[
 ['Automated backups','RDS duy trì backup tự động và log theo cấu hình/engine để hỗ trợ PITR. Cửa sổ native có thể tới 35 ngày; cần kiểm tra retention đang bật. Chỉ cấu hình Multi-AZ không thay thế yêu cầu này.'],
 ['Manual snapshot','Chụp mốc chủ động, ví dụ trước nâng cấp hoặc chạy migration. Native manual snapshot tồn tại cho tới khi bị xóa; đừng suy ra recovery point do AWS Backup quản lý không có ngày hết hạn, vì nó tuân theo lifecycle tương ứng.'],
 ['Restore tạo DB mới','Với luồng RDS DB instance, khôi phục snapshot hoặc PITR tạo instance mới, không tua ngược instance đang chạy ngay tại chỗ. Phải kiểm tra endpoint, network, security group, parameter và cách ứng dụng kết nối.'],
 ['Xóa nhầm một bảng','Giả sử DELETE lúc 10:03: phục hồi về trước 10:03 vào DB mới rồi đối chiếu. Có thể trích dữ liệu cần cứu và nhập lại có kiểm soát thay vì thay toàn bộ production; tránh làm mất các giao dịch hợp lệ xuất hiện sau mốc phục hồi.'],
 ['Export snapshot ra S3','Export phục vụ đọc/phân tích dữ liệu, thường ở định dạng Parquet. Các file xuất không phải bản snapshot có thể dùng trực tiếp để restore thành RDS instance. Xuất dữ liệu, sao lưu database và di chuyển database là các thao tác khác nhau.']],[11,13,14]],
 ['9. Aurora và Multi-AZ: sẵn sàng cao chưa đủ',[
 ['Aurora backup','Aurora có sao lưu tự động liên tục với retention 1–35 ngày và DB cluster snapshot. Đơn vị cần hình dung là cluster; quy trình phục hồi phải chuẩn bị cả cluster/instance và kết nối theo luồng tương ứng.'],
 ['Replica vẫn có thể thấy dữ liệu sai','Ứng dụng gửi lệnh xóa hợp lệ nhưng nhầm nghiệp vụ: hệ thống sao chép vẫn có thể truyền thay đổi đó. Replica giúp tính sẵn sàng hoặc tải đọc, không mặc định giữ nguyên phiên bản “trước khi xóa” cho bạn.'],
 ['Multi-AZ xử lý loại sự cố khác','Một node/AZ có vấn đề: failover có thể giúp tiếp tục phục vụ. Dữ liệu bị sửa sai: cần mốc phục hồi phù hợp. Hệ thống thường cần cả HA và backup vì hai lớp xử lý các rủi ro khác nhau.'],
 ['AWS Backup phải xét đúng loại RDS','Theo ma trận hiện tại, RDS DB instance và Aurora có hỗ trợ continuous backup trong phạm vi native hỗ trợ; RDS Multi-AZ DB cluster không có continuous/PITR qua AWS Backup. Không gộp DB instance Multi-AZ và Multi-AZ DB cluster thành một loại.']],[15,3]],
 ['10. Redshift: bảo vệ warehouse và dữ liệu ngoài nó',[
 ['Provisioned cluster','Có automated/manual snapshot, lưu tăng dần theo cơ chế Redshift. Snapshot của dịch vụ không phải file trong bucket mà bạn tùy ý duyệt. Retention của manual snapshot có thể cấu hình; không học rằng mọi manual snapshot luôn giữ vô hạn.'],
 ['Serverless','Backup đại diện trạng thái dữ liệu trong namespace. Có snapshot chủ động và recovery point tự động; recovery point native giữ 24 giờ. Khi cần giữ lâu hơn, dùng snapshot với retention phù hợp. Đây không phải PITR chọn từng giây giống RDS.'],
 ['Restore đúng phạm vi','Snapshot dùng phục hồi warehouse theo các đích hỗ trợ. Có luồng phục hồi bảng cho trường hợp phù hợp. Luôn kiểm tra tài nguyên đích và dữ liệu được phục hồi, không mặc định thao tác sẽ ghi đè nguyên warehouse hiện tại.'],
 ['Spectrum không nằm hết trong snapshot','Bảng external truy vấn dữ liệu ở S3. Cứu dữ liệu nội bộ Redshift không tự cứu object đã mất trong data lake; S3, catalog, IAM và định nghĩa liên quan cần kế hoạch riêng. UNLOAD kết quả truy vấn ra S3 cũng không phải bản sao đầy đủ warehouse.'],
 ['AWS Backup cũng có tích hợp','Redshift có tích hợp AWS Backup; Serverless cũng được tài liệu hiện tại liệt kê. Tuy nhiên tính năng copy/PITR khác theo loại tài nguyên. Không lấy khả năng native của Redshift rồi mặc định AWS Backup có đầy đủ y hệt.']],[16,17,20,3]],
 ['11. Cross-account, cross-Region và kiểm tra phục hồi',[
 ['Khác tài khoản và khác Region','Cross-account giúp tách quyền quản trị của bản sao khỏi tài khoản nguồn. Cross-Region giúp có bản ở vùng địa lý/dịch vụ khác khi Region nguồn gặp vấn đề. Hai trục độc lập: khác Region nhưng cùng account chưa tạo được sự tách quyền như khác account.'],
 ['Đừng suy ra copy vẫn có PITR','Với AWS Backup, bản continuous được copy cross-account hoặc cross-Region trở thành snapshot ở đích; không giữ PITR cho bản copy đó. Phải thiết kế mục tiêu phục hồi riêng ở nơi đích và kiểm tra ma trận hỗ trợ.'],
 ['Khôi phục thử mới biết dùng được','Backup job báo thành công chứng minh đã tạo bản sao, chưa chứng minh ứng dụng phục hồi đúng trong RTO. Restore testing giúp tự động hóa các bài kiểm tra được hỗ trợ; cần bổ sung kiểm tra dữ liệu và nghiệp vụ phù hợp.'],
 ['Đo cả chuỗi','Đo từ lúc quyết định phục hồi tới lúc đọc/ghi nghiệp vụ thành công. Kiểm tra quyền KMS, mạng, secrets, endpoint, dữ liệu mẫu và các phụ thuộc. Đây là lý do “có snapshot” chưa đủ để cam kết RTO vài phút.']],[3,21,22]],
 ['12. Một backup plan mẫu — hiểu cách ghép các lớp',[
 ['Mục tiêu giả định','Cửa hàng muốn cứu đơn hàng gần thời điểm lỗi, file nguồn cần giữ lịch sử một tháng, báo cáo có thể tính lại từ dữ liệu nguồn. Đây là ví dụ thiết kế để học, cần đo lại RPO/RTO và chi phí trước khi dùng thực tế.'],
 ['RDS / Aurora','Bật PITR phù hợp để xử lý sai sót gần đây; bổ sung snapshot dài hạn nếu nghiệp vụ cần. Giữ một bản cũ nhiều tháng không có nghĩa kéo cửa sổ PITR tới nhiều tháng. Thử restore và đổi kết nối ứng dụng.'],
 ['S3','Giữ Versioning, chọn backup periodic/continuous theo mức dữ liệu được phép mất. Bảo vệ bản sao và quyền xóa, đặt retention rõ ràng. Nếu lifecycle xóa version cũ, phải kiểm tra nó có làm mất lớp lịch sử đang trông cậy hay không.'],
 ['Redshift','Đặt snapshot/retention theo nhu cầu warehouse. Bảo vệ riêng S3 nguồn và định nghĩa pipeline. Nếu chọn dựng lại warehouse từ nguồn, phải tính thời gian nạp lại và chạy ETL vào RTO; dữ liệu “tính lại được” không có nghĩa “tính lại tức thì”.'],
 ['Điểm chung','Chọn tài nguyên rõ ràng, giám sát job thất bại, xác nhận bản copy đích nếu có, kiểm tra restore định kỳ. Không áp một lịch giống hệt lên mọi hệ thống chỉ vì tất cả đều là dữ liệu.']],[0,10,11,15,16,21]],
 ['13. Runbook khi xóa nhầm — làm theo thứ tự',[
 ['1 · Khoanh vùng','Xác định dữ liệu bị ảnh hưởng và thời điểm bắt đầu sai. Tạm dừng hoặc sửa tác nhân gây lỗi; nếu không, dữ liệu cứu lại có thể tiếp tục bị hỏng. Ghi nhận các giao dịch hợp lệ xảy ra sau mốc lỗi.'],
 ['2 · Chọn bản phục hồi','S3: version/object backup; RDS/Aurora: snapshot hoặc thời điểm PITR; Redshift: snapshot/recovery point phù hợp. Kiểm tra mốc thực sự sẵn sàng và phạm vi bao phủ.'],
 ['3 · Phục hồi và đối chiếu','Ưu tiên môi trường kiểm tra khi phù hợp. So số bản ghi, tổng doanh thu, khóa nghiệp vụ và vài giao dịch mẫu. Không coi job Completed là thay thế cho việc kiểm tra dữ liệu.'],
 ['4 · Đưa vào hoạt động','Quyết định nhập lại phần dữ liệu mất hay chuyển ứng dụng sang tài nguyên mới. Cập nhật kết nối, kiểm tra quyền, theo dõi và đo thời gian phục hồi. Lưu lại các bước để lần sau làm nhanh và ít sai hơn.']],[12,13,21]],
 ['14. Data Vault: cùng chữ vault nhưng là mô hình dữ liệu',[
 ['Hub — danh tính nghiệp vụ','Hub giữ business key ổn định của một thực thể, ví dụ customer_id hoặc order_id, kèm thông tin nạp/nguồn phù hợp. Không nhét mọi thuộc tính thay đổi như địa chỉ vào Hub.'],
 ['Link — quan hệ','Link biểu diễn quan hệ giữa các business key, ví dụ khách C42 đặt đơn O17. Nó giúp mô hình thể hiện các liên kết nghiệp vụ mà không trộn hết quan hệ và thuộc tính vào một bảng lớn.'],
 ['Satellite — thuộc tính và lịch sử','Satellite giữ các thuộc tính mô tả và lịch sử thay đổi gắn với Hub hoặc Link. Ví dụ địa chỉ của C42 đổi từ Hà Nội sang Đà Nẵng: nạp phiên bản thuộc tính mới với thông tin thời gian/nguồn, giữ khả năng truy vết giá trị trước.'],
 ['Raw Vault → Business Vault → Data mart','Raw Vault giữ dữ liệu tích hợp và lịch sử gần nguồn; Business Vault bổ sung quy tắc/giá trị suy ra; data mart đưa dữ liệu về dạng thuận tiện cho BI như fact/dimension. Đây là các lớp mô hình hóa, không phải các loại backup vault.'],
 ['Ví dụ trong Redshift','Có thể xây các bảng Hub_Customer, Hub_Order, Link_Customer_Order và Sat_Customer_Profile trong Redshift, nhận dữ liệu từ S3/pipeline. Hash key hoặc hashdiff hỗ trợ kỹ thuật mô hình hóa; không tự mã hóa dữ liệu và không thay backup.'],
 ['Lịch sử nghiệp vụ ≠ bảo vệ khỏi mất dữ liệu','Data Vault giúp trả lời dữ liệu đã thay đổi thế nào nếu các bảng còn nguyên. Nếu toàn bộ warehouse bị xóa, lịch sử trong Satellite cũng có thể mất. Vẫn cần snapshot/backup cho Redshift và bảo vệ S3 nguồn riêng.']],[19,23]],
 ['15. Nhận diện câu hỏi để không chọn nhầm',[
 ['“Quản lý backup nhiều dịch vụ theo lịch”','Nghĩ tới AWS Backup plan, assignment, rule và giám sát job. Nếu thêm “không được xóa trước hạn”, xem Vault Lock và chính sách lưu giữ.'],
 ['“Khôi phục trước lệnh DELETE 5 phút”','Kiểm tra PITR đã bật, cửa sổ phục hồi và kiểu tài nguyên. Snapshot mỗi ngày có thể quá cũ; replica có thể đã nhận lệnh xóa.'],
 ['“Lưu file rẻ trong nhiều năm”','Đó có thể là bài toán S3 storage class/lifecycle. Nếu còn yêu cầu chống xóa hoặc phục hồi độc lập thì phải xét thêm versioning, lock, backup; từ “archive” không tự giải quyết tất cả.'],
 ['“Tích hợp nguồn, giữ lịch sử, business key”','Đó là ngữ cảnh Data Vault: Hub/Link/Satellite. Không chọn backup vault chỉ vì thấy cùng từ “vault”.'],
 ['Cách ghi nhớ','Hỏi lần lượt: dữ liệu ở đâu → rủi ro gì → được mất bao nhiêu → cần phục hồi nhanh bao nhiêu → bản nào cứu được → đã thử cứu chưa. Đây là cách suy luận tình huống, không phải tuyên bố tần suất xuất hiện trong đề thi.']],[0,2,11,19]]
 ],
 comparisons:[
 {title:'Bảng gỡ rối các chữ dễ lẫn',headers:['Khái niệm','Câu hỏi nó trả lời','Không nên hiểu thành'],rows:[
 ['Backup plan','Sao lưu thế nào, khi nào, bao lâu?','Một bản sao đã hoàn tất'],['Backup vault','Quản lý và bảo vệ recovery point ở đâu?','Bucket S3 hoặc database'],['Recovery point','Có bản/mốc nào để phục hồi?','Luôn chọn được mọi giây trong quá khứ'],['Snapshot','Trạng thái tại mốc nào?','Dữ liệu phát sinh sau mốc đó'],['PITR','Trở về thời điểm nào trong cửa sổ hỗ trợ?','Lịch sử vô hạn'],['Data Vault','Tổ chức khóa, quan hệ, thuộc tính lịch sử thế nào?','Nơi chứa backup của AWS']]},
 {title:'S3, RDS/Aurora, Redshift — chọn đúng cách cứu',headers:['Dữ liệu','Cơ chế cần xem','Lưu ý khi phục hồi'],rows:[
 ['S3 objects','Versioning; AWS Backup periodic/continuous','Chọn object/phạm vi và bucket đích; kiểm tra metadata/quyền'],['RDS database','Automated backups/PITR; snapshot','DB mới; đối chiếu dữ liệu và chuyển kết nối'],['Aurora cluster','Continuous backup/PITR; cluster snapshot','Khôi phục cluster và chuẩn bị instance/kết nối'],['Redshift provisioned','Automated/manual snapshot','Phục hồi warehouse/bảng theo khả năng hỗ trợ'],['Redshift Serverless','Snapshot; recovery point native','Xét namespace và quy trình đích; không đồng nhất với RDS PITR'],['S3 ngoài Redshift (Spectrum)','Bảo vệ S3 độc lập','Warehouse snapshot không tự cứu file ngoài warehouse']]},
 {title:'Mỗi lớp giải quyết một loại vấn đề',headers:['Yêu cầu','Lớp phù hợp','Vẫn cần nghĩ thêm'],rows:[
 ['Node/AZ ngừng hoạt động','HA / Multi-AZ / failover','Lỗi logic và xóa nhầm'],['Quay về trước thao tác sai','Backup / PITR / version history','Chọn mốc và kiểm tra dữ liệu'],['Bản sao ngoài Region nguồn','Cross-Region nếu được hỗ trợ','Retention, quyền và RTO ở đích'],['Tách quyền khỏi tài khoản nguồn','Cross-account nếu được hỗ trợ','KMS, policy và thử restore'],['Chống xóa trước hạn','Object Lock hoặc Vault Lock đúng phạm vi','Lịch backup và thời hạn thực tế'],['Truy vết lịch sử nghiệp vụ','Mô hình Data Vault','Backup cho chính các bảng lưu lịch sử']]}],
 diagrams:[
 {title:'Một lần backup đi từ kế hoạch tới phục hồi',steps:['PLAN + RULE + ASSIGNMENT → tài nguyên được chọn → backup job','Job hoàn tất → recovery point được quản lý trong VAULT → retention / quyền / lock','Sự cố → chọn recovery point hoặc thời điểm hợp lệ → restore job → kiểm tra → sử dụng'],note:'Copy job là bước riêng nếu cần bản sao đích và loại tài nguyên hỗ trợ. Tạo plan không chứng minh job đã thành công.'},
 {title:'Data Vault của cửa hàng — sơ đồ mô hình, không phải backup',steps:['Hub_Customer [C42] ↔ Link_Customer_Order [C42, O17] ↔ Hub_Order [O17]','Hub_Customer [C42] ↔ Sat_Customer_Profile [địa chỉ cũ / mới + thời gian nạp + nguồn]','Dữ liệu nguồn → Raw Vault → Business Vault → data mart phục vụ báo cáo'],note:'Các bảng có thể nằm trong Redshift. Bản thân chúng vẫn cần kế hoạch backup và khôi phục.'}
 ],
 recall:['Có backup plan rồi, có chắc đã cứu được dữ liệu không?','Chưa. Phải có tài nguyên được gán đúng, quyền phù hợp, job hoàn tất, mốc phục hồi còn hạn và quy trình restore đã được kiểm tra.'],
 checks:[
 ['Backup hằng ngày, giữ 7 năm có đạt RPO 5 phút không?','Không chỉ nhờ retention dài. Khoảng cách giữa các mốc vẫn lớn; cần cơ chế thu nhận thay đổi/backup đáp ứng mục tiêu và kiểm tra thực tế.'],
 ['RDS Multi-AZ có cứu lệnh DELETE nhầm không?','Không tự giữ bản trước lỗi. Cần snapshot/PITR phù hợp; thay đổi sai có thể truyền sang replica.'],
 ['S3 chuyển sang Glacier nghĩa là đã có bản backup độc lập?','Không. Đổi storage class của object không tự tạo bản sao độc lập. Phải xét versioning, backup và quyền xóa theo nhu cầu.'],
 ['RDS export snapshot ra S3 có restore trực tiếp thành DB không?','Không. Export phục vụ truy cập/phân tích dữ liệu; nó không phải snapshot có thể dùng trực tiếp cho thao tác restore DB instance.'],
 ['Cứu snapshot Redshift có cứu luôn file Spectrum bị xóa không?','Không. File ở S3 cần được bảo vệ và khôi phục riêng; đồng thời kiểm tra catalog và quyền truy cập.'],
 ['Satellite giữ mọi phiên bản khách hàng: có bỏ backup được không?','Không. Satellite là bảng lịch sử nghiệp vụ. Khi bảng hoặc warehouse mất, lịch sử cũng mất nếu không có cách khôi phục.'],
 ['Copy continuous backup sang Region khác vẫn chọn từng giây được chứ?','Không với bản copy cross-Region/cross-account của AWS Backup: bản đích là snapshot, không giữ PITR. Cần thiết kế khả năng phục hồi ở đích riêng.']
 ],
 sources:[
 ['AWS Backup plans','aws-backup/latest/devguide/about-backup-plans.html'],
 ['Backup vaults','aws-backup/latest/devguide/vaults.html'],
 ['Vault Lock','aws-backup/latest/devguide/vault-lock.html'],
 ['Ma trận tính năng AWS Backup','aws-backup/latest/devguide/backup-feature-availability.html'],
 ['Continuous backup & PITR','aws-backup/latest/devguide/point-in-time-recovery.html'],
 ['Logically air-gapped vault','aws-backup/latest/devguide/logicallyairgappedvault.html'],
 ['S3 Versioning và xóa object','AmazonS3/latest/userguide/troubleshooting-versioning.html'],
 ['S3 delete marker replication','AmazonS3/latest/userguide/delete-marker-replication.html'],
 ['S3 Lifecycle','AmazonS3/latest/userguide/object-lifecycle-mgmt.html'],
 ['S3 Object Lock','AmazonS3/latest/userguide/object-lock.html'],
 ['AWS Backup cho S3','aws-backup/latest/devguide/s3-backups.html'],
 ['RDS automated backups','AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html'],
 ['Khôi phục S3','aws-backup/latest/devguide/restoring-s3.html'],
 ['RDS point-in-time restore','AmazonRDS/latest/UserGuide/USER_PIT.html'],
 ['RDS snapshot export','AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html'],
 ['Aurora backup và restore','AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Backups.html'],
 ['Redshift snapshots','redshift/latest/mgmt/working-with-snapshots.html'],
 ['Redshift Serverless recovery points','redshift/latest/mgmt/serverless-snapshots-recovery-points.html'],
 ['Định nghĩa RPO / RTO','prescriptive-guidance/latest/strategy-database-disaster-recovery/defining.html'],
 ['Thiết kế Data Vault trong Redshift','https://aws.amazon.com/blogs/big-data/design-and-build-a-data-vault-model-in-amazon-redshift-from-a-transactional-database/'],
 ['AWS Backup cho Redshift','aws-backup/latest/devguide/redshift-backups.html'],
 ['Restore testing','aws-backup/latest/devguide/restore-testing.html'],
 ['Kiến trúc disaster recovery','https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-i-strategies-for-recovery-in-the-cloud/'],
 ['Data Vault doanh nghiệp trên Redshift','https://aws.amazon.com/blogs/big-data/power-enterprise-grade-data-vaults-with-amazon-redshift-part-1/']
 ]
}];
