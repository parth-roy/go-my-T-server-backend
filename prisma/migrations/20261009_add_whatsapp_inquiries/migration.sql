-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_inquiries" (
    "id" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "pickupCity" TEXT,
    "dropCity" TEXT,
    "vehicleType" TEXT,
    "goodsType" TEXT,
    "city" TEXT,
    "vehicleNumber" TEXT,
    "companyName" TEXT,
    "monthlyRequirement" TEXT,
    "bookingNumber" TEXT,
    "query" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assignedDriverId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_inquiries_inquiryNumber_key" ON "whatsapp_inquiries"("inquiryNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_inquiries_status_idx" ON "whatsapp_inquiries"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_inquiries_phone_idx" ON "whatsapp_inquiries"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_inquiries_createdAt_idx" ON "whatsapp_inquiries"("createdAt");
