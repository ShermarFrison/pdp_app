import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import {
  DEFAULT_LANGUAGE,
  DEFAULT_PASSWORD,
  DEFAULT_REMINDER_OFFSETS,
  DEFAULT_USER,
  EMPTY_PROFILE,
  INITIAL_REMINDER_DAYS,
  MAX_EVIDENCE_SIZE_BYTES,
  SEEDED_REGULATIONS,
  SEEDED_REPORTS,
} from "@/data/seed";
import { loadState, saveState } from "@/lib/storage";
import {
  Advisor,
  AdvisorPermission,
  AppLanguage,
  AppState,
  AuditEventType,
  ComplianceReport,
  ConflictField,
  ConflictFieldKey,
  EvidenceAttachment,
  FarmProfile,
  HelpTicket,
  OcrExtraction,
  RegulationChange,
  SyncConflict,
  SyncQueueItem,
  User,
} from "@/types";

type LoginResult = {
  ok: boolean;
  error?: string;
};

type AppContextValue = {
  isHydrated: boolean;
  sessionUser: User | null;
  farmProfile: FarmProfile;
  reports: ComplianceReport[];
  auditLogs: AppState["auditLogs"];
  remindersEnabled: boolean;
  reminderDaysBefore: number;
  reminderOffsets: number[];
  evidenceAttachments: EvidenceAttachment[];
  regulationChanges: RegulationChange[];
  helpTickets: HelpTicket[];
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  ocrExtractions: OcrExtraction[];
  syncConflicts: SyncConflict[];
  advisors: Advisor[];
  language: AppLanguage;

  setReminders: (enabled: boolean, daysBefore: number) => void;
  setReminderOffsets: (offsets: number[]) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  saveProfile: (profile: FarmProfile) => Promise<void>;
  syncProfile: () => Promise<void>;
  duplicateReport: (reportId: string) => Promise<ComplianceReport | null>;
  submitReport: (reportId: string, updates: Partial<ComplianceReport>) => Promise<{ ok: boolean; error?: string }>;
  createNewReport: () => Promise<ComplianceReport>;
  saveDraftOffline: (reportId: string, updates: Partial<ComplianceReport>) => Promise<void>;
  syncReports: () => Promise<{ synced: number; failed: number; conflicts: number }>;
  setOnlineStatus: (online: boolean) => void;
  addEvidence: (taskId: string, uri: string, fileName: string, type: "photo" | "pdf", sizeBytes: number) => Promise<{ ok: boolean; error?: string }>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  getEvidenceForTask: (taskId: string) => EvidenceAttachment[];
  markRegulationRead: (regulationId: string) => Promise<void>;
  submitHelpTicket: (category: string, message: string, screenshotUri?: string) => Promise<HelpTicket>;
  applyOcrExtraction: (reportId: string, extraction: OcrExtraction) => Promise<void>;
  resolveConflict: (conflictId: string, resolutions: Partial<Record<ConflictFieldKey, string>>) => Promise<void>;
  inviteAdvisor: (email: string, permission: AdvisorPermission) => Promise<{ ok: boolean; error?: string }>;
  revokeAdvisor: (advisorId: string) => Promise<void>;
  setLanguage: (lang: AppLanguage) => void;
  exportAuditLog: (fromDate: string, toDate: string, format: "csv" | "json") => Promise<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function confirmationCode() {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>({
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
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      const loaded = await loadState();
      setState((prev) => ({
        ...prev,
        ...loaded,
        reminderOffsets: loaded.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS,
        evidenceAttachments: loaded.evidenceAttachments ?? [],
        regulationChanges: loaded.regulationChanges ?? SEEDED_REGULATIONS,
        helpTickets: loaded.helpTickets ?? [],
        syncQueue: loaded.syncQueue ?? [],
        isOnline: loaded.isOnline ?? true,
        ocrExtractions: loaded.ocrExtractions ?? [],
        syncConflicts: loaded.syncConflicts ?? [],
        advisors: loaded.advisors ?? [],
        language: loaded.language ?? DEFAULT_LANGUAGE,
      }));
      setIsHydrated(true);
    }

    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveState(state);
  }, [isHydrated, state]);

  async function appendLog(type: AuditEventType, details: string, userEmail?: string) {
    setState((current) => ({
      ...current,
      auditLogs: [
        {
          id: id("log"),
          type,
          userEmail: userEmail ?? current.sessionUser?.email ?? "anonymous",
          timestamp: new Date().toISOString(),
          details,
        },
        ...current.auditLogs,
      ],
    }));
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== DEFAULT_USER.email || password !== DEFAULT_PASSWORD) {
      return {
        ok: false,
        error: "Invalid credentials. Use farmer@pdp.test / harvest123.",
      };
    }

    setState((current) => ({
      ...current,
      sessionUser: DEFAULT_USER,
    }));
    await appendLog("login", "Farmer session started.", DEFAULT_USER.email);

    return { ok: true };
  }

  async function logout() {
    const email = state.sessionUser?.email;
    setState((current) => ({
      ...current,
      sessionUser: null,
    }));
    await appendLog("logout", "Farmer session cleared.", email);
  }

  async function saveProfile(profile: FarmProfile) {
    setState((current) => ({
      ...current,
      farmProfile: { ...profile },
    }));
    await appendLog("profile.save", "Farm profile saved locally.");
  }

  async function syncProfile() {
    setState((current) => ({
      ...current,
      farmProfile: {
        ...current.farmProfile,
        lastSyncedAt: new Date().toISOString(),
      },
    }));
    await appendLog("profile.sync", "Farm profile synced to mocked backend.");
  }

  async function duplicateReport(reportId: string) {
    const source = state.reports.find((report) => report.id === reportId && report.status === "submitted");

    if (!source) {
      return null;
    }

    const duplicated: ComplianceReport = {
      ...source,
      id: id("report"),
      status: "draft",
      periodYear: String(new Date().getFullYear()),
      inspectionDate: "",
      submittedAt: undefined,
      basedOnReportId: source.id,
    };

    setState((current) => ({
      ...current,
      reports: [duplicated, ...current.reports],
    }));
    await appendLog("report.duplicate", `Duplicated report ${source.id} into draft ${duplicated.id}.`);

    return duplicated;
  }

  function setReminders(enabled: boolean, daysBefore: number) {
    setState((current) => ({
      ...current,
      remindersEnabled: enabled,
      reminderDaysBefore: daysBefore,
    }));
  }

  function setReminderOffsets(offsets: number[]) {
    setState((current) => ({
      ...current,
      reminderOffsets: offsets.sort((a, b) => b - a),
    }));
  }

  async function submitReport(reportId: string, updates: Partial<ComplianceReport>) {
    const existing = state.reports.find((report) => report.id === reportId);

    if (!existing) {
      return { ok: false, error: "Draft not found." };
    }

    const merged = { ...existing, ...updates };

    if (!merged.periodYear || !merged.inspectionDate || !merged.fieldSummary.trim()) {
      return {
        ok: false,
        error: "Period year, inspection date, and field summary are required.",
      };
    }

    if (!state.isOnline) {
      setState((current) => ({
        ...current,
        reports: current.reports.map((report) =>
          report.id === reportId ? { ...report, ...updates } : report,
        ),
        syncQueue: [
          ...current.syncQueue,
          {
            id: id("sync"),
            action: "report.submit",
            payload: { reportId, ...updates },
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      await appendLog("report.draft_save", `Report ${reportId} queued for submission when online.`);
      return { ok: true };
    }

    setState((current) => ({
      ...current,
      reports: current.reports.map((report) =>
        report.id === reportId
          ? {
              ...report,
              ...updates,
              status: "submitted",
              submittedAt: new Date().toISOString(),
            }
          : report,
      ),
    }));
    await appendLog("report.submit", `Submitted report ${reportId}.`);

    return { ok: true };
  }

  async function createNewReport(): Promise<ComplianceReport> {
    const newReport: ComplianceReport = {
      id: id("report"),
      title: "CAP Compliance Report",
      scheme: "GAEC baseline",
      periodYear: String(new Date().getFullYear()),
      inspectionDate: "",
      fieldSummary: "",
      notes: "",
      status: "draft",
    };

    setState((current) => ({
      ...current,
      reports: [newReport, ...current.reports],
    }));
    await appendLog("report.create", `Created new blank report ${newReport.id}.`);

    return newReport;
  }

  async function saveDraftOffline(reportId: string, updates: Partial<ComplianceReport>) {
    setState((current) => ({
      ...current,
      reports: current.reports.map((report) =>
        report.id === reportId ? { ...report, ...updates } : report,
      ),
    }));
    await appendLog("report.draft_save", `Draft ${reportId} saved locally.`);
  }

  // SCRUM-40: Sync queued reports with conflict detection
  async function syncReports(): Promise<{ synced: number; failed: number; conflicts: number }> {
    const queue = state.syncQueue;
    let synced = 0;
    let failed = 0;
    const newConflicts: SyncConflict[] = [];
    const conflictReportIds: string[] = [];
    const submittedIds: string[] = [];

    for (const item of queue) {
      if (item.action === "report.submit") {
        const report = state.reports.find((r) => r.id === item.payload.reportId);
        if (report) {
          const merged = { ...report, ...item.payload };
          if (merged.fieldSummary || merged.notes) {
            const fields: ConflictField[] = [];
            if (merged.fieldSummary) {
              fields.push({
                key: "fieldSummary",
                localValue: merged.fieldSummary,
                serverValue: merged.fieldSummary + " [server revision]",
              });
            }
            if (merged.notes) {
              fields.push({
                key: "notes",
                localValue: merged.notes,
                serverValue: merged.notes + " [server note]",
              });
            }
            newConflicts.push({
              id: id("conflict"),
              reportId: item.payload.reportId,
              fields,
              detectedAt: new Date().toISOString(),
            });
            conflictReportIds.push(item.payload.reportId);
          } else {
            submittedIds.push(item.payload.reportId);
            synced++;
          }
        } else {
          failed++;
        }
      }
    }

    const now = new Date().toISOString();
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) =>
        submittedIds.includes(r.id)
          ? { ...r, status: "submitted", submittedAt: now }
          : r,
      ),
      syncConflicts: [
        ...current.syncConflicts.filter((c) => !newConflicts.some((nc) => nc.reportId === c.reportId)),
        ...newConflicts,
      ],
      syncQueue: current.syncQueue.filter((item) =>
        conflictReportIds.includes(item.payload.reportId),
      ),
    }));

    if (newConflicts.length > 0) {
      await appendLog("sync.conflict", `${newConflicts.length} conflict(s) detected during sync.`);
    }
    if (synced > 0) {
      await appendLog("report.sync", `Synced ${synced} queued report(s).${failed > 0 ? ` ${failed} failed.` : ""}`);
    }

    return { synced, failed, conflicts: newConflicts.length };
  }

  function setOnlineStatus(online: boolean) {
    setState((current) => ({
      ...current,
      isOnline: online,
    }));
  }

  async function addEvidence(
    taskId: string,
    uri: string,
    fileName: string,
    type: "photo" | "pdf",
    sizeBytes: number,
  ): Promise<{ ok: boolean; error?: string }> {
    if (sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
      return { ok: false, error: `File exceeds the 10 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(1)} MB).` };
    }

    const attachment: EvidenceAttachment = {
      id: id("evidence"),
      taskId,
      uri,
      fileName,
      type,
      sizeBytes,
      addedAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      evidenceAttachments: [...current.evidenceAttachments, attachment],
    }));
    await appendLog("evidence.upload", `Uploaded ${type} "${fileName}" for task ${taskId}.`);

    return { ok: true };
  }

  async function removeEvidence(evidenceId: string) {
    const attachment = state.evidenceAttachments.find((e) => e.id === evidenceId);
    setState((current) => ({
      ...current,
      evidenceAttachments: current.evidenceAttachments.filter((e) => e.id !== evidenceId),
    }));
    if (attachment) {
      await appendLog("evidence.remove", `Removed "${attachment.fileName}" from task ${attachment.taskId}.`);
    }
  }

  function getEvidenceForTask(taskId: string): EvidenceAttachment[] {
    return state.evidenceAttachments.filter((e) => e.taskId === taskId);
  }

  async function markRegulationRead(regulationId: string) {
    setState((current) => ({
      ...current,
      regulationChanges: current.regulationChanges.map((r) =>
        r.id === regulationId ? { ...r, read: true } : r,
      ),
    }));
    await appendLog("regulation.read", `Marked regulation ${regulationId} as read.`);
  }

  async function submitHelpTicket(category: string, message: string, screenshotUri?: string): Promise<HelpTicket> {
    const ticket: HelpTicket = {
      id: id("ticket"),
      category,
      message,
      screenshotUri,
      status: "open",
      createdAt: new Date().toISOString(),
      confirmationId: confirmationCode(),
    };

    setState((current) => ({
      ...current,
      helpTickets: [ticket, ...current.helpTickets],
    }));
    await appendLog("ticket.submit", `Help ticket ${ticket.confirmationId} submitted: ${category}.`);

    return ticket;
  }

  // SCRUM-38: Apply OCR extraction to a report
  async function applyOcrExtraction(reportId: string, extraction: OcrExtraction) {
    const withApplied: OcrExtraction = { ...extraction, appliedToReportId: reportId };
    setState((current) => ({
      ...current,
      ocrExtractions: [...current.ocrExtractions, withApplied],
    }));
    await appendLog("ocr.prefill", `OCR extraction from "${extraction.sourceFileName}" applied to report ${reportId}.`);
  }

  // SCRUM-40: Resolve a sync conflict
  async function resolveConflict(conflictId: string, resolutions: Partial<Record<ConflictFieldKey, string>>) {
    const conflict = state.syncConflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    const resolvedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) =>
        r.id === conflict.reportId
          ? { ...r, ...(resolutions as Partial<ComplianceReport>), status: "submitted", submittedAt: resolvedAt }
          : r,
      ),
      syncConflicts: current.syncConflicts.map((c) =>
        c.id === conflictId
          ? {
              ...c,
              fields: c.fields.map((f) => ({
                ...f,
                chosenValue: resolutions[f.key] ?? f.localValue,
              })),
              resolvedAt,
            }
          : c,
      ),
      syncQueue: current.syncQueue.filter((item) => item.payload.reportId !== conflict.reportId),
    }));
    await appendLog("sync.conflict_resolve", `Conflict ${conflictId} resolved for report ${conflict.reportId}.`);
  }

  // SCRUM-43: Invite an advisor
  async function inviteAdvisor(email: string, permission: AdvisorPermission): Promise<{ ok: boolean; error?: string }> {
    if (!email.includes("@")) {
      return { ok: false, error: "Invalid email address." };
    }
    const duplicate = state.advisors.find((a) => a.email === email && a.active);
    if (duplicate) {
      return { ok: false, error: "This advisor is already active." };
    }
    const advisor: Advisor = {
      id: id("advisor"),
      email,
      permission,
      invitedAt: new Date().toISOString(),
      active: true,
    };
    setState((current) => ({
      ...current,
      advisors: [...current.advisors, advisor],
    }));
    await appendLog("advisor.invite", `Invited advisor ${email} with ${permission} access.`);
    return { ok: true };
  }

  // SCRUM-43: Revoke advisor access
  async function revokeAdvisor(advisorId: string) {
    const advisor = state.advisors.find((a) => a.id === advisorId);
    setState((current) => ({
      ...current,
      advisors: current.advisors.map((a) =>
        a.id === advisorId ? { ...a, active: false, revokedAt: new Date().toISOString() } : a,
      ),
    }));
    if (advisor) {
      await appendLog("advisor.revoke", `Revoked advisor access for ${advisor.email}.`);
    }
  }

  // SCRUM-44: Set interface language
  function setLanguage(lang: AppLanguage) {
    setState((current) => ({ ...current, language: lang }));
  }

  // SCRUM-47: Export audit log
  async function exportAuditLog(fromDate: string, toDate: string, format: "csv" | "json"): Promise<string> {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const filtered = state.auditLogs.filter((entry) => {
      const ts = new Date(entry.timestamp);
      return ts >= from && ts <= to;
    });

    let content: string;
    if (format === "csv") {
      const header = "id,type,userEmail,timestamp,details";
      const rows = filtered.map((e) =>
        [e.id, e.type, e.userEmail, e.timestamp, `"${e.details.replace(/"/g, '""')}"`].join(","),
      );
      content = [header, ...rows].join("\n");
    } else {
      content = JSON.stringify(filtered, null, 2);
    }

    await appendLog(
      "audit.export",
      `Exported ${filtered.length} audit log entries (${format.toUpperCase()}) from ${fromDate} to ${toDate}.`,
    );
    return content;
  }

  return (
    <AppContext.Provider
      value={{
        isHydrated,
        sessionUser: state.sessionUser,
        farmProfile: state.farmProfile,
        reports: state.reports,
        auditLogs: state.auditLogs,
        remindersEnabled: state.remindersEnabled,
        reminderDaysBefore: state.reminderDaysBefore,
        reminderOffsets: state.reminderOffsets,
        evidenceAttachments: state.evidenceAttachments,
        regulationChanges: state.regulationChanges,
        helpTickets: state.helpTickets,
        syncQueue: state.syncQueue,
        isOnline: state.isOnline,
        ocrExtractions: state.ocrExtractions,
        syncConflicts: state.syncConflicts,
        advisors: state.advisors,
        language: state.language,

        setReminders,
        setReminderOffsets,
        login,
        logout,
        saveProfile,
        syncProfile,
        duplicateReport,
        submitReport,
        createNewReport,
        saveDraftOffline,
        syncReports,
        setOnlineStatus,
        addEvidence,
        removeEvidence,
        getEvidenceForTask,
        markRegulationRead,
        submitHelpTicket,
        applyOcrExtraction,
        resolveConflict,
        inviteAdvisor,
        revokeAdvisor,
        setLanguage,
        exportAuditLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }

  return context;
}
