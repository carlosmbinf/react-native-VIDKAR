import MeteorBase from "@meteorrn/core";
import React from "react";

import Loguin from "../../components/loguin/Loguin.native";
import UserDetails from "../../components/users/UserDetails";

const Meteor = MeteorBase as unknown as {
  useTracker: <T>(reactiveFn: () => T) => T;
  userId: () => string | null;
};

export default function UserRoute() {
  const userId = Meteor.useTracker(() => Meteor.userId());

  if (!userId) {
    return <Loguin deferSessionRedirect />;
  }

  return <UserDetails />;
}