import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { Alert } from "react-native";

import { getAppVersionInfo } from "../../services/app/appVersion";
import {
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

const isPrincipalAdmin = (user) => user?.username === "carlosmbinf";

const isAdminUser = (user) =>
  user?.profile?.role === "admin" || isPrincipalAdmin(user);

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

  const { subordinadosIds, subordinadosLoading } = Meteor.useTracker(() => {
    if (!isAdmin || !currentUserId || isAdminPrincipal) {
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
        ? Meteor.users
            .find(
              { bloqueadoDesbloqueadoPor: currentUserId },
              { fields: { _id: 1 } },
            )
            .fetch()
            .map((usuario) => usuario._id)
        : [],
      subordinadosLoading: !subordinadosHandle.ready(),
    };
  }, [currentUserId, isAdmin, isAdminPrincipal]);

  const { pendingDebt, pendingVentasCount } = Meteor.useTracker(() => {
    if (!currentUserId || !isAdmin) {
      return {
        pendingDebt: 0,
        pendingVentasCount: 0,
      };
    }

    const ventasHandle = Meteor.subscribe("ventas", {
      adminId: currentUserId,
      cobrado: false,
    });

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
  }, [currentUserId, isAdmin]);

  const {
    pendingCashApprovalTypes,
    pendingCashApprovalsCount,
    pendingCashApprovalsLoading,
  } = Meteor.useTracker(() => {
    if (!currentUserId || !isAdmin) {
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
      pendingCashApprovalsLoading:
        !cashApprovalsHandle.ready() || subordinadosLoading,
    };
  }, [currentUserId, isAdmin, isAdminPrincipal, subordinadosIds, subordinadosLoading]);
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
            Meteor.call("users.toggleModoCadete", nextState, (error) => {
              if (error) {
                Alert.alert(
                  "Error",
                  error.reason || "No se pudo cambiar el modo cadete.",
                );
                return;
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
      pendingVentasCount={pendingVentasCount}
      pendingCashApprovalTypes={pendingCashApprovalTypes}
      pendingCashApprovalsCount={pendingCashApprovalsCount}
      pendingCashApprovalsLoading={pendingCashApprovalsLoading}
      onOpenCashApprovals={handleOpenCashApprovals}
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
