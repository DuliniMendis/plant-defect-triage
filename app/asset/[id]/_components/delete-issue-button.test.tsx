import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { DeleteIssueButton } from "./delete-issue-button";

const deleteIssue = vi.hoisted(() => vi.fn());
vi.mock("../_lib/delete-issue", () => ({ deleteIssue }));

// jsdom has no modal dialogs; open and close by the `open` attribute, which is
// what makes the dialog's contents visible to queries.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});

beforeEach(() => {
  deleteIssue.mockReset();
});

function renderButton(hasWorkOrder = false) {
  render(
    <DeleteIssueButton
      assetId="EX-014"
      entryId="h-1"
      title="Hydraulic hose weeping"
      hasWorkOrder={hasWorkOrder}
    />,
  );
}

test("asks for confirmation before deleting anything", async () => {
  const user = userEvent.setup();
  renderButton();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete Hydraulic hose weeping" }));

  const dialog = screen.getByRole("dialog", { name: "Delete this issue?" });
  expect(dialog).toHaveAccessibleDescription(
    /Hydraulic hose weeping will be removed from the history\. This cannot be undone\./,
  );
  expect(dialog).not.toHaveTextContent("work order");
  expect(deleteIssue).not.toHaveBeenCalled();
});

test("says the work order and photos go too when the issue has one", async () => {
  const user = userEvent.setup();
  renderButton(true);

  await user.click(screen.getByRole("button", { name: "Delete Hydraulic hose weeping" }));

  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Its work order and photos will be deleted too.",
  );
});

test("Cancel closes the dialog without deleting", async () => {
  const user = userEvent.setup();
  renderButton();

  await user.click(screen.getByRole("button", { name: "Delete Hydraulic hose weeping" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(deleteIssue).not.toHaveBeenCalled();
});

test("confirming deletes the issue and closes the dialog", async () => {
  const user = userEvent.setup();
  deleteIssue.mockResolvedValue({ ok: true });
  renderButton();

  await user.click(screen.getByRole("button", { name: "Delete Hydraulic hose weeping" }));
  await user.click(screen.getByRole("button", { name: "Delete issue" }));

  expect(deleteIssue).toHaveBeenCalledWith("EX-014", "h-1");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("keeps the dialog open and shows why when the delete fails", async () => {
  const user = userEvent.setup();
  deleteIssue.mockResolvedValue({ ok: false, message: "The issue could not be deleted." });
  renderButton();

  await user.click(screen.getByRole("button", { name: "Delete Hydraulic hose weeping" }));
  await user.click(screen.getByRole("button", { name: "Delete issue" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("The issue could not be deleted.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
