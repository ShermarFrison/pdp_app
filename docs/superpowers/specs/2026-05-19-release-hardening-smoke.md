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
Result: BLOCKED — no device available; UI navigation/dismiss + toast must be observed on-device. No dedicated login integration test in repo.

### 1.2 Invalid credentials
Steps:
1. From a logged-out state, enter a valid email and a deliberately wrong password.
2. Tap **Sign in**.

Expected UI: Stays on login screen; inline error "Invalid credentials" appears under the password field; password field is cleared; **Sign in** button re-enables.
Expected audit events: `auth.login.failure` with the attempted email (not the password).
Result: BLOCKED — no device available; inline error rendering requires device. No dedicated login integration test in repo.

### 1.3 Session restore after restart
Steps:
1. Complete Flow 1.1 (logged in).
2. Force-quit the app from the OS task switcher.
3. Relaunch the app.

Expected UI: Skips the login screen and lands directly on the Tasks tab; the same user is still shown in Profile.
Expected audit events: `auth.session.restore` with the user id.
Result: BLOCKED — no device available; force-quit + relaunch requires device.

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
Result: BLOCKED — no device available; form dismiss + toast require device. AppContext.integration covers create-side state changes only.

### 2.2 Edit profile
Steps:
1. From the Profile tab on an existing profile, tap **Edit**.
2. Change the display name.
3. Tap **Save**.

Expected UI: Returns to the profile view with the updated display name; toast "Profile updated".
Expected audit events: `profile.updated` with the changed field name in the payload.
Result: BLOCKED — no device available; edit form UI requires device.

### 2.3 Validation errors
Steps:
1. From **Edit**, clear the display name field.
2. Tap **Save**.

Expected UI: Stays on the edit form; inline error "Display name is required" appears under the field; **Save** is disabled until a value is entered.
Expected audit events: none (validation failures are not audit-worthy).
Result: BLOCKED — no device available; inline validation rendering requires device.

### 2.4 Sync queue (offline edit)
Steps:
1. Put the device into Airplane mode.
2. Edit the profile display name and tap **Save**.
3. Observe the Sync status indicator.

Expected UI: Save succeeds locally; a "1 pending change" badge appears on the Sync indicator.
Expected audit events: `profile.updated` recorded locally with a `queued: true` flag.
Result: BLOCKED — no device available; airplane-mode toggle requires device. SP1 sync queue logic is exercised by AppContext.integration tests.

### 2.5 Conflict path
Steps:
1. Continuing from 2.4, re-enable network.
2. Trigger sync (pull-to-refresh on the Profile tab).
3. The simulated `SyncClient` reports a conflict for the profile record.

Expected UI: A conflict banner appears: "Profile changed elsewhere — review". Tapping it opens a side-by-side resolver. Choosing "Keep mine" dismisses the banner; the badge clears.
Expected audit events: `sync.conflict.detected` then `sync.conflict.resolved` with `resolution: local`.
Result: BLOCKED — no device available; conflict banner + resolver UI requires device. Conflict resolution logic covered by AppContext integration tests.

---

## Flow 3: Tasks

### 3.1 Externalized rule set renders
Steps:
1. Open the Tasks tab.
2. Observe the list grouping.

Expected UI: Tasks are grouped by category according to the externalized rules data file shipped in SP1; each group header matches a category id present in that file; no hardcoded category labels appear.
Expected audit events: `tasks.list.viewed`.
Result: BLOCKED — no device available; list grouping visual layout requires device.

### 3.2 Notification deep-link
Steps:
1. Trigger a local test notification for a known task (use the in-app **Send test reminder** developer action, or wait for a scheduled reminder).
2. Tap the notification from the OS notification tray.

Expected UI: App launches (or foregrounds) and lands directly on the detail screen for the task referenced by the notification payload; the task title in the header matches.
Expected audit events: `notification.opened` with the task id; `tasks.detail.viewed` for the same task id.
Result: BLOCKED — see R1 in risks doc (Expo Go iOS notification limitation) and no device available. Tap handler logic covered by __tests__/notifications/handler.test.ts.

---

## Flow 4: Calendar

### 4.1 Due dates render
Steps:
1. Open the Calendar tab.
2. Navigate to the current month.

Expected UI: Each date cell with one or more due tasks shows a colored dot; tapping a dated cell expands the list of tasks due that day, ordered by time.
Expected audit events: `calendar.month.viewed` with the month/year.
Result: BLOCKED — no device available; visual calendar grid requires device.

### 4.2 Past-due grouping
Steps:
1. From the Calendar tab, scroll to the **Past due** section at the top.

Expected UI: A collapsible **Past due** section lists every task with a due date strictly before today, ordered oldest first; each row shows the days-overdue count.
Expected audit events: none beyond Flow 4.1.
Result: BLOCKED — no device available; Past-due section UI requires device.

---

## Flow 5: Reports

### 5.1 Draft → submit (happy path)
Steps:
1. Open the Reports tab and tap **New report**.
2. Fill the required fields; tap **Save draft**.
3. Re-open the draft and tap **Submit**.

Expected UI: Status badge transitions Draft → Submitted; a "Report submitted" toast appears; the report appears in the **Submitted** filter and not the **Draft** filter.
Expected audit events: `report.draft.created`, `report.draft.saved`, `report.submitted`, each with the report id.
Result: BLOCKED — no device available; toast + filter UI require device. Underlying state transitions covered by __tests__/reports/submission.test.ts.

### 5.2 Simulated submit conflict → resolve
Steps:
1. Repeat 5.1, but enable the developer toggle "Simulate submit conflict" before tapping **Submit**.
2. On the conflict screen, tap **Resolve → Keep mine**.

Expected UI: Submit fails initially with an inline banner "Report changed on server — review"; the resolver opens; after resolution, the report transitions to Submitted and the banner clears.
Expected audit events: `report.submit.conflict`, `report.submit.resolved` (with `resolution: local`), then `report.submitted`.
Result: BLOCKED — no device available; banner + resolver UI require device. Conflict path covered by AppContext.integration tests.

### 5.3 Submitted state visible
Steps:
1. After 5.1 or 5.2 completes, leave the Reports tab and return.

Expected UI: Submitted reports remain visible under the **Submitted** filter across navigation; opening one shows a read-only view with no **Submit** button.
Expected audit events: `report.viewed` with the report id.
Result: BLOCKED — no device available; navigation persistence requires device.

---

## Flow 6: Evidence

### 6.1 Pick photo
Steps:
1. Open a draft report and tap **Add evidence → Photo**.
2. Pick an image from the device library.

Expected UI: A thumbnail appears in the report's evidence strip; tapping it opens a full-screen preview.
Expected audit events: `evidence.added` with `type: photo` and the evidence id.
Result: BLOCKED — no device available; image picker requires device. Picker/storage logic covered by __tests__/evidence/*.test.ts.

### 6.2 Pick PDF
Steps:
1. From the same draft, tap **Add evidence → Document**.
2. Pick a PDF from the device document picker.

Expected UI: A document chip appears in the evidence strip with the filename; tapping opens a PDF preview.
Expected audit events: `evidence.added` with `type: pdf`.
Result: BLOCKED — no device available; document picker requires device.

### 6.3 Forced-failure retry
Steps:
1. Enable the developer toggle "Force next evidence upload to fail".
2. Add a new photo evidence.
3. When the upload fails, tap **Retry** on the failed evidence chip.

Expected UI: First attempt shows a red error icon and "Upload failed — Retry" link; tapping **Retry** turns the icon to a spinner, then to a success check.
Expected audit events: `evidence.upload.failed`, then `evidence.upload.retried`, then `evidence.upload.succeeded`, all with the same evidence id.
Result: BLOCKED — no device available; UI retry affordance requires device. Retry logic covered by __tests__/integration/evidence-report-flow.test.tsx.

### 6.4 Evidence visible in report preview
Steps:
1. From the draft, tap **Preview**.

Expected UI: The preview screen lists every attached evidence item (photos as thumbnails, PDFs as chips) in attach order.
Expected audit events: `report.previewed`.
Result: BLOCKED — no device available; preview screen requires device.

---

## Flow 7: Audit log

### 7.1 Filter by date range
Steps:
1. Open the Audit Log screen.
2. Set the date range to "Yesterday → Today".
3. Apply.

Expected UI: List re-renders to only events whose timestamp falls in the range; the empty state appears if nothing matches.
Expected audit events: `audit.filtered` with the from/to dates.
Result: BLOCKED — no device available; date range picker UI requires device.

### 7.2 Export CSV
Steps:
1. From the Audit Log screen, tap **Export → CSV**.

Expected UI: OS share sheet opens; the file is named `audit-YYYY-MM-DD.csv`; sharing to Files saves a file whose first line is the CSV header row.
Expected audit events: `audit.export` with `format: csv` and the row count.
Result: BLOCKED — no device available; OS share sheet requires device. CSV formatter/export covered by __tests__/audit/export.test.ts and __tests__/integration/notifications-export.test.ts.

### 7.3 Export JSON
Steps:
1. From the Audit Log screen, tap **Export → JSON**.

Expected UI: OS share sheet opens; the file is named `audit-YYYY-MM-DD.json`; the file parses as a JSON array.
Expected audit events: `audit.export` with `format: json` and the row count.
Result: BLOCKED — no device available; OS share sheet requires device. JSON formatter/export covered by __tests__/audit/export.test.ts.

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
