-- CreateTable
CREATE TABLE "AtprotoAuthSession" (
    "key" TEXT NOT NULL,
    "session" TEXT NOT NULL,

    CONSTRAINT "AtprotoAuthSession_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AtprotoAuthState" (
    "key" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "AtprotoAuthState_pkey" PRIMARY KEY ("key")
);
