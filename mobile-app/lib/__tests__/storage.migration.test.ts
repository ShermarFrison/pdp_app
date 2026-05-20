import AsyncStorage from "@react-native-async-storage/async-storage";
import { migrateLegacySyncSlices } from "@/lib/storage";
import { SYNC_QUEUE_KEY } from "@/lib/sync/syncQueue";

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("migrates legacy syncQueue and syncConflicts into the new key", async () => {
  await AsyncStorage.setItem(
    "pdp-mobile-prototype-state",
    JSON.stringify({
      syncQueue: [
        { id: "old", action: "report.submit", payload: { reportId: "r1" }, createdAt: "t" },
      ],
      syncConflicts: [
        { id: "c1", reportId: "r1", fields: [{ key: "notes", localValue: "L", serverValue: "R" }], detectedAt: "t" },
      ],
    }),
  );

  const out = await migrateLegacySyncSlices();
  expect(out.kind).toBe("migrated");

  const queueRaw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  const queue = JSON.parse(queueRaw!);
  expect(queue.items).toHaveLength(1);
  expect(queue.items[0].entityId).toBe("r1");
  expect(queue.conflicts[0].fields[0].field).toBe("notes");

  const legacyRaw = await AsyncStorage.getItem("pdp-mobile-prototype-state");
  const legacy = JSON.parse(legacyRaw!);
  expect(legacy.syncQueue).toBeUndefined();
  expect(legacy.syncConflicts).toBeUndefined();
});

test("is idempotent on a second call", async () => {
  await AsyncStorage.setItem(
    "pdp-mobile-prototype-state",
    JSON.stringify({ syncQueue: [], syncConflicts: [] }),
  );
  const first = await migrateLegacySyncSlices();
  const second = await migrateLegacySyncSlices();
  expect(first.kind).toBe("noop");
  expect(second.kind).toBe("noop");
});
