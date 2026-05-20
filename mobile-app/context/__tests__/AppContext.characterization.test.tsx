import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AppProvider, useApp } from "@/context/AppContext";

let captured: ReturnType<typeof useApp> | null = null;

function Probe() {
  const api = useApp();
  captured = api;
  return <Text>{api.isHydrated ? "ready" : "wait"}</Text>;
}

beforeEach(() => {
  captured = null;
});

test("submitReport offline path enqueues an item and surfaces it via context", async () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );

  await waitFor(() => {
    expect(captured?.isHydrated).toBe(true);
  });

  let draft: any;
  await act(async () => {
    draft = await captured!.createNewReport();
  });
  await act(async () => {
    captured!.setOnlineStatus(false);
  });
  let res: any;
  await act(async () => {
    res = await captured!.submitReport(draft.id, {
      periodYear: "2026",
      inspectionDate: "2026-05-01",
      fieldSummary: "Field A boundary OK",
    });
  });

  expect(res.ok).toBe(true);
  expect(captured!.syncQueue.length).toBeGreaterThan(0);
  const item = captured!.syncQueue[0] as any;
  expect(item.entityId ?? item.payload?.reportId).toBe(draft.id);
});
