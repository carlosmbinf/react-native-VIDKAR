import MeteorBase from "@meteorrn/core";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Surface, Text, useTheme } from "react-native-paper";

import {
  ProductosComercioCollection,
  SeleccionesCatalogoCollection,
} from "../collections/collections";
import {
  COMMERCE_CATEGORY_SELECTION_LIMIT,
  getCommerceCategorySelectionProducts,
} from "../../services/commerceProductCatalog";
import ProductoCard from "./ProductoCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PRODUCT_FIELDS = {
  "mercadoLibre.status": 1,
  _id: 1,
  count: 1,
  createdAt: 1,
  descripcion: 1,
  idCategoria: 1,
  idTienda: 1,
  monedaPrecio: 1,
  name: 1,
  precio: 1,
  productoDeElaboracion: 1,
};

const getStoreScopeKey = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(36);
};

const ComercioCategorySelectionNative = ({
  category,
  onSeeAll,
  searchQuery = "",
  storeIds = [],
  storesById,
}) => {
  const theme = useTheme();
  const instanceId = React.useId();
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState(null);
  const ownerId = String(category.creadaPor || "");
  const categoryStoreIds = useMemo(
    () => storeIds.filter((storeId) =>
      String(storesById.get(String(storeId))?.idUser || "") === ownerId,
    ),
    [ownerId, storeIds, storesById],
  );
  const storeKey = useMemo(
    () => [...new Set(categoryStoreIds.map(String).filter(Boolean))].sort().join("|"),
    [categoryStoreIds],
  );
  const selectionKey = `${instanceId}-${getStoreScopeKey(storeKey)}-${revision}`;
  const selectedStoreIds = useMemo(
    () => storeKey ? storeKey.split("|") : [],
    [storeKey],
  );
  const state = Meteor.useTracker(() => {
    if (!ownerId || !category.id || !selectedStoreIds.length) {
      return { products: [], loading: false };
    }

    const handle = Meteor.subscribe(
      "comercio.productosSeleccionCategoria",
      ownerId,
      String(category.id),
      selectionKey,
      selectedStoreIds,
    );
    const selection = SeleccionesCatalogoCollection.findOne(selectionKey);
    const productIds = Array.isArray(selection?.productIds) ? selection.productIds : [];
    const products = productIds.length
      ? ProductosComercioCollection.find({
          "mercadoLibre.status": { $ne: "paused" },
          _id: { $in: productIds },
          idTienda: { $in: selectedStoreIds },
        }, { fields: PRODUCT_FIELDS }).fetch()
      : [];

    return {
      loading: !handle.ready(),
      products: getCommerceCategorySelectionProducts(products, productIds)
        .map((producto) => ({
          producto,
          tienda: storesById.get(String(producto.idTienda)),
        }))
        .filter(({ tienda }) => Boolean(tienda)),
    };
  }, [ownerId, category.id, selectedStoreIds, selectionKey, storeKey, storesById]);

  React.useEffect(() => {
    if (!state.loading) return undefined;
    const timer = setTimeout(() => {
      setFailure({
        key: selectionKey,
        message: "No se pudo cargar esta selección. Comprueba la conexión e inténtalo de nuevo.",
      });
    }, 20000);
    return () => clearTimeout(timer);
  }, [selectionKey, state.loading]);

  const error = state.loading && failure?.key === selectionKey ? failure.message : "";
  const unavailableOwner = !ownerId;
  const refreshSelection = () => {
    setFailure(null);
    setRevision((current) => current + 1);
  };

  // No desmontar la suscripción: una selección vacía puede recibir productos después.
  if (!state.loading && !state.products.length) return null;

  return (
    <Surface elevation={0} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitle}>
          <Text numberOfLines={2} style={[styles.title, { color: theme.colors.onSurface }]} variant="titleMedium">
            {category.nombre || category.label}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
            Una selección para descubrir, incluyendo sus subcategorías.
          </Text>
        </View>
        <View style={styles.categoryActions}>
          <Chip compact mode="outlined">
            {state.loading
              ? `Hasta ${COMMERCE_CATEGORY_SELECTION_LIMIT} productos`
              : `${state.products.length} productos`}
          </Chip>
          <Button
            compact
            disabled={!selectedStoreIds.length || unavailableOwner || (state.loading && !error)}
            icon="shuffle-variant"
            onPress={refreshSelection}
          >
            {error ? "Reintentar" : "Otra selección"}
          </Button>
          <Button compact onPress={onSeeAll}>
            Ver categoría
          </Button>
        </View>
      </View>

      {error ? (
        <Text selectable style={{ color: theme.colors.error }} variant="bodySmall">
          {error}
        </Text>
      ) : state.loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator animating size="small" />
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
            Cargando selección aleatoria…
          </Text>
        </View>
      ) : (
        <FlatList
          accessibilityLabel={`Productos aleatorios de ${category.nombre || category.label}`}
          contentContainerStyle={styles.productsContent}
          data={state.products}
          horizontal
          keyExtractor={({ producto }) => String(producto._id)}
          renderItem={({ item }) => (
            <ProductoCard
              producto={item.producto}
              searchQuery={searchQuery}
              tienda={item.tienda}
            />
          )}
          showsHorizontalScrollIndicator={false}
          windowSize={5}
        />
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  categoryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  categoryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  categorySection: {
    backgroundColor: "transparent",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  categoryTitle: {
    flex: 1,
    gap: 2,
    minWidth: 180,
  },
  loadingState: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsContent: {
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: "800",
  },
});

export default ComercioCategorySelectionNative;
