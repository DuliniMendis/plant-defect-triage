import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from "../_lib/speech";
import { DefectCapture } from "./defect-capture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// jsdom has no speech recognition, so a fake stands in for Chrome's. Tests
// drive it the way the browser would: start, results, errors, end.
class FakeRecognition implements SpeechRecognitionLike {
  static last: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.end());
  abort = vi.fn();
  private results: [string, boolean][] = [];

  constructor() {
    FakeRecognition.last = this;
  }

  begin() {
    act(() => this.onstart?.());
  }
  /** Replaces the latest guess, or settles it when `isFinal`. */
  hear(text: string, isFinal: boolean) {
    const last = this.results.at(-1);
    if (last && !last[1]) this.results.pop();
    this.results.push([text, isFinal]);
    const resultIndex = this.results.length - 1;
    const results = this.results.map(([transcript, final]) =>
      Object.assign([{ transcript }], { isFinal: final }),
    );
    act(() => this.onresult?.({ resultIndex, results }));
  }
  fail(error: string) {
    act(() => this.onerror?.({ error }));
    this.end();
  }
  end() {
    act(() => this.onend?.());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRecognition.last = null;
});

function setup() {
  vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
  const user = userEvent.setup();
  render(<DefectCapture assetId="EX-014" />);
  return {
    user,
    notes: screen.getByRole("textbox", { name: "Notes" }),
    dictate: () => screen.getByRole("button", { name: "Dictate" }),
    stop: () => screen.getByRole("button", { name: "Stop dictating" }),
  };
}

test("dictated words appear in the notes and can be corrected by typing", async () => {
  const { user, notes, dictate, stop } = setup();

  await user.click(dictate());
  const recognition = FakeRecognition.last!;
  expect(recognition.start).toHaveBeenCalled();
  expect(recognition.continuous).toBe(true);
  expect(recognition.interimResults).toBe(true);
  expect(screen.getByText("Starting the microphone…")).toBeInTheDocument();

  recognition.begin();
  expect(screen.getByText(/Listening/)).toBeInTheDocument();

  // A guess is shown but not yet written into the notes.
  recognition.hear("oil under the bum", false);
  expect(screen.getByText("oil under the bum…")).toBeInTheDocument();
  expect(notes).toHaveValue("");

  recognition.hear("oil under the bum", true);
  expect(notes).toHaveValue("Oil under the bum");
  expect(screen.queryByText("oil under the bum…")).not.toBeInTheDocument();

  await user.click(stop());
  expect(recognition.stop).toHaveBeenCalled();
  expect(dictate()).toBeInTheDocument();
  expect(screen.queryByText(/Listening/)).not.toBeInTheDocument();

  // Fix the misheard word by typing.
  await user.clear(notes);
  await user.type(notes, "Oil under the boom");
  expect(notes).toHaveValue("Oil under the boom");

  await user.click(screen.getByRole("button", { name: "Fill in by hand" }));
  expect(
    screen.getByRole("form", { name: "Issue and work order" }),
  ).toBeInTheDocument();
});

test("dictating again adds to the notes", async () => {
  const { user, notes, dictate } = setup();
  await user.type(notes, "Hydraulic leak.");

  await user.click(dictate());
  FakeRecognition.last!.begin();
  FakeRecognition.last!.hear("started this morning", true);
  FakeRecognition.last!.hear("near the ram", true);
  FakeRecognition.last!.end();

  expect(notes).toHaveValue("Hydraulic leak. Started this morning near the ram");

  await user.click(dictate());
  FakeRecognition.last!.begin();
  FakeRecognition.last!.hear("getting worse", true);
  expect(notes).toHaveValue(
    "Hydraulic leak. Started this morning near the ram getting worse",
  );
});

test("dictated notes clear the 'notes required' error", async () => {
  const { user, dictate } = setup();
  await user.click(screen.getByRole("button", { name: "Fill in by hand" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();

  await user.click(dictate());
  FakeRecognition.last!.begin();
  FakeRecognition.last!.hear("cracked windscreen", true);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("says when the microphone is blocked", async () => {
  const { user, dictate } = setup();
  await user.click(dictate());
  FakeRecognition.last!.fail("not-allowed");

  expect(screen.getByText(/Microphone access is blocked/)).toBeInTheDocument();
  expect(dictate()).toBeInTheDocument();
});

test("says nothing extra when dictation is stopped on purpose", async () => {
  const { user, dictate } = setup();
  await user.click(dictate());
  FakeRecognition.last!.begin();
  FakeRecognition.last!.fail("aborted");

  expect(screen.queryByText(/Dictation stopped/)).not.toBeInTheDocument();
  expect(dictate()).toBeInTheDocument();
});

test("stops listening when the report is continued", async () => {
  const { user, dictate } = setup();
  await user.click(dictate());
  const recognition = FakeRecognition.last!;
  recognition.begin();
  recognition.hear("tyre cut", true);

  await user.click(screen.getByRole("button", { name: "Fill in by hand" }));
  expect(recognition.abort).toHaveBeenCalled();
});

test("disables Dictate and points to Chrome when the browser cannot dictate", async () => {
  const user = userEvent.setup();
  render(<DefectCapture assetId="EX-014" />);

  const dictate = screen.getByRole("button", { name: "Dictate" });
  expect(dictate).toBeDisabled();
  expect(dictate).toHaveAccessibleDescription(
    "Dictate is turned off because this browser has no built-in dictation. Open this page in Chrome to dictate, or type your notes instead.",
  );

  const notes = screen.getByRole("textbox", { name: "Notes" });
  await user.type(notes, "Battery terminals corroded");
  expect(notes).toHaveValue("Battery terminals corroded");
});
