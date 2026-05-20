import { ExtractionResult } from "@/types";

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOC_TYPES = [
  "CAP Payment Application",
  "Field Inspection Report",
  "Manure Spreading Log",
  "Soil Test Result",
];

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

export async function extractFromFile(_uri: string, fileName: string): Promise<ExtractionResult> {
  const seed = hash(fileName);
  const r = mulberry32(seed);

  const docType = DOC_TYPES[Math.floor(r() * DOC_TYPES.length)];
  const year = 2024 + Math.floor(r() * 3);
  const month = 1 + Math.floor(r() * 12);
  const day = 1 + Math.floor(r() * 28);
  const refNum = Math.floor(r() * 9000) + 1000;
  const date = `${year}-${pad(month, 2)}-${pad(day, 2)}`;
  const ref = `REF-${year}-${refNum}`;

  // Pick exactly one low-confidence field index 0..2.
  const lowIndex = Math.floor(r() * 3);
  function conf(i: number): number {
    if (i === lowIndex) return Math.round((0.4 + r() * 0.25) * 100) / 100; // 0.40 - 0.65
    return Math.round((0.78 + r() * 0.2) * 100) / 100; // 0.78 - 0.98
  }

  return {
    documentType: { value: docType, confidence: conf(0) },
    documentDate: { value: date, confidence: conf(1) },
    referenceId: { value: ref, confidence: conf(2) },
    sourceFileName: fileName,
  };
}
