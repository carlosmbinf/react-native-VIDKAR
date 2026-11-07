import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: "CadeteNavigator" };

export default function CadeteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CadeteNavigator" />
      <Stack.Screen name="CadeteDeliveryHistory" />
      <Stack.Screen name="SaldosPagos" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="HomePedidosComercio" />
    </Stack>
  );
}
