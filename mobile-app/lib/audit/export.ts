import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { AuditLogEntry } from "@/types";

const CSV_HEADER = "id,timestamp,type,actor,details";
const CHUNK_SIZE = 1000;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowFor(entry: AuditLogEntry): string {
  return [entry.id, entry.timestamp, entry.type, entry.userEmail, entry.details]
    .map(csvEscape)
    .join(",");
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

  const head = entries.slice(0, CHUNK_SIZE);
  let buffer = formatCsv(head);
  await FileSystem.writeAsStringAsync(uri, buffer);

  for (let i = CHUNK_SIZE; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map(rowFor).join("\n");
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
