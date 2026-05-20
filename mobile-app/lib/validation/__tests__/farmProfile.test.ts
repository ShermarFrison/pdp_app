import { validateFarmProfile } from "@/lib/validation/farmProfile";

const valid = {
  farmName: "Sunny",
  farmerName: "V",
  location: "Vilnius",
  hectares: "12.5",
  farmingType: "Arable" as const,
  livestockCount: "0",
};

test("accepts a fully populated profile", () => {
  expect(validateFarmProfile(valid)).toEqual({ ok: true });
});

test("rejects missing farm name", () => {
  const res = validateFarmProfile({ ...valid, farmName: "" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.farmName).toMatch(/required/i);
});

test("rejects non-numeric hectares", () => {
  const res = validateFarmProfile({ ...valid, hectares: "abc" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.hectares).toMatch(/number/i);
});

test("rejects out-of-range hectares", () => {
  const res = validateFarmProfile({ ...valid, hectares: "-1" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.hectares).toMatch(/range/i);
});

test("rejects invalid farming type", () => {
  const res = validateFarmProfile({ ...valid, farmingType: "" as any });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.farmingType).toMatch(/select/i);
});

test("rejects negative livestock count", () => {
  const res = validateFarmProfile({ ...valid, livestockCount: "-3" });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.errors.livestockCount).toMatch(/range/i);
});
