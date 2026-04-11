import { Stack } from 'expo-router';

export default function CadeteLayout() {
  return (
    <Stack initialRouteName="CadeteNavigator" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CadeteNavigator" />
      <Stack.Screen name="HomePedidosComercio" />
    </Stack>
  );
}
