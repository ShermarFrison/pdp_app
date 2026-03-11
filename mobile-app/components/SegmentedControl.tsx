import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";

type SegmentedControlProps = {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  error?: string;
};

export function SegmentedControl({ label, options, value, onSelect, error }: SegmentedControlProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View style={styles.row}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.segment, active && styles.active]}
              onPress={() => onSelect(option)}
            >
              <AppText
                variant="caption"
                style={[styles.segmentText, active && styles.activeText]}
              >
                {option}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
    alignItems: "center",
  },
  active: {
    borderColor: "#3f6a52",
    backgroundColor: "#e6efe9",
  },
  segmentText: {
    fontWeight: "600",
    color: "#7a7062",
  },
  activeText: {
    color: "#2d5740",
    fontWeight: "700",
  },
});
