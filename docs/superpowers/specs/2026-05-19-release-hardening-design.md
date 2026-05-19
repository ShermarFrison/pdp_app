# Release Hardening — Design

Date: 2026-05-19
Sub-project: SP5 of 5 (Sprints 5 & 6 delivery)
Owner: The V
Depends on: SP1, SP2, SP3, SP4 — all merged before SP5 starts.

## Ticket in scope

- **SCRUM-78** — End-to-end release hardening for login, profile, tasks, reports, reminders, and audit.

Out of scope: any new features, new translations, performance work.

## Approach

No new product behavior. Run a scripted regression pass across the post-SP1–4 surface area, fix anything critical within a bounded budget, and document residual risks. Two committed artifacts plus optional automated end-to-end tests.

## Artifacts

### Smoke checklist (`docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`)

Walk-through covering each top-level flow with explicit pass/fail criteria and the audit events that must appear:

- Login (valid + invalid credentials, session restore after restart).
- Profile create/edit, validation errors surface, sync queues, conflict path.
- Task list renders the externalized rule set; deep-link from notification opens the correct task.
- Calendar view shows due dates and past-due grouping.
- Reports: draft → submit → simulated conflict → resolve → submitted state visible.
- Evidence: pick photo + pdf, retry a forced failure, evidence visible in report preview.
- Audit log: filter by date range, export CSV and JSON, verify share sheet, verify `audit.export` recorded.
- OCR: pick a document, review screen shows low-confidence badge, **Apply** writes back to draft, `ocr.applied` recorded.
- Regulation feed: tap impacted-task chip, lands on task, item marked read, `regulation.opened` recorded.
- Language switch: change to `lt`, restart, language preserved; logout + login, language preserved.
- Advisor delegated access: invite, scoped permission honored, revoke, advisor actions audit-logged.

Each item lists steps, expected UI outcome, and expected audit event(s).

### Risks doc (`docs/superpowers/specs/2026-05-19-release-hardening-risks.md`)

Known limitations and accepted residual risks:

- Expo Go notification limitations on iOS (full behavior only in dev builds).
- OCR is simulated — production deployment requires a real engine.
- No real backend — sync is local-simulated; production deployment requires a real `SyncClient` implementation.
- Any issues uncovered during smoke that the team explicitly accepts rather than fixing.

## Critical-fix budget

Up to about six plan steps for issues uncovered during the smoke pass. Anything larger is logged as a new ticket rather than absorbed. If a found issue's fix belongs in an earlier sub-project, reopen that sub-project instead of patching inside SP5.

## Optional automated end-to-end tests

If the repo already has Detox or Maestro configured, convert the most reliable smoke items (login, profile save, report submit happy path, language switch persistence) into automated tests. If neither is configured, stay with manual smoke plus the AppContext integration tests added per sub-project; do not stand up a new e2e harness as part of SP5.

## Test strategy

- Run the manual smoke checklist end-to-end on a clean install.
- Re-run the full unit + integration suite from SP1–4.
- Spot-check any automated e2e tests if they exist.

## Risks and mitigations

- **Smoke surfaces issues whose proper fix belongs upstream.** Mitigation: re-open the relevant sub-project rather than patching inside SP5.
- **Budget overrun.** Mitigation: log overflow findings as new tickets; release proceeds on agreed remaining risks.

## Acceptance criteria

- Smoke checklist exists in the repo and every item passes on the release candidate.
- Risks doc exists in the repo and is reviewed.
- All unit + integration tests across SP1–4 pass on the release candidate.
- Critical findings from smoke are either fixed within budget or explicitly recorded as accepted residual risks.
- No regression in login, profile, tasks, reports, evidence, notifications, audit export, OCR, regulation deep-links, language switch, or advisor delegated access.
