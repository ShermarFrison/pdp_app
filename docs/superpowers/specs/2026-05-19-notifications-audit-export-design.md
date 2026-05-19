# Notifications & Audit Export — Design

Date: 2026-05-19
Sub-project: SP3 of 5 (Sprints 5 & 6 delivery)
Owner: The V
Depends on: none strictly; coexists with SP1 and SP2 outputs.

## Tickets in scope

- **SCRUM-70** — Implement real deadline notifications with disable behavior and task deep-link.
- **SCRUM-72** — Export audit logs by date range in CSV/JSON and log the export action.
- **SCRUM-47** (audit-then-extend) — Existing `exportAuditLog` returns a string in memory; productionize to a real shareable file.

Out of scope: sync-related notifications (covered by SP1's UI affordances), OCR/i18n/personalization/regulation (SP4), release hardening (SP5).

## Context

`AppContext` already exposes reminder settings (`remindersEnabled`, `reminderDaysBefore`, `reminderOffsets`) and an `exportAuditLog(from, to, format)` function that returns a string and appends an `audit.export` event. The gaps are:

- No real scheduled notifications: settings exist but nothing is wired to `expo-notifications`.
- No date-range picker UI in the audit-log screen.
- No file output; `exportAuditLog` can't be saved or shared.
- No deep-link from a notification tap to the relevant task detail.

## Approach

Extract two small modules — `lib/notifications/` and `lib/audit/export/` — and have `AppContext` consume them. Settings remain in `AppContext`. New Expo deps: `expo-notifications`, `expo-sharing` (`expo-file-system` already added by SP2).

## Notifications module

```
mobile-app/lib/notifications/
  index.ts
  scheduler.ts
  handler.ts
```

### `scheduler`

- `scheduleForTask(task, offsets)` schedules one local notification per offset (e.g. `[7, 3, 1]` days before `task.dueDate`). Each notification payload carries `{ taskId }`. Offsets that resolve to the past are skipped.
- `cancelForTask(taskId)` cancels every scheduled notification whose payload references `taskId`. Called when a task is completed, deleted, or its due date changes.
- `rescheduleAll(tasks, settings)` is the single source of truth: cancels every scheduled notification and re-schedules across all tasks based on `settings.remindersEnabled` and `settings.reminderOffsets`. Idempotent.

`rescheduleAll` is invoked:

- On app launch after hydration.
- Whenever reminder settings change.
- Whenever a task's due date or status changes.

This guarantees "disable immediately" behavior: flipping `remindersEnabled` to `false` triggers a full cancel via `rescheduleAll`.

### `handler`

- Registers `Notifications.addNotificationResponseReceivedListener` at app root (`app/_layout.tsx`) exactly once.
- On notification tap, reads `taskId` from the payload and calls `router.push({ pathname: "/tasks/[id]", params: { id: taskId } })`. Tap on a notification while the app is cold-started routes to the task after hydration.

### Permissions

`scheduler.ensurePermission()` is called before any schedule call. On denial, settings UI shows an inline message explaining how to enable notifications in system settings; no crash.

## Audit export module

```
mobile-app/lib/audit/
  export.ts
  index.ts
```

### `export`

- `formatCsv(entries)` — header row `id,timestamp,type,actor,details`; each value escaped per RFC 4180 (quote fields containing `,` `"` `\n`; double-up internal quotes).
- `formatJson(entries)` — array of `{ id, timestamp, type, actor, details }`.
- `exportToFile(entries, format)`:
  - Writes to `${FileSystem.cacheDirectory}audit-<fromYYYYMMDD>-to-<toYYYYMMDD>.<ext>`.
  - Returns the file URI.
  - Streams large outputs (>1000 entries) by appending in chunks rather than building one giant string.
- `shareFile(uri)` calls `Sharing.shareAsync(uri)` after `Sharing.isAvailableAsync()`.

### AppContext rewire

- `exportAuditLog(from, to, format)`:
  - Filters `auditLogs` by date range.
  - Calls `exportToFile(filtered, format)` → URI.
  - Appends an `audit.export` event (already implemented).
  - Calls `shareFile(uri)` to present the system share sheet.
  - Returns the URI instead of the string.

## Audit-log screen UI

The existing audit-log screen gains:

- Two date inputs (from / to), defaulted to last 30 days.
- A CSV / JSON format toggle.
- An **Export** button that calls `exportAuditLog(from, to, format)`; success surfaces a toast/banner; failure surfaces inline.

## Test strategy

Unit:

- `notifications/scheduler.test.ts` — `scheduleForTask` schedules the expected number of triggers given offsets and due date; offsets resolving to the past are skipped; `cancelForTask` cancels exactly that task's triggers; `rescheduleAll` is idempotent across repeated invocations; `enabled=false` causes zero scheduled. (`expo-notifications` mocked.)
- `notifications/handler.test.ts` — tap response with `{ taskId }` calls `router.push` with `/tasks/[id]` and the matching id.
- `audit/export.test.ts` — CSV escaping for commas, quotes, newlines; JSON shape stable; `exportToFile` writes a file named `audit-<from>-to-<to>.<ext>` whose contents match the formatter output.

Integration:

- Enable reminders with offsets `[1, 3, 7]` for a task due in 3 days → 2 notifications scheduled (7-day offset is in the past). Disable → 0 scheduled.
- Trigger export over a 30-day window → file exists, audit event `audit.export` appended, share sheet invoked (mocked).

## Risks and mitigations

- **Expo Go notifications on iOS** are limited. Mitigation: the design degrades gracefully — scheduling no-ops on the affected platform and the settings screen shows a banner. Full behavior works on Android Expo Go and on dev builds; confirm at plan stage.
- **Notification permission denial** — handled inline in settings, never crashes.
- **Large audit exports** can blow heap if naive. Mitigation: chunked file appends in `exportToFile`.
- **Stale schedule after task mutation** — `rescheduleAll` is the only mutator; all callers route through it, so drift is impossible by construction.

## Acceptance criteria

- Local notifications are scheduled per task per configured offset; offsets in the past are skipped.
- Toggling `remindersEnabled` to false immediately cancels all scheduled notifications.
- Tapping a notification deep-links to the corresponding task detail screen, including from cold start.
- Audit-log screen exposes a date range and CSV/JSON format selection; **Export** writes a real file and presents the system share sheet.
- The export action itself is audit-logged via the existing `audit.export` event.
- All new unit + integration tests pass; existing reminders settings flow does not regress.
