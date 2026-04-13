-- AlterTable
ALTER TABLE "BacBlanc" ADD COLUMN     "visioAt" TIMESTAMP(3),
ADD COLUMN     "visioUrl" TEXT,
ADD COLUMN     "visioLabel" TEXT;

-- CreateIndex (évite les doublons T + session pour un même élève)
CREATE UNIQUE INDEX "BacBlanc_userId_trimestre_sessionNumber_key" ON "BacBlanc"("userId", "trimestre", "sessionNumber");
