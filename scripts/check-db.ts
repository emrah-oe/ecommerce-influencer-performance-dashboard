import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DATA_DIR = path.join(process.cwd(), "data", "synthetic");
const syntheticInfluencerIds: string[] = (
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, "influencers.json"), "utf-8")) as { id: string }[]
).map((inf) => inf.id);

const syntheticOrder = { orderId: { startsWith: "ord_" } } as const;

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark}  ${label}: ${actual}${ok ? "" : `  (erwartet: ${expected})`}`);
  if (!ok) failures++;
}

function checkRange(label: string, actual: number, min: number, max: number) {
  const ok = actual >= min && actual <= max;
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark}  ${label}: ${actual}  (erwartet: ${min}–${max})`);
  if (!ok) failures++;
}

async function main() {
  console.log("\n=== Datenbankprüfung (synthetische Daten) ===\n");

  // Grundzählungen
  console.log("Grundzählungen:");
  const [influencerCount, orderCount, syncRunCount] = await Promise.all([
    prisma.influencer.count({ where: { id: { in: syntheticInfluencerIds } } }),
    prisma.order.count({ where: syntheticOrder }),
    prisma.syncRun.count({ where: { seed: 42 } }),
  ]);
  check("Influencer", influencerCount, 30);
  check("Orders gesamt", orderCount, 24000);
  check("SyncRuns", syncRunCount, 1);

  // Monatsverteilung
  console.log("\nMonatsverteilung:");
  const months = ["2026-01", "2026-02", "2026-03"];
  for (const month of months) {
    const [yearRaw, monthRaw] = month.split("-");
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    const from = new Date(Date.UTC(year, monthIndex, 1));
    const to = new Date(Date.UTC(year, monthIndex + 1, 1));
    const count = await prisma.order.count({
      where: { ...syntheticOrder, orderDate: { gte: from, lt: to } },
    });
    check(`Orders ${month}`, count, 8000);
  }

  // Edge Cases
  console.log("\nEdge Cases:");
  const edgeCases = await prisma.order.count({
    where: { ...syntheticOrder, isEdgeCase: true },
  });
  check("Edge Cases", edgeCases, 6);

  // Attributionsstatus
  console.log("\nAttributionsstatus (Plausibilität):");
  const [cleanCount, mixedCount, unknownCount] = await Promise.all([
    prisma.order.count({ where: { ...syntheticOrder, attributionStatus: "clean_influencer" } }),
    prisma.order.count({ where: { ...syntheticOrder, attributionStatus: "mixed_code" } }),
    prisma.order.count({ where: { ...syntheticOrder, attributionStatus: "unknown" } }),
  ]);
  check("Summe Attributionsstatus", cleanCount + mixedCount + unknownCount, 24000);
  checkRange("clean_influencer", cleanCount, 7500, 14000);
  checkRange("mixed_code", mixedCount, 4500, 11000);
  checkRange("unknown", unknownCount, 2500, 7500);

  // Returnstatus
  console.log("\nReturnstatus (Plausibilität):");
  const [noReturn, partialReturn, fullReturn] = await Promise.all([
    prisma.order.count({ where: { ...syntheticOrder, returnStatus: "no_return" } }),
    prisma.order.count({ where: { ...syntheticOrder, returnStatus: "partial_return" } }),
    prisma.order.count({ where: { ...syntheticOrder, returnStatus: "full_return" } }),
  ]);
  check("Summe Returnstatus", noReturn + partialReturn + fullReturn, 24000);
  checkRange("no_return", noReturn, 15000, 21000);
  checkRange("partial_return", partialReturn, 2000, 6000);
  checkRange("full_return", fullReturn, 1000, 4000);

  // Gesamtergebnis
  console.log(`\n${"=".repeat(30)}`);
  if (failures === 0) {
    console.log("Alle Prüfungen bestanden.");
  } else {
    console.log(`${failures} Prüfung(en) fehlgeschlagen.`);
    process.exit(1);
  }

  // Shopify-Daten (nur Info, keine Testbedingung)
  console.log("\n=== Shopify-Daten (Info) ===");
  const [shopifyOrders, shopifyInfluencers, shopifySyncRuns] = await Promise.all([
    prisma.order.count({ where: { orderId: { startsWith: "shopify_" } } }),
    prisma.influencer.count({ where: { id: { startsWith: "inf_shopify_" } } }),
    prisma.syncRun.count({ where: { seed: null } }),
  ]);
  console.log(`  Shopify-Orders:      ${shopifyOrders}`);
  console.log(`  Shopify-Influencer:  ${shopifyInfluencers}`);
  console.log(`  Shopify-SyncRuns:    ${shopifySyncRuns}`);
}

main()
  .catch((err) => {
    console.error("Fehler:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
