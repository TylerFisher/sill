-- CreateTable
CREATE TABLE "AtprotoState" (
    "key" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "AtprotoState_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AtprotoSession" (
    "key" TEXT NOT NULL,
    "session" TEXT NOT NULL,

    CONSTRAINT "AtprotoSession_pkey" PRIMARY KEY ("key")
);
