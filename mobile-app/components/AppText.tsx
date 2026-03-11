import { PropsWithChildren } from "react";
import { StyleSheet, Text, TextProps } from "react-native";

type Variant = "title" | "subtitle" | "body" | "label" | "caption";

type AppTextProps = TextProps &
  PropsWithChildren<{
    variant?: Variant;
    tone?: "default" | "muted" | "danger" | "success";
  }>;

export function AppText({ children, variant = "body", tone = "default", style, ...props }: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        tone === "muted" && styles.muted,
        tone === "danger" && styles.danger,
        tone === "success" && styles.success,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#1d1a12",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
  muted: {
    color: "#675f53",
  },
  danger: {
    color: "#a5372f",
  },
  success: {
    color: "#236b3e",
  },
});
