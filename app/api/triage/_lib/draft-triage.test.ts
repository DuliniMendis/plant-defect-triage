import { MockLanguageModelV4 } from "ai/test";
import { expect, test, vi } from "vitest";
import type { Asset, HistoryEntry } from "@/db/schema";
import { draftTriage, TriageFailedError } from "./draft-triage";
import { SYSTEM_PROMPT } from "./prompt";
import { aiFill } from "./test-fixtures";

const asset: Asset = {
  id: "EX-014",
  name: "20t Excavator",
  make: "Caterpillar",
  model: "320",
  category: "Excavator",
  site: "Riverside Quarry",
  meterHours: 6842,
  nextServiceDueHours: 7000,
  status: "operational",
};

const history = [
  {
    id: "EX-014-H4",
    assetId: "EX-014",
    date: "2026-08-27",
    kind: "issue",
    title: "Hose leak at boom fitting",
    detail: "Leak at the same boom fitting as March.",
    component: "Boom hydraulics",
    severity: "high",
    meterHours: 6610,
    status: "closed",
    seeded: true,
    workOrderId: null,
  },
] satisfies HistoryEntry[];

function mockModel(text: string) {
  return new MockLanguageModelV4({
    modelId: "mock-model",
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 5000, noCache: 2000, cacheRead: 3000, cacheWrite: 0 },
        outputTokens: { total: 900, text: 900, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

const run = (model: MockLanguageModelV4) =>
  draftTriage({
    model,
    asset,
    history,
    pastWorkOrders: [],
    notes: "Oil dripping from the boom hose",
    photos: [{ data: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg" }],
    now: vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(9500),
  });

test("returns a full draft with the fields filled from rules listed", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const result = await run(mockModel(JSON.stringify(aiFill())));

  expect(result.model).toBe("mock-model");
  expect(result.durationMs).toBe(8500);
  expect(result.draft.issue.title).toBe("Boom hose leak");
  expect(result.draft.workOrder.priority).toBe("urgent");
  expect(result.filled.map((f) => f.path)).toEqual([
    "workOrder.priority",
    "workOrder.takeOutOfService",
  ]);
});

test("puts cache breakpoints after the system prompt and after the asset's records", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const model = mockModel(JSON.stringify(aiFill()));
  await run(model);

  const { prompt } = model.doGenerateCalls[0];
  const cache = { anthropic: { cacheControl: { type: "ephemeral" } } };

  const [system, user] = prompt;
  expect(system).toMatchObject({ role: "system", content: SYSTEM_PROMPT, providerOptions: cache });

  if (user.role !== "user") throw new Error("expected a user message");
  const [records, notes, photo] = user.content;
  expect(records).toMatchObject({ type: "text", providerOptions: cache });
  expect(records.type === "text" && records.text).toContain("[EX-014-H4] Hose leak at boom fitting");
  // What changes on every report comes after the last breakpoint.
  expect(notes).toMatchObject({ type: "text" });
  expect(notes.providerOptions).toBeUndefined();
  expect(notes.type === "text" && notes.text).toContain("Oil dripping from the boom hose");
  expect(photo).toMatchObject({ type: "file", mediaType: "image/jpeg" });
});

test("a model that returns something unreadable is reported as a failed draft", async () => {
  await expect(run(mockModel("not json"))).rejects.toBeInstanceOf(TriageFailedError);
});

test("a draft that fails the triage schema is reported as a failed draft", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  // An empty title passes the model's schema but not the saved one.
  await expect(run(mockModel(JSON.stringify(aiFill({ title: "  " }))))).rejects.toBeInstanceOf(
    TriageFailedError,
  );
});
