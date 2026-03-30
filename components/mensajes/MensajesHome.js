import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const MensajesHome = () => (
  <ScreenFallback
    title="Conversación"
    legacyPath="components/mensajes/MensajesHome.js"
    description="Vista de conversación disponible en nativo mediante la variante .native.js y con fallback seguro para web."
  />
);

export default MensajesHome;
