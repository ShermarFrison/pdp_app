export type User = {
  id: string;
  name: string;
  email: string;
};

export type FarmProfile = {
  farmName: string;
  farmerName: string;
  location: string;
  hectares: string;
  farmingType: "Arable" | "Dairy" | "Mixed" | "";
  livestockCount: string;
  lastSyncedAt?: string;
};

export type TaskStatus = "Not started" | "In progress" | "Overdue" | "Done";

export type ComplianceTask = {
  id: string;
  title: string;
  guidance: string;
  dueDate: string;
  status: TaskStatus;
  source: string;
};

export type ReportStatus = "draft" | "submitted";

export type ComplianceReport = {
  id: string;
  title: string;
  scheme: string;
  periodYear: string;
  inspectionDate: string;
  fieldSummary: string;
  notes: string;
  status: ReportStatus;
  submittedAt?: string;
  basedOnReportId?: string;
};

export type AuditEventType =
  | "login"
  | "logout"
  | "profile.save"
  | "profile.sync"
  | "report.duplicate"
  | "report.submit";

export type AuditLogEntry = {
  id: string;
  type: AuditEventType;
  userEmail: string;
  timestamp: string;
  details: string;
};

export type AppState = {
  sessionUser: User | null;
  farmProfile: FarmProfile;
  reports: ComplianceReport[];
  auditLogs: AuditLogEntry[];
};
