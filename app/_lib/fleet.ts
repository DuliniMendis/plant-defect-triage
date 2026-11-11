import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assets } from "@/db/schema";

// The fleet as shown on the fleet screen. Not cached: status changes when a
// work order is approved (R25), so the list is read on every request.
export async function listFleet() {
  return getDb()
    .select({
      id: assets.id,
      name: assets.name,
      make: assets.make,
      model: assets.model,
      site: assets.site,
      status: assets.status,
    })
    .from(assets)
    .orderBy(asc(assets.id));
}
