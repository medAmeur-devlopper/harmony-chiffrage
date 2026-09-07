-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#FFC933',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'A_VENIR',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "lotId" TEXT,
    "lotPhaseId" TEXT,
    CONSTRAINT "Milestone_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Milestone_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Milestone_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Milestone_lotPhaseId_fkey" FOREIGN KEY ("lotPhaseId") REFERENCES "LotPhase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Milestone" ("color", "completed", "createdAt", "date", "description", "id", "name", "orderNum", "projectVersionId") SELECT "color", "completed", "createdAt", "date", "description", "id", "name", "orderNum", "projectVersionId" FROM "Milestone";
DROP TABLE "Milestone";
ALTER TABLE "new_Milestone" RENAME TO "Milestone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
