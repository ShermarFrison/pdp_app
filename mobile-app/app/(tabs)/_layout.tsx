import { Redirect, Tabs } from "expo-router";

import { useApp } from "@/context/AppContext";

export default function TabLayout() {
  const { sessionUser } = useApp();

  if (!sessionUser) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#f3efe5" },
        tabBarStyle: { backgroundColor: "#fffdf8" },
        tabBarActiveTintColor: "#3f6a52",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="audit-log" options={{ title: "Audit" }} />
    </Tabs>
  );
}
