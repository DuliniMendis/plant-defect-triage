import { expect, type Page, test } from "@playwright/test";

// Voice dictation into the defect notes (R8, R9). Headless Chromium cannot
// reach Google's speech service, so a fake recognition class is installed
// before the page loads and driven from the test through `window.__speech`.
// Needs a seeded database (`pnpm db:seed`).

declare global {
  interface Window {
    __speech: {
      begin(): void;
      hear(text: string, isFinal: boolean): void;
      fail(error: string): void;
      started: number;
      lang: string;
    };
  }
}

async function installFakeSpeech(page: Page) {
  await page.addInitScript(() => {
    type Handler<T = void> = ((event: T) => void) | null;
    // The recognition started most recently.
    const live: FakeRecognition[] = [];
    const current = () => live.at(-1);
    let results: [string, boolean][] = [];

    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onstart: Handler = null;
      onresult: Handler<unknown> = null;
      onerror: Handler<{ error: string }> = null;
      onend: Handler = null;
      start() {
        live.push(this);
        results = [];
        window.__speech.started++;
        window.__speech.lang = this.lang;
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    window.__speech = {
      started: 0,
      lang: "",
      begin: () => current()?.onstart?.(),
      hear(text, isFinal) {
        const last = results.at(-1);
        if (last && !last[1]) results.pop();
        results.push([text, isFinal]);
        current()?.onresult?.({
          resultIndex: results.length - 1,
          results: results.map(([transcript, final]) =>
            Object.assign([{ transcript }], { isFinal: final }),
          ),
        });
      },
      fail(error) {
        current()?.onerror?.({ error });
        current()?.onend?.();
      },
    };
    // Chromium's own class cannot be replaced by plain assignment.
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, { value: FakeRecognition, configurable: true });
    }
  });
}

const panel = (page: Page) =>
  page.getByRole("region", { name: /Report a defect|Defect report ready/ });

test.describe("with speech recognition", () => {
  test.beforeEach(async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/asset/EX-014");
    await expect(page.getByRole("button", { name: "Dictate" })).toBeEnabled();
  });

  test("dictates a note, corrects it by typing and continues", async ({ page }) => {
    const notes = page.getByRole("textbox", { name: "Notes" });

    await page.getByRole("button", { name: "Dictate" }).click();
    await expect(page.getByText("Starting the microphone…")).toBeVisible();
    expect(await page.evaluate(() => window.__speech.started)).toBe(1);

    await page.evaluate(() => window.__speech.begin());
    await expect(page.getByText(/Listening\. Speak now/)).toBeVisible();

    await page.evaluate(() => window.__speech.hear("oil leaking from the", false));
    await expect(page.getByText("oil leaking from the…")).toBeVisible();
    await expect(notes).toHaveValue("");

    await page.evaluate(() => window.__speech.hear("oil leaking from the bum ram", true));
    await expect(notes).toHaveValue("Oil leaking from the bum ram");

    await page.getByRole("button", { name: "Stop dictating" }).click();
    await expect(page.getByRole("button", { name: "Dictate" })).toBeVisible();
    await expect(page.getByText(/Listening/)).toBeHidden();

    // Correct the misheard word.
    await notes.fill("Oil leaking from the boom ram");

    // Dictate again to add more.
    await page.getByRole("button", { name: "Dictate" }).click();
    await page.evaluate(() => window.__speech.begin());
    await page.evaluate(() => window.__speech.hear("started this morning", true));
    await page.getByRole("button", { name: "Stop dictating" }).click();
    await expect(notes).toHaveValue("Oil leaking from the boom ram started this morning");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(panel(page).getByRole("status")).toHaveText("Captured notes.");
  });

  test("says when the microphone is blocked", async ({ page }) => {
    await page.getByRole("button", { name: "Dictate" }).click();
    await page.evaluate(() => window.__speech.fail("not-allowed"));

    await expect(page.getByText(/Microphone access is blocked/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Dictate" })).toBeVisible();
  });
});

test("disables Dictate and points to Chrome without speech recognition", async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, { value: undefined, configurable: true });
    }
  });
  await page.goto("/asset/EX-014");

  await expect(
    page.getByText(/Dictate is turned off because this browser has no built-in dictation\. Open this page in Chrome/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Dictate" })).toBeDisabled();

  const notes = page.getByRole("textbox", { name: "Notes" });
  await notes.fill("Tyre sidewall cut");
  await expect(notes).toHaveValue("Tyre sidewall cut");
});
