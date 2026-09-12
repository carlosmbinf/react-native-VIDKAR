import ScreenFallback from "../shared/ScreenFallback";

const VentasLegacyList = () => (
  <ScreenFallback
    title="Ventas Legacy"
    legacyPath="components/ventas/VentasLegacyList.js"
    description="La pantalla histórica de ventas directas está implementada en la variante nativa para Expo y este fallback se mantiene para web y previews sin Meteor nativo."
  />
);

export default VentasLegacyList;
