import { extractFromFile } from "@/lib/ocr/extract";

describe("extractFromFile", () => {
  test("deterministic for identical fileName", async () => {
    const a = await extractFromFile("file:///a.pdf", "permits-2026.pdf");
    const b = await extractFromFile("file:///b.pdf", "permits-2026.pdf");
    expect(a).toEqual(b);
  });

  test("different fileName produces different content", async () => {
    const a = await extractFromFile("file:///a.pdf", "permits-2026.pdf");
    const b = await extractFromFile("file:///b.pdf", "invoice-2026.pdf");
    expect(a).not.toEqual(b);
  });

  test("confidences are in [0,1]", async () => {
    const r = await extractFromFile("file:///x", "any.pdf");
    for (const f of [r.documentType, r.documentDate, r.referenceId]) {
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });

  test("each document yields exactly one low-confidence field (<0.7) and the rest >=0.7", async () => {
    for (const name of ["permits-2026.pdf", "invoice-2026.pdf", "field-notes-q1.pdf", "soil-test.pdf"]) {
      const r = await extractFromFile(`file:///${name}`, name);
      const conf = [r.documentType.confidence, r.documentDate.confidence, r.referenceId.confidence];
      const low = conf.filter((c) => c < 0.7).length;
      const high = conf.filter((c) => c >= 0.7).length;
      expect(low).toBe(1);
      expect(high).toBe(2);
    }
  });

  test("sourceFileName echoed back", async () => {
    const r = await extractFromFile("file:///x", "foo.pdf");
    expect(r.sourceFileName).toBe("foo.pdf");
  });
});
