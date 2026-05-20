export type Op = ">=" | "<=" | "==" | "!=" | "in";

export type Clause = {
  field: string;
  op: Op;
  value: number | string | boolean | (number | string)[];
};

export type Rule = {
  taskId: string;
  when?: Clause[];
};

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function clauseMatches(profile: Record<string, unknown>, c: Clause): boolean {
  const raw = profile[c.field];
  switch (c.op) {
    case ">=": {
      const n = toNumber(raw);
      return n !== null && typeof c.value === "number" && n >= c.value;
    }
    case "<=": {
      const n = toNumber(raw);
      return n !== null && typeof c.value === "number" && n <= c.value;
    }
    case "==":
      return raw === c.value;
    case "!=":
      return raw !== c.value;
    case "in":
      return Array.isArray(c.value) && (c.value as (number | string)[]).includes(raw as never);
    default:
      return false;
  }
}

function ruleMatches(profile: Record<string, unknown>, rule: Rule): boolean {
  if (!rule.when || rule.when.length === 0) return true;
  return rule.when.every((c) => clauseMatches(profile, c));
}

export function evaluateRules(profile: Record<string, unknown>, rules: Rule[]): Set<string> {
  const out = new Set<string>();
  for (const r of rules) if (ruleMatches(profile, r)) out.add(r.taskId);
  return out;
}
