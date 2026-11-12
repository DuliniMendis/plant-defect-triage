"use client";

import Image from "next/image";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  priorities,
  severities,
  type Clarification,
  type Confidence,
  type FilledField,
  type Priority,
  type Severity,
  type TriageDraft,
  type TriageResponse,
} from "@/lib/schema";
import {
  draftFromValues,
  fieldOrder,
  type FieldErrors,
  type FormValues,
} from "../_lib/work-order-form";
import { formatDate } from "../_lib/format";
import { historyAnchor, useHighlightHistory, useLinkedHistory } from "./linked-history";
import { RequiredMark } from "./required-mark";

export type ReportPhoto = {
  id: number;
  name: string;
  url: string;
  width: number;
  height: number;
};

const severityLabels: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const severityDots: Record<Severity, string> = {
  low: "bg-severity-low",
  medium: "bg-severity-medium",
  high: "bg-severity-high",
  critical: "bg-severity-critical",
};

const priorityLabels: Record<Priority, string> = {
  routine: "Routine",
  urgent: "Urgent",
  immediate: "Immediate",
};

const confidenceLabels: Record<Confidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Draft paths the server can fill from records or rules, and the form field
// each one shows in.
const fieldForPath: Partial<Record<string, keyof FormValues>> = {
  "workOrder.priority": "priority",
  "workOrder.takeOutOfService": "takeOutOfService",
  "workOrder.parts": "parts",
  "workOrder.estimatedHours": "estimatedHours",
};

function filledByField(
  filled: readonly FilledField[] = [],
): Partial<Record<keyof FormValues, FilledField>> {
  const byField: Partial<Record<keyof FormValues, FilledField>> = {};
  for (const f of filled) {
    const field = fieldForPath[f.path];
    if (field) byField[field] = f;
  }
  return byField;
}

const requiredFields = new Set<keyof FormValues>([
  "issueTitle",
  "severity",
  "safeToOperate",
  "workOrderTitle",
  "priority",
  "tasks",
  "estimatedHours",
]);

const inputClass =
  "mt-1.5 block w-full rounded-md border border-line bg-surface px-3 py-2 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink aria-invalid:border-status-down";

// The issue and work order form (R20, R21). Either filled in by hand, or
// filled by an AI draft (R12 to R19) that is clearly marked as one, with the
// fields the server set from records or rules labelled with where they came
// from. Every field can be edited. Approve checks the form and hands the
// approved draft up; Discard saves nothing.
export function WorkOrderForm({
  values,
  onChange,
  base,
  ai = null,
  photos,
  notes,
  clarifications = [],
  onAnswer = () => {},
  saving,
  saveError,
  onApprove,
  onDiscard,
  onEditReport,
}: {
  values: FormValues;
  onChange: (values: FormValues) => void;
  /** The AI's draft, or a blank one; supplies the fields the form does not show. */
  base: TriageDraft;
  /** The triage response when the form was filled by an AI draft. */
  ai?: TriageResponse | null;
  photos: readonly ReportPhoto[];
  notes: string;
  /** The reviewer's earlier answers to the AI's questions about this report. */
  clarifications?: readonly Clarification[];
  /** Answers the AI's clarifying question and drafts again (R23). */
  onAnswer?: (answer: string) => void;
  saving: boolean;
  /** Set when saving failed, so the reviewer is told (R27). */
  saveError: string;
  onApprove: (draft: TriageDraft) => void;
  onDiscard: () => void;
  onEditReport: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const id = (field: keyof FormValues) => `${uid}-${field}`;
  const errorId = (field: keyof FormValues) => `${uid}-${field}-error`;

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    onChange({ ...values, [field]: value });
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = draftFromValues(values, base);
    if (!result.ok) {
      setErrors(result.errors);
      // Move to the first field that needs attention.
      const first = fieldOrder.find((field) => result.errors[field]);
      if (first) {
        formRef.current
          ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
          ?.focus();
      }
      return;
    }
    setErrors({});
    onApprove(result.draft);
  }

  // Props shared by every text control: label link, error link, invalid state.
  const control = (field: keyof FormValues) => ({
    id: id(field),
    "aria-required": requiredFields.has(field) ? true : undefined,
    "data-field": field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });

  const errorCount = Object.keys(errors).length;
  const filled = filledByField(ai?.filled);

  return (
    <section
      aria-labelledby="work-order-heading"
      className="rounded-lg border border-line border-t-4 border-t-accent bg-surface p-5 shadow-sm"
    >
      <h2 id="work-order-heading" className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        Issue and work order
        {ai && (
          <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold tracking-wide text-accent-ink uppercase">
            AI draft
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {ai
          ? "Drafted by AI from the notes, photos and the asset's records. Check and edit every field, then approve to save it to the asset's history."
          : "Describe the issue and the work needed, then approve to save it to the asset's history."}{" "}
        <span className="whitespace-nowrap">
          <RequiredMark /> Required
        </span>
      </p>

      <ReportSummary
        photos={photos}
        notes={notes}
        clarifications={clarifications}
        onEdit={onEditReport}
        disabled={saving}
      />

      {ai && <AiFindings ai={ai} onAnswer={onAnswer} disabled={saving} />}

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        aria-label="Issue and work order"
        className="mt-5 space-y-6"
      >
        <fieldset disabled={saving} className="space-y-4">
          <legend className="text-base font-semibold">Issue</legend>

          <Field label="Title" htmlFor={id("issueTitle")} required error={errors.issueTitle} errorId={errorId("issueTitle")}>
            <input
              {...control("issueTitle")}
              type="text"
              value={values.issueTitle}
              onChange={(e) => set("issueTitle", e.target.value)}
              placeholder="For example, hydraulic hose leak at boom"
              className={inputClass}
            />
          </Field>

          <Field label="Description" htmlFor={id("description")} optional>
            <textarea
              {...control("description")}
              rows={3}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Component" htmlFor={id("component")} optional>
            <input
              {...control("component")}
              type="text"
              value={values.component}
              onChange={(e) => set("component", e.target.value)}
              placeholder="For example, boom hydraulics"
              className={inputClass}
            />
          </Field>

          <Choice
            legend="Severity"
            name={id("severity")}
            field="severity"
            options={severities.map((s) => ({
              value: s,
              label: (
                <>
                  <span aria-hidden className={`size-2.5 rounded-full ${severityDots[s]}`} />
                  {severityLabels[s]}
                </>
              ),
            }))}
            value={values.severity}
            onChange={(v) => set("severity", v as Severity)}
            error={errors.severity}
            errorId={errorId("severity")}
          />

          <Field label="Reason for the severity" htmlFor={id("severityReason")} optional>
            <input
              {...control("severityReason")}
              type="text"
              value={values.severityReason}
              onChange={(e) => set("severityReason", e.target.value)}
              placeholder="One sentence"
              className={inputClass}
            />
          </Field>

          <Choice
            legend="Safe to operate"
            name={id("safeToOperate")}
            field="safeToOperate"
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            value={values.safeToOperate}
            onChange={(v) => set("safeToOperate", v as FormValues["safeToOperate"])}
            error={errors.safeToOperate}
            errorId={errorId("safeToOperate")}
          />
        </fieldset>

        <fieldset disabled={saving} className="space-y-4 border-t border-line pt-5">
          <legend className="sr-only">Work order</legend>
          <h3 aria-hidden className="text-base font-semibold">
            Work order
          </h3>

          <Field label="Work order title" htmlFor={id("workOrderTitle")} required error={errors.workOrderTitle} errorId={errorId("workOrderTitle")}>
            <input
              {...control("workOrderTitle")}
              type="text"
              value={values.workOrderTitle}
              onChange={(e) => set("workOrderTitle", e.target.value)}
              placeholder="For example, replace boom hose"
              className={inputClass}
            />
          </Field>

          <Choice
            legend="Priority"
            name={id("priority")}
            field="priority"
            options={priorities.map((p) => ({ value: p, label: priorityLabels[p] }))}
            value={values.priority}
            onChange={(v) => set("priority", v as Priority)}
            error={errors.priority}
            errorId={errorId("priority")}
            filled={filled.priority}
          />

          <Field label="Tasks" hint="One per line" htmlFor={id("tasks")} required error={errors.tasks} errorId={errorId("tasks")}>
            <textarea
              {...control("tasks")}
              rows={4}
              value={values.tasks}
              onChange={(e) => set("tasks", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Parts" hint="One per line" htmlFor={id("parts")} optional filled={filled.parts}>
            <textarea
              {...control("parts")}
              rows={3}
              value={values.parts}
              onChange={(e) => set("parts", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Estimated hours" htmlFor={id("estimatedHours")} required error={errors.estimatedHours} errorId={errorId("estimatedHours")} filled={filled.estimatedHours}>
            <input
              {...control("estimatedHours")}
              type="text"
              inputMode="decimal"
              value={values.estimatedHours}
              onChange={(e) => set("estimatedHours", e.target.value)}
              className={`${inputClass} max-w-32`}
            />
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line bg-surface-raised px-3 py-2 has-checked:border-status-down">
            <input
              id={id("takeOutOfService")}
              data-field="takeOutOfService"
              type="checkbox"
              checked={values.takeOutOfService}
              onChange={(e) => set("takeOutOfService", e.target.checked)}
              className="size-5 accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <span className="text-sm font-semibold">
              Take the asset out of service
            </span>
          </label>
          {filled.takeOutOfService && <FilledNote filled={filled.takeOutOfService} />}
        </fieldset>

        {errorCount > 0 && (
          <p role="alert" className="text-sm font-semibold text-status-down">
            {errorCount === 1
              ? "One field needs attention before approving."
              : `${errorCount} fields need attention before approving.`}
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-sm font-semibold text-status-down">
            {saveError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-md bg-ink px-5 py-2 font-semibold text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Approve work order"}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="min-h-11 rounded-md border border-line bg-surface-raised px-4 py-2 font-semibold text-text hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Discard
          </button>
        </div>
      </form>
    </section>
  );
}

function ReportSummary({
  photos,
  notes,
  clarifications,
  onEdit,
  disabled,
}: {
  photos: readonly ReportPhoto[];
  notes: string;
  clarifications: readonly Clarification[];
  onEdit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 rounded-md border border-line bg-surface-raised p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Defect report</h3>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="rounded px-2 py-1 text-sm font-semibold text-text underline decoration-accent decoration-2 underline-offset-2 hover:bg-surface disabled:opacity-60"
        >
          Edit report
        </button>
      </div>
      {photos.length > 0 && (
        <ul aria-label="Report photos" className="mt-2 flex gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="w-20 overflow-hidden rounded border border-line">
              <Image
                src={photo.url}
                alt={`Report photo ${index + 1}: ${photo.name}`}
                width={photo.width}
                height={photo.height}
                unoptimized
                className="aspect-4/3 w-full object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm whitespace-pre-line text-text-muted">
        {notes.trim() ? notes.trim() : "No notes."}
      </p>
      {clarifications.length > 0 && (
        <dl aria-label="Answers to the AI" className="mt-2 space-y-1.5 border-t border-line pt-2 text-sm">
          {/* Answers are only ever added to the end, so the index is stable. */}
          {clarifications.map((c, index) => (
            <div key={index}>
              <dt className="text-text-muted">The AI asked: {c.question}</dt>
              <dd>Answer: {c.answer}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  optional,
  required,
  htmlFor,
  error,
  errorId,
  filled,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
  htmlFor: string;
  error?: string;
  errorId?: string;
  /** Set when the server filled this field from records or a rule. */
  filled?: FilledField;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && (
          <>
            {" "}
            <RequiredMark />
          </>
        )}
        {optional && <span className="font-normal text-text-muted"> (optional)</span>}
        {hint && <span className="font-normal text-text-muted"> · {hint}</span>}
      </label>
      {children}
      {filled && <FilledNote filled={filled} />}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-status-down">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  legend,
  name,
  field,
  options,
  value,
  onChange,
  error,
  errorId,
  filled,
}: {
  legend: string;
  name: string;
  field: keyof FormValues;
  options: { value: string; label: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorId: string;
  filled?: FilledField;
}) {
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-sm font-semibold">
        {legend} <RequiredMark />
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option, index) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-surface px-4 py-2 text-sm font-medium has-checked:border-ink has-checked:bg-accent has-checked:text-accent-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
              error ? "border-status-down" : "border-line"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              required
              // The first option takes focus when this choice needs attention.
              data-field={index === 0 ? field : undefined}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {filled && <FilledNote filled={filled} />}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-status-down">
          {error}
        </p>
      )}
    </fieldset>
  );
}

const sourceLabels: Record<FilledField["source"], string> = {
  records: "From records",
  rule: "Set by rule",
};

/** Says where a field the AI did not fill came from. */
function FilledNote({ filled }: { filled: FilledField }) {
  return (
    <p className="mt-1 text-xs text-text-muted">
      <span className="mr-1.5 rounded border border-line bg-surface-raised px-1.5 py-0.5 font-semibold text-text">
        {sourceLabels[filled.source]}
      </span>
      {filled.note}
    </p>
  );
}

/**
 * What the AI found that has no form field: any clarifying question, with a
 * box to answer it and draft again (R18, R23), its confidence, the repeat
 * check with links to the history it matches (R16), and what it saw in the
 * photos, kept apart from the operator's notes (R15).
 */
function AiFindings({
  ai,
  onAnswer,
  disabled,
}: {
  ai: TriageResponse;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const { draft } = ai;
  return (
    <section
      aria-labelledby="ai-findings-heading"
      className="mt-4 rounded-md border border-line border-l-4 border-l-accent bg-surface-raised p-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ai-findings-heading" className="font-semibold">
          AI findings
        </h3>
        <p>
          Confidence:{" "}
          <span className="font-semibold">{confidenceLabels[draft.confidence]}</span>
        </p>
      </div>
      {draft.clarifyingQuestion && (
        <ClarifyingQuestion
          // A new question starts with an empty answer box.
          key={draft.clarifyingQuestion}
          question={draft.clarifyingQuestion}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      )}
      <RepeatFinding repeat={draft.repeat} />
      <h4 className="mt-3 font-semibold">Seen in the photos</h4>
      {draft.photoObservations.length > 0 ? (
        <ul aria-label="Seen in the photos" className="mt-1 list-disc space-y-0.5 pl-5">
          {/* A fixed list that never reorders, and lines may repeat, so the
              index is the key. */}
          {draft.photoObservations.map((observation, index) => (
            <li key={index}>{observation}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-text-muted">No photos were sent.</p>
      )}
      <p className="mt-3 text-xs text-text-muted">
        Drafted by {ai.model} in {(ai.durationMs / 1000).toFixed(1)} s.
      </p>
    </section>
  );
}

/**
 * The AI's question when the notes and photos did not let it judge the
 * defect. The draft below it is a low-confidence starting point; answering
 * sends the answer with the same report for a fresh draft (R23).
 */
function ClarifyingQuestion({
  question,
  onAnswer,
  disabled,
}: {
  question: string;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [missing, setMissing] = useState(false);
  const uid = useId();
  const answerId = `${uid}-answer`;
  const errorId = `${uid}-answer-error`;

  return (
    <form
      noValidate
      aria-labelledby={`${uid}-heading`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!answer.trim()) {
          setMissing(true);
          return;
        }
        onAnswer(answer.trim());
      }}
      className="mt-2 rounded border-2 border-ink bg-surface p-3"
    >
      <h4 id={`${uid}-heading`} className="font-semibold">
        The AI has a question
      </h4>
      <p className="mt-1 text-base">{question}</p>
      <p className="mt-1 text-xs text-text-muted">
        The input was not clear enough to judge, so the draft below is only a
        starting point. Answer to get a fresh draft; it replaces the form.
      </p>
      <label htmlFor={answerId} className="mt-3 block font-semibold">
        Your answer <RequiredMark />
      </label>
      <textarea
        id={answerId}
        rows={2}
        value={answer}
        aria-required="true"
        aria-invalid={missing || undefined}
        aria-describedby={missing ? errorId : undefined}
        onChange={(e) => {
          setAnswer(e.target.value);
          if (e.target.value.trim()) setMissing(false);
        }}
        className={inputClass}
      />
      {missing && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-status-down">
          Type an answer before drafting again.
        </p>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="mt-2 min-h-11 rounded-md bg-ink px-4 py-2 font-semibold text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        Answer and draft again
      </button>
    </form>
  );
}

/**
 * Whether the defect repeats earlier history, with links to the entries (R16).
 * The server has already dropped any ID that is not a real entry for this
 * asset. The linked entries are also highlighted in the history column.
 */
function RepeatFinding({ repeat }: { repeat: TriageDraft["repeat"] }) {
  const { entries } = useLinkedHistory();
  const ids = repeat.isRepeat ? repeat.relatedHistoryIds : [];
  useHighlightHistory(ids);
  const linked = ids.map((id) => ({ id, entry: entries.find((e) => e.id === id) }));

  return (
    <div className="mt-3">
      <h4 className="font-semibold">Repeat check</h4>
      {linked.length > 0 ? (
        <div className="mt-1 rounded border border-line border-l-4 border-l-severity-high bg-surface p-2">
          <p className="font-semibold">Repeats earlier history</p>
          {repeat.summary && <p className="mt-0.5">{repeat.summary}</p>}
          <ul aria-label="Related history" className="mt-1.5 space-y-1">
            {linked.map(({ id, entry }) => (
              <li key={id}>
                <a
                  href={`#${historyAnchor(id)}`}
                  className="font-medium underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {entry ? entry.title : id}
                </a>
                {entry && (
                  <span className="text-text-muted"> · {formatDate(entry.date)}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-text-muted">
            Highlighted in the history.
          </p>
        </div>
      ) : (
        <p className="mt-1 text-text-muted">No match in this asset&apos;s history.</p>
      )}
    </div>
  );
}
