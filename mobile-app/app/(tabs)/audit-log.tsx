import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";

export default function AuditLogScreen() {
  const { auditLogs } = useApp();

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="title">Audit Log</AppText>
        <AppText tone="muted">
          Demo visibility for key compliance actions with user and timestamp metadata.
        </AppText>
      </View>

      <Card>
        {auditLogs.length === 0 ? (
          <AppText tone="muted">No events yet. Login, save a profile, sync, duplicate, or submit a report.</AppText>
        ) : (
          auditLogs.map((entry) => (
            <View key={entry.id} style={{ gap: 4 }}>
              <AppText>{entry.type}</AppText>
              <AppText variant="caption" tone="muted">
                {entry.userEmail} • {new Date(entry.timestamp).toLocaleString()}
              </AppText>
              <AppText variant="caption" tone="muted">
                {entry.details}
              </AppText>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
