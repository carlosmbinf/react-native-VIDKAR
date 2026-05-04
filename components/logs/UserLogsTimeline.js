import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const UserLogsTimeline = () => (
  <ScreenFallback
    title="Línea de tiempo de logs"
    legacyPath="components/logs/UserLogsTimeline"
    description="La vista nativa muestra una línea de tiempo profesional con los logs filtrados por usuario y ordenados por fecha."
  />
);

export default UserLogsTimeline;
