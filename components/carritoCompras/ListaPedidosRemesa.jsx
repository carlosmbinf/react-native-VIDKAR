import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Animated, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Card, IconButton, Divider, Chip, useTheme, Paragraph, Surface } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { CarritoCollection } from '../collections/collections';
import { megasToGB } from '../shared/MegasConverter';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  // ✅ Renderizar card de COMERCIO con Collapse animado
  const renderComercioCard = (item) => {
    const [expanded, setExpanded] = useState(false);
    const [rotateAnim] = useState(new Animated.Value(0));
    
    const color = '#FF5722';
    const producto = item.producto || {};
    const precioUnitario = producto.precio || 0;
    const cantidad = item.cantidad || 1;
    const total = precioUnitario * cantidad;

    const toggleExpanded = () => {
      // Animación suave con LayoutAnimation
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Rotar icono de chevron
      Animated.timing(rotateAnim, {
        toValue: expanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setExpanded(!expanded);
    };

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    
    return (
      <Surface key={item._id} elevation={3} style={[styles.comercioSurface, { borderLeftColor: color }]}>
        <Card style={styles.comercioCard}>
          {/* Card principal SIEMPRE visible (resumen) */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={toggleExpanded}
          >
            <Card.Content style={styles.comercioMainContent}>
              {/* Header con icono y título */}
              <View style={styles.comercioHeaderRow}>
                <View style={styles.comercioTitleWrapper}>
                  <IconButton 
                    icon="storefront" 
                    size={20} 
                    iconColor={color}
                    style={styles.comercioIcon}
                  />
                  <View style={styles.comercioTitleTexts}>
                    <Text style={[styles.comercioProductName, { color }]} numberOfLines={1} ellipsizeMode="tail">
                      {producto.name || 'Producto'}
                    </Text>
                    <Text style={[styles.comercioSubtitle, isDarkMode && { color: '#AAA' }]}>
                      Pedido de Tienda
                    </Text>
                  </View>
                </View>

                {/* Botón eliminar */}
                {eliminar && (
                  <IconButton 
                    icon="close" 
                    size={18} 
                    iconColor={isDarkMode ? '#ff6b6b' : '#F44336'}
                    style={styles.comercioCloseButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      eliminarPedido(item._id);
                    }} 
                  />
                )}
              </View>

              {/* Información resumida (cantidad y precio) */}
              <View style={styles.comercioSummaryRow}>
                <View style={styles.comercioSummaryItem}>
                  <IconButton icon="counter" size={14} iconColor={isDarkMode ? '#888' : '#666'} style={styles.comercioSummaryIcon} />
                  <Text style={[styles.comercioSummaryLabel, isDarkMode && { color: '#AAA' }]}>Cantidad:</Text>
                  <Text style={[styles.comercioSummaryValue, isDarkMode && { color: '#EEE' }]}>
                    {cantidad}
                  </Text>
                </View>

                <View style={styles.comercioSummaryItem}>
                  <IconButton icon="currency-usd" size={14} iconColor={isDarkMode ? '#888' : '#666'} style={styles.comercioSummaryIcon} />
                  <Text style={[styles.comercioSummaryLabel, isDarkMode && { color: '#AAA' }]}>Total:</Text>
                  <Text style={[styles.comercioSummaryValue, styles.comercioPriceHighlight]}>
                    {total} {item.monedaACobrar || 'CUP'}
                  </Text>
                </View>
              </View>

              {/* Indicador de expansión */}
              <View style={styles.comercioExpandIndicator}>
                <Text style={[styles.comercioExpandText, isDarkMode && { color: '#AAA' }]}>
                  {expanded ? 'Ver menos' : 'Ver más detalles'}
                </Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <IconButton 
                    icon="chevron-down" 
                    size={20} 
                    iconColor={color}
                    style={styles.comercioChevron}
                  />
                </Animated.View>
              </View>
            </Card.Content>
          </TouchableOpacity>

          {/* Sección expandible (detalles completos) */}
          {expanded && (
            <Card.Content style={styles.comercioExpandedContent}>
              <Divider style={styles.comercioDivider} />

              {/* Descripción del producto */}
              {producto.descripcion && (
                <View style={styles.comercioDetailRow}>
                  <IconButton icon="text" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <View style={styles.comercioDetailTextWrapper}>
                    <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Descripción</Text>
                    <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                      {producto.descripcion}
                    </Text>
                  </View>
                </View>
              )}

              {/* Precio unitario */}
              <View style={styles.comercioDetailRow}>
                <IconButton icon="tag" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                <View style={styles.comercioDetailTextWrapper}>
                  <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Precio unitario</Text>
                  <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                    {precioUnitario} {producto.monedaPrecio || 'CUP'}
                  </Text>
                </View>
              </View>

              {/* Tipo de producto */}
              {producto.productoDeElaboracion !== undefined && (
                <View style={styles.comercioDetailRow}>
                  <IconButton 
                    icon={producto.productoDeElaboracion ? 'chef-hat' : 'package-variant'} 
                    size={16} 
                    iconColor={isDarkMode ? '#AAA' : '#666'} 
                    style={styles.detailIcon} 
                  />
                  <View style={styles.comercioDetailTextWrapper}>
                    <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Tipo de producto</Text>
                    <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                      {producto.productoDeElaboracion ? 'Elaboración bajo pedido' : 'Stock disponible'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Ubicación de entrega */}
              {item.coordenadas && (
                <View style={styles.comercioDetailRow}>
                  <IconButton icon="map-marker" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <View style={styles.comercioDetailTextWrapper}>
                    <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Ubicación GPS</Text>
                    <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                      {item.coordenadas.latitude.toFixed(4)}, {item.coordenadas.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Dirección (si existe) */}
              {item.direccionCuba && item.direccionCuba.trim() !== '' && (
                <View style={styles.comercioDetailRow}>
                  <IconButton icon="home-map-marker" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <View style={styles.comercioDetailTextWrapper}>
                    <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Dirección de entrega</Text>
                    <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                      {item.direccionCuba}
                    </Text>
                  </View>
                </View>
              )}

              {/* Comentario adicional */}
              {item.comentario && item.comentario.trim() !== '' && (
                <View style={styles.comercioDetailRow}>
                  <IconButton icon="comment-text" size={16} iconColor={isDarkMode ? '#AAA' : '#666'} style={styles.detailIcon} />
                  <View style={styles.comercioDetailTextWrapper}>
                    <Text style={[styles.comercioDetailLabel, isDarkMode && { color: '#AAA' }]}>Notas adicionales</Text>
                    <Text style={[styles.comercioDetailValue, isDarkMode && { color: '#EEE' }]}>
                      {item.comentario}
                    </Text>
                  </View>
                </View>
              )}

              {/* Badge de estado */}
              {/* <View style={styles.comercioStatusWrapper}>
                <Chip 
                  icon={item.entregado ? 'check-circle' : 'clock-outline'}
                  compact
                  style={[
                    styles.comercioStatusChip,
                    { backgroundColor: item.entregado ? '#4CAF5020' : '#FF980020' }
                  ]}
                  textStyle={{ 
                    color: item.entregado ? '#4CAF50' : '#FF9800',
                    fontWeight: '600',
                    fontSize: 11
                  }}
                >
                  {item.entregado ? 'Entregado' : 'Pendiente'}
                </Chip>
              </View> */}
            </Card.Content>
          )}
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
        } else if (item.type === 'COMERCIO') {
          return renderComercioCard(item);
        }

        // Fallback para tipos desconocidos
        return null;
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0,
    height: "100%",
   },
  
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
    marginTop: 0
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    // minHeight: 32
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
    paddingHorizontal: 4,
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
    // color: '#999',
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
  },

  // ✅ Estilos específicos para card COMERCIO colapsable
  comercioSurface: {
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    overflow: 'hidden'
  },
  comercioCard: {
    // backgroundColor adaptado por Surface
  },
  comercioMainContent: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  comercioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  comercioTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  comercioIcon: {
    margin: 0,
    marginRight: 8
  },
  comercioTitleTexts: {
    flex: 1
  },
  comercioProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  comercioSubtitle: {
    fontSize: 12,
    color: '#666'
  },
  comercioCloseButton: {
    margin: 0,
    marginTop: -4
  },
  comercioSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8
  },
  comercioSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  comercioSummaryIcon: {
    margin: 0,
    marginRight: 4
  },
  comercioSummaryLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4
  },
  comercioSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  comercioPriceHighlight: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: 'bold'
  },
  comercioExpandIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4
  },
  comercioExpandText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4
  },
  comercioChevron: {
    margin: 0
  },
  comercioExpandedContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  comercioDivider: {
    marginBottom: 12
  },
  comercioDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  comercioDetailTextWrapper: {
    flex: 1,
    marginLeft: 8
  },
  comercioDetailLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  comercioDetailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  comercioStatusWrapper: {
    marginTop: 8,
    alignItems: 'flex-start',
    height: 20,
    marginBottom: 20
  },
  comercioStatusChip: {
    alignSelf: 'flex-start'
  },
});

export default ListaPedidos;