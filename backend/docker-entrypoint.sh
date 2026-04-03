#!/bin/sh
set -e

echo "⏳ Initializing database schema..."

# Dùng psql để tạo tables trực tiếp (không cần Prisma migrate/db push)
# DATABASE_URL format: postgresql://user:pass@host:port/dbname?schema=public
DB_URL="$DATABASE_URL"

# Parse connection info từ URL
DB_HOST=$(echo "$DB_URL" | sed 's|.*@\([^:]*\):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed 's|.*:\([0-9]*\)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed 's|.*/\([^?]*\).*|\1|')
DB_USER=$(echo "$DB_URL" | sed 's|.*://\([^:]*\):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')

export PGPASSWORD="$DB_PASS"

echo "📦 Creating tables if not exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS "Thread" (
    "id"          TEXT NOT NULL,
    "tag"         TEXT NOT NULL,
    "baseAddress" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Thread_tag_key" ON "Thread"("tag");

CREATE TABLE IF NOT EXISTS "Email" (
    "id"         TEXT NOT NULL,
    "messageId"  TEXT NOT NULL,
    "fromEmail"  TEXT NOT NULL,
    "toEmail"    TEXT NOT NULL,
    "subject"    TEXT NOT NULL DEFAULT '',
    "textBody"   TEXT,
    "htmlBody"   TEXT,
    "threadId"   TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "rawHeaders" JSONB NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Email_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId")
        REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Email_messageId_key" ON "Email"("messageId");
CREATE INDEX IF NOT EXISTS "Email_threadId_receivedAt_idx" ON "Email"("threadId", "receivedAt" DESC);

CREATE TABLE IF NOT EXISTS "Attachment" (
    "id"          TEXT NOT NULL,
    "filename"    TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size"        INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "emailId"     TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attachment_emailId_fkey" FOREIGN KEY ("emailId")
        REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
SQL

echo "✅ Database schema ready!"
echo "🚀 Starting Mail Testing System backend..."
exec node dist/src/main
