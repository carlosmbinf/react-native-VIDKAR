import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { AppState, FlatList, Linking, Pressable, StyleSheet, View } from "react-native";
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
  filterVisibleCommerceStores,
  getCommerceParentCategories,
  getRandomCommerceCategorySample,
  normalizeCommerceHomeCategories,
} from "../../services/commerceCategories";
import { buildCommerceProductQuery, COMMERCE_CATALOG_INITIAL_LIMIT } from "../../services/commerceProductCatalog";
import {
  getCurrentDeviceLocation,
  getDeviceLocationPermissionState,
  readCachedDeviceLocation,
  requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";
import { confirmCommerceLocationDisclosure } from "../../services/location/commerceLocationDisclosure.native";
import {
  CategoriasComercioCollection,
  ProductosComercioCollection,
  TiendasComercioCollection,
} from "../collections/collections";
import CommerceLocationAccessCard from "./CommerceLocationAccessCard";
import ComercioCategorySelection from "./ComercioCategorySelection.native";
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
  idCategoria: 1,
  monedaPrecio: 1,
  name: 1,
  precio: 1,
  productoDeElaboracion: 1,
};

const TIENDAS_CLIENT_FIELDS = {
  _id: 1,
  idUser: 1,
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

const HOME_STORE_PREVIEW_COUNT = 4;
const HOME_CATEGORY_PREVIEW_COUNT = 5;

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
  const radioKmRef = useRef(5);
  const locationPermissionRequestIdRef = useRef(0);
  const locationRequestInProgressRef = useRef(false);
  const lastSearchSignatureRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationPermissionState, setLocationPermissionState] = useState(null);
  const [locationPermissionLoading, setLocationPermissionLoading] = useState(false);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [storeSearchStatus, setStoreSearchStatus] = useState("idle");
  const [radioKm, setRadioKm] = useState(5);
  const [categoryRandomSeed] = useState(() => Math.random());
  const { categories, categoriesReady, preferences } = Meteor.useTracker(() => {
    if (!dataReady) return { categories: [], categoriesReady: false, preferences: [] };
    const categoriesHandle = Meteor.subscribe("categoriasComercioCatalogo");
    const userId = Meteor.userId();
    if (userId) Meteor.subscribe("user", { _id: userId }, { fields: { _id: 1, categoriasComercioInicio: 1 } });
    return {
      categories: CategoriasComercioCollection.find({ activa: { $ne: false } }, { fields: { _id: 1, creadaPor: 1, nombre: 1, idCategoriaHeredada: 1, visibleEnInicio: 1, ordenInicio: 1 } }).fetch(),
      categoriesReady: categoriesHandle.ready(),
      preferences: Meteor.user()?.categoriasComercioInicio,
    };
  }, [dataReady]);
  const visibleCategories = useMemo(() => normalizeCommerceHomeCategories(categories, preferences).filter((category) => category.visible), [categories, preferences]);
  const parentCategoryCandidates = useMemo(
    () => getCommerceParentCategories(visibleCategories),
    [visibleCategories],
  );
  const visibleCategoryIds = useMemo(
    () => visibleCategories.map((category) => category.id),
    [visibleCategories],
  );

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
          "[ComercioHomeSection] No se pudo leer el permiso de ubicación:",
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
    setStoreSearchStatus("loading");
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
        setTiendasCercanas(Array.isArray(resultado.tiendas) ? resultado.tiendas : []);
        setStoreSearchStatus("success");
      } else {
        lastSearchSignatureRef.current = null;
        setTiendasCercanas([]);
        setStoreSearchStatus("error");
      }
    } catch (error) {
      console.warn(
        "[ComercioHomeSection] No se pudieron cargar tiendas cercanas:",
        error?.reason || error?.message,
      );
      lastSearchSignatureRef.current = null;
      setTiendasCercanas([]);
      setStoreSearchStatus("error");
    } finally {
      setLoadingTiendas(false);
    }
  }, []);

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
    if (locationRequestInProgressRef.current) {
      return;
    }

    locationRequestInProgressRef.current = true;
    setLocationPermissionLoading(true);
    let cachedLocation = null;

    try {
      const disclosureAccepted = await confirmCommerceLocationDisclosure();
      if (!disclosureAccepted) {
        return;
      }

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
        setLocationError("La ubicación del dispositivo está apagada.");
        return;
      }

      if (permission.status !== "granted") {
        if (!cachedLocation) {
          setLocationError("La ubicación está desactivada para Vidkar.");
        }
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

      if (!servicesEnabled) {
        setLocationPermissionState((current) => ({
          canAskAgain: current?.canAskAgain !== false,
          granted: current?.granted === true,
          status: current?.status || "undetermined",
          ...current,
          servicesEnabled: false,
        }));
        setLocationError("La ubicación del dispositivo está apagada.");
        return;
      }

      if (cachedLocation) {
        return;
      }

      setLocationError(error?.message || "No pudimos obtener tu ubicación.");
    } finally {
      locationRequestInProgressRef.current = false;
      setLocationPermissionLoading(false);
    }
  }, [aplicarUbicacion]);

  React.useEffect(() => {
    if (!dataReady) {
      return;
    }

    refreshLocationPermissionState();
    obtenerUbicacion();
  }, [aplicarUbicacion, dataReady, obtenerUbicacion, refreshLocationPermissionState]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active" || !dataReady) {
        return;
      }

      const permissionState = await refreshLocationPermissionState();

      if (permissionState?.servicesEnabled === false) {
        setLocationError("La ubicación del dispositivo está apagada.");
        return;
      }

      if (permissionState?.granted === false) {
        setLocationError("La ubicación está desactivada para Vidkar.");
        return;
      }

      if (permissionState?.granted && (!userLocation || locationError)) {
        obtenerUbicacion();
      }
    });

    return () => subscription.remove();
  }, [dataReady, locationError, obtenerUbicacion, refreshLocationPermissionState, userLocation]);

  React.useEffect(() => {
    radioKmRef.current = radioKm;
  }, [radioKm]);

  const cambiarRadio = (nuevoRadio) => {
    setRadioKm(nuevoRadio);

    if (!userLocation || locationPermissionState?.servicesEnabled === false) {
      return;
    }

    lastSearchSignatureRef.current = null;
    buscarTiendasCercanas(userLocation, nuevoRadio);
  };

  const { catalogStores, loading, tiendasConProductos } = Meteor.useTracker(() => {
    if (!dataReady || !categoriesReady) {
      return { catalogStores: [], loading: true, tiendasConProductos: [] };
    }

    const tiendasIds = tiendasCercanas.map((tienda) => String(tienda._id)).filter(Boolean);
    if (!tiendasIds.length) {
      return { catalogStores: [], loading: loadingTiendas, tiendasConProductos: [] };
    }

    const tiendasQuery = { _id: { $in: tiendasIds } };
    const subTiendas = Meteor.subscribe("tiendas", tiendasQuery, {
      fields: TIENDAS_CLIENT_FIELDS,
    });
    const tiendas = TiendasComercioCollection.find(tiendasQuery, {
      fields: TIENDAS_CLIENT_FIELDS,
      sort: { title: 1 },
    }).fetch();
    const matchingStoreIds = debouncedSearch
      ? tiendasCercanas
        .filter((tienda) =>
          String(tienda.title || "").toLocaleLowerCase("es").includes(debouncedSearch.toLocaleLowerCase("es")) ||
          String(tienda.descripcion || "").toLocaleLowerCase("es").includes(debouncedSearch.toLocaleLowerCase("es")),
        )
        .map((tienda) => String(tienda._id))
      : [];
    const productQueries = debouncedSearch
      ? [{
          key: "search",
          query: buildCommerceProductQuery({
            limit: COMMERCE_CATALOG_INITIAL_LIMIT,
            matchingStoreIds,
            search: debouncedSearch,
            storeIds: tiendasIds,
            visibleCategoryIds,
          }),
        }]
      : tiendasCercanas.slice(0, HOME_STORE_PREVIEW_COUNT).map((tienda) => {
          const storeId = String(tienda._id);
          return {
            key: `store:${storeId}`,
            query: buildCommerceProductQuery({
              limit: COMMERCE_CATALOG_INITIAL_LIMIT,
              selectedStore: storeId,
              storeIds: tiendasIds,
              visibleCategoryIds,
            }),
          };
        });
    const subscriptions = productQueries
      .filter(({ query }) => query.enabled)
      .map((entry) => ({
        ...entry,
        handle: Meteor.subscribe("productosComercio", entry.query.selector, {
          ...entry.query.options,
          fields: PRODUCTOS_COMERCIO_FIELDS,
        }),
      }));
    const resultsByKey = new Map(subscriptions.map(({ key, query }) => [
      key,
      ProductosComercioCollection.find(query.selector, {
        fields: PRODUCTOS_COMERCIO_FIELDS,
        limit: query.limit,
        sort: query.options.sort,
      }).fetch().slice(0, query.limit),
    ]));
    const uniqueProducts = (products) => [...new Map(products.map((product) => [
      String(product._id),
      product,
    ])).values()];
    const storeProducts = uniqueProducts(productQueries.flatMap(({ key }) =>
      resultsByKey.get(key) || [],
    ));
    const storesById = new Map(tiendas.map((tienda) => [String(tienda._id), tienda]));
    const tiendasCercanasById = new Map(tiendasCercanas.map((tienda) => [String(tienda._id), tienda]));
    const mapStoresWithProducts = (products) => {
      const productsByStore = new Map();
      products.forEach((product) => {
        const storeId = String(product.idTienda || "");
        if (!productsByStore.has(storeId)) productsByStore.set(storeId, []);
        productsByStore.get(storeId).push(product);
      });
      return [...productsByStore.entries()]
        .map(([storeId, storeProductsForCard]) => {
          const tienda = storesById.get(storeId);
          if (!tienda) return null;
          const nearbyStore = tiendasCercanasById.get(storeId);
          return {
            ...tienda,
            coordenadas: tienda.coordenadas || nearbyStore?.coordenadas || null,
            distancia: nearbyStore?.distancia,
            distanciaFormateada: nearbyStore?.distanciaFormateada,
            catalogoParcial: true,
            productos: storeProductsForCard,
            productosDisponibles: storeProductsForCard.filter((producto) =>
              !producto.productoDeElaboracion ? producto.count > 0 : true,
            ).length,
            totalProductos: storeProductsForCard.length,
          };
        })
        .filter(Boolean);
    };

    return {
      catalogStores: tiendas,
      loading: !subTiendas.ready() || subscriptions.some(({ handle }) => !handle.ready()),
      tiendasConProductos: mapStoresWithProducts(storeProducts),
    };
  }, [categoriesReady, dataReady, debouncedSearch, loadingTiendas, tiendasCercanas, visibleCategoryIds]);

  const nearbyOwnerIds = useMemo(
    () => [...new Set(catalogStores.map((tienda) => String(tienda.idUser || "")).filter(Boolean))],
    [catalogStores],
  );
  const parentCategories = useMemo(
    () => getCommerceParentCategories(parentCategoryCandidates, nearbyOwnerIds),
    [nearbyOwnerIds, parentCategoryCandidates],
  );
  const featuredParentCategories = useMemo(
    () => getRandomCommerceCategorySample(parentCategories, HOME_CATEGORY_PREVIEW_COUNT, categoryRandomSeed),
    [categoryRandomSeed, parentCategories],
  );
  const tiendasFiltradas = useMemo(() => {
    const tiendas = categoriesReady ? filterVisibleCommerceStores(tiendasConProductos, categories) : [];
    const orderedTiendas = tiendas.some((tienda) => tienda.distancia !== undefined)
      ? [...tiendas].sort((a, b) => {
          if (a.distancia === undefined) return 1;
          if (b.distancia === undefined) return -1;
          return a.distancia - b.distancia;
        })
      : tiendas;

    if (!debouncedSearch.trim()) {
      return orderedTiendas;
    }

    const query = debouncedSearch.toLocaleLowerCase("es");
    return orderedTiendas.filter((tienda) => {
      const matchTienda =
        tienda.title?.toLocaleLowerCase("es").includes(query) ||
        tienda.descripcion?.toLocaleLowerCase("es").includes(query);
      const matchProducto = tienda.productos?.some(
        (producto) =>
          producto.name?.toLocaleLowerCase("es").includes(query) ||
          producto.descripcion?.toLocaleLowerCase("es").includes(query),
      );

      return matchTienda || matchProducto;
    });
  }, [categories, categoriesReady, debouncedSearch, tiendasConProductos]);

  const visibleTiendas = tiendasFiltradas.slice(0, 4);
  const nearbyStoreIds = useMemo(
    () => tiendasCercanas.map((tienda) => String(tienda._id)).filter(Boolean),
    [tiendasCercanas],
  );
  const storesById = useMemo(
    () => new Map(catalogStores.map((tienda) => [String(tienda._id), tienda])),
    [catalogStores],
  );
  const isLoading = loading || loadingTiendas || !categoriesReady || (Boolean(userLocation) && storeSearchStatus === "idle");
  const locationPermissionBlocked =
    locationPermissionState?.granted === false &&
    locationPermissionState?.canAskAgain === false;
  const locationServicesDisabled = locationPermissionState?.servicesEnabled === false;
  const locationPermissionDenied = locationPermissionState?.granted === false;
  const locationUnavailable = locationServicesDisabled || locationPermissionDenied;
  const isUsingCachedLocationFallback = locationUnavailable && Boolean(userLocation);
  const showLocationAccessCard =
    locationUnavailable ||
    Boolean(locationError) ||
    (!userLocation && Boolean(locationPermissionState));
  const shouldShowLocationEmptyState =
    showLocationAccessCard && !isLoading && visibleTiendas.length === 0;
  const openCatalog = React.useCallback((routeParams = {}) => {
    router.push({
      pathname: "/(normal)/ComerciosList",
      params: {
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...routeParams,
      },
    });
  }, [debouncedSearch, router]);
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
          onPress={() => openCatalog()}
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

        <Chip
          compact
          icon={isUsingCachedLocationFallback ? "map-marker-alert-outline" : "store-search-outline"}
          style={[styles.countChip, { backgroundColor: palette.chip }]}
        >
          {isLoading
            ? "Buscando"
            : isUsingCachedLocationFallback
              ? "Resultados aproximados"
              : `${tiendasFiltradas.length} tienda${tiendasFiltradas.length === 1 ? "" : "s"}`}
        </Chip>
      </View>

      {featuredParentCategories.length ? (
        <View style={styles.categoryShortcuts}>
          <Text style={[styles.categoryShortcutsTitle, { color: palette.title }]} variant="titleSmall">
            Explorar categorías principales
          </Text>
          <FlatList
            accessibilityLabel="Categorías principales de comercios"
            data={featuredParentCategories}
            horizontal
            keyExtractor={(category) => category.id}
            renderItem={({ item: category }) => (
              <Chip
                accessibilityLabel={`Ver ${category.label}`}
                compact
                mode="outlined"
                onPress={() => openCatalog({ category: category.id })}
                style={[styles.categoryShortcut, { backgroundColor: palette.chip }]}
              >
                {category.nombre || category.label}
              </Chip>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.categoryShortcuts}>
          <Text style={[styles.categoryShortcutsTitle, { color: palette.title }]} variant="titleSmall">Explorar categorías principales</Text>
          <Text style={{ color: palette.subtitle }} variant="bodySmall">
            {!categoriesReady || loading || loadingTiendas
              ? "Cargando categorías principales…"
              : !tiendasCercanas.length
                ? "Busca comercios cercanos para explorar sus categorías principales."
                : parentCategoryCandidates.length
                  ? "No hay categorías principales para estos comercios."
                : "Todavía no hay categorías principales activas."}
          </Text>
        </View>
      )}

      {showLocationAccessCard ? (
        <CommerceLocationAccessCard
          blocked={locationPermissionBlocked}
          compact
          loading={locationPermissionLoading || loadingTiendas}
          onOpenSettings={() => Linking.openSettings()}
          onRequestLocation={obtenerUbicacion}
          style={styles.locationAccessCard}
        />
      ) : null}

      {isUsingCachedLocationFallback ? (
        <View style={styles.inlineNotice}>
          <MaterialCommunityIcons
            color={palette.icon}
            name="information-outline"
            size={18}
          />
          <Text variant="bodySmall" style={[styles.noticeText, { color: palette.copy }]}>
            Estamos mostrando comercios usando tu última ubicación guardada. Mientras la ubicación no esté activa para Vidkar, la distancia y el orden de las tiendas pueden no ser correctos.
          </Text>
        </View>
      ) : null}

      {isLoading && visibleTiendas.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator animating size="small" />
          <Text variant="bodySmall" style={[styles.loadingText, { color: palette.copy }]}>Buscando comercios cercanos...</Text>
        </View>
      ) : visibleTiendas.length > 0 ? (
        <View style={styles.tiendasList}>
          <Text style={[styles.listHeading, { color: palette.title }]} variant="titleMedium">Por tiendas</Text>
          {visibleTiendas.map((tienda) => (
            <TiendaCard
              key={tienda._id}
              searchQuery={searchQuery}
              tienda={tienda}
              userLocation={userLocation}
              onSeeAll={() => openCatalog({ store: tienda._id })}
            />
          ))}
        </View>
      ) : shouldShowLocationEmptyState ? (
        <View style={styles.emptyState}>
          <Text variant="titleSmall" style={[styles.emptyTitle, { color: palette.title }]}>Ubicación apagada</Text>
          <Text variant="bodySmall" style={[styles.emptyCopy, { color: palette.copy }]}>No podemos buscar comercios cercanos si la ubicación no está activa para Vidkar. Actívala para actualizar la búsqueda.</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text variant="titleSmall" style={[styles.emptyTitle, { color: palette.title }]}>
            {searchQuery.trim()
              ? "No se encontraron resultados"
              : storeSearchStatus === "error"
                ? "No pudimos cargar las tiendas"
                : locationUnavailable
              ? "Ubicación apagada"
              : userLocation
                ? "No hay comercios cerca"
                : "Ubicación pendiente"}
          </Text>
          <Text variant="bodySmall" style={[styles.emptyCopy, { color: palette.copy }]}> 
            {searchQuery.trim()
              ? "Prueba con otro nombre de tienda o producto."
              : storeSearchStatus === "error"
                ? "Comprueba tu conexión e intenta buscar las tiendas nuevamente."
                : locationUnavailable
              ? "Activa la ubicación para Vidkar desde los ajustes del dispositivo para poder buscar comercios cercanos."
                : userLocation
                  ? "Prueba ampliando el radio o abre el listado completo para actualizar la búsqueda."
                : "Activa tu ubicación para encontrar tiendas disponibles en tu zona."}
          </Text>
          <Button mode="contained-tonal" onPress={obtenerUbicacion} style={styles.emptyButton}>
            Actualizar ubicación
          </Button>
        </View>
      )}

      {!debouncedSearch && featuredParentCategories.length ? (
        <View style={styles.categoryRows}>
          <Text style={[styles.listHeading, { color: palette.title }]} variant="titleMedium">
            Productos por categoría principal
          </Text>
          {featuredParentCategories.map((category) => (
            <ComercioCategorySelection
              category={category}
              key={category.id}
              onSeeAll={() => openCatalog({ category: category.id })}
              searchQuery={searchQuery}
              storeIds={nearbyStoreIds}
              storesById={storesById}
              />
          ))}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Button
          compact
          icon="receipt-text-outline"
          mode="outlined"
          onPress={() => router.push("/(normal)/MisCompras")}
          style={styles.footerButton}
        >
          Mis compras
        </Button>
        <Button
          compact
          icon="store-search"
          mode="contained-tonal"
          onPress={() => openCatalog()}
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
  categoryRows: { marginTop: 20 },
  categoryShortcuts: { gap: 8, marginTop: 16, paddingLeft: 16 },
  categoryShortcutsTitle: { fontWeight: "800" },
  categoryShortcut: { marginRight: 8 },
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
  listHeading: { fontWeight: "900", paddingHorizontal: 16 },
  locationAccessCard: {
    marginHorizontal: 16,
    marginTop: 12,
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
