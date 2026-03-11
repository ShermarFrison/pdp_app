import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";
import { TaskStatus, RiskLevel } from "@/types";

const statusBadge: Record<TaskStatus, "red" | "gray" | "blue" | "green"> = {
  Overdue: "red",
  "Not started": "gray",
  "In progress": "blue",
  Done: "green",
};

const riskColor: Record<RiskLevel, "red" | "amber" | "blue"> = {
  high: "red",
  medium: "amber",
  low: "blue",
};

const riskLabel: Record<RiskLevel, string> = {
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

type FilterTab = "All" | "Overdue" | "Not started" | "Done";
const FILTER_TABS: FilterTab[] = ["All", "Overdue", "Not started", "Done"];

export default function DashboardScreen() {
  const { sessionUser, farmProfile, logout, reports } = useApp();
  const tasks = deriveTasks(farmProfile);
  const draftCount = reports.filter((r) => r.status === "draft").length;
  const overdueTasks = tasks.filter((t) => t.status === "Overdue").length;
  const [filter, setFilter] = useState<FilterTab>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.greeting}>
        <View style={styles.greetingText}>
          <AppText variant="title">Welcome back</AppText>
          <AppText tone="muted">{sessionUser?.name}</AppText>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#3f6a52" />
        </View>
      </View>

      {/* Stats — SCRUM-31 */}
      <View style={styles.statsRow}>
        <Pressable style={[styles.statCard, styles.statTasks]} onPress={() => setFilter("All")}>
          <AppText style={styles.statNumber}>{tasks.length}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Tasks</AppText>
        </Pressable>
        <Pressable style={[styles.statCard, styles.statOverdue]} onPress={() => setFilter("Overdue")}>
          <AppText style={[styles.statNumber, overdueTasks > 0 && styles.statDanger]}>
            {overdueTasks}
          </AppText>
          <AppText variant="caption" style={styles.statLabel}>Overdue</AppText>
        </Pressable>
        <Pressable style={[styles.statCard, styles.statDrafts]}>
          <AppText style={styles.statNumber}>{draftCount}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Drafts</AppText>
        </Pressable>
      </View>

      {/* Task list — SCRUM-31 + SCRUM-32 + SCRUM-42 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={18} color="#3f6a52" />
          <AppText variant="subtitle">Compliance Tasks</AppText>
        </View>

        {/* Filter tabs — SCRUM-31 */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <AppText style={[styles.filterLabel, filter === tab && styles.filterLabelActive]}>
                {tab}
              </AppText>
            </Pressable>
          ))}
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={28} color="#c4b79b" />
            <AppText variant="caption" tone="muted" style={styles.emptyText}>
              Complete your farm profile to generate relevant compliance tasks.
            </AppText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="caption" tone="muted">No tasks with status "{filter}".</AppText>
          </View>
        ) : (
          filtered.map((task, index) => {
            const expanded = expandedId === task.id;
            return (
              <View key={task.id}>
                {index > 0 && <Divider />}
                {/* Tappable task row — SCRUM-32 */}
                <Pressable
                  style={styles.taskItem}
                  onPress={() => setExpandedId(expanded ? null : task.id)}
                >
                  <View style={styles.taskTop}>
                    <AppText style={styles.taskTitle}>{task.title}</AppText>
                    <View style={styles.taskBadges}>
                      {/* Risk badge — SCRUM-42 */}
                      <Badge label={riskLabel[task.riskLevel]} color={riskColor[task.riskLevel]} />
                      <Badge label={task.status} color={statusBadge[task.status]} />
                    </View>
                  </View>
                  <View style={styles.taskMeta}>
                    <Ionicons name="calendar-outline" size={13} color="#a09786" />
                    <AppText variant="caption" tone="muted">Due {task.dueDate}</AppText>
                    <AppText variant="caption" tone="muted">{task.source}</AppText>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={13}
                      color="#a09786"
                      style={styles.chevron}
                    />
                  </View>

                  {/* Expanded detail — SCRUM-32 + SCRUM-42 */}
                  {expanded && (
                    <View style={styles.expandedDetail}>
                      <View style={styles.detailSection}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="list-outline" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">What to do</AppText>
                        </View>
                        <AppText variant="caption" tone="muted" style={styles.detailText}>
                          {task.whatToDo}
                        </AppText>
                      </View>
                      <View style={styles.detailSection}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="information-circle-outline" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">Guidance</AppText>
                        </View>
                        <AppText variant="caption" tone="muted" style={styles.detailText}>
                          {task.guidance}
                        </AppText>
                      </View>
                      {/* Penalty explanation — SCRUM-42 */}
                      <View style={[styles.detailSection, styles.penaltyBox]}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="warning-outline" size={14} color="#8a6514" />
                          <AppText variant="label" style={{ color: "#8a6514" }}>Penalty risk</AppText>
                        </View>
                        <AppText variant="caption" style={styles.penaltyText}>
                          {task.penaltyExplanation}
                        </AppText>
                      </View>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <Card variant="outlined">
        <AppText variant="caption" tone="muted" style={styles.sessionNote}>
          Tap a task to see plain-language guidance and penalty risk.
        </AppText>
      </Card>

      <PrimaryButton label="Sign Out" variant="ghost" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: { gap: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#e6efe9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c5d9cc",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statTasks: { backgroundColor: "#e6efe9", borderColor: "#c5d9cc" },
  statOverdue: { backgroundColor: "#fdf0ef", borderColor: "#f0c4c0" },
  statDrafts: { backgroundColor: "#fdf4e3", borderColor: "#edd9a8" },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#2c2517" },
  statDanger: { color: "#b5332a" },
  statLabel: { color: "#7a7062", fontWeight: "600", fontSize: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
  },
  filterTabActive: {
    backgroundColor: "#e6efe9",
    borderColor: "#3f6a52",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a7062",
  },
  filterLabelActive: {
    color: "#2d5740",
  },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 16 },
  emptyText: { textAlign: "center" },
  taskItem: { gap: 6, paddingVertical: 6 },
  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  taskTitle: { flex: 1, fontWeight: "600", fontSize: 15 },
  taskBadges: { flexDirection: "column", gap: 4, alignItems: "flex-end" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  chevron: { marginLeft: "auto" },
  expandedDetail: {
    marginTop: 8,
    gap: 10,
  },
  detailSection: {
    gap: 4,
    backgroundColor: "#f9f6ef",
    padding: 12,
    borderRadius: 10,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  detailText: {
    lineHeight: 20,
  },
  penaltyBox: {
    backgroundColor: "#fdf8ec",
    borderWidth: 1,
    borderColor: "#edd9a8",
  },
  penaltyText: {
    lineHeight: 20,
    color: "#6b4f18",
  },
  sessionNote: { textAlign: "center" },
});
