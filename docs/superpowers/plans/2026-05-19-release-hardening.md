# Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land SCRUM-78 by executing a scripted regression pass over the post-SP1–4 surface area, committing a smoke checklist and a risks document, fixing critical findings within a capped budget, and confirming the release candidate is ship-ready.

**Architecture:** No new product behavior. Two committed Markdown artifacts (smoke checklist + risks) live under `docs/superpowers/specs/`. The smoke checklist drives a manual pass against the mobile app; results are recorded in-place. Test infrastructure already exists from SP1–4; this plan only consumes it. Optional Detox/Maestro automation is gated behind an explicit detection step and is expected to be skipped, because no harness is currently configured.

**Tech Stack:** Markdown documentation, Expo / React Native (under `mobile-app/`), Jest + React Native Testing Library (already wired from SP1–4), Expo Go on physical iOS/Android for manual smoke.

---

## File Structure

- Create: `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md` — full smoke checklist with steps, expected UI outcomes, and expected audit events for every flow listed in the spec.
- Create: `docs/superpowers/specs/2026-05-19-release-hardening-risks.md` — accepted residual risks and a Findings section populated during the smoke pass.
- Modify (record results only): both files above, in place, during the smoke pass.
- No `mobile-app/` source files are modified unless a critical-fix task (Task 17 and onward) is opened during the pass.

---

## Task 1: Create the smoke checklist document

**Files:**
- Create: `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Write the smoke checklist file with full content**

Write the following exact content to `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`:

````markdown
# Release Hardening — Smoke Checklist

Date: 2026-05-19
Sub-project: SP5 (SCRUM-78)
Scope: Manual regression pass against the release candidate built from main after SP1–SP4 merged.

## How to use this document

1. Install the release candidate build of `mobile-app/` on a clean device (no prior app data). Use Expo Go for development, or the EAS preview build if one exists.
2. For each flow below, perform the listed steps in order.
3. Mark the **Result** field as `PASS` or `FAIL`. On `FAIL`, write a one-line summary and open a finding entry in `2026-05-19-release-hardening-risks.md` under "Findings".
4. After each flow, open the in-app Audit Log screen and confirm the listed audit events were recorded with the current timestamp and current user id.
5. Do not skip steps. If a step is blocked (e.g., feature gated behind permission), record `BLOCKED` and note why.

Legend: Result = `PASS` / `FAIL` / `BLOCKED`.

---

## Flow 1: Login

### 1.1 Valid credentials
Steps:
1. Launch the app on a clean install.
2. On the login screen, enter a known-valid email and password.
3. Tap **Sign in**.

Expected UI: Login screen dismisses; tab navigator appears with the Tasks tab selected; user display name appears in the Profile tab.
Expected audit events: `auth.login.success` with the user id.
Result: ____

### 1.2 Invalid credentials
Steps:
1. From a logged-out state, enter a valid email and a deliberately wrong password.
2. Tap **Sign in**.

Expected UI: Stays on login screen; inline error "Invalid credentials" appears under the password field; password field is cleared; **Sign in** button re-enables.
Expected audit events: `auth.login.failure` with the attempted email (not the password).
Result: ____

### 1.3 Session restore after restart
Steps:
1. Complete Flow 1.1 (logged in).
2. Force-quit the app from the OS task switcher.
3. Relaunch the app.

Expected UI: Skips the login screen and lands directly on the Tasks tab; the same user is still shown in Profile.
Expected audit events: `auth.session.restore` with the user id.
Result: ____

---

## Flow 2: Profile

### 2.1 Create profile
Steps:
1. From a freshly-logged-in account with no profile, open the Profile tab.
2. Tap **Create profile**.
3. Fill required fields (display name, role, organisation).
4. Tap **Save**.

Expected UI: Form dismisses; profile view shows the entered values; a "Profile saved" toast appears.
Expected audit events: `profile.created` with the new profile id.
Result: ____

### 2.2 Edit profile
Steps:
1. From the Profile tab on an existing profile, tap **Edit**.
2. Change the display name.
3. Tap **Save**.

Expected UI: Returns to the profile view with the updated display name; toast "Profile updated".
Expected audit events: `profile.updated` with the changed field name in the payload.
Result: ____

### 2.3 Validation errors
Steps:
1. From **Edit**, clear the display name field.
2. Tap **Save**.

Expected UI: Stays on the edit form; inline error "Display name is required" appears under the field; **Save** is disabled until a value is entered.
Expected audit events: none (validation failures are not audit-worthy).
Result: ____

### 2.4 Sync queue (offline edit)
Steps:
1. Put the device into Airplane mode.
2. Edit the profile display name and tap **Save**.
3. Observe the Sync status indicator.

Expected UI: Save succeeds locally; a "1 pending change" badge appears on the Sync indicator.
Expected audit events: `profile.updated` recorded locally with a `queued: true` flag.
Result: ____

### 2.5 Conflict path
Steps:
1. Continuing from 2.4, re-enable network.
2. Trigger sync (pull-to-refresh on the Profile tab).
3. The simulated `SyncClient` reports a conflict for the profile record.

Expected UI: A conflict banner appears: "Profile changed elsewhere — review". Tapping it opens a side-by-side resolver. Choosing "Keep mine" dismisses the banner; the badge clears.
Expected audit events: `sync.conflict.detected` then `sync.conflict.resolved` with `resolution: local`.
Result: ____

---

## Flow 3: Tasks

### 3.1 Externalized rule set renders
Steps:
1. Open the Tasks tab.
2. Observe the list grouping.

Expected UI: Tasks are grouped by category according to the externalized rules data file shipped in SP1; each group header matches a category id present in that file; no hardcoded category labels appear.
Expected audit events: `tasks.list.viewed`.
Result: ____

### 3.2 Notification deep-link
Steps:
1. Trigger a local test notification for a known task (use the in-app **Send test reminder** developer action, or wait for a scheduled reminder).
2. Tap the notification from the OS notification tray.

Expected UI: App launches (or foregrounds) and lands directly on the detail screen for the task referenced by the notification payload; the task title in the header matches.
Expected audit events: `notification.opened` with the task id; `tasks.detail.viewed` for the same task id.
Result: ____

---

## Flow 4: Calendar

### 4.1 Due dates render
Steps:
1. Open the Calendar tab.
2. Navigate to the current month.

Expected UI: Each date cell with one or more due tasks shows a colored dot; tapping a dated cell expands the list of tasks due that day, ordered by time.
Expected audit events: `calendar.month.viewed` with the month/year.
Result: ____

### 4.2 Past-due grouping
Steps:
1. From the Calendar tab, scroll to the **Past due** section at the top.

Expected UI: A collapsible **Past due** section lists every task with a due date strictly before today, ordered oldest first; each row shows the days-overdue count.
Expected audit events: none beyond Flow 4.1.
Result: ____

---

## Flow 5: Reports

### 5.1 Draft → submit (happy path)
Steps:
1. Open the Reports tab and tap **New report**.
2. Fill the required fields; tap **Save draft**.
3. Re-open the draft and tap **Submit**.

Expected UI: Status badge transitions Draft → Submitted; a "Report submitted" toast appears; the report appears in the **Submitted** filter and not the **Draft** filter.
Expected audit events: `report.draft.created`, `report.draft.saved`, `report.submitted`, each with the report id.
Result: ____

### 5.2 Simulated submit conflict → resolve
Steps:
1. Repeat 5.1, but enable the developer toggle "Simulate submit conflict" before tapping **Submit**.
2. On the conflict screen, tap **Resolve → Keep mine**.

Expected UI: Submit fails initially with an inline banner "Report changed on server — review"; the resolver opens; after resolution, the report transitions to Submitted and the banner clears.
Expected audit events: `report.submit.conflict`, `report.submit.resolved` (with `resolution: local`), then `report.submitted`.
Result: ____

### 5.3 Submitted state visible
Steps:
1. After 5.1 or 5.2 completes, leave the Reports tab and return.

Expected UI: Submitted reports remain visible under the **Submitted** filter across navigation; opening one shows a read-only view with no **Submit** button.
Expected audit events: `report.viewed` with the report id.
Result: ____

---

## Flow 6: Evidence

### 6.1 Pick photo
Steps:
1. Open a draft report and tap **Add evidence → Photo**.
2. Pick an image from the device library.

Expected UI: A thumbnail appears in the report's evidence strip; tapping it opens a full-screen preview.
Expected audit events: `evidence.added` with `type: photo` and the evidence id.
Result: ____

### 6.2 Pick PDF
Steps:
1. From the same draft, tap **Add evidence → Document**.
2. Pick a PDF from the device document picker.

Expected UI: A document chip appears in the evidence strip with the filename; tapping opens a PDF preview.
Expected audit events: `evidence.added` with `type: pdf`.
Result: ____

### 6.3 Forced-failure retry
Steps:
1. Enable the developer toggle "Force next evidence upload to fail".
2. Add a new photo evidence.
3. When the upload fails, tap **Retry** on the failed evidence chip.

Expected UI: First attempt shows a red error icon and "Upload failed — Retry" link; tapping **Retry** turns the icon to a spinner, then to a success check.
Expected audit events: `evidence.upload.failed`, then `evidence.upload.retried`, then `evidence.upload.succeeded`, all with the same evidence id.
Result: ____

### 6.4 Evidence visible in report preview
Steps:
1. From the draft, tap **Preview**.

Expected UI: The preview screen lists every attached evidence item (photos as thumbnails, PDFs as chips) in attach order.
Expected audit events: `report.previewed`.
Result: ____

---

## Flow 7: Audit log

### 7.1 Filter by date range
Steps:
1. Open the Audit Log screen.
2. Set the date range to "Yesterday → Today".
3. Apply.

Expected UI: List re-renders to only events whose timestamp falls in the range; the empty state appears if nothing matches.
Expected audit events: `audit.filtered` with the from/to dates.
Result: ____

### 7.2 Export CSV
Steps:
1. From the Audit Log screen, tap **Export → CSV**.

Expected UI: OS share sheet opens; the file is named `audit-YYYY-MM-DD.csv`; sharing to Files saves a file whose first line is the CSV header row.
Expected audit events: `audit.export` with `format: csv` and the row count.
Result: ____

### 7.3 Export JSON
Steps:
1. From the Audit Log screen, tap **Export → JSON**.

Expected UI: OS share sheet opens; the file is named `audit-YYYY-MM-DD.json`; the file parses as a JSON array.
Expected audit events: `audit.export` with `format: json` and the row count.
Result: ____

---

## Flow 8: OCR

### 8.1 Low-confidence review and apply
Steps:
1. Open a draft report and tap **Add evidence → OCR scan**.
2. Pick a document image known to produce low confidence (the simulated OCR engine flags any image whose filename contains `low`).
3. On the review screen, observe the low-confidence badge on at least one field.
4. Tap **Apply**.

Expected UI: Review screen shows the extracted fields with a yellow "Low confidence" badge next to flagged fields; **Apply** writes the values back to the draft and dismisses the review screen; the draft form now contains those values.
Expected audit events: `ocr.run` with the document id, then `ocr.applied` with the list of applied field names.
Result: ____

---

## Flow 9: Regulation feed

### 9.1 Impacted-task chip deep-link
Steps:
1. Open the Regulation feed tab.
2. Find a feed item with an **Impacted task** chip.
3. Tap the chip.

Expected UI: Navigates to the Tasks tab and opens the referenced task's detail screen; the regulation item is marked read (its unread dot disappears) when the user returns to the feed.
Expected audit events: `regulation.opened` with the feed item id and the task id.
Result: ____

---

## Flow 10: Language switch

### 10.1 Switch to Lithuanian, restart
Steps:
1. Open Settings → Language.
2. Select **Lietuvių**.
3. Force-quit the app, relaunch.

Expected UI: All visible static strings (tab labels, screen titles, button labels) render in Lithuanian; after restart the language is still Lithuanian.
Expected audit events: `settings.language.changed` with `to: lt`.
Result: ____

### 10.2 Persistence across logout / login
Steps:
1. With Lithuanian selected, log out.
2. Log back in with the same account.

Expected UI: Login screen and subsequent screens remain in Lithuanian.
Expected audit events: `auth.logout`, then `auth.login.success`; language event does not re-fire.
Result: ____

---

## Flow 11: Advisor delegated access

### 11.1 Invite advisor
Steps:
1. As the primary user, open Settings → Advisors → **Invite advisor**.
2. Enter an advisor email and pick the scope **Reports — read only**.
3. Tap **Send invite**.

Expected UI: A pending invite row appears in the Advisors list with status "Pending"; a toast "Invite sent" appears.
Expected audit events: `advisor.invite.sent` with the advisor email and scope.
Result: ____

### 11.2 Scoped permission honored
Steps:
1. Accept the invite on a second device (or use the developer **Accept invite as test advisor** action).
2. Log in as the advisor.
3. Open the Reports tab on the primary user's data.
4. Attempt to tap **New report**.

Expected UI: Advisor sees the list of submitted reports read-only; the **New report** button is hidden; tapping any report opens it with all editing controls disabled.
Expected audit events: `advisor.access.granted` (one-time on accept), then `report.viewed` on each open. No `report.draft.created` event should appear.
Result: ____

### 11.3 Revoke
Steps:
1. As the primary user, open the advisor row and tap **Revoke**.
2. Confirm.

Expected UI: Row disappears from the active list and appears in the Revoked history with the current timestamp; the advisor's session on the second device shows "Access revoked" on next refresh.
Expected audit events: `advisor.access.revoked` with the advisor id and timestamp.
Result: ____

### 11.4 Advisor actions are audit-logged
Steps:
1. Open the Audit Log on the primary user.
2. Filter by actor type = `advisor`.

Expected UI: Every action performed by the advisor during the test (each `report.viewed`) appears with the advisor's id and email recorded as the actor.
Expected audit events: this step verifies prior events; no new event fires.
Result: ____

---

## Overall sign-off

- Tester: ____
- Build under test (git SHA): ____
- Device / OS: ____
- All flows result: ____  (PASS only if every numbered step is PASS or BLOCKED with written justification)
- Date completed: ____
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md
git commit -m "docs(sp5): add release hardening smoke checklist"
```

---

## Task 2: Create the risks document

**Files:**
- Create: `docs/superpowers/specs/2026-05-19-release-hardening-risks.md`

- [ ] **Step 1: Write the risks file with full content**

Write the following exact content to `docs/superpowers/specs/2026-05-19-release-hardening-risks.md`:

````markdown
# Release Hardening — Risks

Date: 2026-05-19
Sub-project: SP5 (SCRUM-78)
Owner: The V

This document captures known limitations of the release candidate built from main after SP1–SP4 merged, plus any new findings uncovered during the SP5 smoke pass.

## Accepted residual risks

### R1 — Expo Go iOS notification limitations
**What:** On iOS, Expo Go (SDK-managed runtime) does not support the full Notifications API. Background notification handlers, custom notification categories, and notification action buttons behave differently or are silently dropped.
**Impact:** Local reminders, deep-link notifications, and notification taps may not fire reliably when the app is built and run through Expo Go on iOS. On Android the behavior is closer to a dev build but not identical.
**Mitigation:** Full notification behavior is validated only on EAS dev/preview builds. The smoke checklist's Flow 3.2 must be performed on a dev build before release sign-off; on Expo Go iOS it is permitted to record `BLOCKED — Expo Go iOS limitation`.
**Status:** Accepted for the release; production build is an EAS preview build, not Expo Go.

### R2 — OCR engine is simulated
**What:** The OCR feature in this release is wired to a simulated engine that returns deterministic results based on input filename. There is no real ML model running on-device or in a backend service.
**Impact:** Field extraction quality, latency, and the confidence scores observed in Flow 8 are not representative of production behavior.
**Mitigation:** A real OCR engine (on-device Vision framework on iOS, ML Kit on Android, or a backend OCR service) must be wired before the OCR feature is enabled for end users. The simulation is feature-flagged so production builds can ship with OCR hidden until the real engine lands.
**Status:** Accepted; OCR will ship behind a flag, off by default, until production OCR is integrated.

### R3 — No real backend; sync is local-simulated
**What:** The `SyncClient` used in SP2 is a local in-memory simulator. There is no real server-side endpoint, no authoritative timestamp, and no real conflict source.
**Impact:** Conflict behavior (Flow 2.5, Flow 5.2) is reproducible only via developer toggles. Real network-induced failures, partial writes, and authoritative remote state are not exercised.
**Mitigation:** Before any production deployment a real `SyncClient` implementation against the production backend must replace the simulator, and the smoke checklist must be re-run against a staging environment with the real backend.
**Status:** Accepted for the internal release; production deployment is blocked on a real backend and a re-run of this smoke checklist.

## Findings (from the SP5 smoke pass)

Add an entry here for every `FAIL` recorded in the smoke checklist. One entry per finding. Use the template below.

### Finding template
```
ID: F-NN
Flow: <Flow N.M from smoke checklist>
Summary: <one-line description>
Severity: blocker | critical | major | minor
Decision: fix-in-sp5 | reopen-sp<1..4> | new-ticket | accepted-residual
Owner: <name>
Notes: <free text>
```

(No findings recorded yet. Append entries below as they are discovered.)
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "docs(sp5): add release hardening risks doc"
```

---

## Task 3: Run the full unit + integration suite

**Files:**
- Test: `mobile-app/` (all existing test files from SP1–SP4)

- [ ] **Step 1: Run the suite from a clean state**

```bash
cd /home/main/Desktop/pdp_app/mobile-app && npm test -- --watchAll=false
```

Expected: Every test from SP1–SP4 passes. Record the trailing summary line ("Tests: X passed, X total") in the Findings section of `2026-05-19-release-hardening-risks.md` as `F-00 (informational): unit+integration baseline = <summary line>`.

- [ ] **Step 2: If any test fails, log a finding and stop**

For each failure, add an entry under Findings with severity `blocker` and decision `reopen-sp<N>` where N is the sub-project that owns the failing file. Do not proceed to the manual smoke pass until the baseline is green.

- [ ] **Step 3: Commit the recorded baseline**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "docs(sp5): record SP1-4 unit+integration baseline"
```

---

## Task 4: Detect existing e2e harness

**Files:**
- Inspect: `mobile-app/package.json`, `mobile-app/`, repo root

- [ ] **Step 1: Check for Detox**

```bash
grep -E '"detox"' /home/main/Desktop/pdp_app/mobile-app/package.json || echo "no detox dependency"
ls /home/main/Desktop/pdp_app/mobile-app/e2e 2>/dev/null || echo "no e2e directory"
ls /home/main/Desktop/pdp_app/mobile-app/.detoxrc.js /home/main/Desktop/pdp_app/mobile-app/.detoxrc.json 2>/dev/null || echo "no detoxrc"
```

Expected: All three commands print their "no ..." fallback. If they do, Detox is not configured.

- [ ] **Step 2: Check for Maestro**

```bash
ls /home/main/Desktop/pdp_app/mobile-app/.maestro /home/main/Desktop/pdp_app/.maestro 2>/dev/null || echo "no maestro directory"
grep -ri "maestro" /home/main/Desktop/pdp_app/mobile-app/package.json 2>/dev/null || echo "no maestro dependency"
```

Expected: Both commands print their "no ..." fallback. If they do, Maestro is not configured.

- [ ] **Step 3: Record the result**

Append to `2026-05-19-release-hardening-risks.md` under Findings:

```
ID: F-01 (informational)
Flow: e2e harness detection
Summary: No Detox or Maestro harness configured in the repo.
Severity: minor
Decision: accepted-residual
Owner: The V
Notes: Per the spec, SP5 does not stand up a new e2e harness. Manual smoke + SP1-4 integration tests are the test surface for this release.
```

If either harness IS detected, instead record `harness-detected: <detox|maestro>` and proceed to the optional Task 16; otherwise Task 16 is skipped.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "docs(sp5): record e2e harness detection"
```

---

## Task 5: Smoke pass — Flow 1 (Login)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 1.1, 1.2, 1.3**

Perform Flows 1.1, 1.2, 1.3 in `2026-05-19-release-hardening-smoke.md`, in order, on the release candidate device.

- [ ] **Step 2: Record results**

Edit `2026-05-19-release-hardening-smoke.md` and fill the `Result: ____` line for each of 1.1, 1.2, 1.3 with `PASS`, `FAIL <one-line summary>`, or `BLOCKED <reason>`.

- [ ] **Step 3: Log any failures**

For every `FAIL`, append a finding to `2026-05-19-release-hardening-risks.md` using the template (Severity: blocker if the flow is broken end-to-end, critical if a sub-step is broken).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for login flow"
```

---

## Task 6: Smoke pass — Flow 2 (Profile)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 2.1, 2.2, 2.3, 2.4, 2.5**

Perform Flows 2.1 through 2.5 in `2026-05-19-release-hardening-smoke.md`, in order.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each of 2.1 through 2.5.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL` to `2026-05-19-release-hardening-risks.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for profile flow"
```

---

## Task 7: Smoke pass — Flow 3 (Tasks)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 3.1, 3.2**

Perform Flows 3.1 and 3.2.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`. If Flow 3.2 is `BLOCKED` because of Expo Go iOS (R1), record `BLOCKED — see R1 in risks doc`, not `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for tasks flow"
```

---

## Task 8: Smoke pass — Flow 4 (Calendar)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 4.1, 4.2**

Perform Flows 4.1 and 4.2.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for calendar flow"
```

---

## Task 9: Smoke pass — Flow 5 (Reports)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 5.1, 5.2, 5.3**

Perform Flows 5.1, 5.2, 5.3.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for reports flow"
```

---

## Task 10: Smoke pass — Flow 6 (Evidence)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 6.1, 6.2, 6.3, 6.4**

Perform Flows 6.1 through 6.4.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for evidence flow"
```

---

## Task 11: Smoke pass — Flow 7 (Audit log)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 7.1, 7.2, 7.3**

Perform Flows 7.1, 7.2, 7.3.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for audit log flow"
```

---

## Task 12: Smoke pass — Flow 8 (OCR)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 8.1**

Perform Flow 8.1. Use an input file named `evidence-low.png` (or similar containing `low`) so the simulated OCR engine returns low-confidence fields per R2.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for 8.1.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`. Do not log "OCR not real" as a finding — that is already captured as R2.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for OCR flow"
```

---

## Task 13: Smoke pass — Flow 9 (Regulation feed)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 9.1**

Perform Flow 9.1.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for 9.1.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for regulation feed flow"
```

---

## Task 14: Smoke pass — Flow 10 (Language switch)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 10.1, 10.2**

Perform Flows 10.1 and 10.2.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for language switch flow"
```

---

## Task 15: Smoke pass — Flow 11 (Advisor delegated access)

**Files:**
- Modify (record in place): `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Run 11.1, 11.2, 11.3, 11.4**

Perform Flows 11.1 through 11.4.

- [ ] **Step 2: Record results**

Fill the `Result: ____` line for each.

- [ ] **Step 3: Log any failures**

Append a finding entry per `FAIL`. A scope violation (advisor able to mutate) is severity `blocker`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): smoke pass results for advisor delegated access flow"
```

---

## Task 16: (Optional, gated) Convert reliable smokes to automated e2e

**Files:**
- Conditional: only execute if Task 4 recorded `harness-detected: <detox|maestro>`.

- [ ] **Step 1: Verify the gate**

Open `2026-05-19-release-hardening-risks.md`. If F-01 says "No Detox or Maestro harness configured", **skip this entire task** and proceed to Task 17. Do not stand up a new harness.

- [ ] **Step 2: Pick the four candidate flows**

The four candidate flows for automation are: Flow 1.1 (login happy path), Flow 2.2 (profile edit save), Flow 5.1 (report draft → submit), Flow 10.1 + 10.2 (language switch persistence).

- [ ] **Step 3: Add one Detox or Maestro test per candidate flow**

For each candidate, add a new test file under the existing harness's conventional directory (Detox: `mobile-app/e2e/<flow>.e2e.ts`; Maestro: `mobile-app/.maestro/<flow>.yaml`). Mirror the manual steps and assert on the same UI cues as the smoke item.

- [ ] **Step 4: Run the new e2e tests**

Run them via the harness's standard command (`npx detox test` or `maestro test .maestro/`). Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/e2e mobile-app/.maestro 2>/dev/null; git commit -m "test(sp5): automate four reliable smoke flows"
```

---

## Critical-fix budget (Tasks 17–22)

These six tasks are pre-allocated, empty slots. They are filled only if the smoke pass surfaces a critical finding whose fix belongs in SP5 (Decision: `fix-in-sp5`). Findings with Decision `reopen-sp<N>` do **not** consume a slot — they go back to the owning sub-project. Findings with Decision `new-ticket` or `accepted-residual` do **not** consume a slot.

**Hard cap: six.** If a seventh critical finding appears, it is logged as a new ticket and recorded as an accepted residual risk for this release. Do not add Task 23.

Each fix task follows this template; instantiate it inline with concrete content drawn from the finding when a slot is used.

### Task 17 template (instantiate when first `fix-in-sp5` finding arises)

**Files:**
- Modify: `<exact path under mobile-app/ identified by the finding>`
- Test: `<exact existing or new test file under mobile-app/ that pins the fix>`

- [ ] **Step 1: Write a failing test that reproduces the finding**

Write a unit or integration test under `mobile-app/` that fails today because of the finding. Show the full test code (no "similar to" — full code).

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /home/main/Desktop/pdp_app/mobile-app && npm test -- --watchAll=false -t "<test name>"
```

Expected: FAIL with the error described in the finding.

- [ ] **Step 3: Implement the minimal fix**

Edit the file identified by the finding with the minimal change needed to make the test pass. Show the full edited region.

- [ ] **Step 4: Run the targeted test and the full suite**

```bash
cd /home/main/Desktop/pdp_app/mobile-app && npm test -- --watchAll=false -t "<test name>"
cd /home/main/Desktop/pdp_app/mobile-app && npm test -- --watchAll=false
```

Expected: targeted test PASS; full suite PASS.

- [ ] **Step 5: Re-run the smoke flow that surfaced the finding**

Re-run the specific numbered flow in `2026-05-19-release-hardening-smoke.md` and update its `Result:` line to `PASS (re-verified after F-NN fix)`.

- [ ] **Step 6: Update the finding's status**

In `2026-05-19-release-hardening-risks.md`, append to the finding's `Notes:` line: `Fixed in SP5 task 17, commit <sha>.`

- [ ] **Step 7: Commit**

```bash
git add mobile-app/ docs/superpowers/specs/2026-05-19-release-hardening-smoke.md docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "fix(sp5): <one-line summary from finding F-NN>"
```

### Task 18 — second fix slot
Same template as Task 17. Instantiate if a second `fix-in-sp5` finding arises.

### Task 19 — third fix slot
Same template as Task 17. Instantiate if a third `fix-in-sp5` finding arises.

### Task 20 — fourth fix slot
Same template as Task 17. Instantiate if a fourth `fix-in-sp5` finding arises.

### Task 21 — fifth fix slot
Same template as Task 17. Instantiate if a fifth `fix-in-sp5` finding arises.

### Task 22 — sixth fix slot
Same template as Task 17. Instantiate if a sixth `fix-in-sp5` finding arises. This is the last slot. A seventh finding does NOT get a Task 23 — it is recorded as a new ticket plus an accepted-residual entry.

---

## Task 23: Overflow handling

**Files:**
- Modify: `docs/superpowers/specs/2026-05-19-release-hardening-risks.md`

- [ ] **Step 1: List findings that did not get a fix slot**

For every finding whose Decision is `new-ticket` (either because Tasks 17–22 were already full, or because the finding's proper fix belongs in another sub-project that was not reopened), confirm a Jira ticket exists (create via `gh` / Jira UI / `python3 jira_query.py` reference; the plan does not script the creation).

- [ ] **Step 2: Record the ticket ids**

For each such finding, edit its Notes line to include `New ticket: SCRUM-<id>.`

- [ ] **Step 3: List findings explicitly accepted**

For every finding whose Decision is `accepted-residual`, add a one-line entry under "Accepted residual risks" with R-NN id, summary, and impact.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "docs(sp5): record overflow findings as tickets and accepted residuals"
```

---

## Task 24: Re-run the full unit + integration suite after any fixes

**Files:**
- Test: `mobile-app/` (all tests)

- [ ] **Step 1: Re-run the suite**

```bash
cd /home/main/Desktop/pdp_app/mobile-app && npm test -- --watchAll=false
```

Expected: all tests pass. If any test fails now that passed in Task 3, that is a regression introduced by the SP5 fix slots; revert the offending commit and re-open the corresponding fix task.

- [ ] **Step 2: Record the final baseline**

In `2026-05-19-release-hardening-risks.md`, append under Findings:

```
ID: F-99 (informational)
Flow: post-fix unit+integration baseline
Summary: <Tests: X passed, X total>
Severity: minor
Decision: accepted-residual
Owner: The V
Notes: Final baseline after SP5 fix budget consumed.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-risks.md
git commit -m "test(sp5): record final post-fix unit+integration baseline"
```

---

## Task 25: Final sign-off

**Files:**
- Modify: `docs/superpowers/specs/2026-05-19-release-hardening-smoke.md`

- [ ] **Step 1: Fill the sign-off block**

Fill in the "Overall sign-off" block at the bottom of `2026-05-19-release-hardening-smoke.md`:
- Tester name.
- Build under test git SHA (`git rev-parse HEAD`).
- Device / OS used.
- Overall result.
- Date.

- [ ] **Step 2: Confirm acceptance criteria**

Verify each of the spec's acceptance criteria is met:
- Smoke checklist exists and every item is `PASS` or `BLOCKED` with justification.
- Risks doc exists and is reviewed.
- All unit + integration tests pass (Task 24 result).
- Critical findings are either fixed (Tasks 17–22) or recorded as accepted residual / new ticket (Task 23).
- No regression in the eleven flows.

If any criterion is unmet, stop and resolve it before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-19-release-hardening-smoke.md
git commit -m "docs(sp5): SCRUM-78 release hardening sign-off"
```

---

## Self-review (run after writing this plan)

**1. Spec coverage** — every spec requirement maps to a task:
- Smoke checklist artifact with every listed flow → Task 1 (full content inline).
- Risks doc artifact with R1/R2/R3 + findings section → Task 2 (full content inline).
- Full unit + integration suite re-run → Task 3 (baseline) and Task 24 (post-fix).
- Manual smoke pass with per-flow pass/fail recording → Tasks 5–15, one per flow.
- Critical-fix budget capped at 6 → Tasks 17–22, with hard cap and overflow rule.
- Overflow as new tickets → Task 23.
- Optional automated e2e gated on detection → Task 4 (detect) + Task 16 (gated, optional).
- Acceptance criteria check → Task 25.
- "Reopen owning sub-project, do not patch in SP5" rule → enforced via the `reopen-sp<N>` decision value referenced in Tasks 5–15 finding logging and the Task 17 template guard ("findings with Decision `reopen-sp<N>` do not consume a slot").

**2. Placeholder scan** — searched the document for `TBD`, `TODO`, `fill in`, `implement later`, `similar to`, `appropriate error handling`, `add validation`, `handle edge cases`. Only "similar to" / "same template" wording in the fix-slot tasks (18–22) intentionally references Task 17, and the Task 17 template itself is shown in full so an engineer reading Task 18 out of order can copy from Task 17 directly. This is permitted because the referenced template appears in full within this same document; no external "see X" pointer.

**3. Type consistency** — finding ids (`F-NN`), risk ids (`R-NN`), decision values (`fix-in-sp5`, `reopen-sp<N>`, `new-ticket`, `accepted-residual`), severity values (`blocker`, `critical`, `major`, `minor`), and the smoke-result vocabulary (`PASS`, `FAIL`, `BLOCKED`) are used consistently across the smoke doc, risks doc, and every task that refers to them.
