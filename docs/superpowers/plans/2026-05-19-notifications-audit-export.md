# Notifications & Audit Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real local-notification scheduling with deep-link tap handling and a shareable date-ranged CSV/JSON audit-log export for the PDP mobile app (SP3: SCRUM-70, SCRUM-72, SCRUM-47 productionisation).

**Architecture:** Two small modules — `mobile-app/lib/notifications/` (scheduler + handler) and `mobile-app/lib/audit/` (formatters + file writer) — consumed by `AppContext` and `app/_layout.tsx`. `rescheduleAll` is the single mutator for the notification queue, guaranteeing "disable immediately" and no drift. `exportAuditLog` writes a chunked file to `FileSystem.cacheDirectory` and invokes the system share sheet.

**Tech Stack:** TypeScript, React Native, Expo Router, `expo-notifications`, `expo-sharing`, `expo-file-system`, Jest + ts-jest for tests.

---

## File Structure

Created:
- `mobile-app/lib/notifications/scheduler.ts` — schedule/cancel/reschedule + permission helper.
- `mobile-app/lib/notifications/handler.ts` — root-level tap listener + router push.
- `mobile-app/lib/notifications/index.ts` — barrel re-export.
- `mobile-app/lib/audit/export.ts` — `formatCsv`, `formatJson`, `exportToFile`, `shareFile`.
- `mobile-app/lib/audit/index.ts` — barrel re-export.
- `mobile-app/__tests__/notifications/scheduler.test.ts`
- `mobile-app/__tests__/notifications/handler.test.ts`
- `mobile-app/__tests__/audit/export.test.ts`
- `mobile-app/__tests__/integration/notifications-export.test.ts`
- `mobile-app/__mocks__/expo-notifications.ts`
- `mobile-app/__mocks__/expo-sharing.ts`
- `mobile-app/__mocks__/expo-file-system.ts`
- `mobile-app/__mocks__/expo-router.ts`
- `mobile-app/jest.config.js`

Modified:
- `mobile-app/package.json` — add dev/runtime deps + `test` script.
- `mobile-app/app/_layout.tsx` — register notification response listener once.
- `mobile-app/context/AppContext.tsx` — call `rescheduleAll` after hydration / settings / task mutations; rewire `exportAuditLog` to return a file URI and share.
- `mobile-app/app/(tabs)/audit-log.tsx` — date-range picker UI + CSV/JSON toggle + share success/failure messaging.

---

## Task 1: Add dependencies and Jest scaffolding

**Files:**
- Modify: `mobile-app/package.json`
- Create: `mobile-app/jest.config.js`

- [ ] **Step 1: Install runtime + dev deps**

Run from `mobile-app/`:

```bash
cd mobile-app && npx expo install expo-notifications expo-sharing
# expo-file-system: only add if SP2 hasn't already
node -e "process.exit(require('./package.json').dependencies['expo-file-system'] ? 0 : 1)" || npx expo install expo-file-system
npm install --save-dev jest@^29 ts-jest@^29 @types/jest@^29 jest-expo@~54.0.0
```

Expected: `package.json` now lists `expo-notifications`, `expo-sharing`, `expo-file-system` under `dependencies` and the jest packages under `devDependencies`.

- [ ] **Step 2: Add `test` script to `package.json`**

Edit `mobile-app/package.json` `scripts` block to add:

```json
"test": "jest"
```

- [ ] **Step 3: Write `jest.config.js`**

Create `mobile-app/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|expo-modules-core|expo-router|expo-notifications|expo-sharing|expo-file-system)",
  ],
};
```

- [ ] **Step 4: Verify jest discovers no tests yet but exits 0 with `--passWithNoTests`**

Run: `cd mobile-app && npx jest --passWithNoTests`
Expected: `No tests found, exiting with code 0`.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/package.json mobile-app/package-lock.json mobile-app/jest.config.js
git commit -m "chore(sp3): add expo-notifications, expo-sharing, jest scaffolding"
```

---

## Task 2: Stub Expo module mocks

**Files:**
- Create: `mobile-app/__mocks__/expo-notifications.ts`
- Create: `mobile-app/__mocks__/expo-sharing.ts`
- Create: `mobile-app/__mocks__/expo-file-system.ts`
- Create: `mobile-app/__mocks__/expo-router.ts`

- [ ] **Step 1: Write `__mocks__/expo-notifications.ts`**

```ts
type ScheduledRequest = {
  identifier: string;
  content: { title: string; body: string; data: { taskId: string; offsetDays: number } };
  trigger: { date: Date };
};

const scheduled: ScheduledRequest[] = [];
let permissionStatus: "granted" | "denied" | "undetermined" = "granted";
let nextId = 1;

export const __reset = () => {
  scheduled.length = 0;
  permissionStatus = "granted";
  nextId = 1;
};
export const __getScheduled = () => scheduled.slice();
export const __setPermission = (s: "granted" | "denied" | "undetermined") => {
  permissionStatus = s;
};

export const getPermissionsAsync = jest.fn(async () => ({ status: permissionStatus }));
export const requestPermissionsAsync = jest.fn(async () => ({ status: permissionStatus }));

export const scheduleNotificationAsync = jest.fn(async (req: { content: ScheduledRequest["content"]; trigger: { date: Date } }) => {
  const identifier = `notif-${nextId++}`;
  scheduled.push({ identifier, content: req.content, trigger: req.trigger });
  return identifier;
});

export const cancelScheduledNotificationAsync = jest.fn(async (identifier: string) => {
  const idx = scheduled.findIndex((s) => s.identifier === identifier);
  if (idx >= 0) scheduled.splice(idx, 1);
});

export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {
  scheduled.length = 0;
});

export const getAllScheduledNotificationsAsync = jest.fn(async () => scheduled.slice());

type ResponseListener = (resp: { notification: { request: { content: { data: { taskId: string } } } } }) => void;
const responseListeners: ResponseListener[] = [];
export const addNotificationResponseReceivedListener = jest.fn((cb: ResponseListener) => {
  responseListeners.push(cb);
  return { remove: () => { const i = responseListeners.indexOf(cb); if (i >= 0) responseListeners.splice(i, 1); } };
});
export const __fireResponse = (taskId: string) => {
  for (const l of responseListeners) {
    l({ notification: { request: { content: { data: { taskId } } } } });
  }
};

export const setNotificationHandler = jest.fn();

export const SchedulableTriggerInputTypes = { DATE: "date" } as const;
```

- [ ] **Step 2: Write `__mocks__/expo-sharing.ts`**

```ts
export const __calls: string[] = [];
let available = true;
export const __setAvailable = (v: boolean) => { available = v; };
export const __reset = () => { __calls.length = 0; available = true; };

export const isAvailableAsync = jest.fn(async () => available);
export const shareAsync = jest.fn(async (uri: string) => { __calls.push(uri); });
```

- [ ] **Step 3: Write `__mocks__/expo-file-system.ts`**

```ts
const files: Record<string, string> = {};
export const __reset = () => { for (const k of Object.keys(files)) delete files[k]; };
export const __read = (uri: string) => files[uri] ?? "";
export const __exists = (uri: string) => Object.prototype.hasOwnProperty.call(files, uri);

export const cacheDirectory = "file:///cache/";
export const EncodingType = { UTF8: "utf8" } as const;

export const writeAsStringAsync = jest.fn(async (uri: string, content: string) => {
  files[uri] = content;
});

export const readAsStringAsync = jest.fn(async (uri: string) => {
  if (!(uri in files)) throw new Error(`File not found: ${uri}`);
  return files[uri];
});

export const getInfoAsync = jest.fn(async (uri: string) => ({
  exists: uri in files,
  uri,
  size: (files[uri] ?? "").length,
}));

export const deleteAsync = jest.fn(async (uri: string) => { delete files[uri]; });
```

- [ ] **Step 4: Write `__mocks__/expo-router.ts`**

```ts
export const __pushCalls: Array<{ pathname: string; params: Record<string, string> }> = [];
export const __reset = () => { __pushCalls.length = 0; };
export const router = {
  push: jest.fn((arg: { pathname: string; params: Record<string, string> }) => {
    __pushCalls.push(arg);
  }),
};
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/__mocks__
git commit -m "test(sp3): add expo module mocks for jest"
```

---

## Task 3: Scheduler — schedule per offset, skip past

**Files:**
- Create: `mobile-app/lib/notifications/scheduler.ts`
- Create: `mobile-app/__tests__/notifications/scheduler.test.ts`

- [ ] **Step 1: Write failing test for `scheduleForTask`**

Create `mobile-app/__tests__/notifications/scheduler.test.ts`:

```ts
jest.mock("expo-notifications");
import * as Notifications from "expo-notifications";
import { scheduleForTask } from "@/lib/notifications/scheduler";
import type { ComplianceTask } from "@/types";

const mock = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __getScheduled: () => Array<{ identifier: string; content: { data: { taskId: string; offsetDays: number } }; trigger: { date: Date } }>;
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
    const task = makeTask({ dueDate: "2026-05-26" }); // 7 days out
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
    const task = makeTask({ dueDate: "2026-05-22" }); // 3 days out
    await scheduleForTask(task, [1, 3, 7]);
    const items = mock.__getScheduled();
    expect(items.map((i) => i.content.data.offsetDays).sort()).toEqual([1, 3]);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd mobile-app && npx jest scheduler.test --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/notifications/scheduler'`.

- [ ] **Step 3: Implement `scheduler.ts` minimally**

Create `mobile-app/lib/notifications/scheduler.ts`:

```ts
import * as Notifications from "expo-notifications";

import type { ComplianceTask } from "@/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function triggerDate(dueDate: string, offsetDays: number): Date {
  const due = new Date(dueDate);
  due.setHours(9, 0, 0, 0);
  return new Date(due.getTime() - offsetDays * MS_PER_DAY);
}

export async function scheduleForTask(task: ComplianceTask, offsets: number[]): Promise<string[]> {
  const granted = await ensurePermission();
  if (!granted) return [];
  const now = Date.now();
  const identifiers: string[] = [];
  for (const offsetDays of offsets) {
    const when = triggerDate(task.dueDate, offsetDays);
    if (when.getTime() <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${task.title}`,
        body: `Due in ${offsetDays} day${offsetDays === 1 ? "" : "s"}.`,
        data: { taskId: task.id, offsetDays },
      },
      trigger: { date: when },
    } as unknown as Parameters<typeof Notifications.scheduleNotificationAsync>[0]);
    identifiers.push(id);
  }
  return identifiers;
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `cd mobile-app && npx jest scheduler.test --no-coverage`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/notifications/scheduler.ts mobile-app/__tests__/notifications/scheduler.test.ts
git commit -m "feat(sp3): scheduleForTask with past-offset skipping"
```

---

## Task 4: Scheduler — cancelForTask + rescheduleAll idempotent

**Files:**
- Modify: `mobile-app/lib/notifications/scheduler.ts`
- Modify: `mobile-app/__tests__/notifications/scheduler.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `mobile-app/__tests__/notifications/scheduler.test.ts` inside the file (after the existing `describe`):

```ts
import { cancelForTask, rescheduleAll } from "@/lib/notifications/scheduler";

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
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-26" }), makeTask({ id: "b", dueDate: "2026-05-28" })];
    const settings = { remindersEnabled: true, reminderOffsets: [1, 3] };
    await rescheduleAll(tasks, settings);
    const first = mock.__getScheduled().map((s) => `${s.content.data.taskId}:${s.content.data.offsetDays}`).sort();
    await rescheduleAll(tasks, settings);
    const second = mock.__getScheduled().map((s) => `${s.content.data.taskId}:${s.content.data.offsetDays}`).sort();
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
```

- [ ] **Step 2: Run, expect failures**

Run: `cd mobile-app && npx jest scheduler.test --no-coverage`
Expected: FAIL — `cancelForTask`/`rescheduleAll` not exported.

- [ ] **Step 3: Implement in `scheduler.ts`**

Append to `mobile-app/lib/notifications/scheduler.ts`:

```ts
export type ReminderSettings = {
  remindersEnabled: boolean;
  reminderOffsets: number[];
};

export async function cancelForTask(taskId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of all) {
    const data = (item as unknown as { content: { data?: { taskId?: string } }; identifier: string });
    if (data.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(data.identifier);
    }
  }
}

export async function rescheduleAll(tasks: ComplianceTask[], settings: ReminderSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.remindersEnabled) return;
  const granted = await ensurePermission();
  if (!granted) return;
  for (const task of tasks) {
    await scheduleForTask(task, settings.reminderOffsets);
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd mobile-app && npx jest scheduler.test --no-coverage`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/notifications/scheduler.ts mobile-app/__tests__/notifications/scheduler.test.ts
git commit -m "feat(sp3): cancelForTask + idempotent rescheduleAll"
```

---

## Task 5: Notifications barrel + handler with deep-link

**Files:**
- Create: `mobile-app/lib/notifications/handler.ts`
- Create: `mobile-app/lib/notifications/index.ts`
- Create: `mobile-app/__tests__/notifications/handler.test.ts`

- [ ] **Step 1: Write failing test for handler**

Create `mobile-app/__tests__/notifications/handler.test.ts`:

```ts
jest.mock("expo-notifications");
jest.mock("expo-router");

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerNotificationTapHandler } from "@/lib/notifications/handler";

const notifMock = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __fireResponse: (taskId: string) => void;
};
const routerMock = router as unknown as typeof router & {
  push: jest.Mock;
};
const { __reset: resetRouter, __pushCalls } = require("expo-router") as { __reset: () => void; __pushCalls: Array<{ pathname: string; params: Record<string, string> }> };

beforeEach(() => {
  notifMock.__reset();
  resetRouter();
});

describe("registerNotificationTapHandler", () => {
  it("pushes /tasks/[id] with the payload taskId on tap", () => {
    const subscription = registerNotificationTapHandler();
    notifMock.__fireResponse("task-42");
    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(__pushCalls[0]).toEqual({ pathname: "/tasks/[id]", params: { id: "task-42" } });
    subscription.remove();
  });

  it("returns the subscription so the caller can unregister", () => {
    const subscription = registerNotificationTapHandler();
    expect(typeof subscription.remove).toBe("function");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd mobile-app && npx jest handler.test --no-coverage`
Expected: FAIL — handler module missing.

- [ ] **Step 3: Implement handler + barrel**

Create `mobile-app/lib/notifications/handler.ts`:

```ts
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export function registerNotificationTapHandler(): { remove: () => void } {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { taskId?: string } | undefined;
    if (data?.taskId) {
      router.push({ pathname: "/tasks/[id]", params: { id: data.taskId } });
    }
  });
}
```

Create `mobile-app/lib/notifications/index.ts`:

```ts
export { scheduleForTask, cancelForTask, rescheduleAll, ensurePermission } from "./scheduler";
export type { ReminderSettings } from "./scheduler";
export { registerNotificationTapHandler } from "./handler";
```

- [ ] **Step 4: Run, expect pass**

Run: `cd mobile-app && npx jest notifications --no-coverage`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/notifications/handler.ts mobile-app/lib/notifications/index.ts mobile-app/__tests__/notifications/handler.test.ts
git commit -m "feat(sp3): notification tap handler deep-links to task detail"
```

---

## Task 6: Audit CSV/JSON formatters (RFC 4180)

**Files:**
- Create: `mobile-app/lib/audit/export.ts`
- Create: `mobile-app/__tests__/audit/export.test.ts`

- [ ] **Step 1: Write failing tests for formatters**

Create `mobile-app/__tests__/audit/export.test.ts`:

```ts
jest.mock("expo-file-system");
jest.mock("expo-sharing");

import { formatCsv, formatJson } from "@/lib/audit/export";
import type { AuditLogEntry } from "@/types";

function makeEntry(over: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: "log-1",
    type: "login",
    userEmail: "farmer@pdp.test",
    timestamp: "2026-05-19T12:00:00.000Z",
    details: "Farmer session started.",
    ...over,
  };
}

describe("formatCsv", () => {
  it("emits the RFC 4180 header", () => {
    const out = formatCsv([]);
    expect(out).toBe("id,timestamp,type,actor,details\n");
  });

  it("escapes commas, quotes and newlines in details", () => {
    const out = formatCsv([
      makeEntry({ id: "log-1", details: 'has, comma' }),
      makeEntry({ id: "log-2", details: 'has "quote"' }),
      makeEntry({ id: "log-3", details: "has\nnewline" }),
    ]);
    const lines = out.split("\n");
    expect(lines[1]).toBe('log-1,2026-05-19T12:00:00.000Z,login,farmer@pdp.test,"has, comma"');
    expect(lines[2]).toBe('log-2,2026-05-19T12:00:00.000Z,login,farmer@pdp.test,"has ""quote"""');
    expect(lines[3]).toBe('log-3,2026-05-19T12:00:00.000Z,login,farmer@pdp.test,"has');
    expect(lines[4]).toBe('newline"');
  });

  it("does not quote plain values", () => {
    const out = formatCsv([makeEntry({ id: "log-1", details: "plain" })]);
    const lines = out.split("\n");
    expect(lines[1]).toBe("log-1,2026-05-19T12:00:00.000Z,login,farmer@pdp.test,plain");
  });
});

describe("formatJson", () => {
  it("emits a stable array shape", () => {
    const out = formatJson([makeEntry()]);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { id: "log-1", timestamp: "2026-05-19T12:00:00.000Z", type: "login", actor: "farmer@pdp.test", details: "Farmer session started." },
    ]);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd mobile-app && npx jest audit/export --no-coverage`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement formatters**

Create `mobile-app/lib/audit/export.ts`:

```ts
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { AuditLogEntry } from "@/types";

const CSV_HEADER = "id,timestamp,type,actor,details";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowFor(entry: AuditLogEntry): string {
  return [entry.id, entry.timestamp, entry.type, entry.userEmail, entry.details].map(csvEscape).join(",");
}

export function formatCsv(entries: AuditLogEntry[]): string {
  if (entries.length === 0) return `${CSV_HEADER}\n`;
  return `${CSV_HEADER}\n${entries.map(rowFor).join("\n")}`;
}

export function formatJson(entries: AuditLogEntry[]): string {
  const shaped = entries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    actor: e.userEmail,
    details: e.details,
  }));
  return JSON.stringify(shaped, null, 2);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd mobile-app && npx jest audit/export --no-coverage`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/audit/export.ts mobile-app/__tests__/audit/export.test.ts
git commit -m "feat(sp3): RFC 4180 CSV + JSON audit formatters"
```

---

## Task 7: `exportToFile` with chunked writes + `shareFile`

**Files:**
- Modify: `mobile-app/lib/audit/export.ts`
- Modify: `mobile-app/__tests__/audit/export.test.ts`
- Create: `mobile-app/lib/audit/index.ts`

- [ ] **Step 1: Append failing tests**

Append to `mobile-app/__tests__/audit/export.test.ts`:

```ts
import { exportToFile, shareFile } from "@/lib/audit/export";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const fsMock = FileSystem as unknown as typeof FileSystem & {
  __reset: () => void;
  __read: (uri: string) => string;
  __exists: (uri: string) => boolean;
};
const shareMock = Sharing as unknown as typeof Sharing & {
  __reset: () => void;
  __calls: string[];
  __setAvailable: (v: boolean) => void;
};

beforeEach(() => {
  fsMock.__reset();
  shareMock.__reset();
  (FileSystem.writeAsStringAsync as jest.Mock).mockClear();
});

describe("exportToFile", () => {
  it("writes CSV to file:///cache/audit-<from>-to-<to>.csv with matching contents", async () => {
    const uri = await exportToFile([makeEntry()], "csv", "2026-04-19", "2026-05-19");
    expect(uri).toBe("file:///cache/audit-20260419-to-20260519.csv");
    expect(fsMock.__exists(uri)).toBe(true);
    expect(fsMock.__read(uri)).toBe(formatCsv([makeEntry()]));
  });

  it("writes JSON to a .json file", async () => {
    const uri = await exportToFile([makeEntry()], "json", "2026-04-19", "2026-05-19");
    expect(uri).toBe("file:///cache/audit-20260419-to-20260519.json");
    expect(fsMock.__read(uri)).toBe(formatJson([makeEntry()]));
  });

  it("chunks writes for >1000 entries", async () => {
    const big: AuditLogEntry[] = [];
    for (let i = 0; i < 2500; i++) big.push(makeEntry({ id: `log-${i}` }));
    const uri = await exportToFile(big, "csv", "2026-04-19", "2026-05-19");
    expect(fsMock.__exists(uri)).toBe(true);
    expect(fsMock.__read(uri)).toBe(formatCsv(big));
    // Initial write + 2 appended chunks of 1000 (entries 1000-1999 and 2000-2499) = 3 writes minimum.
    expect((FileSystem.writeAsStringAsync as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe("shareFile", () => {
  it("invokes Sharing.shareAsync when available", async () => {
    await shareFile("file:///cache/audit-x.csv");
    expect(shareMock.__calls).toEqual(["file:///cache/audit-x.csv"]);
  });

  it("no-ops when sharing is unavailable", async () => {
    shareMock.__setAvailable(false);
    await shareFile("file:///cache/audit-x.csv");
    expect(shareMock.__calls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd mobile-app && npx jest audit/export --no-coverage`
Expected: FAIL — `exportToFile`/`shareFile` not exported.

- [ ] **Step 3: Implement chunked write + share**

Replace the bottom of `mobile-app/lib/audit/export.ts` (append):

```ts
const CHUNK_SIZE = 1000;

function compactDate(iso: string): string {
  return iso.replace(/-/g, "").slice(0, 8);
}

export async function exportToFile(
  entries: AuditLogEntry[],
  format: "csv" | "json",
  fromDate: string,
  toDate: string,
): Promise<string> {
  const ext = format === "csv" ? "csv" : "json";
  const uri = `${FileSystem.cacheDirectory}audit-${compactDate(fromDate)}-to-${compactDate(toDate)}.${ext}`;

  if (format === "json") {
    await FileSystem.writeAsStringAsync(uri, formatJson(entries));
    return uri;
  }

  if (entries.length <= CHUNK_SIZE) {
    await FileSystem.writeAsStringAsync(uri, formatCsv(entries));
    return uri;
  }

  // Chunked CSV: header + first chunk, then append remaining chunks.
  const head = entries.slice(0, CHUNK_SIZE);
  let buffer = formatCsv(head);
  await FileSystem.writeAsStringAsync(uri, buffer);

  for (let i = CHUNK_SIZE; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map((e) => [e.id, e.timestamp, e.type, e.userEmail, e.details].map(csvEscape).join(",")).join("\n");
    buffer = `${buffer}\n${rows}`;
    await FileSystem.writeAsStringAsync(uri, buffer);
  }

  return uri;
}

export async function shareFile(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(uri);
}
```

Create `mobile-app/lib/audit/index.ts`:

```ts
export { formatCsv, formatJson, exportToFile, shareFile } from "./export";
```

- [ ] **Step 4: Run, expect pass**

Run: `cd mobile-app && npx jest audit/export --no-coverage`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/audit/export.ts mobile-app/lib/audit/index.ts mobile-app/__tests__/audit/export.test.ts
git commit -m "feat(sp3): exportToFile with chunked CSV writes + shareFile"
```

---

## Task 8: Wire AppContext to reschedule + share

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`

- [ ] **Step 1: Update `exportAuditLog` signature in the `AppContextValue` type**

Edit `mobile-app/context/AppContext.tsx` line 80 from:

```ts
  exportAuditLog: (fromDate: string, toDate: string, format: "csv" | "json") => Promise<string>;
```

to:

```ts
  exportAuditLog: (fromDate: string, toDate: string, format: "csv" | "json") => Promise<string>; // returns file URI
```

(Return type stays `string` — now it is a URI.)

- [ ] **Step 2: Add imports at the top**

Add below the existing imports in `mobile-app/context/AppContext.tsx`:

```ts
import { deriveTasks } from "@/lib/tasks";
import { rescheduleAll, cancelForTask } from "@/lib/notifications";
import { exportToFile, shareFile } from "@/lib/audit";
```

- [ ] **Step 3: Add a reschedule effect after the save effect**

Insert after the `useEffect` that calls `saveState`:

```ts
  useEffect(() => {
    if (!isHydrated) return;
    const tasks = deriveTasks(state.farmProfile);
    rescheduleAll(tasks, {
      remindersEnabled: state.remindersEnabled,
      reminderOffsets: state.reminderOffsets,
    }).catch((err) => {
      console.warn("rescheduleAll failed", err);
    });
  }, [
    isHydrated,
    state.remindersEnabled,
    state.reminderOffsets,
    state.farmProfile,
  ]);
```

- [ ] **Step 4: Rewrite `exportAuditLog` to use the new module**

Replace the existing `exportAuditLog` body (currently lines ~574–600):

```ts
  async function exportAuditLog(fromDate: string, toDate: string, format: "csv" | "json"): Promise<string> {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const filtered = state.auditLogs
      .filter((entry) => {
        const ts = new Date(entry.timestamp);
        return ts >= from && ts <= to;
      })
      .map((e) => ({
        id: e.id,
        type: e.type,
        userEmail: e.userEmail,
        timestamp: e.timestamp,
        details: e.details,
      }));

    const uri = await exportToFile(filtered, format, fromDate, toDate);
    await appendLog(
      "audit.export",
      `Exported ${filtered.length} audit log entries (${format.toUpperCase()}) from ${fromDate} to ${toDate}.`,
    );
    await shareFile(uri);
    return uri;
  }
```

- [ ] **Step 5: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add mobile-app/context/AppContext.tsx
git commit -m "feat(sp3): wire AppContext to rescheduleAll + file-based exportAuditLog"
```

---

## Task 9: Register notification tap handler in `_layout.tsx`

**Files:**
- Modify: `mobile-app/app/_layout.tsx`

- [ ] **Step 1: Add effect that registers exactly once**

Replace `mobile-app/app/_layout.tsx` with:

```tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppProvider, useApp } from "@/context/AppContext";
import { registerNotificationTapHandler } from "@/lib/notifications";

function RootNavigator() {
  const { isHydrated } = useApp();

  useEffect(() => {
    const sub = registerNotificationTapHandler();
    return () => sub.remove();
  }, []);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f0e6",
        }}
      >
        <ActivityIndicator size="large" color="#3f6a52" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/app/_layout.tsx
git commit -m "feat(sp3): register notification tap handler at app root"
```

---

## Task 10: Audit-log screen — date range + format toggle + share UX

**Files:**
- Modify: `mobile-app/app/(tabs)/audit-log.tsx`

- [ ] **Step 1: Replace export card body**

In `mobile-app/app/(tabs)/audit-log.tsx`, replace the state block and `handleGenerateExport` and the export card markup:

Replace lines 43–56 (state + handler) with:

```tsx
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState(thirtyAgo);
  const [exportTo, setExportTo] = useState(today);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportUri, setExportUri] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

  function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
  }

  async function handleGenerateExport() {
    setExportError("");
    setExportMessage("");
    if (!isValidDate(exportFrom) || !isValidDate(exportTo)) {
      setExportError("Enter dates as YYYY-MM-DD.");
      return;
    }
    if (new Date(exportFrom) > new Date(exportTo)) {
      setExportError("From-date must be on or before the to-date.");
      return;
    }
    try {
      const uri = await exportAuditLog(exportFrom, exportTo, exportFormat);
      setExportUri(uri);
      setExportMessage(`Exported to ${uri}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    }
  }
```

- [ ] **Step 2: Replace the preview/copy block (lines ~114–129) with file URI + error**

Replace the conditional block that renders `exportContent` and the copy button with:

```tsx
          {exportUri ? (
            <View style={styles.exportMsg}>
              <Ionicons name="document-outline" size={14} color="#2a5a8a" />
              <AppText variant="caption" tone="muted">{exportUri}</AppText>
            </View>
          ) : null}

          {exportError ? (
            <View style={[styles.exportMsg, styles.exportErr]}>
              <Ionicons name="alert-circle" size={14} color="#b5332a" />
              <AppText variant="caption" tone="danger">{exportError}</AppText>
            </View>
          ) : null}
```

- [ ] **Step 3: Remove the unused `handleCopy` function and preview styles**

Delete the `handleCopy` function (lines ~57–66) and the `previewBox`/`previewText` style entries. Add a `exportErr` style:

```ts
  exportErr: {
    backgroundColor: "#fdf0ef",
  },
```

- [ ] **Step 4: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/app/(tabs)/audit-log.tsx
git commit -m "feat(sp3): audit-log screen exports via file share with date range + toggle"
```

---

## Task 11: Integration tests — schedule/disable + export-writes-file

**Files:**
- Create: `mobile-app/__tests__/integration/notifications-export.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `mobile-app/__tests__/integration/notifications-export.test.ts`:

```ts
jest.mock("expo-notifications");
jest.mock("expo-sharing");
jest.mock("expo-file-system");

import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { rescheduleAll } from "@/lib/notifications";
import { exportToFile, shareFile, formatJson } from "@/lib/audit";
import type { AuditLogEntry, ComplianceTask } from "@/types";

const notif = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __getScheduled: () => Array<{ content: { data: { taskId: string; offsetDays: number } } }>;
};
const fs = FileSystem as unknown as typeof FileSystem & { __reset: () => void; __read: (u: string) => string; __exists: (u: string) => boolean };
const share = Sharing as unknown as typeof Sharing & { __reset: () => void; __calls: string[] };

const FIXED_NOW = new Date("2026-05-19T12:00:00.000Z");

function makeTask(id: string, dueDate: string): ComplianceTask {
  return { id, title: id, guidance: "", whatToDo: "", dueDate, status: "Not started", source: "", riskLevel: "low", penaltyExplanation: "" };
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
      { id: "log-1", type: "login", userEmail: "farmer@pdp.test", timestamp: "2026-05-10T00:00:00.000Z", details: "in" },
      { id: "log-2", type: "logout", userEmail: "farmer@pdp.test", timestamp: "2026-05-18T00:00:00.000Z", details: "out" },
    ];
    const uri = await exportToFile(entries, "json", "2026-04-19", "2026-05-19");
    expect(uri).toBe("file:///cache/audit-20260419-to-20260519.json");
    expect(fs.__exists(uri)).toBe(true);
    expect(fs.__read(uri)).toBe(formatJson(entries));

    await shareFile(uri);
    expect(share.__calls).toEqual([uri]);
  });
});
```

- [ ] **Step 2: Run, expect pass (modules already exist)**

Run: `cd mobile-app && npx jest integration --no-coverage`
Expected: PASS (2 tests).

- [ ] **Step 3: Run the full suite**

Run: `cd mobile-app && npx jest --no-coverage`
Expected: all tests pass (scheduler 6 + handler 2 + audit 9 + integration 2 = 19).

- [ ] **Step 4: Commit**

```bash
git add mobile-app/__tests__/integration/notifications-export.test.ts
git commit -m "test(sp3): integration tests for reschedule, disable, and file export"
```

---

## Task 12: Final smoke — type-check + lint

**Files:** none modified.

- [ ] **Step 1: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Lint**

Run: `cd mobile-app && npm run lint`
Expected: passes (or only pre-existing warnings unrelated to SP3 files).

- [ ] **Step 3: Final test run**

Run: `cd mobile-app && npx jest --no-coverage`
Expected: 19/19 pass.

- [ ] **Step 4: Commit any incidental formatting**

```bash
git add -p
git commit -m "chore(sp3): final cleanup" || true
```
