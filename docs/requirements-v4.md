# Plant Defect Triage — Requirements

A concept for a plant maintenance product. Named after that product in versions 1 and 2.

Status: Version 4 (11 Nov 2026). Previous versions: [version 3](requirements-v3.md), [version 2](requirements-v2.md), [version 1](requirements.md)

## Changes from version 3

Made while building milestone 1 (Linear DUL-5), at the user's request.

| Area | Version 3 | Version 4 | Why |
|---|---|---|---|
| Styling (R30) | Black and yellow theme | Light theme with black and yellow as accents. Yellow is never used as text on a light background | Requested. Yellow text on a light background cannot be read, so the rule keeps the accents legible |
| Asset list (R1) | List the seeded assets | Same, plus a search box, filters and pages | Requested, so the list stays usable with a larger fleet |
| New requirements | | R35 to R38 (section 5.1): search, filters by type, site and status, pages, and keeping them across navigation | Describe the list changes |
| Demo fleet | Four assets: excavator, telehandler, light vehicle, generator | 24 assets. The same four demo assets, plus 20 supporting assets across more types and sites | Requested, so the list has enough assets to search and page through |
| Makes and models | Not stated | Real makes and models; the individual assets, sites and history are fictional | Decided: real equipment looks more credible in the demo |

## Changes from version 2

| Area | Version 2 | Version 3 | Why |
|---|---|---|---|
| Storage | Seeded assets in code; approved work orders in the browser's local storage | A real database holds assets, history and work orders | Requested |
| New requirements | | R26 to R29 (section 5.7) | Describe what the database must do |
| Photos | Used for the AI draft, then discarded | Kept with the approved work order (confirmed) | A stored work order should keep its evidence |
| Reset between takes | Not stated | Demo data can be restored to its starting state (R29) | Stored data now outlives the browser |
| Access | Private to one browser | Anyone with the URL sees and can add to the same data | A consequence of shared storage with no login |
| Demo fleet | Assumed | Confirmed: excavator, telehandler, light vehicle, generator | Decided |
| Styling | Open question | Black and yellow theme (R30) | Decided |
| App name | Named after the maintenance product | Plant Defect Triage, with a subtitle naming the maintenance product (R30) | Avoids using the vendor's product name as the app's own name |
| Repository and disclaimers | Not stated | Private repository; demo disclaimers in the README and the app (R31 to R33) | Requested, to avoid any IP concern with the vendor |
| Sample photos | Open question | AI-generated images plus public-domain photos, with a credits file (R34) | Decided: found on the web or generated |

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

Requirement numbers are unchanged from version 1 so versions can be compared line by line. New requirements take the next free number.

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
- R1. **Changed.** List seeded demo assets with name, ID, site and status, a page at a time (R37), with search (R35) and filters (R36).
- R2. **Changed.** Upload a QR code image through a file picker. The app reads the code and opens that asset's profile. If the image has no readable code, or the code matches no asset, say so and offer the list.
- R3. **Removed.** A QR code image for each demo asset is saved in the project folder for use with R2.
- R4. Offer a path to every asset that needs no QR code, by picking from the list.
- R35. **New.** Search the list by asset ID, name, make, model or site. Matching ignores case, and every word typed must match. Results update as the person types.
- R36. **New.** Filter the list by asset type, site and status. Filters combine with each other and with the search. The list shows how many assets match, a way to clear all filters, and a clear message when nothing matches.
- R37. **New.** Show the list in pages of eight assets, with previous, next and numbered page controls. Changing the search or a filter returns to the first page.
- R38. **New.** Keep the search, filters and page when the person opens an asset and comes back, or reloads the page.

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

### 5.7 Data storage
- R26. **New.** Assets, their history and approved work orders are stored in a database, not in the browser. An approved work order is still there after a refresh, in another browser, and on another device.
- R27. **New.** Approving saves the work order, its history entry and any status change together. If any part fails, nothing is saved and the reviewer is told.
- R28. **New.** The work order keeps both the AI's draft and the approved version, and the photos submitted with it.
- R29. **New.** The demo data can be restored to its seeded starting state between recordings.

Seeded fleet: 24 assets. Four are the demo assets used in the recorded flow, each with a sample defect photo (R11) and detailed history, two of which set up a repeat finding (R16): a 20t excavator (EX-014), a telehandler (TH-007), a dual-cab ute (LV-022) and a 60 kVA generator (GN-003). The other 20 fill out the list across further types (wheel loaders, skid steers, dump trucks, rollers, elevated work platforms, a light tower) and five sites. Each has a recent service, and an open issue when it is not operational.

### 5.8 Styling, repository and disclaimers
- R30. **Changed.** The app is named "Plant Defect Triage", with a subtitle naming the maintenance product. It uses a light theme with black and yellow as accents: light pages and cards with dark text, black for strong accents such as the header bar, and yellow for fills, bars and borders. Yellow is never used as text on a light background; text on yellow is black. It uses no vendor logos, typefaces, screenshots or other brand assets, and does not imitate the look of the vendor's products.
- R31. **New.** The code repository is private. It is shared only with people you choose, such as a demo viewer.
- R32. **New.** The README and a footer on every screen carry a disclaimer (draft wording below).
- R33. **New.** The app is built only from publicly available information about the vendor's products. It contains no vendor code, data or confidential material, and does not connect to any vendor system. No vendor or product names are used in the repository or the app.
- R34. **New.** Sample defect photos are either AI-generated for this demo or public-domain (CC0) images. A credits file lists the source and licence of each. No photo shows a person, a number plate, or a manufacturer's logo.

Draft disclaimer wording:

> This is an independent concept demo. It is not affiliated with, endorsed by or sponsored by any company. It was built from publicly available information, contains no other company's code, data or brand assets, and uses fictional asset data. Not for commercial use.

This wording states what the demo is and is not. It is not legal advice and cannot guarantee that no IP question could be raised; it records that care was taken.

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
- **Secrets.** No AI key or database credentials in the browser or the repository. AI calls and all database access run on the server.
- **Access.** There is no login, so anyone with the URL can view and add data. The URL is kept unshared until the demo is shown.

## 8. Technical approach

Summarised here; detail is in the [technical plan, version 2](technical-plan-v2.md).

| Area | Choice | Reason |
|---|---|---|
| Styling | Colour tokens in one stylesheet, used through Tailwind utilities | One place to change the theme; the light-theme rules are in `CLAUDE.md` |
| Framework | Next.js (App Router), TypeScript, Tailwind | One codebase for UI and API |
| AI | Vercel AI SDK through Vercel AI Gateway | One Vercel account covers hosting and model access |
| Model | Claude Sonnet 5.5; Haiku 5.5 compared in testing | Vision and structured output at modest cost |
| Voice | Chrome's built-in speech recognition | No extra service or key |
| QR lookup | Read the uploaded image in the browser with a JavaScript QR library | No camera needed |
| Data | Postgres database (Neon, through the Vercel Marketplace), in Sydney | Real storage, set up from the same Vercel account, close to where the demo is recorded |
| Photos | Vercel Blob | Keeps photos with the work order |
| Hosting | Vercel | Decided |

## 9. Build-process deliverable

A separate published page, for use in the demo video, that records:

- Every prompt used, in order, with what each one produced.
- Model and settings for each session (planning in Claude Fable 5.2 at medium effort, build sessions in Claude Opus 5.5; auto permission mode, Claude desktop app Code tab).
- How the work was organised: research first, ideation, requirements before code, a revision round, a technical plan, and any parallel agents used during the build.
- Decisions made along the way and why, including each requirements revision (versions 1 to 4).
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

Resolved since version 1: AI key (Vercel AI Gateway), hosting (Vercel), voice support (Chrome only), audience (a private demo), storing photos (kept with the approved work order, in Vercel Blob).

Resolved in version 3: demo fleet (excavator, telehandler, light vehicle, generator), styling (black and yellow), sample photos (generated or public-domain), app name ("Plant Defect Triage", with a subtitle naming the maintenance product).

Revised in version 4: styling (light theme with black and yellow accents), demo fleet (24 assets, the same four demo assets plus 20 supporting ones), makes and models (real equipment, fictional assets).

Still open:

1. **Deployed URL.** A private repository does not make the deployed app private. Proposed: turn on Vercel's deployment protection so the URL needs a sign-in or a share link, and give demo viewers a share link.

## 12. Acceptance criteria

- In Chrome on a laptop, uploading a saved QR code image opens the right asset.
- The fleet list shows every seeded asset across its pages. Searching, filtering by type, site and status, and paging narrow the list as expected, and survive opening an asset and coming back.
- Uploaded photos plus a dictated note produce a complete draft with severity, repeat check and work order.
- The dictated transcript can be corrected by hand before submitting.
- A defect that matches seeded history is flagged as a repeat, with the earlier entries linked.
- Editing a field and approving creates a work order that shows on the asset's history, with the changed fields recorded.
- Discarding leaves no trace.
- An approved work order is still on the asset's history after a refresh and in a second browser.
- Restoring the demo data returns every asset to its seeded state.
- The layout works at tablet width (768px) and on a desktop.
- The whole flow can be demonstrated in about two minutes on the deployed Vercel URL.
