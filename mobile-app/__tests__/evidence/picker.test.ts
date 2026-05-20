jest.mock("expo-image-picker");
jest.mock("expo-document-picker");

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { pickPhoto, pickDocument } from "@/lib/evidence/picker";

describe("pickPhoto", () => {
  beforeEach(() => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockClear();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockClear();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/x.jpg", fileName: "x.jpg", fileSize: 4096, mimeType: "image/jpeg" }],
    });
  });

  it("returns the asset shape on success", async () => {
    const result = await pickPhoto();
    expect(result).toEqual({
      ok: true,
      asset: { uri: "file:///tmp/x.jpg", fileName: "x.jpg", sizeBytes: 4096, mimeType: "image/jpeg" },
    });
  });

  it("returns cancelled when the user dismisses the picker", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await pickPhoto();
    expect(result).toEqual({ ok: false, reason: "cancelled" });
  });

  it("returns permission_denied when OS rejects permission", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "denied" });
    const result = await pickPhoto();
    expect(result).toEqual({ ok: false, reason: "permission_denied" });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});

describe("pickDocument", () => {
  it("returns the asset shape on success", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///tmp/y.pdf", name: "y.pdf", size: 8192, mimeType: "application/pdf" }],
    });
    const result = await pickDocument();
    expect(result).toEqual({
      ok: true,
      asset: { uri: "file:///tmp/y.pdf", fileName: "y.pdf", sizeBytes: 8192, mimeType: "application/pdf" },
    });
  });

  it("returns cancelled when the user dismisses", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await pickDocument();
    expect(result).toEqual({ ok: false, reason: "cancelled" });
  });
});
