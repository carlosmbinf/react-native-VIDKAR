import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const LogsList = () => (
  <ScreenFallback
    title="Registro de logs"
    legacyPath="components/logs/LogsList.js"
    description="Ruta administrativa para auditar eventos operativos, técnicos y de usuarios."
  />
);

export default LogsList;
