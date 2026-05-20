import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSyncQueue, type SyncClient } from "@/lib/sync";
import type { SyncQueueItem, SyncResult } from "@/lib/sync";
import { submitReport, observeSubmission } from "@/lib/reports";
import type { ComplianceReport } from "@/types";

const baseReport: ComplianceReport = {
  id: "rep-1",
  title: "T",
  scheme: "GAEC",
  periodYear: "2026",
  inspectionDate: "2026-05-19",
  fieldSummary: "ok",
  notes: "",
  status: "draft",
};

class StubClient implements SyncClient {
  result: SyncResult = { kind: "ok", remoteVersion: 1 };
  async pushReport(_item: SyncQueueItem): Promise<SyncResult> { return this.result; }
  async pushProfile(_item: SyncQueueItem): Promise<SyncResult> { return this.result; }
  async fetchRemote() { return null; }
}

function makeQueue() {
  let t = 1_000_000;
  return createSyncQueue({ now: () => ++t, random: () => 0.5 });
}

describe("submitReport (lib/reports/submission)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("enqueues a report.submit item and resolves to acknowledged when queue drains ok", async () => {
    const queue = makeQueue();
    await queue.hydrate();
    const transitions: string[] = [];
    const client = new StubClient();

    const promise = submitReport(queue, {
      report: baseReport,
      updates: { fieldSummary: "new" },
      onState: (s) => transitions.push(s),
    });

    // Wait one tick so enqueue completes and subscription is wired.
    await Promise.resolve();
    const snapshot = queue.getSnapshot();
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].kind).toBe("report");
    expect(snapshot.items[0].op).toBe("submit");
    expect(snapshot.items[0].entityId).toBe("rep-1");

    await queue.drain(client);
    const result = await promise;
    expect(result.submissionState).toBe("acknowledged");
    expect(transitions).toContain("pending");
    expect(transitions).toContain("acknowledged");
  });

  it("resolves to conflict when queue reports conflict", async () => {
    const queue = makeQueue();
    await queue.hydrate();
    const client = new StubClient();
    client.result = {
      kind: "conflict",
      remote: { kind: "report", id: "rep-1", version: 2, data: { fieldSummary: "remote" } },
      base: { kind: "report", id: "rep-1", version: 0, data: {} },
    };
    const promise = submitReport(queue, { report: baseReport, updates: {} });
    await Promise.resolve();
    await queue.drain(client);
    const result = await promise;
    expect(result.submissionState).toBe("conflict");
  });

  it("resolves to failed when queue reports permanent error", async () => {
    const queue = makeQueue();
    await queue.hydrate();
    const client = new StubClient();
    client.result = { kind: "permanent", reason: "validation failed" };
    const promise = submitReport(queue, { report: baseReport, updates: {} });
    await Promise.resolve();
    await queue.drain(client);
    const result = await promise;
    expect(result.submissionState).toBe("failed");
    expect(result.error).toBe("validation failed");
  });
});

describe("observeSubmission (restart recovery)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("attaches to an already-queued report.submit item by reportId and resolves on terminal state", async () => {
    const queue = makeQueue();
    await queue.hydrate();
    const queued = await queue.enqueue({
      kind: "report",
      op: "submit",
      entityId: "rep-1",
      payload: { id: "rep-1" },
      baseVersion: 0,
    });
    const promise = observeSubmission(queue, "rep-1");
    expect(promise).not.toBeNull();
    const client = new StubClient();
    await queue.drain(client);
    const result = await promise!;
    expect(result.submissionState).toBe("acknowledged");
    expect(result.queueItemId).toBe(queued.id);
  });

  it("returns null when no queued submission exists for the report", async () => {
    const queue = makeQueue();
    await queue.hydrate();
    expect(observeSubmission(queue, "nope")).toBeNull();
  });
});
