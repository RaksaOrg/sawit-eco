CREATE TABLE "ModelTrigger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelTrigger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelTrigger_tenantId_traceId_idx" ON "ModelTrigger"("tenantId", "traceId");
CREATE INDEX "ModelTrigger_tenantId_createdAt_idx" ON "ModelTrigger"("tenantId", "createdAt");
CREATE INDEX "ModelTrigger_route_status_idx" ON "ModelTrigger"("route", "status");

ALTER TABLE "ModelTrigger" ADD CONSTRAINT "ModelTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
