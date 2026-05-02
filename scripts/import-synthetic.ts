import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = path.join(process.cwd(), "data", "synthetic");

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;
}

interface RawInfluencer {
  id: string;
  handle: string;
  volumeClass: "top" | "mid" | "long_tail";
  isMixed: boolean;
  discountCode: { code: string };
  returnProfile: {
    noReturnRatio: number;
    partialReturnRatio: number;
    fullReturnRatio: number;
  };
}

interface RawOrder {
  orderId: string;
  orderDate: string;
  grossRevenue: number;
  hasDiscountCode: boolean;
  usedDiscountCode: string | null;
  attributionStatus: "clean_influencer" | "mixed_code" | "unknown";
  attributedInfluencerId: string | null;
  returnStatus: "no_return" | "partial_return" | "full_return";
  refundAmount: number;
  returnSource: "tag" | "metafield" | "none";
  rawTags: unknown;
  rawMetafields: unknown;
  rawOrderPayload: unknown;
  isEdgeCase: boolean;
}

interface RawSyncRun {
  seed: number;
  generatedAt: string;
  config: unknown;
  counts: unknown;
}

async function main() {
  // JSON vorab lesen – Influencer-IDs werden für den gezielten Delete benötigt
  const rawInfluencers = readJson<RawInfluencer[]>("influencers.json");
  const rawSync = readJson<RawSyncRun>("sync_run.json");
  const syntheticInfluencerIds = rawInfluencers.map((inf) => inf.id);

  const orderFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("orders_") && f.endsWith(".json"))
    .sort();
  const totalOrdersInJson = orderFiles.reduce((sum, f) => {
    const orders = readJson<RawOrder[]>(f);
    return sum + orders.length;
  }, 0);

  // ── Sicherheitsausgabe ────────────────────────────────────────────────────
  console.log("=== Synthetischer Import – Sicherheitsausgabe ===");
  console.log(`  Influencer aus JSON:       ${syntheticInfluencerIds.length}`);
  console.log(`  Orders aus JSON:           ${totalOrdersInJson}`);
  console.log(`  Delete-Filter Orders:      orderId startsWith "ord_"`);
  console.log(`  Delete-Filter Influencer:  id IN [${syntheticInfluencerIds.length} explizite IDs]`);
  console.log(`  Delete-Filter SyncRuns:    seed = ${rawSync.seed}`);
  console.log(`  Shopify-Orders (shopify_*) werden NICHT gelöscht`);
  console.log(`  Shopify-Influencer (inf_shopify_*) werden NICHT gelöscht`);
  console.log(`  Shopify-SyncRuns (seed IS NULL) werden NICHT gelöscht`);
  console.log("=================================================");

  // ── Gezieltes Löschen – nur synthetische Datensätze ──────────────────────
  // Reihenfolge beachten: Orders zuerst (FK-Constraint auf Influencer)
  console.log("\nLösche vorhandene synthetische Daten (gefiltert)...");

  const deletedOrders = await prisma.order.deleteMany({
    where: { orderId: { startsWith: "ord_" } },
  });
  console.log(`  Orders gelöscht: ${deletedOrders.count}`);

  const deletedInfluencers = await prisma.influencer.deleteMany({
    where: { id: { in: syntheticInfluencerIds } },
  });
  console.log(`  Influencer gelöscht: ${deletedInfluencers.count}`);

  const deletedSyncRuns = await prisma.syncRun.deleteMany({
    where: { seed: rawSync.seed },
  });
  console.log(`  SyncRuns gelöscht: ${deletedSyncRuns.count}`);

  // ── Import ────────────────────────────────────────────────────────────────
  console.log("\nImportiere synthetische Daten...");

  // 1. Influencer
  await prisma.influencer.createMany({
    data: rawInfluencers.map((inf) => ({
      id: inf.id,
      handle: inf.handle,
      volumeClass: inf.volumeClass,
      isMixed: inf.isMixed,
      discountCode: inf.discountCode.code,
      noReturnRatio: inf.returnProfile.noReturnRatio,
      partialReturnRatio: inf.returnProfile.partialReturnRatio,
      fullReturnRatio: inf.returnProfile.fullReturnRatio,
    })),
  });
  console.log(`  Influencer importiert: ${rawInfluencers.length}`);

  // 2. Orders (alle Monatsdateien)
  let totalOrders = 0;
  for (const file of orderFiles) {
    const rawOrders = readJson<RawOrder[]>(file);
    await prisma.order.createMany({
      data: rawOrders.map((o) => ({
        orderId: o.orderId,
        orderDate: new Date(o.orderDate),
        grossRevenue: new Prisma.Decimal(o.grossRevenue),
        hasDiscountCode: o.hasDiscountCode,
        usedDiscountCode: o.usedDiscountCode,
        attributionStatus: o.attributionStatus,
        attributedInfluencerId: o.attributedInfluencerId,
        returnStatus: o.returnStatus,
        refundAmount: new Prisma.Decimal(o.refundAmount),
        returnSource: o.returnSource,
        rawTags: o.rawTags as Prisma.InputJsonValue,
        rawMetafields: o.rawMetafields as Prisma.InputJsonValue,
        rawOrderPayload: o.rawOrderPayload as Prisma.InputJsonValue,
        isEdgeCase: o.isEdgeCase,
      })),
    });
    console.log(`  Orders importiert (${file}): ${rawOrders.length}`);
    totalOrders += rawOrders.length;
  }
  console.log(`  Orders gesamt: ${totalOrders}`);

  // 3. SyncRun
  await prisma.syncRun.create({
    data: {
      seed: rawSync.seed,
      generatedAt: new Date(rawSync.generatedAt),
      config: rawSync.config as Prisma.InputJsonValue,
      counts: rawSync.counts as Prisma.InputJsonValue,
      status: "success",
    },
  });
  console.log("  SyncRun importiert: 1");
}

main()
  .catch((err) => {
    console.error("Import fehlgeschlagen:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
