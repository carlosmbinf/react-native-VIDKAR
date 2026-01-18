import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, Surface, IconButton, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import SubidaArchivos from '../../../archivos/SubidaArchivos';
import PedidoStepper from './PedidoStepper';
import MapaPedidoConCadete from '../../maps/MapaPedidoConCadete';
import Meteor,{useTracker} from "@meteorrn/core"
import { TiendasComercioCollection } from '../../../collections/collections';
/**
 * Componente Card individual de pedido
 * @param {Object} venta - Objeto de venta con estructura:
 *   - producto.carritos: Array de items del pedido
 *   - isCancelada: Boolean indicando si está cancelado
 *   - isCobrado: Boolean indicando si fue pagado
 *   - cobrado: Number con monto cobrado
 *   - monedaCobrado: String con la moneda (CUP, USD, etc)
 *   - estado: String con el estado actual (PREPARANDO, ENCAMINO, etc)
 * @param {Number} currentStep - Paso actual del stepper (1-5)
 * @param {Boolean} isExpanded - Si el card está expandido
 * @param {Function} onToggleExpand - Callback para expandir/colapsar
 */
const PedidoCard = ({ venta, currentStep, isExpanded, onToggleExpand }) => {
  console.log("venta en PedidoCard:", venta);

  // ✅ Estados del pedido
  const isCanceled = venta.isCancelada === true;
  const isPendientePago = venta.isCobrado === false;
  const necesitaEvidencia = !venta.isCobrado && !isCanceled && venta.metodoPago === 'EFECTIVO';

  // ✅ Extraer datos de los carritos (productos del pedido)
  const carritos = venta?.producto?.carritos || [];
  const totalProductos = carritos.length;

  // ✅ Calcular total del pedido
  const totalPagar = carritos.reduce((sum, item) => {
    const precioItem = parseFloat(item.cobrarUSD || item.producto?.precio || 0);
    const cantidad = item.cantidad || 1;
    return sum + (precioItem * cantidad);
  }, 0);

  // ✅ Formatear fecha
  const formatFecha = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ✅ Obtener datos de la primera tienda (asumiendo que todos los items son de la misma tienda)
  const primeraCompra = carritos[0];
  const tienda = primeraCompra?.idTienda;
// ✅ Obtener datos de la tienda usando useTracker
    const tiendaData = useTracker(() => {
        if (!tienda) return null;
        
        // Suscribirse a la tienda específica
        Meteor.subscribe('tiendas', { _id: tienda });
        
        // Obtener la tienda de la colección
        return TiendasComercioCollection.findOne({ _id: tienda });
    }, [tienda]);

    // ✅ Usar tiendaData en lugar de tienda directamente
  const coordenadas = primeraCompra?.coordenadas;
  const comentarioPedido = primeraCompra?.comentario;
  const cadeteId = venta?.cadeteid; // ID del cadete asignado (si existe)

  // ✨ NUEVA LÓGICA: Determinar si debe mostrarse el mapa
  const ESTADOS_CON_MAPA = ['CADETEENLOCAL', 'ENCAMINO', 'CADETEENDESTINO'];
  const mostrarMapa = 
    !isCanceled &&                              // No está cancelado
    cadeteId &&                                  // Tiene cadete asignado
    venta.estado &&                              // Tiene estado definido
    ESTADOS_CON_MAPA.includes(venta.estado) &&  // Estado es uno de los válidos
    tienda &&                                    // Tiene tienda
    coordenadas;                                 // Tiene coordenadas de destino

  console.log("🗺️ [PedidoCard] Validación de mapa:", {
    isCanceled,
    cadeteId,
    estado: venta.estado,
    estadoValido: ESTADOS_CON_MAPA.includes(venta.estado),
    tienda,
    coordenadas,
    mostrarMapa
  });

  console.log("tienda en PedidoCard:", tienda, "coordenadas:", coordenadas, "cadeteId:", cadeteId);
  return (
    <Surface style={styles.card} elevation={8}>
      {/* Ribbon de cancelada */}
      {isCanceled && (
        <View style={styles.ribbonContainer}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>CANCELADA</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <Card.Title 
        title={`Pedido #${venta._id.slice(-6).toUpperCase()}`}
        subtitle={formatFecha(venta.createdAt)}
        right={(props) => (
          <IconButton 
            {...props} 
            icon={isExpanded ? "chevron-up" : "chevron-down"}
            onPress={onToggleExpand}
          />
        )}
      />
      
      <Divider />

      <View>
        {/* Stepper */}
        <PedidoStepper currentStep={currentStep} isCanceled={isCanceled} />
        
        {/* Contenido expandible */}
        {isExpanded && (
          <View style={[
            styles.expandedContent,
            // ✨ Ajustar marginTop solo si se va a mostrar el mapa
            mostrarMapa && styles.expandedContentWithMap
          ]}>
            {/* 🗺️ MAPA DEL PEDIDO CON CADETE - CONDICIONAL */}
            {mostrarMapa && (
              <View style={styles.mapWrapper}>
                <MapaPedidoConCadete 
                  idTienda={tienda}
                  cadeteId={cadeteId}
                  coordenadasDestino={coordenadas}
                />
                
                {/* ✨ Gradiente superior para visibilidad del stepper */}
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.7)', 'transparent']}
                  locations={[0, 0.6, 1]}
                  style={styles.gradientOverlay}
                  pointerEvents="none"
                />
              </View>
            )}

            {/* Alert de cancelación */}
            {isCanceled && (
              <Surface style={styles.alertCancelada} elevation={1}>
                <IconButton 
                  icon="close-circle" 
                  size={20} 
                  iconColor="#D32F2F"
                  style={{ margin: 0, marginRight: 8 }}
                />
                <Text style={styles.alertCanceladaText}>
                  ❌ Este pedido ha sido cancelado y no se procesará
                </Text>
              </Surface>
            )}

            {/* ✨ NUEVO: Alert informativo cuando el mapa no está disponible */}
            {!mostrarMapa && !isCanceled && cadeteId && venta.estado === 'PREPARANDO' && (
              <Surface style={styles.alertInfo} elevation={1}>
                <IconButton 
                  icon="clock-outline" 
                  size={20} 
                  color="#2196F3"
                  style={{ margin: 0, marginRight: 8 }}
                />
                <Text style={styles.alertInfoText}>
                  📦 El pedido está siendo preparado. El seguimiento en tiempo real estará disponible cuando el cadete recoja el pedido.
                </Text>
              </Surface>
            )}

            {/* ✨ NUEVO: Alert cuando está entregado */}
            {!mostrarMapa && !isCanceled && venta.estado === 'ENTREGADO' && (
              <Surface style={styles.alertSuccess} elevation={1}>
                <IconButton 
                  icon="check-circle" 
                  size={20} 
                  color="#4CAF50"
                  style={{ margin: 0, marginRight: 8 }}
                />
                <Text style={styles.alertSuccessText}>
                  Pedido entregado exitosamente
                </Text>
              </Surface>
            )}

            {/* Card de evidencia de pago (solo para EFECTIVO pendiente) */}
            {necesitaEvidencia && (
              <Surface style={styles.evidenciaCard} elevation={2}>
                <View style={styles.evidenciaHeader}>
                  <IconButton 
                    icon="file-upload" 
                    size={24} 
                    color="#FF9800"
                  />
                  <Text style={styles.evidenciaTitle}>
                    📤 Subir Evidencia de Pago
                  </Text>
                </View>
                
                <Text style={styles.evidenciaSubtitle}>
                  Debe subir el comprobante de pago en efectivo para que el administrador 
                  confirme la transacción y proceda con la entrega del pedido.
                </Text>
                
                <Divider style={{ marginVertical: 10 }} />
                
                <SubidaArchivos venta={venta} />
              </Surface>
            )}

            {/* Alerta de pago pendiente */}
            {isPendientePago && !isCanceled && !necesitaEvidencia && (
              <Surface style={styles.alertPendientePago} elevation={1}>
                <IconButton 
                  icon="alert-circle" 
                  size={20} 
                  color="#FF9800"
                  style={{ margin: 0, marginRight: 8 }}
                />
                <Text style={styles.alertPendientePagoText}>
                  ⏳ Esperando confirmación de pago
                </Text>
              </Surface>
            )}

            <Divider style={styles.divider} />

            {/* Resumen de productos */}
            <View style={styles.productosSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                📦 Productos del Pedido ({totalProductos})
              </Text>
              {carritos.map((item, index) => (
                <View key={index} style={styles.productoRow}>
                  <View style={styles.productoInfo}>
                    <Text variant="bodyMedium" style={styles.productoNombre} numberOfLines={1}>
                      • {item.producto?.name || item.nombre || 'Producto sin nombre'}
                    </Text>
                    {item.producto?.descripcion && (
                      <Text variant="bodySmall" style={styles.productoDescripcion} numberOfLines={1}>
                        {item.producto.descripcion}
                      </Text>
                    )}
                  </View>
                  <Text variant="bodySmall" style={styles.productoCantidad}>
                    x{item.cantidad || 1}
                  </Text>
                  <Text variant="bodyMedium" style={styles.productoPrecio}>
                    {parseFloat(item.cobrarUSD || item.producto?.precio || 0).toFixed(2)} {item.monedaACobrar}
                  </Text>
                </View>
              ))}
            </View>

            <Divider style={styles.divider} />

            {/* Comentario del pedido */}
            {comentarioPedido && (
              <View style={styles.comentarioSection}>
                <MaterialCommunityIcons name="comment-text-outline" size={16} color="#616161" />
                <Text variant="bodySmall" style={styles.comentarioText}>
                  {comentarioPedido}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  // ✨ MODIFICADO: Contenedor del contenido expandible (sin mapa)
  expandedContent: {
    marginTop: 0, // Sin margin negativo por defecto
  },
  // ✨ NUEVO: Aplicar margin negativo solo cuando hay mapa
  expandedContentWithMap: {
    marginTop: -85,
  },
  // ✨ Nuevo: Wrapper del mapa con posición relativa para el gradiente
  mapWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  // ✨ Nuevo: Gradiente overlay
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120, // Altura suficiente para cubrir el stepper
    zIndex: 1,
    elevation: 0, // Para Android
    borderRadius:11
  },
  divider: {
    marginVertical: 12,
  },
  // Ribbon
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    width: 150,
    height: 150,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 40,
    right: -40,
    width: 200,
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  ribbonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Alertas
  alertCancelada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  alertCanceladaText: {
    fontSize: 13,
    color: '#B71C1C',
    fontWeight: '600',
    flex: 1,
  },
  alertPendientePago: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertPendientePagoText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    flex: 1,
  },
  // ✨ NUEVOS: Alerts informativos
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  alertInfoText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  alertSuccessText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    flex: 1,
  },
  // Evidencia
  evidenciaCard: {
    marginVertical: 16,
    borderRadius: 65,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  evidenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  evidenciaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    flex: 1,
  },
  evidenciaSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  // Información de pago
  infoSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 111, 0, 0.05)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    // color: '#424242',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    color: '#757575',
    fontWeight: '600',
  },
  infoValue: {
    color: '#212121',
    fontWeight: '500',
  },
  infoValueHighlight: {
    color: '#FF6F00',
    fontWeight: 'bold',
  },
  metodoPagoChip: {
    height: 28,
  },
  pagadoChip: {
    backgroundColor: '#E8F5E9',
    height: 28,
  },
  pendienteChip: {
    backgroundColor: '#FFF3E0',
    height: 28,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Productos
  productosSection: {
    marginTop: 8,
  },
  productoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  productoInfo: {
    flex: 1,
    marginRight: 8,
  },
  productoNombre: {
    // color: '#212121',
    fontWeight: '600',
  },
  productoDescripcion: {
    color: '#757575',
    fontSize: 11,
    marginTop: 2,
  },
  productoCantidad: {
    marginHorizontal: 8,
    color: '#757575',
    minWidth: 30,
    textAlign: 'center',
  },
  productoPrecio: {
    fontWeight: '600',
    color: '#FF6F00',
    minWidth: 80,
    textAlign: 'right',
  },
  // Tienda
  tiendaSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 111, 0, 0.05)',
    borderRadius: 8,
  },
  tiendaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tiendaTitulo: {
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  tiendaDescripcion: {
    color: '#616161',
    marginTop: 4,
    fontSize: 12,
  },
  // Ubicación
  ubicacionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 8,
  },
  ubicacionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ubicacionTitulo: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  coordenadasText: {
    color: '#616161',
    marginTop: 4,
    fontSize: 11,
  },
  // Comentario
  comentarioSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  comentarioText: {
    marginLeft: 8,
    color: '#616161',
    flex: 1,
    fontStyle: 'italic',
  },
  // Estado
  estadoSection: {
    marginTop: 12,
    alignItems: 'center',
  },
  estadoChip: {
    // backgroundColor: '#E3F2FD',
    height: 30,
  },
  estadoChipCancelado: {
    // backgroundColor: '#FFEBEE',
  },
  estadoChipEntregado: {
    // backgroundColor: '#E8F5E9',
  },
  estadoChipText: {
    fontSize: 12,    fontWeight: 'bold',    letterSpacing: 1,  },});
    export default PedidoCard;