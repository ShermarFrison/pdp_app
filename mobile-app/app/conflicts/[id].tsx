import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useApp } from "@/context/AppContext";
import type { ConflictResolutionSource, SyncConflict } from "@/types";

export default function ConflictResolutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { syncConflicts, resolveConflict } = useApp();

  const conflict: SyncConflict | undefined = useMemo(
    () => syncConflicts.find((c) => c.id === id),
    [id, syncConflicts],
  );

  const [resolutions, setResolutions] = useState<Record<string, { value: string; source: ConflictResolutionSource }>>(
    () => {
      if (!conflict) return {};
      const init: Record<string, { value: string; source: ConflictResolutionSource }> = {};
      for (const f of conflict.fields) {
        init[f.field] = { value: String(f.localValue ?? ""), source: "local" };
      }
      return init;
    },
  );

  if (!conflict) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>No conflicts to resolve</Text>
        <Pressable style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const allResolved = conflict.fields.every((f) => resolutions[f.field]?.value !== undefined);

  function pick(field: string, source: "local" | "remote", value: unknown) {
    setResolutions((r) => ({ ...r, [field]: { value: String(value ?? ""), source } }));
  }

  function edit(field: string, value: string) {
    setResolutions((r) => ({ ...r, [field]: { value, source: "edited" } }));
  }

  async function onResolve() {
    const merged: Record<string, unknown> = {};
    const sources: Record<string, ConflictResolutionSource> = {};
    for (const f of conflict!.fields) {
      merged[f.field] = resolutions[f.field].value;
      sources[f.field] = resolutions[f.field].source;
    }
    await resolveConflict(conflict!.id, merged, sources);
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {conflict.kind} · {conflict.entityId}
      </Text>
      <Text style={styles.subtitle}>Detected {new Date(conflict.detectedAt).toLocaleString()}</Text>

      {conflict.fields.map((f) => (
        <View key={f.field} style={styles.field}>
          <Text style={styles.fieldName}>{f.field}</Text>
          <View style={styles.row}>
            <Pressable style={styles.cell} onPress={() => pick(f.field, "local", f.localValue)}>
              <Text style={styles.cellLabel}>Local</Text>
              <Text style={styles.cellValue}>{String(f.localValue ?? "")}</Text>
            </Pressable>
            <Pressable style={styles.cell} onPress={() => pick(f.field, "remote", f.remoteValue)}>
              <Text style={styles.cellLabel}>Remote</Text>
              <Text style={styles.cellValue}>{String(f.remoteValue ?? "")}</Text>
            </Pressable>
          </View>
          <Text style={styles.cellLabel}>Resolved ({resolutions[f.field]?.source ?? "local"})</Text>
          <TextInput
            value={resolutions[f.field]?.value ?? ""}
            onChangeText={(t) => edit(f.field, t)}
            style={styles.input}
            multiline
          />
        </View>
      ))}

      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, !allResolved && styles.disabled]}
          disabled={!allResolved}
          onPress={onResolve}
        >
          <Text style={styles.primaryText}>Resolve</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  subtitle: { color: "#666" },
  field: { borderWidth: 1, borderColor: "#e2e2e2", borderRadius: 8, padding: 12, gap: 8 },
  fieldName: { fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  cell: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: "#f5f5f5" },
  cellLabel: { fontSize: 12, color: "#666" },
  cellValue: { fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, minHeight: 40 },
  footer: { flexDirection: "row", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  primary: { backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  primaryText: { color: "white", fontWeight: "600" },
  secondary: { backgroundColor: "#e5e5e5", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  secondaryText: { color: "#333", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
