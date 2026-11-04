CREATE TABLE "PilotPriceObservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "beforePrice" DOUBLE PRECISION NOT NULL,
    "afterPrice" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotPriceObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotPriceObservation_tenantId_commodity_observedAt_idx" ON "PilotPriceObservation"("tenantId", "commodity", "observedAt");

ALTER TABLE "PilotPriceObservation" ADD CONSTRAINT "PilotPriceObservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
