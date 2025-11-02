import React from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DataTable, Text, Chip, Surface, Portal, Dialog, Button, IconButton, Divider } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection, EvidenciasVentasEfectivoCollection } from '../collections/collections';
import SubidaArchivos from '../archivos/SubidaArchivos';

const chipColorEstado = (estado) => {
  switch (estado) {
    case 'ENTREGADO':
      return '#28a745';
    case 'PENDIENTE_ENTREGA':
      return '#ffc107';
    case 'CANCELADO':
    case 'PENDIENTE_PAGO':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

const estadoLabel = (estado) => {
  switch (estado) {
    case 'PENDIENTE_PAGO':
      return 'Pendiente de Pago';
    case 'PENDIENTE_ENTREGA':
      return 'Pendiente';
    case 'ENTREGADO':
      return 'Pagado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return estado;
  }
};

// ✅ Colores temáticos por tipo
const getTypeColor = (type) => {
  switch (type) {
    case 'PROXY':
      return '#2196F3'; // Azul
    case 'VPN':
      return '#4CAF50'; // Verde
    default:
      return '#6c757d';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'PROXY':
      return 'wifi';
    case 'VPN':
      return 'shield-check';
    default:
      return 'package-variant';
  }
};

// ✅ Convertir MB a GB
const megasToGB = (megas) => {
  if (!megas || megas === 999999) return 'ILIMITADO';
  return `${(megas / 1024).toFixed(2)} GB`;
};

const getItemsCount = (venta) => (
  venta?.producto?.carritos?.length ||
  venta?.carrito?.length ||
  0
);

const getItemsArray = (venta) =>
  (venta?.producto?.carritos || venta?.carrito || [])?.filter(
    carrito => carrito.type === 'PROXY' || carrito.type === 'VPN'
  ) || [];

const TableProxyVPNHistory = () => {
  const { width, height } = useWindowDimensions();
  const isWide = width > height || width >= 768;

  const flexes = React.useMemo(() => {
    return isWide
      ? { fecha: 1.4, tipo: 0.8, estado: 1.2, cobrado: 0.9, items: 0.6, acc: 0.35 }
      : { fecha: 1.6, estado: 1.5, acc: 0.35 };
  }, [isWide]);

  const isAdmin = Meteor.user()?.profile?.role === 'admin' || false;
  const isAdminPrincipal = Meteor.user()?.username === 'carlosmbinf' || false;

  const listIdSubordinados = useTracker(() => {
    if (!isAdmin) return [];
    Meteor.subscribe("user", { bloqueadoDesbloqueadoPor: Meteor.userId() }, { fields: { _id: 1 } });
    return Meteor.users.find({ bloqueadoDesbloqueadoPor: Meteor.userId() }).fetch()?.map((el) => el._id) || [];
  }, [Meteor.userId()]);

  const { ventas, loading } = useTracker(() => {
    const query = isAdminPrincipal
      ? { 'producto.carritos.type': { $in: ['PROXY', 'VPN'] } }
      : isAdmin
      ? { 
          'producto.carritos.type': { $in: ['PROXY', 'VPN'] },
          $or: [{ userId: Meteor.userId() }, { userId: { $in: listIdSubordinados } }]
        }
      : { 
          'producto.carritos.type': { $in: ['PROXY', 'VPN'] },
          userId: Meteor.userId()
        };

    const sub = Meteor.subscribe('ventasRecharge', query);
    const ventas = VentasRechargeCollection.find(query, { sort: { createdAt: -1 } });
    return { ventas, loading: !sub.ready() };
  }, [listIdSubordinados]);

  const ventasArr = React.useMemo(() => {
    if (!ventas) return [];
    if (Array.isArray(ventas)) return ventas;
    if (typeof ventas.fetch === 'function') return ventas.fetch();
    try { return Array.from(ventas); } catch { return []; }
  }, [ventas]);

  // ✅ Suscripción a evidencias
  const carritoIds = React.useMemo(() => {
    const ids = [];
    for (const v of ventasArr) {
      const carritos = getItemsArray(v) || [];
      for (const c of carritos) {
        if (c?._id) ids.push(String(c._id));
      }
    }
    return Array.from(new Set(ids));
  }, [ventasArr]);

  const { evidencias, cargandoEvidencias } = useTracker(() => {
    if (!carritoIds || carritoIds.length === 0) return { evidencias: [], cargandoEvidencias: false };
    const sub = Meteor.subscribe('evidenciasVentasEfectivoRecharge', { ventaId: { $in: carritoIds } });
    const evidencias = EvidenciasVentasEfectivoCollection.find({ ventaId: { $in: carritoIds } }).fetch();
    return { evidencias, cargandoEvidencias: !sub.ready() };
  }, [JSON.stringify(carritoIds)]);

  const evidencia = (idCarrito) => evidencias?.find(e => e.ventaId === idCarrito);

  const [visible, setVisible] = React.useState(false);
  const [ventaSel, setVentaSel] = React.useState(null);

  const openDialog = (venta) => { setVentaSel(venta); setVisible(true); };
  const closeDialog = () => { setVisible(false); setVentaSel(null); };

  const formatFecha = (d) => (d ? new Date(d).toLocaleString() : '-');
  const money = (v, m) => `${v ?? 0} ${m ?? ''}`.trim();

  const maxDialogHeight = Math.floor(height * 0.9);
  const headerActionsReserve = 140;
  const maxScrollHeight = Math.max(200, maxDialogHeight - headerActionsReserve);

  const deriveEstadoVenta = (venta) => {
    if (venta.isCobrado) return 'ENTREGADO';
    if (venta.isCancelada) return 'CANCELADO';
    const carritos = getItemsArray(venta) || [];
    const allEntregado = carritos.length > 0 && carritos.every(c => c.entregado === true);
    if (allEntregado) return 'ENTREGADO';
    if (venta.isCobrado !== true) return 'PENDIENTE_PAGO';
    return 'PENDIENTE_ENTREGA';
  };

  // ✅ Derivar tipo predominante (PROXY, VPN o MIXTO)
  const getTipoPredominante = (venta) => {
    const carritos = getItemsArray(venta);
    if (carritos.length === 0) return '-';
    const hasProxy = carritos.some(c => c.type === 'PROXY');
    const hasVPN = carritos.some(c => c.type === 'VPN');
    if (hasProxy && hasVPN) return 'MIXTO';
    if (hasProxy) return 'PROXY';
    if (hasVPN) return 'VPN';
    return '-';
  };

  return (
      <Surface style={{ height: '100%' }}>
    <ScrollView style={styles.container} scrollEnabled>
        <Text variant="headlineMedium" style={styles.title}>
          📊 Historial Proxy/VPN
        </Text>

        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ flex: flexes.fecha }}>Fecha</DataTable.Title>
            {isWide && <DataTable.Title style={{ flex: flexes.tipo }}>Tipo</DataTable.Title>}
            <DataTable.Title style={{ flex: flexes.estado }}>Estado</DataTable.Title>
            {isWide && <DataTable.Title numeric style={{ flex: flexes.cobrado }}>Cobrado</DataTable.Title>}
            {isWide && <DataTable.Title numeric style={{ flex: flexes.items }}>Ítems</DataTable.Title>}
            <DataTable.Title numeric style={{ flex: flexes.acc }}>Acc.</DataTable.Title>
          </DataTable.Header>

          {loading ? (
            <DataTable.Row>
              <DataTable.Cell>Cargando...</DataTable.Cell>
            </DataTable.Row>
          ) : ventasArr.length === 0 ? (
            <DataTable.Row>
              <DataTable.Cell>
                <Surface style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    📭 No tienes compras de Proxy/VPN registradas
                  </Text>
                </Surface>
              </DataTable.Cell>
            </DataTable.Row>
          ) : (
            ventasArr.map((row, idx) => {
              const fecha = formatFecha(row?.createdAt);
              const tipo = getTipoPredominante(row);
              const cobrado = money(row?.cobrado, row?.monedaCobrado);
              const items = getItemsCount(row);
              const estadoDerivado = deriveEstadoVenta(row);

              return (
                <DataTable.Row key={row?._id || idx}>
                  <DataTable.Cell style={{ flex: flexes.fecha }}>{fecha}</DataTable.Cell>
                  {isWide && (
                    <DataTable.Cell style={{ flex: flexes.tipo }}>
                      <Chip
                        compact
                        icon={getTypeIcon(tipo)}
                        style={{ backgroundColor: getTypeColor(tipo) }}
                        textStyle={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}
                      >
                        {tipo}
                      </Chip>
                    </DataTable.Cell>
                  )}
                  <DataTable.Cell style={{ flex: flexes.estado }}>
                    <Chip
                      compact={!isWide}
                      style={{ backgroundColor: chipColorEstado(estadoDerivado) }}
                      textStyle={{ color: 'white' }}
                    >
                      {estadoLabel(estadoDerivado)}
                    </Chip>
                  </DataTable.Cell>
                  {isWide && <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>{cobrado}</DataTable.Cell>}
                  {isWide && <DataTable.Cell numeric style={{ flex: flexes.items }}>{items}</DataTable.Cell>}
                  <DataTable.Cell numeric style={{ flex: flexes.acc }}>
                    <IconButton
                      icon="information-outline"
                      size={18}
                      style={{ margin: 0 }}
                      onPress={() => openDialog(row)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })
          )}
        </DataTable>

        <Portal>
          <Dialog visible={visible} onDismiss={closeDialog} style={{ maxHeight: maxDialogHeight }}>
            <Dialog.Content>
              <ScrollView
                style={{ maxHeight: maxScrollHeight }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {ventaSel ? (
                  <View style={{ borderRadius: 8 }}>
                    <View style={{ padding: 0, borderRadius: 6, marginBottom: 0 }}>
                      <Text style={{ marginBottom: 6 }}>
                        <Text style={{ fontWeight: 'bold' }}>ID de la Venta: </Text>
                        {ventaSel._id}
                      </Text>
                      <Divider style={{ marginBottom: 6 }} />
                      <Text style={{ marginBottom: 6 }}>
                        📅 <Text style={{ fontWeight: 'bold' }}>Fecha:</Text> {formatFecha(ventaSel.createdAt)}
                      </Text>
                      <Text style={{ marginBottom: 6 }}>
                        💳 <Text style={{ fontWeight: 'bold' }}>Método de pago:</Text> {ventaSel.metodoPago || '-'}
                      </Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ marginBottom: 6 }}>
                          📊 <Text style={{ fontWeight: 'bold' }}>Estado:</Text>
                        </Text>
                        <Chip
                          compact
                          style={{
                            backgroundColor: chipColorEstado(deriveEstadoVenta(ventaSel)),
                            marginLeft: 8,
                          }}
                          textStyle={{ color: 'black', fontSize: 12 }}
                        >
                          {estadoLabel(deriveEstadoVenta(ventaSel))}
                        </Chip>
                      </View>
                    </View>
                    <Divider />

                    <Text variant="titleMedium" style={{ marginBottom: 12, marginTop: 12 }}>
                      📦 Paquetes ({getItemsArray(ventaSel).length})
                    </Text>

                    {getItemsArray(ventaSel).length === 0 ? (
                      <Surface style={styles.warningBox}>
                        <Text style={styles.warningText}>⚠️ Sin paquetes registrados</Text>
                      </Surface>
                    ) : (
                      getItemsArray(ventaSel).map((it, i) => {
                        const typeColor = getTypeColor(it.type);
                        const isEntregado = it.entregado === true;

                        return (
                          <Surface
                            key={i}
                            style={{
                              maxWidth: 400,
                              padding: 14,
                              marginBottom: 12,
                              borderRadius: 8,
                              elevation: 2,
                              borderLeftWidth: 4,
                              borderLeftColor: typeColor,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#343a40' }}>
                                {it.type === 'PROXY' ? '📡' : '🔒'} Paquete {it.type} #{i + 1}
                              </Text>
                              <Chip
                                compact
                                icon={getTypeIcon(it.type)}
                                style={{ backgroundColor: typeColor }}
                                textStyle={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}
                              >
                                {it.type}
                              </Chip>
                            </View>

                            <Text style={{ marginBottom: 6 }}>
                              <Text style={{ fontWeight: 'bold' }}>ID del Paquete: </Text>
                              {it._id || 'N/A'}
                            </Text>
                            <Text style={{ marginBottom: 4 }}>
                              👤 <Text style={{ fontWeight: 'bold' }}>Cliente:</Text> {it?.nombre || 'Sin especificar'}
                            </Text>
                            <Text style={{ marginBottom: 4 }}>
                              💾 <Text style={{ fontWeight: 'bold' }}>Datos:</Text> {megasToGB(it.megas)}
                            </Text>
                            <Text style={{ marginBottom: 6 }}>
                              💰 <Text style={{ fontWeight: 'bold' }}>Precio:</Text> {money(it.cobrarUSD, 'CUP')}
                            </Text>

                            <Surface
                              style={{
                                padding: 8,
                                borderRadius: 6,
                                backgroundColor: isEntregado ? '#d4edda' : '#fff3cd',
                                marginVertical: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontWeight: 'bold',
                                  color: isEntregado ? '#155724' : '#856404',
                                  marginBottom: 4,
                                }}
                              >
                                {isEntregado ? '✅' : '⏳'} Estado del Paquete
                              </Text>
                              <Text style={{ color: isEntregado ? '#155724' : '#856404' }}>
                                Entregado: {isEntregado ? 'Sí' : 'No'}
                              </Text>
                            </Surface>

                            {it?.comentario && (
                              <Surface style={styles.commentBox}>
                                <Text style={{ fontStyle: 'italic', color: '#6c757d' }}>💬 {it.comentario}</Text>
                              </Surface>
                            )}

                            <Divider style={{marginTop:10,marginBottom:10}}>
                            {/* <Chip icon="information" onPress={() => console.log('Pressed')}>Example Chip</Chip> */}
                            </Divider>

                            {Meteor.user()?.profile?.role == "admin" && it?.descuentoAdmin > 0 && (
                              <Surface style={styles.discountBox}>
                                <Text style={styles.discountText}>
                                  🏷️ Descuento para el Admin: {it.descuentoAdmin}
                                </Text>
                              </Surface>
                            )}

                            {Meteor.user()?.profile?.role == "admin" && it?.descuentoAdmin > 0 && (
                              <Surface style={styles.discountBox}>
                                <Text style={styles.discountText}>
                                  🏷️ Ganancia del Admin: {Number(it.cobrarUSD) - it.descuentoAdmin}
                                </Text>
                              </Surface>
                            )}
                          </Surface>
                        );
                      })
                    )}

                    {ventaSel?.metodoPago === 'EFECTIVO' && (
                      <Surface style={styles.uploadBox}>
                        <Text style={styles.uploadText}>
                          ⚠️ Debe subir evidencia para corroborar el pago y autorizar la activación
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    )}
                  </View>
                ) : (
                  <Surface style={styles.errorBox}>
                    <Text style={{ textAlign: 'center', color: '#721c24' }}>❌ Sin datos disponibles</Text>
                  </Surface>
                )}
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Button mode="contained" onPress={closeDialog} style={{ borderRadius: 8 }}>
                Cerrar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
    </ScrollView>
      </Surface>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  emptyState: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  emptyText: { textAlign: 'center', color: '#6c757d', fontSize: 14 },
  warningBox: {
    padding: 16,
    borderRadius: 6,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  warningText: { textAlign: 'center', color: '#856404' },
  discountBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#d4edda',
    marginVertical: 4,
  },
  discountText: { color: '#155724', fontWeight: 'bold', fontSize: 12 },
  commentBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    marginTop: 8,
  },
  uploadBox: {
    marginTop: 5,
    borderRadius: 6,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  uploadText: { textAlign: 'center', color: '#856404', paddingBottom: 5 },
  errorBox: { padding: 20, borderRadius: 8, backgroundColor: '#f8d7da' },
});

export default TableProxyVPNHistory;