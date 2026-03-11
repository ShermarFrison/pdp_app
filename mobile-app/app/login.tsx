import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
        <View style={styles.iconWrap}>
          <Ionicons name="leaf" size={36} color="#3f6a52" />
        </View>
        <AppText variant="title">Compliance Navigator</AppText>
        <AppText tone="muted" style={styles.tagline}>
          Simplify CAP compliance for Lithuanian farmers. Track tasks, manage reports, stay audit-ready.
        </AppText>
      </View>

      <Card variant="elevated">
        <AppText variant="subtitle">Sign in to your farm</AppText>

        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        ) : null}

        <PrimaryButton label="Open Dashboard" onPress={handleLogin} />

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={14} color="#a09786" />
          <AppText variant="caption" tone="muted">
            Demo: farmer@pdp.test / harvest123
          </AppText>
        </View>
      </Card>

      <View style={styles.footer}>
        <AppText variant="caption" tone="muted" style={styles.footerText}>
          PDP Compliance Prototype
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
    paddingTop: 40,
    alignItems: "center",
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#e6efe9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#c5d9cc",
  },
  tagline: {
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 21,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
