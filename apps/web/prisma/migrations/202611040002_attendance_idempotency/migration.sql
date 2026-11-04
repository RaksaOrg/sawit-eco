ALTER TABLE "Attendance"
ADD COLUMN IF NOT EXISTS "checkInIdempotencyKey" TEXT,
ADD COLUMN IF NOT EXISTS "checkOutIdempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_checkInIdempotencyKey_key"
ON "Attendance"("checkInIdempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_checkOutIdempotencyKey_key"
ON "Attendance"("checkOutIdempotencyKey");
