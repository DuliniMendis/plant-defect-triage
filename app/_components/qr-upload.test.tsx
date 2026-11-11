import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { QrLookup } from "../_lib/qr-code";
import { QrUpload } from "./qr-upload";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ids = ["EX-014", "GN-003"];
const image = () => new File(["png"], "code.png", { type: "image/png" });

function setup(result: QrLookup | (() => Promise<QrLookup>)) {
  const user = userEvent.setup();
  const lookUp = vi.fn(async () => (typeof result === "function" ? result() : result));
  const onPickFromList = vi.fn();
  render(<QrUpload knownIds={ids} onPickFromList={onPickFromList} lookUp={lookUp} />);
  const upload = () => user.upload(screen.getByLabelText("Upload QR code"), image());
  return { user, lookUp, onPickFromList, upload };
}

beforeEach(() => push.mockReset());

test("opens the asset in a readable code", async () => {
  const { lookUp, upload } = setup({ kind: "found", assetId: "EX-014" });
  await upload();
  expect(lookUp).toHaveBeenCalledWith(expect.any(File), ids);
  expect(push).toHaveBeenCalledWith("/asset/EX-014");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("says so when the image has no readable code, and offers the list", async () => {
  const { user, onPickFromList, upload } = setup({ kind: "no-code" });
  await upload();
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("No QR code found.");

  await user.click(screen.getByRole("button", { name: "Pick from the list" }));
  expect(onPickFromList).toHaveBeenCalledOnce();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("shows the code when it matches no asset", async () => {
  const { upload } = setup({ kind: "unknown", code: "ZZ-999" });
  await upload();
  expect(push).not.toHaveBeenCalled();
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("No matching asset.");
  expect(alert).toHaveTextContent("The QR code reads ZZ-999");
  expect(screen.getByRole("button", { name: "Pick from the list" })).toBeInTheDocument();
});

test("cuts a long unknown code short", async () => {
  const { upload } = setup({ kind: "unknown", code: "x".repeat(100) });
  await upload();
  expect(screen.getByRole("alert")).toHaveTextContent(`${"x".repeat(40)}…`);
});

test("says so when the file is not an image", async () => {
  const { upload } = setup({ kind: "not-image" });
  await upload();
  expect(screen.getByRole("alert")).toHaveTextContent("Not an image.");
});

test("treats a failed read as no code found", async () => {
  const { upload } = setup(() => Promise.reject(new Error("decode failed")));
  await upload();
  expect(screen.getByRole("alert")).toHaveTextContent("No QR code found.");
});

test("shows that it is reading while the image is decoded", async () => {
  let finish!: (result: QrLookup) => void;
  const { upload } = setup(() => new Promise<QrLookup>((resolve) => (finish = resolve)));
  const done = upload();
  expect(await screen.findByText("Reading QR code…")).toBeInTheDocument();
  finish({ kind: "no-code" });
  await done;
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
