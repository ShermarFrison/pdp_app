import React from "react";
import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider, useApp } from "@/context/AppContext";
import { REMOTE_SHADOW_KEY } from "@/lib/sync/syncClient";

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useApp>) => void }) {
  const api = useApp();
  // Push the latest api value on every render so the test can observe state updates.
  onReady(api);
  return <Text>{api.isHydrated ? "ready" : "wait"}</Text>;
}

async function waitForReady<T extends () => any>(getter: T): Promise<ReturnType<T>> {
  for (let i = 0; i < 200; i += 1) {
    const v = getter();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("timed out");
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("enqueue report -> simulated conflict -> resolve -> audit entry present", async () => {
  // Pre-seed a divergent remote so the simulated client returns a conflict.
  await AsyncStorage.setItem(
    REMOTE_SHADOW_KEY,
    JSON.stringify({
      report: {},
      profile: {},
    }),
  );

  let api: any = null;
  render(
    <AppProvider>
      <Probe onReady={(a) => (api = a)} />
    </AppProvider>,
  );
  await waitForReady(() => (api && api.isHydrated ? api : null));

  const draft = await api.createNewReport();
  await act(async () => {
    api.setOnlineStatus(false);
  });
  await api.submitReport(draft.id, {
    periodYear: "2026",
    inspectionDate: "2026-05-01",
    fieldSummary: "Field A",
    notes: "local notes",
  });

  // Force a remote that conflicts on notes.
  await AsyncStorage.setItem(
    REMOTE_SHADOW_KEY,
    JSON.stringify({
      report: {
        [draft.id]: { kind: "report", id: draft.id, version: 1, data: { id: draft.id, notes: "remote notes" } },
      },
      profile: {},
    }),
  );
  await act(async () => {
    api.setOnlineStatus(true);
  });
  await act(async () => {
    await api.syncReports();
  });

  // A conflict should have surfaced.
  await waitForReady(() => (api.syncConflicts.length > 0 ? api.syncConflicts : null));
  const conflict = api.syncConflicts[0];
  expect(conflict.entityId).toBe(draft.id);

  await act(async () => {
    await api.resolveConflict(conflict.id, { id: draft.id, notes: "merged notes" }, { notes: "edited" });
  });

  expect(api.auditLogs.some((l: any) => l.type === "sync.conflict_resolved")).toBe(true);
});
