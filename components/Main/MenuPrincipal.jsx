import { router } from "expo-router";
import React from "react";

import { getAppVersionInfo } from "../../services/app/appVersion";
import MenuPrincipalScreen from "./MenuPrincipalScreen.jsx";

const previewUser = {
  username: "Usuario Expo",
  profile: { role: "admin" },
  permiteRemesas: false,
  modoCadete: false,
};

const MenuPrincipal = () => {
  const appVersionInfo = getAppVersionInfo();

  return (
    <MenuPrincipalScreen
      user={previewUser}
      appVersion={appVersionInfo.version}
      buildNumber={appVersionInfo.buildNumber}
      onLogout={() => router.replace("/(auth)")}
    />
  );
};

export default MenuPrincipal;
