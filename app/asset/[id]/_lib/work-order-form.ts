import {
  priorities,
  severities,
  triageDraftSchema,
  type Priority,
  type Severity,
  type TriageDraft,
} from "@/lib/schema";

// The issue and work order form (R20) works on strings, as form controls do.
// These functions turn a draft into form values and back. In milestone 6 the
// AI's draft fills the same form through `valuesFromDraft`.

export type FormValues = {
  issueTitle: string;
  description: string;
  component: string;
  severity: Severity | "";
  severityReason: string;
  safeToOperate: "yes" | "no" | "";
  workOrderTitle: string;
  priority: Priority | "";
  /** One task per line. */
  tasks: string;
  /** One part per line. */
  parts: string;
  estimatedHours: string;
  takeOutOfService: boolean;
};

export type FieldErrors = Partial<Record<keyof FormValues, string>>;

/**
 * Empty values for a work order entered by hand. Severity, safe to operate
 * and priority start unanswered, so a person has to choose each one rather
 * than accept a default.
 */
export function blankValues(): FormValues {
  return {
    issueTitle: "",
    description: "",
    component: "",
    severity: "",
    severityReason: "",
    safeToOperate: "",
    workOrderTitle: "",
    priority: "",
    tasks: "",
    parts: "",
    estimatedHours: "",
    takeOutOfService: false,
  };
}

export function valuesFromDraft(draft: TriageDraft): FormValues {
  const { issue, workOrder } = draft;
  return {
    issueTitle: issue.title,
    description: issue.description,
    component: issue.component,
    severity: issue.severity,
    severityReason: issue.severityReason,
    safeToOperate: issue.safeToOperate ? "yes" : "no",
    workOrderTitle: workOrder.title,
    priority: workOrder.priority,
    tasks: workOrder.tasks.join("\n"),
    parts: workOrder.parts.join("\n"),
    estimatedHours: String(workOrder.estimatedHours),
    takeOutOfService: workOrder.takeOutOfService,
  };
}

/** Non-empty, trimmed lines. */
export function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Checks the form and builds the approved draft. Fields the form does not
 * show (photo observations, repeat check, confidence, clarifying question)
 * are kept from `base`, which is the AI's draft or a blank one.
 */
export function draftFromValues(
  values: FormValues,
  base: TriageDraft,
): { ok: true; draft: TriageDraft } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!values.issueTitle.trim()) errors.issueTitle = "Give the issue a title.";
  if (!(severities as readonly string[]).includes(values.severity)) {
    errors.severity = "Choose a severity.";
  }
  if (values.safeToOperate === "") {
    errors.safeToOperate = "Say whether the asset is safe to operate.";
  }
  if (!values.workOrderTitle.trim()) {
    errors.workOrderTitle = "Give the work order a title.";
  }
  if (!(priorities as readonly string[]).includes(values.priority)) {
    errors.priority = "Choose a priority.";
  }
  if (lines(values.tasks).length === 0) {
    errors.tasks = "Add at least one task.";
  }
  const hours = Number(values.estimatedHours.trim());
  if (values.estimatedHours.trim() === "" || !Number.isFinite(hours) || hours < 0) {
    errors.estimatedHours = "Enter the estimated hours as a number, such as 2.5.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const draft: TriageDraft = {
    ...base,
    issue: {
      title: values.issueTitle.trim(),
      description: values.description.trim(),
      component: values.component.trim(),
      severity: values.severity as Severity,
      severityReason: values.severityReason.trim(),
      safeToOperate: values.safeToOperate === "yes",
    },
    workOrder: {
      title: values.workOrderTitle.trim(),
      priority: values.priority as Priority,
      tasks: lines(values.tasks),
      parts: lines(values.parts),
      estimatedHours: hours,
      takeOutOfService: values.takeOutOfService,
    },
  };
  // The same schema the server checks, so the two cannot drift apart.
  const parsed = triageDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, errors: { issueTitle: "The form could not be read." } };
  }
  return { ok: true, draft: parsed.data };
}

/** The order errors are listed in, matching the order of the form. */
export const fieldOrder: (keyof FormValues)[] = [
  "issueTitle",
  "description",
  "component",
  "severity",
  "severityReason",
  "safeToOperate",
  "workOrderTitle",
  "priority",
  "tasks",
  "parts",
  "estimatedHours",
  "takeOutOfService",
];
