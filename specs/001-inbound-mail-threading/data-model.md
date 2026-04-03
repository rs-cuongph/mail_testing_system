# Data Model: Inbound Mail Testing System

**Branch**: `001-inbound-mail-threading` | **Date**: 2026-04-02

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   Thread    │ 1───* │    Email    │ 1───* │  Attachment  │
│             │       │             │       │              │
│ id (uuid)   │       │ id (uuid)   │       │ id (uuid)    │
│ tag         │       │ messageId   │       │ filename     │
│ baseAddress │       │ fromEmail   │       │ contentType  │
│ fullAddress │       │ toEmail     │       │ size         │
│ createdAt   │       │ subject     │       │ storagePath  │
│ updatedAt   │       │ textBody    │       │ emailId (FK) │
│             │       │ htmlBody    │       │ createdAt    │
│             │       │ threadId(FK)│       └──────────────┘
│             │       │ receivedAt  │
│             │       │ rawHeaders  │
│             │       │ createdAt   │
│             │       └─────────────┘
└─────────────┘
```

## Entities

### Thread

Represents a logical grouping of emails sharing the same `+tag`.

| Field        | Type      | Constraints                    | Description                                        |
| ------------ | --------- | ------------------------------ | -------------------------------------------------- |
| id           | UUID      | PK, auto-generated             | Unique identifier                                  |
| tag          | String    | NOT NULL, UNIQUE               | The extracted `+tag` value, or `"default"`          |
| baseAddress  | String    | NOT NULL                       | The base email address (e.g., `gens`)               |
| fullAddress  | String    | NOT NULL                       | Display label (e.g., `gens+1@runsystem.work`)              |
| createdAt    | DateTime  | NOT NULL, auto                 | When the thread was first created                   |
| updatedAt    | DateTime  | NOT NULL, auto                 | When the last email was added to this thread         |

**Validation Rules**:
- `tag` must be unique across all threads
- `fullAddress` is derived: if tag is `"default"`, format is `{baseAddress}@{domain} (default)`, otherwise `{baseAddress}+{tag}@{domain}`

**Relationships**:
- Has many `Email` records (cascade delete)

---

### Email

Represents a single received email message.

| Field       | Type      | Constraints                    | Description                                         |
| ----------- | --------- | ------------------------------ | --------------------------------------------------- |
| id          | UUID      | PK, auto-generated             | Unique identifier                                   |
| messageId   | String    | NOT NULL, UNIQUE               | RFC 2822 Message-ID header (deduplication key)       |
| fromEmail   | String    | NOT NULL                       | Sender email address                                |
| toEmail     | String    | NOT NULL                       | Target recipient address (the plus-addressed one)    |
| subject     | String    | NOT NULL, default ""           | Email subject line                                  |
| textBody    | Text      | nullable                       | Plain text body content                             |
| htmlBody    | Text      | nullable                       | HTML body content (for dual-view rendering)          |
| threadId    | UUID      | NOT NULL, FK → Thread.id       | Associated thread                                   |
| receivedAt  | DateTime  | NOT NULL                       | When the email was received by the mail server       |
| rawHeaders  | JSONB     | NOT NULL                       | Complete raw email headers for debugging             |
| createdAt   | DateTime  | NOT NULL, auto                 | When the record was created in the system            |

**Validation Rules**:
- `messageId` must be unique (enforced at DB level for deduplication)
- At least one of `textBody` or `htmlBody` must be non-null
- `fromEmail` and `toEmail` must be valid email format

**Relationships**:
- Belongs to one `Thread` (via `threadId`)
- Has many `Attachment` records (cascade delete)

**Indexes**:
- `messageId` (unique) — for deduplication lookups
- `threadId` + `receivedAt DESC` — for listing emails within a thread sorted by time

---

### Attachment

Represents a file attached to an email.

| Field       | Type      | Constraints                    | Description                                         |
| ----------- | --------- | ------------------------------ | --------------------------------------------------- |
| id          | UUID      | PK, auto-generated             | Unique identifier                                   |
| filename    | String    | NOT NULL                       | Original filename of the attachment                  |
| contentType | String    | NOT NULL                       | MIME content type (e.g., `application/pdf`)           |
| size        | Integer   | NOT NULL                       | File size in bytes                                   |
| storagePath | String    | NOT NULL                       | Filesystem path where the file is stored             |
| emailId     | UUID      | NOT NULL, FK → Email.id        | Associated email                                    |
| createdAt   | DateTime  | NOT NULL, auto                 | When the record was created                          |

**Validation Rules**:
- `filename` must not be empty
- `size` must be > 0
- `storagePath` must point to an existing file (application-level validation)

**Relationships**:
- Belongs to one `Email` (via `emailId`)

## State Transitions

### Thread Lifecycle

```
[No Thread] → CREATE (first email with new tag arrives)
                 ↓
             [Active] ← UPDATE (new email arrives, updatedAt refreshed)
                 ↓
             [Deleted] (user manually deletes thread → cascade deletes emails + attachments)
```

### Email Processing Flow

```
[IMAP Fetch] → Check messageId exists?
                  ├── YES → SKIP (deduplicate)
                  └── NO  → Extract +tag from To header
                              ├── Tag found → Find/Create Thread → INSERT Email
                              └── No tag   → Find/Create "default" Thread → INSERT Email
                                               → Extract attachments → Store files → INSERT Attachment records
                                                  → Emit WebSocket event for real-time UI update
```
