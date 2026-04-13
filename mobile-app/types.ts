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

export type RiskLevel = "low" | "medium" | "high";

export type ComplianceTask = {
  id: string;
  title: string;
  guidance: string;
  whatToDo: string;
  dueDate: string;
  status: TaskStatus;
  source: string;
  riskLevel: RiskLevel;
  penaltyExplanation: string;
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

export type EvidenceAttachment = {
  id: string;
  taskId: string;
  uri: string;
  fileName: string;
  type: "photo" | "pdf";
  sizeBytes: number;
  addedAt: string;
};

export type RegulationChange = {
  id: string;
  title: string;
  summary: string;
  effectiveDate: string;
  publishedAt: string;
  relatedTaskIds: string[];
  read: boolean;
};

export type TicketStatus = "open" | "in_progress" | "resolved";

export type HelpTicket = {
  id: string;
  category: string;
  message: string;
  screenshotUri?: string;
  status: TicketStatus;
  createdAt: string;
  confirmationId: string;
};

export type SyncQueueItem = {
  id: string;
  action: "report.submit" | "report.save";
  payload: Partial<ComplianceReport> & { reportId: string };
  createdAt: string;
};

export type AuditEventType =
  | "login"
  | "logout"
  | "profile.save"
  | "profile.sync"
  | "report.duplicate"
  | "report.submit"
  | "report.create"
  | "report.draft_save"
  | "report.sync"
  | "evidence.upload"
  | "evidence.remove"
  | "ticket.submit"
  | "regulation.read";

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
  remindersEnabled: boolean;
  reminderDaysBefore: number;
  reminderOffsets: number[];
  evidenceAttachments: EvidenceAttachment[];
  regulationChanges: RegulationChange[];
  helpTickets: HelpTicket[];
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
};
