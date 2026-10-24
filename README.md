# AWS Quest — luyện tập 3 chứng chỉ

Chọn chứng chỉ trên header:

| Chứng chỉ | Luyện theo chủ đề | Phòng thi |
| --- | --- | --- |
| Data Engineer Associate | 260 câu gốc + LOG đặc biệt | 5 đề × 65 câu |
| Solutions Architect Associate | 390 câu, 11 phiên tối đa 40 câu | 6 đề × 65 câu |
| Cloud Practitioner | 340 câu, 11 phiên tối đa 40 câu | 1 bài chẩn đoán 15 câu + 5 đề × 65 câu |

Toàn bộ đề SAA/CLF vừa nhập được dùng cho cả luyện tập và phòng thi. Chia nhóm theo domain của nguồn, không thay đổi đáp án gốc. Lời giải SAA/CLF hiện giữ tiếng Anh từ nguồn; bộ DEA giữ lời giải tiếng Việt hiện có. Hình minh họa bên ngoài cần Internet. Flashcard SAA/CLF được tạo từ câu hỏi và đáp án đúng của chính các bộ đề này; không phải nội dung Quizlet.

## Tài khoản và tiến độ

Đăng nhập email/mật khẩu qua Supabase; phiên đăng nhập được giữ giữa các lần mở trình duyệt. Tiến độ học lưu trong DB theo tài khoản, tải lại được trên thiết bị khác. Dữ liệu học không lưu trong localStorage ở production; RAM chỉ là bộ đệm trong lúc gửi. Khi lỗi mạng hoặc có xung đột phiên bản, giao diện chặn và hướng dẫn xử lý.

DEA giữ nguyên key cũ; SAA/CLF dùng tiền tố `cert:saa:` / `cert:clf:` trong snapshot `quest_learning_state.payload`. Tiến độ luyện, bài thi, câu sai đầu ngày, flashcard và ghi chú câu hỏi tách theo chứng chỉ. Tên/avatar, sổ tay cá nhân và cài đặt nhạc dùng chung tài khoản. Lựa chọn chứng chỉ gần nhất lưu trong DB; URL `?cert=dea|saa|clf` có ưu tiên khi truy cập trực tiếp.

DB mới: chạy lần lượt `supabase/schema.sql`, `supabase/leaderboard.sql`, `supabase/multi-cert.sql` trong Supabase SQL Editor. DB đã chạy hai file đầu chỉ cần chạy **multi-cert.sql** để có xếp hạng SAA/CLF. Không cần service-role key. Script không xóa tiến độ hoặc hồ sơ cũ.

Rank tính riêng từng chứng chỉ từ tiến độ đã lưu: câu đúng 10 điểm; nắm chắc thêm 15; điểm thi có giờ tốt nhất mỗi đề × 4; hoàn thành Hardcore 300/đề; Ultra 800/đề. Không cộng lặp phần thưởng khi chơi lại. Review không có điểm thi có giờ. Điểm phản ánh trạng thái ứng dụng, không phải hệ thống chống gian lận hay dự đoán phần trăm đỗ.

## Chế độ học

- Luyện chủ đề: phiên khoảng 40 câu, chia chặng nhỏ; bấm từng đáp án sau kiểm tra để đọc giải thích.
- Review: không tính giờ, kiểm tra từng câu, khóa đáp án đã chấm, lưu bài dở; câu sai vào ôn đầu ngày.
- Thi có giờ: thời lượng theo cấu hình từng bộ đề; chấm khi nộp.
- Hardcore: khởi đầu 35 phút, chặng tối đa 12 câu; sai chỉ làm lại chặng đó và đảo thứ tự; qua chặng cộng 10 phút một lần. Có lưu và thoát; thời gian tiếp tục chạy khi rời trang. Hết giờ làm lại cả lượt.
- Ultra Hardcore: cảnh báo xác nhận trước khi vào; 35 phút, sai một câu hoặc hết giờ làm lại toàn bộ; chặn thoát trong ứng dụng.
- Ôn đầu ngày: nhắc làm lại các câu từng sai của chứng chỉ đang chọn; đạt **trên 90%** để mở khóa hoặc bấm **Bỏ qua hôm nay** ở màn hình bắt đầu/trong lượt ôn. Bỏ qua lưu theo tài khoản và chứng chỉ, không tính là vượt bài ôn, không xóa câu sai; ngày sau sẽ nhắc lại. Hiện tỷ lệ trong khi làm; vượt số lỗi cho phép sẽ reset ngay. Đảo câu/đáp án nhưng chấm theo chỉ số đáp án gốc.
- Flashcard, lý thuyết AWS, ghi chú từng câu, sổ tay, nhạc và hiệu ứng vẫn dùng được. Sổ tay hỗ trợ chữ + ảnh đính kèm bên dưới: dán Ctrl+V/⌘V hoặc chọn file trên điện thoại, xem lại theo tài khoản trên thiết bị khác. Chạy thêm `supabase/notebook-images.sql` để bật kho ảnh riêng tư; không đổi dữ liệu chữ cũ. Thư viện lý thuyết AWS dùng chung.

Lab kéo thả đã gỡ khỏi bản xuất bản. Các URL `/architect.html`, `/data.html` và `/architect/*` chuyển về trang học trên Vercel. Service worker cũ được thay bằng worker dọn cache và tự hủy đăng ký. Mã lab lịch sử ngoài `public/` không được triển khai.

## Build và triển khai

Vercel xuất thư mục `public/`, không cần build trên máy chủ. Commit các file đã sinh trong `public/`.

```powershell
# Khi cập nhật nguồn SAA/CLF trong Newceft/ (không commit nguồn HTML thô)
node import-certificates.cjs
# Sinh HTML chính, đề thi, daily runtime và các tài nguyên dùng chung
powershell -NoProfile -ExecutionPolicy Bypass -File build-quest.ps1
# Chạy web cục bộ
node serve-architect.cjs
```

Trang chủ: `/index.html`; phòng thi: `/realtest.html?cert=saa` (hoặc dea/clf). `AWS Data Quest.html` ở root cũng mở được khi máy có Internet để đăng nhập. Xem thêm [cấu hình Supabase](SUPABASE-SETUP.md).

## Kiểm tra

Các test trình duyệt dùng Playwright và Chrome; `?qa=1` bật fixture riêng trong localStorage để không ghi dữ liệu học thật. Không dùng chế độ QA để kiểm tra lưu DB; test cloud dùng thêm `cloud=1` và mô phỏng REST/auth.

```powershell
node scripts/test-certificates.mjs
node scripts/test-cloud.mjs
node scripts/test-social.mjs
node scripts/test-header.mjs
node scripts/test-hardcore-bonus.mjs
```

`test-certificates` kiểm tra số lượng, 12 đề mới, mapping đáp án, khóa Review, CLF 15 câu, cộng giờ, chuyển chứng chỉ, cách ly tiến độ, flashcard và ôn đầu ngày. `test-cloud` kiểm tra khôi phục giữa hai thiết bị, key DB theo chứng chỉ, bảo toàn DEA, xung đột và cách ly tài khoản. SQL có test PostgreSQL qua PGlite: cài `@electric-sql/pglite` vào môi trường kiểm tra, rồi chạy `node scripts/test-multi-cert-sql.mjs`; có thể chỉ định đường dẫn module qua `QUEST_PGLITE_MODULE`.
