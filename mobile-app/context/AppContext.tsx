import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";

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
import { loadState, migrateLegacySyncSlices, saveState } from "@/lib/storage";
import {
  createSyncQueue,
  LocalSimulatedSyncClient,
  type SyncClient,
  type SyncQueueSnapshot,
} from "@/lib/sync";
import { copyIntoAppDocs, remove as removeFromDocs } from "@/lib/evidence/storage";
import { pickPhoto, pickDocument, type PickResult } from "@/lib/evidence/picker";
import { submitReport as submitReportViaQueue, observeSubmission } from "@/lib/reports";
import { validateFarmProfile } from "@/lib/validation/farmProfile";
import {
  Advisor,
  AdvisorPermission,
  AppLanguage,
  AppState,
  AuditEventType,
  ComplianceReport,
  ConflictResolutionSource,
  EvidenceAttachment,
  FarmProfile,
  HelpTicket,
  OcrExtraction,
  RegulationChange,
  SyncConflict,
  SyncQueueItem,
  User,
} from "@/types";

type LoginResult = { ok: boolean; error?: string };

export class ProfileValidationError extends Error {
  errors: Partial<Record<keyof FarmProfile, string>>;
  constructor(errors: Partial<Record<keyof FarmProfile, string>>) {
    super("Profile validation failed");
    this.errors = errors;
  }
}

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
  addEvidence: (taskId: string, source: { kind: "photo" } | { kind: "pdf" }) => Promise<{ ok: boolean; error?: string }>;
  retryEvidence: (evidenceId: string) => Promise<void>;
  retryAllFailedEvidence: () => Promise<void>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  getEvidenceForTask: (taskId: string) => EvidenceAttachment[];
  markRegulationRead: (regulationId: string) => Promise<void>;
  submitHelpTicket: (category: string, message: string, screenshotUri?: string) => Promise<HelpTicket>;
  applyOcrExtraction: (reportId: string, extraction: OcrExtraction) => Promise<void>;
  resolveConflict: (
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, ConflictResolutionSource>,
  ) => Promise<void>;
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

const syncQueue = createSyncQueue({ now: () => Date.now(), random: () => Math.random() });
const syncClient: SyncClient = new LocalSimulatedSyncClient({
  seed: 1337,
  conflictRate: 0.25,
  transientRate: 0.05,
});

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
    isOnline: true,
    ocrExtractions: [],
    advisors: [],
    language: DEFAULT_LANGUAGE,
  });
  const [queueSnapshot, setQueueSnapshot] = useState<SyncQueueSnapshot>({ items: [], conflicts: [] });
  const [isHydrated, setIsHydrated] = useState(false);
  const migrationLoggedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(setQueueSnapshot);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe((snapshot) => {
      setState((current) => {
        let changed = false;
        const nextEvidence = current.evidenceAttachments.map((e) => {
          if (!e.queueItemId) return e;
          const q = snapshot.items.find((i) => i.id === e.queueItemId);
          let status: EvidenceAttachment["uploadStatus"];
          if (!q) {
            status = "ok";
          } else {
            switch (q.status) {
              case "pending": status = "pending"; break;
              case "in-flight": status = "in-flight"; break;
              case "ok": status = "ok"; break;
              case "error":
              case "conflict": status = "error"; break;
              default: status = e.uploadStatus;
            }
          }
          const nextError = q?.lastError;
          if (status === e.uploadStatus && nextError === e.uploadError) return e;
          changed = true;
          return { ...e, uploadStatus: status, uploadError: nextError };
        });
        return changed ? { ...current, evidenceAttachments: nextEvidence } : current;
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function hydrate() {
      const migration = await migrateLegacySyncSlices();
      const loaded = await loadState();
      await syncQueue.hydrate();
      setState((prev) => ({
        ...prev,
        ...loaded,
        farmProfile: { ...EMPTY_PROFILE, ...loaded.farmProfile },
        reminderOffsets: loaded.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS,
        evidenceAttachments: loaded.evidenceAttachments ?? [],
        regulationChanges: loaded.regulationChanges ?? SEEDED_REGULATIONS,
        helpTickets: loaded.helpTickets ?? [],
        isOnline: loaded.isOnline ?? true,
        ocrExtractions: loaded.ocrExtractions ?? [],
        advisors: loaded.advisors ?? [],
        language: loaded.language ?? DEFAULT_LANGUAGE,
      }));
      setIsHydrated(true);
      if (migration.kind === "migrated" && !migrationLoggedRef.current) {
        migrationLoggedRef.current = true;
        await appendLog(
          "sync.migration_v1",
          `Migrated ${migration.movedQueueItems} queue item(s) and ${migration.movedConflicts} conflict(s).`,
        );
      }
      void syncQueue.drain(syncClient);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(state);
  }, [isHydrated, state]);

  useEffect(() => {
    if (!isHydrated) return;
    for (const r of state.reports) {
      if (r.submissionState !== "pending") continue;
      const pending = observeSubmission(syncQueue, r.id);
      if (!pending) continue;
      pending.then(({ submissionState }) => {
        setState((current) => ({
          ...current,
          reports: current.reports.map((x) =>
            x.id === r.id
              ? {
                  ...x,
                  submissionState,
                  status: submissionState === "acknowledged" ? "submitted" : x.status,
                  submittedAt: submissionState === "acknowledged" ? new Date().toISOString() : x.submittedAt,
                }
              : x,
          ),
        }));
        if (submissionState === "acknowledged") {
          void appendLog("report.submit_acknowledged", `Report ${r.id} acknowledged by remote.`);
        }
      });
    }
    // intentionally one-shot on hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "active") void syncQueue.drain(syncClient);
    });
    return () => sub.remove();
  }, [isHydrated]);

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
      return { ok: false, error: "Invalid credentials. Use farmer@pdp.test / harvest123." };
    }
    setState((current) => ({ ...current, sessionUser: DEFAULT_USER }));
    await appendLog("login", "Farmer session started.", DEFAULT_USER.email);
    return { ok: true };
  }

  async function logout() {
    const email = state.sessionUser?.email;
    setState((current) => ({ ...current, sessionUser: null }));
    await appendLog("logout", "Farmer session cleared.", email);
  }

  async function saveProfile(profile: FarmProfile) {
    const validation = validateFarmProfile(profile);
    if (!validation.ok) throw new ProfileValidationError(validation.errors);

    const next: FarmProfile = {
      ...profile,
      localVersion: profile.localVersion + 1,
      syncStatus: "pending",
    };
    setState((current) => ({ ...current, farmProfile: next }));
    await appendLog("profile.save", "Farm profile saved locally.");
    await syncQueue.enqueue({
      kind: "profile",
      op: "upsert",
      entityId: "self",
      payload: next,
      baseVersion: next.baseVersion,
    });
    void syncQueue.drain(syncClient);
  }

  async function syncProfile() {
    setState((current) => ({ ...current, farmProfile: { ...current.farmProfile, syncStatus: "syncing" } }));
    await syncQueue.drain(syncClient);
    setState((current) => ({
      ...current,
      farmProfile: { ...current.farmProfile, lastSyncedAt: new Date().toISOString() },
    }));
    await appendLog("profile.sync", "Farm profile sync requested.");
  }

  async function duplicateReport(reportId: string) {
    const source = state.reports.find((r) => r.id === reportId && r.status === "submitted");
    if (!source) return null;
    const duplicated: ComplianceReport = {
      ...source,
      id: id("report"),
      status: "draft",
      periodYear: String(new Date().getFullYear()),
      inspectionDate: "",
      submittedAt: undefined,
      basedOnReportId: source.id,
    };
    setState((current) => ({ ...current, reports: [duplicated, ...current.reports] }));
    await appendLog("report.duplicate", `Duplicated report ${source.id} into draft ${duplicated.id}.`);
    return duplicated;
  }

  function setReminders(enabled: boolean, daysBefore: number) {
    setState((current) => ({ ...current, remindersEnabled: enabled, reminderDaysBefore: daysBefore }));
  }
  function setReminderOffsets(offsets: number[]) {
    setState((current) => ({ ...current, reminderOffsets: offsets.sort((a, b) => b - a) }));
  }

  async function submitReport(reportId: string, updates: Partial<ComplianceReport>) {
    const existing = state.reports.find((r) => r.id === reportId);
    if (!existing) return { ok: false, error: "Draft not found." };
    const merged = { ...existing, ...updates };
    if (!merged.periodYear || !merged.inspectionDate || !merged.fieldSummary.trim()) {
      return { ok: false, error: "Period year, inspection date, and field summary are required." };
    }

    setState((current) => ({
      ...current,
      reports: current.reports.map((r) =>
        r.id === reportId
          ? { ...r, ...updates, submissionState: "pending", localVersion: (r.localVersion ?? 0) + 1 }
          : r,
      ),
    }));
    await appendLog("report.submit", `Submitted report ${reportId} (queued for acknowledgement).`);

    void submitReportViaQueue(syncQueue, {
      report: merged,
      updates,
      onState: (s) => {
        if (s === "in-flight" || s === "pending") return;
        setState((current) => ({
          ...current,
          reports: current.reports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  submissionState: s,
                  status: s === "acknowledged" ? "submitted" : r.status,
                  submittedAt: s === "acknowledged" ? new Date().toISOString() : r.submittedAt,
                }
              : r,
          ),
        }));
        if (s === "acknowledged") {
          void appendLog("report.submit_acknowledged", `Report ${reportId} acknowledged by remote.`);
        }
      },
    });

    if (state.isOnline) {
      void syncQueue.drain(syncClient);
    }
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
    setState((current) => ({ ...current, reports: [newReport, ...current.reports] }));
    await appendLog("report.create", `Created new blank report ${newReport.id}.`);
    return newReport;
  }

  async function saveDraftOffline(reportId: string, updates: Partial<ComplianceReport>) {
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) => (r.id === reportId ? { ...r, ...updates } : r)),
    }));
    await appendLog("report.draft_save", `Draft ${reportId} saved locally.`);
  }

  async function syncReports() {
    const before = queueSnapshot.items.length;
    const result = await syncQueue.drain(syncClient);
    const after = syncQueue.getSnapshot();
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) => {
        const okItem = before > 0 && !after.items.some((it) => it.entityId === r.id) && r.status === "draft";
        return okItem ? { ...r, status: "submitted", submittedAt: new Date().toISOString() } : r;
      }),
    }));
    if (result.ok > 0) await appendLog("report.sync", `Synced ${result.ok} queued report(s).`);
    if (result.conflicts > 0) await appendLog("sync.conflict", `${result.conflicts} conflict(s) detected during sync.`);
    return { synced: result.ok, failed: result.permanent, conflicts: result.conflicts };
  }

  function setOnlineStatus(online: boolean) {
    setState((current) => ({ ...current, isOnline: online }));
    if (online) void syncQueue.drain(syncClient);
  }

  async function addEvidence(
    taskId: string,
    source: { kind: "photo" } | { kind: "pdf" },
  ): Promise<{ ok: boolean; error?: string }> {
    const pickRes: PickResult = source.kind === "photo" ? await pickPhoto() : await pickDocument();
    if (!pickRes.ok) {
      if (pickRes.reason === "cancelled") return { ok: true };
      if (pickRes.reason === "permission_denied") {
        return { ok: false, error: "Permission to access media was denied." };
      }
      return { ok: false, error: pickRes.message ?? "Could not open picker." };
    }
    const asset = pickRes.asset;
    if (asset.sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
      return { ok: false, error: `File exceeds the 10 MB size limit (${(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB).` };
    }

    const evidenceId = id("evidence");
    const ext = asset.fileName.includes(".") ? asset.fileName.split(".").pop()! : (source.kind === "photo" ? "jpg" : "pdf");

    let persistentUri: string;
    try {
      persistentUri = await copyIntoAppDocs(asset.uri, evidenceId, ext);
    } catch (e) {
      return { ok: false, error: `Failed to save file locally: ${(e as Error).message}` };
    }

    const queueItem = await syncQueue.enqueue({
      kind: "evidence",
      op: "upload",
      entityId: evidenceId,
      payload: {
        evidenceId,
        taskId,
        persistentUri,
        fileName: asset.fileName,
        sizeBytes: asset.sizeBytes,
      },
      baseVersion: 0,
    });

    const attachment: EvidenceAttachment = {
      id: evidenceId,
      taskId,
      uri: persistentUri,
      fileName: asset.fileName,
      type: source.kind,
      sizeBytes: asset.sizeBytes,
      addedAt: new Date().toISOString(),
      uploadStatus: "pending",
      queueItemId: queueItem.id,
    };

    setState((current) => ({
      ...current,
      evidenceAttachments: [...current.evidenceAttachments, attachment],
    }));
    await appendLog("evidence.upload", `Uploaded ${source.kind} "${asset.fileName}" for task ${taskId}.`);
    return { ok: true };
  }

  async function removeEvidence(evidenceId: string) {
    const attachment = state.evidenceAttachments.find((e) => e.id === evidenceId);
    if (attachment) {
      try { await removeFromDocs(attachment.uri); } catch { /* idempotent */ }
    }
    setState((current) => ({
      ...current,
      evidenceAttachments: current.evidenceAttachments.filter((e) => e.id !== evidenceId),
    }));
    if (attachment) {
      await appendLog("evidence.remove", `Removed "${attachment.fileName}" from task ${attachment.taskId}.`);
    }
  }

  async function retryEvidence(evidenceId: string) {
    const att = state.evidenceAttachments.find((e) => e.id === evidenceId);
    if (!att) return;
    const newItem = await syncQueue.enqueue({
      kind: "evidence",
      op: "upload",
      entityId: att.id,
      payload: {
        evidenceId: att.id,
        taskId: att.taskId,
        persistentUri: att.uri,
        fileName: att.fileName,
        sizeBytes: att.sizeBytes,
      },
      baseVersion: 0,
    });
    setState((current) => ({
      ...current,
      evidenceAttachments: current.evidenceAttachments.map((e) =>
        e.id === evidenceId ? { ...e, uploadStatus: "pending", queueItemId: newItem.id, uploadError: undefined } : e,
      ),
    }));
  }

  async function retryAllFailedEvidence() {
    const failed = state.evidenceAttachments.filter((e) => e.uploadStatus === "error");
    for (const att of failed) {
      await retryEvidence(att.id);
    }
  }

  function getEvidenceForTask(taskId: string) {
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

  async function submitHelpTicket(category: string, message: string, screenshotUri?: string) {
    const ticket: HelpTicket = {
      id: id("ticket"),
      category,
      message,
      screenshotUri,
      status: "open",
      createdAt: new Date().toISOString(),
      confirmationId: confirmationCode(),
    };
    setState((current) => ({ ...current, helpTickets: [ticket, ...current.helpTickets] }));
    await appendLog("ticket.submit", `Help ticket ${ticket.confirmationId} submitted: ${category}.`);
    return ticket;
  }

  async function applyOcrExtraction(reportId: string, extraction: OcrExtraction) {
    const withApplied: OcrExtraction = { ...extraction, appliedToReportId: reportId };
    setState((current) => ({ ...current, ocrExtractions: [...current.ocrExtractions, withApplied] }));
    await appendLog("ocr.prefill", `OCR extraction from "${extraction.sourceFileName}" applied to report ${reportId}.`);
  }

  async function resolveConflict(
    conflictId: string,
    merged: Record<string, unknown>,
    fieldSources: Record<string, ConflictResolutionSource>,
  ) {
    const conflict = queueSnapshot.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    if (conflict.kind === "report") {
      setState((current) => ({
        ...current,
        reports: current.reports.map((r) =>
          r.id === conflict.entityId
            ? { ...r, ...(merged as Partial<ComplianceReport>), status: "submitted", submittedAt: new Date().toISOString() }
            : r,
        ),
      }));
    } else {
      setState((current) => ({
        ...current,
        farmProfile: { ...current.farmProfile, ...(merged as Partial<FarmProfile>), syncStatus: "clean" },
      }));
    }

    await syncQueue.resolveConflict(conflictId, merged, fieldSources);
    await appendLog(
      "sync.conflict_resolved",
      `Resolved ${conflict.kind} conflict ${conflictId} (${Object.entries(fieldSources)
        .map(([f, s]) => `${f}:${s}`)
        .join(",")}).`,
    );
  }

  async function inviteAdvisor(email: string, permission: AdvisorPermission) {
    if (!email.includes("@")) return { ok: false, error: "Invalid email address." };
    const duplicate = state.advisors.find((a) => a.email === email && a.active);
    if (duplicate) return { ok: false, error: "This advisor is already active." };
    const advisor: Advisor = {
      id: id("advisor"),
      email,
      permission,
      invitedAt: new Date().toISOString(),
      active: true,
    };
    setState((current) => ({ ...current, advisors: [...current.advisors, advisor] }));
    await appendLog("advisor.invite", `Invited advisor ${email} with ${permission} access.`);
    return { ok: true };
  }

  async function revokeAdvisor(advisorId: string) {
    const advisor = state.advisors.find((a) => a.id === advisorId);
    setState((current) => ({
      ...current,
      advisors: current.advisors.map((a) =>
        a.id === advisorId ? { ...a, active: false, revokedAt: new Date().toISOString() } : a,
      ),
    }));
    if (advisor) await appendLog("advisor.revoke", `Revoked advisor access for ${advisor.email}.`);
  }

  function setLanguage(lang: AppLanguage) {
    setState((current) => ({ ...current, language: lang }));
  }

  async function exportAuditLog(fromDate: string, toDate: string, format: "csv" | "json") {
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

  const value = useMemo<AppContextValue>(
    () => ({
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
      syncQueue: queueSnapshot.items,
      isOnline: state.isOnline,
      ocrExtractions: state.ocrExtractions,
      syncConflicts: queueSnapshot.conflicts,
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
      retryEvidence,
      retryAllFailedEvidence,
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
    }),
    [isHydrated, state, queueSnapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
