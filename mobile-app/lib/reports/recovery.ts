import type { SyncQueue, SyncQueueItem } from "@/lib/sync";
import type { SubmitReportResult } from "./submission";

export function observeSubmission(
  queue: SyncQueue,
  reportId: string,
): Promise<SubmitReportResult> | null {
  const existing = queue
    .getSnapshot()
    .items.find((i: SyncQueueItem) => i.kind === "report" && i.op === "submit" && i.entityId === reportId);
  if (!existing) return null;

  return new Promise<SubmitReportResult>((resolve) => {
    let resolved = false;
    const unsubscribe = queue.subscribe((snapshot) => {
      if (resolved) return;
      const me = snapshot.items.find((x) => x.id === existing.id);
      if (!me) {
        // Item removed by drain on ok terminal.
        resolved = true;
        unsubscribe();
        resolve({ submissionState: "acknowledged", queueItemId: existing.id });
        return;
      }
      if (me.status === "ok") {
        resolved = true;
        unsubscribe();
        resolve({ submissionState: "acknowledged", queueItemId: me.id });
      } else if (me.status === "conflict") {
        resolved = true;
        unsubscribe();
        resolve({ submissionState: "conflict", queueItemId: me.id, error: me.lastError });
      } else if (me.status === "error") {
        resolved = true;
        unsubscribe();
        resolve({ submissionState: "failed", queueItemId: me.id, error: me.lastError });
      }
    });
  });
}
