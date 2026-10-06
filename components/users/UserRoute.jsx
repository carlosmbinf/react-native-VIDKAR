import MeteorBase from "@meteorrn/core";
import Loguin from "../loguin/Loguin";
import UserDetails from "./UserDetails";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

export default function UserRoute() {
  const userId = Meteor.useTracker(() => Meteor.userId());
  return userId ? <UserDetails /> : <Loguin />;
}
