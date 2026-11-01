-- ZERO CROSS Neon schema. Run once in Neon SQL Editor.
-- Prisma cuid() generates all IDs in the backend.
CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"email" TEXT NOT NULL UNIQUE,"passwordHash" TEXT NOT NULL,"gameId" TEXT NOT NULL UNIQUE,"pinHash" TEXT,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "GameStats" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,"wins" INTEGER NOT NULL DEFAULT 0,"losses" INTEGER NOT NULL DEFAULT 0,"draws" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT PRIMARY KEY,"senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"receiverId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"content" VARCHAR(4000) NOT NULL,"readAt" TIMESTAMPTZ,"expiresAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "ChatPreference" ("id" TEXT PRIMARY KEY,"conversationKey" TEXT NOT NULL UNIQUE,"mode" TEXT NOT NULL DEFAULT 'off' CHECK ("mode" IN ('off','after_seen','24h','7d')),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "CallLog" ("id" TEXT PRIMARY KEY,"callerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"receiverId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"type" TEXT NOT NULL CHECK ("type" IN ('voice','video')),"status" TEXT NOT NULL DEFAULT 'initiated',"startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"endedAt" TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS "Message_sender_receiver_created_idx" ON "Message"("senderId","receiverId","createdAt");
CREATE INDEX IF NOT EXISTS "Message_receiver_sender_created_idx" ON "Message"("receiverId","senderId","createdAt");
CREATE INDEX IF NOT EXISTS "Message_expiresAt_idx" ON "Message"("expiresAt");
CREATE INDEX IF NOT EXISTS "CallLog_caller_started_idx" ON "CallLog"("callerId","startedAt");
CREATE INDEX IF NOT EXISTS "CallLog_receiver_started_idx" ON "CallLog"("receiverId","startedAt");
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('User','GameStats','Message','ChatPreference','CallLog') ORDER BY table_name;