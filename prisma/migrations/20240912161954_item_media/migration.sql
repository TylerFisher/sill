/*
  Warnings:

  - You are about to drop the column `thumbnail` on the `Feed` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Feed" DROP COLUMN "thumbnail";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "thumbnail";

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "itemId" UUID;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
