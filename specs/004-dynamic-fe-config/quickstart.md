# Quickstart: Dynamic FE Config Test Scenarios

## 1. Initial Setup Wizard Flow

1. Checkout branch `004-dynamic-fe-config` (hay tên nhánh bạn đã thiết lập).
2. Xóa data cũ bằng cách xóa volume (để DB trống) (hoặc drop DB `mail_testing` và create lại).
3. Đảm bảo chạy với biến môi trường bắt buộc: `ENCRYPTION_KEY=your_secret_key_123` (32 ký tự).
4. Start backend: `npm run start:dev` (chờ đợi chạy trên port 7654).
5. Start frontend: `npm run dev` (chờ đợi chạy trên port 7655).
6. Truy cập frontend. Hệ thống sẽ tự động redirect sang `/setup`.
7. Nhập thông tin cấu hình IMAP sai và nhấn submit -> Phải hiện ra lỗi kết nối.
8. Nhập thông tin cấu hình IMAP đúng và nhấn submit -> Phải lưu thành công, wizard hoàn tất và chuyển vào màn hình chính hệ thống.

## 2. Update Configuration at Runtime Flow

1. Hệ thống đã có config và đang chạy ở giao diện chính.
2. Click vào mục "Settings" trên thanh điều hướng.
3. Form hiện ra với các cấu hình hiện tại (Password field không hiện plaintext mà hiện mask chuỗi `••••••••`).
4. Thay đổi một giá trị `imapUser` thành sai hoặc `imapPassword` thành sai. Nhấn "Save & Test".
5. Giao diện báo lỗi. API từ chối cập nhật config (vẫn giữ config cũ).
6. Sửa lại mật khẩu đúng. Đổi `mailDomain` sang một domain khác (vd: `my-test-domain.com`).
7. Nhấn "Save & Test". Báo thành công.
8. Config mới lập tức được áp dụng, Backend tự emit event. Trang Settings thông báo hoàn tất cập nhật.
9. Kiểm tra mục nhận sự kiện trên Terminal để xem API logging IMAP wrapper connection test.

## 3. Fallback and Port Requirements

1. Verify rằng không cần sửa đổi `docker-compose.yml` (port trong service nginx/frontend là 7655 thay vì 80, backend là 7654 thay vì 3000).
2. Khi khởi động docker-compose mà chưa có configure gì trong db, hệ thống start lên và vào trạng thái "wizard".
3. Tắt container, chạy lên lại, config lấy từ Database được decrypt đúng, Worker connect tự động, tiếp tục bắt events.
