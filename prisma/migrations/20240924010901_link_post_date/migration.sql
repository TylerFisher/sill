/*
  Warnings:

  - Added the required column `postDate` to the `LinkPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LinkPost" ADD COLUMN     "postDate" TIMESTAMP(3) NOT NULL;
