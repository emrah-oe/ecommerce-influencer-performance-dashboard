-- CreateEnum
CREATE TYPE "AttributionStatus" AS ENUM ('clean_influencer', 'mixed_code', 'unknown');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('no_return', 'partial_return', 'full_return');

-- CreateEnum
CREATE TYPE "ReturnSource" AS ENUM ('tag', 'metafield', 'none');

-- CreateEnum
CREATE TYPE "VolumeClass" AS ENUM ('top', 'mid', 'long_tail');

-- CreateTable
CREATE TABLE "influencers" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "volume_class" "VolumeClass" NOT NULL,
    "is_mixed" BOOLEAN NOT NULL,
    "discount_code" TEXT NOT NULL,
    "no_return_ratio" DOUBLE PRECISION NOT NULL,
    "partial_return_ratio" DOUBLE PRECISION NOT NULL,
    "full_return_ratio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "gross_revenue" DECIMAL(10,2) NOT NULL,
    "has_discount_code" BOOLEAN NOT NULL,
    "used_discount_code" TEXT,
    "attribution_status" "AttributionStatus" NOT NULL,
    "attributed_influencer_id" TEXT,
    "return_status" "ReturnStatus" NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "return_source" "ReturnSource" NOT NULL,
    "raw_tags" JSONB NOT NULL,
    "raw_metafields" JSONB NOT NULL,
    "raw_order_payload" JSONB NOT NULL,
    "is_edge_case" BOOLEAN NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" SERIAL NOT NULL,
    "seed" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "config" JSONB NOT NULL,
    "counts" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "influencers_handle_key" ON "influencers"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_discount_code_key" ON "influencers"("discount_code");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_attributed_influencer_id_fkey" FOREIGN KEY ("attributed_influencer_id") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
