// Authored Vietnamese lesson; examples are educational, not executed by the website.
(() => {
 const code=text=>'<pre class="theory-code" tabindex="0" aria-label="Ví dụ Python"><code>'+text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</code></pre>';
 window.QUEST_GLUE_THEORY=[{
  id:'glue-dynamodb',icon:'🔎',title:'AWS Glue & DynamoDB: Hai cách đọc dữ liệu và Predicate Pushdown',subtitle:'Lọc ở đâu, đọc bao nhiêu, trả RCU cho phần nào?',minutes:'12–16',updated:'13/10/2026',
  memory:'KeyCondition chọn phạm vi đọc · FilterExpression loại sau khi đọc · Filter trong Glue không hoàn lại RCU.',
  flow:['Cần toàn bảng hay vài khóa?','Chọn Scan / Query / Export phù hợp','Đọc đúng phạm vi → xử lý trong Glue'],
  sections:[
   ['1. Cùng trả 100 records, chi phí đọc có thể rất khác',[
    ['Bài toán','Bảng Customers có một triệu items. Pipeline chỉ cần dữ liệu của khách C001. Nếu quét cả bảng rồi lọc ở Glue, DynamoDB vẫn phải đọc phạm vi quét. Nếu customer_id là partition key, Query có thể giới hạn phạm vi đọc vào khóa C001. Số items trả về cuối cùng không đủ để suy ra chi phí.'],
    ['Phạm vi bài','Hai cách chính dưới đây là DynamicFrame ETL connector đọc trực tiếp và boto3 Query. Phần 7 bổ sung export connector để bạn không nhầm mọi connector đều Scan hoặc mọi bài toán “ít RCU” đều phải chọn Query. Ví dụ giả định GlueContext đã được khởi tạo và job role có quyền cần thiết.']],[0,1]],
   ['2. Cách 1 — Glue DynamoDB ETL Connector',[
    ['Đọc thành DynamicFrame',code(`dyf = glueContext.create_dynamic_frame.from_options(
    connection_type="dynamodb",
    connection_options={
        "dynamodb.input.tableName": "Customers",
        "dynamodb.throughput.read.percent": "0.5"
    }
)

# Điều kiện này chạy trong Glue, sau bước đọc DynamoDB.
selected = dyf.filter(
    f=lambda row: row["customer_id"] == "C001"
)`)],
    ['Luồng cần nhớ','DynamoDB → Scan → Glue DynamicFrame → Filter. DynamicFrame ETL reader không hỗ trợ filter/predicate pushdown vào nguồn DynamoDB. Viết filter trong Glue không biến lần Scan thành Query.'],
    ['0.5 không phải đọc nửa bảng','Tham số throughput điều tiết mức read throughput mà connector sử dụng theo cơ chế của nó. Nó không có nghĩa chỉ đọc 50% items, cũng không làm giảm phạm vi dữ liệu chỉ vì filter trả ít dòng.'],
    ['Khi phù hợp','Xử lý hàng loạt hoặc phần lớn bảng, muốn dùng luồng tích hợp của Glue. Vẫn cần cân nhắc ảnh hưởng tải đọc của ứng dụng đang sử dụng bảng. Ví dụ này nói về DynamicFrame ETL reader; không suy rộng tùy chọn sang mọi connector hoặc phiên bản.']],[0,2]],
   ['3. Cách 2 — boto3 Query theo khóa',[
    ['KeyConditionExpression','Query yêu cầu giá trị bằng của partition key trên table/index được truy vấn. Nếu có sort key, có thể thêm điều kiện như khoảng giá trị hoặc begins_with. Không đưa một thuộc tính bất kỳ như city vào KeyConditionExpression nếu nó không phải key phù hợp.'],
    ['Ví dụ một trang',code(`import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table("Customers")
response = table.query(
    KeyConditionExpression=Key("customer_id").eq("C001"),
    ReturnConsumedCapacity="TOTAL"
)
records = response["Items"]
# Đây chỉ là một trang, chưa chắc là toàn bộ kết quả.`)],
    ['Biết key mới chọn lọc được','Giả sử Customers dùng customer_id làm PK và record_id làm SK: C001 có thể có nhiều items. Nếu chỉ có PK, mỗi giá trị PK xác định tối đa một item; biết đầy đủ primary key của một item thì GetItem cũng là lựa chọn cần xét.'],
    ['Nhiều khách hàng','Một Query dùng một giá trị partition key. Nhiều PK cần nhiều Query có kiểm soát, hoặc BatchGetItem khi đã biết đầy đủ khóa của từng item. Gọi boto3 trong driver không tự biến thành công việc Spark phân tán.']],[3,4,9]],
   ['4. Phân trang và chuyển sang DynamicFrame',[
    ['Không dừng chỉ vì Items rỗng','Query xử lý tối đa 1 MB mỗi lần trước filter. Có thể Items rỗng nhưng LastEvaluatedKey vẫn tồn tại. Chỉ kết thúc khi không còn khóa phân trang; đưa khóa đó vào ExclusiveStartKey ở request tiếp theo.'],
    ['Mẫu cho tập dữ liệu nhỏ',code(`import boto3
from boto3.dynamodb.conditions import Key
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.types import StructType, StructField, StringType

table = boto3.resource("dynamodb").Table("Customers")
params = {
    "KeyConditionExpression": Key("customer_id").eq("C001"),
    "ReturnConsumedCapacity": "TOTAL"
}
rows = []
consumed = 0.0
while True:
    page = table.query(**params)
    consumed += page.get("ConsumedCapacity", {}).get("CapacityUnits", 0)
    for item in page.get("Items", []):
        if len(rows) >= 5000:
            raise RuntimeError("Tập dữ liệu vượt giới hạn ví dụ; cần xử lý theo lô")
        rows.append((item["customer_id"], item["record_id"]))
    last_key = page.get("LastEvaluatedKey")
    if not last_key:
        break
    params["ExclusiveStartKey"] = last_key

# Ví dụ giả định cả PK và SK là String; schema giúp xử lý cả kết quả rỗng.
schema = StructType([
    StructField("customer_id", StringType(), False),
    StructField("record_id", StringType(), False)
])
df = glueContext.spark_session.createDataFrame(rows, schema)
dyf = DynamicFrame.fromDF(df, glueContext, "selected_customers")
print("Capacity units consumed:", consumed)`)],
    ['Giới hạn cố ý của ví dụ','Mẫu chỉ chọn hai trường key dạng String và gom tối đa 5.000 items trong bộ nhớ driver. Đây không phải cách nạp hàng triệu records. Muốn giữ các cột khác phải khai báo schema/chuẩn hóa kiểu tương ứng, đặc biệt Decimal, binary, set và dữ liệu lồng nhau.'],
    ['Khi đưa vào pipeline thật','Cần IAM cho table/index, network tới DynamoDB, cấu hình retry/backoff và giới hạn đồng thời khi nhiều key. Nếu một PK chứa quá nhiều dữ liệu, cân nhắc chia khoảng sort key hoặc xử lý theo lô; tăng số worker không tự giảm số lần đọc nguồn.']],[5,6,4]],
   ['5. Predicate Pushdown là gì và boto3 đứng ở đâu?',[
    ['Đẩy điều kiện về nguồn','Pushdown chuyển điều kiện từ engine xử lý xuống lớp đọc/nguồn có khả năng thực thi phù hợp. Mục tiêu là giảm lượng dữ liệu không cần đọc hoặc vận chuyển. Hiệu quả và phạm vi hỗ trợ phụ thuộc nguồn và connector.'],
    ['Query không phải phép biến đổi tự động của Glue','Bạn chủ động gọi Query theo key để truy xuất có chọn lọc tại nguồn. Glue không tự nhìn DynamicFrame.filter() rồi chuyển nó thành boto3 Query. Hai cách có thể cùng hướng tới giảm dữ liệu, nhưng cơ chế khác nhau.'],
    ['Lọc tại server chưa chắc tiết kiệm RCU','FilterExpression được xử lý ở DynamoDB nhưng sau bước đọc. Nó giảm items trả về, không giảm capacity đã dùng cho các items bị loại. Vì vậy đừng chỉ hỏi “filter chạy ở đâu”; hãy hỏi “điều kiện có thu hẹp phạm vi đọc không?”.'],
    ['Projection cũng dễ nhầm','ProjectionExpression chỉ lấy một số attributes không mặc định giảm read capacity của item. Payload nhỏ hơn và chi phí đọc thấp hơn là hai mục tiêu khác nhau.']],[2,7,8]],
   ['6. So sánh bằng một tình huống cụ thể',[
    ['Giả định','Một triệu items trong bảng; C001 có 100 items; chỉ 5 items mang status=ACTIVE. Đây là số liệu minh họa, không phải benchmark hay công thức tính RCU.'],
    ['Scan + filter status/customer','Phải quét phạm vi bảng rồi mới loại items; trả 5 items không có nghĩa chỉ tính tiền 5 items. Filter trong Glue còn diễn ra sau khi dữ liệu đã đến engine.'],
    ['Query PK + FilterExpression status','KeyConditionExpression thu hẹp tới 100 items của C001; FilterExpression tiếp tục loại còn 5. Phần lọc status không hoàn lại capacity của 95 items đã đọc.'],
    ['Thiết kế key/index theo truy vấn','Nếu thường xuyên cần truy cập theo tiêu chí khác, xem access pattern và index phù hợp, kèm chi phí ghi/lưu trữ. Không giả định Query được theo mọi cột như SQL. Tính capacity phải xét kích thước items và consistency; không suy ra tỷ lệ RCU chính xác chỉ từ số dòng.']],[3,7,8]],
   ['7. Ngoại lệ quan trọng — DynamoDB export connector',[
    ['Một đường đọc khác','DynamoDB export → S3 → Glue. Export to S3 hoạt động bất đồng bộ từ dữ liệu PITR và không tiêu thụ RCU của bảng. Phù hợp cân nhắc cho bulk analytics khi muốn tránh tạo tải đọc trực tiếp lên bảng.'],
    ['Không miễn phí và không Query','Cần bật PITR và quyền export/S3 phù hợp; có chi phí export và S3. Export connector không cung cấp predicate pushdown vào DynamoDB. Lọc dữ liệu sau khi xuất không biến export thành truy vấn một vài key.'],
    ['Chọn theo yêu cầu','Cần vài items/partition hiện tại với key đã biết: cân nhắc Query/GetItem. Cần phân tích lượng dữ liệu lớn và giảm ảnh hưởng read capacity của production: cân nhắc export, có chấp nhận thời gian chờ và dữ liệu tại mốc export hay không.']],[0,10]],
   ['8. Cách suy luận trong đề DEA',[
    ['Vài records, biết key','Nếu đề yêu cầu chọn lọc theo PK, hãy ưu tiên đường truy cập key phù hợp thay vì Scan rồi Filter. Với một item biết đầy đủ primary key, xét GetItem; với nhiều items cùng PK/điều kiện SK, xét Query.'],
    ['Toàn bảng, không ảnh hưởng RCU','Đừng máy móc chọn Query. Xem export to S3 và xử lý trong Glue nếu yêu cầu cho phép dữ liệu tại mốc xuất và thời gian chờ.'],
    ['Đề nhắc push_down_predicate','Phải xem nguồn cụ thể. Khả năng pruning/pushdown của S3/JDBC không tự áp dụng cho DynamoDB ETL reader. Đọc đúng connector, không chỉ thấy chữ Glue là suy ra hỗ trợ.'],
    ['Một câu chốt','Đừng di chuyển cả kho dữ liệu chỉ để lấy vài món. Chọn đúng đường đọc trước, rồi mới tối ưu bước filter. Đây là nguyên tắc suy luận theo yêu cầu, không phải bảo đảm mọi câu đề có một đáp án cố định.']],[2,3,9,10]]
  ],
  comparisons:[{title:'Điều gì thực sự giảm phạm vi đọc?',headers:['Cơ chế','Phạm vi đọc / RCU','Khi dùng'],rows:[
   ['Query + KeyConditionExpression','Có thể giảm so với Scan nhờ giới hạn key','Biết PK, có thể thêm điều kiện SK'],
   ['Query + FilterExpression','Filter không giảm RCU của items đã đọc','Lọc bổ sung trong phạm vi Query'],
   ['Scan + FilterExpression','Filter không giảm RCU của phạm vi Scan','Chấp nhận đọc rộng, cần lọc kết quả trả về'],
   ['DynamicFrame.filter() sau Scan','Không giảm capacity bước đọc nguồn','Biến đổi dữ liệu trong Glue'],
   ['ProjectionExpression','Giảm cột trả về, không mặc định giảm capacity đọc item','Giảm payload'],
   ['Export to S3 → Glue','Không tiêu thụ RCU của bảng; có chi phí export/S3','Bulk analytics, chấp nhận quy trình export']]}],
  diagrams:[{title:'Ba đường đi, ba điểm cần phân biệt',steps:['ETL connector: DynamoDB Scan → DynamicFrame → Filter trong Glue','boto3: Query theo PK/SK → phân trang → tập nhỏ → DataFrame → DynamicFrame','Export connector: dữ liệu PITR → export S3 → Glue đọc và xử lý'],note:'Hai đường đầu là trọng tâm bài. Export được thêm để tránh nhầm connector đọc trực tiếp với connector xuất dữ liệu.'}],
  recall:['Filter trả 5 items: DynamoDB có chắc chỉ tính RCU cho 5 items không?','Không. Cần biết phạm vi đã đọc trước filter. KeyConditionExpression có thể thu hẹp phạm vi; FilterExpression không giảm capacity của các items đã đọc rồi bị loại.'],
  checks:[
   ['Đặt throughput.read.percent=0.5 có nghĩa chỉ quét nửa bảng?','Không. Đây là cấu hình throughput của reader, không phải tỷ lệ items được chọn.'],
   ['Items rỗng nhưng LastEvaluatedKey có giá trị: dừng được chưa?','Chưa. Tiếp tục request với ExclusiveStartKey cho tới khi không còn khóa phân trang.'],
   ['Có thể Query city=Hanoi nếu city không phải key/index phù hợp không?','Không đưa city vào KeyConditionExpression tùy ý. Cần thiết kế access pattern/index hoặc chấp nhận cách đọc khác.'],
   ['Toàn bảng lớn, muốn tránh tiêu thụ RCU production: chỉ có Scan hay Query?','Còn export to S3, không tiêu thụ RCU của bảng. Cần PITR, quyền phù hợp, thời gian chờ và ngân sách export/S3.']
  ],
  sources:[
   ['Glue DynamoDB connectors','glue/latest/dg/aws-glue-programming-etl-connect-dynamodb-home.html'],
   ['DynamoDB Query API','amazondynamodb/latest/APIReference/API_Query.html'],
   ['Glue pushdown theo nguồn','glue/latest/dg/aws-glue-programming-pushdown.html'],
   ['Key condition expressions','amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html'],
   ['boto3 Table.query','https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/query.html'],
   ['Query pagination','amazondynamodb/latest/developerguide/Query.Pagination.html'],
   ['DynamicFrame.fromDF','glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame.html'],
   ['Query FilterExpression','amazondynamodb/latest/developerguide/Query.FilterExpression.html'],
   ['Projection expressions','amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html'],
   ['DynamoDB GetItem','amazondynamodb/latest/APIReference/API_GetItem.html'],
   ['Export to S3','amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html']
  ]
 }];
})();
