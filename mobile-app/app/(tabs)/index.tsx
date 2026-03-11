import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";

const statusBadge = {
  Overdue: "red" as const,
  "Not started": "gray" as const,
  "In progress": "blue" as const,
  Done: "green" as const,
};

export default function DashboardScreen() {
  const { sessionUser, farmProfile, logout, reports } = useApp();
  const tasks = deriveTasks(farmProfile);
  const draftCount = reports.filter((report) => report.status === "draft").length;
  const overdueTasks = tasks.filter((t) => t.status === "Overdue").length;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <Screen>
      <View style={styles.greeting}>
        <View style={styles.greetingText}>
          <AppText variant="title">Welcome back</AppText>
          <AppText tone="muted">{sessionUser?.name}</AppText>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#3f6a52" />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statTasks]}>
          <AppText style={styles.statNumber}>{tasks.length}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Tasks</AppText>
        </View>
        <View style={[styles.statCard, styles.statOverdue]}>
          <AppText style={[styles.statNumber, overdueTasks > 0 && styles.statDanger]}>
            {overdueTasks}
          </AppText>
          <AppText variant="caption" style={styles.statLabel}>Overdue</AppText>
        </View>
        <View style={[styles.statCard, styles.statDrafts]}>
          <AppText style={styles.statNumber}>{draftCount}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Drafts</AppText>
        </View>
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={18} color="#3f6a52" />
          <AppText variant="subtitle">Compliance Tasks</AppText>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={28} color="#c4b79b" />
            <AppText variant="caption" tone="muted" style={styles.emptyText}>
              Complete your farm profile to generate relevant compliance tasks.
            </AppText>
          </View>
        ) : (
          tasks.map((task, index) => (
            <View key={task.id}>
              {index > 0 && <Divider />}
              <View style={styles.taskItem}>
                <View style={styles.taskTop}>
                  <AppText style={styles.taskTitle}>{task.title}</AppText>
                  <Badge
                    label={task.status}
                    color={statusBadge[task.status]}
                  />
                </View>
                <View style={styles.taskMeta}>
                  <Ionicons name="calendar-outline" size={13} color="#a09786" />
                  <AppText variant="caption" tone="muted">
                    Due {task.dueDate}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {task.source}
                  </AppText>
                </View>
                <AppText variant="caption" tone="muted" style={styles.taskGuidance}>
                  {task.guidance}
                </AppText>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card variant="outlined">
        <AppText variant="caption" tone="muted" style={styles.sessionNote}>
          Session persistence is enabled. Reopening the app restores your workspace.
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
  greetingText: {
    gap: 2,
  },
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statTasks: {
    backgroundColor: "#e6efe9",
    borderColor: "#c5d9cc",
  },
  statOverdue: {
    backgroundColor: "#fdf0ef",
    borderColor: "#f0c4c0",
  },
  statDrafts: {
    backgroundColor: "#fdf4e3",
    borderColor: "#edd9a8",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2c2517",
  },
  statDanger: {
    color: "#b5332a",
  },
  statLabel: {
    color: "#7a7062",
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  emptyText: {
    textAlign: "center",
  },
  taskItem: {
    gap: 6,
    paddingVertical: 4,
  },
  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  taskTitle: {
    flex: 1,
    fontWeight: "600",
    fontSize: 15,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskGuidance: {
    lineHeight: 19,
  },
  sessionNote: {
    textAlign: "center",
  },
});
