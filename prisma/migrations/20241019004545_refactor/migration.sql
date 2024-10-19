/*
  Warnings:

  - You are about to drop the column `actorHandle` on the `LinkPost` table. All the data in the column will be lost.
  - You are about to drop the column `postUrl` on the `LinkPost` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[linkUrl,postId]` on the table `LinkPost` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `postId` to the `LinkPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repostHandle` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_actorHandle_fkey";

-- DropForeignKey
ALTER TABLE "LinkPost" DROP CONSTRAINT "LinkPost_postUrl_fkey";

-- DropIndex
DROP INDEX "LinkPost_linkUrl_postUrl_actorHandle_key";

-- DropIndex
DROP INDEX "Post_url_key";

-- AlterTable
ALTER TABLE "LinkPost" DROP COLUMN "actorHandle",
DROP COLUMN "postUrl",
ADD COLUMN     "postId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "repostHandle" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LinkPost_linkUrl_postId_key" ON "LinkPost"("linkUrl", "postId");

-- AddForeignKey
ALTER TABLE "LinkPost" ADD CONSTRAINT "LinkPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_repostHandle_fkey" FOREIGN KEY ("repostHandle") REFERENCES "Actor"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
