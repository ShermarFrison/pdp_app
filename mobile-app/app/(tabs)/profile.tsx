import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useApp } from "@/context/AppContext";
import { FarmProfile } from "@/types";

type Errors = Partial<Record<keyof FarmProfile, string>>;

const REMINDER_OPTIONS = [1, 3, 7, 14];

export default function ProfileScreen() {
  const { farmProfile, saveProfile, syncProfile, remindersEnabled, reminderDaysBefore, setReminders } = useApp();
  const [form, setForm] = useState(farmProfile);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(farmProfile);
  }, [farmProfile]);

  function validate(profile: FarmProfile) {
    const nextErrors: Errors = {};

    if (!profile.farmName.trim()) nextErrors.farmName = "Farm name is required.";
    if (!profile.farmerName.trim()) nextErrors.farmerName = "Farmer name is required.";
    if (!profile.hectares.trim()) nextErrors.hectares = "Hectares are required.";
    if (!profile.farmingType) nextErrors.farmingType = "Farming type is required.";

    return nextErrors;
  }

  async function handleSave() {
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage("Fix the required fields before saving.");
      return;
    }

    await saveProfile(form);
    setMessage("Profile saved locally.");
  }

  async function handleSync() {
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage("Complete the required fields before syncing.");
      return;
    }

    await saveProfile(form);
    await syncProfile();
    setMessage("Profile synced to the mocked backend.");
  }

  const isError = message.includes("Fix") || message.includes("Complete");

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Farm Profile</AppText>
        <AppText tone="muted">
          Your profile drives personalized compliance tasks and reporting.
        </AppText>
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">Farm Details</AppText>
        </View>

        <Field
          label="Farm Name"
          value={form.farmName}
          placeholder="e.g. Petrauskas Ukininkavimas"
          onChangeText={(value) => setForm((current) => ({ ...current, farmName: value }))}
          error={errors.farmName}
        />
        <Field
          label="Farmer Name"
          value={form.farmerName}
          placeholder="Full name"
          onChangeText={(value) => setForm((current) => ({ ...current, farmerName: value }))}
          error={errors.farmerName}
        />
        <Field
          label="Location"
          value={form.location}
          onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
          hint="Country where the farm is registered"
        />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">Farm Operations</AppText>
        </View>

        <Field
          label="Hectares"
          value={form.hectares}
          keyboardType="numeric"
          placeholder="Total farm area"
          onChangeText={(value) => setForm((current) => ({ ...current, hectares: value }))}
          error={errors.hectares}
        />

        <SegmentedControl
          label="Farming Type"
          options={["Arable", "Dairy", "Mixed"]}
          value={form.farmingType}
          onSelect={(value) =>
            setForm((current) => ({
              ...current,
              farmingType: value as FarmProfile["farmingType"],
            }))
          }
          error={errors.farmingType}
        />

        <Field
          label="Livestock Count"
          value={form.livestockCount}
          keyboardType="numeric"
          placeholder="0 if none"
          onChangeText={(value) => setForm((current) => ({ ...current, livestockCount: value }))}
        />
      </Card>

      {message ? (
        <View style={[styles.messageBar, isError ? styles.messageError : styles.messageSuccess]}>
          <Ionicons
            name={isError ? "alert-circle" : "checkmark-circle"}
            size={16}
            color={isError ? "#b5332a" : "#1f7a3f"}
          />
          <AppText variant="caption" tone={isError ? "danger" : "success"}>
            {message}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Save Local Draft" onPress={handleSave} />
        <PrimaryButton label="Sync to Backend" variant="secondary" onPress={handleSync} />
      </View>

      {farmProfile.lastSyncedAt ? (
        <View style={styles.syncInfo}>
          <Ionicons name="cloud-done-outline" size={14} color="#a09786" />
          <AppText variant="caption" tone="muted">
            Last synced: {new Date(farmProfile.lastSyncedAt).toLocaleString()}
          </AppText>
        </View>
      ) : null}

      {/* SCRUM-35 — Deadline Reminder Notifications */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">Reminder Notifications</AppText>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <AppText style={styles.toggleTitle}>Deadline reminders</AppText>
            <AppText variant="caption" tone="muted">
              Get notified before compliance tasks are due.
            </AppText>
          </View>
          <Pressable
            style={[styles.toggle, remindersEnabled && styles.toggleOn]}
            onPress={() => setReminders(!remindersEnabled, reminderDaysBefore)}
          >
            <View style={[styles.toggleThumb, remindersEnabled && styles.toggleThumbOn]} />
          </Pressable>
        </View>

        {remindersEnabled && (
          <>
            <AppText variant="label" tone="muted">Remind me this many days before deadline</AppText>
            <View style={styles.reminderDaysRow}>
              {REMINDER_OPTIONS.map((days) => (
                <Pressable
                  key={days}
                  style={[styles.daysOption, reminderDaysBefore === days && styles.daysOptionActive]}
                  onPress={() => setReminders(remindersEnabled, days)}
                >
                  <AppText
                    style={[styles.daysOptionText, reminderDaysBefore === days && styles.daysOptionTextActive]}
                  >
                    {days}d
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.reminderPreview}>
              <Ionicons name="information-circle-outline" size={14} color="#3f6a52" />
              <AppText variant="caption" tone="accent">
                You will be reminded {reminderDaysBefore} day{reminderDaysBefore !== 1 ? "s" : ""} before each deadline.
              </AppText>
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actions: {
    gap: 10,
  },
  messageBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  messageError: {
    backgroundColor: "#fdf0ef",
    borderColor: "#f0c4c0",
  },
  messageSuccess: {
    backgroundColor: "#e3f3e8",
    borderColor: "#b2dbc2",
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLabel: { flex: 1, gap: 2 },
  toggleTitle: { fontWeight: "600", fontSize: 15 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ddd3be",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: "#3f6a52" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleThumbOn: { alignSelf: "flex-end" },
  reminderDaysRow: {
    flexDirection: "row",
    gap: 8,
  },
  daysOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
    alignItems: "center",
  },
  daysOptionActive: {
    borderColor: "#3f6a52",
    backgroundColor: "#e6efe9",
  },
  daysOptionText: {
    fontWeight: "600",
    fontSize: 13,
    color: "#7a7062",
  },
  daysOptionTextActive: {
    color: "#2d5740",
    fontWeight: "700",
  },
  reminderPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e6efe9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
