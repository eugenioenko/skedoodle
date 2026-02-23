-- Drop WebAuthn tables no longer needed
DROP TABLE IF EXISTS "Credential";
DROP TABLE IF EXISTS "Challenge";

-- Add oidcSub column to User
ALTER TABLE "User" ADD COLUMN "oidcSub" TEXT;

-- Create unique index on oidcSub
CREATE UNIQUE INDEX "User_oidcSub_key" ON "User"("oidcSub");
