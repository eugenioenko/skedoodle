-- Delete existing commands that lack sketchId (no way to backfill)
DELETE FROM "Command";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Command" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "sketchId" TEXT NOT NULL,
    CONSTRAINT "Command_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Command_sketchId_fkey" FOREIGN KEY ("sketchId") REFERENCES "Sketch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
DROP TABLE "Command";
ALTER TABLE "new_Command" RENAME TO "Command";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
