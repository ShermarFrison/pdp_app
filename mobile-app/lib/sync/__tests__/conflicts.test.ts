import { detectFieldConflicts, mergeWithResolutions } from "@/lib/sync/conflicts";

describe("detectFieldConflicts", () => {
  it("returns only fields where both local and remote diverge from base", () => {
    const base = { a: 1, b: 2, c: 3 };
    const local = { a: 1, b: 20, c: 30 };
    const remote = { a: 1, b: 200, c: 30 };

    const conflicts = detectFieldConflicts(local, remote, base);

    expect(conflicts).toEqual([
      { field: "b", localValue: 20, remoteValue: 200, baseValue: 2 },
    ]);
  });

  it("is symmetric: swapping local/remote yields swapped values, same fields", () => {
    const base = { x: "b" };
    const local = { x: "l" };
    const remote = { x: "r" };

    const a = detectFieldConflicts(local, remote, base);
    const b = detectFieldConflicts(remote, local, base);

    expect(a.map((c) => c.field)).toEqual(b.map((c) => c.field));
    expect(b[0].localValue).toBe("r");
    expect(b[0].remoteValue).toBe("l");
  });

  it("returns empty when local matches remote even if both differ from base", () => {
    expect(
      detectFieldConflicts({ a: "x" }, { a: "x" }, { a: "y" }),
    ).toEqual([]);
  });
});

describe("mergeWithResolutions", () => {
  it("applies resolutions and keeps non-conflicting fields", () => {
    const local = { a: 1, b: 20 };
    const remote = { a: 1, b: 200 };
    const merged = mergeWithResolutions(local, remote, [
      { field: "b", localValue: 20, remoteValue: 200, baseValue: 2, resolvedValue: 99, source: "edited" },
    ]);
    expect(merged).toEqual({ a: 1, b: 99 });
  });

  it("throws when a conflicting field is missing a resolution", () => {
    expect(() =>
      mergeWithResolutions(
        { a: 1 },
        { a: 2 },
        [{ field: "a", localValue: 1, remoteValue: 2, baseValue: 0 }],
      ),
    ).toThrow(/unresolved/i);
  });
});
