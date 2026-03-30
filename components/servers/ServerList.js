import ScreenFallback from "../shared/ScreenFallback";

const ServerList = () => (
  <ScreenFallback
    title="Servidores"
    legacyPath="components/servers/ServerList.js"
    description="La gestion de servidores esta implementada en la variante nativa para Expo y este fallback se mantiene para web y previews sin Meteor nativo."
  />
);

export default ServerList;
