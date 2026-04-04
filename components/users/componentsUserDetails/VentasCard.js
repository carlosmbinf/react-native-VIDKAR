import { memo } from "react";
import { StyleSheet, View } from "react-native";
import {
	Button,
	Card,
	Chip,
	Divider,
	Surface,
	Text,
	Title,
} from "react-native-paper";

const ACCENT = "#1E88E5";
const WARN = "#F57C00";
const DANGER = "#D32F2F";
const OK = "#2E7D32";

const formatCUP = (value) => {
  const numeric = Number.isFinite(value) ? value : 0;
  try {
    return `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} CUP`;
  } catch {
    return `${(Math.round(numeric * 100) / 100).toFixed(2)} CUP`;
  }
};

const getDebtLevel = (debt) => {
  if (debt <= 0) {
    return { label: "Sin deuda", color: OK };
  }
  if (debt < 1000) {
    return { label: "Deuda baja", color: ACCENT };
  }
  if (debt < 2000) {
    return { label: "Deuda media", color: WARN };
  }
  return { label: "Deuda alta", color: DANGER };
};

const getDebtDescriptor = (debt) => {
  if (debt <= 0) {
    return {
      actionLabel: "Ver ventas",
      helper: "No hay cobros pendientes para este usuario en este momento.",
      statusLabel: "Sin pendientes",
    };
  }

  if (debt < 1000) {
    return {
      actionLabel: "Ver pendientes",
      helper:
        "El usuario tiene ventas por cobrar, pero el monto aún es manejable.",
      statusLabel: "Seguimiento recomendado",
    };
  }

  if (debt < 2000) {
    return {
      actionLabel: "Ver pendientes",
      helper:
        "Conviene revisar estas ventas pronto para evitar acumulación de deuda.",
      statusLabel: "Revisión prioritaria",
    };
  }

  return {
    actionLabel: "Ver pendientes",
    helper: "El monto pendiente ya es alto y requiere atención inmediata.",
    statusLabel: "Atención inmediata",
  };
};

const VentasCard = ({ deuda, styles, onPressDetalles, accentColor }) => {
  let deudaValue = 0;
  try {
    deudaValue = Number(deuda?.() ?? 0);
    if (!Number.isFinite(deudaValue)) {
      deudaValue = 0;
    }
  } catch {
    deudaValue = 0;
  }

  const level = getDebtLevel(deudaValue);
  const descriptor = getDebtDescriptor(deudaValue);
  const headerAccent = accentColor || ACCENT;

  return (
    <Surface
      elevation={5}
      style={[styles.cards, ui.cardShell]}
      testID="ventas-card"
    >
      <View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
      <Card.Content style={ui.content}>
        <View style={ui.headerRow}>
          <View style={ui.headerCopy}>
            <Text style={ui.eyebrow}>Cobros del usuario</Text>
            <Title style={[ui.title, { color: ACCENT }]}>
              Ventas pendientes
            </Title>
          </View>
          <Chip style={ui.chip} textStyle={ui.chipText} compact>
            {level.label}
          </Chip>
        </View>
        <Divider style={ui.divider} />
        <View style={ui.amountBlock}>
          <Text style={ui.caption}>Saldo pendiente por cobrar</Text>
          <Text style={[ui.amount, { color: level.color }]}>
            {formatCUP(deudaValue)}
          </Text>
          <Text style={ui.helper}>{descriptor.helper}</Text>
        </View>
        <View style={ui.metaStrip}>
          <View style={ui.metaItem}>
            <Text style={ui.metaLabel}>Estado</Text>
            <Text style={[ui.metaValue, { color: level.color }]}>
              {descriptor.statusLabel}
            </Text>
          </View>
          <View style={ui.metaDivider} />
          <View style={ui.metaItem}>
            <Text style={ui.metaLabel}>Acción sugerida</Text>
            <Text style={ui.metaValue}>Revisar ventas no cobradas</Text>
          </View>
        </View>
        <View style={ui.actionsRow}>
          <Button
            mode="contained-tonal"
            icon="cash-clock"
            onPress={onPressDetalles}
            disabled={!onPressDetalles}
            style={ui.actionBtn}
            contentStyle={ui.actionBtnContent}
          >
            {descriptor.actionLabel}
          </Button>
        </View>
      </Card.Content>
    </Surface>
  );
};

const ui = StyleSheet.create({
  cardShell: { overflow: "hidden" },
  accentBar: { height: 4, width: "100%" },
  content: { paddingTop: 10 },
  eyebrow: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "700" },
  chip: { backgroundColor: "#263238", alignSelf: "flex-start" },
  chipText: { color: "#fff", fontWeight: "600" },
  divider: { marginVertical: 8, opacity: 0.2 },
  amountBlock: { marginTop: 4 },
  caption: { opacity: 0.7, fontSize: 13 },
  amount: { fontSize: 28, fontWeight: "800", letterSpacing: 0.5, marginTop: 2 },
  helper: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 8 },
  metaStrip: {
    alignItems: "stretch",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    flexDirection: "row",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaValue: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  metaDivider: {
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginHorizontal: 12,
    width: 1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "stretch",
    marginTop: 14,
  },
  actionBtn: { borderRadius: 12, flex: 1 },
  actionBtnContent: { minHeight: 42 },
});

export default memo(VentasCard);
