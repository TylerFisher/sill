/*
  Warnings:

  - A unique constraint covering the columns `[feedUrl]` on the table `Feed` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `feedUrl` to the `Feed` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Feed_url_key";

-- AlterTable
ALTER TABLE "Feed" ADD COLUMN     "feedUrl" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Feed_feedUrl_key" ON "Feed"("feedUrl");
