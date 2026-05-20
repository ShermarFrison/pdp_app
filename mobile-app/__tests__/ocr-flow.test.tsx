import React from "react";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
  Link: ({ children }: any) => children,
  router: { push: mockPush },
}));

jest.mock("@/lib/evidence/picker", () => ({
  pickDocument: jest.fn(async () => ({
    ok: true,
    asset: {
      uri: "file:///doc.pdf",
      fileName: "permits-2026.pdf",
      sizeBytes: 1000,
      mimeType: "application/pdf",
    },
  })),
  pickPhoto: jest.fn(),
}));

jest.mock("@/lib/evidence/storage", () => ({
  copyIntoAppDocs: jest.fn(async (uri: string) => uri.replace("file:///", "file:///app-docs/")),
  buildPersistentUri: jest.fn((id: string) => `file:///app-docs/${id}`),
  remove: jest.fn(),
}));

import { AppProvider } from "@/context/AppContext";
import ReportsScreen from "@/app/(tabs)/reports";

describe("OCR upload entry point", () => {
  beforeEach(() => mockPush.mockClear());

  test("Upload Document button picks file via SP2 picker then routes to /ocr-review/[reportId]", async () => {
    const { getByText, findByText } = render(
      <AppProvider>
        <ReportsScreen />
      </AppProvider>,
    );
    await waitFor(() => getByText(/Create New Report|Sukurti/));
    await act(async () => {
      fireEvent.press(getByText(/Create New Report|Sukurti/));
    });
    const uploadBtn = await findByText(/Upload Document|Įkelti dokumentą/);
    await act(async () => {
      fireEvent.press(uploadBtn);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/ocr-review/[reportId]",
          params: expect.objectContaining({
            fileName: "permits-2026.pdf",
            uri: expect.stringContaining("app-docs"),
          }),
        }),
      );
    });
  });
});
