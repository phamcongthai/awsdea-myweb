# Supabase: tài khoản và dữ liệu học

Email + mật khẩu. Mỗi tài khoản lưu trên PostgreSQL Supabase: luyện tập, câu sai đầu ngày, ghi chú, flashcard, lịch sử thi, bài dở, thứ tự câu/đáp án, deadline Hardcore, huy hiệu và lab.

## Cấu hình

1. Chạy `supabase/schema.sql` trong Supabase → SQL Editor → New query. Script tạo bảng, phân quyền đọc của chính mình và hàm ghi kiểm tra phiên bản để chống ghi đè từ hai thiết bị. Có thể chạy lại.
2. Authentication → URL Configuration: đặt Site URL thành domain Vercel thật. Thêm `/`, `/index.html`, `/realtest.html` vào Redirect URLs trên domain đó để xác nhận email trở về website.
3. Email provider đang bật, project hiện yêu cầu xác nhận email trước lần đăng nhập đầu tiên. Không cần Google/OAuth.

Không cần service_role/Secret key. Publishable key công khai và phiên người dùng đủ để truy cập theo phân quyền. Không cấp quyền cho `anon` để khắc phục lỗi 401: người chưa đăng nhập phải bị từ chối.

## Cách lưu

- Phải đăng nhập; tải DB xong mới khởi tạo phần học. Không lấy tiến độ từ localStorage nữa.
- QuestStorage là bộ đệm RAM, không phải kho lưu lâu dài trên trình duyệt. Thay đổi được gửi sau khoảng 180 ms; các lần ghi chạy tuần tự.
- Chờ **Đã lưu trên DB** trước khi đóng trang. Lỗi mạng: bản chưa gửi chỉ ở RAM, chặn thao tác tiếp, cho thử lại/tải bản sao. Không có chế độ học offline lưu bền vững.
- Chỉ phiên đăng nhập giữ trong localStorage (`data-quest-auth-v1`); không lưu mật khẩu.
- Dữ liệu cũ được đề nghị nhập lên DB một lần. Chỉ xóa bản cũ sau khi ghi thành công, hoặc khi người dùng chọn dùng bản DB. Có nút tải bản sao trước khi chọn.
- Hai thiết bị cùng sửa: lần ghi thứ hai nhận xung đột, chọn bản DB hoặc chủ động giữ bản đang làm. Không tự gộp hai lượt thi khác nhau.
- Kiểm tra bản mới khi trở lại tab và mỗi 20 giây. Có bản mới thì yêu cầu mở bản mới trước khi tiếp tục.
- Đăng xuất chờ lưu xong rồi nạp lại trang đăng nhập. Tài khoản mới không dùng bộ nhớ học của tài khoản trước.
- Đổi thiết bị giữ nguyên deadline, không cấp thêm thời gian.

## Build và kiểm tra

Chạy `powershell -ExecutionPolicy Bypass -File build-quest.ps1`. Nếu sửa Data Engineering World, chạy `node build-data.mjs` trước, rồi `build-architect.ps1`.

`node scripts/test-cloud.mjs`: API giả lập, hai browser context độc lập, khôi phục bài dở/ghi chú, phân tách tài khoản, xung đột, mất mạng/thử lại, đăng xuất, nhập dữ liệu cũ và lab. `node scripts/test-auth.mjs`: đăng ký, đăng nhập, refresh token, khôi phục phiên. Các test dùng QA storage riêng: `?qa=1&cloud=1` kiểm tra cloud, `?qa=1` giữ bộ test cũ độc lập production.

Đã kiểm tra bảng thật tồn tại và người chưa đăng nhập bị từ chối truy cập. Chưa dùng tài khoản thật để tạo/sửa dữ liệu học; cần thử cùng tài khoản trên hai thiết bị sau khi Vercel triển khai.
