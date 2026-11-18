import { Redirect } from "expo-router";

export default function NativeLoginEntry() {
  return <Redirect href={{ pathname: "/(normal)/Main", params: { authEntry: "1" } }} />;
}
