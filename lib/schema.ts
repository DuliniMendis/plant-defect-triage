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
