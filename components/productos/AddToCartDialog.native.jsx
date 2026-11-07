import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Divider,
  HelperText,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { ServiceEntrance, ServiceMotionProvider, ServiceScrollViewport } from "../motion/ServiceMotion";
import ProductImageCarousel from "./ProductImageCarousel";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const AddToCartDialogNative = ({ initialVisual, onDismiss, productId, producto, tienda, zoomEnabled }) => {
  const [cantidad, setCantidad] = useState("1");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [specifications, setSpecifications] = useState([]);
  const [loadingSpecifications, setLoadingSpecifications] = useState(false);
  const [specificationsError, setSpecificationsError] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const headerInset = useAppHeaderContentInset();
  const theme = useTheme();
  const user = Meteor.useTracker(() => Meteor.user());

  useEffect(() => {
    setCantidad("1");
    setComentario("");
  }, [productId]);

  useEffect(() => {
    let active = true;
    setSpecifications([]);
    setSpecificationsError(false);
    setLoadingSpecifications(Boolean(producto?._id));
    if (producto?._id) {
      Meteor.call("comercio.getProductSpecifications", producto._id, (error, result) => {
        if (!active) return;
        if (error || !Array.isArray(result)) {
          console.warn("No se pudieron cargar las características del producto.", error);
          setSpecificationsError(true);
        }
        setSpecifications(!error && Array.isArray(result) ? result : []);
        setLoadingSpecifications(false);
      });
    }
    return () => { active = false; };
  }, [producto?._id]);

  const cantidadNum = parseInt(cantidad, 10) || 0;
  const precioUnitario = Number(producto?.precio || 0);
  const precioTotal = (cantidadNum * precioUnitario).toFixed(2);
  const stockDisponible = producto?.productoDeElaboracion
    ? 999
    : producto?.count;
  const cantidadValida = Boolean(producto) && cantidadNum > 0 && cantidadNum <= stockDisponible;

  const handleAgregarAlCarrito = async () => {
    if (!cantidadValida) {
      Alert.alert(
        "Cantidad inválida",
        "Por favor, ingresa una cantidad válida.",
      );
      return;
    }

    if (!user) {
      Alert.alert(
        "Error",
        "Debes iniciar sesión para agregar productos al carrito.",
      );
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve, reject) => {
        Meteor.call(
          "addAlCarrito",
          user._id,
          producto._id,
          cantidadNum,
          false,
          comentario.trim(),
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          },
        );
      });

      Alert.alert(
        "¡Éxito!",
        `${cantidadNum} unidad${cantidadNum > 1 ? "es" : ""} de "${producto.name}" ${cantidadNum > 1 ? "fueron agregadas" : "fue agregada"} al carrito.`,
        [{ onPress: onDismiss, text: "ok" }],
      );
    } catch (error) {
      console.log("Error al agregar al carrito:", error);
      Alert.alert(
        "Información",
        error.reason ||
          "No se pudo agregar el producto al carrito. Intenta nuevamente mas tarde.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hero = (
        <View style={styles.productGalleryContainer}>
          <ProductImageCarousel
            initialVisual={initialVisual}
            productId={productId}
            resizeMode="cover"
            size={320}
            style={styles.productGallery}
          />
        </View>
  );

  return (
    <ServiceMotionProvider>
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Producto de comercio" onBack={onDismiss} overlapContent showBackButton />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "height" : undefined} style={styles.keyboardView}>
      <ServiceScrollViewport topInset={headerInset} bottomInset={footerHeight}>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: footerHeight + 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
      {zoomEnabled ? <Link.AppleZoomTarget>{hero}</Link.AppleZoomTarget> : hero}
      {producto ? (
      <>
      <View style={[styles.productoInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <ServiceEntrance>
        <Text style={styles.productoNombre} variant="titleMedium">
          {producto?.name || "Producto de comercio"}
        </Text>
        <Text style={styles.tiendaNombre} variant="bodySmall">
          📍 {tienda?.title || "Tienda"}
        </Text>
        {producto.descripcion ? <Text style={styles.description} variant="bodyMedium">{producto.descripcion}</Text> : null}
        </ServiceEntrance>
      </View>

      <View style={styles.content}>
      {loadingSpecifications || specificationsError || specifications.length > 0 ? (
        <View style={styles.section} accessibilityLiveRegion="polite">
          <Text style={styles.sectionLabel} variant="titleSmall">Características del producto</Text>
          {loadingSpecifications ? (
            <Text variant="bodySmall">Cargando características…</Text>
          ) : specificationsError ? (
            <Text variant="bodySmall">No se pudieron cargar las características.</Text>
          ) : specifications.map(({ label, value }) => (
            <View key={label} style={styles.specificationRow}>
              <Text style={styles.specificationLabel} variant="bodySmall">{label}</Text>
              <Text selectable style={styles.specificationValue} variant="bodySmall">{value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Divider style={styles.sectionDivider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel} variant="labelLarge">
          Cantidad
        </Text>

        <View style={styles.cantidadRow}>
          <IconButton
            disabled={cantidadNum <= 1 || loading}
            icon="minus"
            mode="contained-tonal"
            onPress={() => {
              const nueva = cantidadNum - 1;
              if (nueva > 0) {
                setCantidad(String(nueva));
              }
            }}
            size={20}
            style={styles.cantidadButton}
          />

          <TextInput
            dense
            disabled={loading}
            error={!cantidadValida && cantidad !== ""}
            keyboardType="number-pad"
            mode="outlined"
            onChangeText={setCantidad}
            style={styles.cantidadInput}
            value={cantidad}
          />

          <IconButton
            disabled={cantidadNum >= stockDisponible || loading}
            icon="plus"
            mode="contained-tonal"
            onPress={() => {
              const nueva = cantidadNum + 1;
              if (nueva <= stockDisponible) {
                setCantidad(String(nueva));
              }
            }}
            size={20}
            style={styles.cantidadButton}
          />
        </View>

        {!producto?.productoDeElaboracion ? (
          <HelperText type={cantidadValida ? "info" : "error"}>
            {cantidadValida
              ? `Stock disponible: ${stockDisponible}`
              : `Cantidad debe ser entre 1 y ${stockDisponible}`}
          </HelperText>
        ) : (
          <HelperText type="info">
            ⏱️ Producto de elaboración bajo pedido
          </HelperText>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel} variant="labelLarge">
          Comentarios (opcional)
        </Text>

        <TextInput
          disabled={loading}
          maxLength={200}
          mode="outlined"
          multiline
          numberOfLines={3}
          onChangeText={setComentario}
          placeholder="Ej: Sin cebolla, extra queso..."
          style={styles.comentarioInput}
          value={comentario}
        />

        <HelperText type="info">
          {comentario.length}/200 caracteres
        </HelperText>
      </View>

      <Divider style={styles.sectionDivider} />

      <View style={styles.precioResumen}>
        <View style={styles.precioRow}>
          <Text variant="bodyMedium">Precio unitario:</Text>
          <Text style={styles.precioValue} variant="bodyMedium">
            {precioUnitario.toFixed(2)} {producto?.monedaPrecio || "USD"}
          </Text>
        </View>

        <View style={styles.precioRow}>
          <Text variant="bodyMedium">Cantidad:</Text>
          <Text style={styles.precioValue} variant="bodyMedium">
            × {cantidadNum}
          </Text>
        </View>

        <Divider style={styles.totalDivider} />

        <View style={styles.precioRow}>
          <Text style={styles.precioTotalLabel} variant="titleMedium">
            Total:
          </Text>
          <Text
            style={[
              styles.precioTotalValue,
              { color: theme.colors.primary },
            ]}
            variant="titleLarge"
          >
            {precioTotal} {producto?.monedaPrecio || "USD"}
          </Text>
        </View>
      </View>
      </View>
      </>
      ) : <View style={styles.loadingState}><Text>Cargando producto...</Text></View>}
      </ScrollView>
      </ServiceScrollViewport>
      {producto ? (
        <View
          onLayout={({ nativeEvent }) => setFooterHeight(nativeEvent.layout.height)}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18), backgroundColor: theme.colors.surface }]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <BlurView intensity={22} tint="default" style={StyleSheet.absoluteFill} />
          </View>
          <View style={styles.footerSummary}>
            <Text variant="labelMedium">Total</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: "800" }} variant="titleMedium">
              {precioTotal} {producto.monedaPrecio || "USD"}
            </Text>
          </View>
          <View style={styles.drawerActions}>
            <Button disabled={loading} mode="outlined" onPress={onDismiss} style={styles.footerButton}>Cancelar</Button>
            <Button disabled={!cantidadValida || loading} loading={loading} mode="contained" onPress={handleAgregarAlCarrito} style={styles.footerButton}>
              {loading ? "Agregando..." : "Agregar"}
            </Button>
          </View>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </View>
    </ServiceMotionProvider>
  );
};

const styles = StyleSheet.create({
  cantidadButton: {
    margin: 0,
  },
  cantidadInput: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    width: 80,
  },
  cantidadRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  comentarioInput: {
    fontSize: 14,
  },
  drawerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  productGallery: {
    height: 320,
    width: "100%",
  },
  productGalleryContainer: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  precioResumen: {
    borderRadius: 12,
    padding: 16,
  },
  precioRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  precioTotalLabel: {
    fontWeight: "bold",
  },
  precioTotalValue: {
    fontWeight: "bold",
  },
  precioValue: {
    fontWeight: "600",
  },
  productoInfo: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: -30,
    padding: 18,
    zIndex: 1,
  },
  productoNombre: {
    fontWeight: "600",
    marginBottom: 4,
  },
  description: { marginTop: 10 },
  screen: { flex: 1 },
  keyboardView: { flex: 1, position: "relative" },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  loadingState: { alignItems: "center", padding: 28 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(120,120,120,0.3)" },
  footerSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  footerButton: { flex: 1, borderRadius: 999 },
  section: {
    marginBottom: 16,
  },
  sectionDivider: {
    marginVertical: 12,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  specificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 5,
  },
  specificationLabel: {
    flex: 1,
    opacity: 0.7,
  },
  specificationValue: {
    flex: 2,
    textAlign: "right",
  },
  tiendaNombre: {
    opacity: 0.7,
  },
  totalDivider: {
    marginVertical: 8,
  },
});

export default AddToCartDialogNative;
