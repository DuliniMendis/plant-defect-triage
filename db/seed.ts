import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { seedAssets, seedHistory } from "./seed-data";

// `pnpm db:seed`: restores the demo data to its starting state (R29). Safe to
// run any number of times. It removes every asset, which cascades to history,
// work orders and their photo rows, then inserts the seed data again, all in
// one transaction.
//
// It connects directly rather than through db/client.ts, because that module
// is marked server-only and cannot be imported from a plain Node script.
//
// Photo files in Vercel Blob are not removed yet; that arrives with photo
// uploads in milestone 4.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run `vercel env pull .env.local` first.",
  );
  process.exit(1);
}

async function main(url: string) {
  const db = drizzle({ connection: url, schema });
  try {
    await db.transaction(async (tx) => {
      await tx.delete(schema.assets);
      await tx.insert(schema.assets).values(seedAssets);
      await tx.insert(schema.historyEntries).values(seedHistory);
    });
    console.log(
      `Seeded ${seedAssets.length} assets and ${seedHistory.length} history entries.`,
    );
  } finally {
    await db.$client.end();
  }
}

main(url).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
