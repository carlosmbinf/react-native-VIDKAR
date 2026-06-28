import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const CadeteDeliveryHistoryScreen = () => (
  <ScreenFallback
    description="Historial de entregas del cadete. La implementación real está disponible en iOS y Android."
    legacyPath="components/cadete/CadeteDeliveryHistoryScreen.native.jsx"
    title="Historial cadete"
  />
);

export default CadeteDeliveryHistoryScreen;
