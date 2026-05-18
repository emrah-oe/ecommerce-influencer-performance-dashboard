-- Enable Row Level Security on all tables.
-- No policies are defined: the anon role sees zero rows via PostgREST.
-- Prisma connects as the database owner and is unaffected by RLS unless
-- FORCE ROW LEVEL SECURITY is set (which it is not here).
ALTER TABLE "influencers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_runs" ENABLE ROW LEVEL SECURITY;

-- Index on order_date to support time-range dashboard filters without full scans.
CREATE INDEX IF NOT EXISTS "orders_order_date_idx" ON "orders"("order_date");
