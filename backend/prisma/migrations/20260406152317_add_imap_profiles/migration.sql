/*
  Warnings:

  - A unique constraint covering the columns `[profileId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileId,tag]` on the table `Thread` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profileId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profileId` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Category_name_key";
DROP INDEX "Thread_tag_key";

-- CreateTable
CREATE TABLE "ImapProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT NOT NULL,
    "imapPassword" TEXT NOT NULL,
    "imapTls" BOOLEAN NOT NULL DEFAULT true,
    "imapMode" TEXT NOT NULL DEFAULT 'idle',
    "imapPollInterval" INTEGER NOT NULL DEFAULT 5000,
    "mailDomain" TEXT NOT NULL,
    "mailBaseAddress" TEXT NOT NULL DEFAULT 'inbox',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImapProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImapProfile_name_key" ON "ImapProfile"("name");

-- Insert Default Profile from existing SystemConfig
INSERT INTO "ImapProfile" ("id", "name", "provider", "imapHost", "imapPort", "imapUser", "imapPassword", "imapTls", "imapMode", "imapPollInterval", "mailDomain", "mailBaseAddress", "isActive", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000000', 'Default', 'custom', 
       COALESCE("imapHost", ''), 
       COALESCE("imapPort", 993), 
       COALESCE("imapUser", ''), 
       COALESCE("imapPassword", ''), 
       COALESCE("imapTls", true), 
       COALESCE("imapMode", 'idle'), 
       COALESCE("imapPollInterval", 5000), 
       COALESCE("mailDomain", ''), 
       COALESCE("mailBaseAddress", 'inbox'), 
       true, 
       CURRENT_TIMESTAMP
FROM "SystemConfig" WHERE "id" = 1;

-- If no row was inserted (empty SystemConfig), insert fallback
INSERT INTO "ImapProfile" ("id", "name", "provider", "imapHost", "imapPort", "imapUser", "imapPassword", "imapTls", "imapMode", "imapPollInterval", "mailDomain", "mailBaseAddress", "isActive", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000000', 'Default', 'custom', '', 993, '', '', true, 'idle', 5000, '', 'inbox', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ImapProfile" WHERE "id" = '00000000-0000-0000-0000-000000000000');

-- AlterTable Add columns nullable
ALTER TABLE "Category" ADD COLUMN     "profileId" TEXT;
ALTER TABLE "Thread" ADD COLUMN     "profileId" TEXT;

-- Update existing rows
UPDATE "Category" SET "profileId" = '00000000-0000-0000-0000-000000000000' WHERE "profileId" IS NULL;
UPDATE "Thread" SET "profileId" = '00000000-0000-0000-0000-000000000000' WHERE "profileId" IS NULL;

-- AlterTable Make NOT NULL
ALTER TABLE "Category" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Thread" ALTER COLUMN "profileId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Category_profileId_idx" ON "Category"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_profileId_name_key" ON "Category"("profileId", "name");

-- CreateIndex
CREATE INDEX "Thread_profileId_idx" ON "Thread"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_profileId_tag_key" ON "Thread"("profileId", "tag");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ImapProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ImapProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
