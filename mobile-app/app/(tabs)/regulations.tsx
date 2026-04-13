import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";

export default function RegulationsScreen() {
  const { regulationChanges, markRegulationRead, farmProfile } = useApp();
  const tasks = deriveTasks(farmProfile);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadCount = regulationChanges.filter((r) => !r.read).length;

  async function handlePress(regulationId: string) {
    const isExpanding = expandedId !== regulationId;
    setExpandedId(isExpanding ? regulationId : null);

    if (isExpanding) {
      const reg = regulationChanges.find((r) => r.id === regulationId);
      if (reg && !reg.read) {
        await markRegulationRead(regulationId);
      }
    }
  }

  function getRelatedTaskTitles(taskIds: string[]) {
    return taskIds
      .map((tid) => tasks.find((t) => t.id === tid))
      .filter(Boolean)
      .map((t) => t!.title);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="title">Regulation Changes</AppText>
          {unreadCount > 0 && (
            <Badge label={`${unreadCount} new`} color="red" />
          )}
        </View>
        <AppText tone="muted">
          Stay updated on CAP requirement changes that affect your farm.
        </AppText>
      </View>

      {regulationChanges.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={28} color="#c4b79b" />
            <AppText variant="caption" tone="muted">No regulation changes posted yet.</AppText>
          </View>
        </Card>
      ) : (
        regulationChanges.map((reg, index) => {
          const expanded = expandedId === reg.id;
          const relatedTasks = getRelatedTaskTitles(reg.relatedTaskIds);

          return (
            <Pressable key={reg.id} onPress={() => handlePress(reg.id)}>
              <Card variant={!reg.read ? "elevated" : "default"}>
                <View style={styles.regHeader}>
                  <View style={styles.regTitleRow}>
                    {!reg.read && <View style={styles.unreadDot} />}
                    <AppText style={[styles.regTitle, !reg.read && styles.regTitleUnread]}>
                      {reg.title}
                    </AppText>
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#a09786"
                  />
                </View>

                <View style={styles.regMeta}>
                  <Ionicons name="calendar-outline" size={13} color="#a09786" />
                  <AppText variant="caption" tone="muted">
                    Effective {reg.effectiveDate}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Published {reg.publishedAt.slice(0, 10)}
                  </AppText>
                </View>

                {expanded && (
                  <View style={styles.regDetail}>
                    <AppText variant="caption" style={styles.regSummary}>
                      {reg.summary}
                    </AppText>

                    {relatedTasks.length > 0 && (
                      <View style={styles.relatedSection}>
                        <View style={styles.relatedHeader}>
                          <Ionicons name="link-outline" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">Impacted Tasks</AppText>
                        </View>
                        {relatedTasks.map((title) => (
                          <View key={title} style={styles.relatedTask}>
                            <Ionicons name="checkbox-outline" size={13} color="#3f6a52" />
                            <AppText variant="caption" tone="accent">{title}</AppText>
                          </View>
                        ))}
                        <AppText variant="caption" tone="muted">
                          Go to Dashboard to view full task details and guidance.
                        </AppText>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  regHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  regTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#b5332a",
    marginTop: 4,
  },
  regTitle: {
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
    color: "#2c2517",
  },
  regTitleUnread: {
    fontWeight: "700",
  },
  regMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  regDetail: {
    gap: 10,
    marginTop: 4,
  },
  regSummary: {
    lineHeight: 20,
    color: "#4a4235",
  },
  relatedSection: {
    gap: 6,
    backgroundColor: "#e6efe9",
    padding: 12,
    borderRadius: 10,
  },
  relatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  relatedTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
});
