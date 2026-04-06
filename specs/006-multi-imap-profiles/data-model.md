# Data Model: Multi-IMAP Profile Support

## New Entity: ImapProfile

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | String | Unique, required | Display name (e.g., "Work Gmail") |
| provider | String | Default: "custom" | Enum: "gmail", "outlook", "yahoo", "custom" |
| imapHost | String | Required | e.g., "imap.gmail.com" |
| imapPort | Int | Required, default: 993 | |
| imapUser | String | Required | e.g., "user@gmail.com" |
| imapPassword | String | Required, encrypted | AES-256 encrypted |
| imapTls | Boolean | Default: true | |
| imapMode | String | Default: "idle" | "idle" or "poll" |
| imapPollInterval | Int | Default: 5000 | Milliseconds |
| mailDomain | String | Required | e.g., "gmail.com" |
| mailBaseAddress | String | Default: "inbox" | |
| isActive | Boolean | Default: false | Only one can be true at a time |
| lastUsedAt | DateTime | Nullable | Updated on each activation |
| createdAt | DateTime | Auto | |
| updatedAt | DateTime | Auto | |

### Relationships
- ImapProfile 1→N Thread
- ImapProfile 1→N Category

### Constraints
- `name` must be unique across all profiles
- Only one profile can have `isActive = true` at any time
- Deleting a profile cascades to all its threads, emails, attachments, and categories

## Modified Entity: Thread

| Field Added | Type | Constraints |
|-------------|------|-------------|
| profileId | UUID | FK → ImapProfile.id, Required, Cascade delete |

- Index on `profileId` for filtered queries
- `tag` uniqueness constraint changes from global to per-profile: `@@unique([profileId, tag])`

## Modified Entity: Category

| Field Added | Type | Constraints |
|-------------|------|-------------|
| profileId | UUID | FK → ImapProfile.id, Required, Cascade delete |

- `name` uniqueness constraint changes from global to per-profile: `@@unique([profileId, name])`

## Modified Entity: Email (unchanged directly)

Emails are already linked to Thread via `threadId`. Since Thread has `profileId`, emails are implicitly profile-scoped. No schema change needed on Email.

## Modified Entity: Attachment (unchanged)

Attachments are linked to Email. Implicitly profile-scoped via Email → Thread → Profile chain.

## Deprecated Entity: SystemConfig

The `SystemConfig` model (single-row config) will be **removed** after migration. Its data is migrated to a "Default" ImapProfile record.

## Migration Strategy

1. Create `ImapProfile` table
2. Migrate existing `SystemConfig` row → insert as first `ImapProfile` (name: "Default", isActive: true)
3. Add `profileId` column to `Thread` and `Category` (nullable initially)
4. Backfill all existing threads/categories with the default profile's ID
5. Make `profileId` non-nullable
6. Update unique constraints (`tag` → `[profileId, tag]`, category `name` → `[profileId, name]`)
7. Drop `SystemConfig` table

## Prisma Schema (target state)

```prisma
model ImapProfile {
  id               String   @id @default(uuid())
  name             String   @unique
  provider         String   @default("custom")
  imapHost         String
  imapPort         Int      @default(993)
  imapUser         String
  imapPassword     String
  imapTls          Boolean  @default(true)
  imapMode         String   @default("idle")
  imapPollInterval Int      @default(5000)
  mailDomain       String
  mailBaseAddress  String   @default("inbox")
  isActive         Boolean  @default(false)
  lastUsedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  threads    Thread[]
  categories Category[]
}

model Thread {
  id          String       @id @default(uuid())
  tag         String
  baseAddress String
  fullAddress String
  categoryId  String?
  profileId   String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  emails   Email[]
  category Category?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  profile  ImapProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tag])
  @@index([profileId])
  @@index([categoryId])
}

model Category {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#60A5FA")
  profileId String
  createdAt DateTime @default(now())

  threads Thread[]
  profile ImapProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, name])
  @@index([profileId])
}
```
