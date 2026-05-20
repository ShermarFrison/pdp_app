import { loadTasks } from "@/lib/personalization/load";
import { FarmProfile } from "@/types";

const baseProfile: FarmProfile = {
  farmName: "F",
  farmerName: "X",
  location: "Y",
  hectares: "25",
  farmingType: "Dairy",
  livestockCount: "10",
  localVersion: 0,
  baseVersion: 0,
  syncStatus: "clean",
};

describe("loadTasks", () => {
  test("returns ComplianceTask shape with resolved i18n strings (en)", () => {
    const tasks = loadTasks(baseProfile, "en");
    const buffer = tasks.find((task) => task.id === "buffer-strips");
    expect(buffer).toBeDefined();
    expect(buffer!.title).toBe("Confirm field buffer strips");
    expect(buffer!.guidance.length).toBeGreaterThan(5);
    expect(buffer!.penaltyExplanation.length).toBeGreaterThan(5);
    expect(["Not started", "Overdue", "In progress", "Done"]).toContain(buffer!.status);
  });

  test("resolves LT strings when language is lt", () => {
    const tasks = loadTasks(baseProfile, "lt");
    const buffer = tasks.find((task) => task.id === "buffer-strips");
    expect(buffer!.title).toBe("Patvirtinkite laukų apsaugines juostas");
  });

  test("includes soil-cover at >=20 ha", () => {
    expect(loadTasks(baseProfile, "en").some((task) => task.id === "soil-cover")).toBe(true);
  });

  test("excludes soil-cover below threshold", () => {
    expect(
      loadTasks({ ...baseProfile, hectares: "5" }, "en").some((task) => task.id === "soil-cover"),
    ).toBe(false);
  });

  test("organic flag selects organic-record", () => {
    const tasks = loadTasks({ ...baseProfile, organicCertified: true }, "en");
    expect(tasks.some((task) => task.id === "organic-record")).toBe(true);
  });

  test("inNitrateZone selects nitrate-plan", () => {
    const tasks = loadTasks({ ...baseProfile, inNitrateZone: true }, "en");
    expect(tasks.some((task) => task.id === "nitrate-plan")).toBe(true);
  });

  test("Arable + hectares>=10 selects crop-rotation-plan via in operator", () => {
    const tasks = loadTasks(
      { ...baseProfile, farmingType: "Arable", hectares: "15", livestockCount: "0" },
      "en",
    );
    expect(tasks.some((task) => task.id === "crop-rotation-plan")).toBe(true);
  });

  test("Dairy selects manure-log via OR rule", () => {
    const tasks = loadTasks({ ...baseProfile, livestockCount: "0" }, "en");
    expect(tasks.some((task) => task.id === "manure-log")).toBe(true);
  });
});
