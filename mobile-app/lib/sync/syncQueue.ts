import AsyncStorage from "@react-native-async-storage/async-storage";
import { detectFieldConflicts } from "@/lib/sync/conflicts";
import type {
  ConflictResolutionSource,
  SyncClient,
  SyncConflict,
  SyncQueueItem,
  SyncResult,
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
    fieldSources: Record<string, ConflictResolutionSource>,
  ) => Promise<void>;
  subscribe: (listener: SyncQueueListener) => () => void;
  getSnapshot: () => SyncQueueSnapshot;
};

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function backoffMs(attempts: number, jitter: number): number {
  const raw = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempts);
  return Math.floor(raw * (0.5 + jitter * 0.5));
}

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

  function subscribe(listener: SyncQueueListener) {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    hydrate,
    enqueue,
    drain,
    resolveConflict,
    subscribe,
    getSnapshot: () => state,
  };
}
