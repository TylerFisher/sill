/*
  Warnings:

  - You are about to drop the column `mastodonInstance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AtprotoSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AtprotoState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OauthToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OauthToken" DROP CONSTRAINT "OauthToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "mastodonInstance";

-- DropTable
DROP TABLE "AtprotoSession";

-- DropTable
DROP TABLE "AtprotoState";

-- DropTable
DROP TABLE "OauthToken";

-- DropEnum
DROP TYPE "TokenTypes";

-- CreateTable
CREATE TABLE "MastodonOauthToken" (
    "id" UUID NOT NULL,
    "instance" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresIn" INTEGER,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "MastodonOauthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueskyAccount" (
    "id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "refreshJwt" TEXT NOT NULL,
    "accessJwt" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "email" TEXT,
    "emailConfirmed" BOOLEAN,
    "emailAuthFactor" BOOLEAN,
    "active" BOOLEAN NOT NULL,
    "status" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "BlueskyAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MastodonOauthToken" ADD CONSTRAINT "MastodonOauthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueskyAccount" ADD CONSTRAINT "BlueskyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
