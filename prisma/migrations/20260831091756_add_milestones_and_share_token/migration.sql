/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `ProjectVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LotPhase" ADD COLUMN "manualStartDate" DATETIME;

-- AlterTable
ALTER TABLE "ProjectVersion" ADD COLUMN "shareToken" TEXT;

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#FFC933',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_shareToken_key" ON "ProjectVersion"("shareToken");
