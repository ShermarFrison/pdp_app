import type { SyncQueue, SyncQueueSnapshot } from "@/lib/sync";
import type { ComplianceReport, SubmissionState, SyncQueueItemStatus } from "@/types";

export type SubmitReportInput = {
  report: ComplianceReport;
  updates: Partial<ComplianceReport>;
  onState?: (s: SubmissionState | "in-flight") => void;
};

export type SubmitReportResult = {
  submissionState: SubmissionState;
  queueItemId: string;
  error?: string;
};

export type ReportSubmitPayload = {
  reportId: string;
  updates: Partial<ComplianceReport>;
  localVersion: number;
  baseVersion: number;
};

function mapQueueStatusToSubmission(s: SyncQueueItemStatus): SubmissionState | "in-flight" | null {
  switch (s) {
    case "pending": return "pending";
    case "in-flight": return "in-flight";
    case "ok": return "acknowledged";
    case "conflict": return "conflict";
    case "error": return "failed";
    default: return null;
  }
}

export async function submitReport(
  queue: SyncQueue,
  input: SubmitReportInput,
): Promise<SubmitReportResult> {
  const { report, updates, onState } = input;
  const localVersion = (report.localVersion ?? 0) + 1;
  const baseVersion = report.baseVersion ?? 0;

  const merged: ComplianceReport = {
    ...report,
    ...updates,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };

  const item = await queue.enqueue({
    kind: "report",
    op: "submit",
    entityId: report.id,
    payload: merged,
    baseVersion,
  });

  onState?.("pending");

  // The queue may drop items on ok terminal state — capture the last known state of *our* item.
  return new Promise<SubmitReportResult>((resolve) => {
    let lastKnownStatus: SyncQueueItemStatus = item.status;
    let lastKnownError: string | undefined = item.lastError;
    let resolved = false;

    function finish(state: SubmissionState, error?: string) {
      if (resolved) return;
      resolved = true;
      onState?.(state);
      unsubscribe();
      resolve({ submissionState: state, queueItemId: item.id, error });
    }

    const unsubscribe = queue.subscribe((snapshot: SyncQueueSnapshot) => {
      const me = snapshot.items.find((x) => x.id === item.id);
      if (!me) {
        // Item removed — treat last seen non-terminal as acknowledged (queue removes on ok).
        if (lastKnownStatus !== "ok" && lastKnownStatus !== "error" && lastKnownStatus !== "conflict") {
          finish("acknowledged");
        }
        return;
      }
      lastKnownStatus = me.status;
      lastKnownError = me.lastError;
      const mapped = mapQueueStatusToSubmission(me.status);
      if (mapped === "in-flight") {
        onState?.("in-flight");
        return;
      }
      if (mapped === "pending" || mapped === null) return;
      if (mapped === "acknowledged" || mapped === "conflict" || mapped === "failed") {
        finish(mapped, lastKnownError);
      }
    });
    // Defensive: suppress unused warning
    void lastKnownError;
  });
}
