import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import { DEFAULT_PASSWORD, DEFAULT_USER, EMPTY_PROFILE, SEEDED_REPORTS } from "@/data/seed";
import { loadState, saveState } from "@/lib/storage";
import { AppState, AuditEventType, ComplianceReport, FarmProfile, User } from "@/types";
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
  setReminders: (enabled: boolean, daysBefore: number) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  saveProfile: (profile: FarmProfile) => Promise<void>;
  syncProfile: () => Promise<void>;
  duplicateReport: (reportId: string) => Promise<ComplianceReport | null>;
  submitReport: (reportId: string, updates: Partial<ComplianceReport>) => Promise<{ ok: boolean; error?: string }>;
};

const AppContext = createContext<AppContextValue | null>(null);

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>({
    sessionUser: null,
    farmProfile: EMPTY_PROFILE,
    reports: SEEDED_REPORTS,
    auditLogs: [],
    remindersEnabled: true,
    reminderDaysBefore: INITIAL_REMINDER_DAYS,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      const loaded = await loadState();
      setState(loaded);
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
        setReminders,
        login,
        logout,
        saveProfile,
        syncProfile,
        duplicateReport,
        submitReport,
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
