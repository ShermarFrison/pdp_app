import { TextInput, TextInputProps, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor="#a89d8e"
        style={[
          styles.input,
          error ? styles.inputError : null,
          props.multiline ? styles.multiline : null,
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
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
    backgroundColor: "#faf8f3",
    borderWidth: 1.5,
    borderColor: "#ddd3be",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2c2517",
  },
  inputError: {
    borderColor: "#cc4840",
    backgroundColor: "#fdf5f4",
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 12,
  },
});
