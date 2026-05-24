import { router } from "expo-router";
import React from "react";

import { getAppVersionInfo } from "../../services/app/appVersion";
import MenuPrincipalScreen from "./MenuPrincipalScreen.jsx";

const previewUser = {
  username: "Usuario Expo",
  profile: { role: "admin", roleComercio: ["EMPRESA"] },
  permiteRemesas: false,
  modoCadete: false,
  modoEmpresa: false,
};

const MenuPrincipal = () => {
  const appVersionInfo = getAppVersionInfo();

  return (
    <MenuPrincipalScreen
      user={previewUser}
      appVersion={appVersionInfo.version}
      buildNumber={appVersionInfo.buildNumber}
      pendingDebt={0}
      pendingVentasCount={0}
      missingPriceServices={[]}
      priceSetupLoading={false}
      onOpenPrices={() => router.push("/(normal)/Precios")}
      onOpenPendingVentas={() => {}}
      onToggleModoEmpresa={() => {}}
      onLogout={() => router.replace("/(auth)")}
    />
  );
};

export default MenuPrincipal;
