import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";

const useDeferredScreenData = ({ delay = 0, enabled = true, keepReadyOnBlur = false } = {}) => {
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let frameId = null;
      let timeoutId = null;

      if (!enabled) {
        setReady(false);
        return () => {
          active = false;
        };
      }

      if (!keepReadyOnBlur) {
        setReady(false);
      }

      const scheduleReady = () => {
        if (!active) {
          return;
        }

        if (delay > 0) {
          timeoutId = setTimeout(() => {
            if (active) {
              setReady(true);
            }
          }, delay);
          return;
        }

        setReady(true);
      };

      if (typeof requestAnimationFrame === "function") {
        frameId = requestAnimationFrame(scheduleReady);
      } else {
        timeoutId = setTimeout(scheduleReady, 0);
      }

      return () => {
        active = false;

        if (frameId !== null && typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(frameId);
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!keepReadyOnBlur) {
          setReady(false);
        }
      };
    }, [delay, enabled, keepReadyOnBlur]),
  );

  return Boolean(enabled && ready);
};

export default useDeferredScreenData;