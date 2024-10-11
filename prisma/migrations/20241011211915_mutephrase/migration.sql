-- CreateTable
CREATE TABLE "MutePhrase" (
    "id" UUID NOT NULL,
    "phrase" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "MutePhrase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MutePhrase" ADD CONSTRAINT "MutePhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
