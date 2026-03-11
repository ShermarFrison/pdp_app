import { router } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";

export default function DashboardScreen() {
  const { sessionUser, farmProfile, logout, reports } = useApp();
  const tasks = deriveTasks(farmProfile);
  const draftCount = reports.filter((report) => report.status === "draft").length;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="title">Welcome back</AppText>
        <AppText tone="muted">
          {sessionUser?.name} can review profile-driven tasks, continue draft reports, and inspect the demo audit trail.
        </AppText>
      </View>

      <Card>
        <AppText variant="subtitle">Today&apos;s workspace</AppText>
        <AppText>{tasks.length} personalized compliance tasks are ready.</AppText>
        <AppText>{draftCount} report draft(s) are open for this cycle.</AppText>
        <AppText variant="caption" tone="muted">
          Session persistence is enabled with local storage, so reopening the app restores this dashboard.
        </AppText>
      </Card>

      <Card>
        <AppText variant="subtitle">Compliance Tasks</AppText>
        {tasks.map((task) => (
          <View key={task.id} style={{ gap: 4 }}>
            <AppText>{task.title}</AppText>
            <AppText variant="caption" tone={task.status === "Overdue" ? "danger" : "muted"}>
              Due {task.dueDate} • {task.status} • {task.source}
            </AppText>
            <AppText variant="caption" tone="muted">
              {task.guidance}
            </AppText>
          </View>
        ))}
        {tasks.length === 0 ? (
          <AppText variant="caption" tone="muted">
            Complete your farm profile to generate relevant tasks.
          </AppText>
        ) : null}
      </Card>

      <PrimaryButton label="Sign Out" variant="ghost" onPress={handleLogout} />
    </Screen>
  );
}
