/*
  Warnings:

  - Added the required column `quotingId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "quotingId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotingId_fkey" FOREIGN KEY ("quotingId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
