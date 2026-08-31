-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResourceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "exchangeRate" REAL NOT NULL DEFAULT 1,
    "markupPct" REAL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "profileId" TEXT,
    "isHumanResource" BOOLEAN NOT NULL DEFAULT false,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ResourceLine_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceLine_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ResourceLine" ("category", "entity", "id", "isHumanResource", "markupPct", "orderNum", "profileId", "projectVersionId", "quantity", "resourceName", "unit", "unitCost") SELECT "category", "entity", "id", "isHumanResource", "markupPct", "orderNum", "profileId", "projectVersionId", "quantity", "resourceName", "unit", "unitCost" FROM "ResourceLine";
DROP TABLE "ResourceLine";
ALTER TABLE "new_ResourceLine" RENAME TO "ResourceLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
