# Settings API Contract

## Endpoints

### `GET /api/settings`
Lấy cấu hình hệ thống hiện tại. Password sẽ được masked.

**Response (200 OK):**
```json
{
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapUser": "user@gmail.com",
  "imapPassword": "••••••••",
  "imapTls": true,
  "imapMode": "idle",
  "imapPollInterval": 3000,
  "mailDomain": "test.com",
  "mailBaseAddress": "http://localhost:7655"
}
```

**Response (404 Not Found):**
Trường hợp chưa có cấu hình (lần chạy đầu tiên)
```json
{
  "message": "Configuration not found",
  "error": "Not Found",
  "statusCode": 404
}
```


### `POST /api/settings`
Lưu/Cập nhật cấu hình.
Sẽ tự động test kết nối IMAP trước khi lưu (timeout 30s). Nếu thành công sẽ emit event để IMAP worker reload.

**Request Body:**
```json
{
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapUser": "user@gmail.com",
  "imapPassword": "new_password_here_or_leave_empty_to_keep_existing",
  "imapTls": true,
  "imapMode": "idle",
  "imapPollInterval": 3000,
  "mailDomain": "test.com",
  "mailBaseAddress": "http://localhost:7655"
}
```

**Response (200 OK):**
Kết nối thành công và đã lưu thành công.
```json
{
  "success": true,
  "message": "Configuration updated and connected"
}
```

**Response (400 Bad Request):**
Lỗi validate hoặc test kết nối thất bại.
```json
{
  "message": "IMAP connection failed: Invalid credentials",
  "error": "Bad Request",
  "statusCode": 400
}
```

### `GET /api/settings/status`
Lấy trạng thái kết nối IMAP hiện tại.

**Response (200 OK):**
```json
{
  "status": "connected" // Có thể là "connected", "disconnected", "reconnecting", "error"
}
```
