import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { Card, Divider, IconButton, Surface, Text } from "react-native-paper";

import SubidaArchivos from "../../../archivos/SubidaArchivos.native";
import { TiendasComercioCollection } from "../../../collections/collections";
import MapaPedidoConCadete from "../../maps/MapaPedidoConCadete";
import PedidoStepper from "./PedidoStepper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const formatFecha = (date) => {
  if (!date) return "N/A";
  const parsed = new Date(date);

  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
};

const PedidoCardNative = ({
  currentStep,
  isExpanded,
  onToggleExpand,
  venta,
}) => {
  const isCanceled = venta?.isCancelada === true;
  const isPendientePago = venta?.isCobrado === false;
  const necesitaEvidencia =
    !venta?.isCobrado && !isCanceled && venta?.metodoPago === "EFECTIVO";
  const carritos = venta?.producto?.carritos || [];
  const totalProductos = carritos.length;
  const primeraCompra = carritos[0];
  const tienda = primeraCompra?.idTienda;
  const coordenadas = primeraCompra?.coordenadas;
  const comentarioPedido = primeraCompra?.comentario;
  const cadeteId = venta?.cadeteid;

  const tiendaData = Meteor.useTracker(() => {
    if (!tienda) {
      return null;
    }

    Meteor.subscribe("tiendas", { _id: tienda });
    return TiendasComercioCollection.findOne({ _id: tienda });
  }, [tienda]);

  const estadosConMapa = ["CADETEENLOCAL", "ENCAMINO", "CADETEENDESTINO"];
  const mostrarMapa =
    !isCanceled &&
    cadeteId &&
    venta?.estado &&
    estadosConMapa.includes(venta.estado) &&
    tienda &&
    coordenadas;

  return (
    <Surface elevation={8} style={styles.card}>
      {isCanceled ? (
        <View style={styles.ribbonContainer}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>CANCELADA</Text>
          </View>
        </View>
      ) : null}

      <Card.Title
        right={(props) => (
          <IconButton
            {...props}
            icon={isExpanded ? "chevron-up" : "chevron-down"}
            onPress={onToggleExpand}
            style={styles.toggleButton}
          />
        )}
        subtitle={formatFecha(venta?.createdAt)}
        title={`Pedido #${venta?._id.slice(-6).toUpperCase()}`}
      />

      <Divider />

      <View>
        <PedidoStepper currentStep={currentStep} isCanceled={isCanceled} />

        {isExpanded ? (
          <View
            style={[
              styles.expandedContent,
              mostrarMapa ? styles.expandedContentWithMap : null,
            ]}
          >
            {mostrarMapa ? (
              <View style={styles.mapWrapper}>
                <MapaPedidoConCadete
                  cadeteId={cadeteId}
                  coordenadasDestino={coordenadas}
                  idTienda={tienda}
                />

                <LinearGradient
                  colors={[
                    "rgba(0, 0, 0, 0.7)",
                    "rgba(0, 0, 0, 0.7)",
                    "transparent",
                  ]}
                  locations={[0, 0.6, 1]}
                  pointerEvents="none"
                  style={styles.gradientOverlay}
                />
              </View>
            ) : null}

            {isCanceled ? (
              <Surface elevation={1} style={styles.alertCancelada}>
                <IconButton
                  icon="close-circle"
                  iconColor="#D32F2F"
                  size={20}
                  style={styles.alertIconButton}
                />
                <Text style={styles.alertCanceladaText}>
                  ❌ Este pedido ha sido cancelado y no se procesará
                </Text>
              </Surface>
            ) : null}

            {!mostrarMapa &&
            !isCanceled &&
            cadeteId &&
            venta?.estado === "PREPARANDO" ? (
              <Surface elevation={1} style={styles.alertInfo}>
                <IconButton
                  icon="clock-outline"
                  iconColor="#2196F3"
                  size={20}
                  style={styles.alertIconButton}
                />
                <Text style={styles.alertInfoText}>
                  📦 El pedido está siendo preparado. El seguimiento en tiempo
                  real estará disponible cuando el cadete recoja el pedido.
                </Text>
              </Surface>
            ) : null}

            {!mostrarMapa && !isCanceled && venta?.estado === "ENTREGADO" ? (
              <Surface elevation={1} style={styles.alertSuccess}>
                <IconButton
                  icon="check-circle"
                  iconColor="#4CAF50"
                  size={20}
                  style={styles.alertIconButton}
                />
                <Text style={styles.alertSuccessText}>
                  Pedido entregado exitosamente
                </Text>
              </Surface>
            ) : null}

            {necesitaEvidencia ? (
              <Surface elevation={2} style={styles.evidenciaCard}>
                <View style={styles.evidenciaHeader}>
                  <IconButton color="#FF9800" icon="file-upload" size={24} />
                  <Text style={styles.evidenciaTitle}>
                    📤 Subir Evidencia de Pago
                  </Text>
                </View>

                <Text style={styles.evidenciaSubtitle}>
                  Debe subir el comprobante de pago en efectivo para que el
                  administrador confirme la transacción y proceda con la entrega
                  del pedido.
                </Text>

                <Divider style={styles.evidenciaDivider} />

                <SubidaArchivos venta={venta} />
              </Surface>
            ) : null}

            {isPendientePago && !isCanceled && !necesitaEvidencia ? (
              <Surface elevation={1} style={styles.alertPendientePago}>
                <IconButton
                  icon="alert-circle"
                  iconColor="#FF9800"
                  size={20}
                  style={styles.alertIconButton}
                />
                <Text style={styles.alertPendientePagoText}>
                  ⏳ Esperando confirmación de pago
                </Text>
              </Surface>
            ) : null}

            <Divider style={styles.divider} />

            <View style={styles.productosSection}>
              <Text style={styles.sectionTitle} variant="titleSmall">
                📦 Productos del Pedido ({totalProductos})
              </Text>

              {carritos.map((item, index) => (
                <View key={`${venta._id}-${index}`} style={styles.productoRow}>
                  <View style={styles.productoInfo}>
                    <Text
                      numberOfLines={1}
                      style={styles.productoNombre}
                      variant="bodyMedium"
                    >
                      •{" "}
                      {item.producto?.name ||
                        item.nombre ||
                        "Producto sin nombre"}
                    </Text>
                    {item.producto?.descripcion ? (
                      <Text
                        numberOfLines={1}
                        style={styles.productoDescripcion}
                        variant="bodySmall"
                      >
                        {item.producto.descripcion}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.productoCantidad} variant="bodySmall">
                    x{item.cantidad || 1}
                  </Text>
                  <Text style={styles.productoPrecio} variant="bodyMedium">
                    {parseFloat(
                      item.cobrarUSD || item.producto?.precio || 0,
                    ).toFixed(2)}{" "}
                    {item.monedaACobrar}
                  </Text>
                </View>
              ))}
            </View>

            {comentarioPedido ? (
              <>
                <Divider style={styles.divider} />

                <View style={styles.comentarioSection}>
                  <MaterialCommunityIcons
                    color="#616161"
                    name="comment-text-outline"
                    size={16}
                  />
                  <Text style={styles.comentarioText} variant="bodySmall">
                    {comentarioPedido}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  alertCancelada: {
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderLeftColor: "#D32F2F",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertCanceladaText: {
    color: "#B71C1C",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  alertIconButton: {
    margin: 0,
    marginRight: 8,
  },
  alertInfo: {
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderLeftColor: "#2196F3",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertInfoText: {
    color: "#1565C0",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  alertPendientePago: {
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderLeftColor: "#FF9800",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertPendientePagoText: {
    color: "#E65100",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  alertSuccess: {
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderLeftColor: "#4CAF50",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertSuccessText: {
    color: "#2E7D32",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    elevation: 8,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  comentarioSection: {
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    flexDirection: "row",
    marginTop: 8,
    padding: 12,
  },
  comentarioText: {
    color: "#616161",
    flex: 1,
    fontStyle: "italic",
    marginLeft: 8,
  },
  divider: {
    marginVertical: 12,
  },
  expandedContent: {
    marginTop: 0,
  },
  expandedContentWithMap: {
    marginTop: -85,
  },
  evidenciaCard: {
    backgroundColor: "#FFF3E0",
    borderLeftColor: "#FF9800",
    borderLeftWidth: 4,
    borderRadius: 65,
    marginVertical: 16,
  },
  evidenciaDivider: {
    marginVertical: 10,
  },
  evidenciaHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  evidenciaSubtitle: {
    color: "#666",
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  evidenciaTitle: {
    color: "#E65100",
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  gradientOverlay: {
    borderRadius: 11,
    height: 120,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  mapWrapper: {
    overflow: "hidden",
    position: "relative",
  },
  productoCantidad: {
    color: "#757575",
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: "center",
  },
  productoDescripcion: {
    color: "#757575",
    fontSize: 11,
    marginTop: 2,
  },
  productoInfo: {
    flex: 1,
    marginRight: 8,
  },
  productoNombre: {
    fontWeight: "600",
  },
  productoPrecio: {
    color: "#FF6F00",
    fontWeight: "600",
    minWidth: 80,
    textAlign: "right",
  },
  productoRow: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productosSection: {
    marginTop: 8,
  },
  ribbon: {
    backgroundColor: "#D32F2F",
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: -40,
    shadowColor: "#000",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    top: 40,
    transform: [{ rotate: "45deg" }],
    width: 200,
  },
  ribbonContainer: {
    height: 150,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    width: 150,
    zIndex: 10,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  toggleButton: {
    zIndex: 11,
  },
});

export default PedidoCardNative;
