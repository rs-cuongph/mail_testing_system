# 📬 Inbound Mail Testing System (Plus Addressing Threading)

## 1. 🎯 Mục tiêu

Xây dựng hệ thống nhận email từ domain (cPanel) và hiển thị UI theo **thread riêng biệt dựa trên `+tag`**.

### Yêu cầu chính:

* Nhận email dạng:

  * `gens+1@rn.work`
  * `gens+2@rn.work`
* Tự động parse `+tag`
* Mỗi `tag` = 1 thread riêng trên UI
* Không phụ thuộc thread của mail client (Gmail, Roundcube)

---

## 2. 🧱 Kiến trúc tổng thể

```
cPanel Mail (IMAP)
        ↓
IMAP Worker (Node.js)
        ↓
Mail Parser
        ↓
Database (PostgreSQL)
        ↓
API (NestJS)
        ↓
Frontend UI (Custom Thread View)
```

---

## 3. 📥 Mail Source

### Hạ tầng mail:

* IMAP Server: Dovecot
* SMTP Server: Exim

### Cấu hình bắt buộc (cPanel):

* Enable **Catch-all email**

  ```
  * @rn.work → gens@rn.work
  ```

👉 Mục đích:

* Gom toàn bộ `gens+anything@rn.work` về 1 inbox duy nhất

---

## 4. ⚙️ IMAP Worker

### Công nghệ:

* Node.js
* imapflow

### Chức năng:

* Connect IMAP
* Fetch mail (poll hoặc IDLE)
* Parse email headers + body
* Extract `+tag` từ field `To`

---

## 5. 🧠 Logic xử lý email

### Extract tag

```ts
function extractTag(email: string) {
  const [local] = email.split('@');
  const [base, tag] = local.split('+');
  return {
    base,
    tag: tag || null
  };
}
```

---

### Threading logic (custom)

```ts
thread_id = tag || "default"
```

👉 KHÔNG sử dụng:

* `In-Reply-To`
* `References`
* subject

---

## 6. 🗄️ Database Design

### Table: emails

| Field       | Type      | Note   |
| ----------- | --------- | ------ |
| id          | uuid      | PK     |
| message_id  | string    | unique |
| from_email  | string    |        |
| to_email    | string    |        |
| subject     | string    |        |
| body        | text      |        |
| thread_id   | string    | 👈 tag |
| received_at | timestamp |        |
| raw_headers | jsonb     |        |

---

### Table: threads

| Field      | Type      | Note |
| ---------- | --------- | ---- |
| id         | uuid      | PK   |
| tag        | string    |      |
| base       | string    | gens |
| created_at | timestamp |      |

---

## 7. 🔌 API Design (NestJS)

### GET /threads

* trả về danh sách thread (group theo tag)

### GET /threads/:tag

* trả về list email theo thread

### GET /emails/:id

* chi tiết email

---

## 8. 🖥️ UI Behavior

### Hiển thị:

```
Thread: gens+1
  - Email A
  - Email B

Thread: gens+2
  - Email C
```

### Quy tắc:

* Group theo `thread_id`
* Sort theo `received_at DESC`
* Không dùng thread logic của mail client

---

## 9. 🚀 Realtime (Optional)

* Dùng IMAP IDLE
* Hoặc polling 5–10s

---

## 10. ⚠️ Edge Cases

### 1. Duplicate email

* Deduplicate theo `message_id`

### 2. Multiple recipients

* Parse tất cả `To`, lấy đúng email target

### 3. Encoding

* Xử lý:

  * base64
  * quoted-printable

### 4. Attachment

* Lưu S3 hoặc local storage

---

## 11. ❌ Không làm

* Không scrape webmail (Roundcube)
* Không dùng thread của Gmail/Outlook
* Không phụ thuộc config `+` của mail server

---

## 12. 💡 Future Enhancements

* Multi-domain support
* Webhook khi có mail mới
* Search full-text (subject/body)
* Tag nâng cao (gens+userId+env)

---

## 13. 🔥 Kết luận

* Thread = `+tag` (do hệ thống tự định nghĩa)
* Mail server chỉ là nguồn dữ liệu
* UI hoàn toàn control logic hiển thị

---

## 14. 🧪 Example Flow

```
Send:
  gens+1@rn.work → Mail A
  gens+2@rn.work → Mail B

System:
  parse tag → 1, 2

DB:
  A → thread_id = 1
  B → thread_id = 2

UI:
  Thread 1 → A
  Thread 2 → B
```
