import { Ionicons } from "@expo/vector-icons";
import { Redirect, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useApp } from "@/context/AppContext";

/* ---- lazy-loaded screens ---- */
import DashboardScreen from "./index";
import ProfileScreen from "./profile";
import ReportsScreen from "./reports";
import AuditLogScreen from "./audit-log";

const TAB_ITEMS = [
  { key: "dashboard", title: "Dashboard", icon: "grid-outline" as const, iconActive: "grid" as const },
  { key: "profile", title: "Profile", icon: "leaf-outline" as const, iconActive: "leaf" as const },
  { key: "reports", title: "Reports", icon: "document-text-outline" as const, iconActive: "document-text" as const },
  { key: "audit", title: "Audit", icon: "shield-checkmark-outline" as const, iconActive: "shield-checkmark" as const },
];

import { useState } from "react";

export default function TabLayout() {
  const { sessionUser } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!sessionUser) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ---- TOP TAB BAR ---- */}
      <View style={styles.topBar}>
        {TAB_ITEMS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={18}
                color={active ? "#3f6a52" : "#a09786"}
              />
              <AppText style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* ---- SCREEN CONTENT ---- */}
      <View style={styles.content}>
        {activeTab === "dashboard" && <DashboardScreen />}
        {activeTab === "profile" && <ProfileScreen />}
        {activeTab === "reports" && <ReportsScreen />}
        {activeTab === "audit" && <AuditLogScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f0e6",
  },
  topBar: {
    flexDirection: "row",
    backgroundColor: "#fffdf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e0cf",
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: "#e6efe9",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a09786",
  },
  tabLabelActive: {
    color: "#2d5740",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
});
