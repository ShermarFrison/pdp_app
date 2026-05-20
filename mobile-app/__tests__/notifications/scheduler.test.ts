jest.mock("expo-notifications");
import * as Notifications from "expo-notifications";
import { scheduleForTask, cancelForTask, rescheduleAll } from "@/lib/notifications/scheduler";
import type { ComplianceTask } from "@/types";

const mock = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __getScheduled: () => Array<{
    identifier: string;
    content: { data: { taskId: string; offsetDays: number } };
    trigger: { date: Date };
  }>;
  __setPermission: (s: "granted" | "denied" | "undetermined") => void;
};

const FIXED_NOW = new Date("2026-05-19T12:00:00.000Z");

function makeTask(overrides: Partial<ComplianceTask> = {}): ComplianceTask {
  return {
    id: "task-1",
    title: "Confirm field buffer strips",
    guidance: "g",
    whatToDo: "w",
    dueDate: "2026-05-26",
    status: "Not started",
    source: "s",
    riskLevel: "medium",
    penaltyExplanation: "p",
    ...overrides,
  };
}

beforeEach(() => {
  mock.__reset();
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("scheduleForTask", () => {
  it("schedules one notification per future offset", async () => {
    const task = makeTask({ dueDate: "2026-05-26" });
    await scheduleForTask(task, [1, 3, 7]);
    const items = mock.__getScheduled();
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.content.data.offsetDays).sort()).toEqual([1, 3, 7]);
    for (const i of items) {
      expect(i.content.data.taskId).toBe("task-1");
      expect(i.trigger.date.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
    }
  });

  it("skips offsets that resolve to the past", async () => {
    const task = makeTask({ dueDate: "2026-05-22" });
    await scheduleForTask(task, [1, 3, 7]);
    const items = mock.__getScheduled();
    expect(items.map((i) => i.content.data.offsetDays).sort()).toEqual([1, 3]);
  });
});

describe("cancelForTask", () => {
  it("cancels only the matching task's notifications", async () => {
    await scheduleForTask(makeTask({ id: "a", dueDate: "2026-05-26" }), [1, 3]);
    await scheduleForTask(makeTask({ id: "b", dueDate: "2026-05-26" }), [1, 3]);
    await cancelForTask("a");
    const remaining = mock.__getScheduled();
    expect(remaining).toHaveLength(2);
    expect(remaining.every((r) => r.content.data.taskId === "b")).toBe(true);
  });
});

describe("rescheduleAll", () => {
  it("is idempotent across repeated invocations", async () => {
    const tasks = [
      makeTask({ id: "a", dueDate: "2026-05-26" }),
      makeTask({ id: "b", dueDate: "2026-05-28" }),
    ];
    const settings = { remindersEnabled: true, reminderOffsets: [1, 3] };
    await rescheduleAll(tasks, settings);
    const first = mock
      .__getScheduled()
      .map((s) => `${s.content.data.taskId}:${s.content.data.offsetDays}`)
      .sort();
    await rescheduleAll(tasks, settings);
    const second = mock
      .__getScheduled()
      .map((s) => `${s.content.data.taskId}:${s.content.data.offsetDays}`)
      .sort();
    expect(second).toEqual(first);
    expect(second).toHaveLength(4);
  });

  it("schedules zero when remindersEnabled is false", async () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-26" })];
    await rescheduleAll(tasks, { remindersEnabled: false, reminderOffsets: [1, 3] });
    expect(mock.__getScheduled()).toHaveLength(0);
  });

  it("schedules zero when permission denied", async () => {
    mock.__setPermission("denied");
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-26" })];
    await rescheduleAll(tasks, { remindersEnabled: true, reminderOffsets: [1, 3] });
    expect(mock.__getScheduled()).toHaveLength(0);
  });
});
