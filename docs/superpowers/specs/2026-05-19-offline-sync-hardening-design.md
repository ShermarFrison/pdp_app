# Offline & Sync Hardening — Design

Date: 2026-05-19
Sub-project: SP1 of 5 (Sprints 5 & 6 delivery)
Owner: The V

## Tickets in scope

- **SCRUM-68** — Persist offline queue and reconnect sync state across app restarts.
- **SCRUM-69** — Add sync conflict resolution screen with field-by-field merge and audit trail.
- **SCRUM-77** — Replace mocked farm-profile sync with durable synced profile state and validation.
- **SCRUM-40** (audit-then-extend) — Resolve sync conflicts after offline mode. Already in review; treated as existing scaffolding to harden.

Out of scope for this sub-project: report-submit hardening (SP2), notifications/audit-export (SP3), OCR/i18n/personalization/regulation (SP4), release hardening (SP5).

## Context

The mobile prototype has no real backend. All persistence is local (`AsyncStorage` via `mobile-app/lib/storage.ts`), and remote sync is simulated. Prior sprints landed an MVP of queueing, conflict detection and resolution that currently lives inside `mobile-app/context/AppContext.tsx` (661 lines). The file has grown too large and mixes auth, profile, reports, audit, and sync responsibilities.

Sprint 5/6 productionization requires three things on top of the MVP:

1. The offline queue must survive app restarts and recover cleanly from interrupted in-flight items.
2. Conflict resolution must have a real, field-level UI plus an audit trail of the resolution decision.
3. Profile sync must validate input and use the same durable queue/conflict pipeline as reports.

## Approach

Extract a dedicated `lib/sync/` module behind a `SyncClient` interface, then harden behavior on top of it. AppContext shrinks to a thin consumer. The interface boundary keeps a future HTTP-backed sync client swap-in possible without touching consumers.

## Module layout

```
mobile-app/lib/sync/
  types.ts            // SyncQueueItem, SyncConflict, SyncResult, EntityKind, SyncStatus
  syncClient.ts       // interface SyncClient + LocalSimulatedSyncClient impl
  syncQueue.ts        // enqueue, drain, persist; reconnect/retry policy
  conflicts.ts        // field-level detect + merge helpers
  index.ts            // public surface
mobile-app/lib/validation/
  farmProfile.ts      // validateFarmProfile
```

### `SyncClient` interface

```
interface SyncClient {
  pushReport(item: SyncQueueItem): Promise<SyncResult>;
  pushProfile(item: SyncQueueItem): Promise<SyncResult>;
  fetchRemote(kind: EntityKind, id: string): Promise<RemoteSnapshot | null>;
}
```

`SyncResult` is one of: `{ kind: "ok", remoteVersion }`, `{ kind: "conflict", remote, base }`, `{ kind: "transient", reason }`.

`LocalSimulatedSyncClient` stores a "remote shadow" under a separate AsyncStorage key (`pdp-sync-remote-shadow`) and uses a seeded RNG so conflict/failure scenarios are reproducible for demo.

### `syncQueue`

- Owns its own persistence key (`pdp-sync-queue`), separate from the whole-AppState blob.
- API: `enqueue(item)`, `drain(client)`, `subscribe(listener)`, `getSnapshot()`.
- Item lifecycle: `pending → in-flight → (ok | conflict | error)`. On hydrate at app launch, any `in-flight` items are reset to `pending` (crash recovery).
- Retry policy: exponential backoff with jitter for `transient` results; permanent failure surfaces as `error` and is visible in the UI but never silently dropped.
- `drain` is triggered (a) on app foreground, (b) on demand from a "Sync now" UI affordance, (c) on every successful `enqueue`.

### `conflicts`

- `detectFieldConflicts(local, remote, base)` → array of `{ field, localValue, remoteValue, baseValue }`.
- `mergeWithResolutions(local, remote, resolutions)` → merged record; throws if any conflicting field lacks a resolution.

### Migration

On first launch after upgrade, a one-shot migration lifts `syncQueue` and `syncConflicts` out of the legacy `pdp-mobile-prototype-state` blob into the new `pdp-sync-queue` key. AppContext stops persisting those slices. Migration logged via existing audit pipeline (`sync.migration_v1`).

## Conflict resolution screen (SCRUM-69)

**Route:** modal `mobile-app/app/conflicts/[id].tsx`. Entry points: a top-level banner ("N conflicts to resolve") shown in tabs layout when `syncConflicts.length > 0`, and a row link from the Reports list and Profile screen for the affected entity.

**Layout per conflict:**

- Header: entity kind + id + detected-at timestamp.
- For each conflicting field, three columns: **Local** | **Remote** | **Resolved** (editable, pre-filled with local). Tapping a side cell copies it into Resolved.
- Non-conflicting fields collapsed by default: "N fields agree — expand".
- Footer: **Resolve** (disabled until every conflicting field has a resolved value) and **Cancel**.

**On Resolve:**

- `resolveConflict(id, resolutions)` writes the merged record locally, marks the queue item ok, clears the conflict, and appends a `sync.conflict_resolved` audit event with the per-field chosen-source map (`{ fieldName: "local" | "remote" | "edited" }`).

**Empty state:** "No conflicts to resolve" + a "Run sync" button (useful for demos).

## Durable profile sync + validation (SCRUM-77)

- `validateFarmProfile(profile)` enforces required fields, numeric ranges, and enum membership. Returns `{ ok: true } | { ok: false, errors: Record<field, message> }`.
- `saveProfile(profile)`:
  - Validate. Invalid → throw a typed error; caller surfaces field errors inline.
  - Persist locally with a bumped `localVersion` and `baseVersion` (last seen remote).
  - `syncQueue.enqueue({ kind: "profile", op: "upsert", payload, baseVersion })`.
- Profile state gains `syncStatus: "clean" | "pending" | "syncing" | "conflict" | "error"` shown as a subtle pill on the Profile screen.
- Conflicts route through the same conflict screen as reports (entity kind differentiates).

## AppContext changes

AppContext stops owning queue/conflict logic. It:

- Subscribes to `syncQueue.subscribe` and mirrors the snapshot into React state for rendering.
- Forwards `syncReports`, `syncProfile`, `resolveConflict` calls to `lib/sync`.
- Continues to own auth, audit log append, and non-sync report mutations.

Target: AppContext shrinks well below 661 lines; no single concern dominates.

## Test strategy

Unit, isolated:

- `syncQueue.test.ts` — enqueue/drain/persist/restart-recovery (in-flight → pending), backoff, listener notification.
- `syncClient.test.ts` — deterministic success/conflict/transient paths via seeded RNG.
- `conflicts.test.ts` — field-level detection symmetry; `mergeWithResolutions` rejects unresolved fields.
- `validation/farmProfile.test.ts` — table-driven valid/invalid cases.

Integration:

- One AppContext-level test for full flow: enqueue report → simulated conflict → open screen state → resolve → audit entry present.

Manual demo script (in spec follow-up notes, not the design):

- Steps to trigger a conflict (toggle a flag on the simulated client), open the screen, resolve, verify the audit log entry.

If the repo currently has no Jest configuration, adding Jest + `@testing-library/react-native` is part of this sub-project; otherwise reuse existing setup.

## Risks and mitigations

- **Refactor regresses In-Review flows.** Mitigation: write characterization tests against current `AppContext` behavior **before** moving code; extraction proceeds test-first.
- **Migration corruption** if a user is mid-sync during upgrade. Mitigation: migration is idempotent and gated on a `schemaVersion` key; on failure, fall back to legacy blob and surface an audit event for inspection.
- **AsyncStorage write contention** between the legacy blob and the new queue key. Mitigation: queue writes are serialized through a small in-module mutex; AppContext writes are unchanged.

## Acceptance criteria

- Offline queue persists across app restart; interrupted in-flight items recover to pending.
- App auto-drains queue on foreground and on demand; transient failures retry with backoff; permanent failures are visible in UI.
- Conflict resolution screen exists at `app/conflicts/[id].tsx`, supports field-level merge with Local/Remote/Resolved, and writes a per-field audit trail.
- Farm profile saves are validated; valid saves enqueue to the same pipeline; profile conflicts surface in the same screen.
- AppContext no longer owns sync queue / conflict state; `lib/sync` is the source of truth.
- All new unit + integration tests pass; no regression in existing flows.
