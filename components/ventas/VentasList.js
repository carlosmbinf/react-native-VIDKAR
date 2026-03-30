import ScreenFallback from "../shared/ScreenFallback";

const VentasList = () => (
  <ScreenFallback
    title="Ventas"
    legacyPath="components/ventas/VentasList.js"
    description="La pantalla de ventas está implementada en la variante nativa para Expo y este fallback se mantiene para web y previews sin Meteor nativo."
  />
);

export default VentasList;
