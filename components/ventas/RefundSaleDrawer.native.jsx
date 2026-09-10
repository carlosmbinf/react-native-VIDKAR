import MeteorBase from "@meteorrn/core";
import React, { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Checkbox, Chip, Divider, RadioButton, Surface, Text, TextInput, useTheme } from "react-native-paper";

import DrawerBottom from "../drawer/DrawerBottom.native";

const Meteor = MeteorBase;

const getItems = (sale) => {
  if (Array.isArray(sale?.refundBasis?.items) && sale.refundBasis.items.length > 0) return sale.refundBasis.items;
  if (Array.isArray(sale?.items)) return sale.items.map((item) => ({
    itemId: item?._id,
    label: item?.nombre || item?.producto?.name || item?.producto?.titulo || item?.type || "Producto",
    quantity: Number(item?.cantidad || 1),
    amountWithoutCommission: Number(item?.cobrarUSD || 0) * Number(item?.cantidad || 1),
    amountWithCommission: Number(item?.cobrarUSD || 0) * Number(item?.cantidad || 1),
  }));
  return [];
};

const money = (value, currency) => `${Number(value || 0).toFixed(2)} ${currency || "USD"}`;
const newIdempotencyKey = () => `refund-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export default function RefundSaleDrawer({ visible, sale, onDismiss, onSuccess }) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const contentAtTopRef = useRef(true);
  const [mode, setMode] = useState("FULL");
  const [includeCommission, setIncludeCommission] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const items = useMemo(() => getItems(sale), [sale]);
  const currency = sale?.refundBasis?.currency || sale?.moneda || sale?.monedaCobrado || "USD";
  const originalAmount = Number(sale?.cobrado || sale?.precio || sale?.refundBasis?.totalWithCommissions || 0);
  const refundedAmount = Number(sale?.refundedAmount || 0);
  const refundableAmount = Number.isFinite(Number(sale?.refundableAmount))
    ? Number(sale.refundableAmount)
    : Math.max(0, originalAmount - refundedAmount);
  const selectedTotal = items
    .filter((item) => selectedItemIds.includes(String(item.itemId)))
    .reduce((sum, item) => sum + Number(item[includeCommission ? "amountWithCommission" : "amountWithoutCommission"] || 0), 0);

  const reset = () => {
    setMode("FULL");
    setIncludeCommission(true);
    setSelectedItemIds([]);
    setAmount("");
  };

  const close = () => {
    if (processing) return;
    reset();
    onDismiss?.();
  };

  const submit = () => {
    if (!sale?._id) return;
    if (mode === "ITEMS" && selectedItemIds.length === 0) {
      Alert.alert("Productos requeridos", "Selecciona al menos un producto.");
      return;
    }
    if (mode === "AMOUNT" && Number(amount) <= 0) {
      Alert.alert("Monto inválido", "Introduce un monto mayor que cero.");
      return;
    }

    Alert.alert(
      "Confirmar reembolso",
      `Se devolverán ${money(mode === "AMOUNT" ? amount : mode === "ITEMS" ? selectedTotal : includeCommission ? refundableAmount : sale?.refundBasis?.subtotal, currency)}. Esta acción no revierte los servicios asociados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: () => {
            setProcessing(true);
            Meteor.call("ventas.reembolsar", {
              saleId: sale._id,
              mode,
              amount: mode === "AMOUNT" ? Number(String(amount).replace(",", ".")) : undefined,
              itemIds: mode === "ITEMS" ? selectedItemIds : [],
              includeCommission,
              idempotencyKey: newIdempotencyKey(),
            }, (error, result) => {
              setProcessing(false);
              if (error) {
                Alert.alert("No se pudo reembolsar", error.reason || error.message || "Error de reembolso");
                return;
              }
              onSuccess?.(result);
              close();
            });
          },
        },
      ],
    );
  };

  if (!visible || !sale) return null;

  return (
    <DrawerBottom contentAtTopRef={contentAtTopRef} onClose={close} open={visible} overlayOpacity={0.45} title="Reembolsar venta">
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.content}
        onScroll={(event) => { contentAtTopRef.current = event.nativeEvent.contentOffset.y <= 0.5; }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: Math.max(300, Math.floor(windowHeight * 0.78)) }}
      >
        <Surface style={[styles.summary, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}>
          <View style={styles.summaryRow}><Text style={styles.label}>Venta</Text><Text selectable>{sale._id}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.label}>Total original</Text><Chip compact>{money(originalAmount, currency)}</Chip></View>
          <View style={styles.summaryRow}><Text style={styles.label}>Saldo reembolsable</Text><Chip compact>{money(refundableAmount, currency)}</Chip></View>
        </Surface>

        <Text style={styles.sectionTitle}>Modalidad</Text>
        <RadioButton.Group onValueChange={setMode} value={mode}>
          <View style={styles.option}><RadioButton value="FULL" /><Text>Reembolso total</Text></View>
          <View style={styles.option}><RadioButton value="ITEMS" /><Text>Seleccionar productos</Text></View>
          <View style={styles.option}><RadioButton value="AMOUNT" /><Text>Introducir monto parcial</Text></View>
        </RadioButton.Group>

        <Text style={styles.sectionTitle}>Base del reembolso</Text>
        <View style={styles.option}><Checkbox status={includeCommission ? "checked" : "unchecked"} onPress={() => setIncludeCommission((current) => !current)} /><Text>{includeCommission ? "Incluir comisiones" : "Excluir comisiones"}</Text></View>
        <Text style={styles.hint}>La devolución se solicita en la moneda original del pago: {currency}.</Text>

        {mode === "ITEMS" ? (
          <View>
            <Text style={styles.sectionTitle}>Productos</Text>
            {items.map((item, index) => {
              const itemId = item.itemId ? String(item.itemId) : "";
              const checked = selectedItemIds.includes(itemId);
              return (
                <View key={itemId || index} style={styles.itemRow}>
                  <Checkbox disabled={!itemId} status={checked ? "checked" : "unchecked"} onPress={() => setSelectedItemIds((current) => checked ? current.filter((id) => id !== itemId) : [...current, itemId])} />
                  <View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.label}</Text><Text style={styles.hint}>Cantidad: {item.quantity}</Text></View>
                  <Text>{money(item[includeCommission ? "amountWithCommission" : "amountWithoutCommission"], currency)}</Text>
                </View>
              );
            })}
            {items.some((item) => !item.itemId) ? <Text style={styles.warning}>Algunos productos históricos no tienen identificador y no pueden seleccionarse.</Text> : null}
            <View style={styles.summaryRow}><Text style={styles.label}>Seleccionado</Text><Text style={styles.strong}>{money(selectedTotal, currency)}</Text></View>
          </View>
        ) : null}

        {mode === "AMOUNT" ? <TextInput keyboardType="decimal-pad" label={`Monto a devolver (${currency})`} mode="outlined" onChangeText={setAmount} value={amount} style={styles.amountInput} /> : null}

        {Array.isArray(sale.refunds) && sale.refunds.length > 0 ? (
          <View><Text style={styles.sectionTitle}>Historial</Text>{sale.refunds.slice().reverse().map((refund, index) => <View key={refund.idempotencyKey || index} style={styles.history}><View style={styles.summaryRow}><Text>{refund.status || "—"}</Text><Text>{money(refund.amount || refund.requestedAmount, refund.currency || currency)}</Text></View><Text style={styles.hint}>{refund.mode || "—"} · {refund.includeCommission ? "Con comisión" : "Sin comisión"}</Text></View>)}</View>
        ) : null}

        <Divider style={styles.divider} />
        <Text style={styles.warning}>Esta operación solo devuelve dinero. No revierte cursos, Proxy, VPN, recargas ni entregas.</Text>
        <View style={styles.actions}><Button disabled={processing} mode="outlined" onPress={close}>Cancelar</Button><Button disabled={processing || refundableAmount <= 0} loading={processing} mode="contained" onPress={submit}>Confirmar reembolso</Button></View>
      </ScrollView>
    </DrawerBottom>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 18, paddingBottom: 34 },
  summary: { borderRadius: 14, gap: 10, padding: 14 },
  summaryRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 },
  label: { fontSize: 12, fontWeight: "700", opacity: 0.7 },
  strong: { fontSize: 15, fontWeight: "800" },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7, marginTop: 8, opacity: 0.75, textTransform: "uppercase" },
  option: { alignItems: "center", borderColor: "rgba(148,163,184,0.16)", borderRadius: 12, borderWidth: 1, flexDirection: "row", marginTop: 7, padding: 4 },
  hint: { fontSize: 12, opacity: 0.62 },
  itemRow: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.62)", borderRadius: 12, flexDirection: "row", gap: 6, marginTop: 8, padding: 8 },
  itemCopy: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: "700" },
  warning: { color: "#fdba74", fontSize: 12, lineHeight: 17 },
  amountInput: { marginTop: 8 },
  history: { backgroundColor: "rgba(15,23,42,0.56)", borderRadius: 12, gap: 4, marginTop: 8, padding: 10 },
  divider: { marginVertical: 8 },
  actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
});
