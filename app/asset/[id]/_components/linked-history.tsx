"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** What the review panel needs to name a history entry it links to. */
export type HistoryRef = { id: string; title: string; date: string };

type LinkedHistory = {
  /** Every history entry on the page, newest first. */
  entries: readonly HistoryRef[];
  /** IDs the current AI draft's repeat check points at. */
  linkedIds: ReadonlySet<string>;
  setLinkedIds: (ids: readonly string[]) => void;
};

const empty: LinkedHistory = {
  entries: [],
  linkedIds: new Set(),
  setLinkedIds: () => {},
};

const LinkedHistoryContext = createContext<LinkedHistory>(empty);

// Joins the two columns of the asset page (technical plan section 7): the
// review panel on the right says which history entries a repeat finding
// points at (R16), and those entries are highlighted in the history column on
// the left, beside the claim. The history itself is rendered on the server;
// only the highlight is client state.
export function LinkedHistoryProvider({
  entries,
  children,
}: {
  entries: readonly HistoryRef[];
  children: ReactNode;
}) {
  const [ids, setIds] = useState<readonly string[]>([]);
  const value = useMemo<LinkedHistory>(
    () => ({ entries, linkedIds: new Set(ids), setLinkedIds: setIds }),
    [entries, ids],
  );
  return <LinkedHistoryContext value={value}>{children}</LinkedHistoryContext>;
}

export function useLinkedHistory(): LinkedHistory {
  return useContext(LinkedHistoryContext);
}

/**
 * Highlights the given history entries while the caller is mounted with them,
 * and clears the highlight when it unmounts or the list empties.
 */
export function useHighlightHistory(ids: readonly string[]) {
  const { setLinkedIds } = useLinkedHistory();
  const key = ids.join(" ");
  useEffect(() => {
    setLinkedIds(key ? key.split(" ") : []);
    return () => setLinkedIds([]);
  }, [key, setLinkedIds]);
}

/** The element ID of a history entry, for links from the repeat finding. */
export function historyAnchor(id: string): string {
  return `history-${id}`;
}

/**
 * One history entry's list item. Marked, with a text label as well as the
 * yellow border, when the AI's repeat finding links to it.
 */
export function HistoryItemFrame({
  entryId,
  children,
}: {
  entryId: string;
  children: ReactNode;
}) {
  const { linkedIds } = useLinkedHistory();
  const linked = linkedIds.has(entryId);
  return (
    <li
      id={historyAnchor(entryId)}
      className={`scroll-mt-4 rounded-md border bg-page p-4 ${
        linked ? "border-2 border-accent shadow-sm" : "border-line"
      }`}
    >
      {linked && (
        <p className="mb-2 inline-block rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">
          Linked by the AI repeat check
        </p>
      )}
      {children}
    </li>
  );
}
