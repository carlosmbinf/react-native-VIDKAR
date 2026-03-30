import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const DashboardScreen = () => (
  <ScreenFallback
    description="Pantalla dashboard migrada en nativo Expo con el mismo contrato de datos del legacy."
    legacyPath="components/dashboard/DashBoardPrincipal.js"
    title="Dashboard"
  />
);

export default DashboardScreen;
