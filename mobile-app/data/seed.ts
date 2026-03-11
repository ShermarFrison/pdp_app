import { AppState, ComplianceReport, FarmProfile, User } from "@/types";

export const DEFAULT_USER: User = {
  id: "farmer-001",
  name: "Jonas Petrauskas",
  email: "farmer@pdp.test",
};

export const DEFAULT_PASSWORD = "harvest123";

export const EMPTY_PROFILE: FarmProfile = {
  farmName: "",
  farmerName: "",
  location: "Lithuania",
  hectares: "",
  farmingType: "",
  livestockCount: "",
};

export const SEEDED_REPORTS: ComplianceReport[] = [
  {
    id: "report-2025-submitted",
    title: "Annual CAP Compliance Report",
    scheme: "GAEC baseline",
    periodYear: "2025",
    inspectionDate: "2025-09-15",
    fieldSummary: "Pasture rotation and buffer strips reviewed.",
    notes: "No major findings. Follow-up photos archived.",
    status: "submitted",
    submittedAt: "2025-09-16T09:30:00.000Z",
  },
];

export const INITIAL_REMINDER_DAYS = 7;

export const INITIAL_STATE: AppState = {
  sessionUser: null,
  farmProfile: EMPTY_PROFILE,
  reports: SEEDED_REPORTS,
  auditLogs: [],
  remindersEnabled: true,
  reminderDaysBefore: INITIAL_REMINDER_DAYS,
};
