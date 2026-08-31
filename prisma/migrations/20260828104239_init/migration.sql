-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONSULTANT',
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "reference" TEXT,
    "preparedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iaLevel" TEXT NOT NULL DEFAULT 'SANS',
    "provisionRisqueOperationnel" REAL NOT NULL DEFAULT 0.05,
    "provisionRisqueFinancier" REAL NOT NULL DEFAULT 0.05,
    "markupProvisions" REAL NOT NULL DEFAULT 0.3,
    "garantieBonneExecution" REAL NOT NULL DEFAULT 0.03,
    "penaliteRetardPlafond" REAL NOT NULL DEFAULT 0.1,
    "fourchetteHaute" REAL NOT NULL DEFAULT 0.2,
    "fourchetteBasse" REAL NOT NULL DEFAULT -0.25,
    "tva" REAL NOT NULL DEFAULT 0,
    "echeancierLancement" REAL NOT NULL DEFAULT 0.3,
    "echeancierRecetteFinale" REAL NOT NULL DEFAULT 0.6,
    "echeancierRetenue" REAL NOT NULL DEFAULT 0.1,
    "projectStartDate" DATETIME,
    "chargeDirecte" REAL,
    "prixCibleHT" REAL,
    CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cjm" REAL NOT NULL,
    "markupPct" REAL NOT NULL,
    "entity" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Profile_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplexityLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chargeJH" REAL NOT NULL,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ComplexityLevel_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IaLevelOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratio" REAL NOT NULL,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IaLevelOption_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Epic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lot" TEXT,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Epic_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "epicName" TEXT NOT NULL,
    "moduleName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requiresHardware" BOOLEAN NOT NULL DEFAULT false,
    "complexity" TEXT NOT NULL,
    "chargeAbaque" REAL NOT NULL DEFAULT 0,
    "chargeRetenue" REAL NOT NULL DEFAULT 0,
    "chargeIoT" REAL NOT NULL DEFAULT 0,
    "moscow" TEXT NOT NULL DEFAULT 'MUST',
    "retained" BOOLEAN NOT NULL DEFAULT true,
    "coverage" TEXT NOT NULL DEFAULT 'A_DEVELOPPER',
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Requirement_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "activityName" TEXT,
    "profileId" TEXT,
    "abaquePct" REAL NOT NULL DEFAULT 0,
    "gainRefPct" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Activity_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Lot_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LotPhase_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" REAL NOT NULL,
    "markupPct" REAL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "profileId" TEXT,
    "isHumanResource" BOOLEAN NOT NULL DEFAULT false,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ResourceLine_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceLine_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
