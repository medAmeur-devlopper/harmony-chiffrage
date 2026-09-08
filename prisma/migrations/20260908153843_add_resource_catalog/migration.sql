-- CreateTable
CREATE TABLE "ResourceCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cjm" REAL NOT NULL,
    "markupPct" REAL NOT NULL DEFAULT 0.3,
    "entity" TEXT NOT NULL DEFAULT 'Harmony',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResourceCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCatalog_organizationId_code_key" ON "ResourceCatalog"("organizationId", "code");
