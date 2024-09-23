/*
  Warnings:

  - A unique constraint covering the columns `[handle]` on the table `BlueskyAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[did]` on the table `BlueskyAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BlueskyAccount_handle_key" ON "BlueskyAccount"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "BlueskyAccount_did_key" ON "BlueskyAccount"("did");
