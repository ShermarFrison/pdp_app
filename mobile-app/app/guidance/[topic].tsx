import { useLocalSearchParams } from "expo-router";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export default function GuidanceScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  return (
    <Screen>
      <Card>
        <AppText variant="title">Guidance: {String(topic)}</AppText>
        <AppText tone="muted">
          Detailed CAP guidance for this topic. Tap an impacted task on a regulation feed item to drill into the task itself.
        </AppText>
      </Card>
    </Screen>
  );
}
