import { AppLanguage, ComplianceTask, FarmProfile, RiskLevel, TaskStatus } from "@/types";
import { I18nKey, t } from "@/lib/i18n";
import { evaluateRules, Rule } from "@/lib/personalization/evaluate";
import tasksJson from "@/content/tasks.json";
import rulesJson from "@/content/rules.json";

type TaskRecord = {
  id: string;
  titleKey: I18nKey;
  guidanceKey: I18nKey;
  whatToDoKey: I18nKey;
  penaltyKey: I18nKey;
  source: string;
  riskLevel: RiskLevel;
  dueDate: string;
};

function toStatus(date: string): TaskStatus {
  return new Date(date).getTime() < Date.now() ? "Overdue" : "Not started";
}

export function loadTasks(profile: FarmProfile, language: AppLanguage): ComplianceTask[] {
  const matched = evaluateRules(
    profile as unknown as Record<string, unknown>,
    rulesJson as Rule[],
  );
  const records = (tasksJson as TaskRecord[]).filter((r) => matched.has(r.id));
  return records.map((r) => ({
    id: r.id,
    title: t(r.titleKey, language),
    guidance: t(r.guidanceKey, language),
    whatToDo: t(r.whatToDoKey, language),
    penaltyExplanation: t(r.penaltyKey, language),
    dueDate: r.dueDate,
    status: toStatus(r.dueDate),
    source: r.source,
    riskLevel: r.riskLevel,
  }));
}
