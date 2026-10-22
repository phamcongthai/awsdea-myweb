# awsdea-myweb

## World 3 — Data Engineering / NovaMart

Vào **Architect Quest → Data Engineering**, hoặc `/data.html`. Tám lab đều có cấu hình ban đầu cần sửa, engine chạy trên dữ liệu, output artifacts, trace, XP một lần và 3 câu tiếng Anh với giải thích tiếng Việt. Bật **Luyện tự do** để truy cập cả 8 ngay từ đầu.

| Lab | Chức năng đã triển khai |
| --- | --- |
| S3 Versioning & Recovery | Enabled/Suspended/null versions, ghi đè, delete marker, restore, retention, policy deny, kiểm tra nội dung báo cáo |
| S3 Event-Driven Pipeline | Prefix/suffix, invocation/execution permissions, validation CSV, processed/quarantine, duplicate events, idempotency, logs; đường nối EventBridge/SQS tùy chọn |
| Athena Data Lake | Crawler tạo schema metadata; SQL JOIN/GROUP BY/SUM/AVG/COUNT/WHERE/ORDER/LIMIT tính từ nguồn, result location/managed results |
| Athena Optimization | Chuyển representation CSV/Parquet, partition/column pruning, file overhead, grid partition và baseline cùng kết quả |
| Glue ETL Workflow | Crawler-success workflow/trigger; join/filter/cast/project/derive/aggregate qua SQL, dedup, Parquet output, source bookmark, file mới/đổi, reset, append/upsert và lỗi sau write |
| Step Functions Orchestration | State editor, Task/Choice/Parallel/Map/Wait/Pass/Fail/Succeed, Retry/Catch, JSONPath subset, fault injection và trace input/output |
| Redshift Warehouse Loading | COPY CSV/virtual Parquet, schema/mapping/NULL/DECIMAL/date, load atomic, SQL, UNLOAD và thử overflow |
| Redshift Query Optimization | Hash distribution, EVEN/KEY/ALL/AUTO, skew, collocation/redistribution, slice lanes, modeled work, statistics/sort state |

React Flow hỗ trợ kéo/pan/pinch, thêm bằng chạm và nối bằng chạm hai cổng; inventory/configuration là bottom sheet trên điện thoại. Dataset Explorer hiển thị nguồn và output, sửa/upload CSV. Ôn tích lũy ghi đúng/sai, dịch vụ yếu và số lần sai lặp lại. Tiến độ dùng chung `architect-quest-v1` với Bedrock/Networking và không xóa progress cũ. Khóa ôn đầu ngày vẫn áp dụng.

### Cài đặt, chạy và build

Yêu cầu Node.js 22+; không cần AWS credentials, tài khoản cloud hay backend.

```powershell
npm ci
npm run dev
# http://127.0.0.1:4173/data.html
npm run build:data
powershell -NoProfile -ExecutionPolicy Bypass -File ./build-architect.ps1
```

Commit source, lockfile và các bundle trong `public`. Vercel tiếp tục phục vụ `public` đã build sẵn; không thay cấu hình hosting. Tải đầy đủ qua HTTPS/localhost một lần để service worker cache cả ba thế giới. Nhạc và ảnh đề cũ không thuộc cache lab.

### Kiểm thử

```powershell
npm run test:data
npm run test:data:browser
node test-architect-bedrock.mjs
node test-architect-network.mjs
node test-architect-missions.mjs
node verify-architect.cjs
```

Vitest runner xử lý ký tự `#` trong đường dẫn Windows bằng junction tạm ổn định, không đổi tên repo. Playwright dùng Chrome tại đường dẫn Windows trong `playwright.config.mjs`; đặt `CHROME_PATH` nếu browser nằm nơi khác. Browser suite kiểm tra 390px touch-only completion, thêm/nối node bằng chạm, 360px/nằm ngang/tablet, sửa dữ liệu, persistence, offline và tám lab. Screenshots/artifacts nằm trong `.qa/`.

Đợt kiểm tra triển khai: 85 test Vitest, 6 kịch bản Playwright và 180 kiểm tra hồi quy Architect Quest (35 Bedrock + 48 Networking + 37 integration + 60 browser). Kiểm tra browser dùng Chrome headless mô phỏng touch/viewport; chưa kiểm tra trên thiết bị iOS/Android vật lý.

### Kiến trúc và mở rộng

- `src/data-app.jsx`, `src/data.css`: React UI, React Flow, map, inspector, trace playback, datasets và quiz. Animation chỉ đọc trace đã tính.
- `public/architect/data-common.mjs`: typed JSDoc contracts, dataset seed 42, CSV, context, IAM và trace.
- `data-storage.mjs`, `data-analytics.mjs`, `data-states.mjs`, `data-redshift.mjs`: các engine độc lập UI. `data-engine.mjs` dispatch và chuẩn hóa kết quả/lỗi.
- `data-sql.mjs`: SELECT subset qua AlaSQL trong database riêng mỗi lần; giới hạn nguồn/hàm/Cartesian product. `data-missions.mjs`: service definitions, ports, broken starts và business verification. `data-questions.mjs`: 24 câu tự biên soạn.
- `build-data.mjs`: esbuild bundle local React/React Flow/AlaSQL, giữ giấy phép. `build-architect.ps1`: shared assets và content-hashed offline manifest.
- Thêm service: khai báo definition/default config/operations/permissions, thêm cặp port hợp lệ, implement runtime handler và lỗi cụ thể, cập nhật tests/icon provenance. Không thêm kết nối chỉ để trang trí.
- Thêm mission: khai báo metadata, fixture đúng và khởi đầu lỗi, business checks dựa trên output thực, câu hỏi, unit + browser coverage. Kiểm chứng cả cấu hình sai và nhiều thiết kế đúng.
- Khi cập nhật hành vi AWS: đối chiếu nguồn chính thức ở `public/architect/data-references.md`, sửa engine/test trước, cập nhật giới hạn trong `data-guide.html`, build lại bundle và offline manifest.

### Giả định và giới hạn

Dữ liệu mẫu nhỏ (240 orders), lưu localStorage; chưa có đồng bộ thiết bị hoặc IndexedDB. SQL là subset, không phải Trino/Redshift đầy đủ. Parquet là representation theo cột trong bộ nhớ, không phải binary codec. Scan/work dùng mô hình công khai, không phải AWS billing/latency. IAM đơn giản hóa action/resource/deny; Lambda resource policy dùng cấu hình minh họa. ASL hỗ trợ subset, parallel/map dùng thực thi xác định và trace branch, không chạy cloud concurrency. Standard/Express chưa mô phỏng đầy đủ quota/delivery. Glue Workflow/Trigger hỗ trợ crawler-success condition; scheduling cron, CTAS SQL, Distributed Map và mọi query-plan strategy AWS chưa được triển khai. Redshift DECIMAL giới hạn precision ≤15 và dùng Number; không dùng làm công cụ tài chính chính xác. Xem [hướng dẫn đầy đủ](public/architect/data-guide.html) và [nguồn AWS](public/architect/data-references.md).

## AWS Architect Quest

Mở **Architect Quest** trong menu Data Quest, hoặc truy cập `/architect.html`. Lab gồm 7 nhiệm vụ Bedrock và 9 nhiệm vụ Networking, chạy hoàn toàn trong trình duyệt, không cần tài khoản AWS/API key và không phát sinh phí AWS.

- Kéo dịch vụ vào canvas (điện thoại: chạm để thêm), nối cổng ra → cổng vào, chọn node để sửa cấu hình. Có pan/zoom/pinch, undo/redo và bảng cấu hình trên điện thoại.
- Chạy thử để xem trace; kiểm chứng chạy các tình huống nghiệp vụ trước khi cấp XP và mở màn tiếp. Pause/Step điều khiển phát trace tính từ engine.
- Bedrock: RAG, chunk/index, stale data và sync, metadata/hybrid retrieval, agent gọi Lambda/DynamoDB, quyền và guardrail. Networking: IPv4, route, SG/NACL, NAT, endpoints, DNS, CloudFront/S3/OAC, ALB/NLB và WAF.
- 48 câu củng cố có giải thích tiếng Việt. Tự lưu lab riêng trong localStorage; có xuất/nhập JSON. Khóa ôn đầu ngày của web vẫn áp dụng.
- Icon SVG AWS chính thức lưu local, nguồn trong `public/architect/icons/SOURCE.txt`. Sau lần tải qua HTTPS/localhost hoàn tất, lab có thể tải lại và chơi offline. Nhạc nền và ảnh của ngân hàng ôn tập cũ không nằm trong cache lab.

Chạy local bằng Node.js:

```powershell
node ./serve-architect.cjs
# Mở http://127.0.0.1:4173/architect.html
```

Không mở lab trực tiếp bằng `file://` vì dùng ES modules. Triển khai Vercel như hướng dẫn bên dưới; không thêm backend hay dependencies. Sau sửa lab, chạy `./build-architect.ps1` để cập nhật phiên bản cache offline. `build-quest.ps1` cũng gọi bước này.

Kiểm tra engine và giao diện (bài kiểm tra trình duyệt dùng Chrome trên Windows):

```powershell
node ./test-architect-bedrock.mjs
node ./test-architect-network.mjs
node ./test-architect-missions.mjs
node ./verify-architect.cjs
```

Phạm vi thực tế: đây là mô phỏng giáo dục xác định, không phải AWS/LLM thật. RAG dùng thuật toán từ khóa/từ đồng nghĩa; IAM và networking chỉ triển khai các quy tắc trong bài. Route target khai báo trong cấu hình route, DNS target trong records; không nối dây thay cho các trường này. Hiện chưa có SQS/CloudWatch runtime, editor rule dạng bảng đầy đủ, hoặc mô phỏng toàn bộ giao thức mạng. Xem `public/architect/README.html` để biết giới hạn và tài liệu AWS đối chiếu. Giao diện dùng ES modules/CSS thuần để tích hợp repo tĩnh và hoạt động offline.

AWS Data Quest — học AWS Data Engineer qua 260 câu hỏi, chia theo chủ đề và phiên cam kết khoảng 40 câu.

- Playlist **Nhạc cổ điển** gồm Für Elise, Moonlight Sonata (chương I), Clair de lune, Nocturne Op. 9 No. 2 và Canon in D (piano), thêm Swan Lake (kết màn II), Pathétique (chương II), Symphony No. 5 (chương I), Eine kleine Nachtmusik (chương I), Turkish March và Piano Sonata No. 16 K. 545 (chương I), tổng cộng **11 bản**. Bản thu MP3 nằm trong `public/music`, kèm nguồn và giấy phép ở `CREDITS.txt`. Có chọn bài, trước/sau, tự chuyển và lặp danh sách; ghi nhớ bài và âm lượng. Mặc định bật mỗi lần mở trang (65% nếu chưa chỉnh), phát sau lần chạm đầu tiên nếu trình duyệt chặn autoplay. Nút tắt luôn ở góc, kể cả ôn đầu ngày. Mở HTML trực tiếp cần giữ thư mục `public/music` bên cạnh.

- Lời giải tiếng Việt riêng cho 1.082 lựa chọn, bấm đáp án sau khi kiểm tra để xem.
- Menu **Lý thuyết nhanh**: 16 chương gom trong 5 nhóm mở/thu gọn: Lưu trữ & backup; Cơ sở dữ liệu; ETL & kiến trúc dữ liệu; Compute & Network; Triển khai & CI/CD. Giữ dấu đã đọc cũ và điều hướng giữa các chương cùng nhóm. Bài Glue & DynamoDB so sánh ETL connector, Query và export, có mẫu Python phân trang/chuyển DynamicFrame, bảng RCU và câu tự nhẩm. Bài Athena & pushdown giải thích luồng metadata/data, pruning theo partition/cột/khối, ví dụ min/max và phân tích lựa chọn Parquet/ORC. Các bài có nguồn chính thức AWS/Trino/Apache, sơ đồ offline và mục lục cho nội dung chuyên sâu.
- Nút đánh dấu đã đọc lưu riêng trong trình duyệt (`data-quest-theory-v1`), không cộng điểm luyện tập và chưa nằm trong bản sao JSON. Sổ tay tuân theo khóa ôn đầu ngày, mở từ menu khi không có phiên đang làm.
- Giao diện phù hợp máy tính và điện thoại, có hiệu ứng, combo và điểm kinh nghiệm.
- Ôn đầu ngày hiển thị tỷ lệ đúng trên câu đã chấm và số sai cho phép. Nếu không còn khả năng đạt trên 90%, tự khởi động lại toàn bộ lượt ngay, đảo lại câu hỏi và từng bộ đáp án; lượt mới được lưu để tiếp tục sau khi tải lại trang. Sau reset có nút xem câu vừa sai, giữ nguyên lựa chọn và thứ tự đáp án của lượt trước để đối chiếu.
- Tự lưu tiến độ trong trình duyệt; hỗ trợ sao lưu và khôi phục bằng JSON.
- Phòng thi có 5 đề, mỗi đề 65 câu: đề 1–4 trùng ngân hàng ôn tập; đề 5 từ Tutorials Dojo. Thi thử đề 1–4 có 120 phút, đề 5 có 130 phút theo nguồn. Review không tính giờ, kiểm tra đáp án và mở lời giải từng câu. Sau khi bấm kiểm tra Review, các lựa chọn và nút bỏ lựa chọn được khóa, kể cả khi quay lại câu hoặc tải lại trang. Câu sai được lưu ngay vào ôn đầu ngày dù chưa nộp bài.

Phòng thi nằm tại `realtest.html`, có lối vào từ menu Data Quest. Bài thi đang làm và lịch sử lưu riêng trong trình duyệt, không ảnh hưởng điểm luyện tập. Chế độ thi thử không dừng đồng hồ khi đóng trang; Review có thể thoát và tiếp tục không giới hạn thời gian. Lời giải sau thi giữ nguyên từ đề nhập vào (tiếng Anh); ảnh được phục vụ cùng website.

Dữ liệu kiểm tra đã chuẩn hóa ở `exam-bank/`; `build-exams.ps1` tạo trang thi và tài nguyên trong `public/exams/`. `import-realtests.cjs` chỉ cần khi nhập lại từ bốn file HTML trong `realtest/Tests`. Các trang web thô đã lưu cùng tài nguyên của nhà cung cấp trong `realtest/` không đưa lên repo.

## Deploy lên Vercel

1. Import repository `phamcongthai/awsdea-myweb` vào Vercel.
2. Giữ Root Directory là thư mục gốc repository, Framework Preset là **Other**.
3. File `vercel.json` đã cấu hình Output Directory là `public`, không cần cài dependencies hoặc chạy build.
4. Chọn **Deploy**.

Thư mục `public` đã chứa bản web sẵn dùng và bốn đề gốc. Không cần biến môi trường hoặc backend.

Tài liệu cấu hình: https://vercel.com/docs/project-configuration

## Chạy và cập nhật ở máy local

Mở `AWS Data Quest.html` để học trực tiếp hoặc phục vụ thư mục `public` bằng HTTP server để xem bản web.

Sau khi sửa `quest.js`, `quest-fun.js`, `quest.css`, `quest-shell.html` hoặc lời giải tiếng Việt, chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./build-quest.ps1
```

Lệnh này cập nhật `quest-data.js`, `AWS Data Quest.html`, `public/index.html` và các đề gốc trong `public`. Commit cả source lẫn bản `public` được tạo mới trước khi push.

Kiểm tra giao diện và dữ liệu trên Windows có Node.js và Chrome:

```powershell
node ./verify-quest.cjs
```

Kết quả kiểm thử trong `.qa` chỉ lưu local, không đưa lên GitHub.

## Tiến độ học

Tiến độ lưu theo trình duyệt và địa chỉ website, chưa đồng bộ giữa máy tính và điện thoại. Khi chuyển từ file HTML sang website hoặc sang thiết bị khác, dùng **Sao lưu** ở nơi cũ và **Khôi phục** tại nơi mới.

## Ôn tập bắt buộc đầu ngày

Ô ngày ở góc trên dùng ngày trên đồng hồ thiết bị, quy đổi sang `Asia/Ho_Chi_Minh`. Sang ngày mới, cả khu luyện tập và phòng thi bị khóa nếu có câu từng sai. Lượt ôn gồm tất cả câu đã ghi nhận sai trong luyện tập cùng câu sai/bỏ trống của các bài thi đã nộp. Không có câu sai thì mở khóa ngay.

Phải hoàn thành toàn bộ lượt và đạt **trên 90%** để mở khóa trong ngày; đúng 90% chưa đạt. Nếu chưa đạt, làm lại toàn bộ nhóm câu với thứ tự mới. Đóng trang giữa lượt vẫn giữ tiến độ. Phiên luyện tập đang dở được giữ nguyên; đồng hồ của bài thi 120 phút vẫn chạy theo quy tắc phòng thi.

Các câu từng sai không bị xóa khỏi bộ nhớ khi trả lời đúng lại. Câu sai phát sinh sau khi đã mở khóa được thêm cho ngày kế tiếp. Dữ liệu cũ được thu thập từ kết quả hiện có; những lần sai đã bị kết quả đúng mới ghi đè trước bản cập nhật không thể phục hồi đầy đủ. Thuộc tính `everWrong` mới đi cùng bản sao tiến độ luyện tập. Trạng thái mở khóa và lượt ôn đầu ngày lưu riêng trong localStorage, chưa nằm trong file sao lưu luyện tập.

`build-daily.ps1` tạo khóa đáp án nhẹ và `public/daily-bank.js`; dữ liệu lời giải chỉ tải khi bắt đầu ôn đầu ngày. Kiểm tra chức năng bằng `node verify-daily.cjs` (Chrome trên Windows).

Kiểm tra ánh xạ đáp án ôn đầu ngày: `verify-daily-mapping.cjs` đối chiếu 520 câu với ngân hàng nguồn và kiểm tra thao tác chọn/chấm/mở lời giải trên trình duyệt với hai thứ tự đảo cho mỗi câu. Đây là kiểm tra tính toàn vẹn và chấm điểm, không phải thẩm định kiến thức AWS của bộ đề.

Nhập lại đề 5 từ trang Tutorials Dojo đã lưu: `node import-dojo.mjs`. File HTML và tài nguyên gốc trong `DOJOS/` không đưa lên repo; dữ liệu đề và hình cần thiết được đóng gói trong `exam-bank/`. Sau khi nhập, chạy `build-quest.ps1` để cập nhật phòng thi và ngân hàng ôn đầu ngày.

Flashcard nằm trong menu **Flashcard · Nhớ nhanh**: 64 thẻ tiếng Việt được biên soạn riêng, chia 8 chủ đề và có liên kết tài liệu AWS ở mặt sau. Có tìm kiếm, yêu thích, lọc thẻ mới/đến hạn/chưa nhớ, đảo thứ tự và phiên 20/40/toàn bộ thẻ phù hợp. Tự đánh giá đã nhớ đặt hẹn sau 1/3/7/14/30 ngày theo streak; chưa nhớ đặt hẹn sau 10 phút. Lịch này là quy tắc ôn đơn giản, không phải dự báo trí nhớ hay điểm thi. Flashcard được đóng gói trong HTML, dùng được khi đã tải trang; nguồn AWS cần mạng.

Tiến độ flashcard lưu riêng ở `data-quest-flashcards-v1` trên trình duyệt; các nút xuất/nhập tiến độ luyện tập hiện có không bao gồm dữ liệu flashcard. Kiểm tra bằng `node verify-flashcards.mjs`.

Phòng thi lưu riêng bài dở của từng đề. **Lưu & thoát** rồi chọn đề khác; **Tiếp tục đề này** phục hồi câu đang làm, đáp án, thứ tự đảo và đánh dấu. Bài thi có giờ giữ nguyên deadline khi chuyển đề; Review vẫn không giới hạn thời gian. Các câu sai trong Review đang tạm lưu vẫn vào ôn đầu ngày. Kiểm tra chuyển đề bằng `node verify-exam-switch.mjs`.

Trong **♫ Góc nhạc → An Coong Piano**, có 6 playlist từ kênh chính thức `https://www.youtube.com/@AnCoongPiano`: tuyển tập hay nhất, piano cover, cover nước ngoài, OST, Sơn Tùng và Christmas. Danh sách lớn nhất có 167 video tại thời điểm đối chiếu 19/10/2026; các playlist có thể trùng bài và một số video có thể không phát được tùy quyền nhúng/khu vực. Nhạc phát qua YouTube IFrame Player API, cần Internet; không sao chép hoặc lưu MP3 của An Coong vào repo.

Trình phát YouTube luôn hiển thị khi đang bật An Coong (tối thiểu 200 × 200px); thu gọn bảng chọn vẫn giữ video. Nút tắt chung dừng và ẩn trình phát đang tạm dừng. Chọn nguồn, playlist, vị trí bài và âm lượng được lưu cùng tùy chọn nhạc cũ; 11 bản cổ điển vẫn phát từ file được đóng gói. Bộ phát dùng chung cho luyện tập, flashcard, phòng thi, lab và ôn đầu ngày. Kiểm tra hồi quy cổ điển: `node verify-music.cjs`; kiểm tra phát YouTube thật, điều khiển, lưu tùy chọn và lỗi mạng: `node verify-an-coong.mjs` (cần Internet).

Review phát âm báo đúng bằng cùng bộ tạo âm của luyện tập, chỉ khi bấm kiểm tra một câu mới và trả lời đúng. Nút **Âm thanh: Bật/Tắt** nằm ở đầu bài Review, dùng chung tùy chọn đã lưu của luyện tập và độc lập với nhạc nền. Quay lại câu đã chấm, tải lại trang và chế độ thi tính giờ không phát âm báo đúng. Kiểm tra Web Audio thực bằng `node verify-review-sound.mjs`.

Ghi chú theo câu: biểu tượng 📝 ở góc câu trong luyện tập, ôn đầu ngày và Review (không hiện trong thi tính giờ). Nội dung tối đa 1500 ký tự, tự lưu riêng trên cùng trình duyệt theo nội dung câu hỏi để giữ đúng ghi chú khi đảo thứ tự và chia sẻ giữa các câu trùng. Xóa hết nội dung để xóa ghi chú. Dữ liệu ghi chú không nằm trong bản xuất tiến độ luyện tập hiện có; xóa bộ nhớ website sẽ xóa ghi chú. Kiểm tra bằng `node verify-question-notes.mjs`.

Hardcore mode: mỗi lượt mới xáo 65 câu và chia 6 chặng 12–12–12–12–12–5. Sai chỉ xóa đáp án/đánh dấu/kết quả trong chặng hiện tại và đảo lại câu, đáp án của đúng nhóm đó; các chặng trước được giữ. Nhóm câu cố định trong một lượt, được chia ngẫu nhiên lại khi bắt đầu lượt Hardcore mới. Ghi chú và lịch sử từng sai vẫn giữ. Phải kiểm tra đúng cả 65 câu mới nộp được và nhận huy hiệu vàng, không nhảy qua câu chưa kiểm tra.

Hardcore có đồng hồ 35 phút. Khóa thoát/chuyển đề trong ứng dụng đến khi đúng đủ 65 câu. Sai không đặt lại đồng hồ. Hết giờ xóa tiến độ cả 6 chặng, đảo toàn bộ 65 câu và đáp án, chia nhóm mới và cấp 35 phút mới. Đồng hồ và nhóm câu giữ nguyên khi tải lại trang; trước khi đóng/rời trang dùng cảnh báo beforeunload của trình duyệt (không thể ngăn người dùng đóng tab). Bài Hardcore cũ chưa có deadline được cấp 35 phút khi mở lại lần đầu.
