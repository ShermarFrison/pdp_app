jest.mock("expo-notifications");
jest.mock("expo-router");

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerNotificationTapHandler } from "@/lib/notifications/handler";

const notifMock = Notifications as unknown as typeof Notifications & {
  __reset: () => void;
  __fireResponse: (taskId: string) => void;
};
const routerMock = router as unknown as typeof router & {
  push: jest.Mock;
};
const { __reset: resetRouter, __pushCalls } = require("expo-router") as {
  __reset: () => void;
  __pushCalls: Array<{ pathname: string; params: Record<string, string> }>;
};

beforeEach(() => {
  notifMock.__reset();
  resetRouter();
});

describe("registerNotificationTapHandler", () => {
  it("pushes /tasks/[id] with the payload taskId on tap", () => {
    const subscription = registerNotificationTapHandler();
    notifMock.__fireResponse("task-42");
    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(__pushCalls[0]).toEqual({ pathname: "/tasks/[id]", params: { id: "task-42" } });
    subscription.remove();
  });

  it("returns the subscription so the caller can unregister", () => {
    const subscription = registerNotificationTapHandler();
    expect(typeof subscription.remove).toBe("function");
  });
});
