import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import {
  buildCourseSpotlightItems,
  buildMovieSpotlightItems,
  buildUserSpotlightItems,
  SPOTLIGHT_DOMAINS,
} from "./spotlightItems";

const NativeVidkarSpotlight = requireOptionalNativeModule("VidkarSpotlight");
let spotlightSyncQueue = Promise.resolve();

const syncSpotlightDomain = (domainIdentifier, items) => {
  if (Platform.OS !== "ios" || !NativeVidkarSpotlight) {
    return Promise.resolve({ indexed: 0, supported: false });
  }

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

export const syncCourseSpotlightIndex = (courses) => (
  syncSpotlightDomain(SPOTLIGHT_DOMAINS.courses, buildCourseSpotlightItems(courses))
);

export const syncUserSpotlightIndex = (users) => (
  syncSpotlightDomain(SPOTLIGHT_DOMAINS.users, buildUserSpotlightItems(users))
);

export const syncMovieSpotlightIndex = (movies) => (
  syncSpotlightDomain(SPOTLIGHT_DOMAINS.movies, buildMovieSpotlightItems(movies))
);

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