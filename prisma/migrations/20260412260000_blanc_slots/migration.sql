-- CreateEnum
CREATE TYPE "BlancKind" AS ENUM ('BREVET_BLANC', 'BAC_BLANC');

-- CreateTable
CREATE TABLE "BlancSlot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "BlancKind" NOT NULL,
    "description" TEXT,
    "visioAt" TIMESTAMP(3),
    "visioUrl" TEXT,
    "visioLabel" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlancSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlancEnrollment" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlancEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlancEnrollment_slotId_userId_key" ON "BlancEnrollment"("slotId", "userId");

-- AddForeignKey
ALTER TABLE "BlancEnrollment" ADD CONSTRAINT "BlancEnrollment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "BlancSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlancEnrollment" ADD CONSTRAINT "BlancEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
