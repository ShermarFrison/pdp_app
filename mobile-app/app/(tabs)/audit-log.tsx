import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { AuditEventType } from "@/types";

const DEFAULT_EVENT_CONFIG = { icon: "ellipse-outline" as const, color: "#6b6259", bg: "#f0ede6" };

const eventConfig: Partial<Record<AuditEventType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }>> = {
  login: { icon: "log-in-outline", color: "#2a5a8a", bg: "#e8f0f8" },
  logout: { icon: "log-out-outline", color: "#6b6259", bg: "#f0ede6" },
  "profile.save": { icon: "save-outline", color: "#3f6a52", bg: "#e6efe9" },
  "profile.sync": { icon: "cloud-upload-outline", color: "#3f6a52", bg: "#e6efe9" },
  "report.duplicate": { icon: "copy-outline", color: "#8a6514", bg: "#fdf4e3" },
  "report.submit": { icon: "checkmark-circle-outline", color: "#1a6b36", bg: "#e3f3e8" },
  "report.create": { icon: "add-circle-outline", color: "#2a5a8a", bg: "#e8f0f8" },
  "report.draft_save": { icon: "save-outline", color: "#8a6514", bg: "#fdf4e3" },
  "report.sync": { icon: "sync-outline", color: "#3f6a52", bg: "#e6efe9" },
  "evidence.upload": { icon: "attach", color: "#3f6a52", bg: "#e6efe9" },
  "evidence.remove": { icon: "trash-outline", color: "#b5332a", bg: "#fdf0ef" },
  "ticket.submit": { icon: "help-circle-outline", color: "#2a5a8a", bg: "#e8f0f8" },
  "regulation.read": { icon: "newspaper-outline", color: "#8a6514", bg: "#fdf4e3" },
  "ocr.prefill": { icon: "scan-outline", color: "#2a5a8a", bg: "#e8f0f8" },
  "sync.conflict": { icon: "git-compare-outline", color: "#8a6514", bg: "#fdf4e3" },
  "sync.conflict_resolve": { icon: "checkmark-done-outline", color: "#1a6b36", bg: "#e3f3e8" },
  "advisor.invite": { icon: "person-add-outline", color: "#3f6a52", bg: "#e6efe9" },
  "advisor.revoke": { icon: "person-remove-outline", color: "#b5332a", bg: "#fdf0ef" },
  "audit.export": { icon: "download-outline", color: "#2a5a8a", bg: "#e8f0f8" },
};

export default function AuditLogScreen() {
  const { auditLogs, exportAuditLog, language } = useApp();

  const today = new Date().toISOString().slice(0, 10);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo, setExportTo] = useState(today);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportContent, setExportContent] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  async function handleGenerateExport() {
    const content = await exportAuditLog(exportFrom, exportTo, exportFormat);
    setExportContent(content);
    setExportMessage("");
  }

  async function handleCopy() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Clipboard } = require("react-native");
      Clipboard.setString(exportContent);
      setExportMessage(t("export.copied", language));
    } catch {
      setExportMessage("Copy not supported — please select and copy the text manually.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t("audit.title", language)}</AppText>
        <AppText tone="muted">{t("audit.subtitle", language)}</AppText>
      </View>

      {/* SCRUM-47: Export button */}
      <PrimaryButton
        label={t("audit.export", language)}
        variant="secondary"
        onPress={() => setShowExport((v) => !v)}
      />

      {/* SCRUM-47: Export card */}
      {showExport && (
        <Card variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="download-outline" size={16} color="#2a5a8a" />
            <AppText variant="subtitle" style={{ color: "#2a5a8a" }}>
              {t("audit.export_title", language)}
            </AppText>
          </View>

          <Field
            label={t("export.date_from", language)}
            value={exportFrom}
            placeholder="YYYY-MM-DD"
            onChangeText={setExportFrom}
          />
          <Field
            label={t("export.date_to", language)}
            value={exportTo}
            placeholder="YYYY-MM-DD"
            onChangeText={setExportTo}
          />

          <SegmentedControl
            label="Format"
            options={["CSV", "JSON"]}
            value={exportFormat.toUpperCase()}
            onSelect={(val) => setExportFormat(val.toLowerCase() as "csv" | "json")}
          />

          <PrimaryButton label={t("export.generate", language)} onPress={handleGenerateExport} />

          {exportContent ? (
            <>
              <AppText variant="label" tone="muted">{t("export.preview", language)}</AppText>
              <ScrollView style={styles.previewBox} nestedScrollEnabled>
                <AppText style={styles.previewText}>
                  {exportContent.slice(0, 500)}
                  {exportContent.length > 500 ? "\n…" : ""}
                </AppText>
              </ScrollView>
              <PrimaryButton
                label={t("export.copy_clipboard", language)}
                variant="ghost"
                onPress={handleCopy}
              />
            </>
          ) : null}

          {exportMessage ? (
            <View style={styles.exportMsg}>
              <Ionicons name="checkmark-circle" size={14} color="#1f7a3f" />
              <AppText variant="caption" tone="success">{exportMessage}</AppText>
            </View>
          ) : null}
        </Card>
      )}

      {auditLogs.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={32} color="#c4b79b" />
            <AppText variant="caption" tone="muted" style={styles.emptyText}>
              No events recorded yet. Actions like login, profile changes, and report submissions will appear here.
            </AppText>
          </View>
        </Card>
      ) : (
        <Card>
          <AppText variant="label" tone="muted">
            {auditLogs.length} {t("audit.events_count", language)}
          </AppText>

          {auditLogs.map((entry, index) => {
            const config = eventConfig[entry.type] ?? DEFAULT_EVENT_CONFIG;
            return (
              <View key={entry.id}>
                {index > 0 && <Divider />}
                <View style={styles.eventRow}>
                  <View style={[styles.eventIcon, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon} size={16} color={config.color} />
                  </View>
                  <View style={styles.eventContent}>
                    <View style={styles.eventTop}>
                      <AppText style={styles.eventType}>{entry.type}</AppText>
                      <AppText variant="caption" tone="muted" style={styles.eventTime}>
                        {formatTime(entry.timestamp)}
                      </AppText>
                    </View>
                    <AppText variant="caption" tone="muted">
                      {entry.details}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={styles.eventEmail}>
                      {entry.userEmail}
                    </AppText>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString();
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
    gap: 10,
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: "center",
    paddingHorizontal: 20,
  },
  previewBox: {
    maxHeight: 160,
    backgroundColor: "#f4f0e6",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd3be",
  },
  previewText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#4a4235",
    lineHeight: 16,
  },
  exportMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e3f3e8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 6,
  },
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
    gap: 2,
  },
  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventType: {
    fontWeight: "600",
    fontSize: 14,
  },
  eventTime: {
    fontSize: 11,
  },
  eventEmail: {
    fontSize: 11,
    fontStyle: "italic",
  },
});
