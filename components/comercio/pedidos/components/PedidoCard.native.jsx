import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Divider, IconButton, Surface, Text } from "react-native-paper";

import SubidaArchivos from "../../../archivos/SubidaArchivos.native";
import { VentasRechargeCollection } from "../../../collections/collections";
import MapaPedidoConCadete from "../../maps/MapaPedidoConCadete";
import PedidoStepper from "./PedidoStepper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PEDIDO_CARD_DETAIL_FIELDS = {
  _id: 1,
  cadeteid: 1,
  userId: 1,
  "producto.carritos": 1,
};

const mergeVentaWithDetail = (ventaBase, ventaDetalle) => {
  if (!ventaDetalle) {
    return ventaBase;
  }

  return {
    ...ventaBase,
    ...ventaDetalle,
    producto: {
      ...(ventaBase?.producto || {}),
      ...(ventaDetalle?.producto || {}),
      carritos:
        ventaDetalle?.producto?.carritos || ventaBase?.producto?.carritos || [],
    },
  };
};

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

const PedidoCardExpandedContent = ({
  currentStep,
  isCanceled,
  isPendientePago,
  necesitaEvidencia,
  tone = "default",
  venta,
}) => {
  const isDarkTone = tone === "dark";
  const { detailReady, isAdmin, ventaDetalle } = Meteor.useTracker(() => {
    const ventaId = venta?._id;
    const currentUser = Meteor.user();

    if (!ventaId) {
      return {
        detailReady: false,
        isAdmin:
          currentUser?.profile?.role === "admin" ||
          currentUser?.username === "carlosmbinf",
        ventaDetalle: null,
      };
    }

    const detailHandle = Meteor.subscribe("ventasRecharge", { _id: ventaId }, {
      fields: PEDIDO_CARD_DETAIL_FIELDS,
    });
    const ventaDoc = VentasRechargeCollection.findOne(
      { _id: ventaId },
      { fields: PEDIDO_CARD_DETAIL_FIELDS },
    );

    return {
      detailReady: detailHandle.ready(),
      isAdmin:
        currentUser?.profile?.role === "admin" ||
        currentUser?.username === "carlosmbinf",
      ventaDetalle: ventaDoc || null,
    };
  }, [venta?._id]);

  const ventaCompleta = mergeVentaWithDetail(venta, ventaDetalle);
  const carritos = ventaCompleta?.producto?.carritos || [];
  const totalProductos = carritos.length;
  const primeraCompra = carritos[0];
  const tienda = primeraCompra?.idTienda;
  const coordenadas = primeraCompra?.coordenadas;
  const comentarioPedido = primeraCompra?.comentario;
  const nombreCalle = String(primeraCompra?.nombreCalle || "").trim();
  const numeroCasa = String(primeraCompra?.numeroCasa || "").trim();
  const direccionEntrega = [nombreCalle, numeroCasa].filter(Boolean).join(" ");
  const cadeteId = ventaCompleta?.cadeteid;
  const detailLoading = !detailReady && !ventaDetalle;
  const estadosConMapa = ["CADETEENLOCAL", "ENCAMINO", "CADETEENDESTINO"];
  const mostrarMapa =
    !isCanceled &&
    cadeteId &&
    ventaCompleta?.estado &&
    estadosConMapa.includes(ventaCompleta.estado) &&
    tienda &&
    coordenadas;

  return (
    <View style={styles.expandedContent}>
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

          <View pointerEvents="none" style={styles.mapStepperHeader}>
            <PedidoStepper currentStep={currentStep} isCanceled={isCanceled} />
          </View>
        </View>
      ) : null}

      {!mostrarMapa ? (
        <PedidoStepper currentStep={currentStep} isCanceled={isCanceled} />
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

      {!mostrarMapa && !isCanceled && ventaCompleta?.estado === "PREPARANDO" ? (
        <Surface elevation={1} style={styles.alertInfo}>
          <IconButton
            icon="clock-outline"
            iconColor="#2196F3"
            size={20}
            style={styles.alertIconButton}
          />
          <Text style={styles.alertInfoText}>
            📦 El pedido está siendo preparado. El seguimiento en tiempo real estará disponible cuando el cadete recoja el pedido.
          </Text>
        </Surface>
      ) : null}

      {!mostrarMapa && !isCanceled && ventaCompleta?.estado === "ENTREGADO" ? (
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

      {necesitaEvidencia && isAdmin ? (
        <Surface elevation={2} style={styles.evidenciaCard}>
          <View style={styles.evidenciaHeader}>
            <IconButton color="#FF9800" icon="file-upload" size={24} />
            <Text style={styles.evidenciaTitle}>
              📤 Subir Evidencia de Pago
            </Text>
          </View>

          <Text style={styles.evidenciaSubtitle}>
            Debe subir el comprobante del pago para que el administrador confirme la transacción y proceda con la entrega del pedido.
          </Text>

          <Divider style={styles.evidenciaDivider} />

          <SubidaArchivos venta={ventaCompleta} />
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

      {detailLoading ? (
        <Surface
          elevation={1}
          style={[
            styles.detailLoadingCard,
            isDarkTone ? styles.detailLoadingCardDark : null,
          ]}
        >
          <ActivityIndicator color="#FF6F00" size="small" />
          <Text
            style={[
              styles.detailLoadingText,
              isDarkTone ? styles.detailLoadingTextDark : null,
            ]}
          >
            Cargando detalle del pedido...
          </Text>
        </Surface>
      ) : (
        <>
          <Divider
            style={[styles.divider, isDarkTone ? styles.dividerDark : null]}
          />

          <View style={styles.productosSection}>
            <Text
              style={[
                styles.sectionTitle,
                isDarkTone ? styles.sectionTitleDark : null,
              ]}
              variant="titleSmall"
            >
              📦 Productos del Pedido ({totalProductos})
            </Text>

            {carritos.map((item, index) => (
              <View
                key={`${ventaCompleta._id}-${index}`}
                style={[
                  styles.productoRow,
                  isDarkTone ? styles.productoRowDark : null,
                ]}
              >
                <View style={styles.productoInfo}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.productoNombre,
                      isDarkTone ? styles.productoNombreDark : null,
                    ]}
                    variant="bodyMedium"
                  >
                    •{" "}
                    {item.producto?.name || item.nombre || "Producto sin nombre"}
                  </Text>
                  {item.producto?.descripcion ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.productoDescripcion,
                        isDarkTone ? styles.productoDescripcionDark : null,
                      ]}
                      variant="bodySmall"
                    >
                      {item.producto.descripcion}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.productoCantidad,
                    isDarkTone ? styles.productoCantidadDark : null,
                  ]}
                  variant="bodySmall"
                >
                  x{item.cantidad || 1}
                </Text>
                <Text style={styles.productoPrecio} variant="bodyMedium">
                  {parseFloat(item.cobrarUSD || item.producto?.precio || 0).toFixed(2)}{" "}
                  {item.monedaACobrar}
                </Text>
              </View>
            ))}
          </View>

          {direccionEntrega ? (
            <>
              <Divider
                style={[styles.divider, isDarkTone ? styles.dividerDark : null]}
              />

              <View
                style={[
                  styles.comentarioSection,
                  isDarkTone ? styles.comentarioSectionDark : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={isDarkTone ? "#fed7aa" : "#616161"}
                  name="home-map-marker"
                  size={16}
                />
                <Text
                  style={[
                    styles.comentarioText,
                    isDarkTone ? styles.comentarioTextDark : null,
                  ]}
                  variant="bodySmall"
                >
                  {direccionEntrega}
                </Text>
              </View>
            </>
          ) : null}

          {comentarioPedido ? (
            <>
              <Divider
                style={[styles.divider, isDarkTone ? styles.dividerDark : null]}
              />

              <View
                style={[
                  styles.comentarioSection,
                  isDarkTone ? styles.comentarioSectionDark : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={isDarkTone ? "#fed7aa" : "#616161"}
                  name="comment-text-outline"
                  size={16}
                />
                <Text
                  style={[
                    styles.comentarioText,
                    isDarkTone ? styles.comentarioTextDark : null,
                  ]}
                  variant="bodySmall"
                >
                  {comentarioPedido}
                </Text>
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
};

const PedidoCardNative = ({
  currentStep,
  isExpanded,
  onToggleExpand,
  tone = "default",
  venta,
}) => {
  const isDarkTone = tone === "dark";
  const isCanceled = venta?.isCancelada === true;
  const isPendientePago = venta?.isCobrado === false;
  const necesitaEvidencia =
    !venta?.isCobrado && !isCanceled && venta?.metodoPago === "EFECTIVO";

  return (
    <Surface
      elevation={8}
      style={[styles.card, isDarkTone ? styles.cardDark : null]}
    >
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
        subtitleStyle={isDarkTone ? styles.cardSubtitleDark : null}
        title={`Pedido #${venta?._id.slice(-6).toUpperCase()}`}
        titleStyle={isDarkTone ? styles.cardTitleDark : null}
      />

      <Divider style={isDarkTone ? styles.dividerDark : null} />

      <View>
        {!isExpanded ? (
          <PedidoStepper currentStep={currentStep} isCanceled={isCanceled} />
        ) : null}

        {isExpanded ? (
          <PedidoCardExpandedContent
            currentStep={currentStep}
            isCanceled={isCanceled}
            isPendientePago={isPendientePago}
            necesitaEvidencia={necesitaEvidencia}
            tone={tone}
            venta={venta}
          />
        ) : null}
      </View>
    </Surface>
  );
};

const arePedidoCardPropsEqual = (prevProps, nextProps) => {
    if (prevProps.tone !== nextProps.tone) {
      return false;
    }

    if (prevProps.currentStep !== nextProps.currentStep) {
      return false;
    }

    if (prevProps.isExpanded !== nextProps.isExpanded) {
      return false;
    }

    const prevVenta = prevProps.venta;
    const nextVenta = nextProps.venta;

    if (prevVenta === nextVenta) {
      return true;
    }

    if (!prevVenta || !nextVenta) {
      return false;
    }

    if (
      prevVenta._id !== nextVenta._id ||
      prevVenta.createdAt !== nextVenta.createdAt ||
      prevVenta.estado !== nextVenta.estado ||
      prevVenta.isCancelada !== nextVenta.isCancelada ||
      prevVenta.isCobrado !== nextVenta.isCobrado ||
      prevVenta.metodoPago !== nextVenta.metodoPago
    ) {
      return false;
    }

    return true;
  };

export default memo(PedidoCardNative, arePedidoCardPropsEqual);
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
  cardDark: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderColor: "rgba(251, 146, 60, 0.22)",
    borderWidth: 1,
  },
  cardSubtitleDark: {
    color: "rgba(255, 237, 213, 0.72)",
  },
  cardTitleDark: {
    color: "#fff7ed",
    fontWeight: "800",
  },
  comentarioSection: {
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    flexDirection: "row",
    marginTop: 8,
    padding: 12,
  },
  comentarioSectionDark: {
    backgroundColor: "rgba(251, 146, 60, 0.08)",
    borderColor: "rgba(251, 146, 60, 0.16)",
    borderWidth: 1,
  },
  comentarioText: {
    color: "#616161",
    flex: 1,
    fontStyle: "italic",
    marginLeft: 8,
  },
  comentarioTextDark: {
    color: "rgba(255, 237, 213, 0.88)",
  },
  detailLoadingCard: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLoadingCardDark: {
    backgroundColor: "rgba(30, 41, 59, 0.86)",
    borderColor: "rgba(251, 146, 60, 0.18)",
    borderWidth: 1,
  },
  detailLoadingText: {
    color: "#616161",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
  detailLoadingTextDark: {
    color: "rgba(255, 237, 213, 0.8)",
  },
  divider: {
    marginVertical: 12,
  },
  dividerDark: {
    backgroundColor: "rgba(251, 146, 60, 0.18)",
  },
  expandedContent: {
    marginTop: 12,
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
    marginTop: 4,
    overflow: "hidden",
    position: "relative",
    borderRadius: 12,
  },
  mapStepperHeader: {
    elevation: 3,
    left: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    position: "absolute",
    right: 0,
    top: -5,
    zIndex: 3,
  },
  productoCantidad: {
    color: "#757575",
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: "center",
  },
  productoCantidadDark: {
    color: "rgba(255, 237, 213, 0.76)",
  },
  productoDescripcion: {
    color: "#757575",
    fontSize: 11,
    marginTop: 2,
  },
  productoDescripcionDark: {
    color: "rgba(255, 237, 213, 0.62)",
  },
  productoInfo: {
    flex: 1,
    marginRight: 8,
  },
  productoNombre: {
    fontWeight: "600",
  },
  productoNombreDark: {
    color: "#fff7ed",
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
  productoRowDark: {
    backgroundColor: "rgba(30, 41, 59, 0.78)",
    borderColor: "rgba(251, 146, 60, 0.12)",
    borderWidth: 1,
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
  sectionTitleDark: {
    color: "#ffedd5",
  },
  toggleButton: {
    zIndex: 11,
  },
});
