export const documentDirectory = "file:///mock-docs/";
export const cacheDirectory = "file:///cache/";
export const EncodingType = { UTF8: "utf8" } as const;

const dirs = new Map<string, true>();
const files = new Map<string, string>();

export const makeDirectoryAsync = jest.fn(async (dir: string, _opts?: { intermediates?: boolean }) => {
  dirs.set(dir, true);
});
export const copyAsync = jest.fn(async ({ from: _from, to }: { from: string; to: string }) => {
  files.set(to, "");
});
export const deleteAsync = jest.fn(async (uri: string, _opts?: { idempotent?: boolean }) => {
  files.delete(uri);
});
export const getInfoAsync = jest.fn(async (uri: string) => ({
  exists: files.has(uri),
  uri,
  size: (files.get(uri) ?? "").length,
}));

export const writeAsStringAsync = jest.fn(async (uri: string, content: string) => {
  files.set(uri, content);
});

export const readAsStringAsync = jest.fn(async (uri: string) => {
  if (!files.has(uri)) throw new Error(`File not found: ${uri}`);
  return files.get(uri) ?? "";
});

export const __resetFs = () => {
  files.clear();
  dirs.clear();
  (makeDirectoryAsync as jest.Mock).mockClear();
  (copyAsync as jest.Mock).mockClear();
  (deleteAsync as jest.Mock).mockClear();
  (getInfoAsync as jest.Mock).mockClear();
  (writeAsStringAsync as jest.Mock).mockClear();
  (readAsStringAsync as jest.Mock).mockClear();
};

export const __reset = __resetFs;
export const __read = (uri: string) => files.get(uri) ?? "";
export const __exists = (uri: string) => files.has(uri);
