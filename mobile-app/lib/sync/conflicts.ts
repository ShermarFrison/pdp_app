import type { ConflictFieldRecord } from "@/lib/sync/types";

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function detectFieldConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  base: Record<string, unknown>,
): ConflictFieldRecord[] {
  const keys = new Set<string>([
    ...Object.keys(local),
    ...Object.keys(remote),
    ...Object.keys(base),
  ]);
  const out: ConflictFieldRecord[] = [];
  for (const field of keys) {
    const l = local[field];
    const r = remote[field];
    const b = base[field];
    if (eq(l, r)) continue;
    if (eq(l, b)) continue;
    if (eq(r, b)) continue;
    out.push({ field, localValue: l, remoteValue: r, baseValue: b });
  }
  return out.sort((x, y) => x.field.localeCompare(y.field));
}

export function mergeWithResolutions<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  conflicts: ConflictFieldRecord[],
): T {
  const merged: Record<string, unknown> = { ...remote, ...local };
  for (const c of conflicts) {
    if (!("resolvedValue" in c)) {
      throw new Error(`unresolved conflict on field "${c.field}"`);
    }
    merged[c.field] = c.resolvedValue;
  }
  return merged as T;
}
