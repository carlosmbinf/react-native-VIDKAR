import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground, Alert } from 'react-native';
import { 
  Text, Card, Chip, Divider, Button, List, IconButton, 
  ActivityIndicator, Surface, Portal, Dialog 
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../collections/collections';

const estados = ['Pago Confirmado', 'Pendiente de Entrega', 'Entregado'];

const obtenerPasoDesdeEstado = (venta) => {
  const total = venta?.producto?.carritos?.filter(carrito => !carrito.entregado)?.length;
  return total > 0 ? 1 : 2; // 1 = Pendiente, 2 = Entregado
};

const VentasStepper = ({ navigation }) => {
  const userId = Meteor.userId();
  const [expandedVentas, setExpandedVentas] = useState({});
  const [expandedAccordions, setExpandedAccordions] = useState({}); // ✅ NUEVO: Estado para accordions
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  const idAdmin = useTracker(() => {
    return Meteor.userId();
  });

  // ✅ Suscripción a usuarios subordinados (si es admin)
  const listIdSubordinados = useTracker(() => {
    if (!idAdmin) return [];
    Meteor.subscribe('user', { bloqueadoDesbloqueadoPor: idAdmin }, { fields: { _id: 1,bloqueadoDesbloqueadoPor:1 } });
    return Meteor.users.find({ bloqueadoDesbloqueadoPor: idAdmin }).fetch()?.map(el => el._id);
  }, [idAdmin]);

  // ✅ Suscripción a ventas NO entregadas
  const { ventas, loading } = useTracker(() => {
    const filtro = Meteor?.user()?.username == "carlosmbinf" 
    ? {} 
    : {
        $or: [
          { userId: { $in: listIdSubordinados } },
          { userId: userId }
        ]
      };

    const sub = Meteor.subscribe('ventasRecharge', {
      ...filtro,
      "producto.carritos.entregado": false,
      "producto.carritos.type": "REMESA"
    });

    const ventas = VentasRechargeCollection.find({
      // ...filtro,
      "producto.carritos.entregado": false,
      "producto.carritos.type": "REMESA"
    }, { sort: { createdAt: -1 } }).fetch();

    return { ventas, loading: !sub.ready() };
  });

  // ✅ Suscripción a ventas ENTREGADAS
  const ventasEntregadas = useTracker(() => {
    const filtro = Meteor?.user()?.username == "carlosmbinf" 
    ? {} 
    : {
        $or: [
          { userId: { $in: listIdSubordinados } },
          { userId: userId }
        ]
      };
      const sub = Meteor.subscribe('ventasRecharge', {
        ...filtro,
        "producto.carritos.entregado": true,
        "producto.carritos.type": "REMESA"
      });
    return VentasRechargeCollection.find({
      ...filtro,
      "producto.carritos.entregado": true,
      "producto.carritos.type": "REMESA"
    }, { sort: { createdAt: -1 } }).fetch();
  });

  // ✅ Toggle expansión de card
  const toggleExpanded = (ventaId) => {
    setExpandedVentas(prev => ({ ...prev, [ventaId]: !prev[ventaId] }));
  };

  // ✅ NUEVO: Toggle para accordion interno
  const toggleAccordion = (ventaId) => {
    setExpandedAccordions(prev => ({ ...prev, [ventaId]: !prev[ventaId] }));
  };

  // ✅ Marcar item como entregado/no entregado
  const marcarItemEntregado = (ventaId, itemIndex) => {
    setSelectedAction({ ventaId, itemIndex, action: 'entregar' });
    setDialogVisible(true);
  };

  const marcarItemNoEntregado = (ventaId, itemIndex) => {
    setSelectedAction({ ventaId, itemIndex, action: 'no_entregar' });
    setDialogVisible(true);
  };

  const confirmarAccion = () => {
    if (!selectedAction) return;

    const { ventaId, itemIndex, action } = selectedAction;
    const method = action === 'entregar' 
      ? 'ventas.marcarItemEntregado' 
      : 'ventas.marcarItemNoEntregado';

    Meteor.call(method, { ventaId, itemIndex }, (err) => {
      if (err) {
        Alert.alert('Error', err.reason || 'No se pudo actualizar el estado');
      } else {
        Alert.alert('Éxito', `Item marcado como ${action === 'entregar' ? 'entregado' : 'no entregado'}`);
      }
      setDialogVisible(false);
      setSelectedAction(null);
    });
  };

  // ✅ MODIFICADO: Renderizado de progreso (Stepper visual) con último paso checked
  const renderStepper = (pasoActual) => {
    return (
      <View style={styles.stepperContainer}>
        {estados.map((estado, index) => {
          const isCompleted = index < pasoActual;
          const isActive = index === pasoActual;
          const isLastStepCompleted = pasoActual === 2 && index === 2; // ✅ Último paso entregado
          
          return (
            <View key={index} style={styles.stepItem}>
              <View style={[
                styles.stepCircle, 
                (isCompleted || isActive || isLastStepCompleted) ? styles.stepActive : styles.stepInactive
              ]}>
                {(isCompleted || isLastStepCompleted) ? (
                  <IconButton icon="check" size={16} iconColor="#fff" />
                ) : (
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                (isCompleted || isActive || isLastStepCompleted) && styles.stepLabelActive
              ]}>
                {estado}
              </Text>
              {index < estados.length - 1 && (
                <Divider 
                  style={[
                    styles.stepConnector, 
                    (isCompleted || isLastStepCompleted) ? styles.connectorActive : styles.connectorInactive
                  ]} 
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ✅ Renderizado de item del carrito
  const renderCarritoItem = (item, index, ventaId, isAdmin) => {
    const entregado = item.entregado;

    return (
      <Surface key={index} style={styles.itemCard} elevation={0}>
        {entregado && (
          <ImageBackground
            source={require('../files/ok.png')} // ✅ Crear este asset
            style={styles.entregadoBackground}
            imageStyle={styles.entregadoImage}
            resizeMode="contain"
          />
        )}
        
        <View style={styles.itemContent}>
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Nombre:</Text>
            <Chip mode="flat" style={styles.chip}>{item.nombre || 'N/A'}</Chip>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Entregar:</Text>
            <Chip mode="flat" style={styles.chip}>
              {item.recibirEnCuba || '0'} {item.monedaRecibirEnCuba}
            </Chip>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Tarjeta CUP:</Text>
            <Chip mode="flat" style={styles.chip}>{item.tarjetaCUP || 'N/A'}</Chip>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Dirección:</Text>
            <Text style={styles.itemValue}>{item.direccionCuba || 'N/A'}</Text>
          </View>

          {item.comentario && (
            <View style={styles.comentarioContainer}>
              <Text style={styles.comentarioLabel}>🗒️ Nota:</Text>
              <Text style={styles.comentarioText}>{item.comentario}</Text>
            </View>
          )}

          {isAdmin && (
            <View style={styles.actionButtons}>
              {entregado ? (
                <Button 
                  mode="outlined" 
                  onPress={() => marcarItemNoEntregado(ventaId, index)}
                  color="#F44336"
                  icon="undo"
                >
                  No Entregado
                </Button>
              ) : (
                <Button 
                  mode="outlined" 
                  onPress={() => marcarItemEntregado(ventaId, index)}
                  color="#4CAF50"
                  icon="check-circle"
                >
                  Entregado
                </Button>
              )}
            </View>
          )}
        </View>
      </Surface>
    );
  };

  // ✅ Renderizado de tarjeta de venta con preview y animación
  const renderVentaCard = (venta, index, sectionTitle, esEntregada = false) => {
    const isExpanded = expandedVentas[venta._id];
    const isAccordionExpanded = expandedAccordions[venta._id];
    const pasoActual = obtenerPasoDesdeEstado(venta);
    const isAdmin = Meteor.user()?.profile?.role === 'admin';

    // ✅ Calcular resumen de items
    const totalItems = venta?.producto?.carritos?.length || 0;
    const itemsEntregados = venta?.producto?.carritos?.filter(item => item.entregado)?.length || 0;
    const itemsPendientes = totalItems - itemsEntregados;

    // ✅ Preview de primeros 2 items
    const previewItems = venta?.producto?.carritos?.slice(0, 2) || [];

    return (
      <Surface key={venta._id} style={styles.card} elevation={3}>
        <Card.Title 
          title={`${sectionTitle} #${index + 1}`}
          subtitle={venta.createdAt?.toLocaleString()}
          right={(props) => (
            <IconButton 
              {...props} 
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              onPress={() => toggleExpanded(venta._id)}
            />
          )}
        />
        
        <Divider />

        <Card.Content>
          {renderStepper(pasoActual)}
          {/* ✅ MODIFICADO: Accordion con animación y controlado por estado */}
        {isExpanded && (
          <>
          <View style={styles.chipContainer}>
            <Chip icon="cash" style={styles.infoChip}>
              Cobrado: {venta.cobrado} {venta.monedaCobrado || 'USD'}
            </Chip>
            <Chip icon="send" style={styles.infoChip}>
              Enviado: {venta.precioOficial || 'N/A'} {venta.monedaCobrado || 'USD'}
            </Chip>
            <Chip icon="credit-card" style={styles.infoChip}>
              {venta.metodoPago || 'N/A'}
            </Chip>
          </View>

          {venta.comentario && (
            <Text style={styles.comentarioGeneral}>📝 {venta.comentario}</Text>
          )}

          {/* ✅ NUEVO: Preview de items (siempre visible) */}
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>📦 Carrito ({totalItems} items)</Text>
              <View style={styles.badgeContainer}>
                {itemsPendientes > 0 && (
                  <Chip 
                    icon="clock-outline" 
                    mode="flat" 
                    style={styles.badgePendiente}
                    textStyle={styles.badgeText}
                  >
                    {itemsPendientes}
                  </Chip>
                )}
                {itemsEntregados > 0 && (
                  <Chip 
                    icon="check-circle" 
                    mode="flat" 
                    style={styles.badgeEntregado}
                    textStyle={styles.badgeText}
                  >
                    {itemsEntregados}
                  </Chip>
                )}
              </View>
            </View>

            {/* ✅ Preview compacto de primeros 2 items */}
            {previewItems.map((item, i) => (
              <Surface key={i} style={styles.previewItem} elevation={0}>
                <View style={styles.previewItemContent}>
                  <IconButton 
                    icon={item.entregado ? "check-circle" : "clock-outline"} 
                    size={20}
                    iconColor={item.entregado ? "#4CAF50" : "#FF9800"}
                  />
                  <View style={styles.previewItemText}>
                    <Text style={styles.previewItemName} numberOfLines={1}>
                      {item.nombre || 'Remesa'}
                    </Text>
                    <Text style={styles.previewItemDetail} numberOfLines={1}>
                      {item.recibirEnCuba} {item.monedaRecibirEnCuba}
                    </Text>
                    <Text style={styles.previewItemDetail} >
                    {item.tarjetaCUP || item.direccionCuba}
                    </Text>
                    <Text style={styles.previewItemDetail} >
                    📝 {item.comentario}
                    </Text>
                  </View>
                  {/* <Chip mode="flat" style={[styles.previewItemChip,item.entregado ? styles.badgeEntregado : styles.badgePendiente]}>
                    {item.entregado ? '✓' : '⏳'}
                  </Chip> */}
                </View>
              </Surface>
            ))}

            {totalItems > 2 && (
              <Text style={styles.moreItemsText}>
                +{totalItems - 2} items más...
              </Text>
            )}
          </View>
          </>
        )}
          
        </Card.Content>

      </Surface>
    );
  };

  if (loading) {
    return (
      <Surface style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </Surface>
    );
  }

  return (
    <Surface style={{height: '100%'}}>
      <ScrollView style={styles.container}>
        <View style={{paddingBottom: 50}}>
          {/* ✅ Sección: Remesas sin entregar */}
        <Text variant="headlineMedium" style={styles.sectionTitle}>
          Seguimiento de Remesas sin Entregar
        </Text>
        
        {ventas.length === 0 ? (
          <Surface style={styles.emptyState} elevation={3}> 
            <IconButton icon="package-variant" size={48} iconColor="#ccc" />
            <Text style={styles.emptyText}>No tienes remesas pendientes</Text>
          </Surface>
        ) : (
          ventas.map((venta, index) => renderVentaCard(venta, index, 'Remesa'))
        )}

        <Divider style={{ marginVertical: 24 }} />

        {/* ✅ Sección: Remesas entregadas */}
        <Text variant="headlineMedium" style={styles.sectionTitle}>
          Remesas Entregadas
        </Text>

        {ventasEntregadas.length === 0 ? (
          <Surface style={styles.emptyState} elevation={3}>
            <IconButton icon="check-all" size={48} iconColor="#4CAF50" />
            <Text style={styles.emptyText}>No tienes remesas entregadas</Text>
          </Surface>
        ) : (
          ventasEntregadas.map((venta, index) => 
            renderVentaCard(venta, index, 'Remesa', true)
          )
        )}
        </View>
        
      </ScrollView>

      {/* ✅ Dialog de confirmación */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Confirmar Acción</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Está seguro de marcar este item como{' '}
              {selectedAction?.action === 'entregar' ? 'entregado' : 'no entregado'}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={confirmarAccion} mode="contained">Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    paddingBottom: 16,
    borderRadius: 30,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  infoChip: {
    margin: 4,
  },
  comentarioGeneral: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#666',
  },
  accordion: {
    backgroundColor: 'rgba(98, 0, 238, 0.03)',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  itemCard: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  entregadoBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  entregadoImage: {
    opacity: 0.15,
    position: 'absolute',
    right: 0,
    top: '20%',
    width: '50%',
    height: '60%',
  },
  itemContent: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 80,
  },
  itemValue: {
    flex: 1,
  },
  chip: {
    maxWidth: '70%',
  },
  comentarioContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  comentarioLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comentarioText: {
    color: '#666',
    whiteSpace: 'pre-wrap',
  },
  actionButtons: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  // ✅ Stepper personalizado
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 16,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  stepInactive: {
    backgroundColor: 'transparent',
    borderColor: '#ccc',
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepLabel: {
    marginTop: 4,
    fontSize: 10,
    textAlign: 'center',
    color: '#999', // ✅ NUEVO: Color por defecto para estados inactivos
  },
  stepLabelActive: {
    color: '#6200ee', // ✅ NUEVO: Color para estados activos/completados
    fontWeight: '600',
  },
  stepConnector: {
    position: 'absolute',
    top: 20,
    left: '50%',
    width: 100,
    height: 2,
  },
  connectorActive: {
    backgroundColor: '#6200ee',
  },
  connectorInactive: {
    backgroundColor: '#ccc',
  },
  // ✅ NUEVOS: Estilos para preview de items
  previewContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(98, 0, 238, 0.1)',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    // color: '#333',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badgePendiente: {
    backgroundColor: '#FF9800',
    // height: 24,
  },
  badgeEntregado: {
    backgroundColor: '#4CAF50',
    // height: 24,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  previewItem: {
    // backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 8,
    overflow: 'hidden',
  },
  previewItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  previewItemText: {
    flex: 1,
    marginLeft: 4,
  },
  previewItemName: {
    fontWeight: '600',
    fontSize: 13,
    // color: '#333',
  },
  previewItemDetail: {
    fontSize: 11,
    // color: '#666',
    marginTop: 2,
  },
  previewItemChip: {
    // height: 24,
    minWidth: 32,
  },
  moreItemsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default VentasStepper;
