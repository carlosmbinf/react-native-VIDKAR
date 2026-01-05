import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Portal, Dialog, Text, TextInput, Button, Chip, Divider, 
  IconButton, HelperText, ActivityIndicator, useTheme 
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';

const AddToCartDialog = ({ visible, onDismiss, producto, tienda }) => {
  const [cantidad, setCantidad] = useState('1');
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState(null);

  const user = useTracker(() => Meteor.user());
  const theme = useTheme(); // ✅ Hook para theme

  // Reset al abrir dialog
  useEffect(() => {
    if (visible) {
      setCantidad('1');
      setComentario('');
      
      // Obtener coordenadas del usuario si existen
      if (user?.cordenadas || user?.coordenadas) {
        setCoordenadas(user.cordenadas || user.coordenadas);
      }
    }
  }, [visible, user]);

  const cantidadNum = parseInt(cantidad) || 0;
  const precioUnitario = producto.precio;
  const precioTotal = (cantidadNum * precioUnitario).toFixed(2);
  
  const stockDisponible = producto.productoDeElaboracion 
    ? 999 
    : producto.count;

  const cantidadValida = cantidadNum > 0 && cantidadNum <= stockDisponible;

  const incrementarCantidad = () => {
    const nueva = cantidadNum + 1;
    if (nueva <= stockDisponible) {
      setCantidad(nueva.toString());
    }
  };

  const decrementarCantidad = () => {
    const nueva = cantidadNum - 1;
    if (nueva > 0) {
      setCantidad(nueva.toString());
    }
  };

  const handleAgregarAlCarrito = async () => {
    if (!cantidadValida) {
      Alert.alert('Cantidad inválida', 'Por favor, ingresa una cantidad válida.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para agregar productos al carrito.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve, reject) => {
        Meteor.call(
          'addAlCarrito',
          user._id,
          producto._id,
          cantidadNum,
          false, // recogidaEnLocal (no implementado aún)
          comentario.trim(),
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      });

      Alert.alert(
        '¡Éxito!',
        `${cantidadNum} unidad${cantidadNum > 1 ? 'es' : ''} de "${producto.name}" ${cantidadNum > 1 ? 'fueron agregadas' : 'fue agregada'} al carrito.`,
        [
          { text: 'Seguir comprando', onPress: onDismiss },
          { 
            text: 'Ver carrito', 
            onPress: () => {
              onDismiss();
              // TODO: Navegar al carrito
              console.log('Navegar al carrito');
            }
          }
        ]
      );

      onDismiss();
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      Alert.alert(
        'Información',
        error.reason || 'No se pudo agregar el producto al carrito. Intenta nuevamente mas tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          Agregar al carrito
        </Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Info del producto */}
            <View style={styles.productoInfo}>
              <Text variant="titleMedium" style={styles.productoNombre}>
                {producto.name}
              </Text>
              <Text variant="bodySmall" style={styles.tiendaNombre}>
                📍 {tienda.title}
              </Text>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            {/* Selector de cantidad */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Cantidad
              </Text>

              <View style={styles.cantidadRow}>
                <IconButton
                  icon="minus"
                  mode="contained-tonal"
                  size={20}
                  onPress={decrementarCantidad}
                  disabled={cantidadNum <= 1 || loading}
                  style={styles.cantidadButton}
                />

                <TextInput
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.cantidadInput}
                  dense
                  disabled={loading}
                  error={!cantidadValida && cantidad !== ''}
                />

                <IconButton
                  icon="plus"
                  mode="contained-tonal"
                  size={20}
                  onPress={incrementarCantidad}
                  disabled={cantidadNum >= stockDisponible || loading}
                  style={styles.cantidadButton}
                />
              </View>

              {!producto.productoDeElaboracion && (
                <HelperText type={cantidadValida ? "info" : "error"}>
                  {cantidadValida 
                    ? `Stock disponible: ${stockDisponible}` 
                    : `Cantidad debe ser entre 1 y ${stockDisponible}`}
                </HelperText>
              )}

              {producto.productoDeElaboracion && (
                <HelperText type="info">
                  ⏱️ Producto de elaboración bajo pedido
                </HelperText>
              )}
            </View>

            {/* Comentarios opcionales */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Comentarios (opcional)
              </Text>

              <TextInput
                value={comentario}
                onChangeText={setComentario}
                placeholder="Ej: Sin cebolla, extra queso..."
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.comentarioInput}
                maxLength={200}
                disabled={loading}
              />

              <HelperText type="info">
                {comentario.length}/200 caracteres
              </HelperText>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            {/* Resumen de precio con theme-aware background */}
            <View style={[
              styles.precioResumen,
              { backgroundColor: theme.colors.surfaceVariant } // ✅ Fondo adaptativo
            ]}>
              <View style={styles.precioRow}>
                <Text variant="bodyMedium">Precio unitario:</Text>
                <Text variant="bodyMedium" style={styles.precioValue}>
                  {precioUnitario.toFixed(2)} {producto.monedaPrecio || 'USD'}
                </Text>
              </View>

              <View style={styles.precioRow}>
                <Text variant="bodyMedium">Cantidad:</Text>
                <Text variant="bodyMedium" style={styles.precioValue}>
                  × {cantidadNum}
                </Text>
              </View>

              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.precioRow}>
                <Text variant="titleMedium" style={styles.precioTotalLabel}>
                  Total:
                </Text>
                <Text 
                  variant="titleLarge" 
                  style={[
                    styles.precioTotalValue,
                    { color: theme.colors.primary } // ✅ Color adaptativo
                  ]}
                >
                  {precioTotal} {producto.monedaPrecio || 'USD'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={onDismiss} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            mode="contained" 
            onPress={handleAgregarAlCarrito}
            disabled={!cantidadValida || loading}
            loading={loading}
          >
            {loading ? 'Agregando...' : 'Agregar'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  productoInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  productoNombre: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tiendaNombre: {
    opacity: 0.7,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  cantidadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cantidadButton: {
    margin: 0,
  },
  cantidadInput: {
    width: 80,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  comentarioInput: {
    fontSize: 14,
  },
  precioResumen: {
    padding: 16,
    borderRadius: 12,
  },
  precioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  precioValue: {
    fontWeight: '600',
  },
  precioTotalLabel: {
    fontWeight: 'bold',
  },
  precioTotalValue: {
    fontWeight: 'bold',
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default AddToCartDialog;
