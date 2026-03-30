import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { Alert } from "react-native";

import { getAppVersionInfo } from "../../services/app/appVersion";
import MenuPrincipalScreen from "./MenuPrincipalScreen.jsx";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const MenuPrincipalNative = () => {
  const user = Meteor.useTracker(() => Meteor.user());
  const appVersionInfo = getAppVersionInfo();

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
