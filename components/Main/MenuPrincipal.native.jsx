import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "../archivos/evidencePendingUtils";
import { userHasEmpresaRole } from "../navigator/sessionRoute";
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
const MIN_HOME_REFRESH_MS = 700;
const HOME_LOAD_STEPS = [
  { label: "Cargando listado de servicios Cubacel", method: "home.getDtShopProducts" },
  { label: "Cargando servicios Proxy/VPN", method: "home.getProxyVpnPackages" },
  { label: "Cargando cobros pendientes", method: "home.getPendingDebt" },
  { label: "Cargando configuración de precios", method: "home.getPriceSetup" },
  { label: "Cargando evidencias pendientes", method: "home.getPendingEvidence" },
  { label: "Cargando aprobaciones de efectivo", method: "home.getCashApprovals" },
  { label: "Cargando entregas de comercio", method: "home.getCommerceOrders" },
];

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

const openEmpresaWelcome = () => {
  router.push("/(normal)/EmpresaWelcome");
};

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

const confirmCadeteLocationDisclosure = () =>
  new Promise((resolve) => {
    Alert.alert(
      "Ubicación en segundo plano",
      "Al activar el modo cadete, VIDKAR recopilará tu ubicación precisa, incluso con la app cerrada o en segundo plano, para mostrarte disponible, asignarte entregas y actualizar su estado. La ubicación se envía a VIDKAR solo mientras el modo cadete esté activo. Puedes detenerlo saliendo de este modo o revocando el permiso desde los ajustes.",
      [
        {
          text: "Cancelar",
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: "Continuar",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

const prepareCadeteRealtimeLocation = async (userId) => {
  if (!userId) {
    throw createCadeteLocationError(
      "No se pudo identificar tu sesión para activar el modo cadete.",
    );
  }

  const disclosureAccepted = await confirmCadeteLocationDisclosure();
  if (!disclosureAccepted) {
    throw createCadeteLocationError(
      "Debes aceptar el aviso de ubicación para activar el modo cadete.",
      { code: "cadete-location-disclosure-declined" },
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
  const [normalHomeCatalogs, setNormalHomeCatalogs] = useState(null);
  const [normalHomeCatalogsLoading, setNormalHomeCatalogsLoading] = useState(
    true,
  );
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  const [homeLoadProgress, setHomeLoadProgress] = useState({
    completed: 0,
    error: null,
    label: HOME_LOAD_STEPS[0].label,
    total: HOME_LOAD_STEPS.length,
  });
  const normalHomeCatalogsRef = useRef({});
  const normalHomeCatalogRequestIdRef = useRef(0);
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

  useEffect(() => {
    if (user?.modoEmpresa && userHasEmpresaRole(user)) {
      router.replace("/(empresa)/EmpresaNavigator");
    }
  }, [user]);

  const refreshNormalHomeCatalogs = useCallback(() => {
    if (!dataReady || !currentUserId) {
      return Promise.resolve();
    }

    const requestId = normalHomeCatalogRequestIdRef.current + 1;
    normalHomeCatalogRequestIdRef.current = requestId;
    const startedAt = Date.now();
    const previousCatalogs = normalHomeCatalogsRef.current;
    let loadedCatalogs = previousCatalogs;
    let firstError = null;
    setNormalHomeCatalogsLoading(true);
    setHomeRefreshing(true);
    setHomeLoadProgress({
      completed: 0,
      error: null,
      label: HOME_LOAD_STEPS[0].label,
      total: HOME_LOAD_STEPS.length,
    });

    return (async () => {
      for (let index = 0; index < HOME_LOAD_STEPS.length; index += 1) {
        const step = HOME_LOAD_STEPS[index];

        if (normalHomeCatalogRequestIdRef.current !== requestId) {
          return;
        }

        setHomeLoadProgress((current) => ({
          ...current,
          label: step.label,
        }));

        try {
          const result = await callMeteorMethod(step.method);
          loadedCatalogs = { ...loadedCatalogs, ...result };
          normalHomeCatalogsRef.current = loadedCatalogs;
          setNormalHomeCatalogs(loadedCatalogs);
          setHomeLoadProgress({
            completed: index + 1,
            error: firstError,
            label: HOME_LOAD_STEPS[index + 1]?.label || "Carga completada",
            total: HOME_LOAD_STEPS.length,
          });
        } catch (error) {
          firstError ||= error;
          console.warn(
            `[MenuPrincipal] No se pudo cargar ${step.method}:`,
            error,
          );
          setHomeLoadProgress((current) => ({
            ...current,
            error: firstError,
            label: `No se pudo cargar: ${step.label}`,
          }));
        }
      }

      const remainingMs = Math.max(
        0,
        MIN_HOME_REFRESH_MS - (Date.now() - startedAt),
      );

      await new Promise((resolve) => setTimeout(resolve, remainingMs));
      if (normalHomeCatalogRequestIdRef.current !== requestId) {
        return;
      }

      setNormalHomeCatalogsLoading(false);
      setHomeRefreshing(false);
      setHomeLoadProgress((current) => ({
        ...current,
        label: firstError ? "Carga finalizada con errores" : "Carga completada",
      }));
    })();
  }, [currentUserId, dataReady]);

  useEffect(() => {
    refreshNormalHomeCatalogs();
  }, [refreshNormalHomeCatalogs]);

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

  const pendingDebtVentas = normalHomeCatalogs?.pendingDebtVentas || [];
  const { pendingDebt, pendingVentasCount } = useMemo(() => {
    if (!isAdmin || !Array.isArray(pendingDebtVentas)) {
      return { pendingDebt: 0, pendingVentasCount: 0 };
    }

    return {
      pendingDebt: pendingDebtVentas.reduce(
        (total, venta) => total + (Number(venta?.precio) || 0),
        0,
      ),
      pendingVentasCount: pendingDebtVentas.length,
    };
  }, [isAdmin, pendingDebtVentas]);

  useEffect(() => {
    logMenuPrincipalDebug("data:pending-debt", {
      pendingDebt,
      pendingVentasCount,
    });
  }, [pendingDebt, pendingVentasCount]);

  const ownServicePrices = normalHomeCatalogs?.ownServicePrices || [];
  const missingPriceServices = useMemo(
    () =>
      isAdmin && Array.isArray(ownServicePrices)
        ? buildMissingPriceServices(ownServicePrices)
        : [],
    [isAdmin, ownServicePrices],
  );
  const priceSetupLoading = isAdmin && normalHomeCatalogsLoading;

  useEffect(() => {
    logMenuPrincipalDebug("data:price-setup", {
      missingPriceServices: missingPriceServices.map((service) => service.key),
      priceSetupLoading,
    });
  }, [missingPriceServices, priceSetupLoading]);

  const pendingEvidenceVentas = normalHomeCatalogs?.pendingEvidenceVentas || [];
  const { pendingEvidenceCount, pendingEvidenceLoading } = useMemo(
    () => ({
      ...buildPendingEvidenceAggregate(pendingEvidenceVentas),
      pendingEvidenceLoading: normalHomeCatalogsLoading,
    }),
    [normalHomeCatalogsLoading, pendingEvidenceVentas],
  );

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
  } = useMemo(() => {
    const cashApprovalVentas = isAdmin
      ? normalHomeCatalogs?.cashApprovalVentas || []
      : [];

    return {
      ...buildPendingCashApprovalsSummary(cashApprovalVentas),
      pendingCashApprovalsLoading: isAdmin && normalHomeCatalogsLoading,
    };
  }, [isAdmin, normalHomeCatalogs, normalHomeCatalogsLoading]);
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

              const modeResult = await callMeteorMethod(
                "users.toggleModoCadete",
                nextState,
              );
              if (
                modeResult?.success !== true ||
                modeResult?.modoCadete !== nextState
              ) {
                throw new Error(
                  "El servidor no confirmó el cambio al modo cadete.",
                );
              }
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

              router.replace(
                nextState ? "/(cadete)/CadeteNavigator" : "/",
              );

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

    if (nextState && user?.empresaTerminosCondicionesAcepted !== true) {
      openEmpresaWelcome();
      return;
    }

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
      normalHomeCatalogs={normalHomeCatalogs}
      normalHomeCatalogsLoading={normalHomeCatalogsLoading}
      homeRefreshing={homeRefreshing}
      homeLoadProgress={homeLoadProgress}
      onRefresh={refreshNormalHomeCatalogs}
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
