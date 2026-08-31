-- CreateTable
CREATE TABLE "StaffingEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectVersionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "daysStaffed" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "StaffingEntry_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffingEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffingEntry_profileId_weekStart_key" ON "StaffingEntry"("profileId", "weekStart");
