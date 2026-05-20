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

export type ConflictResolutionSource = "local" | "remote" | "edited";

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
