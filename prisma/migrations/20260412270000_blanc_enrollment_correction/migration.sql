-- AlterTable
ALTER TABLE "BlancSlot" ADD COLUMN "sujetUrl" TEXT;

-- AlterTable
ALTER TABLE "BlancEnrollment" ADD COLUMN     "status" "BacBlancStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "copieUrl" TEXT,
ADD COLUMN     "noteFinale" DOUBLE PRECISION,
ADD COLUMN     "commentaire" TEXT,
ADD COLUMN     "correcteurId" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "correctedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "BlancEnrollment" ADD CONSTRAINT "BlancEnrollment_correcteurId_fkey" FOREIGN KEY ("correcteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
