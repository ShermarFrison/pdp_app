import * as fs from "fs";
import * as path from "path";

export type DictSnapshot = { en: string[]; lt: string[] };

const SCAN_DIRS = ["app", "components", "context", "lib"];
const T_CALL_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*,/g;

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

export function findReferencedKeys(source: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(T_CALL_RE.source, T_CALL_RE.flags);
  while ((m = re.exec(source))) found.add(m[1]);
  return [...found];
}

export function validate(snap: DictSnapshot, referenced: string[]): string[] {
  const errors: string[] = [];
  const enSet = new Set(snap.en);
  const ltSet = new Set(snap.lt);
  for (const k of referenced) {
    if (!enSet.has(k)) errors.push(`Key "${k}" referenced but missing from en dictionary.`);
    if (!ltSet.has(k)) errors.push(`Key "${k}" referenced but missing from lt dictionary.`);
  }
  for (const k of snap.en) if (!ltSet.has(k)) errors.push(`Parity mismatch: "${k}" in en but not lt.`);
  for (const k of snap.lt) if (!enSet.has(k)) errors.push(`Parity mismatch: "${k}" in lt but not en.`);
  return errors;
}

// Extract dictionary keys from lib/i18n.ts by static parsing — avoids importing
// the module (which has a runtime dependency on expo-localization).
export function extractDictKeys(source: string): { en: string[]; lt: string[] } {
  function readDictBlock(name: string): string[] {
    const re = new RegExp(`const\\s+${name}\\s*:\\s*Dictionary\\s*=\\s*\\{`, "g");
    const m = re.exec(source);
    if (!m) return [];
    let depth = 1;
    let i = re.lastIndex;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    const body = source.slice(re.lastIndex, i - 1);
    const keys: string[] = [];
    const keyRe = /['"]([a-zA-Z0-9_.]+)['"]\s*:/g;
    let km: RegExpExecArray | null;
    while ((km = keyRe.exec(body))) keys.push(km[1]);
    return keys;
  }
  return { en: readDictBlock("EN"), lt: readDictBlock("LT") };
}

function main() {
  const root = path.resolve(__dirname, "..");
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));
  const referenced = new Set<string>();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const k of findReferencedKeys(src)) referenced.add(k);
  }
  const i18nSrc = fs.readFileSync(path.join(root, "lib", "i18n.ts"), "utf8");
  const { en, lt } = extractDictKeys(i18nSrc);
  const errors = validate({ en, lt }, [...referenced]);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log(`OK: ${referenced.size} keys referenced, ${en.length} in each dict.`);
}

if (require.main === module) main();
