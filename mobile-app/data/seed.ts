import { AppLanguage, AppState, ComplianceReport, FarmProfile, RegulationChange, User } from "@/types";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

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

export const DEFAULT_REMINDER_OFFSETS = [7];

export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const TICKET_CATEGORIES = [
  "Login / Account",
  "Compliance Tasks",
  "Reports",
  "Profile",
  "Technical Issue",
  "Other",
];

export const SEEDED_REGULATIONS: RegulationChange[] = [
  {
    id: "reg-001",
    title: "GAEC 6 — Minimum Soil Cover Relaxation",
    summary:
      "Farms under 10 ha are now exempt from the winter soil cover requirement for the 2026 reporting cycle. Larger holdings must still maintain at least 80% cover between 1 Nov and 15 Feb.",
    effectiveDate: "2026-01-15",
    publishedAt: "2025-12-20T10:00:00.000Z",
    relatedTaskIds: ["soil-cover"],
    read: false,
  },
  {
    id: "reg-002",
    title: "SMR 1 — Revised Manure Spreading Window",
    summary:
      "The closed period for manure spreading has been adjusted to 15 Oct – 15 Jan for lowland zones. Mountain zones retain the original 1 Oct – 1 Feb window. Updated records must reflect the new dates.",
    effectiveDate: "2026-02-01",
    publishedAt: "2026-01-10T08:00:00.000Z",
    relatedTaskIds: ["manure-log"],
    read: false,
  },
  {
    id: "reg-003",
    title: "Buffer Strip Width Increase for Water-Adjacent Fields",
    summary:
      "Fields adjacent to designated water bodies must now maintain a minimum 5-metre buffer strip, up from 3 metres. Applies to all CAP-enrolled holdings from the 2026 campaign onward.",
    effectiveDate: "2026-04-01",
    publishedAt: "2026-02-15T14:00:00.000Z",
    relatedTaskIds: ["buffer-strips"],
    read: false,
  },
  {
    id: "reg-004",
    title: "New Digital Reporting Requirement for IACS",
    summary:
      "Starting 2026, all CAP payment applications must be submitted through the national IACS digital portal. Paper submissions will no longer be accepted. Training materials available on NMA website.",
    effectiveDate: "2026-03-01",
    publishedAt: "2026-02-28T09:00:00.000Z",
    relatedTaskIds: [],
    read: false,
  },
];

export const INITIAL_STATE: AppState = {
  sessionUser: null,
  farmProfile: EMPTY_PROFILE,
  reports: SEEDED_REPORTS,
  auditLogs: [],
  remindersEnabled: true,
  reminderDaysBefore: INITIAL_REMINDER_DAYS,
  reminderOffsets: DEFAULT_REMINDER_OFFSETS,
  evidenceAttachments: [],
  regulationChanges: SEEDED_REGULATIONS,
  helpTickets: [],
  syncQueue: [],
  isOnline: true,
  ocrExtractions: [],
  syncConflicts: [],
  advisors: [],
  language: DEFAULT_LANGUAGE,
};
