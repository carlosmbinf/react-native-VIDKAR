import { useGlobalSearchParams, usePathname, useRootNavigationState, useRouter } from "expo-router";
import React from "react";
import { AppState } from "react-native";

import { VidkarMCP } from "../../modules/vidkar-mcp/src";
import { resolveUniversalLink } from "../../services/navigation/universalLinks";

export default function SiriSearchNavigation() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const [appState, setAppState] = React.useState(AppState.currentState);
  const [delivery, notifyDelivery] = React.useReducer((value: number) => value + 1, 0);

  React.useEffect(() => {
    if (!VidkarMCP?.getPendingInAppSearch) return;
    const intentSubscription = VidkarMCP.addListener("onInAppSearch", notifyDelivery);
    const stateSubscription = AppState.addEventListener("change", setAppState);
    // Recupera también solicitudes anteriores al montaje del bridge.
    notifyDelivery();
    return () => {
      intentSubscription.remove();
      stateSubscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (!navigationState?.key || appState !== "active") return;
    const pending = VidkarMCP?.getPendingInAppSearch?.();
    if (!pending) return;
    const target = resolveUniversalLink(pending.url);
    if (!target || target.pathname !== "/siri-search") {
      console.warn("[SiriSearch] Destino nativo de búsqueda inválido.");
      VidkarMCP?.acknowledgeInAppSearch?.(pending.id);
      return;
    }
    const alreadyDelivered = pathname === target.pathname
      && ["query", "entityType", "resultId", "contentId", "productId"]
        .every((key) => params[key] === target.params?.[key]);
    if (!alreadyDelivered) {
      router.replace({ pathname: "/siri-search", params: target.params });
    }
    VidkarMCP?.acknowledgeInAppSearch?.(pending.id);
  }, [appState, delivery, navigationState?.key, params, pathname, router]);

  return null;
}
