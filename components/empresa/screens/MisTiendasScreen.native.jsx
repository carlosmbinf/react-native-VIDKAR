import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View
} from "react-native";
import {
    Button,
    Card,
    Dialog,
    FAB,
    IconButton,
    Menu,
    Portal,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import { ProductosComercioCollection, TiendasComercioCollection } from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import LocationPicker from "../components/LocationPicker.native";
import MapaTiendaCardBackground from "../maps/MapaTiendaCardBackground.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const getMethodResultMessage = (error, result) => {
  if (error) {
    return error.reason || error.message || "No se pudo completar la operación.";
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "";
  }

  if (result.success === true) {
    return "";
  }

  return result.reason || result.message || (typeof result.error === "string" ? result.error : "");
};

const normalizeText = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || fallback;
};

const normalizeCoordinates = (value) => {
  if (!value) {
    return null;
  }

  const latitude = Number(value?.latitude ?? value?.latitud);
  const longitude = Number(value?.longitude ?? value?.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getStoreGridColumns = (width) => {
  if (width >= 1180) {
    return 3;
  }

  if (width >= 760) {
    return 2;
  }

  return 1;
};

const formatCoordinates = (tienda) => {
  const coordinates = normalizeCoordinates(tienda?.coordenadas || tienda?.cordenadas);

  if (!coordinates) {
    return "Sin ubicación guardada";
  }

  return `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
};

const formatStoreOpenedLabel = (value) => {
  if (!value) {
    return "Nueva tienda";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nueva tienda";
  }

  try {
    return `Activa desde ${new Intl.DateTimeFormat("es", {
      month: "short",
      year: "numeric",
    }).format(date)}`;
  } catch {
    return "Tienda activa";
  }
};

const getStoreSignature = (tienda) => {
  const haystack = `${tienda?.title || ""} ${tienda?.descripcion || ""}`.toLowerCase();

  if (haystack.includes("pizza") || haystack.includes("pizzer")) {
    return { icon: "pizza", label: "Pizzería" };
  }

  if (haystack.includes("regional")) {
    return { icon: "silverware-fork-knife", label: "Cocina regional" };
  }

  if (haystack.includes("cuban") || haystack.includes("cuba") || haystack.includes("cubano")) {
    return { icon: "food", label: "Sabores cubanos" };
  }

  if (haystack.includes("mamá") || haystack.includes("mama") || haystack.includes("casera")) {
    return { icon: "home-heart", label: "Cocina casera" };
  }

  return { icon: "storefront-outline", label: "Gastronomía local" };
};

const getStoreAvailabilityMeta = ({ hasLocation, isDark, productCount }) => {
  if (!hasLocation) {
    return {
      badgeIcon: "map-marker-alert-outline",
      badgeLabel: "Revisar ubicación",
      badgeBackground: isDark ? "rgba(120, 53, 15, 0.26)" : "#fffbeb",
      badgeBorder: isDark ? "rgba(251, 191, 36, 0.22)" : "#fde68a",
      badgeColor: isDark ? "#fde68a" : "#b45309",
      panelBackground: isDark ? "rgba(120, 53, 15, 0.16)" : "#fffbeb",
      panelBorder: isDark ? "rgba(251, 191, 36, 0.18)" : "#fcd34d",
      panelColor: isDark ? "#fde68a" : "#92400e",
      summaryValue: "Ubicación pendiente",
      summaryHint: "Agrega la ubicación para publicar y coordinar entregas con precisión.",
    };
  }

  if (productCount <= 0) {
    return {
      badgeIcon: "playlist-plus",
      badgeLabel: "Lista para publicar",
      badgeBackground: isDark ? "rgba(129, 140, 248, 0.2)" : "#eef2ff",
      badgeBorder: isDark ? "rgba(165, 180, 252, 0.3)" : "#c7d2fe",
      badgeColor: isDark ? "#c7d2fe" : "#4338ca",
      panelBackground: isDark ? "rgba(67, 56, 202, 0.14)" : "#eef2ff",
      panelBorder: isDark ? "rgba(165, 180, 252, 0.22)" : "#c7d2fe",
      panelColor: isDark ? "#ddd6fe" : "#4338ca",
      summaryValue: "Catálogo pendiente",
      summaryHint: "La tienda ya está lista para empezar a publicar productos.",
    };
  }

  if (productCount <= 5) {
    return {
      badgeIcon: "store-check-outline",
      badgeLabel: "Oferta inicial",
      badgeBackground: isDark ? "rgba(120, 53, 15, 0.26)" : "#fffbeb",
      badgeBorder: isDark ? "rgba(251, 191, 36, 0.22)" : "#fde68a",
      badgeColor: isDark ? "#fde68a" : "#b45309",
      panelBackground: isDark ? "rgba(120, 53, 15, 0.16)" : "#fffbeb",
      panelBorder: isDark ? "rgba(251, 191, 36, 0.18)" : "#fcd34d",
      panelColor: isDark ? "#fde68a" : "#92400e",
      summaryValue: `${productCount} producto${productCount === 1 ? "" : "s"}`,
      summaryHint: "Buen arranque. Amplía el catálogo para mejorar la oferta visible.",
    };
  }

  return {
    badgeIcon: "map-marker-check-outline",
    badgeLabel: "Ubicación lista",
    badgeBackground: isDark ? "rgba(20, 83, 45, 0.24)" : "#ecfdf5",
    badgeBorder: isDark ? "rgba(74, 222, 128, 0.18)" : "#bbf7d0",
    badgeColor: isDark ? "#86efac" : "#15803d",
    panelBackground: isDark ? "rgba(20, 83, 45, 0.16)" : "#f0fdf4",
    panelBorder: isDark ? "rgba(74, 222, 128, 0.18)" : "#bbf7d0",
    panelColor: isDark ? "#bbf7d0" : "#166534",
    summaryValue: "Tienda operativa",
    summaryHint: "Lista para gestionar productos, pedidos y cobertura comercial.",
  };
};

const StoreCard = ({ numColumns, onDelete, onEdit, onOpen, productCount, tienda }) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const [menuVisible, setMenuVisible] = useState(false);
  const isCompactCard = numColumns === 1;
  const coordinatesLabel = formatCoordinates(tienda);
  const hasLocation = coordinatesLabel !== "Sin ubicación guardada";
  const signature = getStoreSignature(tienda);
  const openedLabel = formatStoreOpenedLabel(tienda?.createdAt);
  const accentColor = typeof tienda?.pinColor === "string" && tienda.pinColor.trim() ? tienda.pinColor : palette.brandStrong;
  const descripcion = normalizeText(tienda?.descripcion, "Sin descripción disponible");
  const availabilityMeta = getStoreAvailabilityMeta({ hasLocation, isDark: Boolean(theme.dark), productCount });
  const operationalNote = hasLocation
    ? `${openedLabel} • ${coordinatesLabel}`
    : `${openedLabel} • Agrega la ubicación para completar la presencia operativa.`;

  return (
    <View style={[styles.cardCell, numColumns > 1 ? styles.cardCellMultiColumn : null]}>
      <Card
        mode="elevated"
        onPress={() => onOpen?.(tienda)}
        style={[
          styles.storeCard,
          isCompactCard ? styles.storeCardCompact : null,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <View style={[styles.storeHeroCard, isCompactCard ? styles.storeHeroCardCompact : null]}>
          <MapaTiendaCardBackground fill tienda={tienda}>
            <View
              pointerEvents="none"
              style={[
                styles.storeHeroTint,
                {
                  backgroundColor: theme.dark ? "rgba(9, 14, 32, 0.34)" : "rgba(56, 33, 102, 0.14)",
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.storeHeroFade,
                {
                  backgroundColor: theme.dark ? "rgba(2, 6, 23, 0.74)" : "rgba(255, 255, 255, 0.8)",
                },
              ]}
            />
            <View pointerEvents="none" style={styles.storeHeroGlowWrap}>
              <View style={[styles.storeHeroGlow, { backgroundColor: palette.brandSoft }]} />
            </View>

            <View style={styles.storeHeroContent}>
              <View style={styles.mediaHeaderRow}>
                <View
                  style={[
                    styles.stateBadge,
                    {
                      backgroundColor: availabilityMeta.badgeBackground,
                      borderColor: availabilityMeta.badgeBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={availabilityMeta.badgeColor}
                    name={availabilityMeta.badgeIcon}
                    size={16}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ color: availabilityMeta.badgeColor }}
                    variant="labelMedium"
                  >
                    {availabilityMeta.badgeLabel}
                  </Text>
                </View>
                <Menu
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      iconColor={theme.dark ? "#ffffff" : palette.brandStrong}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        setMenuVisible(true);
                      }}
                      style={[
                        styles.menuTrigger,
                        {
                          backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.84)",
                          borderColor: theme.dark ? "rgba(255, 255, 255, 0.14)" : "rgba(103, 58, 183, 0.14)",
                        },
                      ]}
                    />
                  }
                  contentStyle={[
                    styles.menuContent,
                    {
                      backgroundColor: palette.menu,
                      borderColor: palette.border,
                    },
                  ]}
                  onDismiss={() => setMenuVisible(false)}
                  visible={menuVisible}
                >
                  <Menu.Item
                    leadingIcon="pencil-outline"
                    onPress={() => {
                      setMenuVisible(false);
                      onEdit?.(tienda);
                    }}
                    title="Editar tienda"
                  />
                  <Menu.Item
                    leadingIcon="delete-outline"
                    onPress={() => {
                      setMenuVisible(false);
                      onDelete?.(tienda);
                    }}
                    title="Eliminar tienda"
                  />
                </Menu>
              </View>

              <View style={styles.contentFooter}>
                <View
                  style={[
                    styles.copyBlock,
                    {
                      backgroundColor: "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.eyebrowChip,
                      {
                        backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.72)",
                        borderColor: theme.dark ? "rgba(255, 255, 255, 0.1)" : "rgba(103, 58, 183, 0.1)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons color={accentColor} name={signature.icon} size={14} />
                    <Text style={{ color: palette.brandStrong }} variant="labelSmall">
                      {signature.label}
                    </Text>
                  </View>



                  <View style={styles.footerMetaRow}>
                    <View style={styles.titleBlock}>
                      <Text numberOfLines={2} style={[styles.titleText, { color: palette.title }]} variant="headlineSmall">
                        {tienda?.title || "Tienda"}
                      </Text>
                      <Text
                        numberOfLines={3}
                        style={[styles.descriptionText, { color: theme.dark ? "rgba(248, 250, 252, 0.88)" : palette.copy }]}
                        variant="bodyMedium"
                      >
                        {descripcion}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priceChip,
                        styles.priceChipLarge,
                        {
                          backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.76)" : "rgba(255, 255, 255, 0.86)",
                          borderColor: theme.dark ? "rgba(255, 255, 255, 0.1)" : "rgba(103, 58, 183, 0.14)",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons color={palette.brandStrong} name="shopping-outline" size={18} />
                      <Text style={[styles.priceText, { color: palette.brandStrong }]} variant="titleMedium">
                        {productCount} producto{productCount === 1 ? "" : "s"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.availabilityCard,
                        {
                          backgroundColor: availabilityMeta.panelBackground,
                          borderColor: availabilityMeta.panelBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.availabilityLabel, { color: availabilityMeta.panelColor }]} variant="labelSmall">
                        Estado comercial
                      </Text>
                      <Text style={[styles.availabilityValue, { color: availabilityMeta.panelColor }]} variant="titleSmall">
                        {availabilityMeta.summaryValue}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.notePanel,
                      {
                        backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.62)" : "rgba(255, 255, 255, 0.72)",
                        borderColor: theme.dark ? "rgba(255, 255, 255, 0.08)" : "rgba(103, 58, 183, 0.1)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons color={palette.icon} name={hasLocation ? "map-marker-radius-outline" : "map-marker-off-outline"} size={15} />
                    <Text numberOfLines={2} style={{ color: palette.title, flex: 1 }} variant="bodySmall">
                      {operationalNote}
                    </Text>
                  </View>

                  {/* <View style={styles.storeCtaRow}>
                    <Text style={[styles.storeHintText, { color: palette.copy }]} variant="bodySmall">
                      {availabilityMeta.summaryHint}
                    </Text>
                    <MaterialCommunityIcons color={palette.brandStrong} name="chevron-right" size={20} />
                  </View> */}
                </View>
              </View>
            </View>
          </MapaTiendaCardBackground>
        </View>
      </Card>
    </View>
  );
};

const MisTiendasScreen = ({ onOpenDrawer }) => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { contentMaxWidth, horizontalPadding } = useMemo(() => getEmpresaScreenMetrics(width), [width]);
  const numColumns = getStoreGridColumns(width);
  const isCompactHeader = width < 430;

  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const dataReady = useDeferredScreenData();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeForm, setStoreForm] = useState({
    descripcion: "",
    location: null,
    title: "",
  });

  const storeFields = useMemo(
    () => ({
      _id: 1,
      cordenadas: 1,
      coordenadas: 1,
      createdAt: 1,
      descripcion: 1,
      idUser: 1,
      pinColor: 1,
      title: 1,
    }),
    [],
  );

  const { productCounts, ready, tiendas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { productCounts: {}, ready: false, tiendas: [] };
    }

    if (!currentUserId) {
      return { productCounts: {}, ready: true, tiendas: [] };
    }

    const tiendasHandle = Meteor.subscribe("tiendas", { idUser: currentUserId }, { fields: storeFields });
    const tiendasResult = TiendasComercioCollection.find(
      { idUser: currentUserId },
      { fields: storeFields, sort: { createdAt: -1, title: 1 } },
    ).fetch();
    const tiendaIds = tiendasResult.map((tienda) => tienda._id);

    const productosHandle = tiendaIds.length
      ? Meteor.subscribe("productosComercio", { idTienda: { $in: tiendaIds } }, { fields: { _id: 1, idTienda: 1 } })
      : null;

    const productCountsResult = {};

    if (tiendaIds.length && productosHandle?.ready()) {
      ProductosComercioCollection.find(
        { idTienda: { $in: tiendaIds } },
        { fields: { _id: 1, idTienda: 1 } },
      )
        .fetch()
        .forEach((producto) => {
          const tiendaId = producto?.idTienda;

          if (!tiendaId) {
            return;
          }

          productCountsResult[tiendaId] = (productCountsResult[tiendaId] || 0) + 1;
        });
    }

    return {
      productCounts: productCountsResult,
      ready: tiendasHandle.ready() && (!tiendaIds.length || productosHandle?.ready()),
      tiendas: tiendasResult,
    };
  }, [currentUserId, dataReady, storeFields]);

  const visibleTiendas = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return tiendas;
    }

    return tiendas.filter((tienda) => {
      const haystack = `${tienda?.title || ""} ${tienda?.descripcion || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, tiendas]);

  const totalProducts = useMemo(
    () => Object.values(productCounts).reduce((sum, value) => sum + Number(value || 0), 0),
    [productCounts],
  );
  const listShellStyle = useMemo(
    () => [styles.listShell, contentMaxWidth ? { maxWidth: contentMaxWidth } : null],
    [contentMaxWidth],
  );
  const singleColumnCardStyle = numColumns === 1 && contentMaxWidth
    ? { alignSelf: "center", maxWidth: contentMaxWidth, width: "100%" }
    : null;

  const resetForm = () => {
    setEditingStore(null);
    setStoreForm({ descripcion: "", location: null, title: "" });
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogVisible(true);
  };

  const openEditDialog = (tienda) => {
    setEditingStore(tienda);
    setStoreForm({
      descripcion: tienda?.descripcion || "",
      location: normalizeCoordinates(tienda?.coordenadas || tienda?.cordenadas),
      title: tienda?.title || "",
    });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialogVisible(false);
    resetForm();
  };

  const handleSubmitStore = () => {
    const title = storeForm.title.trim();
    const descripcion = storeForm.descripcion.trim();

    if (title.length < 3) {
      Alert.alert("Nombre incompleto", "Escribe un nombre más descriptivo para identificar la tienda.");
      return;
    }

    if (descripcion.length < 8) {
      Alert.alert(
        "Descripción incompleta",
        "Agrega una descripción breve para que la tienda se entienda mejor dentro del catálogo.",
      );
      return;
    }

    const coordinates = normalizeCoordinates(storeForm.location);
    setSaving(true);

    if (editingStore?._id) {
      Meteor.call(
        "tiendas.update",
        {
          tiendaId: editingStore._id,
          updates: {
            coordenadas: coordinates,
            descripcion,
            title,
          },
        },
        (error, result) => {
          setSaving(false);

          const message = getMethodResultMessage(error, result);

          if (message) {
            Alert.alert("No se pudo actualizar la tienda", message);
            return;
          }

          closeDialog();
        },
      );
      return;
    }

    Meteor.call(
      "addEmpresa",
      {
        coordenadas: coordinates,
        descripcion,
        idUser: currentUserId,
        pinColor: theme.colors.primary,
        title,
      },
      (error, result) => {
        setSaving(false);

        const message = getMethodResultMessage(error, result);

        if (message) {
          Alert.alert("No se pudo crear la tienda", message);
          return;
        }

        closeDialog();
      },
    );
  };

  const handleDeleteStore = (tienda) => {
    Alert.alert(
      "Eliminar tienda",
      "Se eliminará la tienda junto con su catálogo asociado. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            Meteor.call("removeTienda", tienda?._id, (error, result) => {
              const message = getMethodResultMessage(error, result);

              if (message) {
                Alert.alert("No se pudo eliminar la tienda", message);
              }
            });
          },
        },
      ],
    );
  };

  const handleOpenStore = (tienda) => {
    router.push({
      pathname: "/(empresa)/TiendaDetail",
      params: { tiendaId: tienda?._id },
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const renderHeader = () => (
    <View style={[styles.headerContent, isCompactHeader ? styles.headerContentCompact : null]}>
      <Surface
        style={[
          styles.heroCard,
          isCompactHeader ? styles.heroCardCompact : null,
          {
            backgroundColor: palette.hero,
            borderColor: palette.border,
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <View style={styles.heroCopy}>
          <Text style={{ color: palette.title }} variant="headlineSmall">
            Tus tiendas activas
          </Text>
          <Text style={{ color: palette.copy }} variant="bodyMedium">
            Crea nuevas sedes, mantén actualizada su ubicación y entra a cada tienda para administrar productos y pedidos.
          </Text>
        </View>

        <View style={[styles.heroMetricsRow, isCompactHeader ? styles.heroMetricsRowCompact : null]}>
          <Surface
            style={[
              styles.metricCard,
              isCompactHeader ? styles.metricCardCompact : null,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: palette.title }} variant={isCompactHeader ? "titleMedium" : "titleLarge"}>
              {tiendas.length}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              Tiendas
            </Text>
          </Surface>
          <Surface
            style={[
              styles.metricCard,
              isCompactHeader ? styles.metricCardCompact : null,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: palette.title }} variant={isCompactHeader ? "titleMedium" : "titleLarge"}>
              {totalProducts}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              Productos
            </Text>
          </Surface>
          <Surface
            style={[
              styles.metricCard,
              isCompactHeader ? styles.metricCardCompact : null,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: palette.title }} variant={isCompactHeader ? "titleMedium" : "titleLarge"}>
              {visibleTiendas.length}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              Visibles
            </Text>
          </Surface>
        </View>
      </Surface>

      <TextInput
        activeOutlineColor={palette.brand}
        dense
        left={<TextInput.Icon color={palette.muted} icon="magnify" />}
        mode="outlined"
        onChangeText={setSearchQuery}
        outlineColor={palette.borderStrong}
        placeholder="Buscar por nombre o descripción"
        style={[
          styles.searchInput,
          isCompactHeader ? styles.searchInputCompact : null,
          { backgroundColor: palette.input },
        ]}
        textColor={palette.title}
        theme={{ colors: { onSurfaceVariant: palette.muted } }}
        value={searchQuery}
      />
    </View>
  );

  const renderEmpty = () => {
    if (!ready) {
      return null;
    }

    if (!tiendas.length) {
      return (
        <Surface style={[styles.emptyStateCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
          <MaterialCommunityIcons color={palette.brandStrong} name="storefront-outline" size={44} />
          <Text style={{ color: palette.title }} variant="headlineSmall">
            Crea tu primera tienda
          </Text>
          <Text style={[styles.emptyStateCopy, { color: palette.copy }]} variant="bodyMedium">
            Registra la información principal de la tienda y su ubicación para empezar a publicar productos y atender pedidos.
          </Text>
          <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={openCreateDialog} textColor={palette.brandStrong}>
            Crear tienda
          </Button>
        </Surface>
      );
    }

    return (
      <Surface style={[styles.emptyStateCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
        <MaterialCommunityIcons color={palette.brandStrong} name="text-search" size={42} />
        <Text style={{ color: palette.title }} variant="headlineSmall">
          No encontramos coincidencias
        </Text>
        <Text style={[styles.emptyStateCopy, { color: palette.copy }]} variant="bodyMedium">
          Ajusta el texto de búsqueda para ver otras tiendas registradas.
        </Text>
      </Surface>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        onOpenDrawer={onOpenDrawer}
        rightActions={<IconButton icon="plus" onPress={openCreateDialog} />}
        subtitle="Tiendas y sucursales"
        title="Mis tiendas"
      />

      <FlatList
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        data={visibleTiendas}
        key={numColumns}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <View style={singleColumnCardStyle}>
            <StoreCard
              numColumns={numColumns}
              onDelete={handleDeleteStore}
              onEdit={openEditDialog}
              onOpen={handleOpenStore}
              productCount={productCounts[item._id] || 0}
              tienda={item}
            />
          </View>
        )}
        style={listShellStyle}
      />

      {!visibleTiendas.length && tiendas.length ? null : (
        <FAB icon="plus" label="Nueva tienda" onPress={openCreateDialog} style={[styles.fab, { backgroundColor: palette.brand }]} />
      )}

      <Portal>
        <Dialog
          dismissable={!saving}
          onDismiss={closeDialog}
          style={[styles.dialog, { backgroundColor: palette.card, borderColor: palette.border }]}
          visible={dialogVisible}
        >
          <Dialog.Title>{editingStore ? "Editar tienda" : "Nueva tienda"}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <View style={styles.dialogContent}>
              <TextInput
                activeOutlineColor={palette.brand}
                label="Nombre de la tienda"
                mode="outlined"
                onChangeText={(value) => setStoreForm((current) => ({ ...current, title: value }))}
                outlineColor={palette.borderStrong}
                style={[styles.dialogInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={storeForm.title}
              />
              <TextInput
                activeOutlineColor={palette.brand}
                label="Descripción"
                mode="outlined"
                multiline
                numberOfLines={4}
                onChangeText={(value) => setStoreForm((current) => ({ ...current, descripcion: value }))}
                outlineColor={palette.borderStrong}
                style={[styles.dialogInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={storeForm.descripcion}
              />
              <LocationPicker
                initialLocation={storeForm.location}
                onLocationChange={(location) => setStoreForm((current) => ({ ...current, location }))}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button disabled={saving} onPress={closeDialog}>
              Cancelar
            </Button>
            <Button loading={saving} onPress={handleSubmitStore}>
              {editingStore ? "Guardar" : "Crear"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardCell: {
    width: "100%",
  },
  cardCellMultiColumn: {
    flex: 1,
  },
  columnWrapper: {
    gap: 16,
  },
  dialogContent: {
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dialogScrollArea: {
    maxHeight: 540,
  },
  emptyStateCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyStateCopy: {
    opacity: 0.8,
    textAlign: "center",
  },
  fab: {
    bottom: 20,
    position: "absolute",
    right: 20,
  },
  headerContent: {
    gap: 16,
    marginBottom: 8,
  },
  headerContentCompact: {
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  heroCardCompact: {
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroCopy: {
    gap: 8,
  },
  heroMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroMetricsRowCompact: {
    gap: 10,
  },
  listShell: {
    alignSelf: "center",
    width: "100%",
  },
  listContent: {
    flexGrow: 1,
    gap: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  menuContent: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  overlayMenuButton: {
    margin: 0,
  },
  screen: {
    flex: 1,
  },
  storeCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  storeCardCompact: {
    borderRadius: 22,
  },
  storeHeroCard: {
    minHeight: 358,
    position: "relative",
  },
  storeHeroCardCompact: {
    minHeight: 342,
  },
  storeHeroFade: {
    ...StyleSheet.absoluteFillObject,
    top: "44%",
  },
  storeHeroGlow: {
    borderRadius: 88,
    height: 176,
    opacity: 0.78,
    position: "absolute",
    right: -60,
    top: 18,
    width: 176,
  },
  storeHeroGlowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  storeHeroTint: {
    ...StyleSheet.absoluteFillObject,
  },
  storeHeroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  mediaHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
  menuTrigger: {
    borderRadius: 16,
    borderWidth: 1,
    margin: 0,
  },
  eyebrowChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contentFooter: {
    // gap: 14,
  },
  copyBlock: {
    gap: 8,
  },
  titleBlock: {
    gap: 6,
    minHeight: 106,
  },
  titleText: {
    fontWeight: "700",
  },
  descriptionText: {
    lineHeight: 21,
    minHeight: 63,
  },
  footerMetaRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  availabilityLabel: {
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  availabilityValue: {
    fontWeight: "700",
  },
  priceChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceChipLarge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceText: {
    fontWeight: "700",
  },
  availabilityCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notePanel: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeCtaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  storeHintText: {
    flex: 1,
    lineHeight: 18,
  },
  stateBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "76%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    flex: 1,
    flexBasis: 0,
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  metricCardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: "transparent",
  },
  searchInputCompact: {
    minHeight: 52,
  },
});

export default MisTiendasScreen;