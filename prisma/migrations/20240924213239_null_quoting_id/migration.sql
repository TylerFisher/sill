-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_quotingId_fkey";

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "quotingId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotingId_fkey" FOREIGN KEY ("quotingId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
