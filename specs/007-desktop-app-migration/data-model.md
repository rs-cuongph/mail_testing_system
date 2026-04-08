# Data Model: Desktop App Migration

## Database Schema (SQLite)

The database engine is migrated from PostgreSQL to SQLite. The models remain largely the same, but the Prisma configuration is adapted for local embedded usage.

### `schema.prisma` configuration
```prisma
datasource db {
  provider = "sqlite"
  // URL provided dynamically via environment variable pointing to the User Data Directory
  url      = env("DATABASE_URL")
}
```

### Entities

1. **ImapProfile**
   - Stores IMAP connection settings.
   - `imapPassword` field: **IMPORTANT** Instead of plaintext, this field will interact with Electron `safeStorage`. The database either stores a securely encrypted version (if managed by backend) or securely references the OS Credential store. Since `safeStorage` is an Electron API, it might store the credential in Keychain/Credential Manager under the `ImapProfile.id`. The DB field `imapPassword` might be dropped or only used as a placeholder string like `[SECURE_STORE]`.

2. **Thread**
   - Groups emails by tag. Unchanged.

3. **Email**
   - Represents an ingested email. Unchanged.

4. **Category**
   - Tags applied to threads. Unchanged.

5. **Attachment**
   - Email attachments. The `storagePath` must point to the User Data Directory (e.g., `AppData/Roaming/MailTestingSystem/attachments/`) rather than an arbitrary docker volume.
