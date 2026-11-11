import { afterEach, describe, expect, test, vi } from "vitest";
import {
  appendTranscript,
  describeSpeechError,
  getSpeechRecognition,
  readResults,
  type SpeechRecognitionEventLike,
} from "./speech";

function event(
  resultIndex: number,
  results: [text: string, isFinal: boolean][],
): SpeechRecognitionEventLike {
  return {
    resultIndex,
    results: results.map(([transcript, isFinal]) =>
      Object.assign([{ transcript }], { isFinal }),
    ),
  };
}

describe("getSpeechRecognition", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("is null when the browser has no speech recognition", () => {
    expect(getSpeechRecognition()).toBeNull();
  });

  test("uses Chrome's prefixed class", () => {
    class Fake {}
    vi.stubGlobal("webkitSpeechRecognition", Fake);
    expect(getSpeechRecognition()).toBe(Fake);
  });

  test("prefers the unprefixed class", () => {
    class Prefixed {}
    class Standard {}
    vi.stubGlobal("webkitSpeechRecognition", Prefixed);
    vi.stubGlobal("SpeechRecognition", Standard);
    expect(getSpeechRecognition()).toBe(Standard);
  });
});

describe("readResults", () => {
  test("separates settled words from guesses", () => {
    expect(
      readResults(event(0, [["oil leak", true], [" near the", false]]), 0),
    ).toEqual({ final: "oil leak", interim: "near the", delivered: 1 });
  });

  test("never hands over the same final result twice", () => {
    const results: [string, boolean][] = [
      ["oil leak", true],
      ["near the boom", true],
    ];
    expect(readResults(event(0, results), 1)).toEqual({
      final: "near the boom",
      interim: "",
      delivered: 2,
    });
  });

  test("joins several final results with single spaces", () => {
    expect(
      readResults(event(0, [[" hydraulic ", true], ["  hose", true]]), 0).final,
    ).toBe("hydraulic hose");
  });
});

describe("appendTranscript", () => {
  test("starts empty notes with a capital", () => {
    expect(appendTranscript("", "oil under the boom")).toBe("Oil under the boom");
  });

  test("adds to existing notes with a space", () => {
    expect(appendTranscript("Oil under the boom", "near the ram")).toBe(
      "Oil under the boom near the ram",
    );
  });

  test("starts a new sentence after a full stop", () => {
    expect(appendTranscript("Oil under the boom.", "it started today")).toBe(
      "Oil under the boom. It started today",
    );
  });

  test("does not double up spaces or break a new line", () => {
    expect(appendTranscript("Oil leak ", "near the ram")).toBe("Oil leak near the ram");
    expect(appendTranscript("Oil leak\n", "smells hot")).toBe("Oil leak\nSmells hot");
  });

  test("ignores empty dictation", () => {
    expect(appendTranscript("Oil leak", "  ")).toBe("Oil leak");
  });
});

describe("describeSpeechError", () => {
  test("explains a blocked microphone", () => {
    expect(describeSpeechError("not-allowed")).toMatch(/Microphone access is blocked/);
    expect(describeSpeechError("service-not-allowed")).toMatch(/blocked/);
  });

  test("stays quiet when dictation was stopped on purpose", () => {
    expect(describeSpeechError("aborted")).toBeNull();
  });

  test("has a fallback for anything else", () => {
    expect(describeSpeechError("bad-grammar")).toMatch(/Dictation stopped unexpectedly/);
  });
});
