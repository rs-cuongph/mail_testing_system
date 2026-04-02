# API Contracts: Inbound Mail Testing System

**Branch**: `001-inbound-mail-threading` | **Date**: 2026-04-02

## Base URL

```
http://{host}:{port}/api
```

## REST Endpoints

---

### GET /threads

List all threads, ordered by most recently updated.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "tag": "1",
      "fullAddress": "gens+1@rn.work",
      "emailCount": 5,
      "latestSubject": "Test email subject",
      "createdAt": "2026-04-02T10:00:00Z",
      "updatedAt": "2026-04-02T12:30:00Z"
    }
  ],
  "total": 10
}
```

---

### GET /threads/:tag

Get a single thread with its emails, sorted by `receivedAt DESC` (newest first).

**Parameters**:
- `tag` (path) — The thread tag (e.g., `1`, `2`, `default`)

**Response** `200 OK`:
```json
{
  "thread": {
    "id": "uuid",
    "tag": "1",
    "fullAddress": "gens+1@rn.work",
    "createdAt": "2026-04-02T10:00:00Z",
    "updatedAt": "2026-04-02T12:30:00Z"
  },
  "emails": [
    {
      "id": "uuid",
      "messageId": "<abc@mail.example.com>",
      "fromEmail": "sender@example.com",
      "toEmail": "gens+1@rn.work",
      "subject": "Test email",
      "receivedAt": "2026-04-02T12:30:00Z",
      "hasAttachments": true,
      "attachmentCount": 2
    }
  ],
  "total": 5
}
```

**Response** `404 Not Found`:
```json
{
  "statusCode": 404,
  "message": "Thread with tag '999' not found"
}
```

---

### GET /emails/:id

Get full email details including body and attachments.

**Parameters**:
- `id` (path) — Email UUID

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "messageId": "<abc@mail.example.com>",
  "fromEmail": "sender@example.com",
  "toEmail": "gens+1@rn.work",
  "subject": "Test email",
  "textBody": "Plain text content...",
  "htmlBody": "<html>...</html>",
  "receivedAt": "2026-04-02T12:30:00Z",
  "rawHeaders": { "...": "..." },
  "attachments": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 102400
    }
  ]
}
```

**Response** `404 Not Found`:
```json
{
  "statusCode": 404,
  "message": "Email not found"
}
```

---

### GET /attachments/:id/download

Download an attachment file.

**Parameters**:
- `id` (path) — Attachment UUID

**Response** `200 OK`:
- Content-Type: `{attachment.contentType}`
- Content-Disposition: `attachment; filename="{attachment.filename}"`
- Body: binary file content

**Response** `404 Not Found`:
```json
{
  "statusCode": 404,
  "message": "Attachment not found"
}
```

---

### DELETE /threads/:tag

Delete a thread and all its associated emails and attachments.

**Parameters**:
- `tag` (path) — The thread tag

**Response** `200 OK`:
```json
{
  "message": "Thread 'gens+1@rn.work' deleted",
  "deletedEmails": 5,
  "deletedAttachments": 3
}
```

**Response** `404 Not Found`:
```json
{
  "statusCode": 404,
  "message": "Thread with tag '999' not found"
}
```

---

### DELETE /threads

Bulk-delete all threads, emails, and attachments.

**Response** `200 OK`:
```json
{
  "message": "All data cleared",
  "deletedThreads": 10,
  "deletedEmails": 50,
  "deletedAttachments": 12
}
```

---

## WebSocket Events

**Namespace**: `/`  
**Transport**: Socket.IO

### Server → Client Events

#### `email:new`

Emitted when a new email is received and processed.

```json
{
  "threadTag": "1",
  "threadFullAddress": "gens+1@rn.work",
  "email": {
    "id": "uuid",
    "fromEmail": "sender@example.com",
    "subject": "New test email",
    "receivedAt": "2026-04-02T12:30:00Z",
    "hasAttachments": false
  }
}
```

#### `thread:new`

Emitted when a new thread is created (first email with a new tag).

```json
{
  "thread": {
    "id": "uuid",
    "tag": "1",
    "fullAddress": "gens+1@rn.work",
    "createdAt": "2026-04-02T12:30:00Z"
  }
}
```

#### `thread:deleted`

Emitted when a thread is deleted.

```json
{
  "threadTag": "1"
}
```

#### `all:cleared`

Emitted when all data is bulk-cleared.

```json
{
  "message": "All data cleared"
}
```
