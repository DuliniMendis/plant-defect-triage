# Plant Defect Triage — Requirements

Status: Version 2 (11 Nov 2026), revised after review of [version 1](requirements.md)

## Changes from version 1

| Area | Version 1 | Version 2 | Why |
|---|---|---|---|
| Target devices | Mobile first, laptop also | Desktop and tablet only; phone later | A phone is hard to record for the demo video |
| Browser | Chrome and Safari | Chrome only | Simpler; speech recognition is most reliable in Chrome |
| QR lookup (R2) | Scan with the phone camera | Upload a saved QR code image through a file picker | Works on a laptop and records cleanly |
| QR sheet (R3) | Printable page of QR codes | Removed. QR codes are saved as image files instead | No phone scanning in this demo |
| Photos (R7) | Phone rear camera or upload | File picker or drag and drop only | Same reason |
| Voice note (R8) | Transcribed to editable text | Unchanged, now stated explicitly: the transcript can be edited before submitting | Requested |
| Approval record (R22) | Who approved, when, and what changed | When, and what changed. No approver identity | Requested; there is no login |
| AI access | Anthropic SDK with its own key | Vercel AI SDK through Vercel AI Gateway | Simpler setup, one Vercel account |
| Model | Not specified | Claude Sonnet 5.5, with Haiku 5.5 compared during testing | Sufficient for the task at lower cost |
| Sample mode | Canned draft when no key is set | Removed | A real key will be configured; manual entry remains the fallback |
| Hosting | Open question | Vercel | Decided |
| Audience | Open question | A private demo | Decided |

Requirement numbers are unchanged from version 1 so the two versions can be compared line by line.

## 1. Purpose

A demo app that shows how a vendor's AI assistant, available today in its forms product, could be extended into its plant maintenance product. A mechanic or operator reports a defect on a piece of plant with photos and a voice note. AI drafts the issue, rates its severity, checks the asset's history for repeats, and proposes a work order. A person reviews and approves before anything is saved.

The app is the subject of a demo video about how it was built with AI, so the build process is a deliverable alongside the app (see section 9).

## 2. Why this idea

- The vendor's AI assistant launched in June 2026 for its forms product only. Access from the maintenance product is announced as "coming soon".
- The maintenance product already has the pieces this flow connects: QR asset lookup, issues, schedule checks and work orders.
- The AI assistant's rule is that every AI output is a draft until a human reviews and saves. This demo keeps that rule.

What the demo should show a viewer:

- An understanding of the vendor's products and where the AI layer stops today.
- Product judgement: a small, complete flow rather than a broad, shallow one.
- A disciplined way of working with AI: research, requirements, a plan, then a build.

## 3. Users

| User | What they need |
|---|---|
| Operator or mechanic | Report a defect in under a minute without typing much |
| Maintenance supervisor | A clear, consistent issue and a ready-to-approve work order |
| Demo viewer | To see the flow end to end in about two minutes |

The practical use is on a phone on site. This demo targets desktop and tablet so it can be recorded; phone support is a later step (see section 10).

## 4. Core flow

1. **Find the asset.** Upload its QR code image, or pick it from a list.
2. **See the asset profile.** Status, meter hours, next service, recent history.
3. **Report a defect.** Add one or more photos, dictate a voice note, or type notes.
4. **AI drafts the triage.** Issue summary, severity, repeat check, proposed work order.
5. **Review and edit.** Every field is editable. The person approves or discards.
6. **Work order is created.** It appears on the asset's history and the asset status updates.

## 5. Functional requirements

### 5.1 Asset lookup
- R1. List seeded demo assets with name, ID, site and status.
- R2. **Changed.** Upload a QR code image through a file picker. The app reads the code and opens that asset's profile. If the image has no readable code, or the code matches no asset, say so and offer the list.
- R3. **Removed.** A QR code image for each demo asset is saved in the project folder for use with R2.
- R4. Offer a path to every asset that needs no QR code, by picking from the list.

### 5.2 Asset profile
- R5. Show make, model, site, meter hours, next service due and current status.
- R6. Show history: past issues, repairs, schedule checks and work orders, newest first.

### 5.3 Defect capture
- R7. **Changed.** Add photos through a file picker or by drag and drop. Support up to 3 photos, with a preview and a remove button for each.
- R8. **Changed.** Dictate a voice note. It is transcribed into a text box as the person speaks. The person can edit the transcript freely before submitting, and can dictate again to add to it.
- R9. Allow typed notes as an alternative to voice. Typed and dictated notes share the same text box.
- R10. Require at least one photo or some notes before submitting.
- R11. **Changed.** Sample defect photos for each demo asset are saved in the project folder, so the flow can be shown without a camera.

### 5.4 AI triage
The AI receives the photos, the notes and the asset's profile and history. It returns a draft with:

- R12. **Issue:** title, description, affected component.
- R13. **Severity:** low, medium, high or critical, with a one-sentence reason.
- R14. **Safe to operate:** yes or no.
- R15. **Photo observations:** what it can see in the photos, kept separate from what the operator said.
- R16. **Repeat check:** whether this matches earlier history entries, with links to them.
- R17. **Proposed work order:** title, priority, task list, likely parts, estimated hours, and whether to take the asset out of service.
- R18. **Confidence** and, when the input is unclear, one clarifying question instead of a guess.

### 5.5 Review and approval
- R19. Show the draft clearly marked as an AI draft.
- R20. Let the reviewer edit every field, including severity and tasks.
- R21. Approve creates the issue and work order. Discard creates nothing.
- R22. **Changed.** Record when the work order was approved and which fields were changed from the AI draft. No approver identity is recorded.
- R23. If the AI asked a clarifying question, let the reviewer answer and re-run the draft.

### 5.6 After approval
- R24. The new issue and work order appear in the asset's history.
- R25. The asset status changes if it was taken out of service.

## 6. AI behaviour rules

- The AI never saves anything. It only drafts.
- It must not invent history. Repeat findings must point at real entries.
- It must say when a photo is unclear or does not show the reported defect.
- It errs toward higher severity when safety is involved (brakes, hydraulics under load, structural cracks, guarding).
- It returns structured data, not free text, so the form fields fill reliably.

## 7. Non-functional requirements

- **Devices.** Desktop and tablet, 768px wide and up. Touch targets large enough for a tablet.
- **Browser.** Chrome only.
- **Speed.** A draft should come back in roughly 10 seconds or less.
- **Failure handling.** If the AI call fails, the reviewer can retry or fill in the form by hand.
- **Secrets.** No AI key in the browser or the repository. AI calls run on the server.

## 8. Technical approach

Summarised here; detail is in the [technical plan](technical-plan.md).

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router), TypeScript, Tailwind | One codebase for UI and API |
| AI | Vercel AI SDK through Vercel AI Gateway | One Vercel account covers hosting and model access |
| Model | Claude Sonnet 5.5; Haiku 5.5 compared in testing | Vision and structured output at modest cost |
| Voice | Chrome's built-in speech recognition | No extra service or key |
| QR lookup | Read the uploaded image in the browser with a JavaScript QR library | No camera needed |
| Data | Seeded assets in code; approved work orders in the browser's local storage | No database to set up for a demo |
| Hosting | Vercel | Decided |

## 9. Build-process deliverable

A separate published page, for use in the demo video, that records:

- Every prompt used, in order, with what each one produced.
- Model and settings (Claude Fable 5.2, medium effort, auto permission mode, Claude desktop app Code tab).
- How the work was organised: research first, ideation, requirements before code, a revision round, a technical plan, and any parallel agents used during the build.
- Decisions made along the way and why, including this revision from version 1 to version 2.
- Token usage at checkpoints through the build: the size of the session's context window and the share of the plan limit used. Checkpoints are kept in the [usage log](usage-log.md). A per-prompt count of tokens billed is not available to the session.

It will only record what actually happened in this session.

## 10. Out of scope

- Phone layout and live camera capture. Planned as the next step after the demo.
- Login, roles, approver identity and multi-user sync.
- Offline use.
- Browsers other than Chrome.
- Real integration with the vendor's products.
- Parts inventory, costing and scheduling.
- Push notifications.

## 11. Open questions

Resolved since version 1: AI key (Vercel AI Gateway), hosting (Vercel), voice support (Chrome only), audience (a private demo).

Still open:

1. **Demo fleet.** Assumed unless you say otherwise: an excavator, a telehandler, a light vehicle and a generator.
2. **Styling.** Assumed unless you say otherwise: an original look suited to plant maintenance, not a copy of the vendor's branding.
3. **Sample defect photos (R11).** The demo needs real-looking photos of defects, such as a leaking hydraulic hose or a worn tyre. Will you supply them, or should I source freely licensed ones?

## 12. Acceptance criteria

- In Chrome on a laptop, uploading a saved QR code image opens the right asset.
- Uploaded photos plus a dictated note produce a complete draft with severity, repeat check and work order.
- The dictated transcript can be corrected by hand before submitting.
- A defect that matches seeded history is flagged as a repeat, with the earlier entries linked.
- Editing a field and approving creates a work order that shows on the asset's history, with the changed fields recorded.
- Discarding leaves no trace.
- The layout works at tablet width (768px) and on a desktop.
- The whole flow can be demonstrated in about two minutes on the deployed Vercel URL.
