import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";

export default function ReportsScreen() {
  const {
    reports,
    duplicateReport,
    submitReport,
    createNewReport,
    saveDraftOffline,
    syncReports,
    syncQueue,
    isOnline,
    setOnlineStatus,
  } = useApp();

  const submittedReports = useMemo(
    () => reports.filter((report) => report.status === "submitted"),
    [reports],
  );
  const draft = useMemo(() => reports.find((report) => report.status === "draft"), [reports]);
  const [message, setMessage] = useState("");
  const [draftForm, setDraftForm] = useState(() => ({
    periodYear: draft?.periodYear ?? String(new Date().getFullYear()),
    inspectionDate: draft?.inspectionDate ?? "",
    fieldSummary: draft?.fieldSummary ?? "",
    notes: draft?.notes ?? "",
  }));

  useEffect(() => {
    if (draft) {
      setDraftForm({
        periodYear: draft.periodYear,
        inspectionDate: draft.inspectionDate,
        fieldSummary: draft.fieldSummary,
        notes: draft.notes,
      });
    }
  }, [draft]);

  // SCRUM-34: Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncReports().then(({ synced, failed }) => {
        if (synced > 0) {
          setMessage(`Auto-synced ${synced} queued report(s).${failed > 0 ? ` ${failed} failed.` : ""}`);
        }
      });
    }
  }, [isOnline]);

  async function handleDuplicate(reportId: string) {
    const duplicated = await duplicateReport(reportId);

    if (!duplicated) {
      setMessage("Could not duplicate the selected report.");
      return;
    }

    setDraftForm({
      periodYear: duplicated.periodYear,
      inspectionDate: duplicated.inspectionDate,
      fieldSummary: duplicated.fieldSummary,
      notes: duplicated.notes,
    });
    setMessage("Report duplicated into a new draft. Update the fields and submit.");
  }

  // SCRUM-33: Create new blank report
  async function handleNewReport() {
    if (draft) {
      setMessage("You already have an active draft. Submit or discard it first.");
      return;
    }

    const newReport = await createNewReport();
    setDraftForm({
      periodYear: newReport.periodYear,
      inspectionDate: newReport.inspectionDate,
      fieldSummary: newReport.fieldSummary,
      notes: newReport.notes,
    });
    setMessage("New blank report created. Fill in the fields and submit.");
  }

  // SCRUM-34: Save draft offline
  async function handleSaveDraft() {
    if (!draft) {
      setMessage("No active draft to save.");
      return;
    }

    await saveDraftOffline(draft.id, draftForm);
    setMessage("Draft saved locally. You can reopen it later or submit when ready.");
  }

  async function handleSubmit() {
    if (!draft) {
      setMessage("Create a draft from a previous report first.");
      return;
    }

    const result = await submitReport(draft.id, draftForm);

    if (!result.ok) {
      setMessage(result.error ?? "Submission failed.");
      return;
    }

    if (!isOnline) {
      setMessage("You are offline. Report queued for submission — it will sync automatically when you reconnect.");
    } else {
      setMessage("Report submitted successfully and moved into history.");
    }
  }

  // SCRUM-34: Manual sync
  async function handleSync() {
    if (syncQueue.length === 0) {
      setMessage("Nothing to sync — all reports are up to date.");
      return;
    }

    const { synced, failed } = await syncReports();
    setMessage(`Synced ${synced} report(s).${failed > 0 ? ` ${failed} failed.` : ""}`);
  }

  const isSuccess = message.includes("successfully") || message.includes("synced") || message.includes("Auto-synced") || message.includes("saved locally");
  const isError = message.includes("failed") || message.includes("Could not") || message.includes("required") || message.includes("already have");
  const isQueued = message.includes("queued");

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Reports</AppText>
        <AppText tone="muted">
          Create, edit, and submit compliance reports.
        </AppText>
      </View>

      {/* SCRUM-34: Online/Offline indicator */}
      <Card variant="outlined">
        <View style={styles.connectivityRow}>
          <View style={styles.connectivityInfo}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <AppText variant="caption" tone={isOnline ? "success" : "danger"}>
              {isOnline ? "Online" : "Offline — drafts saved locally"}
            </AppText>
          </View>
          <Pressable onPress={() => setOnlineStatus(!isOnline)}>
            <AppText variant="caption" tone="accent" style={styles.toggleLink}>
              {isOnline ? "Simulate Offline" : "Go Online"}
            </AppText>
          </Pressable>
        </View>
        {syncQueue.length > 0 && (
          <View style={styles.syncQueueInfo}>
            <Ionicons name="cloud-upload-outline" size={14} color="#8a6514" />
            <AppText variant="caption" style={{ color: "#8a6514" }}>
              {syncQueue.length} action(s) queued for sync
            </AppText>
            {isOnline && (
              <Pressable onPress={handleSync}>
                <AppText variant="caption" tone="accent" style={styles.toggleLink}>Sync Now</AppText>
              </Pressable>
            )}
          </View>
        )}
      </Card>

      {/* SCRUM-33: Create New Report button */}
      <PrimaryButton
        label="Create New Report"
        variant="secondary"
        onPress={handleNewReport}
      />

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="archive-outline" size={16} color="#3f6a52" />
          <AppText variant="subtitle">Submitted Reports</AppText>
        </View>

        {submittedReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={24} color="#c4b79b" />
            <AppText variant="caption" tone="muted">No submitted reports yet.</AppText>
          </View>
        ) : (
          submittedReports.map((report, index) => (
            <View key={report.id}>
              {index > 0 && <Divider />}
              <View style={styles.reportItem}>
                <View style={styles.reportTopRow}>
                  <AppText style={styles.reportTitle}>{report.title}</AppText>
                  <Badge label={report.periodYear} color="green" />
                </View>
                <View style={styles.reportMeta}>
                  <Ionicons name="checkmark-circle" size={13} color="#1f7a3f" />
                  <AppText variant="caption" tone="success">
                    Submitted {report.submittedAt?.slice(0, 10)}
                  </AppText>
                  <AppText variant="caption" tone="muted">{report.scheme}</AppText>
                </View>
                <PrimaryButton
                  label="Duplicate as New Draft"
                  variant="secondary"
                  compact
                  onPress={() => handleDuplicate(report.id)}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card variant={draft ? "elevated" : "default"}>
        <View style={styles.sectionHeader}>
          <Ionicons name="create-outline" size={16} color={draft ? "#3f6a52" : "#a09786"} />
          <AppText variant="subtitle">
            {draft ? "Edit Draft" : "No Draft"}
          </AppText>
          {draft && <Badge label="Draft" color="amber" />}
        </View>

        {draft ? (
          <>
            {draft.basedOnReportId ? (
              <View style={styles.basedOn}>
                <Ionicons name="git-branch-outline" size={13} color="#a09786" />
                <AppText variant="caption" tone="muted">
                  Based on {draft.basedOnReportId}
                </AppText>
              </View>
            ) : null}

            <Field
              label="Period Year"
              value={draftForm.periodYear}
              keyboardType="numeric"
              onChangeText={(value) => setDraftForm((current) => ({ ...current, periodYear: value }))}
            />
            <Field
              label="Inspection Date"
              value={draftForm.inspectionDate}
              placeholder="YYYY-MM-DD"
              onChangeText={(value) => setDraftForm((current) => ({ ...current, inspectionDate: value }))}
            />
            <Field
              label="Field Summary"
              value={draftForm.fieldSummary}
              multiline
              placeholder="Describe field conditions and compliance status..."
              onChangeText={(value) => setDraftForm((current) => ({ ...current, fieldSummary: value }))}
            />
            <Field
              label="Notes"
              value={draftForm.notes}
              multiline
              placeholder="Additional observations..."
              onChangeText={(value) => setDraftForm((current) => ({ ...current, notes: value }))}
            />

            {/* SCRUM-34: Save Draft Offline */}
            <PrimaryButton label="Save Draft" variant="ghost" onPress={handleSaveDraft} />
            <PrimaryButton label="Submit Report" onPress={handleSubmit} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="copy-outline" size={24} color="#c4b79b" />
            <AppText variant="caption" tone="muted" style={styles.emptyText}>
              Create a new report or duplicate a submitted report to start a draft.
            </AppText>
          </View>
        )}
      </Card>

      {message ? (
        <View
          style={[
            styles.messageBar,
            isSuccess ? styles.messageSuccess : isError ? styles.messageError : isQueued ? styles.messageQueued : styles.messageInfo,
          ]}
        >
          <Ionicons
            name={isSuccess ? "checkmark-circle" : isError ? "alert-circle" : isQueued ? "cloud-upload" : "information-circle"}
            size={16}
            color={isSuccess ? "#1f7a3f" : isError ? "#b5332a" : isQueued ? "#8a6514" : "#3f6a52"}
          />
          <AppText
            variant="caption"
            tone={isSuccess ? "success" : isError ? "danger" : "accent"}
            style={styles.messageText}
          >
            {message}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  emptyText: {
    textAlign: "center",
  },
  reportItem: {
    gap: 8,
    paddingVertical: 4,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reportTitle: {
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
  },
  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  basedOn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f4f0e6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectivityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectivityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: "#1f7a3f",
  },
  dotOffline: {
    backgroundColor: "#b5332a",
  },
  toggleLink: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  syncQueueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#fdf8ec",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  messageBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  messageSuccess: {
    backgroundColor: "#e3f3e8",
    borderColor: "#b2dbc2",
  },
  messageError: {
    backgroundColor: "#fdf0ef",
    borderColor: "#f0c4c0",
  },
  messageQueued: {
    backgroundColor: "#fdf8ec",
    borderColor: "#edd9a8",
  },
  messageInfo: {
    backgroundColor: "#e6efe9",
    borderColor: "#c5d9cc",
  },
  messageText: {
    flex: 1,
  },
});
