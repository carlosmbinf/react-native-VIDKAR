import { Alert } from "react-native";

export const confirmCadeteLocationDisclosure = () =>
  new Promise((resolve) => {
    Alert.alert(
      "Ubicación para el modo cadete",
      "VIDKAR recopila y envía tu ubicación precisa a sus servidores para mantenerte disponible en la cola de tiendas cercanas y asignarte pedidos, incluso cuando la app está cerrada o no se está usando. Los administradores de VIDKAR pueden consultar tu ubicación.\n\nAl activar el modo cadete se comprueba tu ubicación y el seguimiento continúa mientras esté activo. Puedes detenerlo saliendo de ese modo o retirando el permiso en los ajustes del dispositivo.",
      [
        { text: "Ahora no", style: "cancel", onPress: () => resolve(false) },
        { text: "Continuar", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
