import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";

const COMMERCE_LOCATION_CONSENT_KEY = "commerce.location.disclosure.v1";
const COMMERCE_LOCATION_CONSENT_VALUE = "accepted";

export async function confirmCommerceLocationDisclosure() {
  const savedConsent = await SecureStore.getItemAsync(
    COMMERCE_LOCATION_CONSENT_KEY,
  );
  if (savedConsent === COMMERCE_LOCATION_CONSENT_VALUE) {
    return true;
  }

  const accepted = await new Promise((resolve) => {
    Alert.alert(
      "Ubicación para comercios",
      "VIDKAR usará tu ubicación precisa (coordenadas y precisión del dispositivo) para encontrar tiendas dentro del radio elegido y ordenarlas por distancia. Las coordenadas se envían a los servidores de VIDKAR para la búsqueda; la última ubicación también se asocia a tu cuenta para funciones de entrega y se guarda en el dispositivo para mantener resultados aproximados. Comercios no activa seguimiento en segundo plano. Si no continúas, no accederemos a tu ubicación para esta búsqueda y no verás tiendas cercanas.",
      [
        {
          text: "No permitir",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Continuar",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  if (!accepted) {
    return false;
  }

  await SecureStore.setItemAsync(
    COMMERCE_LOCATION_CONSENT_KEY,
    COMMERCE_LOCATION_CONSENT_VALUE,
  );
  return true;
}
