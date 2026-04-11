import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Paragraph,
    Surface,
    Title,
} from "react-native-paper";

import AppHeader from "../Header/AppHeader";
import { megasToGB } from "../shared/MegasConverter";

const Meteor = MeteorBase;

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ProxyPurchaseScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [precioCalculado, setPrecioCalculado] = useState(null);

  const paquete = useMemo(() => {
    try {
      return typeof params.paquete === "string"
        ? JSON.parse(params.paquete)
        : null;
    } catch {
      return null;
    }
  }, [params.paquete]);

  useEffect(() => {
    if (!paquete) {
      Alert.alert("Error", "No se recibió información del paquete");
      router.back();
      return;
    }

    const user = Meteor.user();
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para continuar");
      router.back();
      return;
    }

    setLoading(true);
    Meteor.call(
      "ventas.calcularPrecioProxyVPN",
      {
        esPorTiempo: !!paquete.esPorTiempo,
        megas: paquete.megas,
        type: "PROXY",
        userId: user._id,
      },
      (error, result) => {
        if (error) {
          Alert.alert("Error", "No se pudo calcular el precio del paquete");
          setLoading(false);
          return;
        }

        setPrecioCalculado(result);
        setLoading(false);
      },
    );
  }, [paquete, router]);

  const handleConfirmarCompra = () => {
    if (!paquete || !precioCalculado) {
      Alert.alert("Error", "Calculando precio, por favor espera...");
      return;
    }

    setLoading(true);
    Meteor.call(
      "carrito.addProxyVPN",
      {
        comentario: paquete.comentario || paquete.detalles,
        descuentoAdmin: parseNumber(precioCalculado?.descuento),
        esPorTiempo: !!paquete.esPorTiempo,
        megas: paquete.megas,
        precioBaseProxyVPN: precioCalculado?.precioBase,
        type: "PROXY",
      },
      (error) => {
        setLoading(false);
        if (error) {
          Alert.alert(
            "Error",
            error.reason || "No se pudo agregar el paquete al carrito",
          );
          return;
        }

        Alert.alert(
          "Agregado al Carrito",
          "El paquete ha sido agregado al carrito. Abre el carrito para completar tu compra.",
          [
            {
              onPress: () => router.back(),
              style: "cancel",
              text: "Continuar comprando",
            },
          ],
        );
      },
    );
  };

  if (!paquete) {
    return null;
  }

  const esPorTiempo = !!paquete.esPorTiempo;

  return (
    <Surface style={styles.surface}>
      <AppHeader
        title="Comprar Proxy"
        subtitle="Confirma el paquete seleccionado"
        backHref="/(normal)/ProxyPackages"
        showBackButton
      />
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Detalles del Paquete</Title>

              {esPorTiempo ? (
                <View style={styles.unlimitedChipContainer}>
                  <IconButton
                    icon="infinity"
                    size={28}
                    iconColor="#FFD700"
                    style={styles.zeroMargin}
                  />
                  <Paragraph style={styles.unlimitedChipText}>
                    ILIMITADO - 30 días
                  </Paragraph>
                </View>
              ) : (
                <Chip
                  icon="wifi"
                  style={styles.packageChip}
                  textStyle={styles.packageChipText}
                >
                  {megasToGB(paquete.megas)}
                </Chip>
              )}

              {!!(paquete.comentario || paquete.detalles) ? (
                <Paragraph style={styles.description}>
                  {paquete.comentario || paquete.detalles}
                </Paragraph>
              ) : null}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Detalles de Precio</Title>

              {loading || !precioCalculado ? (
                <ActivityIndicator
                  size="small"
                  color="#2196F3"
                  style={styles.loader}
                />
              ) : (
                <>
                  <View style={styles.priceRow}>
                    <Paragraph>Precio base:</Paragraph>
                    <Paragraph style={styles.priceText}>
                      ${precioCalculado.precioBase} CUP
                    </Paragraph>
                  </View>

                  <Divider style={styles.smallDivider} />

                  <View style={styles.priceRow}>
                    <Title style={styles.totalLabel}>Total a pagar:</Title>
                    <Title style={styles.totalPrice}>
                      ${precioCalculado.precioBase} CUP
                    </Title>
                  </View>
                </>
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoBox}>
              <Paragraph style={styles.infoText}>
                ℹ️ El paquete será agregado al carrito. Podrás seleccionar el
                método de pago en el siguiente paso.
              </Paragraph>
            </View>
          </Card.Content>

          <Card.Actions style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmarCompra}
              loading={loading}
              disabled={loading || !precioCalculado}
              buttonColor="#2196F3"
              style={styles.confirmButton}
            >
              Agregar al Carrito
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  actions: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  card: {
    borderRadius: 12,
    margin: 16,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  description: {
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  infoBox: {
    backgroundColor: "#FFF3CD",
    borderLeftColor: "#FFC107",
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    color: "#856404",
    fontSize: 13,
    lineHeight: 18,
  },
  loader: {
    marginVertical: 16,
  },
  packageChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(33, 150, 243, 0.12)",
    marginBottom: 8,
    maxHeight: 32,
  },
  packageChipText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "bold",
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: "#2196F3",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  smallDivider: {
    marginVertical: 8,
  },
  surface: {
    height: "100%",
  },
  totalLabel: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
  },
  totalPrice: {
    color: "#2196F3",
    fontSize: 24,
    fontWeight: "bold",
  },
  unlimitedChipContainer: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unlimitedChipText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 4,
  },
  zeroMargin: {
    margin: 0,
  },
});

export default ProxyPurchaseScreen;
