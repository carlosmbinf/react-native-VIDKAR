import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";

import { Meteor } from "../../services/meteor/client.native";
import { ProductosComercioCollection, TiendasComercioCollection } from "../collections/collections";
import ProductoCard from "../productos/ProductoCard.native";

const PLAYBACK_TYPES = new Set(["episode", "lesson"]);
const PRODUCT_FIELDS = { _id: 1, name: 1, descripcion: 1, count: 1, precio: 1, monedaPrecio: 1, productoDeElaboracion: 1, idTienda: 1, comentario: 1 };

export function SearchCommerceProductCard({ productId }) {
  const { product, store, loading } = Meteor.useTracker(() => {
    const selector = { _id: productId };
    const productHandle = Meteor.subscribe("productosComercio", selector, { fields: PRODUCT_FIELDS });
    const product = ProductosComercioCollection.findOne(selector, { fields: PRODUCT_FIELDS });
    const storeHandle = product?.idTienda ? Meteor.subscribe("tiendas", { _id: product.idTienda }, { fields: { _id: 1, title: 1 } }) : null;
    return {
      product,
      store: product?.idTienda ? TiendasComercioCollection.findOne({ _id: product.idTienda }, { fields: { _id: 1, title: 1 } }) : null,
      loading: !productHandle.ready() || Boolean(storeHandle && !storeHandle.ready()),
    };
  }, [productId]);
  if (loading) return <ActivityIndicator style={{ padding: 20 }} />;
  if (!product) return <Text>Este producto ya no está disponible.</Text>;
  return <ProductoCard producto={product} tienda={store} />;
}

export default function SiriSearchResultCard({ item, onOpen, onPlay }) {
  const productId = item.cardData?.source === "COMERCIO" ? item.cardData.productId
    : item.type === "product" && item.id?.startsWith("COMERCIO:") ? item.id.slice("COMERCIO:".length) : null;
  if (item.type === "product" && productId) return <SearchCommerceProductCard productId={productId} />;
  return (
    <View style={styles.result}>
      <Card mode="outlined">
        {item.imageUrl ? <Card.Cover source={{ uri: item.imageUrl }} accessibilityLabel={`Imagen de ${item.title || "contenido"}`} /> : null}
        <Card.Content style={styles.body}>
          <Text variant="labelSmall">{String(item.type || "").toUpperCase()}</Text>
          <Text selectable variant="titleMedium">{item.title || "VIDKAR"}</Text>
          {item.subtitle ? <Text selectable variant="bodyMedium">{item.subtitle}</Text> : null}
          {item.description ? <Text selectable variant="bodySmall" numberOfLines={3}>{item.description}</Text> : null}
          <Button compact onPress={() => onOpen(item)}>Abrir en VIDKAR</Button>
        </Card.Content>
      </Card>
      {PLAYBACK_TYPES.has(item.type) ? <Button compact onPress={() => onPlay(item)}>Reproducir…</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  result: { gap: 6 },
  body: { gap: 6 },
});
