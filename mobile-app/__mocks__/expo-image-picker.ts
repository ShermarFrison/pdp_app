export const MediaTypeOptions = { Images: "Images" } as const;
export const PermissionStatus = { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" } as const;

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({ status: "granted" }));
export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: "file:///tmp/pick.jpg", fileName: "pick.jpg", fileSize: 1024, mimeType: "image/jpeg" }],
}));
