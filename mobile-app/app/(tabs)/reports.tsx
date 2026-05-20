import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { pickDocument } from "@/lib/evidence/picker";
import { copyIntoAppDocs } from "@/lib/evidence/storage";
import type { EvidenceAttachment } from "@/types";

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
    syncConflicts,
    resolveConflict,
    language,
    evidenceAttachments,
    addEvidence,
    removeEvidence,
    retryEvidence,
    retryAllFailedEvidence,
  } = useApp();

  const submittedReports = useMemo(
    () => reports.filter((report) => report.status === "submitted"),
    [reports],
  );
  const draft = useMemo(() => reports.find((report) => report.status === "draft"), [reports]);
  const activeConflict = syncConflicts.find((c) => !c.resolvedAt) ?? null;

  const [message, setMessage] = useState("");
  const [draftForm, setDraftForm] = useState(() => ({
    periodYear: draft?.periodYear ?? String(new Date().getFullYear()),
    inspectionDate: draft?.inspectionDate ?? "",
    fieldSummary: draft?.fieldSummary ?? "",
    notes: draft?.notes ?? "",
  }));
  const [conflictChoices, setConflictChoices] = useState<Record<string, string>>({});
  const router = useRouter();

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

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncReports().then(({ synced, failed }) => {
        if (synced > 0) {
          setMessage(`Auto-synced ${synced} queued report(s).${failed > 0 ? ` ${failed} failed.` : ""}`);
        }
      });
    }
  }, [isOnline]);

  // SCRUM-40: Initialize conflict choices from local values when a conflict appears
  useEffect(() => {
    if (activeConflict) {
      const initial: Record<string, string> = {};
      for (const f of activeConflict.fields) {
        initial[f.field] = String(f.localValue ?? "");
      }
      setConflictChoices(initial);
    }
  }, [activeConflict?.id]);

  async function handleUploadForOcr() {
    if (!draft) {
      setMessage("Create or open a draft before uploading a document.");
      return;
    }
    const picked = await pickDocument();
    if (!picked.ok) return;
    const ext = picked.asset.fileName.includes(".")
      ? picked.asset.fileName.split(".").pop()!
      : "pdf";
    const internalUri = await copyIntoAppDocs(picked.asset.uri, `ocr-${Date.now()}`, ext);
    router.push({
      pathname: "/ocr-review/[reportId]",
      params: { reportId: draft.id, uri: internalUri, fileName: picked.asset.fileName },
    });
  }

  // SCRUM-40: Resolve a sync conflict
  async function handleResolveConflict() {
    if (!activeConflict) return;
    const sources: Record<string, "local" | "remote" | "edited"> = {};
    for (const f of activeConflict.fields) {
      const choice = conflictChoices[f.field];
      sources[f.field] = choice === String(f.localValue ?? "") ? "local" : choice === String(f.remoteValue ?? "") ? "remote" : "edited";
    }
    await resolveConflict(activeConflict.id, conflictChoices, sources);
    setMessage("Conflict resolved. Report submitted successfully.");
  }

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

  async function handleSync() {
    if (syncQueue.length === 0) {
      setMessage("Nothing to sync — all reports are up to date.");
      return;
    }

    const { synced, failed, conflicts } = await syncReports();
    let msg = `Synced ${synced} report(s).`;
    if (failed > 0) msg += ` ${failed} failed.`;
    if (conflicts > 0) msg += ` ${conflicts} conflict(s) detected — resolve below.`;
    setMessage(msg);
  }

  const isSuccess = message.includes("successfully") || message.includes("synced") || message.includes("Auto-synced") || message.includes("saved locally") || message.includes("resolved");
  const isError = message.includes("failed") || message.includes("Could not") || message.includes("required") || message.includes("already have");
  const isQueued = message.includes("queued");

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t("reports.title", language)}</AppText>
        <AppText tone="muted">{t("reports.subtitle", language)}</AppText>
      </View>

      {/* Connectivity indicator */}
      <Card variant="outlined">
        <View style={styles.connectivityRow}>
          <View style={styles.connectivityInfo}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <AppText variant="caption" tone={isOnline ? "success" : "danger"}>
              {isOnline ? t("reports.online", language) : t("reports.offline", language)}
            </AppText>
          </View>
          <Pressable onPress={() => setOnlineStatus(!isOnline)}>
            <AppText variant="caption" tone="accent" style={styles.toggleLink}>
              {isOnline ? t("reports.simulate_offline", language) : t("reports.go_online", language)}
            </AppText>
          </Pressable>
        </View>
        {syncQueue.length > 0 && (
          <View style={styles.syncQueueInfo}>
            <Ionicons name="cloud-upload-outline" size={14} color="#8a6514" />
            <AppText variant="caption" style={{ color: "#8a6514" }}>
              {syncQueue.length} {t("reports.queued", language)}
            </AppText>
            {isOnline && (
              <Pressable onPress={handleSync}>
                <AppText variant="caption" tone="accent" style={styles.toggleLink}>
                  {t("reports.sync_now", language)}
                </AppText>
              </Pressable>
            )}
          </View>
        )}
      </Card>

      {/* SCRUM-40: Conflict resolution card */}
      {activeConflict && (
        <Card variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="git-compare-outline" size={16} color="#8a6514" />
            <AppText variant="subtitle" style={{ color: "#8a6514" }}>
              {t("conflict.title", language)}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted">{t("conflict.subtitle", language)}</AppText>

          {activeConflict.fields.map((field) => {
            const localStr = String(field.localValue ?? "");
            const remoteStr = String(field.remoteValue ?? "");
            return (
              <View key={field.field} style={styles.conflictField}>
                <AppText variant="label" tone="muted" style={styles.conflictFieldKey}>{field.field}</AppText>
                <View style={styles.conflictChips}>
                  <Pressable
                    style={[
                      styles.conflictChip,
                      conflictChoices[field.field] === localStr && styles.conflictChipActive,
                    ]}
                    onPress={() => setConflictChoices((c) => ({ ...c, [field.field]: localStr }))}
                  >
                    <AppText
                      variant="caption"
                      style={conflictChoices[field.field] === localStr ? styles.conflictChipTextActive : styles.conflictChipText}
                    >
                      {t("conflict.local", language)}
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.conflictChip,
                      conflictChoices[field.field] === remoteStr && styles.conflictChipActive,
                    ]}
                    onPress={() => setConflictChoices((c) => ({ ...c, [field.field]: remoteStr }))}
                  >
                    <AppText
                      variant="caption"
                      style={conflictChoices[field.field] === remoteStr ? styles.conflictChipTextActive : styles.conflictChipText}
                    >
                      {t("conflict.server", language)}
                    </AppText>
                  </Pressable>
                </View>
                {conflictChoices[field.field] != null && (
                  <AppText variant="caption" tone="muted" style={styles.conflictPreview}>
                    {conflictChoices[field.field]}
                  </AppText>
                )}
              </View>
            );
          })}

          <PrimaryButton label={t("conflict.resolve", language)} onPress={handleResolveConflict} />
        </Card>
      )}

      {/* SP2: Failed-evidence banner */}
      {(() => {
        const failed = evidenceAttachments.filter((e) => e.uploadStatus === "error");
        if (failed.length === 0) return null;
        return (
          <Card variant="elevated">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="warning-outline" size={16} color="#c0392b" />
              <AppText style={{ flex: 1 }}>
                {`${failed.length} attachment(s) failed to upload — tap to retry all.`}
              </AppText>
              <PrimaryButton label="Retry all" onPress={() => retryAllFailedEvidence()} compact />
            </View>
          </Card>
        );
      })()}

      {/* Create new report button */}
      <PrimaryButton
        label={t("reports.create_new", language)}
        variant="secondary"
        onPress={handleNewReport}
      />

      {/* SCRUM-38: Upload document for OCR (only when draft exists) */}
      {draft && (
        <PrimaryButton
          label={t("reports.upload_document", language)}
          variant="ghost"
          onPress={handleUploadForOcr}
        />
      )}

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="archive-outline" size={16} color="#3f6a52" />
          <AppText variant="subtitle">{t("reports.submitted", language)}</AppText>
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
                <EvidenceSection
                  attachments={evidenceAttachments.filter((e) => e.taskId === report.id || e.reportId === report.id)}
                  readOnly
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
            {draft ? t("reports.edit_draft", language) : t("reports.no_draft", language)}
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

            {/* SP2: Evidence section */}
            <View style={{ marginTop: 12, gap: 8 }}>
              <AppText variant="subtitle">Evidence</AppText>
              <EvidenceSection
                attachments={evidenceAttachments.filter((e) => e.taskId === draft.id || e.reportId === draft.id)}
                onRetry={retryEvidence}
                onRemove={removeEvidence}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <PrimaryButton
                  label="Add photo"
                  variant="secondary"
                  compact
                  onPress={async () => {
                    const r = await addEvidence(draft.id, { kind: "photo" });
                    if (!r.ok && r.error) setMessage(r.error);
                  }}
                />
                <PrimaryButton
                  label="Add PDF"
                  variant="secondary"
                  compact
                  onPress={async () => {
                    const r = await addEvidence(draft.id, { kind: "pdf" });
                    if (!r.ok && r.error) setMessage(r.error);
                  }}
                />
              </View>
            </View>

            <PrimaryButton label={t("reports.save_draft", language)} variant="ghost" onPress={handleSaveDraft} />
            <PrimaryButton label={t("reports.submit", language)} onPress={handleSubmit} />
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

function EvidenceSection(props: {
  attachments: EvidenceAttachment[];
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}) {
  const { attachments, onRetry, onRemove, readOnly } = props;
  if (attachments.length === 0) {
    return <AppText variant="caption" tone="muted">No evidence attached.</AppText>;
  }
  return (
    <View style={{ gap: 8 }}>
      {attachments.map((a) => (
        <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {a.type === "photo" ? (
            <Image source={{ uri: a.uri }} style={{ width: 40, height: 40, borderRadius: 4 }} />
          ) : (
            <Ionicons name="document-text-outline" size={32} color="#3f6a52" />
          )}
          <View style={{ flex: 1 }}>
            <AppText>{a.fileName}</AppText>
            <AppText variant="caption" tone="muted">
              {(a.sizeBytes / 1024).toFixed(1)} KB
            </AppText>
          </View>
          <UploadStatusPill status={a.uploadStatus ?? "pending"} />
          {!readOnly && a.uploadStatus === "error" && onRetry && (
            <PrimaryButton label="Retry" variant="secondary" compact onPress={() => onRetry(a.id)} />
          )}
          {!readOnly && onRemove && (
            <PrimaryButton label="Remove" variant="ghost" compact onPress={() => onRemove(a.id)} />
          )}
        </View>
      ))}
    </View>
  );
}

function UploadStatusPill(props: { status: NonNullable<EvidenceAttachment["uploadStatus"]> }) {
  const label =
    props.status === "ok" ? "uploaded"
    : props.status === "error" ? "failed"
    : "uploading…";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor:
          props.status === "ok" ? "#d8efe1"
          : props.status === "error" ? "#f6d4d2"
          : "#e7ebf2",
      }}
    >
      <AppText variant="caption">{label}</AppText>
    </View>
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
  ocrPanel: {
    backgroundColor: "#e8f0f8",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#c5d5e8",
  },
  ocrWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fdf4e3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ocrActions: {
    gap: 4,
  },
  conflictField: {
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#e8e0cf",
  },
  conflictFieldKey: {
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  conflictChips: {
    flexDirection: "row",
    gap: 8,
  },
  conflictChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
    alignItems: "center",
  },
  conflictChipActive: {
    borderColor: "#8a6514",
    backgroundColor: "#fdf4e3",
  },
  conflictChipText: {
    fontWeight: "600",
    color: "#7a7062",
    fontSize: 13,
  },
  conflictChipTextActive: {
    fontWeight: "700",
    color: "#8a6514",
    fontSize: 13,
  },
  conflictPreview: {
    backgroundColor: "#f4f0e6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    fontStyle: "italic",
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
