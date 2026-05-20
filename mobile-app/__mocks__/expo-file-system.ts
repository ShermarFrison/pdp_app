export const documentDirectory = "file:///mock-docs/";

const files = new Map<string, true>();

export const makeDirectoryAsync = jest.fn(async (_dir: string, _opts?: { intermediates?: boolean }) => {});
export const copyAsync = jest.fn(async ({ from: _from, to }: { from: string; to: string }) => {
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
