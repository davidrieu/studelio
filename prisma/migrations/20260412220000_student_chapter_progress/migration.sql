-- CreateEnum
CREATE TYPE "ChapterProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "StudentChapterProgress" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" "ChapterProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentChapterProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentChapterProgress_studentProfileId_chapterId_key" ON "StudentChapterProgress"("studentProfileId", "chapterId");

-- AddForeignKey
ALTER TABLE "StudentChapterProgress" ADD CONSTRAINT "StudentChapterProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentChapterProgress" ADD CONSTRAINT "StudentChapterProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ProgrammeChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
