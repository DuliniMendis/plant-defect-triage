import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { seedAssets } from "@/db/seed-data";
import TestFilesPage from "./page";

test("offers every sample photo for download, with the asset it goes with", () => {
  render(<TestFilesPage />);
  const photos = screen.getByRole("list", { name: "Sample defect photos" });
  expect(within(photos).getAllByRole("listitem")).toHaveLength(5);

  const download = within(photos).getByRole("link", {
    name: "Download Excavator hose leak photo",
  });
  expect(download).toHaveAttribute("href", "/demo-files/photos/excavator-hose-leak.jpg");
  expect(download).toHaveAttribute("download");

  expect(
    within(photos).getByRole("link", { name: "GN-003, 60 kVA Generator" }),
  ).toHaveAttribute("href", "/asset/GN-003");
});

test("offers a QR code for every asset, and one for an unknown asset", () => {
  render(<TestFilesPage />);
  const codes = screen.getByRole("list", { name: "QR codes" });
  expect(within(codes).getAllByRole("listitem")).toHaveLength(seedAssets.length + 1);

  for (const asset of seedAssets) {
    const download = within(codes).getByRole("link", {
      name: `Download ${asset.id} QR code`,
    });
    expect(download).toHaveAttribute("href", `/demo-files/qr/${asset.id}.png`);
    expect(download).toHaveAttribute("download");
  }
  expect(
    within(codes).getByRole("link", { name: "Download unknown asset QR code" }),
  ).toHaveAttribute("href", "/demo-files/qr-unknown-asset.png");
});

test("says how to use the files, with a link to the fleet", () => {
  render(<TestFilesPage />);
  expect(screen.getByRole("heading", { name: "How to use them" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/");
});
