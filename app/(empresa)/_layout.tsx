import { Stack } from 'expo-router';

export default function EmpresaLayout() {
  return (
    <Stack initialRouteName="EmpresaNavigator" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmpresaNavigator" />
      <Stack.Screen name="PedidosPreparacion" />
      <Stack.Screen name="MisTiendas" />
      <Stack.Screen name="TiendaDetail" />
      <Stack.Screen name="ProductoForm" />
      <Stack.Screen name="Mensaje" />
      <Stack.Screen name="User" />
    </Stack>
  );
}
