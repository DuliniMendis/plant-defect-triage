import { z } from "zod";
import { confidences, severities } from "@/lib/schema";

// What the model is asked to return: only the fields that need judgement about
// this defect. Fields that follow from the asset's records or from a fixed rule
// (priority, taking the asset out of service, and parts and hours when an
// earlier work order covers the same component) are filled by the server in
// `fill-from-records.ts`, not by the model.
//
// Kept free of length and range limits, which structured output does not
// always support; the full draft is checked against `triageDraftSchema` after
// the server has filled it in.
export const aiFillSchema = z.object({
  issue: z.object({
    title: z.string().describe("Short issue title, under 60 characters."),
    description: z
      .string()
      .describe("Two or three sentences: what is wrong, where, and how it was found."),
    component: z
      .string()
      .describe(
        "Affected component. Reuse the exact component name from the asset's history when it is the same part.",
      ),
    severity: z.enum(severities),
    severityReason: z.string().describe("One sentence explaining the severity."),
    safeToOperate: z.boolean(),
  }),
  photoObservations: z
    .array(z.string())
    .describe(
      "What can be seen in the photos, one point per item, kept apart from what the operator said. Empty when there are no photos.",
    ),
  repeat: z.object({
    isRepeat: z.boolean(),
    relatedHistoryIds: z
      .array(z.string())
      .describe("IDs of earlier history entries this repeats, copied exactly from the history."),
    summary: z.string(),
  }),
  workOrder: z.object({
    title: z.string().describe("Work order title, starting with a verb."),
    tasks: z.array(z.string()).describe("Steps for the technician, in order."),
    parts: z.array(z.string()).describe("Likely parts and consumables."),
    estimatedHours: z.number().describe("Estimated labour hours, such as 1.5."),
  }),
  confidence: z.enum(confidences),
  clarifyingQuestion: z
    .string()
    .nullable()
    .describe("One question for the operator when the input is unclear, otherwise null."),
});

export type AiFill = z.infer<typeof aiFillSchema>;
