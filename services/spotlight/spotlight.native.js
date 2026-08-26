import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import {
  buildCourseSpotlightItems,
  SPOTLIGHT_DOMAINS,
} from "./spotlightItems";

const NativeVidkarSpotlight = requireOptionalNativeModule("VidkarSpotlight");
let spotlightSyncQueue = Promise.resolve();

export const syncCourseSpotlightIndex = (courses) => {
  if (Platform.OS !== "ios" || !NativeVidkarSpotlight) {
    return Promise.resolve({ indexed: 0, supported: false });
  }

  const items = buildCourseSpotlightItems(courses);

  spotlightSyncQueue = spotlightSyncQueue
    .catch(() => undefined)
    .then(async () => {
      await NativeVidkarSpotlight.replaceDomainItems(
        SPOTLIGHT_DOMAINS.courses,
        items,
      );

      return { indexed: items.length, supported: true };
    });

  return spotlightSyncQueue;
};

export const subscribeToSpotlightSelections = (listener) => {
  if (
    Platform.OS !== "ios" ||
    !NativeVidkarSpotlight ||
    typeof listener !== "function"
  ) {
    return () => {};
  }

  const subscription = NativeVidkarSpotlight.addListener(
    "onSpotlightItemTapped",
    listener,
  );
  return () => subscription?.remove?.();
};