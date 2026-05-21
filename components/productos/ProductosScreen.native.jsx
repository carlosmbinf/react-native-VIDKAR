import MeteorBase from "@meteorrn/core";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    AppState,
    FlatList,
    Linking,
    Platform,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Appbar,
    Button,
    Chip,
    FAB,
    Menu,
    Searchbar,
    Surface,
    Text,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import {
    getCachedDeviceLocationSync,
    getCurrentDeviceLocation,
    getDeviceLocationPermissionState,
    readCachedDeviceLocation,
    requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";
import WizardConStepper from "../carritoCompras/WizardConStepper.native";
import {
    ProductosComercioCollection,
    TiendasComercioCollection,
} from "../collections/collections";
import MenuIconMensajes from "../components/MenuIconMensajes.native";
import AppHeader, {
    DEFAULT_HEADER_COLOR,
    useAppHeaderContentInset,
} from "../Header/AppHeader";
import BlurMenuSurface, { blurMenuContentStyle } from "../Header/BlurMenuSurface";
import useSafeBack, { useCanNavigateBack } from "../navigation/useSafeBack";
import CommerceLocationAccessCard from "./CommerceLocationAccessCard";
import TiendaCard from "./TiendaCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PRODUCTOS_COMERCIO_FIELDS = {
  _id: 1,
  comentario: 1,
  count: 1,
  createdAt: 1,
  descripcion: 1,
  idTienda: 1,
  monedaPrecio: 1,
  name: 1,
  precio: 1,
  productoDeElaboracion: 1,
};

const TIENDAS_CLIENT_FIELDS = {
  _id: 1,
  cordenadas: 1,
  coordenadas: 1,
  createdAt: 1,
  descripcion: 1,
  pinColor: 1,
  title: 1,
};

const radioOptions = [
  { label: "1 km", value: 1, icon: "map-marker-radius" },
  { label: "3 km", value: 3, icon: "map-marker-radius" },
  { label: "5 km", value: 5, icon: "map-marker-radius" },
  { label: "7 km", value: 7, icon: "map-marker-radius" },
];

const meteorCallAsync = (methodName, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const ProductosScreenNative = () => {
  const router = useRouter();
  const canNavigateBack = useCanNavigateBack();
  const safeBack = useSafeBack("/(normal)/Main");
  const headerInset = useAppHeaderContentInset();
  const initialCachedLocationRef = React.useRef(getCachedDeviceLocationSync());
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchbar, setShowSearchbar] = useState(false);
  const [userLocation, setUserLocation] = useState(
    initialCachedLocationRef.current,
  );
  const [locationError, setLocationError] = useState(null);
  const [locationPermissionState, setLocationPermissionState] = useState(null);
  const [locationPermissionLoading, setLocationPermissionLoading] =
    useState(false);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [radioKm, setRadioKm] = useState(5);
  const [fabOpen, setFabOpen] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const radioKmRef = React.useRef(5);
  const locationPermissionRequestIdRef = React.useRef(0);
  const lastSearchSignatureRef = React.useRef(null);
  const dataReady = useDeferredScreenData();

  const refreshLocationPermissionState = React.useCallback(
    async ({ showLoading = false } = {}) => {
      const requestId = locationPermissionRequestIdRef.current + 1;
      locationPermissionRequestIdRef.current = requestId;

      if (showLoading) {
        setLocationPermissionLoading(true);
      }

      try {
        const permissionState = await getDeviceLocationPermissionState();

        if (locationPermissionRequestIdRef.current === requestId) {
          setLocationPermissionState(permissionState);
        }

        return permissionState;
      } catch (error) {
        console.warn(
          "[Productos] No se pudo leer el permiso de ubicación:",
          error?.message || error,
        );
        return null;
      } finally {
        if (showLoading && locationPermissionRequestIdRef.current === requestId) {
          setLocationPermissionLoading(false);
        }
      }
    },
    [],
  );

  const actualizarUbicacionBackend = React.useCallback((ubicacion) => {
    const userId = Meteor.userId();

    if (!userId || !ubicacion) {
      return;
    }

    Meteor.call(
      "cadete.updateLocation",
      {
        userId,
        cordenadas: {
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          accuracy: ubicacion.accuracy,
          altitude: ubicacion.altitude || null,
          timestamp: ubicacion.timestamp,
        },
      },
      (error) => {
        if (error) {
          console.warn(
            "⚠️ [Backend] Error al actualizar ubicación:",
            error.reason || error.message,
          );
        }
      },
    );
  }, []);

  const buscarTiendasCercanas = React.useCallback(
    async (coordenadas, radio) => {
      if (!coordenadas) {
        return;
      }

      const resolvedRadio =
        typeof radio === "number" ? radio : radioKmRef.current;
      const searchSignature = `${Number(coordenadas.latitude).toFixed(5)}:${Number(coordenadas.longitude).toFixed(5)}:${resolvedRadio}`;

      if (lastSearchSignatureRef.current === searchSignature) {
        return;
      }

      lastSearchSignatureRef.current = searchSignature;

      setLoadingTiendas(true);

      try {
        const resultado = await meteorCallAsync(
          "comercio.getTiendasCercanas",
          {
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
          },
          resolvedRadio,
        );

        if (resultado?.success) {
          setTiendasCercanas(resultado.tiendas || []);
        } else {
          setTiendasCercanas([]);
        }
      } catch (error) {
        console.error("❌ [Tiendas Cercanas] Error al buscar tiendas:", {
          details: error.details,
          error: error.message,
          reason: error.reason,
        });

        lastSearchSignatureRef.current = null;

        Alert.alert(
          "Error al buscar tiendas",
          error.reason ||
            "No se pudieron cargar las tiendas cercanas. Por favor, intenta de nuevo.",
          [{ text: "OK" }],
        );
        setTiendasCercanas([]);
      } finally {
        setLoadingTiendas(false);
      }
    },
    [],
  );

  const aplicarUbicacion = React.useCallback(
    (ubicacion, { updateBackend = false, clearError = true } = {}) => {
      if (!ubicacion) {
        return;
      }

      setUserLocation(ubicacion);
      if (clearError) {
        setLocationError(null);
      }

      if (updateBackend) {
        actualizarUbicacionBackend(ubicacion);
      }

      buscarTiendasCercanas(ubicacion, radioKmRef.current);
    },
    [actualizarUbicacionBackend, buscarTiendasCercanas],
  );

  const obtenerUbicacion = React.useCallback(async () => {
    let cachedLocation = null;

    try {
      cachedLocation = await readCachedDeviceLocation();

      const permission = await requestDeviceLocationPermission();
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      const nextPermissionState = {
        canAskAgain: permission?.canAskAgain !== false,
        granted: permission?.status === "granted" || permission?.granted === true,
        servicesEnabled,
        status: permission?.status || "undetermined",
      };

      setLocationPermissionState(nextPermissionState);

      if (cachedLocation) {
        aplicarUbicacion(cachedLocation, {
          clearError: servicesEnabled,
          updateBackend: false,
        });
      }

      if (!servicesEnabled) {
        setLocationError("La ubicación del dispositivo está apagada");
        return;
      }

      if (permission.status !== "granted") {
        setLocationError("La ubicación está desactivada para Vidkar");

        Alert.alert(
          "📍 Permiso de Ubicación Requerido",
          "Para mostrarte comercios cercanos, necesitamos acceso a tu ubicación. Por favor, activa el permiso de ubicación en la configuración de tu dispositivo.",
          [
            {
              style: "cancel",
              text: "Cancelar",
            },
            {
              onPress: () => Linking.openSettings(),
              text: "Ir a Configuración",
            },
            {
              onPress: () => {
                setTimeout(() => {
                  obtenerUbicacion();
                }, 500);
              },
              text: "Reintentar",
            },
          ],
        );
        return;
      }

      const ubicacion = await getCurrentDeviceLocation({
        accuracy: Location.Accuracy.High,
      });
      aplicarUbicacion(ubicacion, { updateBackend: true });
    } catch (error) {
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
        () => true,
      );
      const locationMessage =
        !servicesEnabled
          ? "La ubicación del dispositivo está apagada"
          : error?.code === "E_LOCATION_TIMEOUT"
            ? "Tiempo de espera agotado"
            : error?.message || "Error desconocido";

      if (!servicesEnabled) {
        setLocationPermissionState((current) => ({
          canAskAgain: current?.canAskAgain !== false,
          granted: current?.granted === true,
          status: current?.status || "undetermined",
          ...current,
          servicesEnabled: false,
        }));
      }

      if (cachedLocation && servicesEnabled) {
        console.warn(
          "⚠️ [Productos] No se pudo actualizar la ubicación actual. Se mantiene la última ubicación guardada:",
          locationMessage,
        );
        return;
      }

      setLocationError(locationMessage);

      if (!servicesEnabled) {
        Alert.alert(
          "Ubicación apagada",
          "Activa la ubicación del dispositivo para poder buscar las tiendas cercanas de Vidkar.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir configuración", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      const fallbackMessage =
        error?.code === "E_LOCATION_TIMEOUT"
          ? "Tiempo de espera agotado"
          : error?.message || "Error desconocido";

      Alert.alert(
        "Error de Ubicación",
        `${fallbackMessage}. Las tiendas se mostrarán sin ordenar por distancia.`,
        [{ text: "OK" }],
      );
    }
  }, [aplicarUbicacion]);

  React.useEffect(() => {
    refreshLocationPermissionState();

    if (initialCachedLocationRef.current) {
      aplicarUbicacion(initialCachedLocationRef.current, {
        clearError: false,
        updateBackend: false,
      });
    }

    obtenerUbicacion();
  }, [aplicarUbicacion, obtenerUbicacion, refreshLocationPermissionState]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active") {
        return;
      }

      const permissionState = await refreshLocationPermissionState();

      if (permissionState?.servicesEnabled === false) {
        setLocationError("La ubicación del dispositivo está apagada");
        return;
      }

      if (permissionState?.granted === false) {
        setLocationError("La ubicación está desactivada para Vidkar");
        return;
      }

      if (permissionState?.granted && (!userLocation || locationError)) {
        obtenerUbicacion();
      }
    });

    return () => subscription.remove();
  }, [locationError, obtenerUbicacion, refreshLocationPermissionState, userLocation]);

  React.useEffect(() => {
    radioKmRef.current = radioKm;
  }, [radioKm]);

  const cambiarRadio = React.useCallback(
    (nuevoRadio) => {
      setRadioKm(nuevoRadio);

      if (
        userLocation &&
        locationPermissionState?.servicesEnabled !== false &&
        locationPermissionState?.granted !== false
      ) {
        lastSearchSignatureRef.current = null;
        buscarTiendasCercanas(userLocation, nuevoRadio);
        return;
      }

      Alert.alert(
        "Ubicación no disponible",
        "Primero necesitamos obtener tu ubicación. Por favor, activa el GPS.",
        [
          { style: "cancel", text: "Cancelar" },
          { onPress: obtenerUbicacion, text: "Obtener Ubicación" },
        ],
      );
    },
    [buscarTiendasCercanas, locationPermissionState, obtenerUbicacion, userLocation],
  );

  const { tiendasConProductos } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, tiendasConProductos: [] };
    }

    const subProductos = Meteor.subscribe("productosComercio", {}, {
      fields: PRODUCTOS_COMERCIO_FIELDS,
    });
    const tiendasIds =
      tiendasCercanas.length > 0
        ? tiendasCercanas.map((tienda) => tienda._id)
        : null;

    if (!tiendasIds) {
      return { loading: false, tiendasConProductos: [] };
    }

    const query = { _id: { $in: tiendasIds } };
    const subTiendas = Meteor.subscribe("tiendas", query, {
      fields: TIENDAS_CLIENT_FIELDS,
    });

    if (!subTiendas.ready() || !subProductos.ready()) {
      return { loading: true, tiendasConProductos: [] };
    }

    const tiendas = TiendasComercioCollection.find(query, {
      fields: TIENDAS_CLIENT_FIELDS,
      sort: { title: 1 },
    }).fetch();

    const tiendasMap = new Map(
      tiendasCercanas.map((tienda) => [tienda._id, tienda]),
    );

    const mappedTiendas = tiendas
      .map((tienda) => {
        const productos = ProductosComercioCollection.find(
          { idTienda: tienda._id },
          { fields: PRODUCTOS_COMERCIO_FIELDS, sort: { name: 1 } },
        ).fetch();
        const tiendaCercana = tiendasMap.get(tienda._id);

        return {
          ...tienda,
          coordenadas: tienda.coordenadas || tiendaCercana?.coordenadas || null,
          distancia: tiendaCercana?.distancia,
          distanciaFormateada: tiendaCercana?.distanciaFormateada,
          productos,
          productosDisponibles: productos.filter((producto) =>
            !producto.productoDeElaboracion ? producto.count > 0 : true,
          ).length,
          totalProductos: productos.length,
        };
      })
      .filter((tienda) => tienda.totalProductos > 0);

    return {
      loading: false,
      tiendasConProductos: mappedTiendas,
    };
  }, [dataReady, tiendasCercanas]);

  const tiendasDisponibles = tiendasConProductos;
  const locationPermissionBlocked =
    locationPermissionState?.granted === false &&
    locationPermissionState?.canAskAgain === false;
  const locationServicesDisabled = locationPermissionState?.servicesEnabled === false;
  const locationPermissionDenied = locationPermissionState?.granted === false;
  const locationUnavailable = locationServicesDisabled || locationPermissionDenied;
  const showLocationAccessCard =
    locationUnavailable ||
    Boolean(locationError) ||
    (!userLocation && locationPermissionState?.granted === false);

  const tiendasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) {
      if (tiendasDisponibles.some((tienda) => tienda.distancia !== undefined)) {
        return [...tiendasDisponibles].sort((a, b) => {
          if (a.distancia === undefined) return 1;
          if (b.distancia === undefined) return -1;
          return a.distancia - b.distancia;
        });
      }

      return tiendasDisponibles;
    }

    const query = searchQuery.toLowerCase();
    const filtradas = tiendasDisponibles.filter((tienda) => {
      const matchTienda =
        tienda.title?.toLowerCase().includes(query) ||
        tienda.descripcion?.toLowerCase().includes(query);
      const matchProducto = tienda.productos?.some(
        (producto) =>
          producto.name?.toLowerCase().includes(query) ||
          producto.descripcion?.toLowerCase().includes(query),
      );

      return matchTienda || matchProducto;
    });

    if (filtradas.some((tienda) => tienda.distancia !== undefined)) {
      return filtradas.sort((a, b) => {
        if (a.distancia === undefined) return 1;
        if (b.distancia === undefined) return -1;
        return a.distancia - b.distancia;
      });
    }

    return filtradas;
  }, [searchQuery, tiendasDisponibles]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await obtenerUbicacion();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [obtenerUbicacion]);

  const listHeaderComponent = useMemo(
    () => (
      <>
        {showLocationAccessCard ? (
          <CommerceLocationAccessCard
            blocked={locationPermissionBlocked}
            loading={locationPermissionLoading}
            onOpenSettings={() => Linking.openSettings()}
            onRequestLocation={obtenerUbicacion}
            style={styles.locationAccessCard}
          />
        ) : null}

        {loadingTiendas ? (
          <View style={styles.loadingTiendasContainer}>
            <ActivityIndicator color="#3f51b5" size="small" />
            <Text style={styles.loadingTiendasText}>
              Buscando tiendas cercanas...
            </Text>
          </View>
        ) : null}

        {userLocation ? (
          <View style={styles.locationInfo}>
            <Chip
              icon={locationUnavailable ? "map-marker-alert" : "map-marker-check"}
              mode="flat"
              style={styles.locationChip}
              textStyle={styles.locationChipText}
            >
              {locationUnavailable
                ? `📍 Resultados aproximados en ${radioKm} km`
                : `📍 Mostrando tiendas en ${radioKm} km`}
            </Chip>
            <Chip
              icon="map"
              mode="outlined"
              style={styles.countChip}
              textStyle={styles.locationChipText}
            >
              {tiendasDisponibles.length} tienda
              {tiendasDisponibles.length !== 1 ? "s" : ""}
            </Chip>
          </View>
        ) : null}

        <View style={styles.pedidosBannerContent}>
          <Button
            contentStyle={styles.pedidosBannerButtonContent}
            icon="arrow-right"
            labelStyle={styles.pedidosBannerButtonLabel}
            mode="outlined"
            onPress={() => router.push("/(normal)/PedidosComerciosList")}
            style={styles.pedidosBannerButton}
          >
            Ver listado de compras
          </Button>
        </View>
      </>
    ),
    [
      loadingTiendas,
      locationPermissionBlocked,
      locationPermissionLoading,
      locationUnavailable,
      obtenerUbicacion,
      radioKm,
      router,
      showLocationAccessCard,
      tiendasDisponibles.length,
      userLocation,
    ],
  );

  const listEmptyComponent = useMemo(
    () => (
      <Surface elevation={1} style={styles.emptyState}>
        <Text style={styles.emptyIcon}>
          {loadingTiendas
            ? "⏳"
            : locationUnavailable
              ? "📍"
              : locationError
              ? "📍"
              : searchQuery.trim()
                ? "🔍"
                : "🏪"}
        </Text>
        <Text style={styles.emptyTitle} variant="titleMedium">
          {loadingTiendas
            ? "Buscando tiendas..."
            : locationUnavailable
                ? "Ubicación apagada"
                : locationError
                  ? "Sin ubicación disponible"
              : searchQuery.trim()
                ? "No se encontraron resultados"
                : userLocation
                  ? `No hay tiendas en ${radioKm} km`
                  : "Activando ubicación..."}
        </Text>
        <Text style={styles.emptySubtitle} variant="bodyMedium">
          {loadingTiendas
            ? "Por favor espera..."
            : locationUnavailable
              ? "Activa la ubicación para Vidkar desde los ajustes del dispositivo para encontrar tiendas cercanas."
                : locationError
                  ? `${locationError}. Activa el GPS para ver tiendas cercanas.`
              : searchQuery.trim()
                ? "Intenta con otros términos de búsqueda"
                : userLocation
                  ? "Intenta aumentar el radio de búsqueda o muévete a otra zona"
                  : "Obteniendo tu ubicación..."}
        </Text>
      </Surface>
    ),
    [loadingTiendas, locationError, locationUnavailable, radioKm, searchQuery, userLocation],
  );

  const renderTiendaItem = React.useCallback(
    ({ index, item }) => (
      <TiendaCard
        index={index}
        searchQuery={searchQuery}
        tienda={item}
        userLocation={userLocation}
      />
    ),
    [searchQuery, userLocation],
  );

  return (
    <Surface style={styles.container}>
      <AppHeader
        backgroundColor={DEFAULT_HEADER_COLOR}
        left={
          canNavigateBack ? (
            <Appbar.BackAction iconColor="white" onPress={safeBack} />
          ) : null
        }
        overlapContent
        subtitle="Tiendas cercanas y productos disponibles"
        title="Comercios"
        actions={
          <View style={styles.rightActionRow}>
            <Appbar.Action
              iconColor="white"
              icon="magnify"
              onPress={() => {
                setShowSearchbar((current) => {
                  if (current) {
                    setSearchQuery("");
                  }

                  return !current;
                });
              }}
            />
            <MenuIconMensajes
              onOpenMessages={(item) => {
                if (item) {
                  router.push(
                    `/(normal)/Mensaje?item=${encodeURIComponent(item)}`,
                  );
                  return;
                }

                router.push("/(normal)/Mensaje");
              }}
            />
            <WizardConStepper initialLocation={userLocation} />
            <Menu
              anchorPosition="bottom"
              anchor={
                <Appbar.Action
                  iconColor="white"
                  icon="dots-vertical"
                  onPress={() => setProfileMenuVisible(true)}
                />
              }
              contentStyle={styles.profileMenuContent}
              onDismiss={() => setProfileMenuVisible(false)}
              visible={profileMenuVisible}
            >
              <BlurMenuSurface>
                <Menu.Item
                  leadingIcon="account"
                  onPress={() => {
                    setProfileMenuVisible(false);
                    router.push("/(normal)/User");
                  }}
                  title="Mi usuario"
                />
                <Menu.Item
                  leadingIcon="logout"
                  onPress={() => {
                    setProfileMenuVisible(false);
                    Meteor.logout(() => {
                      router.replace("/(auth)/Loguin");
                    });
                  }}
                  title="Cerrar Sesión"
                />
              </BlurMenuSurface>
            </Menu>
          </View>
        }
      />

      {showSearchbar ? (
        <View style={[styles.header, { paddingTop: headerInset + 12 }]}>
          <Searchbar
            autoFocus
            blurOnSubmit={false}
            clearIcon="close"
            icon="magnify"
            onChangeText={setSearchQuery}
            onIconPress={() => {
              setShowSearchbar(false);
              setSearchQuery("");
            }}
            placeholder="Buscar tiendas o productos..."
            style={styles.searchbar}
            value={searchQuery}
          />

          {searchQuery.trim() ? (
            <View style={styles.resultsInfo}>
              <Chip compact icon="filter-variant" mode="outlined">
                {tiendasFiltradas.length} resultado
                {tiendasFiltradas.length !== 1 ? "s" : ""}
              </Chip>
            </View>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={<View style={styles.listFooter} />}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[
          styles.flatListContent,
          !showSearchbar && { paddingTop: headerInset + 12 },
        ]}
        data={tiendasFiltradas}
        initialNumToRender={10}
        keyExtractor={(item) => item._id}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        removeClippedSubviews={Platform.OS === "android"}
        renderItem={renderTiendaItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <FAB.Group
        actions={radioOptions.map((option) => ({
          icon: option.icon,
          label: option.label,
          labelStyle:
            radioKm === option.value ? styles.selectedFabLabel : undefined,
          onPress: () => cambiarRadio(option.value),
          small: false,
          style:
            radioKm === option.value ? styles.selectedFabAction : undefined,
        }))}
        color={userLocation ? "#fff" : "#999"}
        fabStyle={styles.fab}
        icon={userLocation ? "map-marker-radius" : "map-marker-off"}
        label={userLocation ? `${radioKm} km` : ""}
        onPress={() => {
          if (!userLocation) {
            obtenerUbicacion();
          }
        }}
        onStateChange={({ open }) => setFabOpen(open)}
        open={fabOpen}
        visible
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: "#3f51b5",
    justifyContent: "center",
  },
  appbarContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  container: {
    flex: 1,
  },
  countChip: {
    borderColor: "#3f51b5",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 40,
  },
  emptySubtitle: {
    opacity: 0.7,
    textAlign: "center",
  },
  emptyTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  fab: {
    backgroundColor: "#3f51b5",
  },
  flatListContent: {
    flexGrow: 1,
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  leftActionRow: {
    flexDirection: "row",
  },
  listFooter: {
    height: 80,
  },
  loadingTiendasContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingTiendasText: {
    color: "#666",
    fontSize: 13,
    marginLeft: 8,
  },
  locationChip: {
    backgroundColor: "rgba(63, 81, 181, 0.08)",
  },
  locationChipText: {
    fontSize: 12,
  },
  locationInfo: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationAccessCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  pedidosBannerButton: {
    borderColor: "#3f51b5",
  },
  pedidosBannerButtonContent: {
    minHeight: 42,
  },
  pedidosBannerButtonLabel: {
    fontWeight: "700",
  },
  pedidosBannerContent: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    padding: 20,
  },
  profileMenuContent: {
    ...blurMenuContentStyle,
    width: 210,
  },
  resultsInfo: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  rightActionRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  searchbar: {
    borderRadius: 12,
    elevation: 5,
  },
  selectedFabAction: {
    backgroundColor: "#e3f2fd",
  },
  selectedFabLabel: {
    color: "#3f51b5",
    fontWeight: "bold",
  },
});

export default ProductosScreenNative;
