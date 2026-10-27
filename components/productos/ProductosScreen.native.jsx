import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    AppState,
    FlatList,
    Linking,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Keyboard,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Appbar,
    Badge,
    Button,
    Chip,
    Divider,
    FAB,
    IconButton,
    Menu,
    RadioButton,
    Searchbar,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useReducedMotion } from "react-native-reanimated";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import {
  buildCategoryTree,
  filterVisibleCommerceStores,
  getCategoryDescendantIds,
  getCategoryPath,
  getCommerceParentCategories,
  getPopulatedCommerceCategoryRows,
  normalizeCommerceHomeCategories,
  UNCATEGORIZED_COMMERCE_CATEGORY_ID,
} from "../../services/commerceCategories";
import {
  buildCommerceProductQuery,
  COMMERCE_CATALOG_INITIAL_LIMIT,
  COMMERCE_CATALOG_LIMIT_STEP,
  COMMERCE_CATALOG_MAX_LIMIT,
  isValidCommercePriceRange,
} from "../../services/commerceProductCatalog";
import {
    getCurrentDeviceLocation,
    getDeviceLocationPermissionState,
    readCachedDeviceLocation,
    requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";
import { confirmCommerceLocationDisclosure } from "../../services/location/commerceLocationDisclosure.native";
import { clearMCPConfiguration } from "../../services/mcp/mcpClient";
import WizardConStepper from "../carritoCompras/WizardConStepper.native";
import DrawerBottom from "../drawer/DrawerBottom.native";
import {
  CategoriasComercioCollection,
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
import CommerceCategoryFilter from "./CommerceCategoryFilter.native";
import ComercioCategorySelection from "./ComercioCategorySelection.native";
import ProductoCard from "./ProductoCard";
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

const radioOptions = [
  { label: "1 km", value: 1, icon: "map-marker-radius" },
  { label: "3 km", value: 3, icon: "map-marker-radius" },
  { label: "5 km", value: 5, icon: "map-marker-radius" },
  { label: "7 km", value: 7, icon: "map-marker-radius" },
];

const availabilityOptions = [
  { label: "Todos", value: "all", icon: "apps" },
  { label: "En stock", value: "available", icon: "check-circle-outline" },
  { label: "Por encargo", value: "made", icon: "chef-hat" },
];

const currencyOptions = ["CUP", "UYU", "USD"];

const sortOptions = [
  { label: "Recomendados", value: "recommended", icon: "star-four-points-outline" },
  { label: "Nombre (A-Z)", value: "name", icon: "sort-alphabetical-ascending" },
  { label: "Precio: menor a mayor", value: "price-asc", icon: "sort-numeric-ascending" },
  { label: "Precio: mayor a menor", value: "price-desc", icon: "sort-numeric-descending" },
];

const SCREEN_INITIAL_CATALOG_LIMIT = Math.min(
  COMMERCE_CATALOG_MAX_LIMIT,
  COMMERCE_CATALOG_INITIAL_LIMIT * 2,
);

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
  const params = useLocalSearchParams();
  const routeCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const routeStore = Array.isArray(params.store) ? params.store[0] : params.store;
  const routeSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState(routeCategory || "all");
  const [selectedStore, setSelectedStore] = useState(routeStore || "all");
  const canNavigateBack = useCanNavigateBack();
  const safeBack = useSafeBack("/(normal)/Main");
  const headerInset = useAppHeaderContentInset();
  const [searchQuery, setSearchQuery] = useState(routeSearch || "");
  const [debouncedSearch, setDebouncedSearch] = useState(routeSearch || "");
  const [availability, setAvailability] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recommended");
  const [catalogLimit, setCatalogLimit] = useState(SCREEN_INITIAL_CATALOG_LIMIT);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filtersTab, setFiltersTab] = useState("categories");
  const [categoryResetKey, setCategoryResetKey] = useState(0);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchbar, setShowSearchbar] = useState(Boolean(routeSearch));
  const [userLocation, setUserLocation] = useState(null);
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
  const locationRequestInProgressRef = React.useRef(false);
  const lastSearchSignatureRef = React.useRef(null);
  const dataReady = useDeferredScreenData();
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
  const categoryOptions = useMemo(
    () => [
      { id: "all", label: "Todas" },
      ...visibleCategories,
      { id: UNCATEGORIZED_COMMERCE_CATEGORY_ID, label: "Sin categoría" },
    ],
    [visibleCategories],
  );
  const visibleCategoryDocs = useMemo(() => {
    const visibleIds = new Set(visibleCategoryIds);
    return categories.filter((category) => visibleIds.has(String(category._id)));
  }, [categories, visibleCategoryIds]);
  const categoryTreeData = useMemo(
    () => buildCategoryTree(visibleCategoryDocs),
    [visibleCategoryDocs],
  );
  const selectedCategoryPath = useMemo(
    () => getCategoryPath(categoryTreeData, selectedCategory),
    [categoryTreeData, selectedCategory],
  );
  const selectedCategoryName = selectedCategory === "all"
    ? "Todas"
    : selectedCategory === UNCATEGORIZED_COMMERCE_CATEGORY_ID
      ? "Sin categoría"
      : selectedCategoryPath[selectedCategoryPath.length - 1]?.nombre ||
        categoryOptions.find((category) => category.id === selectedCategory)?.label ||
        "Categoría";
  const selectedCategoryIds = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === UNCATEGORIZED_COMMERCE_CATEGORY_ID) {
      return [];
    }
    const allowedIds = new Set(visibleCategoryIds);
    const visibleCategoryDocs = categories.filter((category) =>
      allowedIds.has(String(category._id)),
    );
    return [...getCategoryDescendantIds(visibleCategoryDocs, String(selectedCategory))]
      .filter((id) => allowedIds.has(String(id)));
  }, [categories, selectedCategory, visibleCategoryIds]);
  const nearbyStoreIds = useMemo(
    () => tiendasCercanas.map((store) => String(store._id)).filter(Boolean),
    [tiendasCercanas],
  );
  const matchingStoreIds = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return [];
    return tiendasCercanas
      .filter((store) =>
        String(store.title || "").toLocaleLowerCase("es").includes(normalizedQuery) ||
        String(store.descripcion || "").toLocaleLowerCase("es").includes(normalizedQuery),
      )
      .map((store) => String(store._id));
  }, [debouncedSearch, tiendasCercanas]);
  const priceRangeValid = isValidCommercePriceRange(minPrice, maxPrice);
  const hasInvalidPrice = [minPrice, maxPrice].some((value) =>
    value.trim() !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0),
  );
  const priceRangeError = !priceRangeValid
    ? hasInvalidPrice
      ? "Introduce precios numéricos iguales o mayores que cero."
      : "El precio mínimo no puede superar el máximo."
    : "";
  const catalogQuery = useMemo(
    () => buildCommerceProductQuery({
      availability,
      categoryIds: selectedCategoryIds,
      enabled: categoriesReady && !priceRangeError,
      limit: catalogLimit,
      matchingStoreIds,
      maxPrice,
      minPrice,
      search: debouncedSearch,
      selectedCategory,
      selectedCurrency,
      selectedStore,
      sort,
      storeIds: nearbyStoreIds,
      visibleCategoryIds,
    }),
    [
      availability,
      categoriesReady,
      catalogLimit,
      debouncedSearch,
      matchingStoreIds,
      maxPrice,
      minPrice,
      nearbyStoreIds,
      priceRangeError,
      selectedCategory,
      selectedCategoryIds,
      selectedCurrency,
      selectedStore,
      sort,
      visibleCategoryIds,
    ],
  );
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStore !== "all") count += 1;
    if (selectedCategory !== "all") count += 1;
    if (availability !== "all") count += 1;
    if (selectedCurrency !== "all") count += 1;
    if (minPrice !== "" || maxPrice !== "") count += 1;
    if (sort !== "recommended") count += 1;
    return count;
  }, [availability, maxPrice, minPrice, selectedCategory, selectedCurrency, selectedStore, sort]);
  const selectedSortLabel = sortOptions.find((option) => option.value === sort)?.label || "Recomendados";

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!filtersExpanded) return;
    setFiltersTab("categories");
  }, [filtersExpanded]);

  React.useEffect(() => {
    setSelectedCategory(routeCategory || "all");
    setSelectedStore(routeStore || "all");
    setSearchQuery(routeSearch || "");
    setDebouncedSearch(routeSearch || "");
  }, [routeCategory, routeSearch, routeStore]);

  React.useEffect(() => {
    setCatalogLimit(SCREEN_INITIAL_CATALOG_LIMIT);
  }, [availability, debouncedSearch, maxPrice, minPrice, selectedCategory, selectedCurrency, selectedStore, sort]);

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
    } finally {
      locationRequestInProgressRef.current = false;
      setLocationPermissionLoading(false);
    }
  }, [aplicarUbicacion]);

  React.useEffect(() => {
    refreshLocationPermissionState();
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

  const {
    catalogStores,
    hasMoreProducts,
    loading: loadingProducts,
    productCount,
    productOrderIds,
    tiendasConProductos,
  } = Meteor.useTracker(() => {
    if (!dataReady || !categoriesReady) {
      return {
        catalogStores: [],
        hasMoreProducts: false,
        loading: true,
        productCount: 0,
        productOrderIds: [],
        tiendasConProductos: [],
      };
    }

    if (!nearbyStoreIds.length) {
      return {
        catalogStores: [],
        hasMoreProducts: false,
        loading: loadingTiendas,
        productCount: 0,
        productOrderIds: [],
        tiendasConProductos: [],
      };
    }

    const storesSelector = { _id: { $in: nearbyStoreIds } };
    const storesHandle = Meteor.subscribe("tiendas", storesSelector, {
      fields: TIENDAS_CLIENT_FIELDS,
    });
    const productsHandle = catalogQuery.enabled
      ? Meteor.subscribe("productosComercio", catalogQuery.selector, {
          ...catalogQuery.options,
          fields: PRODUCTOS_COMERCIO_FIELDS,
        })
      : null;
    const stores = TiendasComercioCollection.find(storesSelector, {
      fields: TIENDAS_CLIENT_FIELDS,
      sort: { title: 1 },
    }).fetch();
    const fetchedProducts = catalogQuery.enabled
      ? ProductosComercioCollection.find(catalogQuery.selector, {
          fields: PRODUCTOS_COMERCIO_FIELDS,
          limit: catalogQuery.options.limit,
          sort: catalogQuery.options.sort,
        }).fetch()
      : [];
    const products = fetchedProducts.slice(0, catalogQuery.limit);
    const productsByStore = new Map();
    products.forEach((product) => {
      const storeId = String(product.idTienda || "");
      if (!productsByStore.has(storeId)) productsByStore.set(storeId, []);
      productsByStore.get(storeId).push(product);
    });
    const storesById = new Map(stores.map((store) => [String(store._id), store]));
    const nearbyStoresById = new Map(tiendasCercanas.map((store) => [String(store._id), store]));
    const hasMore = Boolean(productsHandle?.ready() && fetchedProducts.length > catalogQuery.limit);
    const mappedStores = [...productsByStore.entries()]
      .map(([storeId, storeProducts]) => {
        const store = storesById.get(storeId);
        if (!store) return null;
        const nearbyStore = nearbyStoresById.get(storeId);
        return {
          ...store,
          coordenadas: store.coordenadas || nearbyStore?.coordenadas || null,
          distancia: nearbyStore?.distancia,
          distanciaFormateada: nearbyStore?.distanciaFormateada,
          catalogoParcial: hasMore,
          productos: storeProducts,
          productosDisponibles: storeProducts.filter((product) =>
            !product.productoDeElaboracion ? product.count > 0 : true,
          ).length,
          totalProductos: storeProducts.length,
        };
      })
      .filter(Boolean);

    return {
      catalogStores: stores,
      hasMoreProducts: hasMore,
      loading: !storesHandle.ready() || Boolean(productsHandle && !productsHandle.ready()),
      productCount: products.length,
      productOrderIds: products.map((product) => String(product._id)),
      tiendasConProductos: mappedStores,
    };
  }, [catalogQuery, categoriesReady, dataReady, loadingTiendas, nearbyStoreIds, tiendasCercanas]);

  const tiendasDisponibles = useMemo(() => categoriesReady
    ? filterVisibleCommerceStores(tiendasConProductos, categories) : [],
  [categories, categoriesReady, tiendasConProductos]);
  const storesById = useMemo(
    () => new Map(catalogStores.map((store) => [String(store._id), store])),
    [catalogStores],
  );
  const nearbyOwnerIds = useMemo(
    () => [...new Set(catalogStores.map((store) => String(store.idUser || "")).filter(Boolean))],
    [catalogStores],
  );
  const parentCategories = useMemo(
    () => getCommerceParentCategories(parentCategoryCandidates, nearbyOwnerIds),
    [nearbyOwnerIds, parentCategoryCandidates],
  );
  const quickCategoryOptions = useMemo(
    () => [{ id: "all", label: "Todas" }, ...parentCategories],
    [parentCategories],
  );
  const isCategorySelected = (item) => selectedCategory === item.id;
  React.useEffect(() => {
    if (categoriesReady && selectedCategory !== "all" &&
      selectedCategory !== UNCATEGORIZED_COMMERCE_CATEGORY_ID &&
      !visibleCategories.some((category) => category.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categoriesReady, selectedCategory, visibleCategories]);
  const locationPermissionBlocked =
    locationPermissionState?.granted === false &&
    locationPermissionState?.canAskAgain === false;
  const locationServicesDisabled = locationPermissionState?.servicesEnabled === false;
  const locationPermissionDenied = locationPermissionState?.granted === false;
  const locationUnavailable = locationServicesDisabled || locationPermissionDenied;
  const showLocationAccessCard =
    locationUnavailable ||
    Boolean(locationError) ||
    (!userLocation && Boolean(locationPermissionState));

  const tiendasFiltradas = useMemo(() => {
    const selected = tiendasDisponibles.filter((store) =>
      selectedStore === "all" || String(store._id) === String(selectedStore),
    );
    if (!selected.some((store) => store.distancia !== undefined)) return selected;
    return [...selected].sort((left, right) => {
      if (left.distancia === undefined) return 1;
      if (right.distancia === undefined) return -1;
      return left.distancia - right.distancia;
    });
  }, [selectedStore, tiendasDisponibles]);

  const showCategorySelections = activeFiltersCount === 0 && !debouncedSearch;
  const catalogRows = useMemo(() => showCategorySelections
    ? [
        ...parentCategories.map((category) => ({
          id: `selection:${category.id}`, kind: "selection", category,
        })),
        ...tiendasFiltradas.map((tienda) => ({
          id: `store:${tienda._id}`, kind: "store", tienda,
        })),
      ]
    : getPopulatedCommerceCategoryRows(categories, visibleCategories, tiendasFiltradas, productOrderIds)
      .map((category) => ({ id: `category:${category.id}`, kind: "category", category })),
  [categories, parentCategories, productOrderIds, showCategorySelections, tiendasFiltradas, visibleCategories]);

  const resetCatalogFilters = React.useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedStore("all");
    setSelectedCategory("all");
    setAvailability("all");
    setSelectedCurrency("all");
    setMinPrice("");
    setMaxPrice("");
    setSort("recommended");
    setCatalogLimit(SCREEN_INITIAL_CATALOG_LIMIT);
    setCategoryResetKey((current) => current + 1);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setCatalogLimit(SCREEN_INITIAL_CATALOG_LIMIT);
    await obtenerUbicacion();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [obtenerUbicacion]);

  const listHeaderComponent = useMemo(
    () => {
      const panelBg = theme.dark ? "rgba(30, 41, 59, 0.72)" : "#ffffff";
      const panelBorder = theme.dark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)";
      const subtleChipBg = theme.dark ? "rgba(99, 102, 241, 0.16)" : "rgba(63, 81, 181, 0.08)";

      return (
        <>
          <Surface
            elevation={theme.dark ? 0 : 1}
            style={[
              styles.filterPanelSurface,
              {
                backgroundColor: panelBg,
                borderColor: panelBorder,
              },
            ]}
          >
            <View style={styles.filterTopStatusRow}>
              <View style={styles.statusPillsGroup}>
                {userLocation ? (
                  <>
                    <Chip
                      compact
                      icon={locationUnavailable ? "map-marker-alert" : "map-marker-check"}
                      mode="flat"
                      style={[styles.locationChip, { backgroundColor: subtleChipBg }]}
                      textStyle={styles.locationChipText}
                    >
                      {locationUnavailable
                        ? `Aprox. · ${radioKm} km`
                        : `${radioKm} km`}
                    </Chip>
                    <Chip
                      compact
                      icon="storefront-outline"
                      mode="outlined"
                      style={styles.countChip}
                      textStyle={styles.locationChipText}
                    >
                      {tiendasDisponibles.length} {tiendasDisponibles.length === 1 ? "tienda" : "tiendas"}
                    </Chip>
                  </>
                ) : null}
              </View>
              <Button
                compact
                contentStyle={styles.misComprasChipContent}
                icon="shopping-outline"
                labelStyle={styles.misComprasChipLabel}
                mode="contained-tonal"
                onPress={() => router.push("/(normal)/MisCompras")}
                style={styles.misComprasCompactButton}
              >
                Mis compras
              </Button>
            </View>

            <Divider style={styles.filterPanelDivider} />

            <View style={styles.catalogToolbar}>
              <View style={styles.toolbarActionsGroup}>
                <View style={styles.filterButtonWrap}>
                  <Button
                    compact
                    contentStyle={styles.toolbarButtonContent}
                    icon="tune-variant"
                    labelStyle={styles.toolbarButtonLabel}
                    mode={activeFiltersCount ? "contained-tonal" : "outlined"}
                    onPress={() => setFiltersExpanded(true)}
                    style={styles.toolbarButton}
                  >
                    Filtros
                  </Button>
                  {activeFiltersCount ? (
                    <Badge style={[styles.filtersBadge, { backgroundColor: theme.colors.primary }]}>
                      {activeFiltersCount}
                    </Badge>
                  ) : null}
                </View>

                <Menu
                  anchor={
                    <Button
                      compact
                      contentStyle={styles.toolbarButtonContent}
                      icon="sort-variant"
                      labelStyle={styles.toolbarButtonLabel}
                      mode={sort !== "recommended" ? "contained-tonal" : "outlined"}
                      onPress={() => setSortMenuVisible(true)}
                      style={styles.toolbarButton}
                    >
                      <Text numberOfLines={1} style={styles.toolbarSortText}>
                        {selectedSortLabel}
                      </Text>
                    </Button>
                  }
                  onDismiss={() => setSortMenuVisible(false)}
                  visible={sortMenuVisible}
                >
                  {sortOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      leadingIcon={sort === option.value ? "check" : option.icon}
                      onPress={() => {
                        setSort(option.value);
                        setSortMenuVisible(false);
                      }}
                      title={option.label}
                    />
                  ))}
                </Menu>
              </View>

              <Chip
                compact
                icon={loadingProducts ? "progress-clock" : "package-variant-closed"}
                mode="flat"
                style={[styles.productCountPill, { backgroundColor: subtleChipBg }]}
                textStyle={styles.productCountPillText}
              >
                {loadingProducts && !productCount
                  ? "Cargando"
                  : `${productCount}${hasMoreProducts ? "+" : ""} prod.`}
              </Chip>
            </View>

              {activeFiltersCount || debouncedSearch ? (
                <View style={styles.activeFiltersWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activeFiltersScrollContent}
                    style={styles.activeFiltersScrollView}
                  >
                    {debouncedSearch ? (
                      <Chip compact onClose={() => setSearchQuery("")} style={styles.activeFilterChip}>
                        “{debouncedSearch}”
                      </Chip>
                    ) : null}
                    {selectedStore !== "all" ? (
                      <Chip compact onClose={() => setSelectedStore("all")} style={styles.activeFilterChip}>
                        {catalogStores.find((store) => String(store._id) === String(selectedStore))?.title || "Tienda"}
                      </Chip>
                    ) : null}
                    {selectedCategory !== "all" ? (
                      <Chip compact onClose={() => setSelectedCategory("all")} style={styles.activeFilterChip}>
                        {selectedCategoryName}
                      </Chip>
                    ) : null}
                    {availability !== "all" ? (
                      <Chip compact onClose={() => setAvailability("all")} style={styles.activeFilterChip}>
                        {availabilityOptions.find((option) => option.value === availability)?.label || "Disponibilidad"}
                      </Chip>
                    ) : null}
                    {selectedCurrency !== "all" ? (
                      <Chip compact onClose={() => setSelectedCurrency("all")} style={styles.activeFilterChip}>
                        {selectedCurrency}
                      </Chip>
                    ) : null}
                    {minPrice !== "" || maxPrice !== "" ? (
                      <Chip compact onClose={() => { setMinPrice(""); setMaxPrice(""); }} style={styles.activeFilterChip}>
                        {minPrice || "0"}–{maxPrice || "∞"} {selectedCurrency === "all" ? "" : selectedCurrency}
                      </Chip>
                    ) : null}
                    {sort !== "recommended" ? (
                      <Chip compact onClose={() => setSort("recommended")} style={styles.activeFilterChip}>
                        {selectedSortLabel}
                      </Chip>
                    ) : null}
                  </ScrollView>
                  <Button
                    compact
                    icon="restart"
                    mode="text"
                    onPress={resetCatalogFilters}
                    style={styles.clearFiltersButton}
                    labelStyle={styles.clearFiltersLabel}
                  >
                    Limpiar
                  </Button>
                </View>
              ) : null}
          </Surface>

          <View style={styles.catalogSummary}>
            <View style={styles.catalogSummaryTitleRow}>
              <MaterialCommunityIcons
                color={theme.colors.primary}
                name={selectedStore !== "all" ? "store" : "store-marker-outline"}
                size={18}
              />
              <Text numberOfLines={2} style={styles.catalogSummaryTitle} variant="titleSmall">
                {selectedCategory !== "all"
                  ? selectedCategoryName
                  : selectedStore !== "all"
                    ? catalogStores.find((store) => String(store._id) === String(selectedStore))?.title || "Tienda seleccionada"
                    : "Productos de tiendas cercanas"}
              </Text>
            </View>
            {selectedStore !== "all" ? (
              <Button
                compact
                icon="store-remove-outline"
                mode="text"
                onPress={() => setSelectedStore("all")}
              >
                Ver todas las tiendas
              </Button>
            ) : null}
          </View>

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
        </>
      );
    },
    [
      availability,
      activeFiltersCount,
      parentCategories,
      quickCategoryOptions,
      loadingTiendas,
      loadingProducts,
      catalogStores,
      categories.length,
      categoriesReady,
      debouncedSearch,
      hasMoreProducts,
      locationPermissionBlocked,
      locationPermissionLoading,
      locationUnavailable,
      maxPrice,
      minPrice,
      obtenerUbicacion,
      productCount,
      radioKm,
      router,
      resetCatalogFilters,
      selectedCategory,
      selectedCategoryName,
      selectedCurrency,
      selectedSortLabel,
      selectedStore,
      sort,
      sortMenuVisible,
      showLocationAccessCard,
      tiendasDisponibles,
      userLocation,
      theme.colors.onSecondaryContainer,
      theme.colors.onSurfaceVariant,
      theme.colors.primary,
      theme.colors.secondaryContainer,
      theme.dark,
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
            : priceRangeError
                ? "Revisa el rango de precio"
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
          {priceRangeError
            ? priceRangeError
            : loadingTiendas
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
    [loadingTiendas, locationError, locationUnavailable, priceRangeError, radioKm, searchQuery, userLocation],
  );

  const listFooterComponent = useMemo(() => {
    const canLoadMore = hasMoreProducts && catalogLimit < COMMERCE_CATALOG_MAX_LIMIT;
    return (
      <>
        {productCount > 0 ? (
          <View style={styles.catalogFooter}>
            <Text style={styles.catalogFooterText} variant="bodySmall">
              {canLoadMore
                ? `Mostrando ${productCount} productos para mantener el catálogo ligero.`
                : hasMoreProducts
                  ? `Se alcanzó el máximo de ${COMMERCE_CATALOG_MAX_LIMIT} productos. Refina los filtros para encontrar otros.`
                  : `Has visto los ${productCount} productos de esta selección.`}
            </Text>
            {canLoadMore ? (
              <Button
                disabled={loadingProducts}
                icon="plus"
                mode="contained-tonal"
                onPress={() => setCatalogLimit((current) =>
                  Math.min(COMMERCE_CATALOG_MAX_LIMIT, current + COMMERCE_CATALOG_LIMIT_STEP),
                )}
              >
                Cargar más productos
              </Button>
            ) : null}
          </View>
        ) : null}
        <View style={styles.listFooter} />
      </>
    );
  }, [catalogLimit, hasMoreProducts, loadingProducts, productCount]);

  const renderCatalogItem = React.useCallback(({ item }) => {
    if (item.kind === "selection") {
      return (
        <ComercioCategorySelection
          category={item.category}
          onSeeAll={() => setSelectedCategory(item.category.id)}
          searchQuery={searchQuery}
          storeIds={nearbyStoreIds}
          storesById={storesById}
        />
      );
    }
    if (item.kind === "category") {
      const category = item.category;
      return (
        <View style={styles.categoryResults}>
          <View style={styles.categoryResultsHeading}>
            <Text accessibilityRole="header" style={styles.filterGroupTitle} variant="titleMedium">
              {category.label || category.nombre}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
              {category.matches.length} productos cargados · desliza para explorar
            </Text>
          </View>
          <FlatList
            accessibilityLabel={`Productos de ${category.label || category.nombre}`}
            contentContainerStyle={styles.categoryProductsContent}
            data={category.matches}
            horizontal
            initialNumToRender={5}
            keyExtractor={({ producto }) => String(producto._id)}
            maxToRenderPerBatch={5}
            renderItem={({ item: match }) => (
              <ProductoCard producto={match.producto} searchQuery={searchQuery} tienda={match.tienda} />
            )}
            showsHorizontalScrollIndicator={false}
            windowSize={5}
          />
        </View>
      );
    }
    const tienda = item.tienda;
    return (
      <TiendaCard
        layoutMode="carousel"
        showLoadedProducts
        onSeeAll={
          tienda.catalogoParcial && catalogLimit < COMMERCE_CATALOG_MAX_LIMIT
            ? () => {
                setSelectedStore(String(tienda._id));
              }
            : undefined
        }
        searchQuery={searchQuery}
        tienda={tienda}
        userLocation={userLocation}
      />
    );
  }, [catalogLimit, nearbyStoreIds, searchQuery, storesById, theme.colors.onSurfaceVariant, userLocation]);

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
                    clearMCPConfiguration().finally(() => {
                      Meteor.logout(() => router.replace("/(auth)/Loguin"));
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
                {loadingProducts
                  ? "Buscando…"
                  : `${productCount}${hasMoreProducts ? "+" : ""} producto${productCount === 1 ? "" : "s"}`}
              </Chip>
            </View>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ListEmptyComponent={!categoriesReady || loadingProducts
          ? <ActivityIndicator style={{ marginTop: 28 }} />
          : listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[
          styles.flatListContent,
          !showSearchbar && { paddingTop: headerInset + 12 },
        ]}
        data={catalogRows}
        initialNumToRender={10}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        removeClippedSubviews={Platform.OS === "android"}
        renderItem={renderCatalogItem}
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

      <DrawerBottom
        allowContentSwipeToClose={false}
        closeOnBackdropPress
        footer={(
          <View style={styles.filterSheetFooter}>
            <Button
              compact
              mode="outlined"
              onPress={resetCatalogFilters}
              style={styles.filterFooterButton}
            >
              Restablecer
            </Button>
            <Button
              compact
              mode="contained"
              onPress={() => setFiltersExpanded(false)}
              style={styles.filterFooterButton}
            >
              Ver resultados
            </Button>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        maxHeightRatio={0.92}
        onClose={() => setFiltersExpanded(false)}
        open={filtersExpanded}
        reducedMotion={reducedMotion}
        scrollable
        surfaceStyle={styles.filterDrawerSurface}
        title={activeFiltersCount ? `Filtros · ${activeFiltersCount} activos` : "Filtrar comercios"}
      >
        <View style={styles.filterSheetContent}>
          <View accessibilityRole="tablist" style={[styles.filterTabs, { borderColor: theme.colors.outlineVariant }]}>
            {[
              { id: "categories", label: "Categorías", count: selectedCategory === "all" ? 0 : 1 },
              { id: "more", label: "Más filtros", count: activeFiltersCount - (selectedCategory === "all" ? 0 : 1) },
            ].map((tab) => (
              <Pressable
                accessibilityLabel={tab.count ? `${tab.label}, ${tab.count} activos` : tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: filtersTab === tab.id }}
                key={tab.id}
                onPress={() => { Keyboard.dismiss(); setFiltersTab(tab.id); }}
                style={[styles.filterTab, { borderBottomColor: filtersTab === tab.id ? theme.colors.primary : "transparent" }]}
              >
                <Text style={{ color: filtersTab === tab.id ? theme.colors.primary : theme.colors.onSurfaceVariant }} variant="labelLarge">
                  {tab.label}{tab.count ? ` · ${tab.count}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={filtersTab !== "categories" ? styles.hiddenFilterPanel : undefined}>
            <CommerceCategoryFilter
              loading={!categoriesReady}
              onSelectCategory={setSelectedCategory}
              open={filtersExpanded}
              resetKey={categoryResetKey}
              selectedCategory={selectedCategory}
              tree={categoryTreeData}
            />
          </View>
          <View style={filtersTab === "more" ? styles.moreFiltersPanel : styles.hiddenFilterPanel}>
          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeading}>
              <Text style={styles.filterGroupTitle} variant="titleSmall">Tienda</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                Una selección
              </Text>
            </View>
            <RadioButton.Group onValueChange={setSelectedStore} value={selectedStore}>
              <RadioButton.Item label="Todas las tiendas" labelVariant="bodyMedium" style={styles.filterRadioItem} value="all" />
              {catalogStores.map((store) => (
                <RadioButton.Item
                  key={String(store._id)}
                  label={store.title || store.name || "Tienda"}
                  labelVariant="bodyMedium"
                  style={styles.filterRadioItem}
                  value={String(store._id)}
                />
              ))}
            </RadioButton.Group>
          </View>

          <Divider />

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle} variant="titleSmall">Disponibilidad</Text>
            <View style={styles.filterChipRow}>
              {availabilityOptions.map((option) => (
                <Chip
                  compact
                  key={option.value}
                  selected={availability === option.value}
                  onPress={() => setAvailability(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          <Divider />

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle} variant="titleSmall">Moneda</Text>
            <View style={styles.filterChipRow}>
              {["all", ...currencyOptions].map((currency) => (
                <Chip
                  compact
                  key={currency}
                  selected={selectedCurrency === currency}
                  onPress={() => setSelectedCurrency(currency)}
                >
                  {currency === "all" ? "Todas" : currency}
                </Chip>
              ))}
            </View>
          </View>

          <Divider />

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle} variant="titleSmall">Ordenar por</Text>
            <RadioButton.Group onValueChange={setSort} value={sort}>
              {sortOptions.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  labelVariant="bodyMedium"
                  style={styles.filterRadioItem}
                  value={option.value}
                />
              ))}
            </RadioButton.Group>
          </View>

          <Divider />

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle} variant="titleSmall">Rango de precio</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
              {selectedCurrency === "all"
                ? "Con Todas, el rango numérico se aplica a los precios de cualquier moneda."
                : `Importes expresados en ${selectedCurrency}.`}
            </Text>
            <View style={styles.priceFilterRow}>
              <TextInput
                dense
                keyboardType="decimal-pad"
                label="Mínimo"
                mode="outlined"
                onChangeText={setMinPrice}
                right={<TextInput.Affix text={selectedCurrency === "all" ? "Todas" : selectedCurrency} />}
                style={styles.priceFilterInput}
                value={minPrice}
              />
              <TextInput
                dense
                keyboardType="decimal-pad"
                label="Máximo"
                mode="outlined"
                onChangeText={setMaxPrice}
                right={<TextInput.Affix text={selectedCurrency === "all" ? "Todas" : selectedCurrency} />}
                style={styles.priceFilterInput}
                value={maxPrice}
              />
            </View>
            {priceRangeError ? (
              <Text selectable style={{ color: theme.colors.error }} variant="bodySmall">
                {priceRangeError}
              </Text>
            ) : null}
          </View>
          </View>
        </View>
      </DrawerBottom>
    </Surface>
  );
};

const styles = StyleSheet.create({
  categoryResults: { gap: 8, marginTop: 18 },
  categoryResultsHeading: { gap: 4, paddingHorizontal: 16 },
  categoryProductsContent: { paddingHorizontal: 16 },
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
  filterPanelSurface: {
    borderCurve: "continuous",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterTopStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  statusPillsGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minWidth: 0,
  },
  misComprasCompactButton: {
    borderRadius: 999,
  },
  misComprasChipContent: {
    minHeight: 34,
    paddingHorizontal: 4,
  },
  misComprasChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginVertical: 4,
  },
  countChip: {
    borderRadius: 999,
  },
  categoryFilters: {
    gap: 10,
  },
  sectionHeadingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitleWithIcon: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  sectionTitleText: {
    fontWeight: "800",
  },
  seeAllCategoriesContent: {
    flexDirection: "row-reverse",
  },
  seeAllCategoriesLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginVertical: 2,
  },
  quickCategoryListContent: {
    gap: 8,
    paddingVertical: 2,
  },
  quickCategoryChip: {
    borderRadius: 999,
    maxWidth: 176,
  },
  quickCategoryLabel: {
    fontSize: 12,
    maxWidth: 140,
  },
  filterPanelDivider: {
    opacity: 0.65,
  },
  availabilityAndSortWrap: {
    gap: 8,
  },
  quickAvailabilityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  availabilityChip: {
    borderRadius: 999,
    flex: 1,
  },
  availabilityChipContent: {
    justifyContent: "center",
  },
  availabilityChipText: {
    fontSize: 12,
    textAlign: "center",
  },
  toolbarActionsGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  toolbarButton: {
    borderRadius: 999,
  },
  toolbarButtonContent: {
    minHeight: 34,
    paddingHorizontal: 6,
  },
  toolbarButtonLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginVertical: 4,
  },
  toolbarSortText: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 110,
  },
  productCountPill: {
    borderRadius: 999,
    flexShrink: 0,
  },
  productCountPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterButtonWrap: {
    position: "relative",
  },
  filtersBadge: {
    position: "absolute",
    right: -4,
    top: -5,
    zIndex: 1,
  },
  activeFiltersWrap: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.25)",
    flexDirection: "row",
    gap: 4,
    paddingTop: 8,
  },
  activeFiltersScrollView: {
    flex: 1,
  },
  activeFiltersScrollContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingRight: 4,
  },
  activeFilterChip: {
    borderRadius: 999,
    maxWidth: 200,
  },
  clearFiltersButton: {
    flexShrink: 0,
    marginRight: -4,
  },
  clearFiltersLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterDrawerSurface: {
    backgroundColor: "transparent",
  },
  filterSheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  filterGroup: {
    gap: 9,
  },
  filterGroupHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterGroupTitle: {
    fontWeight: "600",
  },
  filterTabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  filterTab: {
    alignItems: "center",
    borderBottomWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  hiddenFilterPanel: { display: "none" },
  moreFiltersPanel: { gap: 20 },
  filterRadioItem: { minHeight: 48, paddingHorizontal: 0 },
  filterSheetFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  filterFooterButton: {
    flex: 1,
  },
  catalogFooter: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  catalogFooterText: {
    opacity: 0.72,
    textAlign: "center",
  },
  catalogSummary: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 2,
  },
  catalogSummaryTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 140,
  },
  catalogSummaryTitle: {
    flex: 1,
    fontWeight: "800",
    minWidth: 120,
  },
  catalogToolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
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
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    borderRadius: 999,
  },
  locationChipText: {
    fontSize: 12,
    fontWeight: "600",
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
  priceFilterInput: {
    flex: 1,
    minWidth: 140,
  },
  priceFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
