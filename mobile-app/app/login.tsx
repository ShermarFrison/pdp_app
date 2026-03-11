import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState("farmer@pdp.test");
  const [password, setPassword] = useState("harvest123");
  const [error, setError] = useState("");

  async function handleLogin() {
    const result = await login(email, password);

    if (!result.ok) {
      setError(result.error ?? "Login failed.");
      return;
    }

    setError("");
    router.replace("/(tabs)");
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="title">Compliance Navigator</AppText>
        <AppText tone="muted">
          Prototype workspace for Lithuanian CAP compliance tasks, farm profile data, and report drafting.
        </AppText>
      </View>

      <Card>
        <AppText variant="subtitle">Farmer Login</AppText>
        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? (
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            Demo credentials: farmer@pdp.test / harvest123
          </AppText>
        )}
        <PrimaryButton label="Open Dashboard" onPress={handleLogin} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    paddingTop: 24,
  },
});
