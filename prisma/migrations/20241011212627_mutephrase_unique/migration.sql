/*
  Warnings:

  - A unique constraint covering the columns `[userId,phrase]` on the table `MutePhrase` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MutePhrase_userId_phrase_key" ON "MutePhrase"("userId", "phrase");
