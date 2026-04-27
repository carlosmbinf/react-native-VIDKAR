import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { Alert } from "react-native";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { getAppVersionInfo } from "../../services/app/appVersion";
import { syncCadeteBackgroundLocation } from "../../services/location/cadeteBackgroundLocation.native";
import {
    VentasCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import {
  buildPendingEvidenceAggregate,
  buildPendingEvidenceQuery,
  PENDING_EVIDENCE_FIELDS,
} from "../archivos/evidencePendingUtils";
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

const MenuPrincipalNative = () => {
  const user = Meteor.useTracker(() => Meteor.user());
  const currentUserId = user?._id;
  const isAdmin = isAdminUser(user);
  const isAdminPrincipal = isPrincipalAdmin(user);
  const dataReady = useDeferredScreenData();

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

  const {
    pendingEvidenceCount,
    pendingEvidenceLoading,
  } = Meteor.useTracker(() => {
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
  }, [currentUserId, dataReady, isAdmin, isAdminPrincipal, subordinadosIdsKey, subordinadosLoading]);
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

  const handleOpenPendingEvidence = () => {
    router.push("/(normal)/EvidenciasPendientes");
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
          onPress: () => {
            Meteor.call("users.toggleModoCadete", nextState, async (error) => {
              if (error) {
                Alert.alert(
                  "Error",
                  error.reason || "No se pudo cambiar el modo cadete.",
                );
                return;
              }

              try {
                await syncCadeteBackgroundLocation({
                  enabled: nextState,
                  userId: nextState ? currentUserId : undefined,
                });
              } catch (trackingError) {
                console.warn(
                  "[CadeteLocation] No se pudo sincronizar el tracking al cambiar modo cadete:",
                  trackingError,
                );
              }

              Alert.alert(
                "Éxito",
                nextState
                  ? "Modo cadete activado correctamente."
                  : "Modo cadete desactivado correctamente.",
              );
            });
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
      onOpenCashApprovals={handleOpenCashApprovals}
      onOpenPendingEvidence={handleOpenPendingEvidence}
      onOpenPendingVentas={handleOpenPendingVentas}
      onToggleModoCadete={handleToggleModoCadete}
      onLogout={() => {
        Meteor.logout(() => {
          router.replace("/(auth)/Loguin");
        });
      }}
    />
  );
};

export default MenuPrincipalNative;
