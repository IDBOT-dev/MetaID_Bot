/*
  Warnings:

  - You are about to alter the column `tgid` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tgid" INTEGER NOT NULL,
    "mneid" INTEGER NOT NULL,
    "path" INTEGER NOT NULL
);
INSERT INTO "new_User" ("id", "mneid", "path", "tgid") SELECT "id", "mneid", "path", "tgid" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_tgid_key" ON "User"("tgid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
