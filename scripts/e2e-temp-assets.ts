import { existsSync, rmSync, writeFileSync } from "node:fs";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../db/schema";
import {
  currentRunTag,
  newRunTag,
  RUN_FILE,
  shouldRemove,
  TEMP_PREFIX,
  tempAssets,
  tempHistory,
} from "../e2e/support/temp-assets";
import { getPhotoStore } from "../lib/photo-store";

// `pnpm e2e:seed`: adds this run's temporary assets for the write specs and
// records the run tag in e2e/.temp-run.json.
// `pnpm e2e:clean`: removes this run's temporary assets, with their work
// orders, history and photos, plus any left by a run that died. Safe to run
// any number of times, and when nothing was seeded.
//
// See e2e/support/temp-assets.ts. Seeded demo assets are never touched: only
// IDs starting with "E2E-" are read or deleted.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function clean(db: Db) {
  const tag = currentRunTag();
  const temp = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(like(schema.assets.id, `${TEMP_PREFIX}%`));
  const ids = temp.map((a) => a.id).filter((id) => shouldRemove(id, { tag }));

  let photoPaths: string[] = [];
  if (ids.length > 0) {
    await db.transaction(async (tx) => {
      const photos = await tx
        .select({ blobPath: schema.workOrderPhotos.blobPath })
        .from(schema.workOrderPhotos)
        .innerJoin(schema.workOrders, eq(schema.workOrders.id, schema.workOrderPhotos.workOrderId))
        .where(inArray(schema.workOrders.assetId, ids));
      photoPaths = photos.map((p) => p.blobPath);
      // Work orders, their photo rows and history go with the asset (cascade).
      await tx.delete(schema.assets).where(inArray(schema.assets.id, ids));
    });
  }
  if (photoPaths.length > 0) await getPhotoStore().delete(photoPaths);
  rmSync(RUN_FILE, { force: true });
  console.log(
    `Removed ${ids.length} temporary E2E assets and ${photoPaths.length} photos.`,
  );
}

async function seed(db: Db) {
  // Clear anything a dead run left behind, and any earlier run in this folder.
  await clean(db);
  const tag = newRunTag();
  const rows = tempAssets(tag);
  await db.transaction(async (tx) => {
    await tx.insert(schema.assets).values(rows);
    await tx.insert(schema.historyEntries).values(tempHistory(tag));
  });
  writeFileSync(RUN_FILE, JSON.stringify({ tag }, null, 2) + "\n");
  console.log(`Seeded ${rows.length} temporary E2E assets for run ${tag}.`);
}

async function main(command: string | undefined) {
  if (command !== "seed" && command !== "clean") {
    console.error("Usage: tsx scripts/e2e-temp-assets.ts seed|clean");
    process.exit(1);
  }
  const db = drizzle({ connection: url!, schema });
  try {
    await (command === "seed" ? seed(db) : clean(db));
  } finally {
    await db.$client.end();
  }
}

main(process.argv[2]).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
