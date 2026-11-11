import { expect, test } from "vitest";
import { changedFields } from "./changed-fields";
import { blankDraft, type TriageDraft } from "./schema";

function draft(): TriageDraft {
  const d = blankDraft();
  d.issue.title = "Hose leak";
  d.issue.severity = "high";
  d.workOrder.title = "Replace hose";
  d.workOrder.tasks = ["Isolate hydraulics", "Replace hose"];
  d.repeat.relatedHistoryIds = ["h1"];
  return d;
}

test("a manual work order has no changed fields", () => {
  expect(changedFields(null, draft())).toEqual([]);
});

test("an unchanged draft has no changed fields", () => {
  expect(changedFields(draft(), draft())).toEqual([]);
});

test("reports each edited field by its path", () => {
  const final = draft();
  final.issue.severity = "critical";
  final.workOrder.takeOutOfService = true;
  final.clarifyingQuestion = "Is the hose still leaking?";

  expect(changedFields(draft(), final)).toEqual([
    "issue.severity",
    "workOrder.takeOutOfService",
    "clarifyingQuestion",
  ]);
});

test("a list counts as one field, whether an item changes, is added or removed", () => {
  const edited = draft();
  edited.workOrder.tasks[1] = "Replace hose and fitting";
  expect(changedFields(draft(), edited)).toEqual(["workOrder.tasks"]);

  const added = draft();
  added.workOrder.parts.push("Hose clamp");
  expect(changedFields(draft(), added)).toEqual(["workOrder.parts"]);

  const removed = draft();
  removed.repeat.relatedHistoryIds = [];
  expect(changedFields(draft(), removed)).toEqual(["repeat.relatedHistoryIds"]);
});
