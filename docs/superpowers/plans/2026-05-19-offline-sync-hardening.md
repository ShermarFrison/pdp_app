# Offline & Sync Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a durable, restart-safe offline sync module (`mobile-app/lib/sync/`) with field-level conflict resolution UI, validated profile sync, and shrink `AppContext` to a thin consumer.

**Architecture:** Introduce a `SyncClient` interface with a `LocalSimulatedSyncClient` implementation backed by a seeded RNG and a separate "remote shadow" AsyncStorage key. A `syncQueue` module owns its own AsyncStorage key (`pdp-sync-queue`), persists across restarts, recovers `in-flight` items to `pending` on hydrate, and drains with exponential-backoff + jitter on foreground / on demand / on enqueue. Field-level `conflicts` helpers feed a modal route `app/conflicts/[id].tsx`. `AppContext` subscribes to queue snapshots and forwards `submitReport`, `syncReports`, `syncProfile`, `resolveConflict`, `saveProfile` to `lib/sync`; profile sync goes through `validateFarmProfile`.

**Tech Stack:** TypeScript, React Native 0.81 / Expo SDK 54, expo-router 6, `@react-native-async-storage/async-storage` 2.2, Jest 29 + ts-jest + `@testing-library/react-native` (added in this plan), `jest-expo` preset.

---

## File Structure

Created:
- `mobile-app/lib/sync/types.ts` — `EntityKind`, `SyncStatus`, `SyncQueueItemStatus`, `SyncQueueItem`, `SyncConflict`, `SyncResult`, `RemoteSnapshot`, `ConflictResolutionSource`.
- `mobile-app/lib/sync/syncClient.ts` — `SyncClient` interface, `LocalSimulatedSyncClient` with seeded RNG + shadow store.
- `mobile-app/lib/sync/syncQueue.ts` — persistence, enqueue, drain, subscribe, getSnapshot, restart recovery, backoff/jitter, in-module write mutex.
- `mobile-app/lib/sync/conflicts.ts` — `detectFieldConflicts`, `mergeWithResolutions`.
- `mobile-app/lib/sync/index.ts` — public surface re-export.
- `mobile-app/lib/validation/farmProfile.ts` — `validateFarmProfile`.
- `mobile-app/app/conflicts/[id].tsx` — modal route screen.
- `mobile-app/lib/sync/__tests__/syncQueue.test.ts`
- `mobile-app/lib/sync/__tests__/syncClient.test.ts`
- `mobile-app/lib/sync/__tests__/conflicts.test.ts`
- `mobile-app/lib/validation/__tests__/farmProfile.test.ts`
- `mobile-app/context/__tests__/AppContext.integration.test.tsx`
- `mobile-app/jest.config.js`
- `mobile-app/jest.setup.ts`

Modified:
- `mobile-app/package.json` — Jest scripts, devDeps.
- `mobile-app/types.ts` — extend `SyncQueueItem`, `SyncConflict`, `FarmProfile`, `AuditEventType`, `AppState`.
- `mobile-app/context/AppContext.tsx` — remove queue/conflict ownership; consume `lib/sync`.
- `mobile-app/lib/storage.ts` — migration of legacy slices.
- `mobile-app/data/seed.ts` — drop queue/conflict slices from initial state, add profile syncStatus default.
- `mobile-app/app/(tabs)/_layout.tsx` (or equivalent tabs layout) — conflict banner.
- `mobile-app/app/(tabs)/profile.tsx` (or equivalent) — `syncStatus` pill + validation error rendering.
- `mobile-app/app/_layout.tsx` — register the `conflicts/[id]` modal route.

---

## Task 1: Add Jest + Testing Library setup

**Files:**
- Modify: `mobile-app/package.json`
- Create: `mobile-app/jest.config.js`
- Create: `mobile-app/jest.setup.ts`

- [ ] **Step 1: Add devDependencies and test script to `mobile-app/package.json`**

Insert into the `"scripts"` block:

```json
"test": "jest",
"test:watch": "jest --watch"
```

Insert into `"devDependencies"`:

```json
"@testing-library/react-native": "^12.7.2",
"@testing-library/jest-native": "^5.4.3",
"@types/jest": "^29.5.12",
"jest": "^29.7.0",
"jest-expo": "~54.0.0",
"react-test-renderer": "19.1.0"
```

Run: `cd mobile-app && npm install`

- [ ] **Step 2: Create `mobile-app/jest.config.js`**

```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?|expo-router|@react-native-async-storage)",
  ],
};
```

- [ ] **Step 3: Create `mobile-app/jest.setup.ts`**

```ts
import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
```

- [ ] **Step 4: Verify jest runs with an empty test directory**

Create a temporary smoke test at `mobile-app/__tests__/smoke.test.ts`:

```ts
test("jest runs", () => {
  expect(1 + 1).toBe(2);
});
```

Run: `cd mobile-app && npx jest __tests__/smoke.test.ts`
Expected: PASS.

Delete the smoke test after verifying.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/package.json mobile-app/package-lock.json mobile-app/jest.config.js mobile-app/jest.setup.ts
git commit -m "chore(mobile): add Jest + testing-library setup"
```

---

## Task 2: Define sync module types

**Files:**
- Create: `mobile-app/lib/sync/types.ts`

- [ ] **Step 1: Write `mobile-app/lib/sync/types.ts`**

```ts
import type { ComplianceReport, FarmProfile } from "@/types";

export type EntityKind = "report" | "profile";

export type SyncStatus = "clean" | "pending" | "syncing" | "conflict" | "error";

export type SyncQueueItemStatus = "pending" | "in-flight" | "ok" | "conflict" | "error";

export type SyncOp = "upsert" | "submit";

export type SyncQueueItem = {
  id: string;
  kind: EntityKind;
  op: SyncOp;
  entityId: string;
  payload: Partial<ComplianceReport> | Partial<FarmProfile>;
  baseVersion: number;
  status: SyncQueueItemStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type RemoteSnapshot = {
  kind: EntityKind;
  id: string;
  version: number;
  data: Record<string, unknown>;
};

export type SyncResult =
  | { kind: "ok"; remoteVersion: number }
  | { kind: "conflict"; remote: RemoteSnapshot; base: RemoteSnapshot }
  | { kind: "transient"; reason: string }
  | { kind: "permanent"; reason: string };

export type ConflictFieldRecord = {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue: unknown;
  resolvedValue?: unknown;
  source?: ConflictResolutionSource;
};

export type ConflictResolutionSource = "local" | "remote" | "edited";

export type SyncConflict = {
  id: string;
  kind: EntityKind;
  entityId: string;
  queueItemId: string;
  fields: ConflictFieldRecord[];
  detectedAt: string;
  resolvedAt?: string;
};
```

- [ ] **Step 2: Verify it compiles**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: no errors related to `lib/sync/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/types.ts
git commit -m "feat(sync): add sync module type definitions"
```

---

## Task 3: Conflict detection — failing test

**Files:**
- Create: `mobile-app/lib/sync/__tests__/conflicts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { detectFieldConflicts, mergeWithResolutions } from "@/lib/sync/conflicts";

describe("detectFieldConflicts", () => {
  it("returns only fields where both local and remote diverge from base", () => {
    const base = { a: 1, b: 2, c: 3 };
    const local = { a: 1, b: 20, c: 30 };
    const remote = { a: 1, b: 200, c: 30 };

    const conflicts = detectFieldConflicts(local, remote, base);

    expect(conflicts).toEqual([
      { field: "b", localValue: 20, remoteValue: 200, baseValue: 2 },
    ]);
  });

  it("is symmetric: swapping local/remote yields swapped values, same fields", () => {
    const base = { x: "b" };
    const local = { x: "l" };
    const remote = { x: "r" };

    const a = detectFieldConflicts(local, remote, base);
    const b = detectFieldConflicts(remote, local, base);

    expect(a.map((c) => c.field)).toEqual(b.map((c) => c.field));
    expect(b[0].localValue).toBe("r");
    expect(b[0].remoteValue).toBe("l");
  });

  it("returns empty when local matches remote even if both differ from base", () => {
    expect(
      detectFieldConflicts({ a: "x" }, { a: "x" }, { a: "y" }),
    ).toEqual([]);
  });
});

describe("mergeWithResolutions", () => {
  it("applies resolutions and keeps non-conflicting fields", () => {
    const local = { a: 1, b: 20 };
    const remote = { a: 1, b: 200 };
    const merged = mergeWithResolutions(local, remote, [
      { field: "b", localValue: 20, remoteValue: 200, baseValue: 2, resolvedValue: 99, source: "edited" },
    ]);
    expect(merged).toEqual({ a: 1, b: 99 });
  });

  it("throws when a conflicting field is missing a resolution", () => {
    expect(() =>
      mergeWithResolutions(
        { a: 1 },
        { a: 2 },
        [{ field: "a", localValue: 1, remoteValue: 2, baseValue: 0 }],
      ),
    ).toThrow(/unresolved/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/conflicts.test.ts`
Expected: FAIL — module not found.

---

## Task 4: Conflict detection — minimal implementation

**Files:**
- Create: `mobile-app/lib/sync/conflicts.ts`

- [ ] **Step 1: Write `mobile-app/lib/sync/conflicts.ts`**

```ts
import type { ConflictFieldRecord } from "@/lib/sync/types";

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function detectFieldConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  base: Record<string, unknown>,
): ConflictFieldRecord[] {
  const keys = new Set<string>([
    ...Object.keys(local),
    ...Object.keys(remote),
    ...Object.keys(base),
  ]);
  const out: ConflictFieldRecord[] = [];
  for (const field of keys) {
    const l = local[field];
    const r = remote[field];
    const b = base[field];
    if (eq(l, r)) continue;
    if (eq(l, b)) continue;
    if (eq(r, b)) continue;
    out.push({ field, localValue: l, remoteValue: r, baseValue: b });
  }
  return out.sort((x, y) => x.field.localeCompare(y.field));
}

export function mergeWithResolutions<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  conflicts: ConflictFieldRecord[],
): T {
  const merged: Record<string, unknown> = { ...remote, ...local };
  for (const c of conflicts) {
    if (!("resolvedValue" in c)) {
      throw new Error(`unresolved conflict on field "${c.field}"`);
    }
    merged[c.field] = c.resolvedValue;
  }
  return merged as T;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/sync/__tests__/conflicts.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/conflicts.ts mobile-app/lib/sync/__tests__/conflicts.test.ts
git commit -m "feat(sync): field-level conflict detection and merge"
```

---

## Task 5: SyncClient — interface + deterministic RNG (failing test)

**Files:**
- Create: `mobile-app/lib/sync/__tests__/syncClient.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalSimulatedSyncClient } from "@/lib/sync/syncClient";
import type { SyncQueueItem } from "@/lib/sync/types";

const SHADOW_KEY = "pdp-sync-remote-shadow";

function item(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: "q1",
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1", fieldSummary: "local summary" },
    baseVersion: 0,
    status: "pending",
    attempts: 0,
    nextAttemptAt: 0,
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("pushReport with empty shadow returns ok and writes a remote version", async () => {
  const client = new LocalSimulatedSyncClient({ seed: 1, conflictRate: 0, transientRate: 0 });
  const res = await client.pushReport(item());
  expect(res.kind).toBe("ok");
  if (res.kind === "ok") expect(res.remoteVersion).toBe(1);

  const raw = await AsyncStorage.getItem(SHADOW_KEY);
  expect(raw).not.toBeNull();
});

test("pushReport returns conflict when forced via seeded RNG", async () => {
  const client = new LocalSimulatedSyncClient({ seed: 1, conflictRate: 1, transientRate: 0 });
  // Pre-seed a divergent remote so the conflict has something to surface.
  await AsyncStorage.setItem(
    SHADOW_KEY,
    JSON.stringify({
      report: {
        r1: { kind: "report", id: "r1", version: 5, data: { id: "r1", fieldSummary: "remote summary" } },
      },
      profile: {},
    }),
  );

  const res = await client.pushReport(item({ baseVersion: 0 }));
  expect(res.kind).toBe("conflict");
  if (res.kind === "conflict") {
    expect(res.remote.version).toBe(5);
    expect((res.remote.data as Record<string, unknown>).fieldSummary).toBe("remote summary");
  }
});

test("pushReport returns transient when forced via seeded RNG", async () => {
  const client = new LocalSimulatedSyncClient({ seed: 7, conflictRate: 0, transientRate: 1 });
  const res = await client.pushReport(item());
  expect(res.kind).toBe("transient");
});

test("seeded RNG is reproducible across two instances", async () => {
  const c1 = new LocalSimulatedSyncClient({ seed: 42, conflictRate: 0.5, transientRate: 0 });
  const c2 = new LocalSimulatedSyncClient({ seed: 42, conflictRate: 0.5, transientRate: 0 });
  await AsyncStorage.setItem(
    SHADOW_KEY,
    JSON.stringify({
      report: { r1: { kind: "report", id: "r1", version: 2, data: { id: "r1", fieldSummary: "x" } } },
      profile: {},
    }),
  );
  const r1 = await c1.pushReport(item());
  await AsyncStorage.setItem(
    SHADOW_KEY,
    JSON.stringify({
      report: { r1: { kind: "report", id: "r1", version: 2, data: { id: "r1", fieldSummary: "x" } } },
      profile: {},
    }),
  );
  const r2 = await c2.pushReport(item());
  expect(r1.kind).toBe(r2.kind);
});

test("fetchRemote returns null for unknown entity and the snapshot when present", async () => {
  const client = new LocalSimulatedSyncClient({ seed: 1, conflictRate: 0, transientRate: 0 });
  expect(await client.fetchRemote("report", "missing")).toBeNull();
  await AsyncStorage.setItem(
    SHADOW_KEY,
    JSON.stringify({
      report: { r1: { kind: "report", id: "r1", version: 3, data: { id: "r1" } } },
      profile: {},
    }),
  );
  const snap = await client.fetchRemote("report", "r1");
  expect(snap?.version).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncClient.test.ts`
Expected: FAIL — module not found.

---

## Task 6: SyncClient — implementation

**Files:**
- Create: `mobile-app/lib/sync/syncClient.ts`

- [ ] **Step 1: Write `mobile-app/lib/sync/syncClient.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  EntityKind,
  RemoteSnapshot,
  SyncClient as SyncClientInterface,
  SyncQueueItem,
  SyncResult,
} from "@/lib/sync/types";

export const REMOTE_SHADOW_KEY = "pdp-sync-remote-shadow";

export interface SyncClient extends SyncClientInterface {}

export interface SyncClientInterface {
  pushReport(item: SyncQueueItem): Promise<SyncResult>;
  pushProfile(item: SyncQueueItem): Promise<SyncResult>;
  fetchRemote(kind: EntityKind, id: string): Promise<RemoteSnapshot | null>;
}

type ShadowStore = {
  report: Record<string, RemoteSnapshot>;
  profile: Record<string, RemoteSnapshot>;
};

function emptyShadow(): ShadowStore {
  return { report: {}, profile: {} };
}

async function loadShadow(): Promise<ShadowStore> {
  const raw = await AsyncStorage.getItem(REMOTE_SHADOW_KEY);
  if (!raw) return emptyShadow();
  try {
    const parsed = JSON.parse(raw) as Partial<ShadowStore>;
    return {
      report: parsed.report ?? {},
      profile: parsed.profile ?? {},
    };
  } catch {
    return emptyShadow();
  }
}

async function saveShadow(store: ShadowStore): Promise<void> {
  await AsyncStorage.setItem(REMOTE_SHADOW_KEY, JSON.stringify(store));
}

// Mulberry32: deterministic, dependency-free 32-bit PRNG.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type LocalSimulatedSyncClientOptions = {
  seed: number;
  conflictRate: number;
  transientRate: number;
};

export class LocalSimulatedSyncClient implements SyncClientInterface {
  private rand: () => number;
  private conflictRate: number;
  private transientRate: number;

  constructor(opts: LocalSimulatedSyncClientOptions) {
    this.rand = mulberry32(opts.seed);
    this.conflictRate = opts.conflictRate;
    this.transientRate = opts.transientRate;
  }

  async pushReport(item: SyncQueueItem): Promise<SyncResult> {
    return this.push("report", item);
  }

  async pushProfile(item: SyncQueueItem): Promise<SyncResult> {
    return this.push("profile", item);
  }

  async fetchRemote(kind: EntityKind, id: string): Promise<RemoteSnapshot | null> {
    const store = await loadShadow();
    return store[kind][id] ?? null;
  }

  private async push(kind: EntityKind, item: SyncQueueItem): Promise<SyncResult> {
    const transientRoll = this.rand();
    if (transientRoll < this.transientRate) {
      return { kind: "transient", reason: "simulated transient failure" };
    }

    const store = await loadShadow();
    const existing = store[kind][item.entityId];
    const conflictRoll = this.rand();

    if (existing && conflictRoll < this.conflictRate) {
      const base: RemoteSnapshot = {
        kind,
        id: item.entityId,
        version: item.baseVersion,
        data: { ...(existing.data ?? {}) },
      };
      return { kind: "conflict", remote: existing, base };
    }

    const nextVersion = (existing?.version ?? 0) + 1;
    const merged: RemoteSnapshot = {
      kind,
      id: item.entityId,
      version: nextVersion,
      data: { ...(existing?.data ?? {}), ...(item.payload as Record<string, unknown>) },
    };
    store[kind][item.entityId] = merged;
    await saveShadow(store);
    return { kind: "ok", remoteVersion: nextVersion };
  }
}
```

- [ ] **Step 2: Fix the duplicate `SyncClient` declaration**

The skeleton above intentionally exports both `SyncClient` and `SyncClientInterface`. Adjust to a single canonical interface:

Replace the top of the file (lines starting `export const REMOTE_SHADOW_KEY` through `}`) so only `SyncClientInterface` is declared and `SyncClient` is a type alias:

```ts
export interface SyncClientInterface {
  pushReport(item: SyncQueueItem): Promise<SyncResult>;
  pushProfile(item: SyncQueueItem): Promise<SyncResult>;
  fetchRemote(kind: EntityKind, id: string): Promise<RemoteSnapshot | null>;
}

export type SyncClient = SyncClientInterface;
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncClient.test.ts`
Expected: PASS for all five tests.

- [ ] **Step 4: Commit**

```bash
git add mobile-app/lib/sync/syncClient.ts mobile-app/lib/sync/__tests__/syncClient.test.ts
git commit -m "feat(sync): LocalSimulatedSyncClient with seeded RNG and remote shadow"
```

---

## Task 7: syncQueue — persistence shape + getSnapshot (failing test)

**Files:**
- Create: `mobile-app/lib/sync/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSyncQueue, SYNC_QUEUE_KEY } from "@/lib/sync/syncQueue";

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("getSnapshot returns empty before hydrate", () => {
  const q = createSyncQueue({ now: () => 0, random: () => 0 });
  expect(q.getSnapshot()).toEqual({ items: [], conflicts: [] });
});

test("hydrate loads persisted items", async () => {
  await AsyncStorage.setItem(
    SYNC_QUEUE_KEY,
    JSON.stringify({
      items: [
        {
          id: "q1",
          kind: "report",
          op: "submit",
          entityId: "r1",
          payload: { id: "r1" },
          baseVersion: 0,
          status: "pending",
          attempts: 0,
          nextAttemptAt: 0,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
      conflicts: [],
    }),
  );

  const q = createSyncQueue({ now: () => 0, random: () => 0 });
  await q.hydrate();
  expect(q.getSnapshot().items).toHaveLength(1);
});

test("hydrate resets in-flight items to pending (crash recovery)", async () => {
  await AsyncStorage.setItem(
    SYNC_QUEUE_KEY,
    JSON.stringify({
      items: [
        {
          id: "q1",
          kind: "report",
          op: "submit",
          entityId: "r1",
          payload: { id: "r1" },
          baseVersion: 0,
          status: "in-flight",
          attempts: 1,
          nextAttemptAt: 0,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
      conflicts: [],
    }),
  );

  const q = createSyncQueue({ now: () => 0, random: () => 0 });
  await q.hydrate();
  expect(q.getSnapshot().items[0].status).toBe("pending");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts`
Expected: FAIL — module not found.

---

## Task 8: syncQueue — minimal hydrate + getSnapshot

**Files:**
- Create: `mobile-app/lib/sync/syncQueue.ts`

- [ ] **Step 1: Write `mobile-app/lib/sync/syncQueue.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  SyncClient,
  SyncConflict,
  SyncQueueItem,
} from "@/lib/sync/types";

export const SYNC_QUEUE_KEY = "pdp-sync-queue";

export type SyncQueueSnapshot = {
  items: SyncQueueItem[];
  conflicts: SyncConflict[];
};

export type SyncQueueListener = (snapshot: SyncQueueSnapshot) => void;

export type SyncQueueDeps = {
  now: () => number;
  random: () => number;
};

export type SyncQueue = {
  hydrate: () => Promise<void>;
  enqueue: (
    init: Omit<SyncQueueItem, "id" | "status" | "attempts" | "nextAttemptAt" | "createdAt" | "updatedAt">,
  ) => Promise<SyncQueueItem>;
  drain: (client: SyncClient) => Promise<{ ok: number; conflicts: number; transient: number; permanent: number }>;
  resolveConflict: (
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, "local" | "remote" | "edited">,
  ) => Promise<void>;
  subscribe: (listener: SyncQueueListener) => () => void;
  getSnapshot: () => SyncQueueSnapshot;
};

export function createSyncQueue(deps: SyncQueueDeps): SyncQueue {
  let state: SyncQueueSnapshot = { items: [], conflicts: [] };
  const listeners = new Set<SyncQueueListener>();
  let writing: Promise<void> = Promise.resolve();

  function notify() {
    for (const l of listeners) l(state);
  }

  async function persist(next: SyncQueueSnapshot): Promise<void> {
    const write = writing.then(async () => {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(next));
    });
    writing = write.catch(() => undefined);
    await write;
  }

  async function setState(next: SyncQueueSnapshot, opts: { persist: boolean } = { persist: true }) {
    state = next;
    if (opts.persist) await persist(next);
    notify();
  }

  async function hydrate(): Promise<void> {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) {
      await setState({ items: [], conflicts: [] }, { persist: false });
      return;
    }
    let parsed: SyncQueueSnapshot;
    try {
      parsed = JSON.parse(raw) as SyncQueueSnapshot;
    } catch {
      await setState({ items: [], conflicts: [] }, { persist: false });
      return;
    }
    const recovered: SyncQueueItem[] = (parsed.items ?? []).map((it) =>
      it.status === "in-flight" ? { ...it, status: "pending", updatedAt: new Date(deps.now()).toISOString() } : it,
    );
    await setState({ items: recovered, conflicts: parsed.conflicts ?? [] });
  }

  async function enqueue(): Promise<SyncQueueItem> {
    throw new Error("enqueue not implemented yet");
  }
  async function drain(): Promise<{ ok: number; conflicts: number; transient: number; permanent: number }> {
    throw new Error("drain not implemented yet");
  }
  async function resolveConflict(): Promise<void> {
    throw new Error("resolveConflict not implemented yet");
  }

  function subscribe(listener: SyncQueueListener) {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    hydrate,
    enqueue: enqueue as SyncQueue["enqueue"],
    drain: drain as SyncQueue["drain"],
    resolveConflict: resolveConflict as SyncQueue["resolveConflict"],
    subscribe,
    getSnapshot: () => state,
  };
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts`
Expected: PASS for the three hydrate/getSnapshot tests.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/syncQueue.ts mobile-app/lib/sync/__tests__/syncQueue.test.ts
git commit -m "feat(sync): syncQueue hydrate with in-flight recovery"
```

---

## Task 9: syncQueue — enqueue persists and notifies (failing test)

**Files:**
- Modify: `mobile-app/lib/sync/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Append the failing test**

```ts
test("enqueue persists a pending item, notifies listeners, and assigns an id", async () => {
  const q = createSyncQueue({ now: () => 1700000000000, random: () => 0.5 });
  await q.hydrate();
  const seen: number[] = [];
  q.subscribe((snap) => seen.push(snap.items.length));

  const item = await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1", fieldSummary: "x" },
    baseVersion: 0,
  });

  expect(item.id).toMatch(/.+/);
  expect(item.status).toBe("pending");
  expect(item.attempts).toBe(0);
  expect(q.getSnapshot().items).toHaveLength(1);

  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  expect(JSON.parse(raw!).items[0].entityId).toBe("r1");
  expect(seen).toContain(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts -t "enqueue persists"`
Expected: FAIL — `enqueue not implemented yet`.

---

## Task 10: syncQueue — enqueue implementation

**Files:**
- Modify: `mobile-app/lib/sync/syncQueue.ts`

- [ ] **Step 1: Replace `enqueue` stub**

Replace:

```ts
  async function enqueue(): Promise<SyncQueueItem> {
    throw new Error("enqueue not implemented yet");
  }
```

with:

```ts
  function genId(): string {
    const r = Math.floor(deps.random() * 1e9).toString(36);
    return `sq-${deps.now().toString(36)}-${r}`;
  }

  async function enqueue(
    init: Omit<SyncQueueItem, "id" | "status" | "attempts" | "nextAttemptAt" | "createdAt" | "updatedAt">,
  ): Promise<SyncQueueItem> {
    const ts = new Date(deps.now()).toISOString();
    const item: SyncQueueItem = {
      ...init,
      id: genId(),
      status: "pending",
      attempts: 0,
      nextAttemptAt: deps.now(),
      createdAt: ts,
      updatedAt: ts,
    };
    const next: SyncQueueSnapshot = {
      items: [...state.items, item],
      conflicts: state.conflicts,
    };
    await setState(next);
    return item;
  }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/syncQueue.ts mobile-app/lib/sync/__tests__/syncQueue.test.ts
git commit -m "feat(sync): enqueue persists pending item and notifies"
```

---

## Task 11: syncQueue — drain success path (failing test)

**Files:**
- Modify: `mobile-app/lib/sync/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Append the failing test**

```ts
import type { SyncClient, SyncResult } from "@/lib/sync/types";

function fakeClient(results: SyncResult[]): SyncClient {
  let i = 0;
  const next = () => results[Math.min(i++, results.length - 1)];
  return {
    pushReport: async () => next(),
    pushProfile: async () => next(),
    fetchRemote: async () => null,
  };
}

test("drain marks ok items as ok and removes them on next drain cycle", async () => {
  const q = createSyncQueue({ now: () => 1, random: () => 0 });
  await q.hydrate();
  await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1" },
    baseVersion: 0,
  });

  const result = await q.drain(fakeClient([{ kind: "ok", remoteVersion: 1 }]));
  expect(result.ok).toBe(1);
  expect(q.getSnapshot().items).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts -t "drain marks ok"`
Expected: FAIL — `drain not implemented yet`.

---

## Task 12: syncQueue — drain ok/transient/permanent/conflict + backoff

**Files:**
- Modify: `mobile-app/lib/sync/syncQueue.ts`

- [ ] **Step 1: Add conflict helpers import at top**

Replace the existing import block at the top of `syncQueue.ts` with:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { detectFieldConflicts } from "@/lib/sync/conflicts";
import type {
  ConflictResolutionSource,
  SyncClient,
  SyncConflict,
  SyncQueueItem,
  SyncResult,
} from "@/lib/sync/types";
```

- [ ] **Step 2: Add backoff helper above `createSyncQueue`**

```ts
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function backoffMs(attempts: number, jitter: number): number {
  const raw = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempts);
  return Math.floor(raw * (0.5 + jitter * 0.5));
}
```

- [ ] **Step 3: Replace the `drain` stub**

Replace:

```ts
  async function drain(): Promise<{ ok: number; conflicts: number; transient: number; permanent: number }> {
    throw new Error("drain not implemented yet");
  }
```

with:

```ts
  async function drain(client: SyncClient) {
    let ok = 0;
    let conflicts = 0;
    let transient = 0;
    let permanent = 0;

    const eligible = state.items
      .filter((it) => it.status === "pending" && it.nextAttemptAt <= deps.now())
      .map((it) => it.id);

    for (const id of eligible) {
      const current = state.items.find((it) => it.id === id);
      if (!current) continue;

      const inflight: SyncQueueItem = {
        ...current,
        status: "in-flight",
        attempts: current.attempts + 1,
        updatedAt: new Date(deps.now()).toISOString(),
      };
      await setState({
        items: state.items.map((it) => (it.id === id ? inflight : it)),
        conflicts: state.conflicts,
      });

      let result: SyncResult;
      try {
        result =
          current.kind === "report"
            ? await client.pushReport(inflight)
            : await client.pushProfile(inflight);
      } catch (err) {
        result = { kind: "transient", reason: err instanceof Error ? err.message : "unknown" };
      }

      if (result.kind === "ok") {
        ok += 1;
        await setState({
          items: state.items.filter((it) => it.id !== id),
          conflicts: state.conflicts,
        });
      } else if (result.kind === "transient") {
        transient += 1;
        const updated: SyncQueueItem = {
          ...inflight,
          status: "pending",
          nextAttemptAt: deps.now() + backoffMs(inflight.attempts, deps.random()),
          lastError: result.reason,
          updatedAt: new Date(deps.now()).toISOString(),
        };
        await setState({
          items: state.items.map((it) => (it.id === id ? updated : it)),
          conflicts: state.conflicts,
        });
      } else if (result.kind === "permanent") {
        permanent += 1;
        const updated: SyncQueueItem = {
          ...inflight,
          status: "error",
          lastError: result.reason,
          updatedAt: new Date(deps.now()).toISOString(),
        };
        await setState({
          items: state.items.map((it) => (it.id === id ? updated : it)),
          conflicts: state.conflicts,
        });
      } else {
        conflicts += 1;
        const local = inflight.payload as Record<string, unknown>;
        const remote = result.remote.data;
        const base = result.base.data;
        const fields = detectFieldConflicts(local, remote, base);
        const conflict: SyncConflict = {
          id: `conf-${inflight.id}`,
          kind: inflight.kind,
          entityId: inflight.entityId,
          queueItemId: inflight.id,
          fields,
          detectedAt: new Date(deps.now()).toISOString(),
        };
        const updated: SyncQueueItem = {
          ...inflight,
          status: "conflict",
          updatedAt: new Date(deps.now()).toISOString(),
        };
        await setState({
          items: state.items.map((it) => (it.id === id ? updated : it)),
          conflicts: [...state.conflicts.filter((c) => c.queueItemId !== inflight.id), conflict],
        });
      }
    }

    return { ok, conflicts, transient, permanent };
  }
```

- [ ] **Step 4: Run the ok test**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts -t "drain marks ok"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/sync/syncQueue.ts mobile-app/lib/sync/__tests__/syncQueue.test.ts
git commit -m "feat(sync): drain handles ok/transient/permanent/conflict with backoff"
```

---

## Task 13: syncQueue — backoff & permanent failure tests

**Files:**
- Modify: `mobile-app/lib/sync/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Append the failing tests**

```ts
test("transient failure schedules next attempt with exponential backoff and jitter", async () => {
  let t = 1000;
  const q = createSyncQueue({ now: () => t, random: () => 1 });
  await q.hydrate();
  await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1" },
    baseVersion: 0,
  });

  await q.drain(fakeClient([{ kind: "transient", reason: "boom" }]));
  const after1 = q.getSnapshot().items[0];
  expect(after1.status).toBe("pending");
  expect(after1.attempts).toBe(1);
  expect(after1.nextAttemptAt - 1000).toBeGreaterThanOrEqual(500);
  expect(after1.nextAttemptAt - 1000).toBeLessThanOrEqual(1000);

  // Advance time past the scheduled attempt
  t = after1.nextAttemptAt + 1;
  await q.drain(fakeClient([{ kind: "transient", reason: "boom" }]));
  const after2 = q.getSnapshot().items[0];
  expect(after2.attempts).toBe(2);
  expect(after2.nextAttemptAt - t).toBeGreaterThanOrEqual(1000);
});

test("permanent failure marks item as error and keeps it visible", async () => {
  const q = createSyncQueue({ now: () => 1, random: () => 0 });
  await q.hydrate();
  await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1" },
    baseVersion: 0,
  });

  await q.drain(fakeClient([{ kind: "permanent", reason: "rejected" }]));
  const item = q.getSnapshot().items[0];
  expect(item.status).toBe("error");
  expect(item.lastError).toBe("rejected");
});

test("conflict result records a SyncConflict and keeps item in conflict status", async () => {
  const q = createSyncQueue({ now: () => 1, random: () => 0 });
  await q.hydrate();
  await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1", fieldSummary: "local" },
    baseVersion: 0,
  });

  await q.drain(
    fakeClient([
      {
        kind: "conflict",
        remote: { kind: "report", id: "r1", version: 2, data: { fieldSummary: "remote" } },
        base: { kind: "report", id: "r1", version: 0, data: { fieldSummary: "orig" } },
      },
    ]),
  );

  const snap = q.getSnapshot();
  expect(snap.items[0].status).toBe("conflict");
  expect(snap.conflicts).toHaveLength(1);
  expect(snap.conflicts[0].fields[0].field).toBe("fieldSummary");
});
```

- [ ] **Step 2: Run tests**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts`
Expected: PASS for all queue tests so far.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/__tests__/syncQueue.test.ts
git commit -m "test(sync): cover backoff, permanent, and conflict drain paths"
```

---

## Task 14: syncQueue — resolveConflict (failing test)

**Files:**
- Modify: `mobile-app/lib/sync/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Append the failing test**

```ts
test("resolveConflict clears the conflict, removes the queue item, and records field sources", async () => {
  const q = createSyncQueue({ now: () => 1, random: () => 0 });
  await q.hydrate();
  await q.enqueue({
    kind: "report",
    op: "submit",
    entityId: "r1",
    payload: { id: "r1", fieldSummary: "local" },
    baseVersion: 0,
  });
  await q.drain(
    fakeClient([
      {
        kind: "conflict",
        remote: { kind: "report", id: "r1", version: 2, data: { fieldSummary: "remote" } },
        base: { kind: "report", id: "r1", version: 0, data: { fieldSummary: "orig" } },
      },
    ]),
  );

  const conflict = q.getSnapshot().conflicts[0];
  await q.resolveConflict(conflict.id, { id: "r1", fieldSummary: "merged" }, { fieldSummary: "edited" });

  const snap = q.getSnapshot();
  expect(snap.items).toHaveLength(0);
  expect(snap.conflicts[0].resolvedAt).toBeDefined();
  expect(snap.conflicts[0].fields[0].source).toBe("edited");
  expect(snap.conflicts[0].fields[0].resolvedValue).toBe("merged");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts -t "resolveConflict clears"`
Expected: FAIL — `resolveConflict not implemented yet`.

---

## Task 15: syncQueue — resolveConflict implementation

**Files:**
- Modify: `mobile-app/lib/sync/syncQueue.ts`

- [ ] **Step 1: Replace the `resolveConflict` stub**

Replace:

```ts
  async function resolveConflict(): Promise<void> {
    throw new Error("resolveConflict not implemented yet");
  }
```

with:

```ts
  async function resolveConflict(
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, ConflictResolutionSource>,
  ): Promise<void> {
    const conflict = state.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;
    const ts = new Date(deps.now()).toISOString();
    const resolvedFields = conflict.fields.map((f) => ({
      ...f,
      resolvedValue: merged[f.field],
      source: fieldSources[f.field] ?? "edited",
    }));
    await setState({
      items: state.items.filter((it) => it.id !== conflict.queueItemId),
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId ? { ...c, fields: resolvedFields, resolvedAt: ts } : c,
      ),
    });
  }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/sync/__tests__/syncQueue.test.ts`
Expected: PASS for all queue tests.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/syncQueue.ts mobile-app/lib/sync/__tests__/syncQueue.test.ts
git commit -m "feat(sync): resolveConflict applies merge and records field sources"
```

---

## Task 16: sync module public surface

**Files:**
- Create: `mobile-app/lib/sync/index.ts`

- [ ] **Step 1: Write `mobile-app/lib/sync/index.ts`**

```ts
export * from "@/lib/sync/types";
export { detectFieldConflicts, mergeWithResolutions } from "@/lib/sync/conflicts";
export {
  createSyncQueue,
  SYNC_QUEUE_KEY,
  type SyncQueue,
  type SyncQueueSnapshot,
  type SyncQueueListener,
} from "@/lib/sync/syncQueue";
export {
  LocalSimulatedSyncClient,
  REMOTE_SHADOW_KEY,
  type LocalSimulatedSyncClientOptions,
  type SyncClient,
  type SyncClientInterface,
} from "@/lib/sync/syncClient";
```

- [ ] **Step 2: Verify it compiles**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/lib/sync/index.ts
git commit -m "feat(sync): public surface re-export"
```

---

## Task 17: Farm profile validation — failing test

**Files:**
- Create: `mobile-app/lib/validation/__tests__/farmProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { validateFarmProfile } from "@/lib/validation/farmProfile";

const valid = {
  farmName: "Sunny",
  farmerName: "V",
  location: "Vilnius",
  hectares: "12.5",
  farmingType: "Arable" as const,
  livestockCount: "0",
};

test("accepts a fully populated profile", () => {
  expect(validateFarmProfile(valid)).toEqual({ ok: true });
});

test("rejects missing farm name", () => {
  const res = validateFarmProfile({ ...valid, farmName: "" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.farmName).toMatch(/required/i);
});

test("rejects non-numeric hectares", () => {
  const res = validateFarmProfile({ ...valid, hectares: "abc" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.hectares).toMatch(/number/i);
});

test("rejects out-of-range hectares", () => {
  const res = validateFarmProfile({ ...valid, hectares: "-1" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.hectares).toMatch(/range/i);
});

test("rejects invalid farming type", () => {
  const res = validateFarmProfile({ ...valid, farmingType: "" as any });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.farmingType).toMatch(/select/i);
});

test("rejects negative livestock count", () => {
  const res = validateFarmProfile({ ...valid, livestockCount: "-3" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.livestockCount).toMatch(/range/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/validation/__tests__/farmProfile.test.ts`
Expected: FAIL — module not found.

---

## Task 18: Farm profile validation — implementation

**Files:**
- Create: `mobile-app/lib/validation/farmProfile.ts`

- [ ] **Step 1: Write `mobile-app/lib/validation/farmProfile.ts`**

```ts
import type { FarmProfile } from "@/types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof FarmProfile, string>> };

const FARMING_TYPES = new Set(["Arable", "Dairy", "Mixed"]);

function isNonNegativeNumber(value: string, max: number): "ok" | "not-number" | "out-of-range" {
  if (value.trim() === "") return "not-number";
  const n = Number(value);
  if (!Number.isFinite(n)) return "not-number";
  if (n < 0 || n > max) return "out-of-range";
  return "ok";
}

export function validateFarmProfile(profile: FarmProfile): ValidationResult {
  const errors: Partial<Record<keyof FarmProfile, string>> = {};

  if (!profile.farmName.trim()) errors.farmName = "Farm name is required.";
  if (!profile.farmerName.trim()) errors.farmerName = "Farmer name is required.";
  if (!profile.location.trim()) errors.location = "Location is required.";

  const ha = isNonNegativeNumber(profile.hectares, 100000);
  if (ha === "not-number") errors.hectares = "Hectares must be a number.";
  else if (ha === "out-of-range") errors.hectares = "Hectares must be in range 0–100000.";

  if (!FARMING_TYPES.has(profile.farmingType)) {
    errors.farmingType = "Select a farming type.";
  }

  const lv = isNonNegativeNumber(profile.livestockCount, 1000000);
  if (lv === "not-number") errors.livestockCount = "Livestock count must be a number.";
  else if (lv === "out-of-range") errors.livestockCount = "Livestock count must be in range 0–1000000.";

  if (Object.keys(errors).length === 0) return { ok: true };
  return { ok: false, errors };
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/validation/__tests__/farmProfile.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```ts
git add mobile-app/lib/validation/farmProfile.ts mobile-app/lib/validation/__tests__/farmProfile.test.ts
git commit -m "feat(validation): farm profile validation"
```

---

## Task 19: Extend types for new sync model + profile syncStatus

**Files:**
- Modify: `mobile-app/types.ts`

- [ ] **Step 1: Update `FarmProfile` to add versioning and syncStatus**

Replace the existing `FarmProfile` type block:

```ts
export type FarmProfile = {
  farmName: string;
  farmerName: string;
  location: string;
  hectares: string;
  farmingType: "Arable" | "Dairy" | "Mixed" | "";
  livestockCount: string;
  lastSyncedAt?: string;
};
```

with:

```ts
export type ProfileSyncStatus = "clean" | "pending" | "syncing" | "conflict" | "error";

export type FarmProfile = {
  farmName: string;
  farmerName: string;
  location: string;
  hectares: string;
  farmingType: "Arable" | "Dairy" | "Mixed" | "";
  livestockCount: string;
  lastSyncedAt?: string;
  localVersion: number;
  baseVersion: number;
  syncStatus: ProfileSyncStatus;
};
```

- [ ] **Step 2: Replace legacy `SyncQueueItem` and `SyncConflict` types**

Remove the existing `SyncQueueItem`, `ConflictFieldKey`, `ConflictField`, `SyncConflict` blocks. Replace them with:

```ts
export type EntityKind = "report" | "profile";
export type SyncQueueItemStatus = "pending" | "in-flight" | "ok" | "conflict" | "error";
export type SyncOp = "upsert" | "submit";
export type ConflictResolutionSource = "local" | "remote" | "edited";

export type SyncQueueItem = {
  id: string;
  kind: EntityKind;
  op: SyncOp;
  entityId: string;
  payload: Partial<ComplianceReport> | Partial<FarmProfile>;
  baseVersion: number;
  status: SyncQueueItemStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConflictFieldRecord = {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue: unknown;
  resolvedValue?: unknown;
  source?: ConflictResolutionSource;
};

export type SyncConflict = {
  id: string;
  kind: EntityKind;
  entityId: string;
  queueItemId: string;
  fields: ConflictFieldRecord[];
  detectedAt: string;
  resolvedAt?: string;
};
```

- [ ] **Step 3: Extend `AuditEventType` union**

Find the existing `AuditEventType` union and add the new members. Replace the union with:

```ts
export type AuditEventType =
  | "login"
  | "logout"
  | "profile.save"
  | "profile.sync"
  | "report.duplicate"
  | "report.submit"
  | "report.create"
  | "report.draft_save"
  | "report.sync"
  | "evidence.upload"
  | "evidence.remove"
  | "ticket.submit"
  | "regulation.read"
  | "ocr.prefill"
  | "sync.conflict"
  | "sync.conflict_resolve"
  | "sync.conflict_resolved"
  | "sync.migration_v1"
  | "advisor.invite"
  | "advisor.revoke"
  | "audit.export";
```

- [ ] **Step 4: Update `lib/sync/types.ts` to re-export from `@/types` where overlap exists**

Replace contents of `mobile-app/lib/sync/types.ts` with:

```ts
import type { ComplianceReport, FarmProfile } from "@/types";

export type {
  EntityKind,
  SyncOp,
  SyncQueueItem,
  SyncQueueItemStatus,
  SyncConflict,
  ConflictFieldRecord,
  ConflictResolutionSource,
} from "@/types";

export type SyncStatus = "clean" | "pending" | "syncing" | "conflict" | "error";

export type RemoteSnapshot = {
  kind: "report" | "profile";
  id: string;
  version: number;
  data: Record<string, unknown>;
};

export type SyncResult =
  | { kind: "ok"; remoteVersion: number }
  | { kind: "conflict"; remote: RemoteSnapshot; base: RemoteSnapshot }
  | { kind: "transient"; reason: string }
  | { kind: "permanent"; reason: string };

// Marker re-exports to satisfy downstream consumers that may import these
// alongside the SyncClient interface.
export type ReportPayload = Partial<ComplianceReport>;
export type ProfilePayload = Partial<FarmProfile>;
```

- [ ] **Step 5: Run all unit tests**

Run: `cd mobile-app && npx jest lib/`
Expected: PASS (queue/client/conflicts/validation suites unchanged).

- [ ] **Step 6: Commit**

```bash
git add mobile-app/types.ts mobile-app/lib/sync/types.ts
git commit -m "refactor(types): unify sync types and add profile syncStatus"
```

---

## Task 20: Seed defaults — drop legacy slices, add new profile fields

**Files:**
- Read: `mobile-app/data/seed.ts`
- Modify: `mobile-app/data/seed.ts`

- [ ] **Step 1: Inspect file**

Run: `cd mobile-app && sed -n '1,200p' data/seed.ts`
Note exports: `INITIAL_STATE`, `EMPTY_PROFILE`, plus other constants used by `AppContext`.

- [ ] **Step 2: Update `EMPTY_PROFILE`**

Find the existing `EMPTY_PROFILE` object and replace it with:

```ts
export const EMPTY_PROFILE: FarmProfile = {
  farmName: "",
  farmerName: "",
  location: "",
  hectares: "",
  farmingType: "",
  livestockCount: "",
  localVersion: 0,
  baseVersion: 0,
  syncStatus: "clean",
};
```

- [ ] **Step 3: Remove queue/conflict slices from `INITIAL_STATE`**

In the `INITIAL_STATE` object, delete the `syncQueue: []` and `syncConflicts: []` lines. AppContext will stop reading them from this blob.

- [ ] **Step 4: Run tests**

Run: `cd mobile-app && npx jest && npx tsc --noEmit`
Expected: PASS; TS may flag `AppState` referencing removed fields — fix in Task 21.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/data/seed.ts
git commit -m "refactor(seed): drop legacy sync slices, init profile versions"
```

---

## Task 21: AppState shape + storage migration

**Files:**
- Modify: `mobile-app/types.ts`
- Modify: `mobile-app/lib/storage.ts`

- [ ] **Step 1: Remove queue/conflict slices from `AppState`**

In `mobile-app/types.ts`, find the `AppState` type and remove the `syncQueue` and `syncConflicts` lines. Keep all other slices.

- [ ] **Step 2: Rewrite `mobile-app/lib/storage.ts` with one-shot migration**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import { INITIAL_STATE } from "@/data/seed";
import { AppState } from "@/types";
import { SYNC_QUEUE_KEY } from "@/lib/sync/syncQueue";

const STORAGE_KEY = "pdp-mobile-prototype-state";
const SCHEMA_VERSION_KEY = "pdp-mobile-prototype-schema-version";
const CURRENT_SCHEMA_VERSION = 2;

type LegacyAppState = AppState & {
  syncQueue?: unknown[];
  syncConflicts?: unknown[];
};

export type MigrationOutcome =
  | { kind: "noop" }
  | { kind: "migrated"; movedQueueItems: number; movedConflicts: number }
  | { kind: "failed"; reason: string };

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return INITIAL_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as LegacyAppState;
    const { syncQueue: _q, syncConflicts: _c, ...rest } = parsed;
    return rest as AppState;
  } catch {
    return INITIAL_STATE;
  }
}

export async function saveState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function migrateLegacySyncSlices(): Promise<MigrationOutcome> {
  try {
    const versionRaw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    const version = versionRaw ? Number(versionRaw) : 0;
    if (version >= CURRENT_SCHEMA_VERSION) return { kind: "noop" };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      return { kind: "noop" };
    }

    const parsed = JSON.parse(raw) as LegacyAppState;
    const legacyQueue = Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [];
    const legacyConflicts = Array.isArray(parsed.syncConflicts) ? parsed.syncConflicts : [];

    if (legacyQueue.length === 0 && legacyConflicts.length === 0) {
      await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      return { kind: "noop" };
    }

    const items = legacyQueue.map((entry: any, idx: number) => ({
      id: entry.id ?? `mig-${idx}`,
      kind: "report" as const,
      op: entry.action === "report.submit" ? ("submit" as const) : ("upsert" as const),
      entityId: entry.payload?.reportId ?? "",
      payload: entry.payload ?? {},
      baseVersion: 0,
      status: "pending" as const,
      attempts: 0,
      nextAttemptAt: 0,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const conflicts = legacyConflicts.map((entry: any, idx: number) => ({
      id: entry.id ?? `mig-conf-${idx}`,
      kind: "report" as const,
      entityId: entry.reportId ?? "",
      queueItemId: "",
      fields: (entry.fields ?? []).map((f: any) => ({
        field: f.key,
        localValue: f.localValue,
        remoteValue: f.serverValue,
        baseValue: undefined,
      })),
      detectedAt: entry.detectedAt ?? new Date().toISOString(),
    }));

    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify({ items, conflicts }),
    );

    const { syncQueue: _q, syncConflicts: _c, ...rest } = parsed;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));

    return { kind: "migrated", movedQueueItems: items.length, movedConflicts: conflicts.length };
  } catch (err) {
    return { kind: "failed", reason: err instanceof Error ? err.message : "unknown" };
  }
}
```

- [ ] **Step 3: Add migration test**

Create `mobile-app/lib/__tests__/storage.migration.test.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { migrateLegacySyncSlices } from "@/lib/storage";
import { SYNC_QUEUE_KEY } from "@/lib/sync/syncQueue";

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("migrates legacy syncQueue and syncConflicts into the new key", async () => {
  await AsyncStorage.setItem(
    "pdp-mobile-prototype-state",
    JSON.stringify({
      syncQueue: [
        { id: "old", action: "report.submit", payload: { reportId: "r1" }, createdAt: "t" },
      ],
      syncConflicts: [
        { id: "c1", reportId: "r1", fields: [{ key: "notes", localValue: "L", serverValue: "R" }], detectedAt: "t" },
      ],
    }),
  );

  const out = await migrateLegacySyncSlices();
  expect(out.kind).toBe("migrated");

  const queueRaw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  const queue = JSON.parse(queueRaw!);
  expect(queue.items).toHaveLength(1);
  expect(queue.items[0].entityId).toBe("r1");
  expect(queue.conflicts[0].fields[0].field).toBe("notes");

  // legacy blob no longer contains the slices
  const legacyRaw = await AsyncStorage.getItem("pdp-mobile-prototype-state");
  const legacy = JSON.parse(legacyRaw!);
  expect(legacy.syncQueue).toBeUndefined();
  expect(legacy.syncConflicts).toBeUndefined();
});

test("is idempotent on a second call", async () => {
  await AsyncStorage.setItem(
    "pdp-mobile-prototype-state",
    JSON.stringify({ syncQueue: [], syncConflicts: [] }),
  );
  const first = await migrateLegacySyncSlices();
  const second = await migrateLegacySyncSlices();
  expect(first.kind).toBe("noop");
  expect(second.kind).toBe("noop");
});
```

- [ ] **Step 4: Run tests**

Run: `cd mobile-app && npx jest lib/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/storage.ts mobile-app/lib/__tests__/storage.migration.test.ts mobile-app/types.ts
git commit -m "refactor(storage): migrate sync slices out of legacy blob"
```

---

## Task 22: AppContext — characterization snapshot of existing behavior

**Files:**
- Create: `mobile-app/context/__tests__/AppContext.characterization.test.tsx`

- [ ] **Step 1: Write the characterization test**

```tsx
import React from "react";
import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { AppProvider, useApp } from "@/context/AppContext";

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useApp>) => void }) {
  const api = useApp();
  React.useEffect(() => {
    if (api.isHydrated) onReady(api);
  }, [api.isHydrated]);
  return <Text>{api.isHydrated ? "ready" : "wait"}</Text>;
}

test("submitReport offline path enqueues an item and surfaces it via context", async () => {
  let captured: ReturnType<typeof useApp> | null = null;
  render(
    <AppProvider>
      <Probe onReady={(a) => (captured = a)} />
    </AppProvider>,
  );

  await act(async () => {
    while (!captured) await new Promise((r) => setTimeout(r, 5));
  });

  const draft = await captured!.createNewReport();
  await act(async () => {
    captured!.setOnlineStatus(false);
  });
  const res = await captured!.submitReport(draft.id, {
    periodYear: "2026",
    inspectionDate: "2026-05-01",
    fieldSummary: "Field A boundary OK",
  });

  expect(res.ok).toBe(true);
  expect(captured!.syncQueue.length).toBeGreaterThan(0);
  expect(captured!.syncQueue[0].entityId).toBe(draft.id);
});
```

- [ ] **Step 2: Run the test**

Run: `cd mobile-app && npx jest context/__tests__/AppContext.characterization.test.tsx`
Expected: this may FAIL today because the existing `SyncQueueItem` has `payload.reportId` rather than `entityId`. That documents the regression risk before the refactor. Mark the test as the contract you intend to satisfy after the AppContext refactor in Task 23. Do not commit it red — instead, update the assertion to match either shape until Task 23:

Replace the last expect with:

```ts
const item = captured!.syncQueue[0] as any;
expect(item.entityId ?? item.payload?.reportId).toBe(draft.id);
```

Rerun: `cd mobile-app && npx jest context/__tests__/AppContext.characterization.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/context/__tests__/AppContext.characterization.test.tsx
git commit -m "test(context): characterization for offline submit enqueue"
```

---

## Task 23: AppContext — consume `lib/sync` (refactor)

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`

- [ ] **Step 1: Rewrite `mobile-app/context/AppContext.tsx`**

Replace the entire file with:

```tsx
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";

import {
  DEFAULT_LANGUAGE,
  DEFAULT_PASSWORD,
  DEFAULT_REMINDER_OFFSETS,
  DEFAULT_USER,
  EMPTY_PROFILE,
  INITIAL_REMINDER_DAYS,
  MAX_EVIDENCE_SIZE_BYTES,
  SEEDED_REGULATIONS,
  SEEDED_REPORTS,
} from "@/data/seed";
import { loadState, migrateLegacySyncSlices, saveState } from "@/lib/storage";
import {
  createSyncQueue,
  LocalSimulatedSyncClient,
  type SyncClient,
  type SyncQueueSnapshot,
} from "@/lib/sync";
import { validateFarmProfile } from "@/lib/validation/farmProfile";
import {
  Advisor,
  AdvisorPermission,
  AppLanguage,
  AppState,
  AuditEventType,
  ComplianceReport,
  ConflictResolutionSource,
  EvidenceAttachment,
  FarmProfile,
  HelpTicket,
  OcrExtraction,
  RegulationChange,
  SyncConflict,
  SyncQueueItem,
  User,
} from "@/types";

type LoginResult = { ok: boolean; error?: string };

export class ProfileValidationError extends Error {
  errors: Partial<Record<keyof FarmProfile, string>>;
  constructor(errors: Partial<Record<keyof FarmProfile, string>>) {
    super("Profile validation failed");
    this.errors = errors;
  }
}

type AppContextValue = {
  isHydrated: boolean;
  sessionUser: User | null;
  farmProfile: FarmProfile;
  reports: ComplianceReport[];
  auditLogs: AppState["auditLogs"];
  remindersEnabled: boolean;
  reminderDaysBefore: number;
  reminderOffsets: number[];
  evidenceAttachments: EvidenceAttachment[];
  regulationChanges: RegulationChange[];
  helpTickets: HelpTicket[];
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  ocrExtractions: OcrExtraction[];
  syncConflicts: SyncConflict[];
  advisors: Advisor[];
  language: AppLanguage;

  setReminders: (enabled: boolean, daysBefore: number) => void;
  setReminderOffsets: (offsets: number[]) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  saveProfile: (profile: FarmProfile) => Promise<void>;
  syncProfile: () => Promise<void>;
  duplicateReport: (reportId: string) => Promise<ComplianceReport | null>;
  submitReport: (reportId: string, updates: Partial<ComplianceReport>) => Promise<{ ok: boolean; error?: string }>;
  createNewReport: () => Promise<ComplianceReport>;
  saveDraftOffline: (reportId: string, updates: Partial<ComplianceReport>) => Promise<void>;
  syncReports: () => Promise<{ synced: number; failed: number; conflicts: number }>;
  setOnlineStatus: (online: boolean) => void;
  addEvidence: (taskId: string, uri: string, fileName: string, type: "photo" | "pdf", sizeBytes: number) => Promise<{ ok: boolean; error?: string }>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  getEvidenceForTask: (taskId: string) => EvidenceAttachment[];
  markRegulationRead: (regulationId: string) => Promise<void>;
  submitHelpTicket: (category: string, message: string, screenshotUri?: string) => Promise<HelpTicket>;
  applyOcrExtraction: (reportId: string, extraction: OcrExtraction) => Promise<void>;
  resolveConflict: (
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, ConflictResolutionSource>,
  ) => Promise<void>;
  inviteAdvisor: (email: string, permission: AdvisorPermission) => Promise<{ ok: boolean; error?: string }>;
  revokeAdvisor: (advisorId: string) => Promise<void>;
  setLanguage: (lang: AppLanguage) => void;
  exportAuditLog: (fromDate: string, toDate: string, format: "csv" | "json") => Promise<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function confirmationCode() {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const syncQueue = createSyncQueue({ now: () => Date.now(), random: () => Math.random() });
const syncClient: SyncClient = new LocalSimulatedSyncClient({
  seed: 1337,
  conflictRate: 0.25,
  transientRate: 0.05,
});

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>({
    sessionUser: null,
    farmProfile: EMPTY_PROFILE,
    reports: SEEDED_REPORTS,
    auditLogs: [],
    remindersEnabled: true,
    reminderDaysBefore: INITIAL_REMINDER_DAYS,
    reminderOffsets: DEFAULT_REMINDER_OFFSETS,
    evidenceAttachments: [],
    regulationChanges: SEEDED_REGULATIONS,
    helpTickets: [],
    isOnline: true,
    ocrExtractions: [],
    advisors: [],
    language: DEFAULT_LANGUAGE,
  });
  const [queueSnapshot, setQueueSnapshot] = useState<SyncQueueSnapshot>({ items: [], conflicts: [] });
  const [isHydrated, setIsHydrated] = useState(false);
  const migrationLoggedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(setQueueSnapshot);
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function hydrate() {
      const migration = await migrateLegacySyncSlices();
      const loaded = await loadState();
      await syncQueue.hydrate();
      setState((prev) => ({
        ...prev,
        ...loaded,
        farmProfile: { ...EMPTY_PROFILE, ...loaded.farmProfile },
        reminderOffsets: loaded.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS,
        evidenceAttachments: loaded.evidenceAttachments ?? [],
        regulationChanges: loaded.regulationChanges ?? SEEDED_REGULATIONS,
        helpTickets: loaded.helpTickets ?? [],
        isOnline: loaded.isOnline ?? true,
        ocrExtractions: loaded.ocrExtractions ?? [],
        advisors: loaded.advisors ?? [],
        language: loaded.language ?? DEFAULT_LANGUAGE,
      }));
      setIsHydrated(true);
      if (migration.kind === "migrated" && !migrationLoggedRef.current) {
        migrationLoggedRef.current = true;
        await appendLog(
          "sync.migration_v1",
          `Migrated ${migration.movedQueueItems} queue item(s) and ${migration.movedConflicts} conflict(s).`,
        );
      }
      void syncQueue.drain(syncClient);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(state);
  }, [isHydrated, state]);

  useEffect(() => {
    if (!isHydrated) return;
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "active") void syncQueue.drain(syncClient);
    });
    return () => sub.remove();
  }, [isHydrated]);

  async function appendLog(type: AuditEventType, details: string, userEmail?: string) {
    setState((current) => ({
      ...current,
      auditLogs: [
        {
          id: id("log"),
          type,
          userEmail: userEmail ?? current.sessionUser?.email ?? "anonymous",
          timestamp: new Date().toISOString(),
          details,
        },
        ...current.auditLogs,
      ],
    }));
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== DEFAULT_USER.email || password !== DEFAULT_PASSWORD) {
      return { ok: false, error: "Invalid credentials. Use farmer@pdp.test / harvest123." };
    }
    setState((current) => ({ ...current, sessionUser: DEFAULT_USER }));
    await appendLog("login", "Farmer session started.", DEFAULT_USER.email);
    return { ok: true };
  }

  async function logout() {
    const email = state.sessionUser?.email;
    setState((current) => ({ ...current, sessionUser: null }));
    await appendLog("logout", "Farmer session cleared.", email);
  }

  async function saveProfile(profile: FarmProfile) {
    const validation = validateFarmProfile(profile);
    if (!validation.ok) throw new ProfileValidationError(validation.errors);

    const next: FarmProfile = {
      ...profile,
      localVersion: profile.localVersion + 1,
      syncStatus: "pending",
    };
    setState((current) => ({ ...current, farmProfile: next }));
    await appendLog("profile.save", "Farm profile saved locally.");
    await syncQueue.enqueue({
      kind: "profile",
      op: "upsert",
      entityId: "self",
      payload: next,
      baseVersion: next.baseVersion,
    });
    void syncQueue.drain(syncClient);
  }

  async function syncProfile() {
    setState((current) => ({ ...current, farmProfile: { ...current.farmProfile, syncStatus: "syncing" } }));
    await syncQueue.drain(syncClient);
    setState((current) => ({
      ...current,
      farmProfile: { ...current.farmProfile, lastSyncedAt: new Date().toISOString() },
    }));
    await appendLog("profile.sync", "Farm profile sync requested.");
  }

  async function duplicateReport(reportId: string) {
    const source = state.reports.find((r) => r.id === reportId && r.status === "submitted");
    if (!source) return null;
    const duplicated: ComplianceReport = {
      ...source,
      id: id("report"),
      status: "draft",
      periodYear: String(new Date().getFullYear()),
      inspectionDate: "",
      submittedAt: undefined,
      basedOnReportId: source.id,
    };
    setState((current) => ({ ...current, reports: [duplicated, ...current.reports] }));
    await appendLog("report.duplicate", `Duplicated report ${source.id} into draft ${duplicated.id}.`);
    return duplicated;
  }

  function setReminders(enabled: boolean, daysBefore: number) {
    setState((current) => ({ ...current, remindersEnabled: enabled, reminderDaysBefore: daysBefore }));
  }
  function setReminderOffsets(offsets: number[]) {
    setState((current) => ({ ...current, reminderOffsets: offsets.sort((a, b) => b - a) }));
  }

  async function submitReport(reportId: string, updates: Partial<ComplianceReport>) {
    const existing = state.reports.find((r) => r.id === reportId);
    if (!existing) return { ok: false, error: "Draft not found." };
    const merged = { ...existing, ...updates };
    if (!merged.periodYear || !merged.inspectionDate || !merged.fieldSummary.trim()) {
      return { ok: false, error: "Period year, inspection date, and field summary are required." };
    }

    setState((current) => ({
      ...current,
      reports: current.reports.map((r) => (r.id === reportId ? { ...r, ...updates } : r)),
    }));

    await syncQueue.enqueue({
      kind: "report",
      op: "submit",
      entityId: reportId,
      payload: { ...merged, status: "submitted", submittedAt: new Date().toISOString() },
      baseVersion: 0,
    });

    if (state.isOnline) {
      await appendLog("report.submit", `Submitted report ${reportId}.`);
      void syncQueue.drain(syncClient);
    } else {
      await appendLog("report.draft_save", `Report ${reportId} queued for submission when online.`);
    }
    return { ok: true };
  }

  async function createNewReport(): Promise<ComplianceReport> {
    const newReport: ComplianceReport = {
      id: id("report"),
      title: "CAP Compliance Report",
      scheme: "GAEC baseline",
      periodYear: String(new Date().getFullYear()),
      inspectionDate: "",
      fieldSummary: "",
      notes: "",
      status: "draft",
    };
    setState((current) => ({ ...current, reports: [newReport, ...current.reports] }));
    await appendLog("report.create", `Created new blank report ${newReport.id}.`);
    return newReport;
  }

  async function saveDraftOffline(reportId: string, updates: Partial<ComplianceReport>) {
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) => (r.id === reportId ? { ...r, ...updates } : r)),
    }));
    await appendLog("report.draft_save", `Draft ${reportId} saved locally.`);
  }

  async function syncReports() {
    const before = queueSnapshot.items.length;
    const result = await syncQueue.drain(syncClient);
    const after = syncQueue.getSnapshot();
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) => {
        const okItem = before > 0 && !after.items.some((it) => it.entityId === r.id) && r.status === "draft";
        return okItem ? { ...r, status: "submitted", submittedAt: new Date().toISOString() } : r;
      }),
    }));
    if (result.ok > 0) await appendLog("report.sync", `Synced ${result.ok} queued report(s).`);
    if (result.conflicts > 0) await appendLog("sync.conflict", `${result.conflicts} conflict(s) detected during sync.`);
    return { synced: result.ok, failed: result.permanent, conflicts: result.conflicts };
  }

  function setOnlineStatus(online: boolean) {
    setState((current) => ({ ...current, isOnline: online }));
    if (online) void syncQueue.drain(syncClient);
  }

  async function addEvidence(
    taskId: string,
    uri: string,
    fileName: string,
    type: "photo" | "pdf",
    sizeBytes: number,
  ): Promise<{ ok: boolean; error?: string }> {
    if (sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
      return { ok: false, error: `File exceeds the 10 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(1)} MB).` };
    }
    const attachment: EvidenceAttachment = {
      id: id("evidence"),
      taskId,
      uri,
      fileName,
      type,
      sizeBytes,
      addedAt: new Date().toISOString(),
    };
    setState((current) => ({ ...current, evidenceAttachments: [...current.evidenceAttachments, attachment] }));
    await appendLog("evidence.upload", `Uploaded ${type} "${fileName}" for task ${taskId}.`);
    return { ok: true };
  }

  async function removeEvidence(evidenceId: string) {
    const attachment = state.evidenceAttachments.find((e) => e.id === evidenceId);
    setState((current) => ({
      ...current,
      evidenceAttachments: current.evidenceAttachments.filter((e) => e.id !== evidenceId),
    }));
    if (attachment) {
      await appendLog("evidence.remove", `Removed "${attachment.fileName}" from task ${attachment.taskId}.`);
    }
  }

  function getEvidenceForTask(taskId: string) {
    return state.evidenceAttachments.filter((e) => e.taskId === taskId);
  }

  async function markRegulationRead(regulationId: string) {
    setState((current) => ({
      ...current,
      regulationChanges: current.regulationChanges.map((r) =>
        r.id === regulationId ? { ...r, read: true } : r,
      ),
    }));
    await appendLog("regulation.read", `Marked regulation ${regulationId} as read.`);
  }

  async function submitHelpTicket(category: string, message: string, screenshotUri?: string) {
    const ticket: HelpTicket = {
      id: id("ticket"),
      category,
      message,
      screenshotUri,
      status: "open",
      createdAt: new Date().toISOString(),
      confirmationId: confirmationCode(),
    };
    setState((current) => ({ ...current, helpTickets: [ticket, ...current.helpTickets] }));
    await appendLog("ticket.submit", `Help ticket ${ticket.confirmationId} submitted: ${category}.`);
    return ticket;
  }

  async function applyOcrExtraction(reportId: string, extraction: OcrExtraction) {
    const withApplied: OcrExtraction = { ...extraction, appliedToReportId: reportId };
    setState((current) => ({ ...current, ocrExtractions: [...current.ocrExtractions, withApplied] }));
    await appendLog("ocr.prefill", `OCR extraction from "${extraction.sourceFileName}" applied to report ${reportId}.`);
  }

  async function resolveConflict(
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, ConflictResolutionSource>,
  ) {
    const conflict = queueSnapshot.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    if (conflict.kind === "report") {
      setState((current) => ({
        ...current,
        reports: current.reports.map((r) =>
          r.id === conflict.entityId
            ? { ...r, ...(merged as Partial<ComplianceReport>), status: "submitted", submittedAt: new Date().toISOString() }
            : r,
        ),
      }));
    } else {
      setState((current) => ({
        ...current,
        farmProfile: { ...current.farmProfile, ...(merged as Partial<FarmProfile>), syncStatus: "clean" },
      }));
    }

    await syncQueue.resolveConflict(conflictId, merged, fieldSources);
    await appendLog(
      "sync.conflict_resolved",
      `Resolved ${conflict.kind} conflict ${conflictId} (${Object.entries(fieldSources)
        .map(([f, s]) => `${f}:${s}`)
        .join(",")}).`,
    );
  }

  async function inviteAdvisor(email: string, permission: AdvisorPermission) {
    if (!email.includes("@")) return { ok: false, error: "Invalid email address." };
    const duplicate = state.advisors.find((a) => a.email === email && a.active);
    if (duplicate) return { ok: false, error: "This advisor is already active." };
    const advisor: Advisor = {
      id: id("advisor"),
      email,
      permission,
      invitedAt: new Date().toISOString(),
      active: true,
    };
    setState((current) => ({ ...current, advisors: [...current.advisors, advisor] }));
    await appendLog("advisor.invite", `Invited advisor ${email} with ${permission} access.`);
    return { ok: true };
  }

  async function revokeAdvisor(advisorId: string) {
    const advisor = state.advisors.find((a) => a.id === advisorId);
    setState((current) => ({
      ...current,
      advisors: current.advisors.map((a) =>
        a.id === advisorId ? { ...a, active: false, revokedAt: new Date().toISOString() } : a,
      ),
    }));
    if (advisor) await appendLog("advisor.revoke", `Revoked advisor access for ${advisor.email}.`);
  }

  function setLanguage(lang: AppLanguage) {
    setState((current) => ({ ...current, language: lang }));
  }

  async function exportAuditLog(fromDate: string, toDate: string, format: "csv" | "json") {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    const filtered = state.auditLogs.filter((entry) => {
      const ts = new Date(entry.timestamp);
      return ts >= from && ts <= to;
    });
    let content: string;
    if (format === "csv") {
      const header = "id,type,userEmail,timestamp,details";
      const rows = filtered.map((e) =>
        [e.id, e.type, e.userEmail, e.timestamp, `"${e.details.replace(/"/g, '""')}"`].join(","),
      );
      content = [header, ...rows].join("\n");
    } else {
      content = JSON.stringify(filtered, null, 2);
    }
    await appendLog(
      "audit.export",
      `Exported ${filtered.length} audit log entries (${format.toUpperCase()}) from ${fromDate} to ${toDate}.`,
    );
    return content;
  }

  const value = useMemo<AppContextValue>(
    () => ({
      isHydrated,
      sessionUser: state.sessionUser,
      farmProfile: state.farmProfile,
      reports: state.reports,
      auditLogs: state.auditLogs,
      remindersEnabled: state.remindersEnabled,
      reminderDaysBefore: state.reminderDaysBefore,
      reminderOffsets: state.reminderOffsets,
      evidenceAttachments: state.evidenceAttachments,
      regulationChanges: state.regulationChanges,
      helpTickets: state.helpTickets,
      syncQueue: queueSnapshot.items,
      isOnline: state.isOnline,
      ocrExtractions: state.ocrExtractions,
      syncConflicts: queueSnapshot.conflicts,
      advisors: state.advisors,
      language: state.language,
      setReminders,
      setReminderOffsets,
      login,
      logout,
      saveProfile,
      syncProfile,
      duplicateReport,
      submitReport,
      createNewReport,
      saveDraftOffline,
      syncReports,
      setOnlineStatus,
      addEvidence,
      removeEvidence,
      getEvidenceForTask,
      markRegulationRead,
      submitHelpTicket,
      applyOcrExtraction,
      resolveConflict,
      inviteAdvisor,
      revokeAdvisor,
      setLanguage,
      exportAuditLog,
    }),
    [isHydrated, state, queueSnapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
```

- [ ] **Step 2: Update characterization test to use new shape**

Open `mobile-app/context/__tests__/AppContext.characterization.test.tsx` and replace the final assertion block with:

```ts
expect(captured!.syncQueue[0].entityId).toBe(draft.id);
```

- [ ] **Step 3: Run tests**

Run: `cd mobile-app && npx jest`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile-app/context/AppContext.tsx mobile-app/context/__tests__/AppContext.characterization.test.tsx
git commit -m "refactor(context): consume lib/sync; profile validation + syncStatus"
```

---

## Task 24: AppContext integration test — full flow

**Files:**
- Create: `mobile-app/context/__tests__/AppContext.integration.test.tsx`

- [ ] **Step 1: Write the integration test**

```tsx
import React from "react";
import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider, useApp } from "@/context/AppContext";
import { REMOTE_SHADOW_KEY } from "@/lib/sync/syncClient";

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useApp>) => void }) {
  const api = useApp();
  React.useEffect(() => {
    if (api.isHydrated) onReady(api);
  }, [api.isHydrated]);
  return <Text>{api.isHydrated ? "ready" : "wait"}</Text>;
}

async function waitForReady<T extends () => any>(getter: T): Promise<ReturnType<T>> {
  for (let i = 0; i < 200; i += 1) {
    const v = getter();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("timed out");
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("enqueue report -> simulated conflict -> resolve -> audit entry present", async () => {
  // Pre-seed a divergent remote so the simulated client returns a conflict.
  await AsyncStorage.setItem(
    REMOTE_SHADOW_KEY,
    JSON.stringify({
      report: {},
      profile: {},
    }),
  );

  let api: any = null;
  render(
    <AppProvider>
      <Probe onReady={(a) => (api = a)} />
    </AppProvider>,
  );
  await waitForReady(() => api);

  const draft = await api.createNewReport();
  await act(async () => {
    api.setOnlineStatus(false);
  });
  await api.submitReport(draft.id, {
    periodYear: "2026",
    inspectionDate: "2026-05-01",
    fieldSummary: "Field A",
    notes: "local notes",
  });

  // Force a remote that conflicts on notes.
  await AsyncStorage.setItem(
    REMOTE_SHADOW_KEY,
    JSON.stringify({
      report: {
        [draft.id]: { kind: "report", id: draft.id, version: 1, data: { id: draft.id, notes: "remote notes" } },
      },
      profile: {},
    }),
  );
  await act(async () => {
    api.setOnlineStatus(true);
  });
  await act(async () => {
    await api.syncReports();
  });

  // A conflict should have surfaced.
  await waitForReady(() => (api.syncConflicts.length > 0 ? api.syncConflicts : null));
  const conflict = api.syncConflicts[0];
  expect(conflict.entityId).toBe(draft.id);

  await act(async () => {
    await api.resolveConflict(conflict.id, { id: draft.id, notes: "merged notes" }, { notes: "edited" });
  });

  expect(api.auditLogs.some((l: any) => l.type === "sync.conflict_resolved")).toBe(true);
});
```

- [ ] **Step 2: Run test**

Run: `cd mobile-app && npx jest context/__tests__/AppContext.integration.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/context/__tests__/AppContext.integration.test.tsx
git commit -m "test(context): full flow enqueue→conflict→resolve→audit"
```

---

## Task 25: Conflict modal route — list & resolve UI

**Files:**
- Create: `mobile-app/app/conflicts/[id].tsx`
- Modify: `mobile-app/app/_layout.tsx`

- [ ] **Step 1: Inspect `mobile-app/app/_layout.tsx`**

Run: `cd mobile-app && sed -n '1,80p' app/_layout.tsx`

- [ ] **Step 2: Register the modal route**

In `app/_layout.tsx`, locate the `<Stack>` element and add a screen entry inside it:

```tsx
<Stack.Screen name="conflicts/[id]" options={{ presentation: "modal", title: "Resolve conflict" }} />
```

- [ ] **Step 3: Create `mobile-app/app/conflicts/[id].tsx`**

```tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useApp } from "@/context/AppContext";
import type { ConflictResolutionSource, SyncConflict } from "@/types";

export default function ConflictResolutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { syncConflicts, resolveConflict } = useApp();

  const conflict: SyncConflict | undefined = useMemo(
    () => syncConflicts.find((c) => c.id === id),
    [id, syncConflicts],
  );

  const [resolutions, setResolutions] = useState<Record<string, { value: string; source: ConflictResolutionSource }>>(
    () => {
      if (!conflict) return {};
      const init: Record<string, { value: string; source: ConflictResolutionSource }> = {};
      for (const f of conflict.fields) {
        init[f.field] = { value: String(f.localValue ?? ""), source: "local" };
      }
      return init;
    },
  );

  if (!conflict) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>No conflicts to resolve</Text>
        <Pressable style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const allResolved = conflict.fields.every((f) => resolutions[f.field]?.value !== undefined);

  function pick(field: string, source: "local" | "remote", value: unknown) {
    setResolutions((r) => ({ ...r, [field]: { value: String(value ?? ""), source } }));
  }

  function edit(field: string, value: string) {
    setResolutions((r) => ({ ...r, [field]: { value, source: "edited" } }));
  }

  async function onResolve() {
    const merged: Record<string, unknown> = {};
    const sources: Record<string, ConflictResolutionSource> = {};
    for (const f of conflict!.fields) {
      merged[f.field] = resolutions[f.field].value;
      sources[f.field] = resolutions[f.field].source;
    }
    await resolveConflict(conflict!.id, merged, sources);
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {conflict.kind} · {conflict.entityId}
      </Text>
      <Text style={styles.subtitle}>Detected {new Date(conflict.detectedAt).toLocaleString()}</Text>

      {conflict.fields.map((f) => (
        <View key={f.field} style={styles.field}>
          <Text style={styles.fieldName}>{f.field}</Text>
          <View style={styles.row}>
            <Pressable style={styles.cell} onPress={() => pick(f.field, "local", f.localValue)}>
              <Text style={styles.cellLabel}>Local</Text>
              <Text style={styles.cellValue}>{String(f.localValue ?? "")}</Text>
            </Pressable>
            <Pressable style={styles.cell} onPress={() => pick(f.field, "remote", f.remoteValue)}>
              <Text style={styles.cellLabel}>Remote</Text>
              <Text style={styles.cellValue}>{String(f.remoteValue ?? "")}</Text>
            </Pressable>
          </View>
          <Text style={styles.cellLabel}>Resolved ({resolutions[f.field]?.source ?? "local"})</Text>
          <TextInput
            value={resolutions[f.field]?.value ?? ""}
            onChangeText={(t) => edit(f.field, t)}
            style={styles.input}
            multiline
          />
        </View>
      ))}

      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, !allResolved && styles.disabled]}
          disabled={!allResolved}
          onPress={onResolve}
        >
          <Text style={styles.primaryText}>Resolve</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  subtitle: { color: "#666" },
  field: { borderWidth: 1, borderColor: "#e2e2e2", borderRadius: 8, padding: 12, gap: 8 },
  fieldName: { fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  cell: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: "#f5f5f5" },
  cellLabel: { fontSize: 12, color: "#666" },
  cellValue: { fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, minHeight: 40 },
  footer: { flexDirection: "row", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  primary: { backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  primaryText: { color: "white", fontWeight: "600" },
  secondary: { backgroundColor: "#e5e5e5", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  secondaryText: { color: "#333", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 4: Verify TS**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/app/conflicts/[id].tsx mobile-app/app/_layout.tsx
git commit -m "feat(ui): field-level conflict resolution modal route"
```

---

## Task 26: Tabs banner + Profile syncStatus pill

**Files:**
- Modify: `mobile-app/app/(tabs)/_layout.tsx`
- Modify: `mobile-app/app/(tabs)/profile.tsx` (or whichever file renders the profile screen)

- [ ] **Step 1: Identify profile screen path**

Run: `cd mobile-app && ls app/\(tabs\)`
Use the file named `profile.tsx` (or the closest equivalent). If it lives outside `(tabs)`, adjust paths.

- [ ] **Step 2: Add banner to `(tabs)/_layout.tsx`**

Near the top of the returned JSX in `_layout.tsx`, wrap the existing Tabs element in a fragment and prepend a banner. Add imports:

```tsx
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useApp } from "@/context/AppContext";
```

Insert above the `<Tabs ...>` element:

```tsx
function ConflictsBanner() {
  const { syncConflicts } = useApp();
  const unresolved = syncConflicts.filter((c) => !c.resolvedAt);
  if (unresolved.length === 0) return null;
  return (
    <View style={{ backgroundColor: "#fde68a", padding: 8 }}>
      <Link href={`/conflicts/${unresolved[0].id}`} asChild>
        <Pressable>
          <Text style={{ fontWeight: "600" }}>
            {unresolved.length} conflict{unresolved.length === 1 ? "" : "s"} to resolve — tap to fix
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
```

Wrap the existing return:

```tsx
return (
  <>
    <ConflictsBanner />
    <Tabs ...> ... </Tabs>
  </>
);
```

- [ ] **Step 3: Add syncStatus pill + validation errors to the profile screen**

In the profile screen, at the top of the rendered form, add:

```tsx
import { useState } from "react";
import { ProfileValidationError } from "@/context/AppContext";

function SyncPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    clean: "#16a34a",
    pending: "#ca8a04",
    syncing: "#2563eb",
    conflict: "#dc2626",
    error: "#7c2d12",
  };
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: colors[status] ?? "#666", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ color: "white", fontSize: 12 }}>{status}</Text>
    </View>
  );
}
```

In the component body, replace the existing save handler with:

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

async function onSave(profile: any) {
  setErrors({});
  try {
    await saveProfile(profile);
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      setErrors(err.errors as Record<string, string>);
    } else {
      throw err;
    }
  }
}
```

Render `<SyncPill status={farmProfile.syncStatus} />` near the screen title, and render `{errors.farmName && <Text style={{ color: "red" }}>{errors.farmName}</Text>}` etc. under each input.

- [ ] **Step 4: Run tests + typecheck**

Run: `cd mobile-app && npx tsc --noEmit && npx jest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/app
git commit -m "feat(ui): conflicts banner and profile syncStatus pill"
```

---

## Task 27: Final verification pass

**Files:** none.

- [ ] **Step 1: Run full test suite**

Run: `cd mobile-app && npx jest --runInBand`
Expected: all tests PASS.

- [ ] **Step 2: Typecheck**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm AppContext shrinkage**

Run: `cd mobile-app && wc -l context/AppContext.tsx`
Expected: well below 661 lines.

- [ ] **Step 4: Commit any incidental fixes**

If the previous steps required fixes, commit them:

```bash
git add -p
git commit -m "chore: post-refactor cleanups"
```

---
