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
