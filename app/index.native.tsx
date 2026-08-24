import MeteorBase from "@meteorrn/core";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, StatusBar, StyleSheet } from "react-native";
import { ActivityIndicator, Surface, Text, useTheme } from "react-native-paper";

import CadeteNavigator from "../components/cadete/CadeteNavigator";
import EmpresaNavigator from "../components/empresa/EmpresaNavigator";
import Loguin from "../components/loguin/Loguin.native";
import MenuPrincipal from "../components/Main/MenuPrincipal.native";
import { userHasEmpresaRole } from "../components/navigator/sessionRoute";
import PushNotificationDialogHost from "../components/shared/PushNotificationDialogHost.native";
import UpdateRequired from "../components/update/UpdateRequired";
import { syncCadeteBackgroundLocation } from "../services/location/cadeteBackgroundLocation.native";
import {
  APPROVE_EVIDENCE_ACTION,
  APPROVE_SALE_ACTION,
  OPEN_SALE_APPROVAL_ACTION,
  REJECT_EVIDENCE_ACTION,
  registerPushTokenForActiveSession,
  registerPushTokenForUser,
  resolvePushNavigationTarget,
  setupPushListeners,
} from "../services/notifications/PushMessaging.native";
import {
  WATCH_ROOT_USER_FIELDS,
} from "../services/watch/watchDashboard";

const Meteor = MeteorBase as unknown as {
  useTracker: <T>(reactiveFn: () => T) => T;
  userId: () => string | null;
  user: () => any;
  subscribe: (...args: any[]) => { ready: () => boolean };
  status: () => { connected: boolean };
  call: (
    methodName: string,
    ...args: [...any[], (error: any, result: any) => void]
  ) => void;
};

const VERSION_CHECK_TIMEOUT_MS = 5_000;
const METEOR_CONNECTION_TIMEOUT_MS = 10_000;
const METEOR_CONNECTION_POLL_MS = 500;

const ROOT_USER_FIELDS = WATCH_ROOT_USER_FIELDS;
const PUSH_ACTION_SESSION_RETRIES = 20;
const PUSH_ACTION_SESSION_DELAY_MS = 500;

const resolveCurrentBuildNumber = () => {
  const nativeBuildNumber = parseInt(Application.nativeBuildVersion ?? "", 10);

  if (!Number.isNaN(nativeBuildNumber) && nativeBuildNumber > 0) {
    return nativeBuildNumber;
  }

  if (Platform.OS === "android") {
    const androidVersionCode = Number(
      Constants.expoConfig?.android?.versionCode,
    );

    if (Number.isFinite(androidVersionCode) && androidVersionCode > 0) {
      return androidVersionCode;
    }
  }

  const iosBuildNumber = parseInt(
    Constants.expoConfig?.ios?.buildNumber ?? "",
    10,
  );

  if (!Number.isNaN(iosBuildNumber) && iosBuildNumber > 0) {
    return iosBuildNumber;
  }

  return 0;
};

const getRequiredBuildNumber = (propertyKey: string) =>
  new Promise<string | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout esperando respuesta del servidor"));
    }, VERSION_CHECK_TIMEOUT_MS);

    Meteor.call("property.getValor", "CONFIG", propertyKey, (error, result) => {
      clearTimeout(timeout);

      if (error) {
        reject(error);
        return;
      }

      resolve(result ?? null);
    });
  });

export default function IndexScreen() {
  const theme = useTheme();
  const pushCleanupRef = React.useRef<null | (() => void)>(null);
  const lastHandledPushNavigationIdRef = React.useRef<string | null>(null);
  const [pendingPushNavigationNotification, setPendingPushNavigationNotification] = React.useState<any>(null);
  const [versionGate, setVersionGate] = React.useState({
    checkingVersion: false,
    updateRequired: false,
    currentBuildNumber: null as number | null,
    requiredBuildNumber: null as number | null,
  });
  const { connected, ready, user, userId } = Meteor.useTracker(
    (): {
      connected: boolean;
      ready: boolean;
      user: any;
      userId: string | null;
    } => {
      const currentUserId = Meteor.userId();
      const connected = Boolean(Meteor.status()?.connected);

      if (!currentUserId) {
        return {
          connected,
          ready: false,
          user: null,
          userId: null,
        };
      }

      const subscription = Meteor.subscribe(
        "user",
        { _id: currentUserId },
        { fields: ROOT_USER_FIELDS },
      );

      return {
        connected,
        ready: subscription.ready(),
        user: Meteor.user(),
        userId: currentUserId,
      };
    },
  );

  React.useEffect(() => {
    let cancelled = false;

    const setSafeVersionGate = (
      nextState:
        | typeof versionGate
        | ((previousState: typeof versionGate) => typeof versionGate),
    ) => {
      if (!cancelled) {
        setVersionGate(nextState);
      }
    };

    const checkAppVersion = async () => {
      try {
        if (!Meteor.userId()) {
          setSafeVersionGate({
            checkingVersion: false,
            updateRequired: false,
            currentBuildNumber: null,
            requiredBuildNumber: null,
          });
          return;
        }

        setSafeVersionGate((previousState) => ({
          ...previousState,
          checkingVersion: true,
        }));

        const startTime = Date.now();

        while (
          !Meteor.status().connected &&
          Date.now() - startTime < METEOR_CONNECTION_TIMEOUT_MS
        ) {
          await new Promise((resolve) => {
            setTimeout(resolve, METEOR_CONNECTION_POLL_MS);
          });
        }

        const currentBuildNumber = resolveCurrentBuildNumber();

        if (!Meteor.status().connected) {
          setSafeVersionGate({
            checkingVersion: false,
            updateRequired: false,
            currentBuildNumber,
            requiredBuildNumber: null,
          });
          return;
        }

        const propertyKey =
          Platform.OS === "android"
            ? "androidVersionMinCompilation"
            : "iosVersionMinCompilation";
        const requiredVersionString = await getRequiredBuildNumber(propertyKey);
        const requiredBuildNumber = parseInt(requiredVersionString || "0", 10);

        if (!requiredVersionString || requiredBuildNumber === 0) {
          setSafeVersionGate({
            checkingVersion: false,
            updateRequired: false,
            currentBuildNumber,
            requiredBuildNumber: 0,
          });
          return;
        }

        setSafeVersionGate({
          checkingVersion: false,
          updateRequired: currentBuildNumber < requiredBuildNumber,
          currentBuildNumber,
          requiredBuildNumber,
        });
      } catch (error) {
        console.error("[IndexScreen] Error en checkAppVersion:", error);

        setSafeVersionGate((previousState) => ({
          ...previousState,
          checkingVersion: false,
          updateRequired: false,
        }));
      }
    };

    if (!userId) {
      setSafeVersionGate({
        checkingVersion: false,
        updateRequired: false,
        currentBuildNumber: null,
        requiredBuildNumber: null,
      });
    } else {
      checkAppVersion();
    }

    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (userId && !ready) {
      return;
    }

    if (!userId && !connected) {
      return;
    }

    const shouldEnableCadeteTracking = Boolean(userId && user?.modoCadete === true);

    const syncCadeteTracking = async () => {
      try {
        await syncCadeteBackgroundLocation({
          enabled: shouldEnableCadeteTracking,
          requestPermissions: false,
          userId: shouldEnableCadeteTracking ? userId : undefined,
        });
      } catch (error) {
        console.warn(
          "[CadeteLocation] No se pudo sincronizar el tracking en segundo plano:",
          error,
        );
      }
    };

    syncCadeteTracking();
  }, [connected, ready, user?.modoCadete, userId]);

  React.useEffect(() => {
    let active = true;

    const waitForPushActionSession = async () => {
      for (
        let attempt = 0;
        attempt < PUSH_ACTION_SESSION_RETRIES;
        attempt += 1
      ) {
        if (Meteor.userId() && Meteor.status()?.connected) {
          return true;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, PUSH_ACTION_SESSION_DELAY_MS);
        });
      }

      return Boolean(Meteor.userId() && Meteor.status()?.connected);
    };

    const handleNotificationAction = async (
      notification: any,
      actionIdentifier: string,
    ) => {
      const data = (notification?.request?.content?.data || {}) as Record<
        string,
        unknown
      >;
      const isManualReviewNotification =
        data.notificationType === "EVIDENCIA_MANUAL_REVIEW";
      const isApprovedEvidenceNotification =
        data.notificationType === "EVIDENCIA_APROBADA_VENTA_PENDIENTE";
      if (!isManualReviewNotification && !isApprovedEvidenceNotification) {
        return;
      }

      const evidenciaId =
        typeof data.evidenciaId === "string"
          ? data.evidenciaId
          : typeof data.evidenceId === "string"
            ? data.evidenceId
            : "";
      const ventaId =
        typeof data.ventaId === "string" ? data.ventaId : undefined;

      if (
        !evidenciaId &&
        actionIdentifier !== APPROVE_SALE_ACTION &&
        actionIdentifier !== OPEN_SALE_APPROVAL_ACTION
      ) {
        Alert.alert(
          "Vidkar",
          "La notificación no contiene una evidencia válida.",
        );
        return;
      }

      const sessionReady = await waitForPushActionSession();
      if (!sessionReady) {
        Alert.alert(
          "Vidkar",
          "No se pudo conectar la sesión. Abra la aplicación e inténtelo nuevamente.",
        );
        return;
      }

      const methodName =
        actionIdentifier === APPROVE_SALE_ACTION && isApprovedEvidenceNotification
          ? "ventas.aprobarVenta"
          : actionIdentifier === APPROVE_EVIDENCE_ACTION && isManualReviewNotification
            ? "archivos.aprobarEvidencia"
            : actionIdentifier === REJECT_EVIDENCE_ACTION && isManualReviewNotification
            ? "archivos.denegarEvidencia"
            : null;
      if (actionIdentifier === OPEN_SALE_APPROVAL_ACTION) {
        setPendingPushNavigationNotification(notification);
        return;
      }
      if (!methodName) {
        return;
      }

      if (methodName === "ventas.aprobarVenta" && !ventaId) {
        Alert.alert("Vidkar", "La notificación no contiene una venta válida.");
        return;
      }

      try {
        const result = await new Promise<any>((resolve, reject) => {
          Meteor.call(
            methodName,
            methodName === "ventas.aprobarVenta" ? ventaId : evidenciaId,
            methodName === "ventas.aprobarVenta"
              ? { source: "PUSH_ACTION_SALE" }
              : ventaId
                ? { ventaId, source: "PUSH_ACTION" }
                : { source: "PUSH_ACTION" },
            (error: any, response: any) =>
              error ? reject(error) : resolve(response),
          );
        });
        Alert.alert(
          "Vidkar",
          result?.message ||
            (actionIdentifier === APPROVE_EVIDENCE_ACTION
              ? "Evidencia aprobada. La venta queda pendiente de aprobación."
              : actionIdentifier === APPROVE_SALE_ACTION
                ? "Venta aprobada y procesada."
                : "Evidencia rechazada."),
        );
      } catch (error: any) {
        Alert.alert(
          "Vidkar",
          error?.reason || error?.message || "No se pudo procesar la acción.",
        );
      }
    };

    const queuePushNavigation = async (notification: any) => {
      const notificationId = notification?.request?.identifier || null;

      if (notificationId && lastHandledPushNavigationIdRef.current === notificationId) {
        return;
      }

      if (notificationId) {
        lastHandledPushNavigationIdRef.current = notificationId;
      }

      setPendingPushNavigationNotification(notification);
    };

    setupPushListeners({
      onNotificationAction: handleNotificationAction,
      onInitialNotification: queuePushNavigation,
      onNotificationOpenedApp: queuePushNavigation,
      onToken: async (token) => {
        const currentUserId = Meteor.userId();
        if (currentUserId) {
          await registerPushTokenForUser(currentUserId, token).catch(
            () => null,
          );
        }
      },
    })
      .then((cleanup) => {
        if (!active) {
          cleanup?.();
          return;
        }

        pushCleanupRef.current = cleanup;
      })
      .catch((error) => {
        console.warn("[PushMessaging] Error configurando listeners:", error);
      });

    return () => {
      active = false;
      pushCleanupRef.current?.();
      pushCleanupRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!pendingPushNavigationNotification || !userId || !ready) {
      return;
    }

    const navigationTarget = resolvePushNavigationTarget(
      pendingPushNavigationNotification,
    );

    setPendingPushNavigationNotification(null);

    if (!navigationTarget?.pathname) {
      return;
    }

    requestAnimationFrame(() => {
      router.push({
        pathname: navigationTarget.pathname as never,
        params: navigationTarget.params,
      });
    });
  }, [pendingPushNavigationNotification, ready, user?.modoEmpresa, userId]);

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    registerPushTokenForActiveSession().catch((error) => {
      console.warn(
        "[PushMessaging] Error registrando token del usuario:",
        error,
      );
    });
  }, [userId]);

  if (userId && !ready) {
    return (
      <>
        <PushNotificationDialogHost />
        <Surface
          style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <StatusBar
            translucent
            backgroundColor="transparent"
            // barStyle={theme.dark ? "light-content" : "dark-content"}
            barStyle={"light-content"}
          />
          <ActivityIndicator
            animating
            size="large"
            color={theme.colors.primary}
          />
          <Text style={styles.loadingText}>Cargando...</Text>
        </Surface>
      </>
    );
  }

  if (versionGate.updateRequired) {
    return (
      <>
        <PushNotificationDialogHost />
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <UpdateRequired
          currentVersion={versionGate.currentBuildNumber ?? 0}
          requiredVersion={versionGate.requiredBuildNumber ?? 0}
        />
      </>
    );
  }

  if (ready && user?.modoCadete) {
    return (
      <>
        <PushNotificationDialogHost />
        <StatusBar
          translucent
          backgroundColor="transparent"
          // barStyle={theme.dark ? "light-content" : "dark-content"}
          barStyle={"light-content"}
        />
        <CadeteNavigator />
      </>
    );
  }

  if (
    ready &&
    userHasEmpresaRole(user) &&
    user?.modoEmpresa
  ) {
    return (
      <>
        <PushNotificationDialogHost />
        <StatusBar
          translucent
          backgroundColor="transparent"
          // barStyle={theme.dark ? "light-content" : "dark-content"}
          barStyle={"dark-content"}
        />
        <EmpresaNavigator />
      </>
    );
  }

  if (Meteor.userId()) {
    return (
      <>
        <PushNotificationDialogHost />
        <StatusBar
          // translucent
          // backgroundColor="transparent"
          // barStyle={theme.dark ? "light-content" : "dark-content"}
          barStyle={"light-content"}
        />
        <MenuPrincipal />
      </>
    );
  }

  return (
    <>
      <PushNotificationDialogHost />
      <StatusBar
        translucent
        backgroundColor="transparent"
        // barStyle={theme.dark ? "light-content" : "dark-content"}
        barStyle={"light-content"}
      />
      <Loguin />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },
});
