import { useRouter } from "expo-router";
import { useEffect } from "react";

import useIosCoursesVisibility from "../../hooks/useIosCoursesVisibility";

export default function IosCoursesVisibilityGate({ children }) {
  const router = useRouter();
  const { enabled, ready } = useIosCoursesVisibility();
  const isIos = process.env.EXPO_OS === "ios";

  useEffect(() => {
    if (isIos && ready && !enabled) {
      router.replace("/(normal)/Main");
    }
  }, [enabled, isIos, ready, router]);

  if (isIos && (!ready || !enabled)) return null;
  return children;
}
