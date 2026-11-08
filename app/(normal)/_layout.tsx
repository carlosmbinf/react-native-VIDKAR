import { Stack } from "expo-router";
import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";

export const unstable_settings = { initialRouteName: "Main" };

export default function NormalLayout() {
  const reducedMotion = useSystemReducedMotion();
  const cinemaOptions = {
    animation: reducedMotion ? "none" : "slide_from_right",
    animationDuration: 300,
    gestureEnabled: true,
  } as const;

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      screenListeners={({ route, navigation }) => ({
        transitionStart: (event) => {
          if (!__DEV__ || !["PeliculaDetalle", "CubacelOferta", "ProductoComercio"].includes(route.name)) {
            return;
          }
          const params = route.params as Record<string, unknown> | undefined;
          const state = navigation.getState();
          const destinationIndex = state.routes.findIndex((entry) => entry.key === route.key);
          console.info("[CatalogImageZoom]", {
            destination: route.name,
            origin: destinationIndex > 0 ? state.routes[destinationIndex - 1]?.name : null,
            closing: event.data.closing,
            hasImageSource: typeof params?.__internal_expo_router_zoom_transition_source_id === "string",
            matchesDestination: params?.__internal_expo_router_zoom_transition_screen_id === route.key,
          });
        },
      })}
    >
      <Stack.Screen name="Main" />
      <Stack.Screen name="User" />
      <Stack.Screen name="UserServices" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="UserCommerceCategories" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="GlobalCommerceCategories" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MCPSettings" />
      <Stack.Screen name="UserLogsTimeline" />
      <Stack.Screen name="UserPushTokens" />
      <Stack.Screen name="PushTokens" />
      <Stack.Screen name="CampanasOfertas" />
      <Stack.Screen name="PeliculasVideos" options={cinemaOptions} />
      <Stack.Screen name="PeliculaPlayer" />
      <Stack.Screen name="PeliculaDetalle" options={cinemaOptions} />
      <Stack.Screen name="Series" />
      <Stack.Screen name="SeriesDetail" options={cinemaOptions} />
      <Stack.Screen name="SeriesPlayer" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Cinema" options={cinemaOptions} />
      <Stack.Screen name="Cursos" />
      <Stack.Screen name="CursoDetalle" />
      <Stack.Screen name="GestionCursos" />
      <Stack.Screen name="EvaluacionesIA" />
      <Stack.Screen name="GananciasCursos" />
      <Stack.Screen name="LiquidacionesAdmin" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="EmpresaWelcome" />
      <Stack.Screen name="ProductosCubacelCards" />
      <Stack.Screen name="CubacelOferta" />
      <Stack.Screen name="ProductoComercio" />
      <Stack.Screen name="ProxyPackages" />
      <Stack.Screen name="ProxyPurchase" />
      <Stack.Screen name="VPNPackages" />
      <Stack.Screen name="VPNPurchase" />
      <Stack.Screen name="ProxyVPNHistory" />
      <Stack.Screen name="Dashboard" />
      <Stack.Screen name="Users" />
      <Stack.Screen name="NotificacionUsersConnectionVPN" />
      <Stack.Screen name="Precios" />
      <Stack.Screen name="HlsAdmin" />
      <Stack.Screen name="CommerceProvisioning" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ListaArchivos" />
      <Stack.Screen name="CreateUsers" />
      <Stack.Screen name="Logs" />
      <Stack.Screen name="Excepciones" />
      <Stack.Screen name="ComerciosList" />
      <Stack.Screen name="remesas" />
      <Stack.Screen name="ListaPropertys" />
      <Stack.Screen name="MapaUsuarios" />
      <Stack.Screen name="PedidosComerciosList" />
      <Stack.Screen name="Servidores" />
      <Stack.Screen name="Mensajes" />
      <Stack.Screen name="Mensaje" />
      <Stack.Screen name="SiriSearch" />
      <Stack.Screen name="Ventas" />
      <Stack.Screen name="VentasLegacy" />
      <Stack.Screen name="MisCompras" />
      <Stack.Screen name="EvidenciasPendientes" />
      <Stack.Screen name="CentroAntifraude" />
      <Stack.Screen name="PropertyList" />
    </Stack>
  );
}
