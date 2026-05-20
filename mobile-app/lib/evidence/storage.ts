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
