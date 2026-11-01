-- Zero Cross / Tic-Toe Neon PostgreSQL schema
-- Run this entire script once in Neon Console -> SQL Editor.
-- Prisma generates cuid() IDs in the application; therefore ID columns are TEXT without DB defaults.

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "gameId" TEXT NOT NULL UNIQUE,
  "pinHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GameStats" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "GameStats_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "readAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Message_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CallLog" (
  "id" TEXT PRIMARY KEY,
  "callerId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'initiated',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endedAt" TIMESTAMPTZ,
  CONSTRAINT "CallLog_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChatPreference" (
  "id" TEXT PRIMARY KEY,
  "conversationKey" TEXT NOT NULL UNIQUE,
  "mode" TEXT NOT NULL DEFAULT 'off',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ChatPreference_mode_check"
    CHECK ("mode" IN ('off', 'after_seen', '24h', '7d'))
);

CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_createdAt_idx"
  ON "Message" ("senderId", "receiverId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_receiverId_senderId_createdAt_idx"
  ON "Message" ("receiverId", "senderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_expiresAt_idx"
  ON "Message" ("expiresAt");
CREATE INDEX IF NOT EXISTS "CallLog_callerId_startedAt_idx"
  ON "CallLog" ("callerId", "startedAt");

-- Quick verification: should show the five application tables.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('User', 'GameStats', 'Message', 'CallLog', 'ChatPreference')
ORDER BY table_name;
