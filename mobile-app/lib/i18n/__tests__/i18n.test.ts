import { t, EN_KEYS, LT_KEYS } from "@/lib/i18n";

describe("i18n dictionaries", () => {
  test("EN and LT have identical key sets", () => {
    expect(EN_KEYS.sort()).toEqual(LT_KEYS.sort());
  });

  test("missing key returns [MISSING: ...] sentinel", () => {
    // @ts-expect-error - intentional miss
    expect(t("nope.key", "en")).toBe("[MISSING: nope.key]");
  });

  test("task.* keys exist for all six personalised tasks in EN and LT", () => {
    const ids = [
      "buffer_strips",
      "soil_cover",
      "manure_log",
      "organic_record",
      "nitrate_plan",
      "crop_rotation_plan",
    ];
    for (const id of ids) {
      for (const suffix of ["title", "guidance", "what_to_do", "penalty"]) {
        expect(t(`task.${id}.${suffix}` as any, "en")).not.toMatch(/^\[MISSING/);
        expect(t(`task.${id}.${suffix}` as any, "lt")).not.toMatch(/^\[MISSING/);
      }
    }
  });
});
