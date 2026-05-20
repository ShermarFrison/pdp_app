export type User = {
  id: string;
  name: string;
  email: string;
};

export type ProfileSyncStatus = "clean" | "pending" | "syncing" | "conflict" | "error";

export type FarmProfile = {
  farmName: string;
  farmerName: string;
  location: string;
  hectares: string;
  farmingType: "Arable" | "Dairy" | "Mixed" | "";
  livestockCount: string;
  lastSyncedAt?: string;
  localVersion: number;
  baseVersion: number;
  syncStatus: ProfileSyncStatus;
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
  submissionState?: SubmissionState;
  localVersion?: number;
  baseVersion?: number;
};

export type EvidenceUploadStatus = "pending" | "in-flight" | "ok" | "error";

export type EvidenceAttachment = {
  id: string;
  taskId: string;
  reportId?: string;
  uri: string;
  fileName: string;
  type: "photo" | "pdf";
  sizeBytes: number;
  addedAt: string;
  uploadStatus?: EvidenceUploadStatus;
  uploadError?: string;
  queueItemId?: string;
};

export type SubmissionState = "pending" | "acknowledged" | "conflict" | "failed";

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

export type EntityKind = "report" | "profile";
export type SyncQueueItemStatus = "pending" | "in-flight" | "ok" | "conflict" | "error";
export type SyncOp = "upsert" | "submit";
export type ConflictResolutionSource = "local" | "remote" | "edited";

export type SyncQueueItem = {
  id: string;
  kind: EntityKind;
  op: SyncOp;
  entityId: string;
  payload: Partial<ComplianceReport> | Partial<FarmProfile>;
  baseVersion: number;
  status: SyncQueueItemStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConflictFieldRecord = {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue: unknown;
  resolvedValue?: unknown;
  source?: ConflictResolutionSource;
};

export type SyncConflict = {
  id: string;
  kind: EntityKind;
  entityId: string;
  queueItemId: string;
  fields: ConflictFieldRecord[];
  detectedAt: string;
  resolvedAt?: string;
};

export type AuditEventType =
  | "login"
  | "logout"
  | "profile.save"
  | "profile.sync"
  | "report.duplicate"
  | "report.submit"
  | "report.submit_acknowledged"
  | "report.create"
  | "report.draft_save"
  | "report.sync"
  | "evidence.upload"
  | "evidence.remove"
  | "ticket.submit"
  | "regulation.read"
  | "ocr.prefill"
  | "sync.conflict"
  | "sync.conflict_resolve"
  | "sync.conflict_resolved"
  | "sync.migration_v1"
  | "advisor.invite"
  | "advisor.revoke"
  | "audit.export";

export type AuditLogEntry = {
  id: string;
  type: AuditEventType;
  userEmail: string;
  timestamp: string;
  details: string;
};

export type OcrConfidence = "high" | "low";

export type OcrExtraction = {
  documentType: string;
  documentDate: string;
  referenceId: string;
  confidence: OcrConfidence;
  sourceFileName: string;
  appliedToReportId?: string;
};

export type AdvisorPermission = "read-only" | "edit";

export type Advisor = {
  id: string;
  email: string;
  permission: AdvisorPermission;
  invitedAt: string;
  revokedAt?: string;
  active: boolean;
};

export type AppLanguage = "en" | "lt";

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
  isOnline: boolean;
  ocrExtractions: OcrExtraction[];
  advisors: Advisor[];
  language: AppLanguage;
};
