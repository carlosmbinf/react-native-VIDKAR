import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { Alert } from "react-native";

import { getAppVersionInfo } from "../../services/app/appVersion";
import { VentasCollection } from "../collections/collections";
import MenuPrincipalScreen from "./MenuPrincipalScreen.jsx";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const MenuPrincipalNative = () => {
  const { pendingDebt, pendingVentasCount, user } = Meteor.useTracker(() => {
    const currentUser = Meteor.user();
    const currentUserId = currentUser?._id;
    const isAdmin = currentUser?.profile?.role === "admin";

    if (!currentUserId || !isAdmin) {
      return {
        user: currentUser,
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
      user: currentUser,
      pendingDebt: pendingVentas.reduce(
        (total, venta) => total + (Number(venta?.precio) || 0),
        0,
      ),
      pendingVentasCount: pendingVentas.length,
    };
  });
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
