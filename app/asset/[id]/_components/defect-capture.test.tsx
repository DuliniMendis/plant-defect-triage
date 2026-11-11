import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TriageResponse } from "@/lib/schema";
import { DefectCapture } from "./defect-capture";

// jsdom cannot decode or draw images, so the resizer is replaced with one that
// returns the file as is.
vi.mock("../_lib/resize-photo", () => ({
  resizePhoto: vi.fn(async (file: File) => ({
    blob: file,
    width: 1500,
    height: 1125,
  })),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let urlCount = 0;
beforeEach(() => {
  urlCount = 0;
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:photo-${++urlCount}`),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function setup() {
  const user = userEvent.setup({ applyAccept: false });
  render(<DefectCapture assetId="EX-014" />);
  return {
    user,
    photoInput: screen.getByLabelText("Add photos"),
    notes: screen.getByRole("textbox", { name: "Notes" }),
    continueButton: screen.getByRole("button", { name: "Fill in by hand" }),
  };
}

test("will not continue without notes", async () => {
  const { user, notes, continueButton } = setup();

  await user.click(continueButton);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Type some notes about the defect before continuing.",
  );

  await user.type(notes, "   ");
  await user.click(continueButton);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(
    screen.queryByRole("form", { name: "Issue and work order" }),
  ).not.toBeInTheDocument();
});

test("marks notes as required and flags them until filled", async () => {
  const { user, notes, continueButton } = setup();

  expect(notes).toBeRequired();
  expect(screen.getByRole("group", { name: "Photos (optional)" })).toBeInTheDocument();
  expect(continueButton).toBeEnabled();
  expect(notes).toBeValid();

  await user.click(continueButton);
  expect(notes).toBeInvalid();
  expect(notes).toHaveAccessibleDescription(
    "Type some notes about the defect before continuing.",
  );

  await user.type(notes, "Leak");
  expect(notes).toBeValid();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("photos alone are not enough to continue", async () => {
  const { user, photoInput, notes, continueButton } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg")]);
  await screen.findByRole("img", { name: "Photo 1: hose.jpg" });
  await user.click(continueButton);
  expect(notes).toBeInvalid();
  expect(
    screen.queryByRole("form", { name: "Issue and work order" }),
  ).not.toBeInTheDocument();
});

test("continues with notes only", async () => {
  const { user, notes, continueButton } = setup();

  await user.click(continueButton);
  await user.type(notes, "Hydraulic oil weeping from the boom hose");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  await user.click(continueButton);
  expect(
    screen.getByRole("form", { name: "Issue and work order" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Hydraulic oil weeping from the boom hose"),
  ).toBeInTheDocument();
});

test("adds photos with a preview and continues with notes and photos", async () => {
  const { user, photoInput, notes, continueButton } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg"), jpeg("fitting.jpg")]);

  const list = await screen.findByRole("list", { name: "Added photos" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Photo 1: hose.jpg" })).toHaveAttribute(
    "src",
    "blob:photo-1",
  );
  expect(screen.getByRole("img", { name: "Photo 2: fitting.jpg" })).toBeInTheDocument();

  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  const reportPhotos = screen.getByRole("list", { name: "Report photos" });
  expect(within(reportPhotos).getAllByRole("img")).toHaveLength(2);
  expect(screen.getByText("Leak at boom")).toBeInTheDocument();
});

test("removes a photo and frees its preview", async () => {
  const { user, photoInput } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg"), jpeg("fitting.jpg")]);
  await user.click(
    await screen.findByRole("button", { name: "Remove photo 1, hose.jpg" }),
  );

  expect(screen.queryByRole("img", { name: /hose\.jpg/ })).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Photo 1: fitting.jpg" })).toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
});

test("stops at 3 photos and says why", async () => {
  const { user, photoInput } = setup();

  await user.upload(photoInput, ["a.jpg", "b.jpg", "c.jpg", "d.jpg"].map(jpeg));

  expect(await screen.findAllByRole("img")).toHaveLength(3);
  expect(
    screen.getByText("You can add up to 3 photos, so d.jpg was not added."),
  ).toBeInTheDocument();
  expect(photoInput).toBeDisabled();
  expect(
    screen.getByText("3 of 3 photos added. Remove one to add another."),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Remove photo 3, c.jpg" }));
  expect(photoInput).toBeEnabled();
});

test("refuses files that are not images", async () => {
  const { user, photoInput } = setup();

  await user.upload(photoInput, [
    new File(["x"], "manual.pdf", { type: "application/pdf" }),
  ]);

  expect(
    await screen.findByText("manual.pdf is not a JPEG, PNG or WebP image."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("accepts photos dropped on the photos area", async () => {
  setup();

  fireEvent.drop(screen.getByRole("group", { name: "Photos (optional)" }), { dataTransfer: { files: [jpeg("tyre.jpg")] } });

  expect(
    await screen.findByRole("img", { name: "Photo 1: tyre.jpg" }),
  ).toBeInTheDocument();
});

test("keeps photos and notes when going back to edit", async () => {
  const { user, photoInput, notes, continueButton } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg")]);
  await screen.findByRole("img", { name: "Photo 1: hose.jpg" });
  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  await user.type(
    screen.getByRole("textbox", { name: /^Title/ }),
    "Boom hose leak",
  );

  await user.click(screen.getByRole("button", { name: "Edit report" }));
  expect(screen.getByRole("img", { name: "Photo 1: hose.jpg" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Leak at boom");
});

test("keeps what was typed in the form when going back to edit the report", async () => {
  const { user, notes, continueButton } = setup();
  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Boom hose leak");

  await user.click(screen.getByRole("button", { name: "Edit report" }));
  await user.click(screen.getByRole("button", { name: "Fill in by hand" }));

  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Boom hose leak");
});

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Boom hose leak");
  await user.click(screen.getByRole("radio", { name: "High" }));
  await user.click(screen.getByRole("radio", { name: "No" }));
  await user.type(
    screen.getByRole("textbox", { name: "Work order title" }),
    "Replace boom hose",
  );
  await user.click(screen.getByRole("radio", { name: "Urgent" }));
  await user.type(screen.getByRole("textbox", { name: /Tasks/ }), "Replace hose");
  await user.type(screen.getByRole("textbox", { name: "Estimated hours" }), "2");
}

test("approving sends the work order with its photos and shows it was saved", async () => {
  const fetchMock = vi.fn(async () =>
    Response.json({ workOrderId: "wo-1" }, { status: 201 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { user, photoInput, notes, continueButton } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg")]);
  await screen.findByRole("img", { name: "Photo 1: hose.jpg" });
  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  await fillForm(user);
  await user.click(screen.getByRole("button", { name: "Approve work order" }));

  expect(
    await screen.findByRole("heading", { name: "Work order saved" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "“Replace boom hose” is now on the asset's history.",
  );
  expect(refresh).toHaveBeenCalled();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/work-orders");
  const body = init.body as FormData;
  const payload = JSON.parse(body.get("payload") as string);
  expect(payload).toMatchObject({
    assetId: "EX-014",
    notes: "Leak at boom",
    aiDraft: null,
    model: null,
    final: {
      issue: { title: "Boom hose leak", severity: "high", safeToOperate: false },
      workOrder: {
        title: "Replace boom hose",
        priority: "urgent",
        tasks: ["Replace hose"],
        estimatedHours: 2,
      },
    },
  });
  expect(body.getAll("photos")).toHaveLength(1);

  // The next report starts empty.
  await user.click(screen.getByRole("button", { name: "Report another defect" }));
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("a failed save keeps the form and says nothing was saved", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: "The work order could not be saved, so nothing was kept. Try again." },
        { status: 500 },
      ),
    ),
  );
  const { user, notes, continueButton } = setup();
  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  await fillForm(user);
  await user.click(screen.getByRole("button", { name: "Approve work order" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The work order could not be saved, so nothing was kept. Try again.",
  );
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Boom hose leak");
  expect(refresh).not.toHaveBeenCalled();
});

test("discarding sends nothing and clears the report", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { user, photoInput, notes, continueButton } = setup();
  await user.upload(photoInput, [jpeg("hose.jpg")]);
  await screen.findByRole("img", { name: "Photo 1: hose.jpg" });
  await user.type(notes, "Leak at boom");
  await user.click(continueButton);
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Boom hose leak");

  await user.click(screen.getByRole("button", { name: "Discard" }));

  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Report discarded. Nothing was saved.",
  );
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
});

// Milestone 6: the AI draft fills the form (R12 to R20, R22).

const triage: TriageResponse = {
  draft: {
    issue: {
      title: "Boom hose leak",
      description: "Oil dripping at the boom fitting.",
      component: "Boom hydraulics",
      severity: "high",
      severityReason: "Active hydraulic leak under load.",
      safeToOperate: false,
    },
    photoObservations: ["Wet hose at the crimped fitting"],
    repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
    workOrder: {
      title: "Replace boom hose",
      priority: "immediate",
      tasks: ["Isolate the machine", "Replace hose"],
      parts: ["Hose assembly"],
      estimatedHours: 2.5,
      takeOutOfService: true,
    },
    confidence: "medium",
    clarifyingQuestion: "Is the leak from the hose or the fitting?",
  },
  model: "anthropic/claude-sonnet-5.5",
  durationMs: 8400,
  filled: [
    {
      path: "workOrder.priority",
      source: "rule",
      note: "Set to immediate because the asset is not safe to operate.",
    },
    {
      path: "workOrder.estimatedHours",
      source: "records",
      note: "From the work order “Replace boom cylinder hose” approved 1 Nov 2026.",
    },
  ],
};

function triageThenSave() {
  return vi.fn(async (url: string) =>
    url === "/api/triage"
      ? Response.json(triage)
      : Response.json({ workOrderId: "wo-1" }, { status: 201 }),
  );
}

test("drafting with AI fills the form, marks it as an AI draft and says where fields came from", async () => {
  const fetchMock = triageThenSave();
  vi.stubGlobal("fetch", fetchMock);
  const { user, photoInput, notes } = setup();
  await user.upload(photoInput, [jpeg("hose.jpg")]);
  await screen.findByRole("img", { name: "Photo 1: hose.jpg" });
  await user.type(notes, "Oil dripping from the boom hose");

  await user.click(screen.getByRole("button", { name: "Draft with AI" }));

  const form = await screen.findByRole("form", { name: "Issue and work order" });
  expect(screen.getByRole("heading", { name: /Issue and work order/ })).toHaveTextContent(
    "AI draft",
  );
  expect(within(form).getByRole("textbox", { name: "Title" })).toHaveValue("Boom hose leak");
  expect(within(form).getByRole("radio", { name: "High" })).toBeChecked();
  expect(within(form).getByRole("radio", { name: "Immediate" })).toBeChecked();
  expect(within(form).getByRole("textbox", { name: /^Tasks/ })).toHaveValue(
    "Isolate the machine\nReplace hose",
  );
  expect(within(form).getByRole("checkbox", { name: "Take the asset out of service" })).toBeChecked();
  expect(form).toHaveTextContent(
    "Set by ruleSet to immediate because the asset is not safe to operate.",
  );
  expect(form).toHaveTextContent("From records");

  // What the AI saw is shown apart from the operator's notes (R15, R18).
  const findings = screen.getByRole("region", { name: "AI findings" });
  expect(findings).toHaveTextContent("Confidence: Medium");
  expect(findings).toHaveTextContent("Is the leak from the hose or the fitting?");
  expect(within(findings).getByRole("list", { name: "Seen in the photos" })).toHaveTextContent(
    "Wet hose at the crimped fitting",
  );

  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/triage");
  const body = init.body as FormData;
  expect(body.get("assetId")).toBe("EX-014");
  expect(body.get("notes")).toBe("Oil dripping from the boom hose");
  expect(body.getAll("photos")).toHaveLength(1);
});

test("approving an edited AI draft sends both the AI draft and the approved version", async () => {
  const fetchMock = triageThenSave();
  vi.stubGlobal("fetch", fetchMock);
  const { user, notes } = setup();
  await user.type(notes, "Oil dripping from the boom hose");
  await user.click(screen.getByRole("button", { name: "Draft with AI" }));

  const form = await screen.findByRole("form", { name: "Issue and work order" });
  await user.click(within(form).getByText("Critical", { exact: true }));
  await user.click(screen.getByRole("button", { name: "Approve work order" }));
  await screen.findByRole("heading", { name: "Work order saved" });

  const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
  expect(url).toBe("/api/work-orders");
  const payload = JSON.parse((init.body as FormData).get("payload") as string);
  expect(payload.model).toBe("anthropic/claude-sonnet-5.5");
  expect(payload.aiDraft).toEqual(triage.draft);
  expect(payload.final.issue.severity).toBe("critical");
  expect(payload.final.photoObservations).toEqual(triage.draft.photoObservations);
});

test("shows progress while drafting", async () => {
  let respond: (r: Response) => void = () => {};
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (respond = r))));
  const { user, notes } = setup();
  await user.type(notes, "Leak");
  await user.click(screen.getByRole("button", { name: "Draft with AI" }));

  expect(screen.getByRole("heading", { name: "Drafting with AI" })).toBeInTheDocument();
  respond(Response.json(triage));
  expect(await screen.findByRole("form", { name: "Issue and work order" })).toBeInTheDocument();
});

test("when the AI draft fails, the report is kept and it can be retried or filled in by hand", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: "The AI draft could not be made. Try again, or fill in the form by hand." },
        { status: 502 },
      ),
    ),
  );
  const { user, notes } = setup();
  await user.type(notes, "Leak at boom");
  await user.click(screen.getByRole("button", { name: "Draft with AI" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The AI draft could not be made. Try again, or fill in the form by hand.",
  );
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Leak at boom");
  expect(screen.getByRole("button", { name: "Try the AI draft again" })).toBeEnabled();

  await user.click(screen.getByRole("button", { name: "Fill in by hand" }));
  const form = screen.getByRole("form", { name: "Issue and work order" });
  expect(within(form).getByRole("textbox", { name: "Title" })).toHaveValue("");
  expect(screen.queryByText("AI draft")).not.toBeInTheDocument();
});

test("drafting with AI needs notes and sends nothing without them", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { user } = setup();
  await user.click(screen.getByRole("button", { name: "Draft with AI" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Type some notes about the defect before continuing.",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
