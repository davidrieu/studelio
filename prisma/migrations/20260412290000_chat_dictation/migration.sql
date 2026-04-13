-- AlterEnum
ALTER TYPE "ChatSessionKind" ADD VALUE 'DICTATION';

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "dictationId" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_dictationId_idx" ON "ChatSession"("dictationId");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_dictationId_fkey" FOREIGN KEY ("dictationId") REFERENCES "ProgrammeDictation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
