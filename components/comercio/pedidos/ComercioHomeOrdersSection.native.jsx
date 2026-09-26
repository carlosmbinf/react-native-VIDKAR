import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";

import {
  getCommerceOrderStep,
  hasCommerceItems,
} from "../../ventas/ventasUtils";
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

const isActiveCommerceOrder = (venta) => {
  if (!hasCommerceItems(venta)) {
    return false;
  }

  if (venta?.isCancelada === true) {
    return false;
  }

  return venta?.estado !== "ENTREGADO";
};

const ComercioHomeOrdersSection = ({ catalogOrders = [], catalogLoading = true }) => {
  const router = useRouter();
  const theme = useTheme();
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
    router.push("/(normal)/MisCompras");
  }, [router]);

  if (catalogLoading || ventas.length === 0) {
    return null;
  }

  return (
    <Surface
      elevation={5}
      style={[
        styles.section,
        !theme.dark
          ? {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            }
          : null,
      ]}
    >
      <View style={styles.accentRule} />
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.iconBadge, !theme.dark ? styles.iconBadgeLight : null]}>
              <MaterialCommunityIcons
                color={theme.dark ? "#fff7ed" : "#c2410c"}
                name="truck-delivery"
                size={17}
              />
            </View>
            <Text style={[styles.eyebrow, !theme.dark ? styles.eyebrowLight : null]}>
              Seguimiento activo
            </Text>
            <View style={[styles.countBadge, !theme.dark ? styles.countBadgeLight : null]}>
              <Text style={[styles.countText, !theme.dark ? styles.countTextLight : null]}>
                {totalPedidos}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.title,
              !theme.dark ? { color: theme.colors.onSurface } : null,
            ]}
            variant="titleLarge"
          >
            Entregas de comercio
          </Text>
          <Text
            style={[
              styles.subtitle,
              !theme.dark ? { color: theme.colors.onSurfaceVariant } : null,
            ]}
            variant="bodySmall"
          >
            {sectionSubtitle}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={openAllOrders}
          style={({ pressed }) => [
            styles.viewAllButton,
            !theme.dark ? styles.viewAllButtonLight : null,
            pressed ? styles.viewAllButtonPressed : null,
          ]}
        >
          <Text style={[styles.viewAllText, !theme.dark ? styles.viewAllTextLight : null]}>
            Ver todos
          </Text>
          <MaterialCommunityIcons
            color={theme.dark ? "#fed7aa" : "#9a3412"}
            name="chevron-right"
            size={18}
          />
        </Pressable>
      </View>

      <View style={styles.ordersList}>
        {ventas.map((venta) => (
          <PedidoCard
            currentStep={getCommerceOrderStep(venta)}
            isExpanded={Boolean(expandedVentas[venta._id])}
            key={venta._id}
            onToggleExpand={() => toggleExpanded(venta._id)}
            tone={theme.dark ? "dark" : "light"}
            venta={venta}
          />
        ))}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: "#fdba74",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: 10,
  },
  accentRule: {
    backgroundColor: "#f97316",
    height: 3,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconBadgeLight: {
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    borderColor: "rgba(194, 65, 12, 0.22)",
  },
  eyebrowLight: {
    color: "#c2410c",
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderColor: "rgba(251, 146, 60, 0.3)",
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 6,
  },
  countBadgeLight: {
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    borderColor: "rgba(194, 65, 12, 0.2)",
  },
  countText: {
    color: "#fed7aa",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  countTextLight: {
    color: "#9a3412",
  },
  ordersList: {
    gap: 14,
  },
  section: {
    backgroundColor: "#101a2d",
    borderColor: "rgba(148, 163, 184, 0.18)",
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 18,
    marginHorizontal: 16,
    overflow: "hidden",
    padding: 16,
    paddingTop: 19,
  },
  subtitle: {
    color: "#aebbd0",
    lineHeight: 20,
    marginTop: 2,
  },
  title: {
    color: "#f8fafc",
    fontWeight: "900",
    marginBottom: 3,
    letterSpacing: -0.35,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  viewAllButton: {
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.14)",
    borderColor: "rgba(251, 146, 60, 0.3)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 1,
    paddingLeft: 13,
    paddingRight: 9,
    paddingVertical: 9,
  },
  viewAllButtonLight: {
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    borderColor: "rgba(194, 65, 12, 0.2)",
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
  viewAllTextLight: {
    color: "#9a3412",
  },
});

export default ComercioHomeOrdersSection;