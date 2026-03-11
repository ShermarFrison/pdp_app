import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  compact?: boolean;
};

export function PrimaryButton({ label, onPress, variant = "primary", disabled, compact }: PrimaryButtonProps) {
  const textStyle =
    variant === "ghost"
      ? styles.ghostText
      : variant === "secondary"
        ? styles.secondaryText
        : variant === "danger"
          ? styles.dangerText
          : styles.solidText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <AppText variant="body" style={[textStyle, compact && styles.compactText]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  compact: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  compactText: {
    fontSize: 13,
  },
  primary: {
    backgroundColor: "#3f6a52",
  },
  secondary: {
    backgroundColor: "#e6efe9",
    borderWidth: 1,
    borderColor: "#c5d9cc",
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#c4b79b",
  },
  danger: {
    backgroundColor: "#fdf0ef",
    borderWidth: 1,
    borderColor: "#e8bbb7",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
  solidText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryText: {
    color: "#2d5740",
    fontWeight: "600",
  },
  ghostText: {
    color: "#4a4539",
    fontWeight: "600",
  },
  dangerText: {
    color: "#b5332a",
    fontWeight: "600",
  },
});
