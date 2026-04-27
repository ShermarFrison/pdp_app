import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { AdvisorPermission, FarmProfile } from "@/types";

type Errors = Partial<Record<keyof FarmProfile, string>>;

const ALL_OFFSET_OPTIONS = [1, 3, 7, 14];

export default function ProfileScreen() {
  const {
    farmProfile,
    saveProfile,
    syncProfile,
    remindersEnabled,
    reminderDaysBefore,
    reminderOffsets,
    setReminders,
    setReminderOffsets,
    advisors,
    inviteAdvisor,
    revokeAdvisor,
    language,
    setLanguage,
  } = useApp();

  const [form, setForm] = useState(farmProfile);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  // SCRUM-43: Advisor state
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorPermission, setAdvisorPermission] = useState<AdvisorPermission>("read-only");
  const [advisorMessage, setAdvisorMessage] = useState("");

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

  function toggleOffset(days: number) {
    const current = reminderOffsets;
    const next = current.includes(days)
      ? current.filter((d) => d !== days)
      : [...current, days];

    if (next.length === 0) return;

    setReminderOffsets(next);
    setReminders(remindersEnabled, Math.min(...next));
  }

  function handleToggleReminders() {
    const newEnabled = !remindersEnabled;
    setReminders(newEnabled, reminderDaysBefore);
  }

  async function handleInviteAdvisor() {
    const result = await inviteAdvisor(advisorEmail.trim(), advisorPermission);
    if (!result.ok) {
      setAdvisorMessage(result.error ?? "Failed to invite advisor.");
      return;
    }
    setAdvisorEmail("");
    setAdvisorMessage("Advisor invited successfully.");
  }

  const isError = message.includes("Fix") || message.includes("Complete");
  const sortedOffsets = [...reminderOffsets].sort((a, b) => b - a);
  const offsetPreview = sortedOffsets.map((d) => `${d} day${d !== 1 ? "s" : ""}`).join(", ");
  const activeAdvisors = advisors.filter((a) => a.active);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t("profile.title", language)}</AppText>
        <AppText tone="muted">{t("profile.subtitle", language)}</AppText>
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">{t("profile.farm_details", language)}</AppText>
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
          <AppText variant="label" tone="accent">{t("profile.farm_ops", language)}</AppText>
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
        <PrimaryButton label={t("profile.save_local", language)} onPress={handleSave} />
        <PrimaryButton label={t("profile.sync_backend", language)} variant="secondary" onPress={handleSync} />
      </View>

      {farmProfile.lastSyncedAt ? (
        <View style={styles.syncInfo}>
          <Ionicons name="cloud-done-outline" size={14} color="#a09786" />
          <AppText variant="caption" tone="muted">
            Last synced: {new Date(farmProfile.lastSyncedAt).toLocaleString()}
          </AppText>
        </View>
      ) : null}

      {/* Reminder Schedule */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">{t("profile.reminders", language)}</AppText>
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
            onPress={handleToggleReminders}
          >
            <View style={[styles.toggleThumb, remindersEnabled && styles.toggleThumbOn]} />
          </Pressable>
        </View>

        {remindersEnabled && (
          <>
            <AppText variant="label" tone="muted">
              Remind me this many days before deadline (select multiple)
            </AppText>
            <View style={styles.reminderDaysRow}>
              {ALL_OFFSET_OPTIONS.map((days) => {
                const active = reminderOffsets.includes(days);
                return (
                  <Pressable
                    key={days}
                    style={[styles.daysOption, active && styles.daysOptionActive]}
                    onPress={() => toggleOffset(days)}
                  >
                    <AppText
                      style={[styles.daysOptionText, active && styles.daysOptionTextActive]}
                    >
                      {days}d
                    </AppText>
                    {active && (
                      <Ionicons name="checkmark" size={12} color="#2d5740" />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.reminderPreview}>
              <Ionicons name="information-circle-outline" size={14} color="#3f6a52" />
              <AppText variant="caption" tone="accent">
                You will be reminded at: {offsetPreview} before each deadline.
              </AppText>
            </View>
          </>
        )}

        {!remindersEnabled && (
          <View style={styles.disabledNotice}>
            <Ionicons name="notifications-off-outline" size={14} color="#a09786" />
            <AppText variant="caption" tone="muted">
              Reminders are disabled. No notifications will be sent.
            </AppText>
          </View>
        )}
      </Card>

      {/* SCRUM-44: Language selection */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="language-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">{t("profile.language", language)}</AppText>
        </View>
        <SegmentedControl
          label=""
          options={["English", "Lietuvių"]}
          value={language === "en" ? "English" : "Lietuvių"}
          onSelect={(val) => setLanguage(val === "English" ? "en" : "lt")}
        />
      </Card>

      {/* SCRUM-43: Advisor Access */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={16} color="#3f6a52" />
          <AppText variant="label" tone="accent">{t("profile.advisors", language)}</AppText>
        </View>

        <Field
          label="Advisor Email"
          value={advisorEmail}
          placeholder="advisor@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setAdvisorEmail}
        />

        <SegmentedControl
          label="Permission"
          options={["read-only", "edit"]}
          value={advisorPermission}
          onSelect={(val) => setAdvisorPermission(val as AdvisorPermission)}
        />

        <PrimaryButton
          label={t("profile.invite_advisor", language)}
          variant="secondary"
          onPress={handleInviteAdvisor}
        />

        {advisorMessage ? (
          <View
            style={[
              styles.messageBar,
              advisorMessage.includes("successfully") ? styles.messageSuccess : styles.messageError,
            ]}
          >
            <Ionicons
              name={advisorMessage.includes("successfully") ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={advisorMessage.includes("successfully") ? "#1f7a3f" : "#b5332a"}
            />
            <AppText
              variant="caption"
              tone={advisorMessage.includes("successfully") ? "success" : "danger"}
            >
              {advisorMessage}
            </AppText>
          </View>
        ) : null}

        {activeAdvisors.length > 0 && (
          <>
            <Divider />
            {activeAdvisors.map((advisor, index) => (
              <View key={advisor.id}>
                {index > 0 && <Divider />}
                <View style={styles.advisorRow}>
                  <View style={styles.advisorInfo}>
                    <AppText style={styles.advisorEmail}>{advisor.email}</AppText>
                    <Badge
                      label={advisor.permission}
                      color={advisor.permission === "edit" ? "blue" : "gray"}
                    />
                  </View>
                  <Pressable onPress={() => revokeAdvisor(advisor.id)} style={styles.revokeBtn}>
                    <AppText variant="caption" tone="danger" style={styles.revokeText}>
                      {t("profile.revoke_access", language)}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {activeAdvisors.length === 0 && (
          <View style={styles.emptyAdvisors}>
            <AppText variant="caption" tone="muted">No active advisors. Invite one above.</AppText>
          </View>
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
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
  disabledNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f4f0e6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  advisorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 6,
  },
  advisorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  advisorEmail: {
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
  },
  revokeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revokeText: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  emptyAdvisors: {
    paddingVertical: 8,
    alignItems: "center",
  },
});
