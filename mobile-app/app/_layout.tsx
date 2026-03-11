import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { AppProvider, useApp } from "@/context/AppContext";

function RootNavigator() {
  const { isHydrated } = useApp();

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

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
