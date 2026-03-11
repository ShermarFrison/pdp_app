import { TextInput, TextInputProps, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...props }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor="#8f8678"
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8ccb4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1d1a12",
  },
  inputError: {
    borderColor: "#b54c44",
  },
});
