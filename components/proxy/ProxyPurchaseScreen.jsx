import React, { Component } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';

export default class ProxyPurchaseScreen extends Component {
  state = {
    loading: false,
    precioCalculado: null
  };

  componentDidMount() {
    this.calcularPrecio();
  }

  calcularPrecio = async () => {
    const { paquete } = this.props.route.params;
    const user = Meteor.user();

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para continuar');
      this.props.navigation.goBack();
      return;
    }

    this.setState({ loading: true });

    Meteor.call('ventas.calcularPrecioProxyVPN', {
      userId: user._id,
      type: 'PROXY',
      megas: paquete.megas,
      esPorTiempo: paquete.esPorTiempo || false
    }, (error, result) => {
      if (error) {
        console.error('Error calculando precio:', error);
        Alert.alert('Error', 'No se pudo calcular el precio del paquete');
        this.setState({ loading: false });
        return;
      }

      this.setState({ 
        precioCalculado: result,
        loading: false 
      });
    });
  };

  handleConfirmarCompra = async () => {
    const { paquete } = this.props.route.params;
    const { precioCalculado } = this.state;

    if (!precioCalculado) {
      Alert.alert('Error', 'Calculando precio, por favor espera...');
      return;
    }

    this.setState({ loading: true });

    try {
      await new Promise((resolve, reject) => {
        Meteor.call('carrito.addProxyVPN', {
          type: 'PROXY',
          megas: paquete.megas,
          precioBaseProxyVPN: precioCalculado.precioBase,
          descuentoAdmin: precioCalculado.descuento,
          comentario: paquete.comentario || paquete.detalles,
          esPorTiempo: paquete.esPorTiempo || false
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      this.setState({ loading: false });

      Alert.alert(
        '¡Agregado al Carrito!',
        'El paquete ha sido agregado al carrito. Abre el carrito para completar tu compra.',
        [
          {
            text: 'Continuar comprando',
            style: 'cancel',
            onPress: () => this.props.navigation.goBack()
          },
          {
            text: 'Ir al Carrito',
            onPress: () => {
              this.props.navigation.navigate('Home');
            }
          }
        ]
      );

    } catch (error) {
      this.setState({ loading: false });
      console.error('Error agregando al carrito:', error);
      Alert.alert(
        'Error',
        error.reason || 'No se pudo agregar el paquete al carrito'
      );
    }
  };

  render() {
    const { paquete } = this.props.route.params;
    const { loading, precioCalculado } = this.state;
    const esPorTiempo = paquete.esPorTiempo || false;

    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Detalles del Paquete</Title>
              
              {/* ✅ Chip adaptado para ilimitados */}
              {esPorTiempo ? (
                <View style={styles.unlimitedChipContainer}>
                  <IconButton 
                    icon="infinity" 
                    size={28} 
                    iconColor="#FFD700"
                    style={{ margin: 0 }}
                  />
                  <Paragraph style={styles.unlimitedChipText}>ILIMITADO - 30 días</Paragraph>
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

              {!!(paquete.comentario || paquete.detalles) && (
                <Paragraph style={styles.description}>
                  {paquete.comentario || paquete.detalles}
                </Paragraph>
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Detalles de Precio</Title>
              
              {loading || !precioCalculado ? (
                <ActivityIndicator size="small" color="#2196F3" style={{ marginVertical: 16 }} />
              ) : (
                <>
                  <View style={styles.priceRow}>
                    <Paragraph>Precio base:</Paragraph>
                    <Paragraph style={styles.priceText}>
                      ${precioCalculado.precioBase} CUP
                    </Paragraph>
                  </View>

                  {precioCalculado.descuento > 0 && (
                    <View style={styles.priceRow}>
                      <Paragraph>Descuento ({precioCalculado.descuento}%):</Paragraph>
                      <Paragraph style={[styles.priceText, styles.discountText]}>
                        -${precioCalculado.descuentoAplicado.toFixed(2)} CUP
                      </Paragraph>
                    </View>
                  )}

                  <Divider style={styles.smallDivider} />

                  <View style={styles.priceRow}>
                    <Title style={styles.totalLabel}>Total a pagar:</Title>
                    <Title style={[styles.totalPrice, { color: '#2196F3' }]}>
                      ${precioCalculado.precioFinal} CUP
                    </Title>
                  </View>
                </>
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoBox}>
              <Paragraph style={styles.infoText}>
                ℹ️ El paquete será agregado al carrito. Podrás seleccionar el método de pago (Efectivo o Transferencia) en el siguiente paso.
              </Paragraph>
            </View>
          </Card.Content>

          <Card.Actions style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => this.props.navigation.goBack()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={this.handleConfirmarCompra}
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
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  card: {
    margin: 16,
    elevation: 4,
    borderRadius: 12
  },
  section: {
    marginVertical: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12
  },
  packageChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.12)', // ✅ Más sutil para modo oscuro
    marginBottom: 8,
    maxHeight: 32
  },
  packageChipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  // ✅ NUEVO: Estilos para chip ilimitado
  unlimitedChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8
  },
  unlimitedChipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4
  },
  description: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20
  },
  divider: {
    marginVertical: 16
  },
  smallDivider: {
    marginVertical: 8
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600'
  },
  discountText: {
    color: '#4CAF50'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  infoBox: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  infoText: {
    color: '#856404',
    fontSize: 13,
    lineHeight: 18
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  cancelButton: {
    flex: 1,
    marginRight: 8
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8
  }
});