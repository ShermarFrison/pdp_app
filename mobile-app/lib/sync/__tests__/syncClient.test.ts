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
