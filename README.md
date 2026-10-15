# awsdea-myweb

AWS Data Quest — học AWS Data Engineer qua 260 câu hỏi, chia theo chủ đề và phiên cam kết khoảng 40 câu.

- Playlist **Nhạc cổ điển** gồm Für Elise, Moonlight Sonata (chương I), Clair de lune, Nocturne Op. 9 No. 2 và Canon in D (piano). Bản thu MP3 nằm trong `public/music`, kèm nguồn và giấy phép ở `CREDITS.txt`. Có chọn bài, trước/sau, tự chuyển và lặp danh sách; ghi nhớ bài và âm lượng. Mặc định bật mỗi lần mở trang (65% nếu chưa chỉnh), phát sau lần chạm đầu tiên nếu trình duyệt chặn autoplay. Nút tắt luôn ở góc, kể cả ôn đầu ngày. Mở HTML trực tiếp cần giữ thư mục `public/music` bên cạnh.

- Lời giải tiếng Việt riêng cho 1.082 lựa chọn, bấm đáp án sau khi kiểm tra để xem.
- Menu **Lý thuyết nhanh**: 16 chương gom trong 5 nhóm mở/thu gọn: Lưu trữ & backup; Cơ sở dữ liệu; ETL & kiến trúc dữ liệu; Compute & Network; Triển khai & CI/CD. Giữ dấu đã đọc cũ và điều hướng giữa các chương cùng nhóm. Bài Glue & DynamoDB so sánh ETL connector, Query và export, có mẫu Python phân trang/chuyển DynamicFrame, bảng RCU và câu tự nhẩm. Bài Athena & pushdown giải thích luồng metadata/data, pruning theo partition/cột/khối, ví dụ min/max và phân tích lựa chọn Parquet/ORC. Các bài có nguồn chính thức AWS/Trino/Apache, sơ đồ offline và mục lục cho nội dung chuyên sâu.
- Nút đánh dấu đã đọc lưu riêng trong trình duyệt (`data-quest-theory-v1`), không cộng điểm luyện tập và chưa nằm trong bản sao JSON. Sổ tay tuân theo khóa ôn đầu ngày, mở từ menu khi không có phiên đang làm.
- Giao diện phù hợp máy tính và điện thoại, có hiệu ứng, combo và điểm kinh nghiệm.
- Ôn đầu ngày hiển thị tỷ lệ đúng trên câu đã chấm và số sai cho phép. Nếu không còn khả năng đạt trên 90%, tự khởi động lại toàn bộ lượt ngay, đảo lại câu hỏi và từng bộ đáp án; lượt mới được lưu để tiếp tục sau khi tải lại trang. Sau reset có nút xem câu vừa sai, giữ nguyên lựa chọn và thứ tự đáp án của lượt trước để đối chiếu.
- Tự lưu tiến độ trong trình duyệt; hỗ trợ sao lưu và khôi phục bằng JSON.
- Phòng thi riêng: 4 đề mới, mỗi đề 65 câu / 120 phút. Đánh dấu, quay lại sửa đáp án, tự nộp khi hết giờ, chấm và mở lời giải sau khi nộp.

Phòng thi nằm tại `realtest.html`, có lối vào từ menu Data Quest. Bài thi đang làm và lịch sử lưu riêng trong trình duyệt, không ảnh hưởng điểm luyện tập. Đồng hồ không dừng khi đóng trang. Lời giải sau thi giữ nguyên từ đề nhập vào (tiếng Anh); ảnh được phục vụ cùng website.

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
