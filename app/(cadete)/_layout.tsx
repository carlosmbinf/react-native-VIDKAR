import { Stack } from 'expo-router';

export default function CadeteLayout() {
  return (
    <Stack initialRouteName="CadeteNavigator" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CadeteNavigator" />
      <Stack.Screen name="CadeteDeliveryHistory" />
      <Stack.Screen name="SaldosPagos" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="HomePedidosComercio" />
    </Stack>
  );
}
