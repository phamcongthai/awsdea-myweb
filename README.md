# awsdea-myweb

AWS Data Quest — học AWS Data Engineer qua 260 câu hỏi, chia theo chủ đề và phiên cam kết khoảng 40 câu.

- Lời giải tiếng Việt riêng cho 1.082 lựa chọn, bấm đáp án sau khi kiểm tra để xem.
- Giao diện phù hợp máy tính và điện thoại, có hiệu ứng, combo và điểm kinh nghiệm.
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
