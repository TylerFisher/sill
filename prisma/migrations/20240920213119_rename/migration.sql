/*
  Warnings:

  - You are about to drop the column `mastodon_instance` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "mastodon_instance",
ADD COLUMN     "mastodonInstance" TEXT;
