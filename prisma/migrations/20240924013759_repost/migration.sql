-- DropIndex
DROP INDEX "LinkPost_postUrl_key";

-- AlterTable
ALTER TABLE "LinkPost" ADD COLUMN     "repost" BOOLEAN NOT NULL DEFAULT false;
