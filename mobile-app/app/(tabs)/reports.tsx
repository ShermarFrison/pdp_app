import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";

export default function ReportsScreen() {
  const { reports, duplicateReport, submitReport } = useApp();
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
    setMessage("Previous report duplicated into a new draft. Set the current-cycle fields and submit.");
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

    setMessage("Report submitted successfully and moved into history.");
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="title">Reports</AppText>
        <AppText tone="muted">
          Duplicate the last submitted report, reset current-cycle fields, then follow the normal validation path to submit.
        </AppText>
      </View>

      <Card>
        <AppText variant="subtitle">Previous Submitted Reports</AppText>
        {submittedReports.map((report) => (
          <View key={report.id} style={styles.reportRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText>{report.title}</AppText>
              <AppText variant="caption" tone="muted">
                Cycle {report.periodYear} • Submitted {report.submittedAt?.slice(0, 10)}
              </AppText>
            </View>
            <PrimaryButton label="Duplicate" variant="secondary" onPress={() => handleDuplicate(report.id)} />
          </View>
        ))}
      </Card>

      <Card>
        <AppText variant="subtitle">Editable Draft</AppText>
        {draft ? (
          <>
            <AppText variant="caption" tone="muted">
              Based on report {draft.basedOnReportId}. Inspection date is intentionally reset for the current cycle.
            </AppText>
            <Field
              label="Period Year"
              value={draftForm.periodYear}
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
              onChangeText={(value) => setDraftForm((current) => ({ ...current, fieldSummary: value }))}
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
            <Field
              label="Notes"
              value={draftForm.notes}
              multiline
              onChangeText={(value) => setDraftForm((current) => ({ ...current, notes: value }))}
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
            <PrimaryButton label="Submit Draft" onPress={handleSubmit} />
          </>
        ) : (
          <AppText tone="muted">
            No draft yet. Duplicate a previous report to start this cycle&apos;s submission.
          </AppText>
        )}
        {message ? (
          <AppText variant="caption" tone={message.includes("successfully") ? "success" : "muted"}>
            {message}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reportRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
});
