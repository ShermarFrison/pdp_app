type ScheduledRequest = {
  identifier: string;
  content: { title: string; body: string; data: { taskId: string; offsetDays: number } };
  trigger: { date: Date };
};

const scheduled: ScheduledRequest[] = [];
let permissionStatus: "granted" | "denied" | "undetermined" = "granted";
let nextId = 1;

export const __reset = () => {
  scheduled.length = 0;
  permissionStatus = "granted";
  nextId = 1;
};
export const __getScheduled = () => scheduled.slice();
export const __setPermission = (s: "granted" | "denied" | "undetermined") => {
  permissionStatus = s;
};

export const getPermissionsAsync = jest.fn(async () => ({ status: permissionStatus }));
export const requestPermissionsAsync = jest.fn(async () => ({ status: permissionStatus }));

export const scheduleNotificationAsync = jest.fn(
  async (req: { content: ScheduledRequest["content"]; trigger: { date: Date } }) => {
    const identifier = `notif-${nextId++}`;
    scheduled.push({ identifier, content: req.content, trigger: req.trigger });
    return identifier;
  },
);

export const cancelScheduledNotificationAsync = jest.fn(async (identifier: string) => {
  const idx = scheduled.findIndex((s) => s.identifier === identifier);
  if (idx >= 0) scheduled.splice(idx, 1);
});

export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {
  scheduled.length = 0;
});

export const getAllScheduledNotificationsAsync = jest.fn(async () => scheduled.slice());

type ResponseListener = (resp: {
  notification: { request: { content: { data: { taskId: string } } } };
}) => void;
const responseListeners: ResponseListener[] = [];
export const addNotificationResponseReceivedListener = jest.fn((cb: ResponseListener) => {
  responseListeners.push(cb);
  return {
    remove: () => {
      const i = responseListeners.indexOf(cb);
      if (i >= 0) responseListeners.splice(i, 1);
    },
  };
});
export const __fireResponse = (taskId: string) => {
  for (const l of responseListeners) {
    l({ notification: { request: { content: { data: { taskId } } } } });
  }
};

export const setNotificationHandler = jest.fn();

export const SchedulableTriggerInputTypes = { DATE: "date" } as const;
