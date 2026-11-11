// Voice dictation for defect notes (R8, R9), using the browser's own speech
// recognition. In Chrome the audio is sent to Google for transcription; no AI
// model of ours is involved.

// TypeScript's DOM library does not include the Web Speech API, so the parts
// used here are declared by hand.
export type SpeechRecognitionAlternativeLike = { transcript: string };

export type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

export type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

export type SpeechRecognitionErrorEventLike = { readonly error: string };

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** The browser's speech recognition class, or null when it has none. */
export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Splits the results of one recognition event into new words the browser has
 * settled on (final) and words it is still guessing at (interim).
 *
 * `delivered` is how many results have already been handed over as final, so
 * a final result is never added to the notes twice. The returned `delivered`
 * is the count to pass in with the next event.
 */
export function readResults(
  event: SpeechRecognitionEventLike,
  delivered: number,
): { final: string; interim: string; delivered: number } {
  let final = "";
  let interim = "";
  let count = delivered;
  for (let i = Math.max(event.resultIndex, delivered); i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) {
      final += ` ${text}`;
      count = i + 1;
    } else {
      interim += ` ${text}`;
    }
  }
  return {
    final: final.replace(/\s+/g, " ").trim(),
    interim: interim.replace(/\s+/g, " ").trim(),
    delivered: count,
  };
}

/**
 * Adds dictated words to the end of the notes, so dictating again adds to
 * what is there rather than replacing it. Starts a new sentence with a capital
 * letter, since the browser does not add punctuation or capitals itself.
 */
export function appendTranscript(notes: string, words: string): string {
  const addition = words.trim();
  if (!addition) return notes;

  const startsSentence = notes.trim() === "" || /[.!?]\s*$|\n\s*$/.test(notes);
  const text = startsSentence
    ? addition.charAt(0).toUpperCase() + addition.slice(1)
    : addition;

  if (notes === "" || /\s$/.test(notes)) return notes + text;
  return `${notes} ${text}`;
}

/**
 * A message for a recognition error, or null for errors that need none (the
 * person stopped it, or simply paused).
 */
export function describeSpeechError(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow the microphone for this site in your browser, or type your notes.";
    case "audio-capture":
      return "No microphone was found. Connect one, or type your notes.";
    case "network":
      return "Dictation needs an internet connection. Check your connection, or type your notes.";
    case "no-speech":
      return "No speech was heard. Press Dictate and try again.";
    case "language-not-supported":
      return "Dictation is not available in this language. Type your notes instead.";
    case "aborted":
      return null;
    default:
      return "Dictation stopped unexpectedly. Press Dictate to try again, or type your notes.";
  }
}
