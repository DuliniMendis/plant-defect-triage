import "server-only";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// The WebSocket driver is used rather than HTTP because approval writes the
// work order, history entry and status change in one transaction (R27).
// Node 22+ provides a global WebSocket, so no `ws` package is needed.

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull .env.local` after the Neon integration is installed.",
    );
  }
  return drizzle({ connection: url, schema });
}

let instance: ReturnType<typeof connect> | undefined;

// Connects on first use, so importing this module never fails at build time.
export function getDb() {
  instance ??= connect();
  return instance;
}
