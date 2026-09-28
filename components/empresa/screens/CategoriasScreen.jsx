import React from "react";
import { useRouter } from "expo-router";
import MeteorBase from "@meteorrn/core";
import { ActivityIndicator, Text } from "react-native-paper";
import { View } from "react-native";

import ScreenFallback from "../../shared/ScreenFallback";
import { resolveSessionRoute, userHasEmpresaRole } from "../../navigator/sessionRoute";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const CategoriasScreen = () => {
  const router = useRouter();
  const { user, userId } = Meteor.useTracker(() => ({
    user: Meteor.user(),
    userId: Meteor.userId(),
  }));
  const hasEmpresaAccess = Boolean(
    user?.modoEmpresa === true &&
      user?.empresaBloqueada !== true &&
      user?.empresaTerminosCondicionesAcepted === true &&
      userHasEmpresaRole(user),
  );

  React.useEffect(() => {
    if (hasEmpresaAccess) return;

    const sessionRoute = resolveSessionRoute(userId, user);
    const targetRoute =
      sessionRoute === "/(empresa)/EmpresaNavigator"
        ? "/(normal)/Main"
        : sessionRoute;
    router.replace(targetRoute);
  }, [hasEmpresaAccess, router, user, userId]);

  if (!hasEmpresaAccess) {
    return (
      <View style={{ alignItems: "center", flex: 1, gap: 12, justifyContent: "center" }}>
        <ActivityIndicator />
        <Text>Verificando el modo empresa…</Text>
      </View>
    );
  }

  return (
    <ScreenFallback
      title="Categorías"
      description="La administración del árbol de categorías está disponible en la experiencia nativa del modo empresa."
    />
  );
};

export default CategoriasScreen;