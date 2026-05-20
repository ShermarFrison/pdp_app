import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppProvider, useApp } from "@/context/AppContext";
import { registerNotificationTapHandler } from "@/lib/notifications";

function RootNavigator() {
  const { isHydrated } = useApp();

  useEffect(() => {
    const sub = registerNotificationTapHandler();
    return () => sub.remove();
  }, []);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f0e6",
        }}
      >
        <ActivityIndicator size="large" color="#3f6a52" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="conflicts/[id]"
        options={{ presentation: "modal", title: "Resolve conflict", headerShown: true }}
      />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
