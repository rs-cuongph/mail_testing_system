# Feature Specification: Dynamic Configuration via Frontend

**Feature Branch**: `003-dynamic-fe-config`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Các phần config trong .env#L6-21 sẽ được config 1 lần từ FE thay vì load từ env để có thể chỉnh sửa động mà không cần build lại. Hướng đến đóng gói thành 1 Docker image, port cần tránh trùng các port phổ biến trên Windows/macOS."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial System Setup (Priority: P1)

Khi triển khai hệ thống lần đầu (hoặc từ Docker image mới), người quản trị mở giao diện web và thấy màn hình **Setup Wizard** bắt buộc cấu hình các thông tin IMAP, Mail Domain trước khi hệ thống bắt đầu hoạt động.

**Why this priority**: Đây là flow cốt lõi — không có config thì hệ thống không thể nhận mail. Thay thế hoàn toàn việc phải chỉnh `.env` rồi rebuild.

**Independent Test**: Có thể test bằng cách chạy Docker image mới, mở trình duyệt và hoàn tất wizard — hệ thống phải bắt đầu kết nối IMAP ngay sau khi submit.

**Acceptance Scenarios**:

1. **Given** hệ thống mới triển khai chưa có config, **When** người dùng mở web app, **Then** họ thấy màn hình Setup Wizard yêu cầu nhập IMAP Host, Port, User, Password, TLS, Mail Domain, Base Address
2. **Given** wizard hiển thị, **When** người dùng nhập đầy đủ thông tin hợp lệ và nhấn "Save & Connect", **Then** hệ thống lưu config, khởi động IMAP worker, và chuyển sang giao diện chính
3. **Given** wizard hiển thị, **When** người dùng nhập thông tin IMAP không hợp lệ (sai host/port/credentials), **Then** hệ thống hiển thị lỗi kết nối cụ thể và cho phép sửa lại
4. **Given** hệ thống đã có config từ trước, **When** người dùng mở web app, **Then** họ vào thẳng giao diện chính (bỏ qua wizard)

---

### User Story 2 - Edit Configuration at Runtime (Priority: P1)

Người quản trị muốn chỉnh sửa cấu hình IMAP hoặc Mail Domain bất kỳ lúc nào từ giao diện Settings mà không cần restart container hay rebuild image.

**Why this priority**: Đây là giá trị cốt lõi của feature — cho phép thay đổi động, giảm downtime.

**Independent Test**: Có thể test bằng cách thay đổi IMAP password trên giao diện Settings → hệ thống phải tự reconnect với credentials mới.

**Acceptance Scenarios**:

1. **Given** hệ thống đang chạy bình thường, **When** người dùng mở trang Settings, **Then** họ thấy các giá trị config hiện tại (IMAP Host, Port, User, Password masked, TLS, Mode, Poll Interval, Mail Domain, Base Address)
2. **Given** trang Settings hiển thị, **When** người dùng sửa IMAP Host và nhấn "Save", **Then** hệ thống lưu config mới và tự động reconnect IMAP worker với thông tin mới
3. **Given** trang Settings hiển thị, **When** người dùng sửa Mail Domain, **Then** hệ thống cập nhật rule filter email ngay lập tức mà không mất dữ liệu cũ
4. **Given** hệ thống đang reconnect IMAP, **When** kết nối thất bại, **Then** hiển thị trạng thái lỗi trên Settings và giữ lại config cũ để fallback

---

### User Story 3 - Docker Image Deployment without Port Conflicts (Priority: P2)

Người dùng triển khai Docker image trên máy Windows/macOS và cần tránh xung đột port với các service phổ biến đã chạy sẵn (80, 443, 3000, 5432, 8080...).

**Why this priority**: Quan trọng cho mục tiêu đóng gói thành image dễ dùng, nhưng là thay đổi cấu hình một lần.

**Independent Test**: Có thể test bằng cách chạy `docker-compose up` trên máy đã có service chiếm port 80 và 3000 — hệ thống phải start thành công trên port mới.

**Acceptance Scenarios**:

1. **Given** người dùng chạy Docker image, **When** hệ thống start, **Then** backend lắng nghe trên port ít xung đột (không phải 3000, 8080, 80) và frontend lắng nghe trên port ít xung đột (không phải 80, 443, 8080)
2. **Given** hệ thống chạy trên port mới, **When** người dùng mở trình duyệt đến đúng port, **Then** giao diện hoạt động bình thường với API và WebSocket kết nối đúng
3. **Given** docker-compose file mới, **When** người dùng muốn custom port, **Then** họ chỉ cần thay đổi port mapping trong docker-compose mà không cần rebuild

---

### User Story 4 - Connection Status Visibility (Priority: P2)

Người quản trị muốn biết trạng thái kết nối IMAP hiện tại (connected, disconnected, error) trực tiếp trên giao diện.

**Why this priority**: Tăng khả năng giám sát — nhất là sau khi thay đổi config, người dùng cần biết ngay hệ thống có hoạt động đúng không.

**Independent Test**: Có thể test bằng cách cố ý nhập sai IMAP password → icon trạng thái phải chuyển sang "error".

**Acceptance Scenarios**:

1. **Given** IMAP đang kết nối thành công, **When** người dùng nhìn giao diện, **Then** hiển thị indicator "Connected" (màu xanh)
2. **Given** IMAP bị mất kết nối, **When** hệ thống phát hiện disconnect, **Then** indicator chuyển sang "Disconnected" (màu đỏ) và hiển thị lý do
3. **Given** config vừa được thay đổi, **When** hệ thống đang reconnect, **Then** indicator hiển thị "Reconnecting..." (màu vàng)

---

### Edge Cases

- Người dùng submit form config với IMAP password chứa ký tự đặc biệt → hệ thống phải xử lý đúng encoding
- Hai người dùng cùng mở Settings và sửa config đồng thời → config cuối cùng saved wins, UI refresh
- Database bị mất khi container restart → config phải persist qua volume mount
- IMAP server yêu cầu TLS nhưng người dùng tắt TLS → hiển thị cảnh báo rõ ràng
- Config cũ từ `.env` vẫn tồn tại khi chuyển sang dynamic config → hệ thống ưu tiên config từ DB, fallback về `.env`

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a first-run Setup Wizard khi chưa có config nào trong database
- **FR-002**: System MUST lưu trữ config (IMAP Host, Port, User, Password, TLS, Mode, Poll Interval, Mail Domain, Base Address) vào database thay vì chỉ đọc từ `.env`
- **FR-003**: System MUST mã hóa IMAP Password trước khi lưu vào database (không lưu plaintext) sử dụng AES với `ENCRYPTION_KEY` từ biến môi trường bắt buộc; backend MUST từ chối khởi động nếu `ENCRYPTION_KEY` không được cung cấp
- **FR-004**: System MUST cho phép chỉnh sửa mọi config từ giao diện Settings mà không cần restart
- **FR-005**: System MUST tự động reconnect IMAP worker khi config thay đổi; cơ chế propagation sử dụng NestJS `EventEmitter2` emit event `config.updated` nội bộ trong cùng process
- **FR-006**: System MUST hiển thị trạng thái kết nối IMAP realtime trên giao diện (connected/disconnected/reconnecting/error)
- **FR-007**: System MUST validate cấu hình IMAP bằng cách thử kết nối trước khi lưu (test connection) với timeout **30 giây**; nếu vượt quá timeout phải hiển thị lỗi cụ thể và không lưu config
- **FR-008**: System MUST fallback về giá trị `.env` nếu database chưa có config (backward compatible)
- **FR-009**: System MUST sử dụng port mặc định ít xung đột: backend port `7654`, frontend port `7655` (thay vì 3000 và 80)
- **FR-010**: System MUST mask IMAP password trên giao diện Settings (hiện `••••••••`, chỉ hiện khi user click reveal)
- **FR-011**: System MUST persist config data qua Docker container restart (database volume)
- **FR-012**: System MUST cung cấp API endpoint để FE đọc/ghi config

### Key Entities *(include if feature involves data)*

- **SystemConfig**: Bảng lưu trữ cấu hình hệ thống dạng single structured row với các cột cụ thể (imap_host, imap_port, imap_user, imap_password, imap_tls, imap_mode, imap_poll_interval, mail_domain, mail_base_address). Mỗi hệ thống chỉ có 1 row duy nhất, type-safe, dễ validate.
- **ConfigChangeLog** *(optional)*: Lịch sử thay đổi config để audit — ai thay đổi gì, lúc nào, giá trị cũ/mới.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng hoàn tất Setup Wizard và hệ thống bắt đầu nhận mail trong vòng 2 phút kể từ lần mở đầu tiên
- **SC-002**: Thay đổi config từ Settings có hiệu lực ngay lập tức (IMAP reconnect trong vòng 10 giây), không cần restart container
- **SC-003**: Hệ thống khởi động thành công trên Windows/macOS mà không xung đột port với các service phổ biến (IIS trên 80, Node dev server trên 3000, Vite trên 5173)
- **SC-004**: IMAP password được bảo vệ — không hiển thị plaintext trên UI và không lưu plaintext trong database
- **SC-005**: 100% config items đang trong `.env` (lines 6-21) có thể được quản lý hoàn toàn từ giao diện FE
- **SC-006**: Docker image có thể triển khai và vận hành mà không cần chỉnh sửa bất kỳ file `.env` nào

## Clarifications

### Session 2026-04-06

- Q: Config data model — key-value pairs, single structured row, or JSON blob? → A: Single structured row với các cột cụ thể (type-safe, dễ validate, phù hợp vì chỉ có 1 bộ config cố định)
- Q: Encryption key management — env var required, optional with fallback, or no encryption? → A: `ENCRYPTION_KEY` là biến môi trường bắt buộc; backend từ chối khởi động nếu thiếu (no hard-coded fallback)
- Q: Config API security — Basic Auth, no auth (network isolation), or localhost-only bind? → A: Không có authentication trong v1; bảo vệ bằng network isolation (Docker internal network / localhost)
- Q: Config change propagation to IMAP worker — EventEmitter, direct call, or polling? → A: NestJS `EventEmitter2` emit event `config.updated` nội bộ trong cùng process
- Q: Test connection timeout before save — 5s, 10s, 30s, or configurable? → A: 30 giây (ưu tiên độ tin cậy; tránh false-negative với IMAP server có latency cao)

## Assumptions

- Hệ thống chỉ có 1 bộ config active tại một thời điểm (single-tenant, không multi-org)
- Database PostgreSQL luôn khả dụng khi backend chạy (config được lưu trong cùng DB với data)
- Người dùng có quyền truy cập giao diện web = có quyền chỉnh sửa config (không phân quyền admin riêng trong v1); config API không yêu cầu authentication — bảo vệ bằng network isolation (Docker internal network hoặc localhost-only deployment)
- `.env` file vẫn được giữ lại để backward compatible và cho trường hợp DATABASE_URL (luôn cần trước khi DB sẵn sàng)
- Port mặc định mới (7654/7655) được chọn dựa trên việc không thuộc danh sách IANA well-known ports và ít được dùng bởi các tool phổ biến
- IMAP Password encryption sử dụng symmetric encryption (AES) với `ENCRYPTION_KEY` từ biến môi trường bắt buộc — backend từ chối khởi động nếu thiếu; không có hard-coded fallback
