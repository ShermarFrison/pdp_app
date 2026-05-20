jest.mock("expo-file-system", () => {
  const files = new Map<string, true>();
  return {
    documentDirectory: "file:///mock-docs/",
    makeDirectoryAsync: jest.fn(async () => {}),
    copyAsync: jest.fn(async ({ to }: { from: string; to: string }) => {
      files.set(to, true);
    }),
    deleteAsync: jest.fn(async (uri: string) => {
      files.delete(uri);
    }),
    getInfoAsync: jest.fn(async (uri: string) => ({ exists: files.has(uri), uri })),
    __resetFs: () => {
      files.clear();
    },
  };
});

import * as FileSystem from "expo-file-system";
import { copyIntoAppDocs, remove } from "@/lib/evidence/storage";
const __resetFs = (FileSystem as unknown as { __resetFs: () => void }).__resetFs;

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
