/*
  Warnings:

  - You are about to drop the column `actorId` on the `LinkPost` table. All the data in the column will be lost.
  - You are about to drop the column `linkId` on the `LinkPost` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `LinkPost` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[linkUrl,postUrl,userId,actorHandle]` on the table `LinkPost` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actorHandle` to the `LinkPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `linkUrl` to the `LinkPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postUrl` to the `LinkPost` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_actorId_fkey";

-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_linkId_fkey";

-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_postId_fkey";

-- AlterTable
ALTER TABLE "LinkPost" DROP COLUMN "actorId",
DROP COLUMN "linkId",
DROP COLUMN "postId",
ADD COLUMN     "actorHandle" TEXT NOT NULL,
ADD COLUMN     "linkUrl" TEXT NOT NULL,
ADD COLUMN     "postUrl" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LinkPost_linkUrl_postUrl_userId_actorHandle_key" ON "LinkPost"("linkUrl", "postUrl", "userId", "actorHandle");

-- AddForeignKey
ALTER TABLE "LinkPost" ADD CONSTRAINT "LinkPost_linkUrl_fkey" FOREIGN KEY ("linkUrl") REFERENCES "Link"("url") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkPost" ADD CONSTRAINT "LinkPost_postUrl_fkey" FOREIGN KEY ("postUrl") REFERENCES "Post"("url") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkPost" ADD CONSTRAINT "LinkPost_actorHandle_fkey" FOREIGN KEY ("actorHandle") REFERENCES "Actor"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;
