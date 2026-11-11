import { describe, expect, test } from "vitest";
import {
  emptyFilters,
  filterFleet,
  filtersFromParams,
  filtersToQuery,
  hasFilters,
  optionsFor,
  pageFromParams,
  paginate,
  type FleetAsset,
} from "./filter-fleet";

const fleet: FleetAsset[] = [
  { id: "EX-014", name: "20t Excavator", make: "Caterpillar", model: "320", category: "Excavator", site: "Riverside Quarry", status: "operational" },
  { id: "GN-003", name: "60 kVA Generator", make: "Atlas Copco", model: "QAS 60", category: "Generator", site: "Westlink Civil Site", status: "needs-attention" },
  { id: "TH-007", name: "Telehandler", make: "JCB", model: "540-170 Loadall", category: "Telehandler", site: "Westlink Civil Site", status: "operational" },
];

const ids = (assets: FleetAsset[]) => assets.map((a) => a.id);

describe("filterFleet", () => {
  test("returns everything with no filters", () => {
    expect(ids(filterFleet(fleet, emptyFilters))).toEqual(["EX-014", "GN-003", "TH-007"]);
  });

  test("searches ID, name, make, model and site, ignoring case", () => {
    const search = (q: string) => ids(filterFleet(fleet, { ...emptyFilters, q }));
    expect(search("ex-014")).toEqual(["EX-014"]);
    expect(search("generator")).toEqual(["GN-003"]);
    expect(search("caterpillar")).toEqual(["EX-014"]);
    expect(search("loadall")).toEqual(["TH-007"]);
    expect(search("westlink")).toEqual(["GN-003", "TH-007"]);
  });

  test("requires every search word to match", () => {
    expect(ids(filterFleet(fleet, { ...emptyFilters, q: "westlink jcb" }))).toEqual(["TH-007"]);
    expect(ids(filterFleet(fleet, { ...emptyFilters, q: "westlink caterpillar" }))).toEqual([]);
  });

  test("filters by type, site and status together", () => {
    expect(ids(filterFleet(fleet, { ...emptyFilters, type: "Generator" }))).toEqual(["GN-003"]);
    expect(
      ids(filterFleet(fleet, { ...emptyFilters, site: "Westlink Civil Site", status: "operational" })),
    ).toEqual(["TH-007"]);
  });
});

describe("URL round trip", () => {
  test("reads known string params and ignores the rest", () => {
    expect(filtersFromParams({ q: "hose", site: ["a", "b"], other: "x" })).toEqual({
      ...emptyFilters,
      q: "hose",
    });
  });

  test("writes only filters that are set", () => {
    expect(filtersToQuery(emptyFilters)).toBe("");
    expect(filtersToQuery({ ...emptyFilters, q: " cat ", status: "operational" })).toBe(
      "?q=cat&status=operational",
    );
  });

  test("hasFilters ignores blank search text", () => {
    expect(hasFilters({ ...emptyFilters, q: "  " })).toBe(false);
    expect(hasFilters({ ...emptyFilters, type: "Generator" })).toBe(true);
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 19 }, (_, i) => i + 1);

  test("splits into pages of the given size", () => {
    expect(paginate(items, 1, 8)).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 8 });
    expect(paginate(items, 3, 8)).toMatchObject({ items: [17, 18, 19], from: 17, to: 19 });
  });

  test("clamps a page past the end to the last page", () => {
    expect(paginate(items, 9, 8).page).toBe(3);
  });

  test("an empty list is one empty page", () => {
    expect(paginate([], 2, 8)).toMatchObject({ items: [], page: 1, pageCount: 1, from: 0, to: 0 });
  });

  test("reads and writes the page in the URL", () => {
    expect(pageFromParams({ page: "2" })).toBe(2);
    expect(pageFromParams({ page: "0" })).toBe(1);
    expect(pageFromParams({ page: "abc" })).toBe(1);
    expect(pageFromParams({})).toBe(1);
    expect(filtersToQuery({ ...emptyFilters, type: "Roller" }, 2)).toBe("?type=Roller&page=2");
    expect(filtersToQuery(emptyFilters, 1)).toBe("");
  });
});

test("optionsFor lists distinct values, sorted", () => {
  expect(optionsFor(fleet, "site")).toEqual(["Riverside Quarry", "Westlink Civil Site"]);
});
