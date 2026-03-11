import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { FarmProfile } from "@/types";

type Errors = Partial<Record<keyof FarmProfile, string>>;

export default function ProfileScreen() {
  const { farmProfile, saveProfile, syncProfile } = useApp();
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

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="title">Farm Profile</AppText>
        <AppText tone="muted">
          The profile drives task relevance. This prototype keeps data locally and simulates backend sync.
        </AppText>
      </View>

      <Card>
        <Field
          label="Farm Name"
          value={form.farmName}
          onChangeText={(value) => setForm((current) => ({ ...current, farmName: value }))}
          error={errors.farmName}
        />
        <Field
          label="Farmer Name"
          value={form.farmerName}
          onChangeText={(value) => setForm((current) => ({ ...current, farmerName: value }))}
          error={errors.farmerName}
        />
        <Field
          label="Location"
          value={form.location}
          onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
        />
        <Field
          label="Hectares"
          value={form.hectares}
          keyboardType="numeric"
          onChangeText={(value) => setForm((current) => ({ ...current, hectares: value }))}
          error={errors.hectares}
        />
        <Field
          label="Farming Type"
          value={form.farmingType}
          placeholder="Arable, Dairy, or Mixed"
          onChangeText={(value) =>
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
          onChangeText={(value) => setForm((current) => ({ ...current, livestockCount: value }))}
        />

        {message ? (
          <AppText variant="caption" tone={message.includes("Fix") || message.includes("Complete") ? "danger" : "success"}>
            {message}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label="Save Local Draft" onPress={handleSave} />
          <PrimaryButton label="Sync Profile" variant="secondary" onPress={handleSync} />
        </View>
        {farmProfile.lastSyncedAt ? (
          <AppText variant="caption" tone="muted">
            Last synced: {new Date(farmProfile.lastSyncedAt).toLocaleString()}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
});
