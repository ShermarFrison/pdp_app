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
