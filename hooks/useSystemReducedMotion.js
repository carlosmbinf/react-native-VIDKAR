import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

// Reanimated proporciona el estado inicial; el listener cubre cambios en sesión.
export default function useSystemReducedMotion() {
  const initialReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      receivedEvent = true;
      setReducedMotion(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active && !receivedEvent) setReducedMotion(value);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}