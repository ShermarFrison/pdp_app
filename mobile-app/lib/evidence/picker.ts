import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export type PickedAsset = {
  uri: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
};

export type PickResult =
  | { ok: true; asset: PickedAsset }
  | { ok: false; reason: "cancelled" | "permission_denied" | "unknown"; message?: string };

export async function pickPhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return { ok: false, reason: "cancelled" };
  }
  const a = res.assets[0];
  return {
    ok: true,
    asset: {
      uri: a.uri,
      fileName: a.fileName ?? a.uri.split("/").pop() ?? "photo.jpg",
      sizeBytes: a.fileSize ?? 0,
      mimeType: a.mimeType ?? "image/jpeg",
    },
  };
}

export async function pickDocument(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return { ok: false, reason: "cancelled" };
  }
  const a = res.assets[0];
  return {
    ok: true,
    asset: {
      uri: a.uri,
      fileName: a.name ?? a.uri.split("/").pop() ?? "document.pdf",
      sizeBytes: a.size ?? 0,
      mimeType: a.mimeType ?? "application/pdf",
    },
  };
}
