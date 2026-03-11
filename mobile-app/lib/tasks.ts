import { ComplianceTask, FarmProfile } from "@/types";

function toStatus(date: string): ComplianceTask["status"] {
  return new Date(date).getTime() < Date.now() ? "Overdue" : "Not started";
}

export function deriveTasks(profile: FarmProfile): ComplianceTask[] {
  const tasks: ComplianceTask[] = [
    {
      id: "buffer-strips",
      title: "Confirm field buffer strips",
      guidance: "Walk boundary fields and note any missing protective strips.",
      whatToDo:
        "1. Walk the perimeter of all fields.\n2. Check that buffer strips of at least 3 metres exist along watercourses.\n3. Photograph any gaps and note their GPS location.\n4. Record findings in your compliance log.",
      dueDate: "2026-04-15",
      status: toStatus("2026-04-15"),
      source: "Baseline CAP requirement",
      riskLevel: "medium",
      penaltyExplanation:
        "Missing or inadequate buffer strips can result in a 3–5% reduction in your CAP direct payment. Repeated non-compliance may lead to additional penalty multipliers in subsequent years.",
    },
  ];

  if (Number(profile.hectares || 0) >= 20) {
    tasks.push({
      id: "soil-cover",
      title: "Document winter soil cover",
      guidance: "Capture where soil cover is maintained and record the crop plan.",
      whatToDo:
        "1. Survey all arable fields after harvest.\n2. Record which fields have winter crop, cover crop, or natural vegetation.\n3. Ensure at least 80% of soil is covered between 1 Nov – 15 Feb.\n4. Upload photographic evidence or add notes to the field log.",
      dueDate: "2026-03-20",
      status: toStatus("2026-03-20"),
      source: "Large holding rule",
      riskLevel: "high",
      penaltyExplanation:
        "GAEC 6 requires minimum soil cover on large holdings. Non-compliance is classified as a high-risk finding and can result in a 5–10% cut to your area payments. Inspectors specifically target this during satellite monitoring reviews.",
    });
  }

  if (profile.farmingType === "Dairy" || Number(profile.livestockCount || 0) > 0) {
    tasks.push({
      id: "manure-log",
      title: "Update manure storage log",
      guidance: "Record storage checks and spreading windows in plain language notes.",
      whatToDo:
        "1. Record the current volume in each manure storage facility.\n2. Confirm no spreading occurred during closed periods (1 Oct – 1 Feb).\n3. Log the date, facility ID, and your name as the responsible person.\n4. Check for any signs of leakage and record the outcome.",
      dueDate: "2026-03-18",
      status: toStatus("2026-03-18"),
      source: "Livestock-specific rule",
      riskLevel: "high",
      penaltyExplanation:
        "SMR 1 (Nitrates Directive) requires accurate manure storage records. Failures here carry some of the highest penalties — up to 10% payment reduction — and can trigger an on-site inspection. Environmental breaches may also attract separate fines from the national authority.",
    });
  }

  return tasks;
}
