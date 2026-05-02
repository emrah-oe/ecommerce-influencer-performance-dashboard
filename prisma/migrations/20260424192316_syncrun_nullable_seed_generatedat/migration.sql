-- AlterTable
ALTER TABLE "sync_runs" ALTER COLUMN "seed" DROP NOT NULL,
ALTER COLUMN "generated_at" DROP NOT NULL;
