/*
  Warnings:

  - A unique constraint covering the columns `[postUrl]` on the table `LinkPost` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `linkUrl` to the `LinkPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postUrl` to the `LinkPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `LinkPost` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LinkPostType" AS ENUM ('bluesky', 'mastodon');

-- AlterTable
ALTER TABLE "LinkPost" ADD COLUMN     "linkUrl" TEXT NOT NULL,
ADD COLUMN     "postUrl" TEXT NOT NULL,
ADD COLUMN     "type" "LinkPostType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LinkPost_postUrl_key" ON "LinkPost"("postUrl");
