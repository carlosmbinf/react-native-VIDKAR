import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  RadioButton,
  ActivityIndicator,
  Chip,
  Surface,
  Portal,
  Dialog,
} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';

/**
 * ProxyPurchaseScreen - Pantalla profesional de confirmación de compra Proxy
 * 
 * Props esperadas via route.params:
 * - paquete: { _id, megas, precio, comentario }
 * - descuentoProxy: Number (descuento del usuario en %)
 */
const ProxyPurchaseScreen = ({ route, navigation }) => {
  const { paquete, descuentoProxy = 0 } = route.params || {};

  // Estados
  const [user, setUser] = useState(null);
  const [precioCalculado, setPrecioCalculado] = useState(null);
  const [metodoPago, setMetodoPago] = useState('PAYPAL');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);

  useEffect(() => {
    // Validar datos del paquete
    if (!paquete?.megas || !paquete?.precio) {
      Alert.alert('Error', 'Datos del paquete inválidos');
      navigation.goBack();
      return;
    }

    // Obtener usuario actual
    const userData = Meteor.user();
    if (!userData) {
      Alert.alert('Error', 'Debes iniciar sesión para continuar');
      navigation.goBack();
      return;
    }
    setUser(userData);

    // Calcular precio con descuento
    Meteor.call(
      'ventas.calcularPrecioProxyVPN',
      {
        userId: Meteor.userId(),
        type: 'PROXY',
        megas: paquete.megas,
      },
      (error, result) => {
        setLoading(false);
        if (error) {
          console.error('Error calculando precio Proxy:', error);
          Alert.alert('Error', 'No se pudo calcular el precio del paquete');
          navigation.goBack();
        } else {
          setPrecioCalculado(result);
        }
      }
    );
  }, [paquete, navigation]);

  // Validar paquete Proxy activo
  const validarPaqueteActivo = () => {
    if (!user) {
      Alert.alert('Error', 'No se pudo cargar información del usuario');
      return false;
    }

    // ✅ user.baneado === false significa Proxy activo
    const tieneProxyActivo = user.baneado === false;
    const esIlimitado = user.isIlimitado === true;

    if (tieneProxyActivo && !esIlimitado) {
      Alert.alert(
        'Paquete Proxy Activo',
        'Ya tienes un paquete Proxy activo. Debes esperar a que venza o se consuma antes de comprar otro.',
        [{ text: 'Entendido' }]
      );
      return false;
    }

    return true;
  };

  // Handler confirmación de compra
  const handleConfirmarCompra = () => {
    Alert.alert("Info", "Pronto Llegara esta funcionalidad")
    return;
    if (!validarPaqueteActivo()) return;

    // Para métodos que requieren evidencia, mostrar diálogo de confirmación
    if (metodoPago === 'TRANSFERENCIA' || metodoPago === 'EFECTIVO') {
      setDialogVisible(true);
    } else {
      procesarCompra();
    }
  };

  // Procesar compra y agregar al carrito
  const procesarCompra = () => {
    if (!precioCalculado) {
      Alert.alert('Error', 'Precio no calculado');
      return;
    }

    setLoading(true);
    setProcesando(true);
    setDialogVisible(false);

    Meteor.call(
      'carrito.addProxyVPN',
      {
        type: 'PROXY',
        megas: paquete.megas,
        precioBaseProxyVPN: precioCalculado.precioBase,
        descuentoAdmin: precioCalculado.descuento,
        metodoPago,
      },
      (error, carritoId) => {
        setLoading(false);
        setProcesando(false);

        if (error) {
          console.error('Error agregando Proxy al carrito:', error);
          Alert.alert(
            'Error',
            error.reason || 'No se pudo agregar el paquete al carrito'
          );
        } else {
          // Navegación según método de pago
          if (metodoPago === 'PAYPAL') {
            Alert.alert(
              '¡Éxito!',
              'Paquete agregado al carrito. Serás redirigido a PayPal.',
              [
                {
                  text: 'Continuar',
                  onPress: () => navigation.navigate('Carrito', {
                    autoCheckout: true,
                    paymentMethod: 'PAYPAL',
                  }),
                },
              ]
            );
          } else {
            Alert.alert(
              'Paquete Agregado',
              'Ahora debes subir evidencia de pago. El servicio se activará tras aprobación del administrador.',
              [
                {
                  text: 'Subir Evidencia',
                  onPress: () => navigation.navigate('EvidenciaVenta', {
                    carritoId,
                    metodoPago,
                    type: 'PROXY',
                  }),
                },
                {
                  text: 'Después',
                  onPress: () => navigation.navigate('Carrito'),
                  style: 'cancel',
                },
              ]
            );
          }
        }
      }
    );
  };

  // Loading inicial
  if (loading && !precioCalculado) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Calculando precio...</Text>
      </View>
    );
  }

  if (!precioCalculado) {
    return null;
  }

  const megasGB = megasToGB(paquete.megas);
  const tieneDescuento = precioCalculado.descuento > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Card: Resumen del Paquete */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.titleProxy}>
              Resumen de Compra
            </Text>
            <Chip icon="wifi" mode="outlined" textStyle={styles.chipProxy}>
              Proxy
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.row}>
            <Text variant="bodyLarge">Paquete:</Text>
            <Text variant="bodyLarge" style={styles.bold}>
              {megasGB}
            </Text>
          </View>

          <View style={styles.row}>
            <Text variant="bodyLarge">Precio base:</Text>
            <Text variant="bodyLarge">${precioCalculado?.precioBase?.toFixed(2)}</Text>
          </View>

          {tieneDescuento && (
            <>
              <View style={styles.row}>
                <Text variant="bodyLarge">Descuento:</Text>
                <Text variant="bodyLarge" style={styles.descuento}>
                  -{precioCalculado.descuento}% (-${precioCalculado.descuentoAplicado.toFixed(2)})
                </Text>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          <View style={styles.row}>
            <Text variant="titleLarge" style={styles.bold}>
              Total a pagar:
            </Text>
            <Text variant="titleLarge" style={[styles.bold, styles.precioFinalProxy]}>
              ${precioCalculado.precioFinal.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Card: Método de Pago */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.subtitle}>
            Método de Pago
          </Text>
          <Divider style={styles.divider} />

          <RadioButton.Group onValueChange={setMetodoPago} value={metodoPago}>
            <Surface style={styles.radioOption}>
              <RadioButton.Item
                label="PayPal (Activación inmediata)"
                value="PAYPAL"
                status={metodoPago === 'PAYPAL' ? 'checked' : 'unchecked'}
              />
            </Surface>

            <Surface style={styles.radioOption}>
              <RadioButton.Item
                label="Transferencia bancaria (Requiere evidencia)"
                value="TRANSFERENCIA"
                status={metodoPago === 'TRANSFERENCIA' ? 'checked' : 'unchecked'}
              />
            </Surface>

            <Surface style={styles.radioOption}>
              <RadioButton.Item
                label="Efectivo (Requiere evidencia)"
                value="EFECTIVO"
                status={metodoPago === 'EFECTIVO' ? 'checked' : 'unchecked'}
              />
            </Surface>
          </RadioButton.Group>

          {metodoPago !== 'PAYPAL' && (
            <Text variant="bodySmall" style={styles.nota}>
              ℹ️ Deberás subir evidencia de pago. El servicio se activará tras
              aprobación del administrador (2-24 horas).
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Card: Tu Saldo Actual */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.subtitle}>
            Tu Saldo Actual de Proxy
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.row}>
            <Text variant="bodyMedium">Estado Proxy:</Text>
            {user?.baneado === false ? (
              <Chip icon="check-circle" textStyle={styles.chipActive} compact>
                Activo
              </Chip>
            ) : (
              <Text variant="bodyMedium" style={styles.inactive}>Sin servicio</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text variant="bodyMedium">Datos disponibles:</Text>
            <Text variant="bodyMedium" style={styles.bold}>
              {user?.isIlimitado
                ? '∞ Ilimitado'
                : megasToGB(user?.megas || 0)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Botones de Acción */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.buttonOutlined}
          disabled={procesando}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirmarCompra}
          style={styles.buttonContainedProxy}
          buttonColor="#2196F3"
          loading={procesando}
          disabled={procesando}
        >
          Confirmar Compra
        </Button>
      </View>

      {/* Dialog de Confirmación */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Confirmar Compra</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Deberás subir evidencia de {metodoPago === 'TRANSFERENCIA' ? 'transferencia' : 'pago en efectivo'}.
              {'\n\n'}
              ¿Deseas continuar?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={procesarCompra} mode="contained" buttonColor="#2196F3">
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // ...existing code...
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleProxy: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  chipProxy: {
    color: '#2196F3',
  },
  subtitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  descuento: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  precioFinalProxy: {
    color: '#2196F3',
    fontSize: 20,
  },
  radioOption: {
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
  },
  nota: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    color: '#1565C0',
  },
  chipActive: {
    fontSize: 12,
    color: '#4CAF50',
  },
  inactive: {
    color: '#999',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  buttonOutlined: {
    flex: 1,
    borderColor: '#2196F3',
  },
  buttonContainedProxy: {
    flex: 1,
  },
});

export default ProxyPurchaseScreen;