import ScreenFallback from "../../shared/ScreenFallback";

const MapaUsuariosScreen = () => (
  <ScreenFallback
    title="Mapa de usuarios"
    legacyPath="components/comercio/maps/MapaUsuariosScreen.jsx"
    description="Ruta privada para visualizar la distribución geográfica de usuarios con coordenadas, alineada con el módulo legacy y reservada al entorno nativo de Expo."
  />
);

export default MapaUsuariosScreen;
