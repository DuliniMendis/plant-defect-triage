import { expect, test } from "vitest";
import { parseTriageForm } from "./parse-triage-form";

function form(fields: Record<string, string>, photos: File[] = []) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  for (const p of photos) data.append("photos", p);
  return data;
}

const jpeg = (bytes = 3) => new File([new Uint8Array(bytes)], "p.jpg", { type: "image/jpeg" });

test("reads the asset, trimmed notes and photos", async () => {
  const result = await parseTriageForm(
    form({ assetId: "EX-014", notes: "  Leak at boom \n" }, [jpeg()]),
  );
  expect(result).toMatchObject({ ok: true, assetId: "EX-014", notes: "Leak at boom" });
  expect(result.ok && result.photos).toEqual([
    { data: new Uint8Array(3), mediaType: "image/jpeg" },
  ]);
});

test("needs notes", async () => {
  expect(await parseTriageForm(form({ assetId: "EX-014", notes: "   " }))).toEqual({
    ok: false,
    message: "Type some notes about the defect before drafting.",
  });
});

test("needs an asset", async () => {
  expect(await parseTriageForm(form({ notes: "Leak" }))).toMatchObject({ ok: false });
});

test("allows at most 3 photos", async () => {
  const result = await parseTriageForm(
    form({ assetId: "EX-014", notes: "Leak" }, [jpeg(), jpeg(), jpeg(), jpeg()]),
  );
  expect(result).toEqual({ ok: false, message: "You can send up to 3 photos." });
});

test("refuses files that are not images", async () => {
  const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
  const result = await parseTriageForm(form({ assetId: "EX-014", notes: "Leak" }, [pdf]));
  expect(result).toEqual({ ok: false, message: "Photos must be JPEG, PNG or WebP images." });
});
