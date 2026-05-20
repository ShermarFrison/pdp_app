import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export function registerNotificationTapHandler(): { remove: () => void } {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { taskId?: string } | undefined;
    if (data?.taskId) {
      router.push({ pathname: "/tasks/[id]", params: { id: data.taskId } });
    }
  });
}
