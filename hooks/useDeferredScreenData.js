import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { InteractionManager } from "react-native";

const useDeferredScreenData = ({ delay = 0, enabled = true, keepReadyOnBlur = false } = {}) => {
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let timeoutId = null;

      if (!enabled) {
        setReady(false);
        return () => {
          active = false;
        };
      }

      setReady(false);

      const interactionTask = InteractionManager.runAfterInteractions(() => {
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
      });

      return () => {
        active = false;
        interactionTask?.cancel?.();

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