-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_isBanned_lastActive_idx" ON "users"("isBanned", "lastActive");
