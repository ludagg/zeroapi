-- CreateEnum
CREATE TYPE "TemplateVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable: publish flag on jobs (PUBLIC = published as a community template)
ALTER TABLE "Job" ADD COLUMN "visibility" "TemplateVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable: marketplace templates (official + community)
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '✦',
    "spec" JSONB NOT NULL,
    "authorId" TEXT,
    "jobId" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "TemplateVisibility" NOT NULL DEFAULT 'PRIVATE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_jobId_key" ON "Template"("jobId");

-- CreateIndex
CREATE INDEX "Template_visibility_isOfficial_usageCount_idx" ON "Template"("visibility", "isOfficial", "usageCount" DESC);

-- CreateIndex
CREATE INDEX "Template_authorId_idx" ON "Template"("authorId");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
