-- CreateTable
CREATE TABLE "BlancOneTimePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includesProCorrection" BOOLEAN NOT NULL DEFAULT false,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "amountTotalCents" INTEGER NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlancOneTimePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlancOneTimePurchase_stripeCheckoutSessionId_key" ON "BlancOneTimePurchase"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "BlancOneTimePurchase_userId_consumedAt_idx" ON "BlancOneTimePurchase"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "BlancOneTimePurchase" ADD CONSTRAINT "BlancOneTimePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "BlancEnrollment" ADD COLUMN     "blancPurchaseId" TEXT,
ADD COLUMN     "proCorrectionPurchased" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "BlancEnrollment_blancPurchaseId_key" ON "BlancEnrollment"("blancPurchaseId");

-- AddForeignKey
ALTER TABLE "BlancEnrollment" ADD CONSTRAINT "BlancEnrollment_blancPurchaseId_fkey" FOREIGN KEY ("blancPurchaseId") REFERENCES "BlancOneTimePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
