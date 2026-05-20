import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="title">Task detail</AppText>
        <AppText tone="muted">Notification deep-link target.</AppText>
      </View>
      <Card>
        <AppText variant="label" tone="muted">
          Task ID
        </AppText>
        <AppText>{id ?? "(unknown)"}</AppText>
      </Card>
    </Screen>
  );
}
