import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, variant = "primary", disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <AppText
        variant="body"
        style={variant === "ghost" ? styles.ghostText : styles.solidText}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primary: {
    backgroundColor: "#3f6a52",
  },
  secondary: {
    backgroundColor: "#d7e7db",
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#c4b79b",
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
  solidText: {
    color: "#fffef9",
    fontWeight: "600",
  },
  ghostText: {
    color: "#3c433c",
    fontWeight: "600",
  },
});
