import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { blankDraft, type TriageDraft } from "@/lib/schema";
import { blankValues, valuesFromDraft, type FormValues } from "../_lib/work-order-form";
import { WorkOrderForm } from "./work-order-form";

function Harness({
  initial = blankValues(),
  onApprove,
  onDiscard = () => {},
  saving = false,
}: {
  initial?: FormValues;
  onApprove: (draft: TriageDraft) => void;
  onDiscard?: () => void;
  saving?: boolean;
}) {
  const [values, setValues] = useState(initial);
  return (
    <WorkOrderForm
      values={values}
      onChange={setValues}
      base={blankDraft()}
      photos={[]}
      notes="Oil under the boom"
      saving={saving}
      saveError=""
      onApprove={onApprove}
      onDiscard={onDiscard}
      onEditReport={() => {}}
    />
  );
}

test("will not approve until the required fields are filled, and points to the first", async () => {
  const user = userEvent.setup();
  const onApprove = vi.fn();
  render(<Harness onApprove={onApprove} />);

  await user.click(screen.getByRole("button", { name: "Approve work order" }));

  expect(onApprove).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "7 fields need attention before approving.",
  );
  const title = screen.getByRole("textbox", { name: "Title" });
  expect(title).toHaveFocus();
  expect(title).toHaveAccessibleDescription("Give the issue a title.");
  expect(screen.getByRole("group", { name: "Severity" })).toHaveAccessibleDescription(
    "Choose a severity.",
  );

  await user.type(title, "Leak");
  expect(title).not.toHaveAccessibleDescription();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "6 fields need attention before approving.",
  );
});

test("every field can be edited, and approve hands up the draft", async () => {
  const user = userEvent.setup();
  const onApprove = vi.fn();
  render(<Harness onApprove={onApprove} />);

  await user.type(screen.getByRole("textbox", { name: "Title" }), "Boom hose leak");
  await user.type(
    screen.getByRole("textbox", { name: /^Description/ }),
    "Weeping at the fitting",
  );
  await user.type(
    screen.getByRole("textbox", { name: /^Component/ }),
    "Boom hydraulics",
  );
  await user.click(screen.getByRole("radio", { name: "Critical" }));
  await user.type(
    screen.getByRole("textbox", { name: /^Reason for the severity/ }),
    "Could burst",
  );
  await user.click(screen.getByRole("radio", { name: "No" }));
  await user.type(
    screen.getByRole("textbox", { name: "Work order title" }),
    "Replace boom hose",
  );
  await user.click(screen.getByRole("radio", { name: "Immediate" }));
  await user.type(
    screen.getByRole("textbox", { name: /Tasks/ }),
    "Isolate hydraulics{Enter}Replace hose",
  );
  await user.type(screen.getByRole("textbox", { name: /Parts/ }), "Hose");
  await user.type(screen.getByRole("textbox", { name: "Estimated hours" }), "1.5");
  await user.click(
    screen.getByRole("checkbox", { name: "Take the asset out of service" }),
  );
  await user.click(screen.getByRole("button", { name: "Approve work order" }));

  expect(onApprove).toHaveBeenCalledWith({
    ...blankDraft(),
    issue: {
      title: "Boom hose leak",
      description: "Weeping at the fitting",
      component: "Boom hydraulics",
      severity: "critical",
      severityReason: "Could burst",
      safeToOperate: false,
    },
    workOrder: {
      title: "Replace boom hose",
      priority: "immediate",
      tasks: ["Isolate hydraulics", "Replace hose"],
      parts: ["Hose"],
      estimatedHours: 1.5,
      takeOutOfService: true,
    },
  });
});

test("fills from an existing draft, as the AI draft will in milestone 6", () => {
  const draft = blankDraft();
  draft.issue.title = "Cut tyre";
  draft.issue.severity = "high";
  draft.workOrder.priority = "urgent";
  render(<Harness initial={valuesFromDraft(draft)} onApprove={() => {}} />);

  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Cut tyre");
  expect(screen.getByRole("radio", { name: "High" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Urgent" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();
});

test("controls are locked while saving", () => {
  render(<Harness onApprove={() => {}} saving />);
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Title" })).toBeDisabled();
});

test("discard calls back without approving", async () => {
  const user = userEvent.setup();
  const onApprove = vi.fn();
  const onDiscard = vi.fn();
  render(<Harness onApprove={onApprove} onDiscard={onDiscard} />);
  await user.click(screen.getByRole("button", { name: "Discard" }));
  expect(onDiscard).toHaveBeenCalled();
  expect(onApprove).not.toHaveBeenCalled();
});
