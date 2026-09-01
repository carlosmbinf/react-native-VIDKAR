import { Meteor } from "./client.native";
import { WATCH_ROOT_USER_FIELDS } from "../watch/watchDashboard";

export function useCurrentSession() {
  return Meteor.useTracker(() => {
    const userId = Meteor.userId();
    const connected = Boolean(Meteor.status?.()?.connected);

    if (!userId) {
      return {
        connected,
        user: null,
        userId: null,
        userReady: connected,
      };
    }

    const handle = Meteor.subscribe(
      "user",
      { _id: userId },
      { fields: WATCH_ROOT_USER_FIELDS },
    );

    return {
      connected,
      user: Meteor.user(),
      userId,
      userReady: handle.ready(),
    };
  });
}