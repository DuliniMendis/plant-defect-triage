import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { severities, type TriageDraft } from "../lib/schema";

// Tables from technical plan v2, section 4, and docs/data-model.md.

export const assetStatuses = [
  "operational",
  "needs-attention",
  "out-of-service",
] as const;
export const historyKinds = [
  "issue",
  "repair",
  "schedule-check",
  "work-order",
] as const;
export const entryStatuses = ["open", "closed"] as const;
export const runStatuses = ["succeeded", "failed"] as const;

const newId = () => crypto.randomUUID();

export const assets = pgTable("assets", {
  // Also the content of the asset's QR code, e.g. "EX-014".
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  category: text("category").notNull(),
  site: text("site").notNull(),
  meterHours: integer("meter_hours").notNull(),
  nextServiceDueHours: integer("next_service_due_hours").notNull(),
  status: text("status", { enum: assetStatuses }).notNull(),
});

export const workOrders = pgTable("work_orders", {
  id: text("id").primaryKey().$defaultFn(newId),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  approvedAt: timestamp("approved_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Operator notes as submitted.
  notes: text("notes").notNull().default(""),
  // Empty for a work order entered by hand (milestones, section 4).
  aiDraft: jsonb("ai_draft").$type<TriageDraft>(),
  final: jsonb("final").$type<TriageDraft>().notNull(),
  // Paths in `final` that differ from `aiDraft`, e.g. "issue.severity".
  changedFields: jsonb("changed_fields").$type<string[]>().notNull().default([]),
  // Model that produced the draft; empty for a manual work order.
  model: text("model"),
  // The AI run whose draft was approved; empty for a manual work order
  // (R40, data model draft 3).
  aiRunId: text("ai_run_id")
    .unique()
    .references(() => aiRuns.id, { onDelete: "set null" }),
});

// One row per AI draft request, succeeded or failed (R39, technical plan v3).
// Measurements only: no notes, photos or draft content.
export const aiRuns = pgTable("ai_runs", {
  id: text("id").primaryKey().$defaultFn(newId),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  model: text("model").notNull(),
  status: text("status", { enum: runStatuses }).notNull(),
  // A short code such as "model-call" when the run failed; never the error text.
  errorKind: text("error_kind"),
  durationMs: integer("duration_ms").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  // US dollars from AI Gateway, filled in after the response. Empty means
  // not known yet, not zero.
  costUsd: numeric("cost_usd", { precision: 12, scale: 8, mode: "number" }),
  generationId: text("generation_id"),
});

export const historyEntries = pgTable("history_entries", {
  id: text("id").primaryKey().$defaultFn(newId),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kind: text("kind", { enum: historyKinds }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  component: text("component"),
  severity: text("severity", { enum: severities }),
  meterHours: integer("meter_hours"),
  status: text("status", { enum: entryStatuses }).notNull(),
  // True for demo seed data, so the seed script can restore the starting state.
  seeded: boolean("seeded").notNull().default(false),
  // Set on the entry a work order creates (the "creates one" relationship).
  workOrderId: text("work_order_id").references(() => workOrders.id, {
    onDelete: "cascade",
  }),
});

export const workOrderPhotos = pgTable("work_order_photos", {
  id: text("id").primaryKey().$defaultFn(newId),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  blobPath: text("blob_path").notNull(),
  position: integer("position").notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type HistoryEntry = typeof historyEntries.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type WorkOrderPhoto = typeof workOrderPhotos.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type RunStatus = (typeof runStatuses)[number];
