import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  EntityKind,
  RemoteSnapshot,
  SyncQueueItem,
  SyncResult,
} from "@/lib/sync/types";

export const REMOTE_SHADOW_KEY = "pdp-sync-remote-shadow";

export interface SyncClientInterface {
  pushReport(item: SyncQueueItem): Promise<SyncResult>;
  pushProfile(item: SyncQueueItem): Promise<SyncResult>;
  fetchRemote(kind: EntityKind, id: string): Promise<RemoteSnapshot | null>;
}

export type SyncClient = SyncClientInterface;

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
