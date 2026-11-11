import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
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
});

const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function setup() {
  const user = userEvent.setup({ applyAccept: false });
  render(<DefectCapture />);
  return {
    user,
    photoInput: screen.getByLabelText("Add photos"),
    notes: screen.getByRole("textbox", { name: "Notes" }),
    continueButton: screen.getByRole("button", { name: "Continue" }),
  };
}

test("will not continue with no photos and no notes", async () => {
  const { user, notes, continueButton } = setup();

  await user.click(continueButton);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Add at least one photo or type some notes before continuing.",
  );

  await user.type(notes, "   ");
  await user.click(continueButton);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText("Defect report ready")).not.toBeInTheDocument();
});

test("continues with notes only", async () => {
  const { user, notes, continueButton } = setup();

  await user.click(continueButton);
  await user.type(notes, "Hydraulic oil weeping from the boom hose");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  await user.click(continueButton);
  expect(
    screen.getByRole("heading", { name: "Defect report ready" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Captured notes.");
});

test("adds photos with a preview and continues with photos only", async () => {
  const { user, photoInput, continueButton } = setup();

  await user.upload(photoInput, [jpeg("hose.jpg"), jpeg("fitting.jpg")]);

  const list = await screen.findByRole("list", { name: "Added photos" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Photo 1: hose.jpg" })).toHaveAttribute(
    "src",
    "blob:photo-1",
  );
  expect(screen.getByRole("img", { name: "Photo 2: fitting.jpg" })).toBeInTheDocument();

  await user.click(continueButton);
  expect(screen.getByRole("status")).toHaveTextContent("Captured 2 photos.");
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

  fireEvent.drop(screen.getByRole("group", { name: "Photos" }), { dataTransfer: { files: [jpeg("tyre.jpg")] } });

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
  expect(screen.getByRole("status")).toHaveTextContent(
    "Captured 1 photo and notes.",
  );

  await user.click(screen.getByRole("button", { name: "Edit report" }));
  expect(screen.getByRole("img", { name: "Photo 1: hose.jpg" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Leak at boom");
});
