-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_actorHandle_fkey";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_actorHandle_fkey" FOREIGN KEY ("actorHandle") REFERENCES "Actor"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
