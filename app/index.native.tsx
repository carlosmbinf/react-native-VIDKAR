import MeteorBase from "@meteorrn/core";
import * as Application from "expo-application";
import Constants from "expo-constants";
import React from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";
import { ActivityIndicator, Surface, Text, useTheme } from "react-native-paper";

import CadeteNavigator from "../components/cadete/CadeteNavigator";
import EmpresaNavigator from "../components/empresa/EmpresaNavigator";
import Loguin from "../components/loguin/Loguin.native";
import MenuPrincipal from "../components/Main/MenuPrincipal.native";
import PushNotificationDialogHost from "../components/shared/PushNotificationDialogHost.native";
import UpdateRequired from "../components/update/UpdateRequired";
import { syncCadeteBackgroundLocation } from "../services/location/cadeteBackgroundLocation.native";
import {
  registerPushTokenForActiveSession,
  registerPushTokenForUser,
  setupPushListeners,
} from "../services/notifications/PushMessaging.native";

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

const ROOT_USER_FIELDS = {
  modoCadete: 1,
  modoEmpresa: 1,
  permiteRemesas: 1,
  picture: 1,
  "profile.firstName": 1,
  "profile.role": 1,
  "profile.roleComercio": 1,
  subscipcionPelis: 1,
  username: 1,
};

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

    setupPushListeners({
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
    user?.profile?.roleComercio?.includes("EMPRESA") &&
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
