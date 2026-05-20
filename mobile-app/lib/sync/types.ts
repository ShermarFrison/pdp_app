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

export type ReportPayload = Partial<ComplianceReport>;
export type ProfilePayload = Partial<FarmProfile>;
