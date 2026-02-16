-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sketch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "positionX" REAL,
    "positionY" REAL,
    "zoom" REAL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Sketch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sketch" ("color", "createdAt", "id", "name", "ownerId", "positionX", "positionY", "updatedAt", "zoom") SELECT "color", "createdAt", "id", "name", "ownerId", "positionX", "positionY", "updatedAt", "zoom" FROM "Sketch";
DROP TABLE "Sketch";
ALTER TABLE "new_Sketch" RENAME TO "Sketch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
