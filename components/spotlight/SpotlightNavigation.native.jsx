import MeteorBase from "@meteorrn/core";
import { useRootNavigationState, useRouter } from "expo-router";
import React from "react";

import {
  subscribeToSpotlightSelections,
} from "../../services/spotlight/spotlight";
import { resolveSpotlightRoute } from "../../services/spotlight/spotlightItems";

const Meteor = MeteorBase;

export default function SpotlightNavigation() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const currentUserId = Meteor.useTracker(() => Meteor.userId(), []);
  const [pendingSelection, setPendingSelection] = React.useState(null);
  const handledItemIdRef = React.useRef(null);

  React.useEffect(() => subscribeToSpotlightSelections(({ id }) => {
    const route = resolveSpotlightRoute(id);
    if (!route || handledItemIdRef.current === id) return;

    setPendingSelection({ id, route });
  }), []);

  React.useEffect(() => {
    if (!pendingSelection || !currentUserId || !navigationState?.key) return;

    handledItemIdRef.current = pendingSelection.id;
    router.push(pendingSelection.route);
    setPendingSelection(null);
  }, [currentUserId, navigationState?.key, pendingSelection, router]);

  return null;
}