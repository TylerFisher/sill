/*
  Warnings:

  - You are about to drop the `MastodonOauthToken` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `mostRecentPostDate` to the `BlueskyAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MastodonOauthToken" DROP CONSTRAINT "MastodonOauthToken_userId_fkey";

-- AlterTable
ALTER TABLE "BlueskyAccount" ADD COLUMN     "mostRecentPostDate" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "MastodonOauthToken";

-- CreateTable
CREATE TABLE "MastodonAccount" (
    "id" UUID NOT NULL,
    "instance" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresIn" INTEGER,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mostRecentPostId" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "MastodonAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkPost" (
    "id" UUID NOT NULL,

    CONSTRAINT "LinkPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MastodonAccount" ADD CONSTRAINT "MastodonAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
