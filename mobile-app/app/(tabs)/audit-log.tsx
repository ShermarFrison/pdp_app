import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { AuditEventType } from "@/types";

const eventConfig: Record<AuditEventType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  login: { icon: "log-in-outline", color: "#2a5a8a", bg: "#e8f0f8" },
  logout: { icon: "log-out-outline", color: "#6b6259", bg: "#f0ede6" },
  "profile.save": { icon: "save-outline", color: "#3f6a52", bg: "#e6efe9" },
  "profile.sync": { icon: "cloud-upload-outline", color: "#3f6a52", bg: "#e6efe9" },
  "report.duplicate": { icon: "copy-outline", color: "#8a6514", bg: "#fdf4e3" },
  "report.submit": { icon: "checkmark-circle-outline", color: "#1a6b36", bg: "#e3f3e8" },
};

export default function AuditLogScreen() {
  const { auditLogs } = useApp();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Audit Log</AppText>
        <AppText tone="muted">
          Immutable record of compliance actions with timestamps.
        </AppText>
      </View>

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
            {auditLogs.length} event{auditLogs.length !== 1 ? "s" : ""} recorded
          </AppText>

          {auditLogs.map((entry, index) => {
            const config = eventConfig[entry.type];
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
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: "center",
    paddingHorizontal: 20,
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
