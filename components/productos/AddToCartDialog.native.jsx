import MeteorBase from "@meteorrn/core";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
    Button,
    Dialog,
    Divider,
    HelperText,
    IconButton,
    Portal,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const AddToCartDialogNative = ({ onDismiss, producto, tienda, visible }) => {
  const [cantidad, setCantidad] = useState("1");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const user = Meteor.useTracker(() => Meteor.user());

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCantidad("1");
    setComentario("");
  }, [user, visible]);

  const cantidadNum = parseInt(cantidad, 10) || 0;
  const precioUnitario = Number(producto?.precio || 0);
  const precioTotal = (cantidadNum * precioUnitario).toFixed(2);
  const stockDisponible = producto?.productoDeElaboracion
    ? 999
    : producto?.count;
  const cantidadValida = cantidadNum > 0 && cantidadNum <= stockDisponible;

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
      console.error("Error al agregar al carrito:", error);
      Alert.alert(
        "Información",
        error.reason ||
          "No se pudo agregar el producto al carrito. Intenta nuevamente mas tarde.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog onDismiss={onDismiss} style={styles.dialog} visible={visible}>
        <Dialog.Title style={styles.dialogTitle}>
          Agregar al carrito
        </Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.productoInfo}>
              <Text style={styles.productoNombre} variant="titleMedium">
                {producto.name}
              </Text>
              <Text style={styles.tiendaNombre} variant="bodySmall">
                📍 {tienda.title}
              </Text>
            </View>

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

              {!producto.productoDeElaboracion ? (
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

            <View
              style={[
                styles.precioResumen,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.precioRow}>
                <Text variant="bodyMedium">Precio unitario:</Text>
                <Text style={styles.precioValue} variant="bodyMedium">
                  {precioUnitario.toFixed(2)} {producto.monedaPrecio || "USD"}
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
                  {precioTotal} {producto.monedaPrecio || "USD"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.dialogActions}>
          <Button disabled={loading} onPress={onDismiss}>
            Cancelar
          </Button>
          <Button
            disabled={!cantidadValida || loading}
            loading={loading}
            mode="contained"
            onPress={handleAgregarAlCarrito}
          >
            {loading ? "Agregando..." : "Agregar"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
  dialog: {
    maxHeight: "80%",
  },
  dialogActions: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
    alignItems: "center",
    paddingVertical: 8,
  },
  productoNombre: {
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
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
  tiendaNombre: {
    opacity: 0.7,
  },
  totalDivider: {
    marginVertical: 8,
  },
});

export default AddToCartDialogNative;
