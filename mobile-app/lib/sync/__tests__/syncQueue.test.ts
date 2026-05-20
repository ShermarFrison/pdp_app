import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSyncQueue, SYNC_QUEUE_KEY } from "@/lib/sync/syncQueue";
import type { SyncResult } from "@/lib/sync/types";
import type { SyncClient } from "@/lib/sync/syncClient";

beforeEach(async () => {
  await AsyncStorage.clear();
});

function fakeClient(results: SyncResult[]): SyncClient {
  let i = 0;
  const next = () => results[Math.min(i++, results.length - 1)];
  return {
    pushReport: async () => next(),
    pushProfile: async () => next(),
    fetchRemote: async () => null,
  };
}

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
  expect(after1.nextAttemptAt - 1000).toBeLessThanOrEqual(2000);

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
