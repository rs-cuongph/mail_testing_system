# Data Model: Dynamic FE Config

## Entities

### `SystemConfig`

**Description**: Bảng lưu trữ cấu hình hệ thống dạng single structured row. Mỗi hệ thống chỉ có 1 row duy nhất.

**Fields**:
- `id` (int, PK): ID cố định, thường dùng giá trị `1` để đảm bảo single row.
- `imapHost` (string): Địa chỉ IMAP server (e.g., `imap.gmail.com`).
- `imapPort` (int): Cổng kết nối (e.g., `993`).
- `imapUser` (string): Tên đăng nhập IMAP.
- `imapPassword` (string): Mật khẩu IMAP (Được mã hóa qua AES encryption trước khi lưu).
- `imapTls` (boolean): Bật/Tắt TLS.
- `imapMode` (string): Chế độ đọc mail (e.g., `idle`, `poll`).
- `imapPollInterval` (int): Khoảng thời gian lấy mail (nếu mode là `poll`).
- `mailDomain` (string): Domain nhận email để parse catch-all.
- `mailBaseAddress` (string): Base URL/address context khi hiển thị.
- `updatedAt` (DateTime): Thời gian cập nhật cấu hình gần nhất.

**Validation Rules**:
- Chỉ có tối đa 1 dòng dữ liệu trong bảng.
- `imapHost`, `imapPort`, `imapUser`, `imapPassword` bắt buộc có.

### `ConfigChangeLog` (Optional)

**Description**: Lịch sử thay đổi để audit.

**Fields**:
- `id` (int, PK)
- `changedAt` (DateTime)
- `oldValues` (JSON)
- `newValues` (JSON)
