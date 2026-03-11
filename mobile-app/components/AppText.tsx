import { PropsWithChildren } from "react";
import { StyleSheet, Text, TextProps } from "react-native";

type Variant = "title" | "subtitle" | "body" | "label" | "caption";

type AppTextProps = TextProps &
  PropsWithChildren<{
    variant?: Variant;
    tone?: "default" | "muted" | "danger" | "success" | "accent";
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
        tone === "accent" && styles.accent,
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
    color: "#2c2517",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 23,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  muted: {
    color: "#7a7062",
  },
  danger: {
    color: "#b5332a",
  },
  success: {
    color: "#1f7a3f",
  },
  accent: {
    color: "#3f6a52",
  },
});
