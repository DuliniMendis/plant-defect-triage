# Gearbelt Defect Triage — Requirements

Status: Draft 1 (11 Nov 2026), awaiting review

## 1. Purpose

A demo app that shows how AI could extend Sitemate's Storm from Dashpivot into Gearbelt. A mechanic or operator reports a defect on a piece of plant with a photo and a voice note. AI drafts the issue, rates its severity, checks the asset's history for repeats, and proposes a work order. A person reviews and approves before anything is saved.

The app is also the subject of a Loom video about how it was built with AI, so the build process is a deliverable alongside the app (see section 9).

## 2. Why this idea

- Storm launched in June 2026 for Dashpivot only. Sitemate says Gearbelt access is "coming soon".
- Gearbelt already has the pieces this flow connects: QR asset lookup, issues, schedule checks and work orders.
- Storm's rule is that every AI output is a draft until a human reviews and saves. This demo keeps that rule.

## 3. Users

| User | What they need |
|---|---|
| Operator or mechanic on site | Report a defect in under a minute, on a phone, without typing much |
| Maintenance supervisor | A clear, consistent issue and a ready-to-approve work order |
| Demo audience (Sitemate) | To see the flow end to end in about two minutes |

## 4. Core flow

1. **Find the asset.** Scan its QR code, or pick it from a list.
2. **See the asset profile.** Status, meter hours, next service, recent history.
3. **Report a defect.** Take one or more photos, record a voice note, or type notes.
4. **AI drafts the triage.** Issue summary, severity, repeat check, proposed work order.
5. **Review and edit.** Every field is editable. The person approves or discards.
6. **Work order is created.** It appears on the asset's history and the asset status updates.

## 5. Functional requirements

### 5.1 Asset lookup
- R1. List seeded demo assets with name, ID, site and status.
- R2. Scan a QR code with the phone camera to open an asset profile.
- R3. Provide a page of printable QR codes for the demo assets, so a phone can scan them off a laptop screen.
- R4. Offer a non-camera path to every asset, so the demo works on a laptop.

### 5.2 Asset profile
- R5. Show make, model, site, meter hours, next service due and current status.
- R6. Show history: past issues, repairs, schedule checks and work orders, newest first.

### 5.3 Defect capture
- R7. Take a photo with the rear camera on a phone, or upload a file on a laptop. Support up to 3 photos.
- R8. Dictate a voice note that is transcribed to editable text.
- R9. Allow typed notes as an alternative to voice.
- R10. Require at least one photo or some notes before submitting.
- R11. Provide sample photos and notes for each demo asset, so the flow can be shown without a camera.

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
- R22. Record who approved and when, and which fields were changed from the AI draft.
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

- **Mobile first.** Designed for a phone held in one hand, large touch targets. Works on a laptop too.
- **No native app.** A responsive web app, matching the Gearbelt Mobile Web app.
- **Speed.** A draft should come back in roughly 10 seconds or less.
- **Failure handling.** If the AI call fails, the reviewer can retry or fill in the form by hand.
- **Demo safety.** A sample mode returns a clearly labelled canned draft when no AI key is configured.

## 8. Proposed technical approach

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router), TypeScript, Tailwind | One codebase for UI and API, easy to deploy |
| AI | Claude via the Anthropic SDK, with image input and structured output | Vision plus reliable field filling |
| Voice | Browser speech recognition | No extra service or key; typed notes as fallback |
| QR scan | Camera stream with a JavaScript QR library | Works on iPhone Safari |
| Data | Seeded assets in code; approved work orders in the browser's local storage | No database to set up for a demo |
| Hosting | Vercel | HTTPS is required for camera and microphone on a phone |

Already in place: an empty Next.js scaffold with the Anthropic SDK and QR libraries installed. No features are built.

## 9. Build-process deliverable

A separate published page, for use in the Loom video, that records:

- Every prompt used, in order, with what each one produced.
- Model and settings (Claude Fable 5.2, medium effort, auto permission mode, Claude desktop app Code tab).
- How the work was organised: research first, ideation, requirements before code, planning, and any parallel agents used during the build.
- Decisions made along the way and why.

It will only record what actually happened in this session.

## 10. Out of scope

- Login, roles and multi-user sync.
- Offline use.
- Real Gearbelt or Dashpivot integration.
- Parts inventory, costing and scheduling.
- Push notifications.

## 11. Open questions

1. **AI key.** No Anthropic API key is set on this machine. Will you add one, or should the demo run in sample mode only?
2. **Hosting.** Deploy to Vercel so it runs on your phone, or keep it local and demo from the laptop?
3. **Voice.** Browser speech recognition works in Chrome and Safari but not Firefox. Is that acceptable?
4. **Asset set.** Proposed demo fleet: an excavator, a telehandler, a light vehicle and a generator. Any you would rather show?
5. **Branding.** Neutral styling, or styled to sit visually close to Sitemate's products?
6. **Audience.** Is the Loom for a Sitemate interview, or a general portfolio piece? This changes how much product reasoning the app and build log should show.

## 12. Acceptance criteria

- From a phone, scanning a QR code opens the right asset.
- A photo plus a spoken note produces a complete draft with severity, repeat check and work order.
- A defect that matches seeded history is flagged as a repeat, with the earlier entries linked.
- Editing a field and approving creates a work order that shows on the asset's history.
- Discarding leaves no trace.
- The whole flow can be demonstrated in about two minutes.
