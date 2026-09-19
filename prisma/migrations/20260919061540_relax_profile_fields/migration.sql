-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileFor" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "hasChildren" TEXT,
    "heightCm" INTEGER,
    "physicalStatus" TEXT NOT NULL DEFAULT 'NOT_SAID',
    "disabilityNote" TEXT,
    "religion" TEXT,
    "sect" TEXT,
    "caste" TEXT,
    "subCaste" TEXT,
    "gotra" TEXT,
    "motherTongue" TEXT,
    "knownLanguages" JSONB,
    "manglik" TEXT,
    "rashi" TEXT,
    "nakshatra" TEXT,
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "state" TEXT,
    "city" TEXT,
    "residencyStatus" TEXT NOT NULL DEFAULT 'RESIDENT',
    "education" TEXT,
    "educationField" TEXT,
    "institution" TEXT,
    "occupationSector" TEXT,
    "occupation" TEXT,
    "incomeBand" TEXT,
    "diet" TEXT,
    "smoking" TEXT,
    "drinking" TEXT,
    "familyType" TEXT,
    "familyValues" TEXT,
    "fatherOccupation" TEXT,
    "motherOccupation" TEXT,
    "brothers" INTEGER,
    "sisters" INTEGER,
    "about" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hideLastName" BOOLEAN NOT NULL DEFAULT true,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("about", "birthPlace", "birthTime", "brothers", "caste", "city", "completedAt", "completeness", "country", "createdAt", "dateOfBirth", "diet", "disabilityNote", "drinking", "education", "educationField", "familyType", "familyValues", "fatherOccupation", "firstName", "gender", "gotra", "hasChildren", "heightCm", "hideLastName", "id", "incomeBand", "institution", "isHidden", "knownLanguages", "lastName", "manglik", "maritalStatus", "motherOccupation", "motherTongue", "nakshatra", "occupation", "occupationSector", "onboardingStep", "physicalStatus", "profileFor", "rashi", "religion", "residencyStatus", "sect", "sisters", "smoking", "state", "subCaste", "updatedAt", "userId") SELECT "about", "birthPlace", "birthTime", "brothers", "caste", "city", "completedAt", "completeness", "country", "createdAt", "dateOfBirth", "diet", "disabilityNote", "drinking", "education", "educationField", "familyType", "familyValues", "fatherOccupation", "firstName", "gender", "gotra", "hasChildren", "heightCm", "hideLastName", "id", "incomeBand", "institution", "isHidden", "knownLanguages", "lastName", "manglik", "maritalStatus", "motherOccupation", "motherTongue", "nakshatra", "occupation", "occupationSector", "onboardingStep", "physicalStatus", "profileFor", "rashi", "religion", "residencyStatus", "sect", "sisters", "smoking", "state", "subCaste", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE INDEX "Profile_gender_isHidden_completedAt_idx" ON "Profile"("gender", "isHidden", "completedAt");
CREATE INDEX "Profile_religion_idx" ON "Profile"("religion");
CREATE INDEX "Profile_state_idx" ON "Profile"("state");
CREATE INDEX "Profile_dateOfBirth_idx" ON "Profile"("dateOfBirth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
