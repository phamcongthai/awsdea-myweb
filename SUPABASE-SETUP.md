# Supabase: tài khoản và dữ liệu học

Email + mật khẩu. Mỗi tài khoản lưu trên PostgreSQL Supabase: luyện tập, câu sai đầu ngày, ghi chú, flashcard, lịch sử thi, bài dở, thứ tự câu/đáp án, deadline Hardcore, huy hiệu và lab.

Sổ tay cá nhân trên header lưu trong cùng payload riêng tư theo tài khoản, khóa `quest-notebook-v1` (QA: `quest-notebook-test-v1`). Ghi chú dạng văn bản thuần tối đa 20.000 ký tự và mốc đọc gần nhất đều đồng bộ DB; không cần tạo bảng mới. Icon có chấm đỏ và rung nhẹ khi chưa đọc mốc gần nhất lúc 07:00/19:00 giờ Việt Nam. Mở sổ tay đánh dấu đã đọc; nếu đang mở lúc sang mốc mới thì tính là đang đọc. Trước 07:00 dùng mốc 19:00 hôm trước, nên qua nửa đêm không nhắc thêm lần thứ ba. Timer kiểm tra đúng mốc và kiểm tra lại khi trở về tab; khi đóng web không có push notification, lời nhắc hiện khi quay lại. Tôn trọng reduced motion và tùy chọn tắt hiệu ứng.

## Cấu hình

1. Chạy `supabase/schema.sql` trong Supabase → SQL Editor → New query. Script tạo bảng, phân quyền đọc của chính mình và hàm ghi kiểm tra phiên bản để chống ghi đè từ hai thiết bị. Có thể chạy lại.
2. Authentication → URL Configuration: đặt Site URL thành domain Vercel thật. Thêm `/`, `/index.html`, `/realtest.html` vào Redirect URLs trên domain đó để xác nhận email trở về website.
3. Email provider đang bật, project hiện yêu cầu xác nhận email trước lần đăng nhập đầu tiên. Không cần Google/OAuth.
4. Chạy `supabase/leaderboard.sql` để bật hồ sơ/avatar và xếp hạng. Script tính lại điểm từ dữ liệu DB đang có, giữ nguyên tiến độ và tên/avatar đã đặt nếu chạy lại.

Không cần service_role/Secret key. Publishable key công khai và phiên người dùng đủ để truy cập theo phân quyền. Không cấp quyền cho `anon` để khắc phục lỗi 401: người chưa đăng nhập phải bị từ chối.

## Cách lưu

- Phải đăng nhập; tải DB xong mới khởi tạo phần học. Không lấy tiến độ từ localStorage nữa.
- QuestStorage là bộ đệm RAM, không phải kho lưu lâu dài trên trình duyệt. Thay đổi được gửi sau khoảng 180 ms; các lần ghi chạy tuần tự.
- Chờ **Đã lưu trên DB** trước khi đóng trang. Lỗi mạng: bản chưa gửi chỉ ở RAM, chặn thao tác tiếp, cho thử lại. Không có chế độ học offline lưu bền vững.
- Chỉ phiên đăng nhập giữ trong localStorage (`data-quest-auth-v1`); không lưu mật khẩu.
- Không còn sao lưu/khôi phục hoặc nhập tiến độ từ RAM/localStorage/file. Mở tài khoản luôn tải DB; tài khoản mới bắt đầu trống, bỏ qua dữ liệu cũ trên thiết bị. RAM chỉ giữ thay đổi trong lượt đang mở để gửi DB, không tự nạp lên tài khoản khác.
- Hai thiết bị cùng sửa: lần ghi thứ hai nhận xung đột, chọn bản DB hoặc chủ động giữ bản đang làm. Không tự gộp hai lượt thi khác nhau.
- Kiểm tra bản mới khi trở lại tab và mỗi 20 giây. Có bản mới thì yêu cầu mở bản mới trước khi tiếp tục.
- Đăng xuất chờ lưu xong rồi nạp lại trang đăng nhập. Tài khoản mới không dùng bộ nhớ học của tài khoản trước.
- Đổi thiết bị giữ nguyên deadline, không cấp thêm thời gian.

## Build và kiểm tra

Chạy `powershell -ExecutionPolicy Bypass -File build-quest.ps1`. Nếu sửa Data Engineering World, chạy `node build-data.mjs` trước, rồi `build-architect.ps1`.

`node scripts/test-cloud.mjs`: API giả lập, hai browser context độc lập, tải bài dở/ghi chú, phân tách tài khoản, xung đột, mất mạng/thử lại, đăng xuất, tài khoản mới bỏ qua dữ liệu cũ và lab. `node scripts/test-auth.mjs`: đăng ký, đăng nhập, refresh token, khôi phục phiên. `node scripts/test-social.mjs`: đăng nhập production không có QA, bỏ nút trùng, bảng rank, hồ sơ/avatar và không còn nút sao lưu. Các test cloud dùng `?qa=1&cloud=1`; `?qa=1` giữ bộ test cũ độc lập production.

## Điểm rank

- Câu luyện tập đang đúng: 10 điểm/câu; nắm chắc (đúng, tự tin, chuỗi đúng ≥2): thêm 15 điểm/câu. Tối đa 260 câu.
- Thi thử có giờ: điểm đúng cao nhất mỗi đề ×4, tối đa 5 đề, không cộng dồn các lượt. Review không cộng điểm thi thử.
- Hardcore hoàn thành: 300 điểm/đề; Ultra: 800 điểm/đề. Mỗi loại mỗi đề chỉ một lần.
- Đồng 0, Bạc 1.000, Vàng 3.000, Bạch kim 6.000, Kim cương 9.000, Huyền thoại 12.000. Bằng điểm đồng hạng.
- Trigger DB tính điểm khi lưu tiến độ. Client chỉ sửa tên 2–32 ký tự và 1 trong 12 avatar; không được UPDATE điểm/hồ sơ trực tiếp. RPC bảng xếp hạng chỉ trả tên, avatar và số liệu tổng hợp; không lộ email, câu trả lời, ghi chú hoặc payload.
- Đây là rank học tập từ trạng thái ứng dụng, không phải hệ thống thi có giám sát hoặc cơ chế chống sửa dữ liệu bằng devtools.

Đã kiểm tra bảng thật tồn tại và người chưa đăng nhập bị từ chối truy cập. Chưa dùng tài khoản thật để tạo/sửa dữ liệu học; cần thử cùng tài khoản trên hai thiết bị sau khi Vercel triển khai.
