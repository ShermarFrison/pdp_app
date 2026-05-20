import { AppLanguage, ComplianceTask, FarmProfile } from "@/types";
import { loadTasks } from "@/lib/personalization";

export function deriveTasks(profile: FarmProfile, language: AppLanguage = "en"): ComplianceTask[] {
  return loadTasks(profile, language);
}
