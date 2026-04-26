import { useMemo, useState } from "react";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { Appbar, Button, FAB, Surface, Text, TextInput, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import { ProductosComercioCollection, TiendasComercioCollection } from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import EmptyProductos from "../components/EmptyProductos.native";
import ProductoCard from "../components/ProductoCard.native";
import TiendaHeader from "../components/TiendaHeader.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const getFirstParam = (value) => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
};

const parseJsonParam = (value) => {
  const raw = getFirstParam(value);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getGridColumns = (width) => {
  if (width >= 1040) {
    return 2;
  }

  return 1;
};

const TIENDA_DETAIL_STORE_FIELDS = {
  _id: 1,
  cordenadas: 1,
  coordenadas: 1,
  descripcion: 1,
  title: 1,
};

const TIENDA_DETAIL_PRODUCT_FIELDS = {
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

const TiendaDetailScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { contentMaxWidth, horizontalPadding } = useMemo(() => getEmpresaScreenMetrics(width), [width]);
  const numColumns = getGridColumns(width);
  const compactCards = numColumns > 1 || width < 680;
  const params = useLocalSearchParams();
  const routeTiendaId = getFirstParam(params.tiendaId);
  const parsedTienda = parseJsonParam(params.tienda);
  const tiendaId = routeTiendaId || parsedTienda?._id || "";

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dataReady = useDeferredScreenData();

  const { productos, ready, tienda } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { productos: [], ready: false, tienda: parsedTienda || null };
    }

    if (!tiendaId) {
      return { productos: [], ready: true, tienda: parsedTienda || null };
    }

    const tiendasHandle = Meteor.subscribe("tiendas", { _id: tiendaId }, {
      fields: TIENDA_DETAIL_STORE_FIELDS,
    });
    const productosHandle = Meteor.subscribe(
      "productosComercio",
      { idTienda: tiendaId },
      { fields: TIENDA_DETAIL_PRODUCT_FIELDS },
    );

    return {
      productos: ProductosComercioCollection.find(
        { idTienda: tiendaId },
        { fields: TIENDA_DETAIL_PRODUCT_FIELDS, sort: { createdAt: -1, name: 1 } },
      ).fetch(),
      ready: tiendasHandle.ready() && productosHandle.ready(),
      tienda:
        TiendasComercioCollection.findOne(
          { _id: tiendaId },
          { fields: TIENDA_DETAIL_STORE_FIELDS },
        ) ||
        parsedTienda ||
        null,
    };
  }, [dataReady, parsedTienda, tiendaId]);

  const visibleProductos = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return productos;
    }

    return productos.filter((producto) => {
      const haystack = `${producto?.name || ""} ${producto?.descripcion || ""} ${producto?.comentario || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [productos, searchQuery]);
  const listShellStyle = useMemo(
    () => [styles.listShell, contentMaxWidth ? { maxWidth: contentMaxWidth } : null],
    [contentMaxWidth],
  );
  const singleColumnCardStyle = numColumns === 1 && contentMaxWidth
    ? { alignSelf: "center", maxWidth: contentMaxWidth, width: "100%" }
    : null;

  const handleCreateProduct = () => {
    router.push({
      pathname: "/(empresa)/ProductoForm",
      params: { tiendaId },
    });
  };

  const handleEditProduct = (producto) => {
    router.push({
      pathname: "/(empresa)/ProductoForm",
      params: {
        productoId: producto?._id,
        tiendaId,
      },
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.headerContent}>
        <TiendaHeader productosCount={productos.length} tienda={tienda} />
        <Surface
          style={[
            styles.summaryCard,
            {
              backgroundColor: palette.hero,
              borderColor: palette.border,
              shadowColor: palette.shadowColor,
            },
          ]}
        >
          <View style={styles.summaryCopy}>
            <Text style={{ color: palette.title }} variant="titleMedium">
              Catálogo de la tienda
            </Text>
            <Text style={{ color: palette.copy }} variant="bodyMedium">
              Mantén actualizada la disponibilidad, el precio y la información visible de cada producto.
            </Text>
          </View>
          <View style={styles.summaryMeta}>
            <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
              <Text style={{ color: palette.title }} variant="titleLarge">
                {productos.length}
              </Text>
              <Text style={{ color: palette.muted }} variant="bodySmall">
                Total
              </Text>
            </Surface>
            <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
              <Text style={{ color: palette.title }} variant="titleLarge">
                {visibleProductos.length}
              </Text>
              <Text style={{ color: palette.muted }} variant="bodySmall">
                Visibles
              </Text>
            </Surface>
          </View>
        </Surface>
        <TextInput
          activeOutlineColor={palette.brand}
          left={<TextInput.Icon color={palette.muted} icon="magnify" />}
          mode="outlined"
          onChangeText={setSearchQuery}
          outlineColor={palette.borderStrong}
          placeholder="Buscar producto, descripción o comentario"
          style={[styles.searchInput, { backgroundColor: palette.input }]}
          textColor={palette.title}
          theme={{ colors: { onSurfaceVariant: palette.muted } }}
          value={searchQuery}
        />
      </View>
    ),
    [
      palette.border,
      palette.borderStrong,
      palette.brand,
      palette.cardSoft,
      palette.copy,
      palette.hero,
      palette.input,
      palette.muted,
      palette.shadowColor,
      palette.title,
      productos.length,
      searchQuery,
      tienda,
      visibleProductos.length,
    ],
  );

  const renderEmpty = () => {
    if (!ready) {
      return null;
    }

    if (!tienda) {
      return (
        <Surface style={[styles.emptyStateCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <MaterialCommunityIcons color={palette.brandStrong} name="storefront-remove-outline" size={44} />
          <Text style={{ color: palette.title }} variant="headlineSmall">
            No encontramos la tienda
          </Text>
          <Text style={[styles.emptyStateCopy, { color: palette.copy }]} variant="bodyMedium">
            La tienda ya no está disponible o la ruta no recibió un identificador válido.
          </Text>
          <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={() => router.replace("/(empresa)/MisTiendas")} textColor={palette.brandStrong}>
            Volver a mis tiendas
          </Button>
        </Surface>
      );
    }

    return <EmptyProductos onCreate={handleCreateProduct} />;
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        backHref="/(empresa)/MisTiendas"
        rightActions={<Appbar.Action icon="plus" onPress={handleCreateProduct} />}
        subtitle={tienda?.title || "Detalle de tienda"}
        title="Productos"
      />

      <FlatList
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={listHeader}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        data={visibleProductos}
        key={numColumns}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.productCell,
              numColumns > 1 ? styles.productCellMultiColumn : null,
              singleColumnCardStyle,
            ]}
          >
            <ProductoCard compact={compactCards} onEdit={handleEditProduct} producto={item} />
          </View>
        )}
        style={listShellStyle}
      />

      {tienda ? (
        <FAB
          icon="plus"
          label="Agregar producto"
          onPress={handleCreateProduct}
          style={[styles.fab, { backgroundColor: palette.brand }]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomButton: {
    alignSelf: "flex-end",
    bottom: 18,
    position: "absolute",
    right: 18,
  },
  columnWrapper: {
    gap: 16,
  },
  emptyStateCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyStateCopy: {
    opacity: 0.82,
    textAlign: "center",
  },
  headerContent: {
    gap: 16,
    marginBottom: 20,
  },
  listContent: {
    flexGrow: 1,
    gap: 16,
    paddingTop: 8,
    paddingBottom: 94,
  },
  listShell: {
    alignSelf: "center",
    width: "100%",
  },
  metricCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  productCell: {
    width: "100%",
  },
  productCellMultiColumn: {
    flex: 1,
  },
  fab: {
    bottom: 18,
    position: "absolute",
    right: 18,
  },
  screen: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: "transparent",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  summaryCopy: {
    gap: 8,
  },
  summaryMeta: {
    flexDirection: "row",
    gap: 12,
  },
});

export default TiendaDetailScreen;