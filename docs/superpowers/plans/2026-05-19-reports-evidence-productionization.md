# Reports & Evidence Productionization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productionize the evidence flow (real picker, durable per-app storage, per-row upload status with retry/remove, banner for failures, report-detail preview) and route report submission through SP1's `syncQueue` with terminal-state tracking and audit events.

**Architecture:** Two new module families — `mobile-app/lib/evidence/{picker,storage,index}.ts` wrap Expo image/document/file APIs and copy picked files into `${FileSystem.documentDirectory}evidence/<id>.<ext>` for durability; `mobile-app/lib/reports/{submission,index}.ts` wraps `AppContext.submitReport` over the SP1 `syncQueue` so submissions survive restart and resolve to `acknowledged | conflict | failed`. Evidence metadata becomes a first-class `syncQueue` item (`kind: "evidence"`), so per-row upload status derives from `syncQueue.subscribe` rather than a parallel state machine. UI changes are confined to `app/(tabs)/reports.tsx` (banner, preview section, per-row controls).

**Tech Stack:** TypeScript, React Native, Expo (`expo-image-picker`, `expo-document-picker`, `expo-file-system`), Jest + ts-jest, React Native Testing Library. Depends on SP1's `mobile-app/lib/sync/` module — specifically `syncQueue.enqueue(item)`, `syncQueue.subscribe(listener)`, `syncQueue.getSnapshot()`, and the `SyncQueueItem` lifecycle `pending | in-flight | ok | conflict | error`. SP1 plan: `docs/superpowers/plans/2026-05-19-offline-sync-hardening.md`.

**SP1 contract assumed (do not redefine):**

```ts
// mobile-app/lib/sync/index.ts (provided by SP1)
export type SyncQueueItemState = "pending" | "in-flight" | "ok" | "conflict" | "error";
export type SyncQueueItem<P = unknown> = {
  id: string;
  kind: string;        // e.g. "report" | "evidence" | "profile"
  op: string;          // e.g. "submit" | "upload" | "remove"
  payload: P;
  state: SyncQueueItemState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};
export const syncQueue: {
  enqueue<P>(input: { kind: string; op: string; payload: P; id?: string }): SyncQueueItem<P>;
  subscribe(listener: (items: SyncQueueItem[]) => void): () => void;
  getSnapshot(): SyncQueueItem[];
};
```

---

## File map

Create:
- `mobile-app/lib/evidence/picker.ts`
- `mobile-app/lib/evidence/storage.ts`
- `mobile-app/lib/evidence/index.ts`
- `mobile-app/lib/reports/submission.ts`
- `mobile-app/lib/reports/index.ts`
- `mobile-app/__tests__/evidence/picker.test.ts`
- `mobile-app/__tests__/evidence/storage.test.ts`
- `mobile-app/__tests__/reports/submission.test.ts`
- `mobile-app/__tests__/integration/evidence-report-flow.test.tsx`
- `mobile-app/__mocks__/expo-image-picker.ts`
- `mobile-app/__mocks__/expo-document-picker.ts`
- `mobile-app/__mocks__/expo-file-system.ts`
- `mobile-app/jest.config.js`
- `mobile-app/jest.setup.ts`

Modify:
- `mobile-app/package.json` (add deps + test scripts)
- `mobile-app/types.ts` (add `submissionState`, extend `AuditEventType`, extend `SyncQueueItem` kinds)
- `mobile-app/context/AppContext.tsx` (rewire `addEvidence`, `removeEvidence`, `submitReport` through new modules + queue subscription)
- `mobile-app/app/(tabs)/reports.tsx` (banner, evidence section in preview, picker entry, per-row UI)

---

## Task 1: Install Expo media dependencies and jest scaffolding

**Files:**
- Modify: `mobile-app/package.json`
- Create: `mobile-app/jest.config.js`
- Create: `mobile-app/jest.setup.ts`

- [ ] **Step 1: Add dependencies and test scripts**

Edit `mobile-app/package.json` to read:

```json
{
  "name": "pdp-mobile-prototype",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.13",
    "expo-document-picker": "~13.0.0",
    "expo-file-system": "~18.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-router": "~6.0.23",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-web": "^0.21.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.7.0",
    "@types/jest": "^29.5.12",
    "@types/react": "~19.1.10",
    "babel-preset-expo": "~54.0.6",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0",
    "ts-jest": "^29.1.2",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: Create jest config**

Create `mobile-app/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/__tests__/**/*.test.(ts|tsx)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo|expo-modules-core|@react-navigation)/)",
  ],
};
```

- [ ] **Step 3: Create jest setup**

Create `mobile-app/jest.setup.ts`:

```ts
// Silence noisy RN warnings in tests.
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", () => ({}), { virtual: true });
```

- [ ] **Step 4: Install dependencies**

Run: `cd mobile-app && npm install`
Expected: success; new packages in `node_modules`.

- [ ] **Step 5: Verify jest discovers no tests yet**

Run: `cd mobile-app && npx jest --passWithNoTests`
Expected: exit 0, "No tests found, exiting with code 0".

- [ ] **Step 6: Commit**

```bash
git add mobile-app/package.json mobile-app/package-lock.json mobile-app/jest.config.js mobile-app/jest.setup.ts
git commit -m "chore(sp2): add expo media deps and jest scaffolding"
```

---

## Task 2: Mock modules for Expo media APIs

**Files:**
- Create: `mobile-app/__mocks__/expo-image-picker.ts`
- Create: `mobile-app/__mocks__/expo-document-picker.ts`
- Create: `mobile-app/__mocks__/expo-file-system.ts`

- [ ] **Step 1: Create expo-image-picker mock**

Create `mobile-app/__mocks__/expo-image-picker.ts`:

```ts
export const MediaTypeOptions = { Images: "Images" } as const;
export const PermissionStatus = { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" } as const;

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({ status: "granted" }));
export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: "file:///tmp/pick.jpg", fileName: "pick.jpg", fileSize: 1024, mimeType: "image/jpeg" }],
}));
```

- [ ] **Step 2: Create expo-document-picker mock**

Create `mobile-app/__mocks__/expo-document-picker.ts`:

```ts
export const getDocumentAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: "file:///tmp/pick.pdf", name: "pick.pdf", size: 2048, mimeType: "application/pdf" }],
}));
```

- [ ] **Step 3: Create expo-file-system mock**

Create `mobile-app/__mocks__/expo-file-system.ts`:

```ts
export const documentDirectory = "file:///mock-docs/";

const files = new Map<string, true>();

export const makeDirectoryAsync = jest.fn(async (_dir: string, _opts?: { intermediates?: boolean }) => {});
export const copyAsync = jest.fn(async ({ from, to }: { from: string; to: string }) => {
  files.set(to, true);
});
export const deleteAsync = jest.fn(async (uri: string, _opts?: { idempotent?: boolean }) => {
  files.delete(uri);
});
export const getInfoAsync = jest.fn(async (uri: string) => ({ exists: files.has(uri), uri }));

export const __resetFs = () => {
  files.clear();
  (makeDirectoryAsync as jest.Mock).mockClear();
  (copyAsync as jest.Mock).mockClear();
  (deleteAsync as jest.Mock).mockClear();
  (getInfoAsync as jest.Mock).mockClear();
};
```

- [ ] **Step 4: Verify mocks compile**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/__mocks__
git commit -m "test(sp2): add expo-image-picker, expo-document-picker, expo-file-system mocks"
```

---

## Task 3: `lib/evidence/picker` — pickPhoto (happy path)

**Files:**
- Create: `mobile-app/lib/evidence/picker.ts`
- Create: `mobile-app/__tests__/evidence/picker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile-app/__tests__/evidence/picker.test.ts`:

```ts
jest.mock("expo-image-picker");
jest.mock("expo-document-picker");

import * as ImagePicker from "expo-image-picker";
import { pickPhoto } from "@/lib/evidence/picker";

describe("pickPhoto", () => {
  beforeEach(() => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/x.jpg", fileName: "x.jpg", fileSize: 4096, mimeType: "image/jpeg" }],
    });
  });

  it("returns the asset shape on success", async () => {
    const result = await pickPhoto();
    expect(result).toEqual({
      ok: true,
      asset: { uri: "file:///tmp/x.jpg", fileName: "x.jpg", sizeBytes: 4096, mimeType: "image/jpeg" },
    });
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `cd mobile-app && npx jest __tests__/evidence/picker.test.ts`
Expected: FAIL with "Cannot find module '@/lib/evidence/picker'".

- [ ] **Step 3: Implement minimal pickPhoto**

Create `mobile-app/lib/evidence/picker.ts`:

```ts
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export type PickedAsset = {
  uri: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
};

export type PickResult =
  | { ok: true; asset: PickedAsset }
  | { ok: false; reason: "cancelled" | "permission_denied" | "unknown"; message?: string };

export async function pickPhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return { ok: false, reason: "cancelled" };
  }
  const a = res.assets[0];
  return {
    ok: true,
    asset: {
      uri: a.uri,
      fileName: a.fileName ?? a.uri.split("/").pop() ?? "photo.jpg",
      sizeBytes: a.fileSize ?? 0,
      mimeType: a.mimeType ?? "image/jpeg",
    },
  };
}

export async function pickDocument(): Promise<PickResult> {
  throw new Error("not implemented yet");
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `cd mobile-app && npx jest __tests__/evidence/picker.test.ts -t "returns the asset shape on success"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/evidence/picker.ts mobile-app/__tests__/evidence/picker.test.ts
git commit -m "feat(sp2): pickPhoto happy path with permission gate"
```

---

## Task 4: picker — cancel and permission denial

**Files:**
- Modify: `mobile-app/__tests__/evidence/picker.test.ts`

- [ ] **Step 1: Add failing tests for cancel + permission denial**

Append to `mobile-app/__tests__/evidence/picker.test.ts` inside the `describe("pickPhoto", ...)` block:

```ts
  it("returns cancelled when the user dismisses the picker", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await pickPhoto();
    expect(result).toEqual({ ok: false, reason: "cancelled" });
  });

  it("returns permission_denied when OS rejects permission", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "denied" });
    const result = await pickPhoto();
    expect(result).toEqual({ ok: false, reason: "permission_denied" });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests (expect pass — already implemented)**

Run: `cd mobile-app && npx jest __tests__/evidence/picker.test.ts`
Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/__tests__/evidence/picker.test.ts
git commit -m "test(sp2): cover pickPhoto cancel and permission denial"
```

---

## Task 5: picker — pickDocument

**Files:**
- Modify: `mobile-app/__tests__/evidence/picker.test.ts`
- Modify: `mobile-app/lib/evidence/picker.ts`

- [ ] **Step 1: Add failing test for pickDocument**

Append to `mobile-app/__tests__/evidence/picker.test.ts`:

```ts
import * as DocumentPicker from "expo-document-picker";
import { pickDocument } from "@/lib/evidence/picker";

describe("pickDocument", () => {
  it("returns the asset shape on success", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///tmp/y.pdf", name: "y.pdf", size: 8192, mimeType: "application/pdf" }],
    });
    const result = await pickDocument();
    expect(result).toEqual({
      ok: true,
      asset: { uri: "file:///tmp/y.pdf", fileName: "y.pdf", sizeBytes: 8192, mimeType: "application/pdf" },
    });
  });

  it("returns cancelled when the user dismisses", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await pickDocument();
    expect(result).toEqual({ ok: false, reason: "cancelled" });
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `cd mobile-app && npx jest __tests__/evidence/picker.test.ts -t "pickDocument"`
Expected: FAIL with "not implemented yet".

- [ ] **Step 3: Replace `pickDocument` body**

In `mobile-app/lib/evidence/picker.ts`, replace the body of `pickDocument`:

```ts
export async function pickDocument(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return { ok: false, reason: "cancelled" };
  }
  const a = res.assets[0];
  return {
    ok: true,
    asset: {
      uri: a.uri,
      fileName: a.name ?? a.uri.split("/").pop() ?? "document.pdf",
      sizeBytes: a.size ?? 0,
      mimeType: a.mimeType ?? "application/pdf",
    },
  };
}
```

- [ ] **Step 4: Run tests (expect pass)**

Run: `cd mobile-app && npx jest __tests__/evidence/picker.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/evidence/picker.ts mobile-app/__tests__/evidence/picker.test.ts
git commit -m "feat(sp2): pickDocument with cancel handling"
```

---

## Task 6: `lib/evidence/storage` — copyIntoAppDocs

**Files:**
- Create: `mobile-app/lib/evidence/storage.ts`
- Create: `mobile-app/__tests__/evidence/storage.test.ts`

- [ ] **Step 1: Write failing test**

Create `mobile-app/__tests__/evidence/storage.test.ts`:

```ts
jest.mock("expo-file-system");

import * as FileSystem from "expo-file-system";
import { copyIntoAppDocs, remove } from "@/lib/evidence/storage";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __resetFs } = require("expo-file-system");

describe("copyIntoAppDocs", () => {
  beforeEach(() => __resetFs());

  it("copies the file under documentDirectory/evidence/<id>.<ext> and returns the new uri", async () => {
    const uri = await copyIntoAppDocs("file:///tmp/x.jpg", "evidence-1", "jpg");
    expect(uri).toBe("file:///mock-docs/evidence/evidence-1.jpg");
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///mock-docs/evidence",
      { intermediates: true },
    );
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: "file:///tmp/x.jpg",
      to: "file:///mock-docs/evidence/evidence-1.jpg",
    });
  });

  it("is idempotent: copying the same id twice does not throw and ends with the file present", async () => {
    await copyIntoAppDocs("file:///tmp/x.jpg", "evidence-1", "jpg");
    await copyIntoAppDocs("file:///tmp/x.jpg", "evidence-1", "jpg");
    const info = await FileSystem.getInfoAsync("file:///mock-docs/evidence/evidence-1.jpg");
    expect(info.exists).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `cd mobile-app && npx jest __tests__/evidence/storage.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement storage module**

Create `mobile-app/lib/evidence/storage.ts`:

```ts
import * as FileSystem from "expo-file-system";

const EVIDENCE_SUBDIR = "evidence";

function dir(): string {
  const base = FileSystem.documentDirectory ?? "";
  return `${base}${EVIDENCE_SUBDIR}`;
}

export function buildPersistentUri(id: string, ext: string): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase() || "bin";
  return `${dir()}/${id}.${safeExt}`;
}

export async function copyIntoAppDocs(srcUri: string, id: string, ext: string): Promise<string> {
  const target = buildPersistentUri(id, ext);
  await FileSystem.makeDirectoryAsync(dir(), { intermediates: true });
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    await FileSystem.copyAsync({ from: srcUri, to: target });
  }
  return target;
}

export async function remove(persistentUri: string): Promise<void> {
  await FileSystem.deleteAsync(persistentUri, { idempotent: true });
}
```

- [ ] **Step 4: Run tests (expect pass)**

Run: `cd mobile-app && npx jest __tests__/evidence/storage.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/evidence/storage.ts mobile-app/__tests__/evidence/storage.test.ts
git commit -m "feat(sp2): copyIntoAppDocs with idempotent semantics"
```

---

## Task 7: storage — remove idempotency

**Files:**
- Modify: `mobile-app/__tests__/evidence/storage.test.ts`

- [ ] **Step 1: Add failing test**

Append a new describe block to `mobile-app/__tests__/evidence/storage.test.ts`:

```ts
describe("remove", () => {
  beforeEach(() => __resetFs());

  it("deletes the persistent file", async () => {
    const uri = await copyIntoAppDocs("file:///tmp/x.jpg", "ev-2", "jpg");
    await remove(uri);
    const info = await FileSystem.getInfoAsync(uri);
    expect(info.exists).toBe(false);
  });

  it("is idempotent: removing a non-existent file does not throw", async () => {
    await expect(remove("file:///mock-docs/evidence/missing.jpg")).resolves.toBeUndefined();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///mock-docs/evidence/missing.jpg",
      { idempotent: true },
    );
  });
});
```

- [ ] **Step 2: Run tests (expect pass — already covered by `{ idempotent: true }`)**

Run: `cd mobile-app && npx jest __tests__/evidence/storage.test.ts`
Expected: 4 passing.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/__tests__/evidence/storage.test.ts
git commit -m "test(sp2): cover remove idempotency"
```

---

## Task 8: `lib/evidence/index` barrel + types extension

**Files:**
- Create: `mobile-app/lib/evidence/index.ts`
- Modify: `mobile-app/types.ts`

- [ ] **Step 1: Extend types**

Edit `mobile-app/types.ts`. Replace the existing `SyncQueueItem` and `AuditEventType` with:

```ts
export type EvidenceUploadStatus = "pending" | "in-flight" | "ok" | "error";

export type EvidenceAttachment = {
  id: string;
  taskId: string;
  reportId?: string;
  uri: string;          // persistent uri (under app docs)
  fileName: string;
  type: "photo" | "pdf";
  sizeBytes: number;
  addedAt: string;
  uploadStatus: EvidenceUploadStatus;
  uploadError?: string;
  queueItemId?: string;
};

export type SubmissionState = "pending" | "acknowledged" | "conflict" | "failed";

export type ComplianceReport = {
  id: string;
  title: string;
  scheme: string;
  periodYear: string;
  inspectionDate: string;
  fieldSummary: string;
  notes: string;
  status: ReportStatus;
  submittedAt?: string;
  basedOnReportId?: string;
  submissionState?: SubmissionState;
  localVersion?: number;
  baseVersion?: number;
};

// Legacy local-only queue item retained for back-compat hydration.
export type LegacySyncQueueItem = {
  id: string;
  action: "report.submit" | "report.save";
  payload: Partial<ComplianceReport> & { reportId: string };
  createdAt: string;
};
// `SyncQueueItem` is now re-exported from `lib/sync`.
export type { SyncQueueItem } from "@/lib/sync";

export type AuditEventType =
  | "login"
  | "logout"
  | "profile.save"
  | "profile.sync"
  | "report.duplicate"
  | "report.submit"
  | "report.submit_acknowledged"
  | "report.create"
  | "report.draft_save"
  | "report.sync"
  | "evidence.upload"
  | "evidence.remove"
  | "ticket.submit"
  | "regulation.read"
  | "ocr.prefill"
  | "sync.conflict"
  | "sync.conflict_resolve"
  | "advisor.invite"
  | "advisor.revoke"
  | "audit.export";
```

Then in `AppState`, change `syncQueue` to use the legacy alias while migration proceeds:

```ts
syncQueue: LegacySyncQueueItem[];
```

- [ ] **Step 2: Create barrel**

Create `mobile-app/lib/evidence/index.ts`:

```ts
export { pickPhoto, pickDocument } from "./picker";
export type { PickResult, PickedAsset } from "./picker";
export { copyIntoAppDocs, remove, buildPersistentUri } from "./storage";
```

- [ ] **Step 3: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add mobile-app/lib/evidence/index.ts mobile-app/types.ts
git commit -m "feat(sp2): extend types for upload status, submissionState, and barrel evidence module"
```

---

## Task 9: `lib/reports/submission` — happy path enqueues and acks

**Files:**
- Create: `mobile-app/lib/reports/submission.ts`
- Create: `mobile-app/lib/reports/index.ts`
- Create: `mobile-app/__tests__/reports/submission.test.ts`

This task assumes SP1's `mobile-app/lib/sync/index.ts` exists. If it does not yet, scaffold a stub at the location (Task 9a below).

- [ ] **Step 1a: If `mobile-app/lib/sync/index.ts` does not exist, create a stub**

Only if the file is missing, create `mobile-app/lib/sync/index.ts`:

```ts
export type SyncQueueItemState = "pending" | "in-flight" | "ok" | "conflict" | "error";
export type SyncQueueItem<P = unknown> = {
  id: string;
  kind: string;
  op: string;
  payload: P;
  state: SyncQueueItemState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

type Listener = (items: SyncQueueItem[]) => void;
const items: SyncQueueItem[] = [];
const listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l(items.slice())); }

export const syncQueue = {
  enqueue<P>(input: { kind: string; op: string; payload: P; id?: string }): SyncQueueItem<P> {
    const now = new Date().toISOString();
    const item: SyncQueueItem<P> = {
      id: input.id ?? `q-${now}-${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      op: input.op,
      payload: input.payload,
      state: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    items.push(item as SyncQueueItem);
    emit();
    return item;
  },
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    listener(items.slice());
    return () => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
  getSnapshot(): SyncQueueItem[] { return items.slice(); },
  // test-only helpers
  __setState(id: string, state: SyncQueueItemState, error?: string) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    it.state = state;
    it.error = error;
    it.updatedAt = new Date().toISOString();
    emit();
  },
  __reset() { items.length = 0; listeners.length = 0; },
};
```

- [ ] **Step 1b: Write failing submission test**

Create `mobile-app/__tests__/reports/submission.test.ts`:

```ts
import { syncQueue } from "@/lib/sync";
import { submitReport } from "@/lib/reports/submission";
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

describe("submitReport (lib/reports/submission)", () => {
  beforeEach(() => {
    (syncQueue as any).__reset?.();
  });

  it("enqueues a report.submit item and resolves to acknowledged when queue reports ok", async () => {
    const transitions: string[] = [];
    const promise = submitReport({
      report: baseReport,
      updates: { fieldSummary: "new" },
      onState: (s) => transitions.push(s),
    });

    const snapshot = syncQueue.getSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].kind).toBe("report");
    expect(snapshot[0].op).toBe("submit");
    expect(snapshot[0].payload).toMatchObject({ reportId: "rep-1", updates: { fieldSummary: "new" } });

    (syncQueue as any).__setState(snapshot[0].id, "in-flight");
    (syncQueue as any).__setState(snapshot[0].id, "ok");

    const result = await promise;
    expect(result).toEqual({ submissionState: "acknowledged", queueItemId: snapshot[0].id });
    expect(transitions).toEqual(["pending", "in-flight", "acknowledged"]);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `cd mobile-app && npx jest __tests__/reports/submission.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement submission module**

Create `mobile-app/lib/reports/submission.ts`:

```ts
import { syncQueue, SyncQueueItem, SyncQueueItemState } from "@/lib/sync";
import type { ComplianceReport, SubmissionState } from "@/types";

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

function mapQueueStateToSubmission(s: SyncQueueItemState): SubmissionState | "in-flight" | null {
  switch (s) {
    case "pending": return "pending";
    case "in-flight": return "in-flight";
    case "ok": return "acknowledged";
    case "conflict": return "conflict";
    case "error": return "failed";
    default: return null;
  }
}

export function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const { report, updates, onState } = input;
  const localVersion = (report.localVersion ?? 0) + 1;
  const baseVersion = report.baseVersion ?? 0;

  const item = syncQueue.enqueue<ReportSubmitPayload>({
    kind: "report",
    op: "submit",
    payload: { reportId: report.id, updates, localVersion, baseVersion },
  });

  onState?.("pending");

  return new Promise<SubmitReportResult>((resolve) => {
    const unsubscribe = syncQueue.subscribe((items: SyncQueueItem[]) => {
      const me = items.find((x) => x.id === item.id);
      if (!me) return;
      const mapped = mapQueueStateToSubmission(me.state);
      if (mapped === "in-flight") {
        onState?.("in-flight");
        return;
      }
      if (mapped === "pending") return;
      if (mapped === "acknowledged" || mapped === "conflict" || mapped === "failed") {
        onState?.(mapped);
        unsubscribe();
        resolve({ submissionState: mapped, queueItemId: me.id, error: me.error });
      }
    });
  });
}
```

Create `mobile-app/lib/reports/index.ts`:

```ts
export { submitReport } from "./submission";
export type { SubmitReportInput, SubmitReportResult, ReportSubmitPayload } from "./submission";
```

- [ ] **Step 4: Run test (expect pass)**

Run: `cd mobile-app && npx jest __tests__/reports/submission.test.ts`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/reports mobile-app/lib/sync mobile-app/__tests__/reports/submission.test.ts
git commit -m "feat(sp2): submitReport over syncQueue (happy path)"
```

---

## Task 10: submission — conflict and failure paths

**Files:**
- Modify: `mobile-app/__tests__/reports/submission.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `mobile-app/__tests__/reports/submission.test.ts` inside the `describe` block:

```ts
  it("resolves to conflict when queue reports conflict", async () => {
    const promise = submitReport({ report: baseReport, updates: {} });
    const id = syncQueue.getSnapshot()[0].id;
    (syncQueue as any).__setState(id, "in-flight");
    (syncQueue as any).__setState(id, "conflict", "server has newer version");
    const result = await promise;
    expect(result).toEqual({ submissionState: "conflict", queueItemId: id, error: "server has newer version" });
  });

  it("resolves to failed when queue reports error", async () => {
    const promise = submitReport({ report: baseReport, updates: {} });
    const id = syncQueue.getSnapshot()[0].id;
    (syncQueue as any).__setState(id, "error", "network down");
    const result = await promise;
    expect(result).toEqual({ submissionState: "failed", queueItemId: id, error: "network down" });
  });
```

- [ ] **Step 2: Run tests (expect pass)**

Run: `cd mobile-app && npx jest __tests__/reports/submission.test.ts`
Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/__tests__/reports/submission.test.ts
git commit -m "test(sp2): cover submission conflict and failure transitions"
```

---

## Task 11: submission — restart recovery replays queued item

**Files:**
- Create: `mobile-app/lib/reports/recovery.ts`
- Modify: `mobile-app/lib/reports/index.ts`
- Modify: `mobile-app/__tests__/reports/submission.test.ts`

- [ ] **Step 1: Write failing test**

Append to `mobile-app/__tests__/reports/submission.test.ts`:

```ts
import { observeSubmission } from "@/lib/reports";

describe("observeSubmission (restart recovery)", () => {
  beforeEach(() => (syncQueue as any).__reset?.());

  it("attaches to an already-queued report.submit item by reportId and resolves on its terminal state", async () => {
    // Simulate: a previous run enqueued the submission, app restarts.
    const queued = syncQueue.enqueue({
      kind: "report",
      op: "submit",
      payload: { reportId: "rep-1", updates: {}, localVersion: 1, baseVersion: 0 },
    });

    const promise = observeSubmission("rep-1");
    (syncQueue as any).__setState(queued.id, "ok");
    const result = await promise;
    expect(result.submissionState).toBe("acknowledged");
    expect(result.queueItemId).toBe(queued.id);
  });

  it("returns null when no queued submission exists for the report", () => {
    expect(observeSubmission("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `cd mobile-app && npx jest __tests__/reports/submission.test.ts -t "observeSubmission"`
Expected: FAIL (missing export).

- [ ] **Step 3: Implement observeSubmission**

Create `mobile-app/lib/reports/recovery.ts`:

```ts
import { syncQueue } from "@/lib/sync";
import type { ReportSubmitPayload, SubmitReportResult } from "./submission";

function isReportSubmit(item: { kind: string; op: string; payload: unknown }): item is { kind: "report"; op: "submit"; payload: ReportSubmitPayload } & typeof item {
  return item.kind === "report" && item.op === "submit"
    && typeof (item.payload as ReportSubmitPayload | undefined)?.reportId === "string";
}

export function observeSubmission(reportId: string): Promise<SubmitReportResult> | null {
  const existing = syncQueue.getSnapshot().find((i) => isReportSubmit(i) && (i.payload as ReportSubmitPayload).reportId === reportId);
  if (!existing) return null;

  return new Promise<SubmitReportResult>((resolve) => {
    const unsubscribe = syncQueue.subscribe((items) => {
      const me = items.find((x) => x.id === existing.id);
      if (!me) return;
      if (me.state === "ok") { unsubscribe(); resolve({ submissionState: "acknowledged", queueItemId: me.id }); }
      else if (me.state === "conflict") { unsubscribe(); resolve({ submissionState: "conflict", queueItemId: me.id, error: me.error }); }
      else if (me.state === "error") { unsubscribe(); resolve({ submissionState: "failed", queueItemId: me.id, error: me.error }); }
    });
  });
}
```

Update `mobile-app/lib/reports/index.ts`:

```ts
export { submitReport } from "./submission";
export { observeSubmission } from "./recovery";
export type { SubmitReportInput, SubmitReportResult, ReportSubmitPayload } from "./submission";
```

- [ ] **Step 4: Run tests (expect pass)**

Run: `cd mobile-app && npx jest __tests__/reports/submission.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/reports/recovery.ts mobile-app/lib/reports/index.ts mobile-app/__tests__/reports/submission.test.ts
git commit -m "feat(sp2): observeSubmission for restart-time replay attachment"
```

---

## Task 12: AppContext — rewire `addEvidence` through picker/storage + queue

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`

- [ ] **Step 1: Replace `addEvidence` and add `addEvidenceFromPicker`**

In `mobile-app/context/AppContext.tsx`:

1. Add imports near the top:

```ts
import { syncQueue } from "@/lib/sync";
import { copyIntoAppDocs, remove as removeFromDocs } from "@/lib/evidence/storage";
import { pickPhoto, pickDocument, PickResult } from "@/lib/evidence/picker";
import { submitReport as submitReportViaQueue, observeSubmission } from "@/lib/reports";
```

2. Extend the `AppContextValue` interface (around the existing `addEvidence` line) to read:

```ts
  addEvidence: (taskId: string, source: { kind: "photo" } | { kind: "pdf" }) => Promise<{ ok: boolean; error?: string }>;
  retryEvidence: (evidenceId: string) => Promise<void>;
  retryAllFailedEvidence: () => Promise<void>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  getEvidenceForTask: (taskId: string) => EvidenceAttachment[];
```

3. Replace the body of `addEvidence` with:

```ts
async function addEvidence(
  taskId: string,
  source: { kind: "photo" } | { kind: "pdf" },
): Promise<{ ok: boolean; error?: string }> {
  const pickRes: PickResult = source.kind === "photo" ? await pickPhoto() : await pickDocument();
  if (!pickRes.ok) {
    if (pickRes.reason === "cancelled") return { ok: true };
    if (pickRes.reason === "permission_denied") {
      return { ok: false, error: "Permission to access media was denied." };
    }
    return { ok: false, error: pickRes.message ?? "Could not open picker." };
  }

  const asset = pickRes.asset;
  if (asset.sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
    return { ok: false, error: `File exceeds the 10 MB size limit (${(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB).` };
  }

  const evidenceId = id("evidence");
  const ext = asset.fileName.includes(".") ? asset.fileName.split(".").pop()! : (source.kind === "photo" ? "jpg" : "pdf");

  let persistentUri: string;
  try {
    persistentUri = await copyIntoAppDocs(asset.uri, evidenceId, ext);
  } catch (e) {
    return { ok: false, error: `Failed to save file locally: ${(e as Error).message}` };
  }

  const queueItem = syncQueue.enqueue<{ evidenceId: string; taskId: string; persistentUri: string; fileName: string; sizeBytes: number }>({
    kind: "evidence",
    op: "upload",
    payload: {
      evidenceId,
      taskId,
      persistentUri,
      fileName: asset.fileName,
      sizeBytes: asset.sizeBytes,
    },
  });

  const attachment: EvidenceAttachment = {
    id: evidenceId,
    taskId,
    uri: persistentUri,
    fileName: asset.fileName,
    type: source.kind,
    sizeBytes: asset.sizeBytes,
    addedAt: new Date().toISOString(),
    uploadStatus: "pending",
    queueItemId: queueItem.id,
  };

  setState((current) => ({
    ...current,
    evidenceAttachments: [...current.evidenceAttachments, attachment],
  }));
  await appendLog("evidence.upload", `Uploaded ${source.kind} "${asset.fileName}" for task ${taskId}.`);
  return { ok: true };
}
```

4. Replace `removeEvidence`:

```ts
async function removeEvidence(evidenceId: string) {
  const attachment = state.evidenceAttachments.find((e) => e.id === evidenceId);
  if (attachment) {
    try { await removeFromDocs(attachment.uri); } catch { /* idempotent */ }
  }
  setState((current) => ({
    ...current,
    evidenceAttachments: current.evidenceAttachments.filter((e) => e.id !== evidenceId),
  }));
  if (attachment) {
    await appendLog("evidence.remove", `Removed "${attachment.fileName}" from task ${attachment.taskId}.`);
  }
}
```

5. Add `retryEvidence` and `retryAllFailedEvidence` above the `return` of `AppProvider`:

```ts
async function retryEvidence(evidenceId: string) {
  const att = state.evidenceAttachments.find((e) => e.id === evidenceId);
  if (!att) return;
  const newItem = syncQueue.enqueue({
    kind: "evidence",
    op: "upload",
    payload: {
      evidenceId: att.id,
      taskId: att.taskId,
      persistentUri: att.uri,
      fileName: att.fileName,
      sizeBytes: att.sizeBytes,
    },
  });
  setState((current) => ({
    ...current,
    evidenceAttachments: current.evidenceAttachments.map((e) =>
      e.id === evidenceId ? { ...e, uploadStatus: "pending", queueItemId: newItem.id, uploadError: undefined } : e,
    ),
  }));
}

async function retryAllFailedEvidence() {
  const failed = state.evidenceAttachments.filter((e) => e.uploadStatus === "error");
  for (const att of failed) {
    await retryEvidence(att.id);
  }
}
```

6. Add the queue subscription inside `AppProvider`, after the hydration `useEffect`:

```ts
useEffect(() => {
  if (!isHydrated) return;
  const unsubscribe = syncQueue.subscribe((items) => {
    setState((current) => {
      let evidenceChanged = false;
      const nextEvidence = current.evidenceAttachments.map((e) => {
        if (!e.queueItemId) return e;
        const q = items.find((i) => i.id === e.queueItemId);
        if (!q) return e;
        let status: EvidenceAttachment["uploadStatus"];
        switch (q.state) {
          case "pending": status = "pending"; break;
          case "in-flight": status = "in-flight"; break;
          case "ok": status = "ok"; break;
          case "error":
          case "conflict": status = "error"; break;
          default: status = e.uploadStatus;
        }
        if (status === e.uploadStatus && q.error === e.uploadError) return e;
        evidenceChanged = true;
        return { ...e, uploadStatus: status, uploadError: q.error };
      });
      return evidenceChanged ? { ...current, evidenceAttachments: nextEvidence } : current;
    });
  });
  return unsubscribe;
}, [isHydrated]);
```

7. Add `retryEvidence` and `retryAllFailedEvidence` to the context value object.

- [ ] **Step 2: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: exit 0. (callers of `addEvidence` in `reports.tsx` will be updated in Task 14.)

- [ ] **Step 3: Run all tests**

Run: `cd mobile-app && npx jest`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add mobile-app/context/AppContext.tsx
git commit -m "feat(sp2): route evidence through picker/storage and syncQueue with retry"
```

---

## Task 13: AppContext — rewire `submitReport` through `lib/reports`

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`

- [ ] **Step 1: Replace `submitReport`**

Replace the existing `submitReport` body in `AppContext.tsx`:

```ts
async function submitReport(reportId: string, updates: Partial<ComplianceReport>) {
  const existing = state.reports.find((report) => report.id === reportId);
  if (!existing) return { ok: false, error: "Draft not found." };

  const merged = { ...existing, ...updates };
  if (!merged.periodYear || !merged.inspectionDate || !merged.fieldSummary.trim()) {
    return { ok: false, error: "Period year, inspection date, and field summary are required." };
  }

  setState((current) => ({
    ...current,
    reports: current.reports.map((r) =>
      r.id === reportId
        ? { ...r, ...updates, submissionState: "pending", localVersion: (r.localVersion ?? 0) + 1 }
        : r,
    ),
  }));
  await appendLog("report.submit", `Submitted report ${reportId} (queued for acknowledgement).`);

  submitReportViaQueue({
    report: merged,
    updates,
    onState: (s) => {
      if (s === "in-flight" || s === "pending") return;
      setState((current) => ({
        ...current,
        reports: current.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                submissionState: s,
                status: s === "acknowledged" ? "submitted" : r.status,
                submittedAt: s === "acknowledged" ? new Date().toISOString() : r.submittedAt,
              }
            : r,
        ),
      }));
      if (s === "acknowledged") {
        void appendLog("report.submit_acknowledged", `Report ${reportId} acknowledged by remote.`);
      }
    },
  });

  return { ok: true };
}
```

- [ ] **Step 2: Replay queued submissions on hydration**

Add the following inside `AppProvider`, after the existing hydrate effect:

```ts
useEffect(() => {
  if (!isHydrated) return;
  for (const r of state.reports) {
    if (r.submissionState !== "pending") continue;
    const pending = observeSubmission(r.id);
    if (!pending) continue;
    pending.then(({ submissionState }) => {
      setState((current) => ({
        ...current,
        reports: current.reports.map((x) =>
          x.id === r.id
            ? {
                ...x,
                submissionState,
                status: submissionState === "acknowledged" ? "submitted" : x.status,
                submittedAt: submissionState === "acknowledged" ? new Date().toISOString() : x.submittedAt,
              }
            : x,
        ),
      }));
      if (submissionState === "acknowledged") {
        void appendLog("report.submit_acknowledged", `Report ${r.id} acknowledged by remote.`);
      }
    });
  }
  // intentionally one-shot on hydration
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isHydrated]);
```

- [ ] **Step 3: Type-check**

Run: `cd mobile-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Run all tests**

Run: `cd mobile-app && npx jest`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/context/AppContext.tsx
git commit -m "feat(sp2): submitReport routed through lib/reports + restart replay"
```

---

## Task 14: UI — picker entry, per-row status, banner, evidence section

**Files:**
- Modify: `mobile-app/app/(tabs)/reports.tsx`

This task replaces caller signatures of `addEvidence` and renders the new UI.

- [ ] **Step 1: Update imports and acquire `evidenceAttachments`, retry helpers**

In `mobile-app/app/(tabs)/reports.tsx`, ensure the `useApp()` destructure includes:

```ts
const {
  reports,
  submitReport,
  saveDraftOffline,
  duplicateReport,
  createNewReport,
  applyOcrExtraction,
  isOnline,
  language,
  evidenceAttachments,
  addEvidence,
  removeEvidence,
  retryEvidence,
  retryAllFailedEvidence,
} = useApp();
```

- [ ] **Step 2: Add the failed-evidence banner above the draft section**

Insert just below the `<View style={[styles.statusDot, ...]} />` section in the draft area:

```tsx
{(() => {
  const failed = evidenceAttachments.filter((e) => e.uploadStatus === "error");
  if (failed.length === 0) return null;
  return (
    <Card variant="elevated">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="warning-outline" size={16} color="#c0392b" />
        <AppText style={{ flex: 1 }}>
          {`${failed.length} attachment(s) failed to upload — tap to retry all.`}
        </AppText>
        <PrimaryButton title="Retry all" onPress={() => retryAllFailedEvidence()} />
      </View>
    </Card>
  );
})()}
```

- [ ] **Step 3: Add the Evidence section for the active draft**

After the draft form fields and before the submit button, insert:

```tsx
{draft && (
  <Card>
    <AppText variant="subtitle">Evidence</AppText>
    <EvidenceSection
      attachments={evidenceAttachments.filter((e) => e.taskId === draft.id || e.reportId === draft.id)}
      onRetry={retryEvidence}
      onRemove={removeEvidence}
    />
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
      <PrimaryButton
        title="Add photo"
        onPress={async () => {
          const r = await addEvidence(draft.id, { kind: "photo" });
          if (!r.ok && r.error) setMessage(r.error);
        }}
      />
      <PrimaryButton
        title="Add PDF"
        onPress={async () => {
          const r = await addEvidence(draft.id, { kind: "pdf" });
          if (!r.ok && r.error) setMessage(r.error);
        }}
      />
    </View>
  </Card>
)}
```

- [ ] **Step 4: Add the Evidence section to submitted reports**

Inside the `submittedReports.map(...)` JSX block, after the existing submitted-at line, insert:

```tsx
<EvidenceSection
  attachments={evidenceAttachments.filter((e) => e.taskId === report.id || e.reportId === report.id)}
  readOnly
/>
```

- [ ] **Step 5: Add the `EvidenceSection` component at the bottom of the file (above `const styles`)**

```tsx
import { Image } from "react-native";
import type { EvidenceAttachment } from "@/types";

function EvidenceSection(props: {
  attachments: EvidenceAttachment[];
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}) {
  const { attachments, onRetry, onRemove, readOnly } = props;
  if (attachments.length === 0) {
    return <AppText variant="caption" tone="muted">No evidence attached.</AppText>;
  }
  return (
    <View style={{ gap: 8 }}>
      {attachments.map((a) => (
        <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {a.type === "photo" ? (
            <Image source={{ uri: a.uri }} style={{ width: 40, height: 40, borderRadius: 4 }} />
          ) : (
            <Ionicons name="document-text-outline" size={32} color="#3f6a52" />
          )}
          <View style={{ flex: 1 }}>
            <AppText>{a.fileName}</AppText>
            <AppText variant="caption" tone="muted">
              {(a.sizeBytes / 1024).toFixed(1)} KB
            </AppText>
          </View>
          <UploadStatusPill status={a.uploadStatus} />
          {!readOnly && a.uploadStatus === "error" && onRetry && (
            <PrimaryButton title="Retry" onPress={() => onRetry(a.id)} />
          )}
          {!readOnly && onRemove && (
            <PrimaryButton title="Remove" onPress={() => onRemove(a.id)} />
          )}
        </View>
      ))}
    </View>
  );
}

function UploadStatusPill(props: { status: EvidenceAttachment["uploadStatus"] }) {
  const label =
    props.status === "ok" ? "uploaded ✓"
    : props.status === "error" ? "failed"
    : "uploading…";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor:
          props.status === "ok" ? "#d8efe1"
          : props.status === "error" ? "#f6d4d2"
          : "#e7ebf2",
      }}
    >
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}
```

- [ ] **Step 6: Type-check and run tests**

Run: `cd mobile-app && npx tsc --noEmit && npx jest`
Expected: exit 0; all tests green.

- [ ] **Step 7: Commit**

```bash
git add mobile-app/app/\(tabs\)/reports.tsx
git commit -m "feat(sp2): evidence preview, status pills, retry-all banner in reports screen"
```

---

## Task 15: Integration test — attach → submit → preview + audit

**Files:**
- Create: `mobile-app/__tests__/integration/evidence-report-flow.test.tsx`

- [ ] **Step 1: Write failing integration test**

Create `mobile-app/__tests__/integration/evidence-report-flow.test.tsx`:

```tsx
jest.mock("expo-image-picker");
jest.mock("expo-document-picker");
jest.mock("expo-file-system");

import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { AppProvider, useApp } from "@/context/AppContext";
import { syncQueue } from "@/lib/sync";

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useApp>) => void }) {
  const api = useApp();
  React.useEffect(() => { onReady(api); }, [api]);
  return null;
}

describe("evidence + report submission integration", () => {
  beforeEach(() => {
    (syncQueue as any).__reset?.();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/a.jpg", fileName: "a.jpg", fileSize: 2048, mimeType: "image/jpeg" }],
    });
  });

  it("attaches evidence, submits report, and acks both with audit entries", async () => {
    let api!: ReturnType<typeof useApp>;
    render(<AppProvider><Harness onReady={(a) => { api = a; }} /></AppProvider>);

    await waitFor(() => expect(api?.isHydrated).toBe(true));

    // Create a draft and attach a photo to it.
    let draftId = "";
    await act(async () => {
      const d = await api.createNewReport();
      draftId = d.id;
      const res = await api.addEvidence(d.id, { kind: "photo" });
      expect(res.ok).toBe(true);
    });

    // Drive the evidence queue item to ok.
    const evidenceItem = syncQueue.getSnapshot().find((i) => i.kind === "evidence");
    expect(evidenceItem).toBeDefined();
    act(() => { (syncQueue as any).__setState(evidenceItem!.id, "ok"); });

    await waitFor(() => {
      const att = api.evidenceAttachments.find((e) => e.taskId === draftId);
      expect(att?.uploadStatus).toBe("ok");
    });

    // Submit the report.
    await act(async () => {
      await api.submitReport(draftId, {
        periodYear: "2026",
        inspectionDate: "2026-05-19",
        fieldSummary: "summary",
      });
    });
    const submitItem = syncQueue.getSnapshot().find((i) => i.kind === "report");
    expect(submitItem).toBeDefined();
    act(() => { (syncQueue as any).__setState(submitItem!.id, "ok"); });

    await waitFor(() => {
      const r = api.reports.find((x) => x.id === draftId);
      expect(r?.status).toBe("submitted");
      expect(r?.submissionState).toBe("acknowledged");
    });

    const types = api.auditLogs.map((l) => l.type);
    expect(types).toContain("evidence.upload");
    expect(types).toContain("report.submit_acknowledged");
  });
});
```

- [ ] **Step 2: Run test (expect it to either pass or reveal a real wiring bug — fix wiring if so)**

Run: `cd mobile-app && npx jest __tests__/integration/evidence-report-flow.test.tsx`
Expected: PASS. If it fails, the failure indicates a real wiring gap in Tasks 12 or 13 — fix at the source, not in the test.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/__tests__/integration/evidence-report-flow.test.tsx
git commit -m "test(sp2): integration — evidence attach + submit acknowledgement"
```

---

## Task 16: Final full-suite sweep

- [ ] **Step 1: Run full jest and type-check**

Run: `cd mobile-app && npx tsc --noEmit && npx jest`
Expected: tsc exits 0; jest reports all suites green.

- [ ] **Step 2: Manual smoke (optional)**

Run: `cd mobile-app && npx expo start --web`
Expected: app boots, draft report shows Add photo / Add PDF buttons; picker invocation paths are visible (web picker may differ; this step is optional).

- [ ] **Step 3: Final commit (only if any sweep fixes were needed)**

```bash
git add -A
git commit -m "chore(sp2): final type and test sweep"
```

---

## Self-Review

**Spec coverage:**
- Picker with permission denial — Tasks 3, 4 (`permission_denied`), 5.
- `copyIntoAppDocs` writing under `${FileSystem.documentDirectory}evidence/<id>.<ext>` — Task 6.
- `remove` idempotent — Task 7.
- Evidence metadata as `syncQueue` items — Task 12.
- Retry UX states (uploading / uploaded / failed-Retry / Remove) — Task 14 (`UploadStatusPill`, `EvidenceSection`).
- Banner for failed attachments — Task 14, step 2.
- Report detail with thumbnails for photos and file icon for PDFs — Task 14, step 5.
- `submitReport` rewired through `lib/reports/submission` using `syncQueue` — Tasks 9, 13.
- `submissionState` field (`pending | acknowledged | conflict | failed`) — Tasks 8 (type), 9 (mapping), 13 (set on report).
- Audit events `evidence.upload`, `evidence.remove`, `report.submit_acknowledged` — Tasks 8 (type), 12, 13.
- All spec tests (`picker.test`, `storage.test`, `submission.test`, integration) — Tasks 3–7, 9–11, 15.
- Restart recovery — Task 11.
- Conflict/failure resolution paths — Task 10.

**Placeholder scan:** No "TBD", "TODO", "implement later", or "similar to" remain. The single "(optional)" smoke step in Task 16 is gated by an explicit step and is not a placeholder for unspecified code.

**Type consistency:**
- `PickResult` defined in Task 3 used in Tasks 5, 12.
- `SubmissionState = "pending" | "acknowledged" | "conflict" | "failed"` defined Task 8, used Tasks 9, 10, 13.
- `submitReport` (lib) takes `{ report, updates, onState? }` — same shape used by `AppContext.submitReport` rewire in Task 13.
- `observeSubmission(reportId)` signature defined Task 11, called Task 13.
- `EvidenceAttachment.uploadStatus` type `"pending" | "in-flight" | "ok" | "error"` (Task 8) — mapped consistently in Task 12 subscription and rendered by `UploadStatusPill` (Task 14).
- `addEvidence` new signature `(taskId, { kind: "photo" | "pdf" })` defined Task 12 — only caller is `reports.tsx` Task 14, which matches.
- `retryEvidence` / `retryAllFailedEvidence` defined Task 12, consumed Task 14.

No issues found.
