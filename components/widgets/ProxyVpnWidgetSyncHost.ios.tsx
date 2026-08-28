import MeteorBase from "@meteorrn/core";
import React from "react";
import { AppState } from "react-native";

import { buildWatchUsageSnapshot } from "../../services/watch/watchDashboard";
import ProxyVpnUsageWidget, {
  type ProxyVpnUsageWidgetProps,
} from "../../widgets/ProxyVpnUsageWidget";

const Meteor = MeteorBase as unknown as {
  subscribe: (...args: unknown[]) => { ready: () => boolean };
  useTracker: <T>(reactiveFn: () => T) => T;
  user: () => Record<string, unknown> | null;
  userId: () => string | null;
};

const WIDGET_USER_FIELDS = {
  baneado: 1,
  fechaSubscripcion: 1,
  isIlimitado: 1,
  megas: 1,
  megasGastadosinBytes: 1,
  vpn: 1,
  vpnMbGastados: 1,
  vpnfechaSubscripcion: 1,
  vpnmegas: 1,
  vpnisIlimitado: 1,
};

const createSignedOutSnapshot = (): ProxyVpnUsageWidgetProps => ({
  authenticated: false,
  proxyEnabled: false,
  proxyProgress: 0,
  proxyStatus: "Inactivo",
  proxyUsed: "0.00 MB",
  updatedAt: "al abrir la app",
  vpnEnabled: false,
  vpnProgress: 0,
  vpnStatus: "Inactivo",
  vpnUsed: "0.00 MB",
});

const formatUpdateTime = () =>
  new Intl.DateTimeFormat("es-CU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const publishSnapshot = (snapshot: ProxyVpnUsageWidgetProps) => {
  try {
    ProxyVpnUsageWidget.updateSnapshot(snapshot);
  } catch (error) {
    console.warn("[ProxyVpnWidget] No se pudo actualizar el widget:", error);
  }
};

export default function ProxyVpnWidgetSyncHost() {
  const latestSnapshotRef = React.useRef<ProxyVpnUsageWidgetProps>(
    createSignedOutSnapshot(),
  );
  const { ready, user, userId } = Meteor.useTracker(() => {
    const currentUserId = Meteor.userId();

    if (!currentUserId) {
      return { ready: true, user: null, userId: null };
    }

    const subscription = Meteor.subscribe(
      "user",
      { _id: currentUserId },
      { fields: WIDGET_USER_FIELDS },
    );

    return {
      ready: subscription.ready(),
      user: Meteor.user(),
      userId: currentUserId,
    };
  });

  React.useEffect(() => {
    if (userId && !ready) {
      return;
    }

    if (!userId || !user) {
      const signedOutSnapshot = createSignedOutSnapshot();
      latestSnapshotRef.current = signedOutSnapshot;
      publishSnapshot(signedOutSnapshot);
      return;
    }

    const usage = buildWatchUsageSnapshot(user, []);
    const snapshot: ProxyVpnUsageWidgetProps = {
      authenticated: true,
      proxyEnabled: usage.proxy.enabled,
      proxyProgress: usage.proxy.progress,
      proxyStatus: usage.proxy.isUnlimited
        ? "Ilimitado"
        : usage.proxy.enabled
          ? usage.proxy.statusLabel
          : "Inactivo",
      proxyUsed: usage.proxy.usedLabel,
      updatedAt: formatUpdateTime(),
      vpnEnabled: usage.vpn.enabled,
      vpnProgress: usage.vpn.progress,
      vpnStatus: usage.vpn.isUnlimited
        ? "Ilimitado"
        : usage.vpn.enabled
          ? usage.vpn.statusLabel
          : "Inactivo",
      vpnUsed: usage.vpn.usedLabel,
    };

    latestSnapshotRef.current = snapshot;
    publishSnapshot(snapshot);
  }, [ready, user, userId]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      const refreshedSnapshot = {
        ...latestSnapshotRef.current,
        updatedAt: formatUpdateTime(),
      };
      latestSnapshotRef.current = refreshedSnapshot;
      publishSnapshot(refreshedSnapshot);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
