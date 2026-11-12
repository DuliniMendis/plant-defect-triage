import { z } from "zod";

// The triage draft: what the AI returns, what the reviewer edits, and what is
// stored on a work order as `ai_draft` and `final`. One schema serves all three
// (technical plan v2, section 4).

export const severities = ["low", "medium", "high", "critical"] as const;
export const priorities = ["routine", "urgent", "immediate"] as const;
export const confidences = ["low", "medium", "high"] as const;

export const severitySchema = z.enum(severities);
export const prioritySchema = z.enum(priorities);
export const confidenceSchema = z.enum(confidences);

export const issueSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  component: z.string(),
  severity: severitySchema,
  severityReason: z.string(),
  safeToOperate: z.boolean(),
});

export const repeatCheckSchema = z.object({
  isRepeat: z.boolean(),
  relatedHistoryIds: z.array(z.string()),
  summary: z.string(),
});

export const proposedWorkOrderSchema = z.object({
  title: z.string().min(1),
  priority: prioritySchema,
  tasks: z.array(z.string()),
  parts: z.array(z.string()),
  estimatedHours: z.number().nonnegative(),
  takeOutOfService: z.boolean(),
});

export const triageDraftSchema = z.object({
  issue: issueSchema,
  photoObservations: z.array(z.string()),
  repeat: repeatCheckSchema,
  workOrder: proposedWorkOrderSchema,
  confidence: confidenceSchema,
  clarifyingQuestion: z.string().nullable(),
});

export type Severity = z.infer<typeof severitySchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type RepeatCheck = z.infer<typeof repeatCheckSchema>;
export type ProposedWorkOrder = z.infer<typeof proposedWorkOrderSchema>;
export type TriageDraft = z.infer<typeof triageDraftSchema>;

/**
 * A draft with every field empty, for a work order entered by hand. The parts
 * a person does not fill in (photo observations, repeat check, confidence,
 * clarifying question) belong to the AI draft in milestone 6 and stay empty.
 */
export function blankDraft(): TriageDraft {
  return {
    issue: {
      title: "",
      description: "",
      component: "",
      severity: "medium",
      severityReason: "",
      safeToOperate: true,
    },
    photoObservations: [],
    repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
    workOrder: {
      title: "",
      priority: "routine",
      tasks: [],
      parts: [],
      estimatedHours: 0,
      takeOutOfService: false,
    },
    // Confidence describes the AI's draft. A manual entry has none, so this is
    // a placeholder that is never shown; `aiDraft` being empty is what marks a
    // work order as manual.
    confidence: "high",
    clarifyingQuestion: null,
  };
}

// The body of POST /api/work-orders, sent as the `payload` field of a
// multipart form with the photos alongside (technical plan v2, section 5).
// `aiDraft` and `model` are empty for a work order entered by hand.
export const workOrderRequestSchema = z
  .object({
    assetId: z.string().min(1),
    notes: z.string(),
    aiDraft: triageDraftSchema.nullable(),
    final: triageDraftSchema,
    model: z.string().min(1).nullable(),
    // The AI run that produced `aiDraft` (R40). Empty for a manual entry, and
    // for an AI draft whose run could not be recorded.
    aiRunId: z.string().min(1).nullable().default(null),
  })
  // An AI draft always comes with the model that wrote it, and a manual
  // work order has neither (data model draft 2).
  .refine((r) => (r.aiDraft === null) === (r.model === null), {
    message: "An AI draft needs its model, and a manual entry has neither.",
    path: ["model"],
  })
  .refine((r) => r.aiRunId === null || r.aiDraft !== null, {
    message: "Only an AI draft has an AI run.",
    path: ["aiRunId"],
  });

export type WorkOrderRequest = z.infer<typeof workOrderRequestSchema>;
export type WorkOrderRequestInput = z.input<typeof workOrderRequestSchema>;

// The response of POST /api/triage (technical plan v2, section 5). The AI is
// asked only for the fields that need judgement. `filled` lists the fields the
// server set from the asset's records or from a fixed rule instead, with a
// short note saying where each came from, so the form can show it.
export const filledSources = ["records", "rule"] as const;
export type FilledSource = (typeof filledSources)[number];

export const filledFieldSchema = z.object({
  /** Dotted path in the draft, such as "workOrder.priority". */
  path: z.string(),
  source: z.enum(filledSources),
  note: z.string(),
});
export type FilledField = z.infer<typeof filledFieldSchema>;

export const triageResponseSchema = z.object({
  draft: triageDraftSchema,
  model: z.string().min(1),
  durationMs: z.number(),
  filled: z.array(filledFieldSchema),
  /** The recorded AI run, sent back with the approval (R40). Null if recording failed. */
  runId: z.string().nullable(),
});
export type TriageResponse = z.infer<typeof triageResponseSchema>;

/**
 * A clarifying question the AI asked about a report, and the reviewer's
 * answer. Sent back with the original notes and photos for a fresh draft
 * (R23, technical plan section 6).
 */
export type Clarification = { question: string; answer: string };
