-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tgid" TEXT NOT NULL,
    "mneid" INTEGER NOT NULL,
    "path" INTEGER NOT NULL
);
INSERT INTO "new_User" ("id", "mneid", "path", "tgid") SELECT "id", "mneid", "path", "tgid" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_tgid_key" ON "User"("tgid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
