import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export function registerNotificationTapHandler(): { remove: () => void } {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { taskId?: string } | undefined;
    if (data?.taskId) {
      // Typed route generation may not yet include the dynamic /tasks/[id] route;
      // cast through a permissive shape so handler is decoupled from Expo Router's
      // type-checking cache.
      (router.push as (arg: { pathname: string; params: Record<string, string> }) => void)({
        pathname: "/tasks/[id]",
        params: { id: data.taskId },
      });
    }
  });
}
