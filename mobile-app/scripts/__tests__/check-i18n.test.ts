import { findReferencedKeys, validate, DictSnapshot } from "@/scripts/check-i18n";

describe("check-i18n", () => {
  test("findReferencedKeys extracts t('key', lang) calls", () => {
    const src = `t("dashboard.welcome", language); t('reports.title', lang);`;
    expect(findReferencedKeys(src).sort()).toEqual(["dashboard.welcome", "reports.title"]);
  });

  test("validate returns empty when dictionaries match referenced keys", () => {
    const snap: DictSnapshot = {
      en: ["a.key", "b.key"],
      lt: ["a.key", "b.key"],
    };
    expect(validate(snap, ["a.key", "b.key"])).toEqual([]);
  });

  test("validate detects missing key in lt", () => {
    const snap: DictSnapshot = { en: ["a", "b"], lt: ["a"] };
    const errs = validate(snap, ["a", "b"]);
    expect(errs.some((e) => e.includes("lt") && e.includes("b"))).toBe(true);
  });

  test("validate detects key referenced but missing from both", () => {
    const snap: DictSnapshot = { en: ["a"], lt: ["a"] };
    const errs = validate(snap, ["a", "ghost"]);
    expect(errs.some((e) => e.includes("ghost"))).toBe(true);
  });

  test("validate detects dictionary parity mismatch", () => {
    const snap: DictSnapshot = { en: ["a", "extra.en"], lt: ["a"] };
    const errs = validate(snap, ["a"]);
    expect(errs.some((e) => e.includes("extra.en"))).toBe(true);
  });
});
