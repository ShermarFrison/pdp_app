import type { FarmProfile } from "@/types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof FarmProfile, string>> };

const FARMING_TYPES = new Set(["Arable", "Dairy", "Mixed"]);

function isNonNegativeNumber(value: string, max: number): "ok" | "not-number" | "out-of-range" {
  if (value.trim() === "") return "not-number";
  const n = Number(value);
  if (!Number.isFinite(n)) return "not-number";
  if (n < 0 || n > max) return "out-of-range";
  return "ok";
}

export function validateFarmProfile(profile: FarmProfile): ValidationResult {
  const errors: Partial<Record<keyof FarmProfile, string>> = {};

  if (!profile.farmName.trim()) errors.farmName = "Farm name is required.";
  if (!profile.farmerName.trim()) errors.farmerName = "Farmer name is required.";
  if (!profile.location.trim()) errors.location = "Location is required.";

  const ha = isNonNegativeNumber(profile.hectares, 100000);
  if (ha === "not-number") errors.hectares = "Hectares must be a number.";
  else if (ha === "out-of-range") errors.hectares = "Hectares must be in range 0-100000.";

  if (!FARMING_TYPES.has(profile.farmingType)) {
    errors.farmingType = "Select a farming type.";
  }

  const lv = isNonNegativeNumber(profile.livestockCount, 1000000);
  if (lv === "not-number") errors.livestockCount = "Livestock count must be a number.";
  else if (lv === "out-of-range") errors.livestockCount = "Livestock count must be in range 0-1000000.";

  if (Object.keys(errors).length === 0) return { ok: true };
  return { ok: false, errors };
}
