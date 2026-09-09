import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";

import { getServiceDetail } from "./serviceDetailUtils";
import { CATEGORY_COLORS, getStatusMeta } from "./ventasUtils";

export default function ServiceDetails({ sale }) {
  const theme = useTheme();
  const colors = theme.colors;
  const items = Array.isArray(sale.items) ? sale.items.filter((item) => item && typeof item === "object") : [];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" variant="titleMedium" style={styles.bold}>Detalles del servicio</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Información de tu compra</Text>
        </View>
        {items.length > 0 ? (
          <View style={[styles.count, { backgroundColor: colors.surfaceVariant }]}>
            <Text variant="labelMedium">{items.length} {items.length === 1 ? "producto" : "productos"}</Text>
          </View>
        ) : null}
      </View>

      {items.map((item, index) => {
        const detail = getServiceDetail(item, sale);
        const meta = CATEGORY_COLORS[detail.category] || CATEGORY_COLORS.OTROS;
        const status = sale.statusDerived === "CANCELADO" ? "CANCELADO" : detail.delivered === true ? "ENTREGADO" : detail.delivered === false ? "PENDIENTE_ENTREGA" : null;
        const statusMeta = getStatusMeta(status, theme.dark);
        return (
          <Surface key={`${item._id || "item"}-${index}`} elevation={0} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <View style={[styles.accent, { backgroundColor: meta.color }]} />
            <View style={styles.body}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: meta.bg }]}>
                  <Icon source={meta.icon} size={24} color={theme.dark ? colors.onSurface : colors.primary} />
                </View>
                <View style={styles.heading}>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{meta.label} · {String(index + 1).padStart(2, "0")}</Text>
                  <Text selectable variant="titleMedium" style={styles.bold}>{detail.title}</Text>
                </View>
              </View>

              {detail.highlight ? (
                <View style={[styles.highlight, { backgroundColor: theme.dark ? colors.surfaceVariant : meta.bg }]}>
                  <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{detail.highlightLabel}</Text>
                  <Text selectable variant="titleLarge" style={styles.highlightValue}>{detail.highlight}</Text>
                </View>
              ) : null}

              {detail.fields.length > 0 ? (
                <View style={styles.fields}>
                  {detail.fields.map((field) => (
                    <View key={field.label} style={styles.field}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{field.label}</Text>
                      <Text selectable variant="bodyMedium" style={styles.fieldValue}>{field.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {detail.price || status ? (
                <View style={[styles.footer, { borderColor: colors.outlineVariant }]}>
                  {detail.price ? (
                    <View style={styles.price}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{detail.priceLabel}</Text>
                      <Text selectable variant="titleMedium" style={styles.highlightValue}>{detail.price}</Text>
                    </View>
                  ) : null}
                  {status ? (
                    <View style={[styles.status, { backgroundColor: statusMeta.backgroundColor }]}>
                      <Icon source={status === "CANCELADO" ? "close-circle-outline" : detail.delivered ? "check-circle-outline" : "clock-outline"} size={16} color={statusMeta.textColor} />
                      <Text variant="labelMedium" style={{ color: statusMeta.textColor, flexShrink: 1 }}>
                        {status === "CANCELADO" ? "Cancelado" : detail.delivered ? "Entregado" : "Pendiente de entrega"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {detail.note ? (
                <View style={[styles.note, { backgroundColor: colors.surfaceVariant }]}>
                  <Icon source="message-text-outline" size={16} color={colors.onSurfaceVariant} />
                  <View style={styles.heading}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Nota del producto</Text>
                    <Text selectable variant="bodySmall">{detail.note}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Surface>
        );
      })}

      {items.length === 0 ? (
        <Surface elevation={0} style={[styles.empty, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source={sale.category === "BALANCE" ? "wallet-outline" : "package-variant-closed"} size={28} color={colors.primary} />
          <Text variant="titleMedium" style={styles.bold}>{sale.category === "BALANCE" ? "Compra directa de saldo / servicio" : "Sin desglose de productos"}</Text>
          <Text selectable variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {typeof sale.comentario === "string" && sale.comentario.trim() ? sale.comentario : "Esta compra no tiene detalles adicionales registrados."}
          </Text>
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  bold: { fontWeight: "700" },
  count: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  accent: { height: 3 },
  body: { padding: 16, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  highlight: { borderRadius: 14, padding: 14, gap: 5 },
  highlightValue: { fontWeight: "700", fontVariant: ["tabular-nums"] },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { flexBasis: "100%", gap: 4 },
  fieldValue: { fontWeight: "500" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  price: { flexGrow: 1, gap: 3 },
  status: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  note: { flexDirection: "row", gap: 8, borderRadius: 12, padding: 12 },
  empty: { borderRadius: 18, padding: 18, gap: 8 },
});