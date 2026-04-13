import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import {
  DEFAULT_PASSWORD,
  DEFAULT_USER,
  EMPTY_PROFILE,
  SEEDED_REPORTS,
  SEEDED_REGULATIONS,
  DEFAULT_REMINDER_OFFSETS,
  MAX_EVIDENCE_SIZE_BYTES,
} from "@/data/seed";
import { loadState, saveState } from "@/lib/storage";
import {
  AppState,
  AuditEventType,
  ComplianceReport,
  EvidenceAttachment,
  FarmProfile,
  HelpTicket,
  RegulationChange,
  SyncQueueItem,
  User,
} from "@/types";
import { INITIAL_REMINDER_DAYS } from "@/data/seed";

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
  syncReports: () => Promise<{ synced: number; failed: number }>;
  setOnlineStatus: (online: boolean) => void;
  addEvidence: (taskId: string, uri: string, fileName: string, type: "photo" | "pdf", sizeBytes: number) => Promise<{ ok: boolean; error?: string }>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  getEvidenceForTask: (taskId: string) => EvidenceAttachment[];
  markRegulationRead: (regulationId: string) => Promise<void>;
  submitHelpTicket: (category: string, message: string, screenshotUri?: string) => Promise<HelpTicket>;
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
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      const loaded = await loadState();
      setState((prev) => ({
        ...prev,
        ...loaded,
        // Ensure new fields have defaults for existing stored state
        reminderOffsets: loaded.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS,
        evidenceAttachments: loaded.evidenceAttachments ?? [],
        regulationChanges: loaded.regulationChanges ?? SEEDED_REGULATIONS,
        helpTickets: loaded.helpTickets ?? [],
        syncQueue: loaded.syncQueue ?? [],
        isOnline: loaded.isOnline ?? true,
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
      farmProfile: {
        ...profile,
      },
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
      // Queue for later sync
      setState((current) => ({
        ...current,
        reports: current.reports.map((report) =>
          report.id === reportId
            ? { ...report, ...updates }
            : report,
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

  // SCRUM-33: Create a new blank report
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

  // SCRUM-34: Save draft offline
  async function saveDraftOffline(reportId: string, updates: Partial<ComplianceReport>) {
    setState((current) => ({
      ...current,
      reports: current.reports.map((report) =>
        report.id === reportId
          ? { ...report, ...updates }
          : report,
      ),
    }));
    await appendLog("report.draft_save", `Draft ${reportId} saved locally.`);
  }

  // SCRUM-34: Sync queued reports
  async function syncReports(): Promise<{ synced: number; failed: number }> {
    const queue = state.syncQueue;
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.action === "report.submit") {
        const report = state.reports.find((r) => r.id === item.payload.reportId);
        if (report) {
          setState((current) => ({
            ...current,
            reports: current.reports.map((r) =>
              r.id === item.payload.reportId
                ? { ...r, status: "submitted", submittedAt: new Date().toISOString() }
                : r,
            ),
          }));
          synced++;
        } else {
          failed++;
        }
      }
    }

    setState((current) => ({
      ...current,
      syncQueue: [],
    }));

    if (synced > 0) {
      await appendLog("report.sync", `Synced ${synced} queued report(s). ${failed > 0 ? `${failed} failed.` : ""}`);
    }

    return { synced, failed };
  }

  function setOnlineStatus(online: boolean) {
    setState((current) => ({
      ...current,
      isOnline: online,
    }));
  }

  // SCRUM-37: Add evidence attachment
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

  // SCRUM-45: Mark regulation as read
  async function markRegulationRead(regulationId: string) {
    setState((current) => ({
      ...current,
      regulationChanges: current.regulationChanges.map((r) =>
        r.id === regulationId ? { ...r, read: true } : r,
      ),
    }));
    await appendLog("regulation.read", `Marked regulation ${regulationId} as read.`);
  }

  // SCRUM-46: Submit help ticket
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
