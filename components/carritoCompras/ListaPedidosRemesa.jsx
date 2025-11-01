import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Card, IconButton, Divider, Chip, useTheme, Paragraph, Surface } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { CarritoCollection } from '../collections/collections';
import { megasToGB } from '../shared/MegasConverter';

const ListaPedidos = ({ eliminar }) => {
  const userId = Meteor.userId();
  const theme = useTheme();
  const isDarkMode = theme.dark;

  const { pedidosRemesa = [] } = useTracker(() => {
    Meteor.subscribe('carrito', { idUser: userId });
    const pedidos = CarritoCollection.find({ idUser: userId }).fetch();
    return { pedidosRemesa: pedidos };
  });

  const eliminarPedido = (idPedido) => {
    Meteor.call('eliminarElementoCarrito', idPedido, (error) => {
      if (error) console.error('Error al eliminar pedido:', error);
    });
  };

  // ✅ Renderizar card de RECARGA con diseño unificado
  const renderRecargaCard = (item) => {
    const color = '#FF6F00'; // Naranja para recargas
    const icon = 'cellphone';
    
    return (
      <Surface key={item._id} elevation={3} style={[styles.proxyVpnSurface, { borderLeftColor: color }]}>
        <Card style={styles.proxyVpnCard}>
          <Card.Content>
            {/* Header con título y botón eliminar */}
            <View style={styles.proxyVpnHeader}>
              <View style={styles.proxyVpnTitleRow}>
                <Text style={[styles.proxyVpnTitle, { color }]}>
                  Recarga Móvil
                </Text>
              </View>
              
              {eliminar && (
                <IconButton 
                  icon="close" 
                  size={20} 
                  iconColor={isDarkMode ? '#ff6b6b' : '#F44336'}
                  style={styles.closeButton}
                  onPress={() => eliminarPedido(item._id)} 
                />
              )}
            </View>
            
            {/* Chip con monto de recarga */}
            <Chip 
              icon={icon}
              compact
              style={[styles.proxyVpnChip, { backgroundColor: `${color}20` }]}
              textStyle={{ color, fontWeight: 'bold', fontSize: 12 }}
            >
              {item.comentario || `${item.producto?.destination?.amount} ${item.producto?.destination?.unit}`}
            </Chip>
            
            <Divider style={styles.divider} />

            {/* Detalles del paquete */}
            <View style={styles.proxyVpnDetails}>
              <View style={styles.detailRow}>
                <IconButton icon="account" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Para:</Paragraph>
                <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.nombre}</Paragraph>
              </View>

              <View style={styles.detailRow}>
                <IconButton icon="phone" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Número:</Paragraph>
                <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.movilARecargar}</Paragraph>
              </View>

              {item.producto?.operator?.name && (
                <View style={styles.detailRow}>
                  <IconButton icon="sim" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Operadora:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.producto.operator.name}
                  </Paragraph>
                </View>
              )}

              <View style={styles.detailRow}>
                <IconButton icon="currency-usd" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Precio:</Paragraph>
                <Paragraph style={[styles.detailValue, styles.priceValue]}>
                  ${item.cobrarUSD} USD
                </Paragraph>
              </View>

              {item.metodoPago && (
                <View style={styles.detailRow}>
                  <IconButton icon="credit-card" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Método de pago:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.metodoPago}</Paragraph>
                </View>
              )}
            </View>

            {/* Badge de estado */}
            <View style={styles.statusContainer}>
              <Chip 
                icon={item.entregado ? 'check-circle' : 'clock-outline'}
                compact
                style={[
                  styles.statusChip,
                  { backgroundColor: item.entregado ? '#4CAF5020' : '#FF980020' }
                ]}
                textStyle={{ 
                  color: item.entregado ? '#4CAF50' : '#FF9800',
                  fontWeight: '600',
                  fontSize: 11
                }}
              >
                {item.entregado ? 'Entregado' : 'Pendiente de Pago'}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </Surface>
    );
  };

  // ✅ Renderizar card de REMESA con diseño unificado
  const renderRemesaCard = (item) => {
    const color = '#9C27B0'; // Púrpura para remesas
    const icon = 'cash';
    
    return (
      <Surface key={item._id} elevation={3} style={[styles.proxyVpnSurface, { borderLeftColor: color }]}>
        <Card style={styles.proxyVpnCard}>
          <Card.Content>
            {/* Header con título y botón eliminar */}
            <View style={styles.proxyVpnHeader}>
              <View style={styles.proxyVpnTitleRow}>
                <Text style={[styles.proxyVpnTitle, { color }]}>
                  Remesa
                </Text>
              </View>
              
              {eliminar && (
                <IconButton 
                  icon="close" 
                  size={20} 
                  iconColor={isDarkMode ? '#ff6b6b' : '#F44336'}
                  style={styles.closeButton}
                  onPress={() => eliminarPedido(item._id)} 
                />
              )}
            </View>
            
            {/* Chip con monto de remesa */}
            <Chip 
              icon={icon}
              compact
              style={[styles.proxyVpnChip, { backgroundColor: `${color}20` }]}
              textStyle={{ color, fontWeight: 'bold', fontSize: 12 }}
            >
              {item.recibirEnCuba} {item.monedaRecibirEnCuba}
            </Chip>
            
            <Divider style={styles.divider} />

            {/* Detalles del paquete */}
            <View style={styles.proxyVpnDetails}>
              <View style={styles.detailRow}>
                <IconButton icon="account" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Para:</Paragraph>
                <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.nombre}</Paragraph>
              </View>

              {item.direccionCuba && (
                <View style={styles.detailRow}>
                  <IconButton icon="map-marker" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Dirección:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]} numberOfLines={2} ellipsizeMode="tail">
                    {item.direccionCuba}
                  </Paragraph>
                </View>
              )}

              {item.tarjetaCUP && (
                <View style={styles.detailRow}>
                  <IconButton icon="credit-card-outline" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Tarjeta:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>
                    {item.tarjetaCUP}
                  </Paragraph>
                </View>
              )}

              <View style={styles.detailRow}>
                <IconButton icon="currency-usd" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Precio:</Paragraph>
                <Paragraph style={[styles.detailValue, styles.priceValue]}>
                  ${item.cobrarUSD} USD
                </Paragraph>
              </View>

              {item.comentario && (
                <View style={styles.detailRow}>
                  <IconButton icon="information" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Nota:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]} numberOfLines={2} ellipsizeMode="tail">
                    {item.comentario}
                  </Paragraph>
                </View>
              )}

              {item.metodoPago && (
                <View style={styles.detailRow}>
                  <IconButton icon="credit-card" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Método de pago:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.metodoPago}</Paragraph>
                </View>
              )}
            </View>

            {/* Badge de estado */}
            <View style={styles.statusContainer}>
              <Chip 
                icon={item.entregado ? 'check-circle' : 'clock-outline'}
                compact
                style={[
                  styles.statusChip,
                  { backgroundColor: item.entregado ? '#4CAF5020' : '#FF980020' }
                ]}
                textStyle={{ 
                  color: item.entregado ? '#4CAF50' : '#FF9800',
                  fontWeight: '600',
                  fontSize: 11
                }}
              >
                {item.entregado ? 'Entregado' : 'Pendiente de Pago'}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </Surface>
    );
  };

  const renderProxyVPNCard = (item) => {
    const isProxy = item.type === 'PROXY';
    const color = isProxy ? '#2196F3' : '#4CAF50';
    const icon = isProxy ? 'wifi' : 'shield-check';
    const label = isProxy ? 'PROXY' : 'VPN';
    
    // Detectar si es paquete ilimitado por tiempo
    const esIlimitado = item.esPorTiempo === true || item.megas === null;
  
    return (
      <Surface key={item._id} elevation={3} style={[styles.proxyVpnSurface, { borderLeftColor: color }]}>
        <Card style={styles.proxyVpnCard}>
          <Card.Content>
            {/* Header con título y botón eliminar */}
            <View style={styles.proxyVpnHeader}>
              <View style={styles.proxyVpnTitleRow}>
                <Text style={[styles.proxyVpnTitle, { color }]}>
                  Paquete {label}
                </Text>
              </View>
              
              {eliminar && (
                <IconButton 
                  icon="close" 
                  size={20} 
                  iconColor={isDarkMode ? '#ff6b6b' : '#F44336'}
                  style={styles.closeButton}
                  onPress={() => eliminarPedido(item._id)} 
                />
              )}
            </View>
            
            {/* Chip adaptado para ilimitados */}
            {esIlimitado ? (
              <View style={styles.unlimitedChipWrapper}>
                <IconButton 
                  icon="infinity" 
                  size={20} 
                  iconColor="#FFD700"
                  style={{ margin: 0, marginRight: -4 }}
                />
                <Paragraph style={styles.unlimitedChipText}>ILIMITADO - 30 días</Paragraph>
              </View>
            ) : (
              <Chip 
                icon="database" 
                compact
                style={[styles.proxyVpnChip, { backgroundColor: `${color}20` }]}
                textStyle={{ color, fontWeight: 'bold', fontSize: 12 }}
              >
                {megasToGB(item.megas)}
              </Chip>
            )}
            
            <Divider style={styles.divider} />

            {/* Detalles del paquete */}
            <View style={styles.proxyVpnDetails}>
              <View style={styles.detailRow}>
                <IconButton icon="account" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Usuario:</Paragraph>
                <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.nombre}</Paragraph>
              </View>

              {item.comentario && (
                <View style={styles.detailRow}>
                  <IconButton icon="information" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Detalles:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]} numberOfLines={2} ellipsizeMode="tail">
                    {item.comentario}
                  </Paragraph>
                </View>
              )}

              <View style={styles.detailRow}>
                <IconButton icon="currency-usd" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Precio:</Paragraph>
                <Paragraph style={[styles.detailValue, styles.priceValue]}>
                  ${item.cobrarUSD} CUP
                </Paragraph>
              </View>

              {/* {item.descuentoAdmin > 0 && (
                <View style={[styles.detailRow, styles.discountRow]}>
                  <IconButton icon="tag" size={16} iconColor="#4CAF50" style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, { color: '#4CAF50' }]}>Descuento:</Paragraph>
                  <Paragraph style={[styles.detailValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
                    -{item.descuentoAdmin}%
                  </Paragraph>
                </View>
              )} */}

              {item.metodoPago && (
                <View style={styles.detailRow}>
                  <IconButton icon="credit-card" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <Paragraph style={[styles.detailLabel, isDarkMode && { color: '#AAA' }]}>Método de pago:</Paragraph>
                  <Paragraph style={[styles.detailValue, isDarkMode && { color: '#EEE' }]}>{item.metodoPago}</Paragraph>
                </View>
              )}
            </View>

            {/* Badge de estado */}
            <View style={styles.statusContainer}>
              <Chip 
                icon={item.entregado ? 'check-circle' : 'clock-outline'}
                compact
                style={[
                  styles.statusChip,
                  { backgroundColor: item.entregado ? '#4CAF5020' : '#FF980020' }
                ]}
                textStyle={{ 
                  color: item.entregado ? '#4CAF50' : '#FF9800',
                  fontWeight: '600',
                  fontSize: 11
                }}
              >
                {item.entregado ? 'Entregado' : 'Pendiente de Pago'}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </Surface>
    );
  };

  if (pedidosRemesa.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconButton icon="cart-off" size={64} iconColor="#CCC" />
        <Paragraph style={styles.emptyText}>No hay productos en el carrito</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {pedidosRemesa.map((item) => {
        // ✅ Detectar tipo de item y renderizar card apropiado
        if (item.type === 'PROXY' || item.type === 'VPN') {
          return renderProxyVPNCard(item);
        } else if (item.type === 'RECARGA') {
          return renderRecargaCard(item);
        } else if (item.type === 'REMESA') {
          return renderRemesaCard(item);
        }

        // Fallback para tipos desconocidos
        return null;
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  
  // ✅ Estilos unificados para todos los cards
  proxyVpnSurface: {
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    overflow: 'hidden'
  },
  proxyVpnCard: {
    // backgroundColor adaptado automáticamente por Surface
  },
  proxyVpnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  proxyVpnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  proxyVpnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8
  },
  proxyVpnChip: {
    width: 120
  },
  closeButton: {
    margin: 0,
    marginTop: -8,
    marginRight: -12
  },
  divider: {
    marginVertical: 12
  },
  proxyVpnDetails: {
    marginTop: 4
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 32
  },
  detailIcon: {
    margin: 0
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
    flex: 1.2
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flex: 2
  },
  priceValue: {
    fontSize: 15,
    color: '#1976D2',
    fontWeight: 'bold'
  },
  discountRow: {
    backgroundColor: '#4CAF5010',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 4
  },
  statusContainer: {
    marginTop: 10,
    alignItems: 'flex-start',
    maxHeight: 28
  },
  statusChip: {
    alignSelf: 'flex-start'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16
  },
  // ✅ Estilos para chip ilimitado
  unlimitedChipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    maxHeight: 32
  },
  unlimitedChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 2
  }
});

export default ListaPedidos;