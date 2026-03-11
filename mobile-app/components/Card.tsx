import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

type CardProps = PropsWithChildren<{
  variant?: "default" | "outlined" | "elevated";
  style?: ViewStyle;
}>;

export function Card({ children, variant = "default", style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "outlined" && styles.outlined,
        variant === "elevated" && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e8dfc9",
    shadowColor: "#5a4a30",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  outlined: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    borderColor: "#d4c8ad",
  },
  elevated: {
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    borderColor: "#efe7d5",
  },
});
