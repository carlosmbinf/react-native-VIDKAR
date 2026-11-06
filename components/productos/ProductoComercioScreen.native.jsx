import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";
import { ProductosComercioCollection, TiendasComercioCollection } from "../collections/collections";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import useSafeBack from "../navigation/useSafeBack";
import AddToCartDialog from "./AddToCartDialog";
import { clearCommerceZoomSnapshot, getCommerceZoomSnapshot } from "./commerceZoomSnapshot";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (MeteorBase);
const PRODUCT_FIELDS = {
  _id: 1, name: 1, descripcion: 1, count: 1, precio: 1, monedaPrecio: 1,
  productoDeElaboracion: 1, idTienda: 1, comentario: 1,
};

export default function ProductoComercioScreen() {
  const params = useLocalSearchParams();
  const productId = typeof params.productId === "string" ? params.productId : "";
  const reducedMotion = useSystemReducedMotion();
  const zoomEnabled = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 18 && !reducedMotion;
  const [snapshot] = useState(() => zoomEnabled ? getCommerceZoomSnapshot(productId) : null);
  const safeBack = useSafeBack("/(normal)/Main");
  const headerInset = useAppHeaderContentInset();
  const theme = useTheme();

  useEffect(() => {
    clearCommerceZoomSnapshot(snapshot);
  }, [snapshot]);

  const { producto, tienda, ready } = Meteor.useTracker(() => {
    if (!productId) return { producto: null, tienda: null, ready: true };
    const handle = Meteor.subscribe("productosComercio", { _id: productId }, { fields: PRODUCT_FIELDS });
    const product = ProductosComercioCollection.findOne({ _id: productId }, { fields: PRODUCT_FIELDS });
    const storeHandle = product?.idTienda
      ? Meteor.subscribe("tiendas", { _id: product.idTienda }, { fields: { _id: 1, title: 1 } })
      : null;
    return {
      producto: product,
      tienda: product?.idTienda ? TiendasComercioCollection.findOne({ _id: product.idTienda }) : null,
      ready: handle.ready() && (!storeHandle || storeHandle.ready()),
    };
  }, [productId]);

  if (!productId || (ready && !producto)) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Producto de comercio" backHref="/(normal)/Main" overlapContent showBackButton />
        <View style={[styles.state, { paddingTop: headerInset }]}>
          <Text variant="titleMedium">{productId ? "Este producto ya no está disponible." : "No se recibió un producto válido."}</Text>
          <Button mode="contained" onPress={safeBack}>Volver</Button>
        </View>
      </View>
    );
  }

  return (
    <AddToCartDialog
      key={productId}
      initialVisual={snapshot?.productId === productId ? snapshot.visual : undefined}
      onDismiss={safeBack}
      productId={productId}
      producto={ready ? producto : null}
      tienda={ready ? tienda : null}
      zoomEnabled={zoomEnabled}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: { alignItems: "center", flex: 1, gap: 16, justifyContent: "center", paddingHorizontal: 24 },
});
