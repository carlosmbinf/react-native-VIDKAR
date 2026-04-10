import ScreenFallback from "../shared/ScreenFallback";

export default function UserPushTokensScreenFallback() {
  return (
    <ScreenFallback
      title="Dispositivos push"
      legacyPath="components/users/UserPushTokensScreen.native.js"
      description="La gestión detallada de push tokens ya está disponible en la implementación nativa de Expo. Este fallback se mantiene para web y previews sin Meteor nativo."
    />
  );
}
