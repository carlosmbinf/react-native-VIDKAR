import { Stack } from 'expo-router';

export default function EmpresaLayout() {
  return (
    <Stack initialRouteName="EmpresaNavigator" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmpresaNavigator" />
      <Stack.Screen name="PedidosPreparacion" />
      <Stack.Screen name="MisTiendas" />
      <Stack.Screen name="TiendaDetail" />
      <Stack.Screen name="CadetesEnCola" />
      <Stack.Screen name="Categorias" />
      <Stack.Screen name="ProductoForm" />
      <Stack.Screen name="MercadoLibre" />
      <Stack.Screen name="Mensaje" />
      <Stack.Screen name="User" />
      <Stack.Screen name="UserServices" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="UserCommerceCategories" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MCPSettings" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
