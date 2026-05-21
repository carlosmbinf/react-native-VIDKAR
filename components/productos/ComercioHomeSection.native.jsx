import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Searchbar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import {
    getCachedDeviceLocationSync,
    getCurrentDeviceLocation,
    readCachedDeviceLocation,
    requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";
import {
    ProductosComercioCollection,
    TiendasComercioCollection,
} from "../collections/collections";
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

const RADIO_OPTIONS = [
  { label: "3 km", value: 3 },
  { label: "5 km", value: 5 },
  { label: "7 km", value: 7 },
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

const getPalette = (isDarkMode) => ({
  actionBorder: isDarkMode ? "rgba(125, 211, 252, 0.34)" : "rgba(37, 99, 235, 0.22)",
  actionText: isDarkMode ? "#dbeafe" : "#1d4ed8",
  card: isDarkMode ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.92)",
  chip: isDarkMode ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.1)",
  chipSelected: isDarkMode ? "rgba(34, 197, 94, 0.24)" : "rgba(22, 163, 74, 0.12)",
  copy: isDarkMode ? "#cbd5e1" : "#475569",
  icon: isDarkMode ? "#bbf7d0" : "#15803d",
  search: isDarkMode ? "rgba(2, 6, 23, 0.72)" : "rgba(248, 250, 252, 0.96)",
  subtitle: isDarkMode ? "#94a3b8" : "#64748b",
  title: isDarkMode ? "#f8fafc" : "#0f172a",
});

const ComercioHomeSection = ({ deferDelay = 120 }) => {
  const router = useRouter();
  const theme = useTheme();
  const palette = getPalette(theme.dark);
  const dataReady = useDeferredScreenData({
    delay: deferDelay,
    keepReadyOnBlur: true,
  });
  const initialCachedLocationRef = useRef(getCachedDeviceLocationSync());
  const radioKmRef = useRef(5);
  const lastSearchSignatureRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(initialCachedLocationRef.current);
  const [locationError, setLocationError] = useState(null);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [radioKm, setRadioKm] = useState(5);

  const actualizarUbicacionBackend = React.useCallback((ubicacion) => {
    const userId = Meteor.userId();

    if (!userId || !ubicacion) {
      return;
    }

    Meteor.call("cadete.updateLocation", {
      userId,
      cordenadas: {
        accuracy: ubicacion.accuracy,
        altitude: ubicacion.altitude || null,
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        timestamp: ubicacion.timestamp,
      },
    });
  }, []);

  const buscarTiendasCercanas = React.useCallback(async (coordenadas, radio) => {
    if (!coordenadas) {
      return;
    }

    const resolvedRadio = typeof radio === "number" ? radio : radioKmRef.current;
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

      setTiendasCercanas(resultado?.success ? resultado.tiendas || [] : []);
    } catch (error) {
      console.warn(
        "[ComercioHomeSection] No se pudieron cargar tiendas cercanas:",
        error?.reason || error?.message,
      );
      lastSearchSignatureRef.current = null;
      setTiendasCercanas([]);
    } finally {
      setLoadingTiendas(false);
    }
  }, []);

  const aplicarUbicacion = React.useCallback(
    (ubicacion, { updateBackend = false } = {}) => {
      if (!ubicacion) {
        return;
      }

      setUserLocation(ubicacion);
      setLocationError(null);

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
      if (cachedLocation) {
        aplicarUbicacion(cachedLocation, { updateBackend: false });
      }

      const permission = await requestDeviceLocationPermission();
      if (permission.status !== "granted") {
        if (!cachedLocation) {
          setLocationError("Activa la ubicación para ver comercios cercanos.");
        }
        return;
      }

      const ubicacion = await getCurrentDeviceLocation({
        accuracy: Location.Accuracy.High,
      });
      aplicarUbicacion(ubicacion, { updateBackend: true });
    } catch (error) {
      if (cachedLocation) {
        return;
      }

      setLocationError(error?.message || "No pudimos obtener tu ubicación.");
    }
  }, [aplicarUbicacion]);

  React.useEffect(() => {
    if (!dataReady) {
      return;
    }

    if (initialCachedLocationRef.current) {
      aplicarUbicacion(initialCachedLocationRef.current, {
        updateBackend: false,
      });
    }

    obtenerUbicacion();
  }, [aplicarUbicacion, dataReady, obtenerUbicacion]);

  React.useEffect(() => {
    radioKmRef.current = radioKm;
  }, [radioKm]);

  const cambiarRadio = (nuevoRadio) => {
    setRadioKm(nuevoRadio);

    if (!userLocation) {
      return;
    }

    lastSearchSignatureRef.current = null;
    buscarTiendasCercanas(userLocation, nuevoRadio);
  };

  const { loading, tiendasConProductos } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, tiendasConProductos: [] };
    }

    const tiendasIds =
      tiendasCercanas.length > 0
        ? tiendasCercanas.map((tienda) => tienda._id).filter(Boolean)
        : [];

    if (tiendasIds.length === 0) {
      return { loading: loadingTiendas, tiendasConProductos: [] };
    }

    const tiendasQuery = { _id: { $in: tiendasIds } };
    const productosQuery = { idTienda: { $in: tiendasIds } };
    const subTiendas = Meteor.subscribe("tiendas", tiendasQuery, {
      fields: TIENDAS_CLIENT_FIELDS,
    });
    const subProductos = Meteor.subscribe("productosComercio", productosQuery, {
      fields: PRODUCTOS_COMERCIO_FIELDS,
    });

    if (!subTiendas.ready() || !subProductos.ready()) {
      return { loading: true, tiendasConProductos: [] };
    }

    const tiendas = TiendasComercioCollection.find(tiendasQuery, {
      fields: TIENDAS_CLIENT_FIELDS,
      sort: { title: 1 },
    }).fetch();
    const tiendasMap = new Map(tiendasCercanas.map((tienda) => [tienda._id, tienda]));

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
  }, [dataReady, loadingTiendas, tiendasCercanas]);

  const tiendasFiltradas = useMemo(() => {
    const tiendas = Array.isArray(tiendasConProductos) ? tiendasConProductos : [];
    const orderedTiendas = tiendas.some((tienda) => tienda.distancia !== undefined)
      ? [...tiendas].sort((a, b) => {
          if (a.distancia === undefined) return 1;
          if (b.distancia === undefined) return -1;
          return a.distancia - b.distancia;
        })
      : tiendas;

    if (!searchQuery.trim()) {
      return orderedTiendas;
    }

    const query = searchQuery.toLowerCase();
    return orderedTiendas.filter((tienda) => {
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
  }, [searchQuery, tiendasConProductos]);

  const visibleTiendas = tiendasFiltradas.slice(0, 4);
  const isLoading = loading || loadingTiendas;

  return (
    <Surface elevation={0} style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.eyebrowRow}>
            <MaterialCommunityIcons
              name="storefront-outline"
              color={palette.icon}
              size={18}
            />
            <Text variant="labelLarge" style={[styles.eyebrow, { color: palette.icon }]}>Comercios VidKar</Text>
          </View>
          <Text variant="titleLarge" style={[styles.title, { color: palette.title }]}>Tiendas y productos cerca de ti</Text>
          <Text variant="bodySmall" style={[styles.subtitle, { color: palette.subtitle }]}>Compra en comercios disponibles y agrega productos al carrito sin salir del inicio.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(normal)/ComerciosList")}
          style={({ pressed }) => [
            styles.openButton,
            { borderColor: palette.actionBorder },
            pressed ? styles.openButtonPressed : null,
          ]}
        >
          <Text variant="labelLarge" style={[styles.openButtonText, { color: palette.actionText }]}>Abrir</Text>
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <Searchbar
          icon="magnify"
          clearIcon="close"
          placeholder="Buscar comercio o producto"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchbar, { backgroundColor: palette.search }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.radioRow}>
          {RADIO_OPTIONS.map((option) => {
            const selected = option.value === radioKm;
            return (
              <Chip
                key={option.value}
                compact
                selected={selected}
                onPress={() => cambiarRadio(option.value)}
                style={[
                  styles.radioChip,
                  { backgroundColor: selected ? palette.chipSelected : palette.chip },
                ]}
              >
                {option.label}
              </Chip>
            );
          })}
        </View>

        <Chip compact icon="store-search-outline" style={[styles.countChip, { backgroundColor: palette.chip }]}>
          {isLoading ? "Buscando" : `${tiendasFiltradas.length} tienda${tiendasFiltradas.length === 1 ? "" : "s"}`}
        </Chip>
      </View>

      {locationError ? (
        <View style={styles.inlineNotice}>
          <Text variant="bodySmall" style={[styles.noticeText, { color: palette.copy }]}>{locationError}</Text>
          <Button compact mode="text" onPress={() => Linking.openSettings()}>Permisos</Button>
        </View>
      ) : null}

      {isLoading && visibleTiendas.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator animating size="small" />
          <Text variant="bodySmall" style={[styles.loadingText, { color: palette.copy }]}>Buscando comercios cercanos...</Text>
        </View>
      ) : visibleTiendas.length > 0 ? (
        <View style={styles.tiendasList}>
          {visibleTiendas.map((tienda) => (
            <TiendaCard
              key={tienda._id}
              searchQuery={searchQuery}
              tienda={tienda}
              userLocation={userLocation}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text variant="titleSmall" style={[styles.emptyTitle, { color: palette.title }]}>
            {userLocation ? "No hay comercios cerca" : "Ubicación pendiente"}
          </Text>
          <Text variant="bodySmall" style={[styles.emptyCopy, { color: palette.copy }]}> 
            {userLocation
              ? "Prueba ampliando el radio o abre el listado completo para actualizar la búsqueda."
              : "Activa tu ubicación para encontrar tiendas disponibles en tu zona."}
          </Text>
          <Button mode="contained-tonal" onPress={obtenerUbicacion} style={styles.emptyButton}>
            Actualizar ubicación
          </Button>
        </View>
      )}

      <View style={styles.footerRow}>
        <Button
          compact
          icon="receipt-text-outline"
          mode="outlined"
          onPress={() => router.push("/(normal)/PedidosComerciosList")}
          style={styles.footerButton}
        >
          Mis compras
        </Button>
        <Button
          compact
          icon="store-search"
          mode="contained-tonal"
          onPress={() => router.push("/(normal)/ComerciosList")}
          style={styles.footerButton}
        >
          Ver más
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  controlsRow: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  countChip: {
    alignSelf: "flex-start",
  },
  emptyButton: {
    marginTop: 12,
  },
  emptyCopy: {
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  emptyTitle: {
    fontWeight: "800",
  },
  eyebrow: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  footerButton: {
    flexGrow: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  inlineNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 10,
  },
  loadingState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    textAlign: "center",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  noticeText: {
    flex: 1,
    lineHeight: 18,
  },
  openButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  openButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  openButtonText: {
    fontWeight: "800",
  },
  radioChip: {
    borderRadius: 999,
  },
  radioRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchbar: {
    borderRadius: 18,
    elevation: 0,
  },
  searchInput: {
    minHeight: 42,
  },
  section: {
    backgroundColor: "transparent",
    marginTop: 20,
    width: "100%",
  },
  subtitle: {
    lineHeight: 18,
  },
  tiendasList: {
    gap: 14,
    marginTop: 12,
  },
  title: {
    fontWeight: "900",
    letterSpacing: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
});

export default ComercioHomeSection;
