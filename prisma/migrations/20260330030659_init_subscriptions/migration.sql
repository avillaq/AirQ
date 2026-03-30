-- CreateTable
CREATE TABLE "subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "threshold" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "unsubscribe_token" TEXT,
    "last_alert_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_unsubscribe_token_key" ON "subscriptions"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
