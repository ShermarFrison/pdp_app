import { evaluateRules, Rule } from "@/lib/personalization/evaluate";

const profile = {
  hectares: "25",
  farmingType: "Dairy",
  livestockCount: "40",
  region: "NVZ-1",
  organicCertified: true,
} as Record<string, unknown>;

const rules: Rule[] = [
  { taskId: "soil-cover", when: [{ field: "hectares", op: ">=", value: 20 }] },
  { taskId: "small-only", when: [{ field: "hectares", op: "<=", value: 5 }] },
  { taskId: "exact-dairy", when: [{ field: "farmingType", op: "==", value: "Dairy" }] },
  { taskId: "not-arable", when: [{ field: "farmingType", op: "!=", value: "Arable" }] },
  { taskId: "nvz", when: [{ field: "region", op: "in", value: ["NVZ-1", "NVZ-2"] }] },
  { taskId: "organic", when: [{ field: "organicCertified", op: "==", value: true }] },
  { taskId: "unconditional" },
  {
    taskId: "and-rule",
    when: [
      { field: "hectares", op: ">=", value: 10 },
      { field: "farmingType", op: "==", value: "Dairy" },
    ],
  },
  { taskId: "or-rule", when: [{ field: "hectares", op: ">=", value: 1000 }] },
  { taskId: "or-rule", when: [{ field: "farmingType", op: "==", value: "Dairy" }] },
];

describe("evaluateRules", () => {
  test("returns matching task ids", () => {
    const ids = evaluateRules(profile, rules);
    expect(ids.has("soil-cover")).toBe(true);
    expect(ids.has("small-only")).toBe(false);
    expect(ids.has("exact-dairy")).toBe(true);
    expect(ids.has("not-arable")).toBe(true);
    expect(ids.has("nvz")).toBe(true);
    expect(ids.has("organic")).toBe(true);
    expect(ids.has("unconditional")).toBe(true);
    expect(ids.has("and-rule")).toBe(true);
    expect(ids.has("or-rule")).toBe(true);
  });

  test("coerces numeric strings for >= and <=", () => {
    const ids = evaluateRules({ hectares: "3" }, [
      { taskId: "small", when: [{ field: "hectares", op: "<=", value: 5 }] },
      { taskId: "big", when: [{ field: "hectares", op: ">=", value: 5 }] },
    ]);
    expect(ids.has("small")).toBe(true);
    expect(ids.has("big")).toBe(false);
  });

  test("missing field never matches numeric ops", () => {
    const ids = evaluateRules({}, [
      { taskId: "x", when: [{ field: "hectares", op: ">=", value: 1 }] },
    ]);
    expect(ids.has("x")).toBe(false);
  });
});
