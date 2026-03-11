import { Redirect } from "expo-router";

import { useApp } from "@/context/AppContext";

export default function Index() {
  const { sessionUser } = useApp();

  if (sessionUser) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
