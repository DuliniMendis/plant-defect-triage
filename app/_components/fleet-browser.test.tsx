import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { emptyFilters, type FleetAsset } from "../_lib/filter-fleet";
import { FleetBrowser } from "./fleet-browser";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// jsdom has no canvas to read images with, so every upload reads as an
// unknown code.
vi.mock("../_lib/qr-code", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_lib/qr-code")>()),
  lookUpQrFile: vi.fn(async () => ({ kind: "unknown", code: "ZZ-999" })),
}));

const fleet: FleetAsset[] = [
  { id: "EX-014", name: "20t Excavator", make: "Caterpillar", model: "320", category: "Excavator", site: "Riverside Quarry", status: "operational" },
  { id: "GN-003", name: "60 kVA Generator", make: "Atlas Copco", model: "QAS 60", category: "Generator", site: "Westlink Civil Site", status: "needs-attention" },
  { id: "TH-007", name: "Telehandler", make: "JCB", model: "540-170 Loadall", category: "Telehandler", site: "Westlink Civil Site", status: "operational" },
];

const shownIds = () =>
  within(screen.getByRole("table", { name: "Assets" }))
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));

beforeEach(() => window.history.replaceState(null, "", "/"));

test("shows every asset to start with", () => {
  render(<FleetBrowser fleet={fleet} initialFilters={emptyFilters} />);
  expect(shownIds()).toEqual(["/asset/EX-014", "/asset/GN-003", "/asset/TH-007"]);
  expect(screen.getByRole("status")).toHaveTextContent("Showing 1–3 of 3 assets");
  expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
});

test("narrows the list as the user types and records it in the URL", async () => {
  const user = userEvent.setup();
  render(<FleetBrowser fleet={fleet} initialFilters={emptyFilters} />);
  await user.type(screen.getByRole("searchbox", { name: "Search" }), "westlink");
  expect(shownIds()).toEqual(["/asset/GN-003", "/asset/TH-007"]);
  expect(screen.getByRole("status")).toHaveTextContent("Showing 1–2 of 2 matching (3 total)");
  expect(window.location.search).toBe("?q=westlink");
});

test("filters by type, site and status", async () => {
  const user = userEvent.setup();
  render(<FleetBrowser fleet={fleet} initialFilters={emptyFilters} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Site" }), "Westlink Civil Site");
  await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Operational");
  expect(shownIds()).toEqual(["/asset/TH-007"]);
  await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "Generator");
  expect(screen.queryByRole("table", { name: "Assets" })).not.toBeInTheDocument();
  expect(screen.getByText("No assets match these filters.")).toBeInTheDocument();
});

test("starts from filters in the URL and clears them", async () => {
  const user = userEvent.setup();
  render(
    <FleetBrowser fleet={fleet} initialFilters={{ ...emptyFilters, type: "Excavator" }} />,
  );
  expect(shownIds()).toEqual(["/asset/EX-014"]);
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(shownIds()).toHaveLength(3);
  expect(screen.getByRole("combobox", { name: "Type" })).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
});

describe("pagination", () => {
  // 19 assets: pages of 8, 8 and 3.
  const big: FleetAsset[] = Array.from({ length: 19 }, (_, i) => ({
    ...fleet[i % 3],
    id: `AS-${String(i + 1).padStart(3, "0")}`,
  }));
  const pager = () => screen.getByRole("navigation", { name: "Pagination" });

  test("shows the first page of eight with page links", () => {
    render(<FleetBrowser fleet={big} initialFilters={emptyFilters} />);
    expect(shownIds()).toHaveLength(8);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–8 of 19 assets");
    expect(within(pager()).getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(within(pager()).getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  test("moves between pages and records the page in the URL", async () => {
    const user = userEvent.setup();
    render(<FleetBrowser fleet={big} initialFilters={emptyFilters} />);
    await user.click(within(pager()).getByRole("button", { name: "Page 3" }));
    expect(shownIds()).toEqual(["/asset/AS-017", "/asset/AS-018", "/asset/AS-019"]);
    expect(window.location.search).toBe("?page=3");
    expect(within(pager()).getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(within(pager()).getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 9–16 of 19 assets");
  });

  test("changing a filter goes back to page 1", async () => {
    const user = userEvent.setup();
    render(<FleetBrowser fleet={big} initialFilters={emptyFilters} initialPage={2} />);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 9–16");
    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "Excavator");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–7 of 7 matching (19 total)");
    expect(window.location.search).toBe("?type=Excavator");
  });
});

test("offers the QR code upload above the list", () => {
  render(<FleetBrowser fleet={fleet} initialFilters={emptyFilters} />);
  expect(screen.getByLabelText("Upload QR code")).toHaveAttribute("type", "file");
});

test("picking from the list after an unusable QR code clears the filters and focuses search", async () => {
  const user = userEvent.setup();
  render(<FleetBrowser fleet={fleet} initialFilters={{ ...emptyFilters, q: "generator" }} />);
  expect(shownIds()).toEqual(["/asset/GN-003"]);

  await user.upload(
    screen.getByLabelText("Upload QR code"),
    new File(["png"], "code.png", { type: "image/png" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("No matching asset.");

  await user.click(screen.getByRole("button", { name: "Pick from the list" }));
  expect(shownIds()).toEqual(["/asset/EX-014", "/asset/GN-003", "/asset/TH-007"]);
  expect(screen.getByRole("searchbox", { name: "Search" })).toHaveFocus();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
