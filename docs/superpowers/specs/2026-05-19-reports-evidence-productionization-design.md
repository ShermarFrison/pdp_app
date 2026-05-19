# Reports & Evidence Productionization — Design

Date: 2026-05-19
Sub-project: SP2 of 5 (Sprints 5 & 6 delivery)
Owner: The V
Depends on: SP1 (offline & sync hardening — `lib/sync/`)

## Tickets in scope

- **SCRUM-67** — Replace mocked report submit path with persistent submission service.
- **SCRUM-71** — Productionize evidence flow with real picker, retry UX, and report preview visibility.

Out of scope: OCR (SP4), notifications on submit (SP3), audit export (SP3), conflict screen itself (built in SP1).

## Context

The current report submission path lives inline in `AppContext.submitReport`; it queues an item locally but does not flow through a durable sync pipeline. Evidence attachments currently accept a URI from the caller — no real picker is wired — and attached evidence does not appear in the report preview. There is no retry UX for failed attachments.

Required Expo libraries are not yet installed: `expo-image-picker`, `expo-document-picker`, `expo-file-system`.

## Approach

Treat evidence metadata as a first-class entity in SP1's `syncQueue`. The binary stays local: the picker writes the file into the app's documents directory via `expo-file-system`, and "upload" means "file persisted to disk + metadata acknowledged by the simulated remote." Retries are local file-copy retries, not network calls. This keeps the data model consistent with reports and profile sync without inventing a separate evidence-upload abstraction.

## Module layout

```
mobile-app/lib/evidence/
  picker.ts          // pickPhoto(), pickDocument()
  storage.ts         // copyIntoAppDocs(srcUri) -> persistentUri; remove(persistentUri)
  index.ts
mobile-app/lib/reports/
  submission.ts      // submitReport(reportId, updates)
  index.ts
```

New dependencies: `expo-image-picker`, `expo-document-picker`, `expo-file-system`.

### `lib/evidence/picker`

- `pickPhoto()` and `pickDocument()` request permissions, present the native picker, and return `{ uri, fileName, sizeBytes, mimeType } | null` (null on cancel).
- Permission denial surfaces as a typed result `{ ok: false, reason: "permission_denied" }`; callers render an inline message and never crash.

### `lib/evidence/storage`

- `copyIntoAppDocs(srcUri)` copies the picked file into `${FileSystem.documentDirectory}evidence/<id>.<ext>` and returns a stable URI. System picker URIs are not stable across app restarts; this copy is required for durability.
- `remove(persistentUri)` deletes the on-disk copy.
- Both operations are idempotent.

### `lib/reports/submission`

- `submitReport(reportId, updates)`:
  - Validates required fields (re-uses existing report validation; no change).
  - Persists the draft state locally with a bumped `localVersion` + `baseVersion`.
  - Enqueues `{ kind: "report", op: "submit", payload }` via `syncQueue` from SP1.
  - Returns a promise that resolves on terminal queue outcome (`acknowledged | conflict | failed`).
- Submission history gains a `submissionState` field: `pending | acknowledged | conflict | failed`.

## Evidence retry UX (SCRUM-71)

Each evidence row in the task/report UI shows one of:

- *uploading…* — spinner; queue item in `pending` or `in-flight`.
- *uploaded ✓* — queue item `ok`.
- *failed — Retry* — queue item `error` after permanent failure; **Retry** re-enqueues with the same payload (queue handles backoff). Row also exposes **Remove**.

A top-of-report banner appears if any evidence row is in error state: *"N attachment(s) failed to upload — tap to retry all."* Tapping retries all failed evidence items at once.

State derives from `syncQueue.subscribe` — no parallel state machine in the UI layer.

## Report preview (SCRUM-71)

The report detail screen gains an **Evidence** section listing attachments grouped by task. Each row shows:

- Thumbnail for photos (`Image` with the persistent URI) or file icon for PDFs.
- Filename and size.
- Upload status pill (mirrors the row states above).

Submitted reports include the evidence list in their read-only preview. Drafts get an **Add evidence** action that invokes the picker. Empty state: *"No evidence attached."*

## Submit path (SCRUM-67)

- `AppContext.submitReport` becomes a thin wrapper around `lib/reports/submission.submitReport`.
- The queued item survives restart (free from SP1's queue persistence).
- On simulated remote acknowledgement, the report transitions to `submitted`, `submittedAt` is set, and an audit event `report.submit_acknowledged` is appended.
- On conflict, the entity is routed to the SP1 conflict screen via the existing `syncConflicts` surface. No new conflict UI is built here.
- On permanent failure, the report stays in `draft` with `submissionState: "failed"`; the UI surfaces a retry affordance.

## Test strategy

Unit, isolated:

- `evidence/picker.test.ts` — happy path returns the documented shape; cancel returns `null`; permission denial surfaces `{ ok: false, reason: "permission_denied" }`. Expo modules mocked.
- `evidence/storage.test.ts` — `copyIntoAppDocs` produces a stable URI under app docs; `remove` cleans up; both idempotent.
- `reports/submission.test.ts` — happy path enqueues and transitions to `submitted` on ack; conflict path transitions to `conflict`; failure path transitions to `failed`; restart recovery replays a queued submission.

Integration:

- One test: attach evidence via simulated picker, submit report, assert preview shows the attachment with `uploaded` status and audit log contains both `evidence.upload` and `report.submit_acknowledged`.

## Risks and mitigations

- **Missing platform permissions** can crash if unhandled. Mitigation: `picker.ts` centralizes permission checks; typed denial result, no throws into UI.
- **File copy fails on low storage.** Mitigation: failure surfaces as failed-upload state with retry; original picked URI is *not* discarded until copy succeeds, so retry remains possible until the user dismisses.
- **System picker URI scope** differs by platform; the persistent copy avoids both Android `content://` lifetime issues and iOS sandbox issues.

## Acceptance criteria

- Real photo and document pickers replace the externally-supplied URI path.
- Picked files are copied into stable per-app storage; URIs survive app restart.
- Evidence rows show per-item upload status with explicit retry and remove affordances.
- A banner appears when any attachment is in error state and supports retry-all.
- Report detail/preview shows attached evidence for both drafts and submitted reports.
- `submitReport` is implemented as a thin wrapper over `lib/reports/submission`, which routes through `syncQueue`; submissions survive restart and resolve to `acknowledged | conflict | failed`.
- Audit log contains `evidence.upload`, `evidence.remove`, and `report.submit_acknowledged` events as appropriate.
- All new unit + integration tests pass; existing report flows do not regress.
