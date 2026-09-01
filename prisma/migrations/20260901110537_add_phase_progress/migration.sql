-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LotPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "manualStartDate" DATETIME,
    "progress" REAL NOT NULL DEFAULT 0,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LotPhase_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LotPhase" ("durationWeeks", "endDate", "id", "lotId", "manualStartDate", "orderNum", "phase", "startDate") SELECT "durationWeeks", "endDate", "id", "lotId", "manualStartDate", "orderNum", "phase", "startDate" FROM "LotPhase";
DROP TABLE "LotPhase";
ALTER TABLE "new_LotPhase" RENAME TO "LotPhase";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
