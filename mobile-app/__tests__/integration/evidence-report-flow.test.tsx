jest.mock("expo-image-picker");
jest.mock("expo-document-picker");
jest.mock("expo-file-system/legacy", () => {
  const files = new Map<string, true>();
  return {
    documentDirectory: "file:///mock-docs/",
    makeDirectoryAsync: jest.fn(async () => {}),
    copyAsync: jest.fn(async ({ to }: { from: string; to: string }) => { files.set(to, true); }),
    deleteAsync: jest.fn(async (uri: string) => { files.delete(uri); }),
    getInfoAsync: jest.fn(async (uri: string) => ({ exists: files.has(uri), uri })),
  };
});

// Stub the simulated sync client so every push returns ok (no conflicts/transients).
jest.mock("@/lib/sync/syncClient", () => {
  const actual = jest.requireActual("@/lib/sync/syncClient");
  class AlwaysOkClient {
    async pushReport() { return { kind: "ok", remoteVersion: 1 }; }
    async pushProfile() { return { kind: "ok", remoteVersion: 1 }; }
    async pushEvidence() { return { kind: "ok", remoteVersion: 1 }; }
    async fetchRemote() { return null; }
  }
  return {
    ...actual,
    LocalSimulatedSyncClient: AlwaysOkClient,
  };
});

import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { AppProvider, useApp } from "@/context/AppContext";

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useApp>) => void }) {
  const api = useApp();
  React.useEffect(() => { onReady(api); }, [api]);
  return null;
}

describe("evidence + report submission integration", () => {
  beforeEach(() => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/a.jpg", fileName: "a.jpg", fileSize: 2048, mimeType: "image/jpeg" }],
    });
  });

  it("attaches evidence, submits report, acks both with audit entries", async () => {
    let api!: ReturnType<typeof useApp>;
    let latest!: ReturnType<typeof useApp>;
    render(
      <AppProvider>
        <Harness onReady={(a) => { latest = a; api = a; }} />
      </AppProvider>,
    );

    await waitFor(() => expect(api?.isHydrated).toBe(true));

    // Create a draft and attach a photo.
    let draftId = "";
    await act(async () => {
      const d = await api.createNewReport();
      draftId = d.id;
    });
    await waitFor(() => expect(latest.reports.find((r) => r.id === draftId)).toBeDefined());
    await act(async () => {
      const res = await latest.addEvidence(draftId, { kind: "photo" });
      expect(res.ok).toBe(true);
    });

    // Wait for evidence to be acknowledged by the simulated drain.
    await waitFor(() => {
      const att = latest.evidenceAttachments.find((e) => e.taskId === draftId);
      expect(att).toBeDefined();
    });

    // Submit the report (auto-drains because isOnline = true).
    await act(async () => {
      const r = await latest.submitReport(draftId, {
        periodYear: "2026",
        inspectionDate: "2026-05-19",
        fieldSummary: "summary",
      });
      expect(r.ok).toBe(true);
    });

    await waitFor(() => {
      const r = latest.reports.find((x) => x.id === draftId);
      expect(r?.submissionState).toBe("acknowledged");
      expect(r?.status).toBe("submitted");
    });

    const types = latest.auditLogs.map((l) => l.type);
    expect(types).toContain("evidence.upload");
    expect(types).toContain("report.submit_acknowledged");
  });
});
