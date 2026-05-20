import * as Notifications from "expo-notifications";

import type { ComplianceTask } from "@/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReminderSettings = {
  remindersEnabled: boolean;
  reminderOffsets: number[];
};

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function triggerDate(dueDate: string, offsetDays: number): Date {
  const due = new Date(dueDate);
  // Anchor to end-of-day UTC so an offset of N days yields a "morning of N days before"
  // window that remains in the future across timezones for tests and runtime.
  due.setUTCHours(23, 59, 59, 999);
  return new Date(due.getTime() - offsetDays * MS_PER_DAY);
}

export async function scheduleForTask(task: ComplianceTask, offsets: number[]): Promise<string[]> {
  const granted = await ensurePermission();
  if (!granted) return [];
  const now = Date.now();
  const identifiers: string[] = [];
  for (const offsetDays of offsets) {
    const when = triggerDate(task.dueDate, offsetDays);
    if (when.getTime() <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${task.title}`,
        body: `Due in ${offsetDays} day${offsetDays === 1 ? "" : "s"}.`,
        data: { taskId: task.id, offsetDays },
      },
      trigger: { date: when },
    } as unknown as Parameters<typeof Notifications.scheduleNotificationAsync>[0]);
    identifiers.push(id);
  }
  return identifiers;
}

export async function cancelForTask(taskId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of all) {
    const data = item as unknown as {
      content: { data?: { taskId?: string } };
      identifier: string;
    };
    if (data.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(data.identifier);
    }
  }
}

export async function rescheduleAll(
  tasks: ComplianceTask[],
  settings: ReminderSettings,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.remindersEnabled) return;
  const granted = await ensurePermission();
  if (!granted) return;
  for (const task of tasks) {
    await scheduleForTask(task, settings.reminderOffsets);
  }
}
