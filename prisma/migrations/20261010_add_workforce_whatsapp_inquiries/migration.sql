-- CreateTable
CREATE TABLE IF NOT EXISTS "workforce_whatsapp_inquiries" (
    "id" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "service" TEXT,
    "location" TEXT,
    "timing" TEXT,
    "count" TEXT,
    "message" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assignedWorkerId" TEXT,
    "latitude" DOUBLE PRECISION DEFAULT 28.6139,
    "longitude" DOUBLE PRECISION DEFAULT 77.2090,
    "payoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "workersNeeded" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_whatsapp_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_inquiryNumber_key" ON "workforce_whatsapp_inquiries"("inquiryNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_status_idx" ON "workforce_whatsapp_inquiries"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_phone_idx" ON "workforce_whatsapp_inquiries"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_city_idx" ON "workforce_whatsapp_inquiries"("city");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_service_idx" ON "workforce_whatsapp_inquiries"("service");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workforce_whatsapp_inquiries_createdAt_idx" ON "workforce_whatsapp_inquiries"("createdAt");
