# Tài khoản email và mật khẩu

Website dùng Supabase Auth để đăng ký, đăng nhập và đăng xuất trên thiết bị hiện tại. Không có Google/OAuth. Chưa có đồng bộ tiến độ học: tiến độ, ghi chú, lịch sử thi và huy hiệu tiếp tục nằm trong localStorage của trình duyệt như trước. Đổi tài khoản không tách hoặc chuyển các dữ liệu học này.

## Cấu hình một lần

1. Mở project `awsexam` trong Supabase.
2. Trong **Authentication → URL Configuration**, đặt **Site URL** thành URL production thật của website trên Vercel, ví dụ `https://ten-web.vercel.app`.
3. Thêm URL trang đăng nhập vào **Redirect URLs**: `https://ten-web.vercel.app/`, `https://ten-web.vercel.app/index.html`, `https://ten-web.vercel.app/realtest.html`. Thay `ten-web` bằng domain thật. Đây là các trang nhận liên kết xác nhận email.
4. Email provider và đăng ký đã được kiểm tra đang bật. Project hiện bật xác nhận email, nên người đăng ký phải mở thư xác nhận trước lần đăng nhập đầu tiên. Nếu muốn đăng ký xong vào ngay, có thể tắt **Confirm email** trong cấu hình Email của Authentication. Không cần thêm Google hay provider khác.

Không cần chạy SQL, tạo bảng hay nhập service_role/Secret key. Auth được Supabase quản lý. Publishable key là khóa công khai và được cấu hình trong `quest-auth.js`.

## Phiên đăng nhập

- Supabase JS 2.49.8 được lưu tại `public/vendor`, kèm MIT license; không phụ thuộc CDN lúc người dùng mở website.
- `persistSession: true` giữ phiên trong localStorage; `autoRefreshToken: true` tự làm mới token; các trang cùng origin dùng cùng phiên.
- Đăng xuất dùng scope `local`, không đăng xuất mọi thiết bị. Website không lưu mật khẩu do người dùng nhập.
- Khóa production: `data-quest-auth-v1`; QA: `data-quest-auth-test-v1`, tách riêng.
- Xóa dữ liệu website, chế độ riêng tư, phiên bị thu hồi hoặc trình duyệt chặn lưu trữ có thể yêu cầu đăng nhập lại. Lỗi lưu trữ hiển thị ngay trong hộp tài khoản.
- Dùng origin Vercel ổn định: một deployment preview/domain khác hoặc file HTML mở trực tiếp có kho lưu riêng.

## Build

`build-auth.ps1` gắn CSS, thư viện và UI vào hai builder hiện tại. Chạy `powershell -ExecutionPolicy Bypass -File build-quest.ps1` để dựng lại trang học và phòng thi. Không cần backend Python riêng cho phạm vi chỉ xác thực này.

## Kiểm chứng

Đã kiểm tra API settings thực tế bằng Publishable key (chỉ đọc). Luồng đăng ký, xác nhận email, sai mật khẩu, khôi phục phiên qua reload/chuyển trang/đóng mở trình duyệt, refresh token hết hạn và đăng xuất được kiểm tra với Supabase Auth giả lập trong trình duyệt; không tạo tài khoản thử trên project production. Sau cấu hình URL, cần tự đăng ký một email thật để kiểm tra gửi và nhận thư của project.
