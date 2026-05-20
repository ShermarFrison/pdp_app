import React from "react";
import { Text } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import { AppProvider, useApp } from "@/context/AppContext";

function Probe() {
  const { language, setLanguage, login, logout, isHydrated } = useApp();
  return (
    <>
      <Text testID="lang">{isHydrated ? language : "..."}</Text>
      <Text testID="set-lt" onPress={() => setLanguage("lt")}>set-lt</Text>
      <Text testID="login" onPress={() => login("farmer@pdp.test", "harvest123")}>login</Text>
      <Text testID="logout" onPress={() => logout()}>logout</Text>
    </>
  );
}

describe("language persistence", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageCode: "lt", languageTag: "lt-LT" },
    ]);
  });

  test("first launch picks device locale (lt)", async () => {
    const { getByTestId } = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
  });

  test("selected language survives restart", async () => {
    const a = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(a.getByTestId("lang").props.children).toBe("lt"));
    await act(async () => { a.getByTestId("set-lt").props.onPress(); });
    // Give save a tick.
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    a.unmount();

    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageCode: "en", languageTag: "en-US" },
    ]);
    const b = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(b.getByTestId("lang").props.children).toBe("lt"));
  });

  test("selected language survives logout + login", async () => {
    const { getByTestId } = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
    await act(async () => { getByTestId("login").props.onPress(); });
    await act(async () => { getByTestId("logout").props.onPress(); });
    await act(async () => { getByTestId("login").props.onPress(); });
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
  });
});
