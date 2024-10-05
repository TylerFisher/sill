-- CreateTable
CREATE TABLE "PostImage" (
    "id" UUID NOT NULL,
    "alt" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "postId" UUID NOT NULL,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_url_key" ON "PostImage"("url");

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
