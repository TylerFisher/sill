/*
  Warnings:

  - You are about to alter the column `followingCount` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `followersCount` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `postsCount` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `repliesCount` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesCount` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `likesCount` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Actor" ALTER COLUMN "followingCount" SET DATA TYPE INTEGER,
ALTER COLUMN "followersCount" SET DATA TYPE INTEGER,
ALTER COLUMN "postsCount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "repliesCount" SET DATA TYPE INTEGER,
ALTER COLUMN "sharesCount" SET DATA TYPE INTEGER,
ALTER COLUMN "likesCount" SET DATA TYPE INTEGER;
