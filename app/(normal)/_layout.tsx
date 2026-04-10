import { Stack } from "expo-router";

export default function NormalLayout() {
  return (
    <Stack initialRouteName="Main" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" />
      <Stack.Screen name="User" />
      <Stack.Screen name="UserPushTokens" />
      <Stack.Screen name="PeliculasVideos" />
      <Stack.Screen name="ProductosCubacelCards" />
      <Stack.Screen name="CubacelOferta" />
      <Stack.Screen name="ProxyPackages" />
      <Stack.Screen name="ProxyPurchase" />
      <Stack.Screen name="VPNPackages" />
      <Stack.Screen name="VPNPurchase" />
      <Stack.Screen name="ProxyVPNHistory" />
      <Stack.Screen name="Dashboard" />
      <Stack.Screen name="Users" />
      <Stack.Screen name="ListaArchivos" />
      <Stack.Screen name="CreateUsers" />
      <Stack.Screen name="Logs" />
      <Stack.Screen name="ComerciosList" />
      <Stack.Screen name="remesas" />
      <Stack.Screen name="ListaPropertys" />
      <Stack.Screen name="MapaUsuarios" />
      <Stack.Screen name="PedidosComerciosList" />
      <Stack.Screen name="Servidores" />
      <Stack.Screen name="Mensajes" />
      <Stack.Screen name="Mensaje" />
      <Stack.Screen name="Ventas" />
      <Stack.Screen name="PropertyList" />
    </Stack>
  );
}
