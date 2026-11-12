"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  describeSpeechError,
  getSpeechRecognition,
  readResults,
  type SpeechRecognitionLike,
} from "./speech";

export type DictationStatus = "idle" | "starting" | "listening";

export const UNSUPPORTED_MESSAGE =
  "Dictate is turned off because this browser has no built-in dictation. Open this page in Chrome to dictate, or type your notes instead.";

/**
 * Dictation into the notes box (R8). Each phrase the browser settles on is
 * passed to `onWords`; words it is still guessing at are returned as
 * `interim` so they can be shown without being written into the notes yet.
 *
 * `supported` is null until the page has hydrated, then true or false.
 */
export function useDictation(onWords: (words: string) => void) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getSpeechRecognition() !== null,
    () => null,
  );
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [interim, setInterim] = useState("");
  const [message, setMessage] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Always call the latest callback, without restarting recognition.
  const onWordsRef = useRef(onWords);
  useEffect(() => {
    onWordsRef.current = onWords;
  }, [onWords]);

  // Stop listening if the panel goes away mid-dictation.
  useEffect(
    () => () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
    },
    [],
  );

  function start() {
    if (recognitionRef.current) return;
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-AU";
    recognition.continuous = true;
    recognition.interimResults = true;

    let delivered = 0;
    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      const result = readResults(event, delivered);
      delivered = result.delivered;
      if (result.final) onWordsRef.current(result.final);
      setInterim(result.interim);
    };
    recognition.onerror = (event) => {
      const text = describeSpeechError(event.error);
      if (text) setMessage(text);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setStatus("idle");
      setInterim("");
    };

    recognitionRef.current = recognition;
    setMessage("");
    setStatus("starting");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus("idle");
      setMessage(describeSpeechError("unknown") ?? "");
    }
  }

  /** Stops listening. Words still being recognised are added before it ends. */
  function stop() {
    recognitionRef.current?.stop();
  }

  return { supported, status, interim, message, start, stop };
}

function noopSubscribe() {
  return () => {};
}
