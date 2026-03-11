import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

type BadgeProps = {
  label: string;
  color?: "green" | "red" | "amber" | "gray" | "blue";
};

const colorMap = {
  green: { bg: "#e3f3e8", text: "#1a6b36", border: "#b2dbc2" },
  red: { bg: "#fdecea", text: "#b5332a", border: "#f0c4c0" },
  amber: { bg: "#fdf4e3", text: "#8a6514", border: "#edd9a8" },
  gray: { bg: "#f0ede6", text: "#6b6259", border: "#dad2c3" },
  blue: { bg: "#e8f0f8", text: "#2a5a8a", border: "#b8d0e8" },
};

export function Badge({ label, color = "gray" }: BadgeProps) {
  const c = colorMap[color];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <AppText style={[styles.text, { color: c.text }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
