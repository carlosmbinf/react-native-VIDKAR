import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

import PedidoCard from "./components/PedidoCard";

const HOME_COMMERCE_ORDERS_LIMIT = 2;

const HOME_COMMERCE_ORDER_FIELDS = {
  _id: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  "producto.carritos": 1,
  userId: 1,
};

const hasCommerceItems = (venta) => {
  const carritos = Array.isArray(venta?.producto?.carritos)
    ? venta.producto.carritos
    : [];

  return carritos.some((item) => item?.type === "COMERCIO");
};

const isActiveCommerceOrder = (venta) => {
  if (!hasCommerceItems(venta)) {
    return false;
  }

  if (venta?.isCancelada === true) {
    return false;
  }

  return venta?.estado !== "ENTREGADO";
};

const getStepFromStatus = (venta) => {
  if (venta?.isCancelada === true) {
    return -1;
  }

  const steps = {
    PREPARANDO: 1,
    CADETEENLOCAL: 2,
    ENCAMINO: 3,
    CADETEENDESTINO: 4,
    ENTREGADO: 5,
  };

  return steps[venta?.estado] || 1;
};

const ComercioHomeOrdersSection = ({ catalogOrders = [], catalogLoading = true }) => {
  const router = useRouter();
  const [expandedVentas, setExpandedVentas] = useState({});

  const ventas = useMemo(
    () =>
      (Array.isArray(catalogOrders) ? catalogOrders : [])
      .filter(isActiveCommerceOrder)
      .slice(0, HOME_COMMERCE_ORDERS_LIMIT),
    [catalogOrders],
  );

  const totalPedidos = ventas.length;

  const sectionSubtitle = useMemo(() => {
    if (totalPedidos === 1) {
      return "Tienes una entrega de comercio en seguimiento.";
    }

    return `Tienes ${totalPedidos} entregas de comercio en seguimiento.`;
  }, [totalPedidos]);

  const toggleExpanded = useCallback((ventaId) => {
    setExpandedVentas((previous) => ({
      ...previous,
      [ventaId]: !previous[ventaId],
    }));
  }, []);

  const openAllOrders = useCallback(() => {
    router.push("/(normal)/PedidosComerciosList");
  }, [router]);

  if (catalogLoading || ventas.length === 0) {
    return null;
  }

  return (
    <Surface elevation={5} style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.eyebrowRow}>
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons color="#ffedd5" name="truck-delivery" size={18} />
            </View>
            <Text style={styles.eyebrow}>Seguimiento activo</Text>
          </View>
          <Text style={styles.title} variant="titleMedium">
            Entregas de comercio
          </Text>
          <Text style={styles.subtitle} variant="bodySmall">
            {sectionSubtitle}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={openAllOrders}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed ? styles.viewAllButtonPressed : null,
          ]}
        >
          <Text style={styles.viewAllText}>Ver todos</Text>
          <MaterialCommunityIcons color="#fed7aa" name="chevron-right" size={18} />
        </Pressable>
      </View>

      <View style={styles.ordersList}>
        {ventas.map((venta) => (
          <PedidoCard
            currentStep={getStepFromStatus(venta)}
            isExpanded={Boolean(expandedVentas[venta._id])}
            key={venta._id}
            onToggleExpand={() => toggleExpanded(venta._id)}
            tone="dark"
            venta={venta}
          />
        ))}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: "#fed7aa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.28)",
    borderColor: "rgba(251, 146, 60, 0.42)",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  ordersList: {
    gap: 10,
  },
  section: {
    backgroundColor: "rgba(24, 18, 12, 0.86)",
    borderColor: "rgba(251, 146, 60, 0.24)",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 18,
    overflow: "hidden",
    padding: 14,
  },
  subtitle: {
    color: "rgba(255, 237, 213, 0.78)",
    lineHeight: 18,
  },
  title: {
    color: "#fff7ed",
    fontWeight: "900",
    marginBottom: 3,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  viewAllButton: {
    alignItems: "center",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
    borderColor: "rgba(251, 146, 60, 0.34)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 2,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  viewAllButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  viewAllText: {
    color: "#fed7aa",
    fontSize: 12,
    fontWeight: "800",
  },
});

export default ComercioHomeOrdersSection;