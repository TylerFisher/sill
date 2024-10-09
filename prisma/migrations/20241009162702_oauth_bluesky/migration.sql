/*
  Warnings:

  - You are about to drop the column `active` on the `BlueskyAccount` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `BlueskyAccount` table. All the data in the column will be lost.
  - You are about to drop the column `emailAuthFactor` on the `BlueskyAccount` table. All the data in the column will be lost.
  - You are about to drop the column `emailConfirmed` on the `BlueskyAccount` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `BlueskyAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BlueskyAccount" DROP COLUMN "active",
DROP COLUMN "email",
DROP COLUMN "emailAuthFactor",
DROP COLUMN "emailConfirmed",
DROP COLUMN "status",
ALTER COLUMN "refreshJwt" DROP NOT NULL;
