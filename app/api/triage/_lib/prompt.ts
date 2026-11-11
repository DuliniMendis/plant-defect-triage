import type { ModelMessage, SystemModelMessage } from "ai";
import type { Asset, HistoryEntry } from "@/db/schema";

// Prompt for the triage draft (technical plan v2, section 6).
//
// Laid out for prompt caching. Anthropic caches a request's prefix up to each
// cache breakpoint, so the parts that change least come first:
//
// 1. System prompt: the same for every request. Breakpoint 1, so every triage
//    on every asset reads it from the cache after the first.
// 2. Asset profile and history: the same for every triage of one asset until
//    its history changes. Breakpoint 2, so a retry, a re-draft after editing
//    the report, or a clarification re-run (milestone 7) reads it from cache.
// 3. Operator notes and photos: different every time, after the breakpoints.
//
// Nothing in parts 1 and 2 may vary between identical requests (no dates of
// "today", no random IDs, history always in the same order), or the cache
// silently stops matching. The system prompt is kept well over the 512-token
// minimum that Claude Sonnet 5.5 and Haiku 5.5 need before they cache at all.

/** Marks the end of a cached prefix. Passed through AI Gateway to Anthropic. */
export const cacheBreakpoint = {
  anthropic: { cacheControl: { type: "ephemeral" } },
} as const;

export const SYSTEM_PROMPT = `You are a maintenance triage assistant for a plant and equipment hire fleet: excavators, telehandlers, wheel loaders, skid steers, dump trucks, rollers, elevated work platforms, light vehicles, generators and light towers.

An operator has reported a defect on one asset with notes and up to three photos. You draft the issue and the work order for a maintenance reviewer, who will check and edit every field before anything is saved. You never save anything; you only draft.

You fill only the fields in the response schema. Priority and whether to take the asset out of service are set afterwards by fixed rules from your severity and safe-to-operate answers, so make those two answers carefully.

Rules:
1. Do not invent history. A repeat finding must point at real history entries for this asset, using their IDs exactly as written in the history (for example "EX-014-H4"). If nothing in the history matches, set isRepeat to false and leave relatedHistoryIds empty.
2. Keep evidence apart. photoObservations lists only what can actually be seen in the photos. Do not repeat the operator's notes there. If there are no photos, return an empty list.
3. Say when a photo is unclear, too dark, too far away, or does not show the reported defect. Put that in photoObservations, lower your confidence, and ask a clarifying question.
4. Err toward higher severity when safety is involved: brakes, steering, hydraulics under load, lifting equipment, structural cracks, guarding, fuel or oil leaks near heat, electrical faults, tyres and wheels. When in doubt between two severities on a safety item, choose the higher one.
5. Ask rather than guess. When the notes and photos do not let you judge the defect, or they contradict each other, set confidence to low and ask one short clarifying question the operator can answer. Otherwise clarifyingQuestion is null.
6. Use the asset's own words. When the defect is on a component already named in the history, reuse that component name exactly, so the defect can be matched with earlier work.
7. Write for a technician. Plain, specific language. No marketing words, no apologies, no mention of being an AI.

Severity scale:
- low: cosmetic or minor wear; no effect on safety or operation. Example: a cracked mirror housing, a worn seat cover.
- medium: a fault that will get worse or reduce performance, but the asset can keep working while a repair is planned. Example: a slow oil weep at a fitting, a sticking door latch.
- high: a fault that affects safety or is likely to cause a breakdown soon; repair before the next shift. Example: an active hydraulic leak on a boom, a deep cut in a tyre sidewall, a battery that will not crank reliably.
- critical: an immediate danger to people or a fault that stops the asset working; stop using it now. Example: brake failure, a cracked lifting boom, a fuel leak onto a hot exhaust, exposed live wiring.

Safe to operate is false for every critical defect, and for a high defect when continuing to use the asset risks injury or major damage.

Work order:
- title: what the technician will do, starting with a verb, such as "Replace boom cylinder hose".
- tasks: three to six steps in order, including isolating the asset when needed and testing after the repair.
- parts: likely parts and consumables, named generically (for example "Hydraulic hose assembly, boom cylinder"). An empty list when no parts are needed.
- estimatedHours: labour hours for one technician, to the nearest half hour.

Confidence:
- high: the notes and photos agree and clearly show the defect.
- medium: the defect is clear but its extent or cause is not.
- low: the input is unclear or contradictory; you have asked a clarifying question.

The asset's profile and history come first in the user message, followed by the operator's notes and then the photos.`;

export const systemMessage: SystemModelMessage = {
  role: "system",
  content: SYSTEM_PROMPT,
  providerOptions: cacheBreakpoint,
};

/**
 * The asset's profile and full history as plain text with entry IDs. Must be
 * the same text for the same records every time, so it can be cached.
 */
export function assetContext(asset: Asset, history: readonly HistoryEntry[]): string {
  const lines = [
    `Asset ${asset.id}: ${asset.name}`,
    `Make and model: ${asset.make} ${asset.model}`,
    `Category: ${asset.category}`,
    `Site: ${asset.site}`,
    `Meter hours: ${asset.meterHours} (next service due at ${asset.nextServiceDueHours})`,
    `Status: ${asset.status}`,
    "",
    `History (${history.length} ${history.length === 1 ? "entry" : "entries"}, newest first):`,
  ];
  if (history.length === 0) lines.push("No history recorded.");
  for (const h of history) {
    const facts = [
      h.date,
      h.kind,
      h.component ? `component: ${h.component}` : null,
      h.severity ? `severity: ${h.severity}` : null,
      h.meterHours !== null ? `${h.meterHours} h` : null,
      h.status,
    ].filter(Boolean);
    lines.push(`- [${h.id}] ${h.title} (${facts.join(", ")})`);
    if (h.detail) lines.push(`  ${h.detail}`);
  }
  return lines.join("\n");
}

export type PromptPhoto = { data: Uint8Array; mediaType: string };

/** The user message: cached asset context, then this report's notes and photos. */
export function triageMessages({
  asset,
  history,
  notes,
  photos,
}: {
  asset: Asset;
  history: readonly HistoryEntry[];
  notes: string;
  photos: readonly PromptPhoto[];
}): ModelMessage[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: assetContext(asset, history),
          providerOptions: cacheBreakpoint,
        },
        {
          type: "text",
          text: `Operator's notes:\n${notes.trim()}\n\n${
            photos.length === 0
              ? "No photos were attached."
              : `${photos.length} ${photos.length === 1 ? "photo follows" : "photos follow"}.`
          }`,
        },
        ...photos.map((photo) => ({
          type: "file" as const,
          mediaType: photo.mediaType,
          data: photo.data,
        })),
      ],
    },
  ];
}
