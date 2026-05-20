jest.mock("expo-file-system", () => {
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

import { formatCsv, formatJson, exportToFile, shareFile } from "@/lib/audit/export";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
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

describe("formatCsv", () => {
  it("emits the RFC 4180 header", () => {
    const out = formatCsv([]);
    expect(out).toBe("id,timestamp,type,actor,details\n");
  });

  it("escapes commas, quotes and newlines in details", () => {
    const out = formatCsv([
      makeEntry({ id: "log-1", details: "has, comma" }),
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
      {
        id: "log-1",
        timestamp: "2026-05-19T12:00:00.000Z",
        type: "login",
        actor: "farmer@pdp.test",
        details: "Farmer session started.",
      },
    ]);
  });
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
