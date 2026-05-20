jest.mock("expo-notifications");
jest.mock("expo-sharing", () => {
  let available = true;
  const calls: string[] = [];
  return {
    isAvailableAsync: jest.fn(async () => available),
    shareAsync: jest.fn(async (uri: string) => {
      calls.push(uri);
    }),
    __reset: () => {
      calls.length = 0;
      available = true;
    },
    __setAvailable: (v: boolean) => {
      available = v;
    },
    get __calls() {
      return calls;
    },
  };
});
jest.mock("expo-file-system/legacy", () => {
  const files = new Map<string, string>();
  return {
    cacheDirectory: "file:///cache/",
    documentDirectory: "file:///mock-docs/",
    EncodingType: { UTF8: "utf8" },
    writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
      files.set(uri, content);
    }),
    readAsStringAsync: jest.fn(async (uri: string) => {
      if (!files.has(uri)) throw new Error(`File not found: ${uri}`);
      return files.get(uri) ?? "";
    }),
    getInfoAsync: jest.fn(async (uri: string) => ({
      exists: files.has(uri),
      uri,
      size: (files.get(uri) ?? "").length,
    })),
    deleteAsync: jest.fn(async (uri: string) => {
      files.delete(uri);
    }),
    copyAsync: jest.fn(async () => {}),
    makeDirectoryAsync: jest.fn(async () => {}),
    __reset: () => files.clear(),
    __read: (uri: string) => files.get(uri) ?? "",
    __exists: (uri: string) => files.has(uri),
  };
});

import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { rescheduleAll } from "@/lib/notifications";
import { exportToFile, shareFile, formatJson } from "@/lib/audit";
import type { AuditLogEntry, ComplianceTask } from "@/types";

const notif = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __getScheduled: () => Array<{ content: { data: { taskId: string; offsetDays: number } } }>;
};
const fs = FileSystem as unknown as typeof FileSystem & {
  __reset: () => void;
  __read: (u: string) => string;
  __exists: (u: string) => boolean;
};
const share = Sharing as unknown as typeof Sharing & { __reset: () => void; __calls: string[] };

const FIXED_NOW = new Date("2026-05-19T12:00:00.000Z");

function makeTask(id: string, dueDate: string): ComplianceTask {
  return {
    id,
    title: id,
    guidance: "",
    whatToDo: "",
    dueDate,
    status: "Not started",
    source: "",
    riskLevel: "low",
    penaltyExplanation: "",
  };
}

beforeEach(() => {
  notif.__reset();
  fs.__reset();
  share.__reset();
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});
afterEach(() => jest.useRealTimers());

describe("integration: notifications", () => {
  it("offsets [1,3,7] with dueDate 3 days out schedule exactly 2 notifications; disabling cancels all", async () => {
    const task = makeTask("t1", "2026-05-22");
    await rescheduleAll([task], { remindersEnabled: true, reminderOffsets: [1, 3, 7] });
    expect(notif.__getScheduled()).toHaveLength(2);

    await rescheduleAll([task], { remindersEnabled: false, reminderOffsets: [1, 3, 7] });
    expect(notif.__getScheduled()).toHaveLength(0);
  });
});

describe("integration: audit export", () => {
  it("writes a file and triggers share sheet", async () => {
    const entries: AuditLogEntry[] = [
      {
        id: "log-1",
        type: "login",
        userEmail: "farmer@pdp.test",
        timestamp: "2026-05-10T00:00:00.000Z",
        details: "in",
      },
      {
        id: "log-2",
        type: "logout",
        userEmail: "farmer@pdp.test",
        timestamp: "2026-05-18T00:00:00.000Z",
        details: "out",
      },
    ];
    const uri = await exportToFile(entries, "json", "2026-04-19", "2026-05-19");
    expect(uri).toBe("file:///cache/audit-20260419-to-20260519.json");
    expect(fs.__exists(uri)).toBe(true);
    expect(fs.__read(uri)).toBe(formatJson(entries));

    await shareFile(uri);
    expect(share.__calls).toEqual([uri]);
  });
});
