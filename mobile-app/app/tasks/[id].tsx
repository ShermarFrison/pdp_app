import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { farmProfile, language } = useApp();
  const task = deriveTasks(farmProfile, language).find((entry) => entry.id === String(id));
  return (
    <Screen>
      <Card>
        {task ? (
          <View style={{ gap: 8 }}>
            <AppText variant="title">{task.title}</AppText>
            <AppText tone="muted">{task.source}</AppText>
            <AppText>{task.guidance}</AppText>
            <AppText variant="caption">{task.whatToDo}</AppText>
            <AppText variant="caption" tone="danger">
              {task.penaltyExplanation}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <AppText variant="title">Task detail</AppText>
            <AppText tone="muted">
              Task {String(id)} is not in your current personalization set.
            </AppText>
          </View>
        )}
      </Card>
    </Screen>
  );
}
