/*
  Warnings:

  - You are about to drop the column `userId` on the `LinkPost` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[linkUrl,postUrl,actorHandle]` on the table `LinkPost` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_userId_fkey";

-- DropIndex
DROP INDEX "LinkPost_linkUrl_postUrl_userId_actorHandle_key";

-- AlterTable
ALTER TABLE "LinkPost" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "_LinkPostToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_LinkPostToUser_AB_unique" ON "_LinkPostToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_LinkPostToUser_B_index" ON "_LinkPostToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "LinkPost_linkUrl_postUrl_actorHandle_key" ON "LinkPost"("linkUrl", "postUrl", "actorHandle");

-- AddForeignKey
ALTER TABLE "_LinkPostToUser" ADD CONSTRAINT "_LinkPostToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "LinkPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkPostToUser" ADD CONSTRAINT "_LinkPostToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
