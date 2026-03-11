import { ComplianceTask, FarmProfile } from "@/types";

function toStatus(date: string): ComplianceTask["status"] {
  const due = new Date(date).getTime();
  const now = Date.now();

  if (due < now) {
    return "Overdue";
  }

  return "Not started";
}

export function deriveTasks(profile: FarmProfile): ComplianceTask[] {
  const tasks: ComplianceTask[] = [
    {
      id: "buffer-strips",
      title: "Confirm field buffer strips",
      guidance: "Walk boundary fields and note any missing protective strips.",
      dueDate: "2026-04-15",
      status: toStatus("2026-04-15"),
      source: "Baseline CAP requirement",
    },
  ];

  if (Number(profile.hectares || 0) >= 20) {
    tasks.push({
      id: "soil-cover",
      title: "Document winter soil cover",
      guidance: "Capture where soil cover is maintained and record the crop plan.",
      dueDate: "2026-03-20",
      status: toStatus("2026-03-20"),
      source: "Large holding rule",
    });
  }

  if (profile.farmingType === "Dairy" || Number(profile.livestockCount || 0) > 0) {
    tasks.push({
      id: "manure-log",
      title: "Update manure storage log",
      guidance: "Record storage checks and spreading windows in plain language notes.",
      dueDate: "2026-03-18",
      status: toStatus("2026-03-18"),
      source: "Livestock-specific rule",
    });
  }

  return tasks.map((task) => ({
    ...task,
    status: task.status,
  }));
}
