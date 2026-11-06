import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

export default function ProductoComercioScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <Text>El detalle de este producto está disponible en la aplicación móvil.</Text>
      <Button onPress={() => router.replace("/(normal)/Main")}>Volver</Button>
    </View>
  );
}
