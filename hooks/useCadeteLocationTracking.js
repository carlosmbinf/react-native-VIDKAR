import { useCallback } from "react";

/**
 * Fallback web para la pantalla nativa de pedidos del cadete.
 * El tracking real solo está disponible en los runtimes nativos.
 */
export default function useCadeteLocationTracking({ enabled = false } = {}) {
  const refreshLocation = useCallback(async () => null, []);
  const openLocationSettings = useCallback(() => {}, []);

  return {
    error: "",
    lastLocation: null,
    lastSentAt: null,
    openLocationSettings,
    permissionStatus: "unavailable",
    refreshLocation,
    status: enabled ? "unavailable" : "idle",
    trackingActive: false,
    trackingMode: "web",
  };
}
