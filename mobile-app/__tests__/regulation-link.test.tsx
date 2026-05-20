import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
  router: { push: mockPush },
  Link: ({ href, onPress, children }: any) => {
    const React = require("react");
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      onPress: () => {
        if (onPress) onPress();
        mockPush(href);
        if (child.props.onPress) child.props.onPress();
      },
    });
  },
}));

import { AppProvider, useApp } from "@/context/AppContext";
import RegulationsScreen from "@/app/(tabs)/regulations";

describe("regulation feed deep links", () => {
  beforeEach(() => mockPush.mockClear());

  test("tapping impacted-task chip pushes /tasks/[id] or /guidance, marks read, logs regulation.opened", async () => {
    const ctxValueRef: { current: any } = { current: null };
    function Probe() {
      const ctx = useApp();
      ctxValueRef.current = ctx;
      return null;
    }
    const { findAllByTestId, findAllByText } = render(
      <AppProvider>
        <>
          <Probe />
          <RegulationsScreen />
        </>
      </AppProvider>,
    );
    // Expand a regulation first; click the first regulation card to expand.
    await waitFor(() => ctxValueRef.current?.isHydrated);
    const regs = ctxValueRef.current.regulationChanges;
    expect(regs.length).toBeGreaterThan(0);
    // Find unread regulation that has related tasks.
    const target = regs.find((r: any) => r.relatedTaskIds.length > 0);
    expect(target).toBeDefined();
    // Tap the regulation title to expand it.
    const titles = await findAllByText(target.title);
    await act(async () => {
      fireEvent.press(titles[0]);
    });
    const links = await findAllByTestId(/reg-link-/);
    expect(links.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.press(links[0]);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/(tasks|guidance)\//));
      expect(
        ctxValueRef.current.auditLogs.some((e: any) => e.type === "regulation.opened"),
      ).toBe(true);
    });
  });
});
