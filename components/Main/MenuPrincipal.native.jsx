import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking } from "react-native";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { getAppVersionInfo } from "../../services/app/appVersion";
import {
    ensureCadeteLocationPermissions,
    sendCadeteLocationNow,
    syncCadeteBackgroundLocation,
} from "../../services/location/cadeteBackgroundLocation.native";
import {
    getPushNotificationPermissionState,
    registerPushTokenForActiveSession,
} from "../../services/notifications/PushMessaging.native";
import {
    buildPendingEvidenceAggregate,
    buildPendingEvidenceQuery,
    PENDING_EVIDENCE_FIELDS,
} from "../archivos/evidencePendingUtils";
import {
    PreciosCollection,
    VentasCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import MenuPrincipalScreen from "./MenuPrincipalScreen.jsx";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const CASH_APPROVAL_TYPE_META = {
  COMERCIO: { icon: "storefront-outline", label: "Comercio" },
  PROXY: { icon: "wifi", label: "Proxy" },
  RECARGA: { icon: "cellphone-arrow-down", label: "Recargas" },
  REMESA: { icon: "cash-fast", label: "Remesas" },
  VPN: { icon: "shield-check", label: "VPN" },
};

const PENDING_DEBT_FIELDS = {
  precio: 1,
};

const PENDING_CASH_APPROVAL_FIELDS = {
  cobrado: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  userId: 1,
  "producto.carritos": 1,
  type: 1,
  "producto.status": 1,
  "producto.type": 1,
  "producto.userId": 1,
};

const PROXY_PRICE_TYPES = ["megas", "fecha-proxy"];
const VPN_PRICE_TYPES = ["vpnplus", "fecha-vpn", "vpn2mb"];
const PRICE_SETUP_TYPE_VALUES = [...PROXY_PRICE_TYPES, ...VPN_PRICE_TYPES];

const PRICE_SETUP_FIELDS = {
  type: 1,
  userId: 1,
};

const PRICE_SETUP_SERVICES = [
  {
    key: "proxy",
    label: "Proxy",
    icon: "wifi",
    types: PROXY_PRICE_TYPES,
  },
  {
    key: "vpn",
    label: "VPN",
    icon: "shield-check-outline",
    types: VPN_PRICE_TYPES,
  },
];

const MENU_DEBUG_PREFIX = "[MenuPrincipalRender]";

const logMenuPrincipalDebug = (label, payload) => {
  const timestamp = new Date().toISOString();

  if (payload === undefined) {
    console.log(`${MENU_DEBUG_PREFIX} ${timestamp} ${label}`);
    return;
  }

  console.log(`${MENU_DEBUG_PREFIX} ${timestamp} ${label}`, payload);
};

const isPrincipalAdmin = (user) => user?.username === "carlosmbinf";

const isAdminUser = (user) =>
  user?.profile?.role === "admin" || isPrincipalAdmin(user);

const buildSortedIds = (users = []) =>
  users
    .map((usuario) => usuario._id)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

const getCashApprovalTypes = (venta) => {
  const carritos = Array.isArray(venta?.producto?.carritos)
    ? venta?.producto?.carritos
    : [];
  const types = new Set(
    carritos.map((item) => item?.type).filter((type) => !!type),
  );

  if (types.size === 0) {
    const fallbackType = venta?.producto?.type || venta?.type;
    if (fallbackType) {
      types.add(fallbackType);
    }
  }

  return Array.from(types);
};

const buildPendingCashApprovalsSummary = (ventas = []) => {
  const countsByType = ventas.reduce((accumulator, venta) => {
    getCashApprovalTypes(venta).forEach((type) => {
      if (!CASH_APPROVAL_TYPE_META[type]) {
        return;
      }

      accumulator[type] = (accumulator[type] || 0) + 1;
    });

    return accumulator;
  }, {});

  const typeSummary = Object.entries(countsByType)
    .map(([type, count]) => ({
      count,
      icon: CASH_APPROVAL_TYPE_META[type].icon,
      key: type,
      label: CASH_APPROVAL_TYPE_META[type].label,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "es");
    });

  return {
    pendingCashApprovalTypes: typeSummary,
    pendingCashApprovalsCount: ventas.length,
  };
};

const buildMissingPriceServices = (prices = []) => {
  const configuredTypes = new Set(
    prices.map((price) => price?.type).filter(Boolean),
  );

  return PRICE_SETUP_SERVICES.filter(
    (service) => !service.types.some((type) => configuredTypes.has(type)),
  ).map(({ icon, key, label }) => ({ icon, key, label }));
};

const callMeteorMethod = (methodName, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const getCadeteTrackingStartError = (result) => {
  if (result?.started) {
    return "";
  }

  if (result?.reason === "permission-denied") {
    return "Debes permitir la ubicación siempre activa para entrar al modo cadete.";
  }

  if (result?.reason === "task-not-defined") {
    return "El servicio de ubicación todavía no está listo. Reinicia la app e inténtalo nuevamente.";
  }

  if (result?.reason === "native-start-failed") {
    return "No se pudo iniciar el seguimiento nativo de ubicación.";
  }

  return "No se pudo iniciar el seguimiento de ubicación en tiempo real.";
};

const createCadeteLocationError = (message, options = {}) => {
  const error = new Error(message);
  error.code = options.code || "cadete-location-error";
  error.openSettings = Boolean(options.openSettings);
  return error;
};

const openApplicationSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn(
      "[CadeteLocation] No se pudo abrir la configuración de la app:",
      error,
    );
  }
};

const shouldOfferLocationSettings = (permissions) => {
  if (!permissions || permissions.granted) {
    return false;
  }

  return (
    permissions.foreground?.status !== "granted" ||
    permissions.background?.status !== "granted" ||
    permissions.foreground?.canAskAgain === false ||
    permissions.background?.canAskAgain === false
  );
};

const showCadeteLocationErrorAlert = (
  message,
  { openSettings = false } = {},
) => {
  if (!openSettings) {
    Alert.alert("Ubicación requerida", message);
    return;
  }

  Alert.alert(
    "Ubicación requerida",
    `${message}\n\nAbre la configuración de la app y permite la ubicación para poder activar el modo cadete.`,
    [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Abrir configuración",
        onPress: openApplicationSettings,
      },
    ],
  );
};

const prepareCadeteRealtimeLocation = async (userId) => {
  if (!userId) {
    throw createCadeteLocationError(
      "No se pudo identificar tu sesión para activar el modo cadete.",
    );
  }

  const permissions = await ensureCadeteLocationPermissions({ request: true });

  if (!permissions.granted) {
    throw createCadeteLocationError(
      "Debes permitir la ubicación siempre activa para entrar al modo cadete.",
      {
        code: "cadete-location-permission-denied",
        openSettings: shouldOfferLocationSettings(permissions),
      },
    );
  }

  const initialLocation = await sendCadeteLocationNow({
    force: true,
    minDistanceMeters: 0,
    trackingMode: "preflight",
    userId,
  });

  if (!initialLocation) {
    throw createCadeteLocationError(
      "No se pudo obtener tu ubicación actual. Activa el GPS e inténtalo nuevamente.",
      {
        code: "cadete-location-unavailable",
        openSettings: true,
      },
    );
  }

  return initialLocation;
};

const MenuPrincipalNative = () => {
  const renderStartedAtRef = useRef(
    typeof performance?.now === "function" ? performance.now() : Date.now(),
  );
  const user = Meteor.useTracker(() => Meteor.user());
  const currentUserId = user?._id;
  const isAdmin = isAdminUser(user);
  const isAdminPrincipal = isPrincipalAdmin(user);
  const dataReady = useDeferredScreenData();
  const pushPermissionRequestIdRef = useRef(0);
  const [pushPermissionState, setPushPermissionState] = useState({
    canAskAgain: true,
    granted: true,
    status: "undetermined",
  });
  const [pushPermissionLoading, setPushPermissionLoading] = useState(true);

  useEffect(() => {
    const now =
      typeof performance?.now === "function" ? performance.now() : Date.now();

    logMenuPrincipalDebug("native-shell:mounted", {
      elapsedMs: Number((now - renderStartedAtRef.current).toFixed(1)),
      userId: user?._id || null,
      username: user?.username || null,
    });
  }, [user?._id, user?.username]);

  const refreshPushPermissionState = useCallback(
    async ({ showLoading = false } = {}) => {
      const requestId = pushPermissionRequestIdRef.current + 1;
      pushPermissionRequestIdRef.current = requestId;

      if (showLoading) {
        setPushPermissionLoading(true);
      }

      try {
        const nextPermissionState = await getPushNotificationPermissionState();
        if (pushPermissionRequestIdRef.current !== requestId) {
          return nextPermissionState;
        }

        setPushPermissionState(nextPermissionState);
        return nextPermissionState;
      } catch (error) {
        console.warn(
          "[MenuPrincipal] No se pudo leer el permiso de notificaciones:",
          error,
        );
        return null;
      } finally {
        if (pushPermissionRequestIdRef.current === requestId) {
          setPushPermissionLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    refreshPushPermissionState({ showLoading: true });
  }, [currentUserId, refreshPushPermissionState]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          refreshPushPermissionState({ showLoading: false });
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [refreshPushPermissionState]);

  const { subordinadosIds, subordinadosLoading } = Meteor.useTracker(() => {
    if (!dataReady || !isAdmin || !currentUserId || isAdminPrincipal) {
      return {
        subordinadosIds: [],
        subordinadosLoading: false,
      };
    }

    const subordinadosHandle = Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: currentUserId },
      { fields: { _id: 1 } },
    );

    return {
      subordinadosIds: subordinadosHandle.ready()
        ? buildSortedIds(
            Meteor.users
              .find(
                { bloqueadoDesbloqueadoPor: currentUserId },
                { fields: { _id: 1 } },
              )
              .fetch(),
          )
        : [],
      subordinadosLoading: !subordinadosHandle.ready(),
    };
  }, [currentUserId, dataReady, isAdmin, isAdminPrincipal]);
  const subordinadosIdsKey = subordinadosIds.join(",");

  useEffect(() => {
    logMenuPrincipalDebug("data:user-context", {
      currentUserId: currentUserId || null,
      dataReady,
      isAdmin,
      isAdminPrincipal,
      username: user?.username || null,
    });
  }, [currentUserId, dataReady, isAdmin, isAdminPrincipal, user?.username]);

  const { pendingDebt, pendingVentasCount } = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId || !isAdmin) {
      return {
        pendingDebt: 0,
        pendingVentasCount: 0,
      };
    }

    const ventasHandle = Meteor.subscribe(
      "ventas",
      {
        adminId: currentUserId,
        cobrado: false,
      },
      { fields: PENDING_DEBT_FIELDS },
    );

    const pendingVentas = ventasHandle.ready()
      ? VentasCollection.find({
          adminId: currentUserId,
          cobrado: false,
        }).fetch()
      : [];

    return {
      pendingDebt: pendingVentas.reduce(
        (total, venta) => total + (Number(venta?.precio) || 0),
        0,
      ),
      pendingVentasCount: pendingVentas.length,
    };
  }, [currentUserId, dataReady, isAdmin]);

  useEffect(() => {
    logMenuPrincipalDebug("data:pending-debt", {
      pendingDebt,
      pendingVentasCount,
    });
  }, [pendingDebt, pendingVentasCount]);

  const { missingPriceServices, priceSetupLoading } = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId || !isAdmin) {
      return {
        missingPriceServices: [],
        priceSetupLoading: false,
      };
    }

    const pricesSelector = {
      userId: currentUserId,
      type: { $in: PRICE_SETUP_TYPE_VALUES },
    };
    const pricesHandle = Meteor.subscribe("precios", pricesSelector, {
      fields: PRICE_SETUP_FIELDS,
    });
    const ownServicePrices = pricesHandle.ready()
      ? PreciosCollection.find(pricesSelector, {
          fields: PRICE_SETUP_FIELDS,
        }).fetch()
      : [];

    return {
      missingPriceServices: pricesHandle.ready()
        ? buildMissingPriceServices(ownServicePrices)
        : [],
      priceSetupLoading: !pricesHandle.ready(),
    };
  }, [currentUserId, dataReady, isAdmin]);

  useEffect(() => {
    logMenuPrincipalDebug("data:price-setup", {
      missingPriceServices: missingPriceServices.map((service) => service.key),
      priceSetupLoading,
    });
  }, [missingPriceServices, priceSetupLoading]);

  const { pendingEvidenceCount, pendingEvidenceLoading } =
    Meteor.useTracker(() => {
      if (!dataReady || !currentUserId) {
        return {
          pendingEvidenceCount: 0,
          pendingEvidenceLoading: false,
        };
      }

      const query = buildPendingEvidenceQuery(currentUserId);
      const handle = Meteor.subscribe("ventasRecharge", query, {
        fields: PENDING_EVIDENCE_FIELDS,
      });
      const pendingEvidenceVentas = handle.ready()
        ? VentasRechargeCollection.find(query, {
            fields: PENDING_EVIDENCE_FIELDS,
            sort: { createdAt: -1 },
          }).fetch()
        : [];

      return {
        ...buildPendingEvidenceAggregate(pendingEvidenceVentas),
        pendingEvidenceLoading: !handle.ready(),
      };
    }, [currentUserId, dataReady]);

  useEffect(() => {
    logMenuPrincipalDebug("data:pending-evidence", {
      pendingEvidenceCount,
      pendingEvidenceLoading,
    });
  }, [pendingEvidenceCount, pendingEvidenceLoading]);

  const {
    pendingCashApprovalTypes,
    pendingCashApprovalsCount,
    pendingCashApprovalsLoading,
  } = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId || !isAdmin) {
      return {
        pendingCashApprovalTypes: [],
        pendingCashApprovalsCount: 0,
        pendingCashApprovalsLoading: false,
      };
    }

    if (!isAdminPrincipal && subordinadosLoading) {
      return {
        pendingCashApprovalTypes: [],
        pendingCashApprovalsCount: 0,
        pendingCashApprovalsLoading: false,
      };
    }

    const cashApprovalsQuery = isAdminPrincipal
      ? {
          isCancelada: false,
          isCobrado: false,
          metodoPago: "EFECTIVO",
        }
      : {
          isCancelada: false,
          isCobrado: false,
          metodoPago: "EFECTIVO",
          $or: [
            { userId: currentUserId },
            { userId: { $in: subordinadosIds } },
          ],
        };

    const cashApprovalsHandle = Meteor.subscribe(
      "ventasRecharge",
      cashApprovalsQuery,
      { fields: PENDING_CASH_APPROVAL_FIELDS },
    );
    const ventasEfectivoPendientes = cashApprovalsHandle.ready()
      ? VentasRechargeCollection.find(cashApprovalsQuery, {
          sort: { createdAt: -1 },
        }).fetch()
      : [];
    const cashApprovalsSummary = buildPendingCashApprovalsSummary(
      ventasEfectivoPendientes,
    );

    return {
      ...cashApprovalsSummary,
      pendingCashApprovalsLoading: !cashApprovalsHandle.ready(),
    };
  }, [
    currentUserId,
    dataReady,
    isAdmin,
    isAdminPrincipal,
    subordinadosIdsKey,
    subordinadosLoading,
  ]);
  const appVersionInfo = getAppVersionInfo();

  const handleOpenPendingVentas = () => {
    if (!user?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/Ventas",
      params: {
        id: user._id,
        pago: "PENDIENTE",
      },
    });
  };

  const handleOpenCashApprovals = () => {
    router.push("/(normal)/ListaArchivos");
  };

  useEffect(() => {
    logMenuPrincipalDebug("data:cash-approvals", {
      pendingCashApprovalsCount,
      pendingCashApprovalsLoading,
      pendingCashApprovalTypes: pendingCashApprovalTypes.map(
        (item) => item.key,
      ),
      subordinadosCount: subordinadosIds.length,
      subordinadosLoading,
    });
  }, [
    pendingCashApprovalTypes,
    pendingCashApprovalsCount,
    pendingCashApprovalsLoading,
    subordinadosIds.length,
    subordinadosLoading,
  ]);
  const handleOpenPendingEvidence = () => {
    router.push("/(normal)/EvidenciasPendientes");
  };

  const handleOpenPrices = () => {
    router.push("/(normal)/Precios");
  };

  const handleEnableNotifications = async () => {
    if (!currentUserId) {
      Alert.alert(
        "Sesión requerida",
        "Inicia sesión nuevamente para activar las notificaciones de tu cuenta.",
      );
      return;
    }

    if (pushPermissionState?.canAskAgain === false) {
      Alert.alert(
        "Notificaciones bloqueadas",
        "Las notificaciones están bloqueadas para Vidkar. Abre la configuración de la app y actívalas manualmente para recibir avisos de compras, mensajes y servicios.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir configuración", onPress: openApplicationSettings },
        ],
      );
      return;
    }

    setPushPermissionLoading(true);
    try {
      const result = await registerPushTokenForActiveSession({
        delayMs: 350,
        retries: 4,
      });
      const nextPermissionState = await refreshPushPermissionState();

      if (nextPermissionState?.granted || result?.length > 0) {
        Alert.alert(
          "Notificaciones activadas",
          "Listo. A partir de ahora podrás recibir avisos importantes de tus servicios en este dispositivo.",
        );
        return;
      }

      if (nextPermissionState?.canAskAgain === false) {
        Alert.alert(
          "Actívalas desde ajustes",
          "El sistema no permitió activar las notificaciones desde la app. Abre la configuración de Vidkar y habilítalas manualmente.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir configuración", onPress: openApplicationSettings },
          ],
        );
        return;
      }

      Alert.alert(
        "No se activaron",
        "No pudimos completar la activación de notificaciones. Revisa los permisos del dispositivo e inténtalo nuevamente.",
      );
    } catch (error) {
      const message =
        error?.reason ||
        error?.message ||
        "No pudimos activar las notificaciones en este momento.";

      Alert.alert("Notificaciones", message);
    } finally {
      setPushPermissionLoading(false);
    }
  };

  const handleToggleModoCadete = () => {
    const nextState = !user?.modoCadete;

    Alert.alert(
      nextState ? "Activar modo cadete" : "Salir del modo cadete",
      nextState
        ? "Comenzarás a aparecer disponible para entregas y el sistema podrá asignarte nuevos pedidos."
        : "Dejarás de recibir nuevas asignaciones hasta que vuelvas a activarlo.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          onPress: async () => {
            let cadeteModeActivated = false;

            try {
              if (nextState) {
                await prepareCadeteRealtimeLocation(currentUserId);
              }

              await callMeteorMethod("users.toggleModoCadete", nextState);
              cadeteModeActivated = nextState;

              const trackingResult = await syncCadeteBackgroundLocation({
                enabled: nextState,
                userId: nextState ? currentUserId : undefined,
              });
              const trackingErrorMessage = nextState
                ? getCadeteTrackingStartError(trackingResult)
                : "";

              if (trackingErrorMessage) {
                throw new Error(trackingErrorMessage);
              }

              Alert.alert(
                "Éxito",
                nextState
                  ? "Modo cadete activado correctamente. Tu ubicación en tiempo real quedó encendida."
                  : "Modo cadete desactivado correctamente.",
              );
            } catch (error) {
              if (nextState && cadeteModeActivated) {
                try {
                  await callMeteorMethod("users.toggleModoCadete", false);
                  await syncCadeteBackgroundLocation({ enabled: false });
                } catch (rollbackError) {
                  console.warn(
                    "[CadeteLocation] No se pudo revertir el modo cadete tras fallar el tracking:",
                    rollbackError,
                  );
                }
              }

              const errorMessage =
                error?.reason ||
                error?.message ||
                "No se pudo cambiar el modo cadete.";

              if (nextState) {
                showCadeteLocationErrorAlert(errorMessage, {
                  openSettings: error?.openSettings === true,
                });
                return;
              }

              Alert.alert("Error", errorMessage);
            }
          },
        },
      ],
    );
  };

  const handleToggleModoEmpresa = () => {
    const nextState = !user?.modoEmpresa;

    Alert.alert(
      nextState ? "Entrar en modo empresa" : "Salir del modo empresa",
      nextState
        ? "Entrarás al panel para gestionar tus tiendas, productos y pedidos."
        : "Volverás al menú normal. Tus tiendas, productos y pedidos se mantienen guardados.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: nextState ? "Entrar" : "Salir",
          onPress: async () => {
            try {
              await callMeteorMethod("users.toggleModoEmpresa", nextState);

              Alert.alert(
                "Éxito",
                nextState
                  ? "Modo empresa activado correctamente."
                  : "Modo empresa desactivado correctamente.",
              );
            } catch (error) {
              const errorMessage =
                error?.reason ||
                error?.message ||
                "No se pudo cambiar el modo empresa.";

              Alert.alert("Modo empresa", errorMessage);
            }
          },
        },
      ],
    );
  };

  return (
    <MenuPrincipalScreen
      user={user}
      appVersion={appVersionInfo.version}
      buildNumber={appVersionInfo.buildNumber}
      pendingDebt={pendingDebt}
      pendingEvidenceCount={pendingEvidenceCount}
      pendingEvidenceLoading={pendingEvidenceLoading}
      pendingVentasCount={pendingVentasCount}
      pendingCashApprovalTypes={pendingCashApprovalTypes}
      pendingCashApprovalsCount={pendingCashApprovalsCount}
      pendingCashApprovalsLoading={pendingCashApprovalsLoading}
      notificationsPermissionBlocked={
        pushPermissionState?.canAskAgain === false
      }
      notificationsPermissionGranted={pushPermissionState?.granted === true}
      notificationsPermissionLoading={pushPermissionLoading}
      missingPriceServices={missingPriceServices}
      priceSetupLoading={priceSetupLoading}
      onEnableNotifications={handleEnableNotifications}
      onOpenCashApprovals={handleOpenCashApprovals}
      onOpenPendingEvidence={handleOpenPendingEvidence}
      onOpenPendingVentas={handleOpenPendingVentas}
      onOpenPrices={handleOpenPrices}
      onToggleModoCadete={handleToggleModoCadete}
      onToggleModoEmpresa={handleToggleModoEmpresa}
      onLogout={() => {
        Meteor.logout(() => {
          router.replace("/(auth)/Loguin");
        });
      }}
    />
  );
};

export default MenuPrincipalNative;
