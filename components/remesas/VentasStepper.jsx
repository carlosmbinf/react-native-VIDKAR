import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground, Alert } from 'react-native';
import { 
  Text, Card, Chip, Divider, Button, List, IconButton, 
  ActivityIndicator, Surface, Portal, Dialog, Snackbar
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../collections/collections';
import SubidaArchivos from '../archivos/SubidaArchivos'; // ✅ NUEVO: Importar componente
// import Clipboard from '@react-native-clipboard/clipboard'; // ✅ NUEVO: Importar Clipboard
const Clipboard = require('react-native').Clipboard;
// ✅ MODIFICADO: Función para generar estados dinámicos según método de pago
const obtenerEstados = (metodoPago) => {
  if (metodoPago === 'EFECTIVO') {
    return ['Evidencia de Pago', 'Pago Confirmado', 'Pendiente de Entrega', 'Entregado'];
  }
  return ['Pago Confirmado', 'Pendiente de Entrega', 'Entregado'];
};

// ✅ MODIFICADO: Lógica de pasos considerando método EFECTIVO + evidencias
const obtenerPasoDesdeEstado = (venta) => {
  const esEfectivo = venta.metodoPago === 'EFECTIVO';
  const offset = esEfectivo ? 1 : 0; // Offset de 1 paso si es EFECTIVO

  // Paso 0 (solo EFECTIVO): Evidencia de Pago pendiente
  if (esEfectivo && venta.isCobrado === false) {
    return 0; // Esperando evidencia
  }

  // Paso 1 (EFECTIVO) / Paso 0 (otros): Pago Confirmado
  if (venta.isCobrado === false) {
    return offset; // Esperando confirmación de pago
  }

  // Calcular paso según entregas
  const itemsPendientes = venta?.producto?.carritos?.filter(carrito => !carrito.entregado)?.length || 0;
  
  if (itemsPendientes > 0) {
    return offset + 1; // Pendiente de Entrega
  }
  
  return offset + 2; // Entregado
};

const VentasStepper = ({ navigation }) => {
  const userId = Meteor.userId();
  const [expandedVentas, setExpandedVentas] = useState({});
  const [expandedAccordions, setExpandedAccordions] = useState({}); // ✅ NUEVO: Estado para accordions
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false); // ✅ NUEVO: Estado para Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState(''); // ✅ NUEVO: Mensaje del Snackbar

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

  // ✅ NUEVO: Función para copiar al portapapeles
  const copiarAlPortapapeles = (texto, tipo) => {
    if (!texto || texto === 'N/A') {
      setSnackbarMessage(`⚠️ No hay ${tipo} para copiar`);
      setSnackbarVisible(true);
      return;
    }

    Clipboard.setString(texto);
    setSnackbarMessage(`✅ ${tipo} copiado al portapapeles`);
    setSnackbarVisible(true);
  };

  // ✅ MODIFICADO: Renderizado de progreso con pasos dinámicos y conectores responsivos
  const renderStepper = (pasoActual, metodoPago) => {
    const estados = obtenerEstados(metodoPago);
    
    return (
      <View style={styles.stepperContainer}>
        {estados.map((estado, index) => {
          const isCompleted = index < pasoActual;
          const isActive = index === pasoActual;
          const isLastStepCompleted = pasoActual === estados.length - 1 && index === estados.length - 1;
          const isLastStep = index === estados.length - 1;
          
          return (
            <React.Fragment key={index}>
              <View style={styles.stepItem}>
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
              </View>
              
              {/* ✅ MODIFICADO: Conector con flex para ocupar espacio disponible */}
              {!isLastStep && (
                <View style={styles.stepConnectorContainer}>
                  <Divider 
                    style={[
                      styles.stepConnector, 
                      (isCompleted || isLastStepCompleted) ? styles.connectorActive : styles.connectorInactive
                    ]} 
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ✅ MODIFICADO: Renderizado de tarjeta con botones de acción para items
  const renderVentaCard = (venta, index, sectionTitle, esEntregada = false) => {
    const isExpanded = expandedVentas[venta._id];
    const pasoActual = obtenerPasoDesdeEstado(venta);
    const isAdmin = Meteor.user()?.profile?.role === 'admin';
    const esEfectivo = venta.metodoPago === 'EFECTIVO';
    const isPendientePago = venta.isCobrado === false;
    const necesitaEvidencia = esEfectivo && isPendientePago;
    const isCancelada = venta.isCancelada === true; // ✅ NUEVO: Flag de cancelación

    // ✅ Calcular resumen de items
    const totalItems = venta?.producto?.carritos?.length || 0;
    const itemsEntregados = venta?.producto?.carritos?.filter(item => item.entregado)?.length || 0;
    const itemsPendientes = totalItems - itemsEntregados;

    // ✅ Preview de primeros 2 items
    const previewItems = venta?.producto?.carritos?.slice(0, 2) || [];

    return (
      <Surface key={venta._id} style={styles.card} elevation={3}>
        {/* ✅ NUEVO: Ribbon de cancelada */}
        {isCancelada && (
          <View style={styles.ribbonContainer}>
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>CANCELADA</Text>
            </View>
          </View>
        )}

        <Card.Title 
          title={`${sectionTitle} #${index + 1}`}
          subtitle={venta.createdAt?.toLocaleString()}
          right={(props) => (
            <IconButton 
              {...props} 
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              onPress={() => toggleExpanded(venta._id)}
              style={{zIndex:100}}
            />
          )}
        />
        
        <Divider />

        <Card.Content>
          {renderStepper(pasoActual, venta.metodoPago)}
          
          {isExpanded && (
            <>
              {/* ✅ MODIFICADO: Alert de cancelación (prioridad sobre evidencia) */}
              {isCancelada && (
                <Surface style={styles.alertCancelada} elevation={1}>
                  <IconButton 
                    icon="close-circle" 
                    size={20} 
                    iconColor="#D32F2F"
                    style={{ margin: 0, marginRight: 8 }}
                  />
                  <Text style={styles.alertCanceladaText}>
                    ❌ Esta venta ha sido cancelada y no se procesará
                  </Text>
                </Surface>
              )}

              {/* ✅ Evidencia solo si NO está cancelada */}
              {necesitaEvidencia && !isCancelada && (
                <Surface style={styles.evidenciaCard} elevation={2}>
                  <View style={styles.evidenciaHeader}>
                    <IconButton 
                      icon="file-upload" 
                      size={24} 
                      iconColor="#FF9800"
                    />
                    <Text style={styles.evidenciaTitle}>
                      📤 Subir Evidencia de Pago
                    </Text>
                  </View>
                  
                  <Text style={styles.evidenciaSubtitle}>
                    Debe subir el comprobante de pago en efectivo para que el administrador 
                    confirme la transacción y proceda con la entrega de la remesa.
                  </Text>
                  
                  <Divider style={{ marginVertical: 12 }} />
                  
                  <SubidaArchivos venta={venta} />
                </Surface>
              )}

              {/* ✅ Alerta de pago pendiente solo si NO es EFECTIVO y NO cancelada */}
              {isPendientePago && !esEfectivo && !isCancelada && (
                <Surface style={styles.alertPendientePago} elevation={1}>
                  <IconButton 
                    icon="alert-circle" 
                    size={20} 
                    iconColor="#FF9800"
                    style={{ margin: 0, marginRight: 8 }}
                  />
                  <Text style={styles.alertPendientePagoText}>
                    ⏳ Esperando confirmación de pago
                  </Text>
                </Surface>
              )}

              <View style={styles.chipContainer}>
                <Chip icon="cash" style={styles.infoChip}>
                  Cobrado: {venta.cobrado} {venta.monedaCobrado || 'USD'}
                </Chip>
                <Chip icon="send" style={styles.infoChip}>
                  Enviado: {venta.precioOficial || 'N/A'} {'USD'}
                </Chip>
                <Chip icon="credit-card" style={styles.infoChip}>
                  {venta.metodoPago || 'N/A'}
                </Chip>
              </View>

              {venta.comentario && (
                <Text style={styles.comentarioGeneral}>📝 {venta.comentario}</Text>
              )}

              {/* ✅ Lista detallada de items con botones de acción (solo si está cobrado) */}
              {!isPendientePago && (
                <View style={styles.itemsDetailContainer}>
                  <View style={styles.itemsDetailHeader}>
                    <Text style={styles.itemsDetailTitle}>
                      📦 Remesas del Pedido ({totalItems})
                    </Text>
                    <View style={styles.badgeContainer}>
                      {itemsPendientes > 0 && (
                        <Chip 
                          icon="clock-outline" 
                          mode="flat" 
                          compact
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
                          compact
                          style={styles.badgeEntregado}
                          textStyle={styles.badgeText}
                        >
                          {itemsEntregados}
                        </Chip>
                      )}
                    </View>
                  </View>

                  {venta?.producto?.carritos?.map((item, itemIndex) => (
                    <Surface key={itemIndex} style={[
                      styles.itemDetailCard,
                      item.entregado && styles.itemDetailCardEntregado
                    ]} elevation={1}>
                      {/* ✅ Badge de estado en esquina */}
                      <View style={[
                        styles.estadoBadge,
                        item.entregado ? styles.estadoBadgeEntregado : styles.estadoBadgePendiente
                      ]}>
                        <IconButton 
                          icon={item.entregado ? "check-circle" : "clock-outline"} 
                          size={16}
                          iconColor="#fff"
                          style={{ margin: 0 }}
                        />
                      </View>

                      {/* ✅ Contenido del item */}
                      <View style={styles.itemDetailContent}>
                        <Text style={styles.itemDetailTitle}>
                          {item.entregado ? '✅' : '⏳'} Remesa #{itemIndex + 1}
                        </Text>

                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>👤 Destinatario:</Text>
                          <Text style={styles.itemDetailValue}>{item.nombre || 'N/A'}</Text>
                        </View>

                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>💰 Monto:</Text>
                          <Text style={styles.itemDetailValue}>
                            {item.recibirEnCuba || '0'} {item.monedaRecibirEnCuba}
                          </Text>
                        </View>

                        {/* ✅ MODIFICADO: Tarjeta CUP con botón de copiar */}
                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>💳 Tarjeta CUP:</Text>
                          <Text style={[styles.itemDetailValue, { flex: 0.8 }]} numberOfLines={1}>
                            {item.tarjetaCUP || 'N/A'}
                          </Text>
                          <IconButton
                            icon="content-copy"
                            size={18}
                            onPress={() => copiarAlPortapapeles(item.tarjetaCUP, 'Tarjeta CUP')}
                            style={styles.copyButton}
                            iconColor="#6200ee"
                          />
                        </View>

                        {/* ✅ MODIFICADO: Dirección con botón de copiar */}
                        {item.direccionCuba && (
                          <View style={styles.itemDetailRow}>
                            <Text style={styles.itemDetailLabel}>📍 Dirección:</Text>
                            <Text style={[styles.itemDetailValue, { flex: 0.8 }]} numberOfLines={2}>
                              {item.direccionCuba}
                            </Text>
                            <IconButton
                              icon="content-copy"
                              size={18}
                              onPress={() => copiarAlPortapapeles(item.direccionCuba, 'Dirección')}
                              style={styles.copyButton}
                              iconColor="#6200ee"
                            />
                          </View>
                        )}

                        {item.comentario && (
                          <Surface style={styles.itemComentarioBox} elevation={0}>
                            <Text style={styles.itemComentarioText}>
                              💬 {item.comentario}
                            </Text>
                          </Surface>
                        )}

                        {/* ✅ NUEVO: Botones de acción solo para admins */}
                        {isAdmin && (
                          <View style={styles.itemActionButtons}>
                            {item.entregado ? (
                              <Button
                                mode="outlined"
                                icon="undo-variant"
                                onPress={() => marcarItemNoEntregado(venta._id, itemIndex)}
                                style={styles.actionButtonRevertir}
                                labelStyle={styles.actionButtonLabel}
                                compact
                              >
                                Marcar No Entregado
                              </Button>
                            ) : (
                              <Button
                                mode="contained"
                                icon="check-bold"
                                onPress={() => marcarItemEntregado(venta._id, itemIndex)}
                                style={styles.actionButtonEntregar}
                                labelStyle={styles.actionButtonLabel}
                                compact
                              >
                                Marcar Entregado
                              </Button>
                            )}
                          </View>
                        )}
                      </View>
                    </Surface>
                  ))}
                </View>
              )}
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

      {/* ✅ NUEVO: Snackbar para feedback de copia */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
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
    overflow: 'hidden',
    position: 'relative',
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
    justifyContent: 'space-between', // ✅ MODIFICADO: space-between para distribuir uniformemente
    alignItems: 'center',
    marginVertical: 16,
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 60, // ✅ NUEVO: ancho mínimo para que no se comprima demasiado
  },
  // ✅ NUEVO: Contenedor para el conector que crece dinámicamente
  stepConnectorContainer: {
    flex: 1, // ✅ Ocupa el espacio disponible entre pasos
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4, // Margen pequeño para separación
  },
  stepConnector: {
    width: '100%', // ✅ MODIFICADO: 100% del contenedor en lugar de width fijo
    height: 2,
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
  // ...existing code...
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
  // ✅ NUEVOS: Estilos para alerta de pago pendiente
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
  // ✅ NUEVOS: Estilos para card de evidencia
  evidenciaCard: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  evidenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  // ✅ NUEVOS: Estilos para lista detallada de items con botones
  itemsDetailContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(98, 0, 238, 0.1)',
  },
  itemsDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsDetailTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  itemDetailCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    position: 'relative',
    overflow: 'hidden',
  },
  itemDetailCardEntregado: {
    borderLeftColor: '#4CAF50',
    opacity: 0.85,
  },
  estadoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estadoBadgePendiente: {
    backgroundColor: '#FF9800',
  },
  estadoBadgeEntregado: {
    backgroundColor: '#4CAF50',
  },
  itemDetailContent: {
    paddingRight: 40,
  },
  itemDetailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center', // ✅ MODIFICADO: center para alinear botón de copiar
  },
  itemDetailLabel: {
    fontWeight: '600',
    minWidth: 120,
    fontSize: 13,
  },
  itemDetailValue: {
    flex: 1,
    fontSize: 13,
  },
  itemComentarioBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  itemComentarioText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
  },
  itemActionButtons: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButtonEntregar: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  actionButtonRevertir: {
    borderColor: '#F44336',
    borderRadius: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ✅ NUEVO: Estilo para botón de copiar
  copyButton: {
    margin: 0,
    marginLeft: 4,
  },
  // ✅ NUEVO: Estilo para Snackbar
  snackbar: {
    backgroundColor: '#6200ee',
  },
  // ✅ MODIFICADO: Estilos para ribbon en esquina superior DERECHA
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    right: 0, // ✅ CAMBIADO: left → right
    zIndex: 10,
    width: 150,
    height: 150,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 40,
    right: -40, // ✅ CAMBIADO: left → right con offset negativo
    width: 200,
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    transform: [{ rotate: '45deg' }], // ✅ CAMBIADO: -45deg → 45deg para esquina derecha
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
  // ✅ NUEVO: Estilos para alerta de cancelación
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
});

export default VentasStepper;

