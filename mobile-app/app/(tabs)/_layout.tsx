import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useApp } from "@/context/AppContext";

import DashboardScreen from "./index";
import ProfileScreen from "./profile";
import ReportsScreen from "./reports";
import AuditLogScreen from "./audit-log";
import CalendarScreen from "./calendar";
import RegulationsScreen from "./regulations";
import HelpScreen from "./help";

const TAB_ITEMS = [
  { key: "dashboard", title: "Dashboard", icon: "grid-outline" as const, iconActive: "grid" as const },
  { key: "calendar", title: "Calendar", icon: "calendar-outline" as const, iconActive: "calendar" as const },
  { key: "reports", title: "Reports", icon: "document-text-outline" as const, iconActive: "document-text" as const },
  { key: "regulations", title: "Rules", icon: "newspaper-outline" as const, iconActive: "newspaper" as const },
  { key: "profile", title: "Profile", icon: "leaf-outline" as const, iconActive: "leaf" as const },
  { key: "help", title: "Help", icon: "help-circle-outline" as const, iconActive: "help-circle" as const },
  { key: "audit", title: "Audit", icon: "shield-checkmark-outline" as const, iconActive: "shield-checkmark" as const },
];

export default function TabLayout() {
  const { sessionUser, regulationChanges } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!sessionUser) {
    return <Redirect href="/login" />;
  }

  const unreadRegulations = regulationChanges.filter((r) => !r.read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* TOP TAB BAR */}
      <View style={styles.topBar}>
        {TAB_ITEMS.map((tab) => {
          const active = activeTab === tab.key;
          const showBadge = tab.key === "regulations" && unreadRegulations > 0;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={17}
                  color={active ? "#3f6a52" : "#a09786"}
                />
                {showBadge && <View style={styles.badgeDot} />}
              </View>
              <AppText style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* SCREEN CONTENT */}
      <View style={styles.content}>
        {activeTab === "dashboard" && <DashboardScreen />}
        {activeTab === "calendar" && <CalendarScreen />}
        {activeTab === "reports" && <ReportsScreen />}
        {activeTab === "regulations" && <RegulationsScreen />}
        {activeTab === "profile" && <ProfileScreen />}
        {activeTab === "help" && <HelpScreen />}
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
    paddingBottom: 6,
    paddingTop: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: "#e6efe9",
  },
  tabLabel: {
    fontSize: 8,
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
  badgeDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#b5332a",
    borderWidth: 1,
    borderColor: "#fffdf8",
  },
});
