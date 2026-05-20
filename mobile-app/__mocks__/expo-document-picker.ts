export const getDocumentAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: "file:///tmp/pick.pdf", name: "pick.pdf", size: 2048, mimeType: "application/pdf" }],
}));
