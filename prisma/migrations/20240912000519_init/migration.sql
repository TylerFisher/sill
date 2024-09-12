-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'unlisted', 'private', 'direct');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('Article', 'Note');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('Application', 'Group', 'Organization', 'Person', 'Service');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actor" (
    "id" UUID NOT NULL,
    "iri" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "type" "ActorType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "bioHtml" TEXT,
    "url" TEXT,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "inboxUrl" TEXT NOT NULL,
    "followersUrl" TEXT,
    "sharedInboxUrl" TEXT,
    "followingCount" BIGINT DEFAULT 0,
    "followersCount" BIGINT DEFAULT 0,
    "postsCount" BIGINT DEFAULT 0,
    "published" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'public',
    "userId" UUID,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorKeys" (
    "rsaPrivateKeyJWK" JSONB NOT NULL,
    "rsaPublicKeyJWK" JSONB NOT NULL,
    "ed25519PrivateKeyJWK" JSONB NOT NULL,
    "ed25519PublicKeyJWK" JSONB NOT NULL,
    "actorId" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "charSet" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "iri" TEXT NOT NULL,
    "followingId" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "shares" BOOLEAN NOT NULL DEFAULT true,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[],
    "created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved" TIMESTAMPTZ(6),

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followingId","followerId")
);

-- CreateTable
CREATE TABLE "Like" (
    "postId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("postId","actorId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "postId" UUID,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "description" TEXT,
    "thumbnailType" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "thumbnailWidth" INTEGER NOT NULL,
    "thumbnailHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "postId" UUID NOT NULL,
    "actorId" UUID NOT NULL,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("postId","actorId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" UUID NOT NULL,
    "iri" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "actorId" UUID NOT NULL,
    "replyTargetId" UUID,
    "sharingId" UUID,
    "visibility" "Visibility" NOT NULL,
    "summaryHtml" TEXT,
    "summary" TEXT,
    "contentHtml" TEXT,
    "content" TEXT,
    "language" TEXT,
    "tags" JSONB NOT NULL DEFAULT '{}',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "repliesCount" BIGINT DEFAULT 0,
    "sharesCount" BIGINT DEFAULT 0,
    "likesCount" BIGINT DEFAULT 0,
    "published" TIMESTAMPTZ(6),
    "updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feed" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedId" UUID NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "feedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" UUID,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemStatus" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_iri_key" ON "Actor"("iri");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_handle_key" ON "Actor"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_userId_key" ON "Actor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActorKeys_actorId_key" ON "ActorKeys"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_target_type_key" ON "Verification"("target", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_iri_key" ON "Follow"("iri");

-- CreateIndex
CREATE UNIQUE INDEX "Post_iri_key" ON "Post"("iri");

-- CreateIndex
CREATE UNIQUE INDEX "Post_id_actorId_key" ON "Post"("id", "actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Feed_url_key" ON "Feed"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Item_url_feedId_key" ON "Item"("url", "feedId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_feedId_key" ON "Subscription"("userId", "feedId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemStatus_userId_itemId_key" ON "ItemStatus"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_userId_key" ON "Category"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ActorKeys" ADD CONSTRAINT "ActorKeys_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_replyTargetId_fkey" FOREIGN KEY ("replyTargetId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sharingId_fkey" FOREIGN KEY ("sharingId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStatus" ADD CONSTRAINT "ItemStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStatus" ADD CONSTRAINT "ItemStatus_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
