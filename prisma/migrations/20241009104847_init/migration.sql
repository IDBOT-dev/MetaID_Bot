-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tgid" TEXT NOT NULL,
    "mneid" INTEGER NOT NULL,
    "path" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_tgid_key" ON "User"("tgid");
