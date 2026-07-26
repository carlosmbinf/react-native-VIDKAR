import MeteorBase from "@meteorrn/core";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import React from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Divider, Icon, Menu, Portal, SegmentedButtons, Surface, Text, TextInput, useTheme } from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosGananciasMovimientosCollection } from "../collections/collections";

const Meteor = MeteorBase;
const PRINCIPAL_USERNAMES = ["carlosmbinf", "carlombinf"];
const callMethod = (name, ...args) => new Promise((resolve, reject) => Meteor.call(name, ...args, (error, result) => error ? reject(error) : resolve(result)));
const money = (value) => `${Number(value || 0).toFixed(2)} USD`;
const displayName = (user) => [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ").trim() || user?.username || "Usuario";
const parseLocalAmount = (value) => Number(String(value || "").trim().replace(",", "."));
const PAYMENT_METHODS = [
  { label: "PayPal", value: "PAYPAL" },
  { label: "Mercado Pago", value: "MERCADO_PAGO" },
  { label: "Transferencia", value: "TRANSFERENCIA" },
  { label: "Remesa", value: "REMESA" },
  { label: "Custom", value: "CUSTOM" },
];
const EMPTY_PAYMENT_FORM = { amountUsd: "", notes: "", paymentMethod: "TRANSFERENCIA", paymentMethodCustom: "", paymentReference: "", paymentType: "TOTAL", receipt: null };
const movementMeta = {
  COURSE_SALE: { color: "#15803d", icon: "arrow-down-circle-outline", label: "Ganancia por venta" },
  PAYOUT: { color: "#0369a1", icon: "bank-transfer-out", label: "Pago recibido" },
  ADMIN_REALLOCATION: { color: "#a16207", icon: "account-switch-outline", label: "Reasignación de administrador" },
  SALE_REVERSAL: { color: "#b91c1c", icon: "backup-restore", label: "Venta revertida" },
};

export default function CourseEarnings() {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const currentUser = Meteor.user();
  const isPrincipal = PRINCIPAL_USERNAMES.includes(String(currentUser?.username || "").toLowerCase());
  const isAdmin = isPrincipal || currentUser?.profile?.role === "admin";
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = React.useState(Meteor.userId());
  const [beneficiaryMenu, setBeneficiaryMenu] = React.useState(false);
  const [paymentDialog, setPaymentDialog] = React.useState(false);
  const [configDialog, setConfigDialog] = React.useState(false);
  const [paymentForm, setPaymentForm] = React.useState(EMPTY_PAYMENT_FORM);
  const [paymentMethodMenu, setPaymentMethodMenu] = React.useState(false);
  const [globalPercent, setGlobalPercent] = React.useState("10");
  const [adminConfig, setAdminConfig] = React.useState({ adminId: "", percent: "5" });
  const [adminConfigs, setAdminConfigs] = React.useState([]);
  const [defaultAdminPercent, setDefaultAdminPercent] = React.useState(5);
  const [adminMenu, setAdminMenu] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [working, setWorking] = React.useState(false);
  const [summary, setSummary] = React.useState({ balance: 0, generated: 0, paid: 0, reversed: 0 });
  const palette = {
    background: theme.dark ? "#071018" : "#edf5f7",
    border: theme.dark ? "rgba(125,211,252,0.18)" : "rgba(14,116,144,0.14)",
    card: theme.dark ? "#0d1b25" : "#ffffff",
    muted: theme.dark ? "#9eb1bd" : "#58707c",
    primary: theme.dark ? "#67e8f9" : "#0e7490",
    text: theme.dark ? "#f8fafc" : "#10232e",
  };

  const data = Meteor.useTracker(() => {
    if (!Meteor.userId()) return { beneficiaries: [], loading: true, movements: [] };
    const movementsHandle = Meteor.subscribe("cursos.ganancias.movimientos", { limit: 500 });
    const beneficiariesHandle = Meteor.subscribe("cursos.ganancias.beneficiarios");
    const beneficiarySelector = isPrincipal
      ? { "profile.role": { $in: ["admin", "profesor"] } }
      : isAdmin
        ? { $or: [{ _id: Meteor.userId() }, { bloqueadoDesbloqueadoPor: Meteor.userId(), "profile.role": "profesor" }] }
        : { _id: Meteor.userId() };
    const beneficiaries = Meteor.users.find(beneficiarySelector, { sort: { username: 1 } }).fetch();
    return {
      beneficiaries,
      loading: !movementsHandle.ready() || !beneficiariesHandle.ready(),
      movements: CursosGananciasMovimientosCollection.find(
        { beneficiaryId: selectedBeneficiaryId },
        { sort: { createdAt: -1 } },
      ).fetch(),
    };
  }, [isAdmin, isPrincipal, selectedBeneficiaryId]);

  const admins = data.beneficiaries.filter((user) => user?.profile?.role === "admin" && !PRINCIPAL_USERNAMES.includes(String(user.username || "").toLowerCase()));
  const selectedBeneficiary = data.beneficiaries.find((user) => user._id === selectedBeneficiaryId) || currentUser;
  const loadSummary = React.useCallback(async () => {
    try {
      const result = await callMethod("cursos.ganancias.resumen", selectedBeneficiaryId);
      setSummary({
        balance: result?.balanceUsd || 0,
        generated: result?.generatedUsd || 0,
        paid: result?.paidUsd || 0,
        reversed: result?.reversedUsd || 0,
      });
    } catch (error) {
      Alert.alert("No se pudo cargar el saldo", error.reason || error.message);
    }
  }, [selectedBeneficiaryId]);

  const loadPrincipalData = React.useCallback(async () => {
    if (!isPrincipal) return;
    try {
      const [configuration, allocationErrors] = await Promise.all([
        callMethod("cursos.ganancias.configuracion.obtener"),
        callMethod("cursos.ganancias.errores"),
      ]);
      setGlobalPercent(String(configuration?.globalConfig?.generalCommissionPercent ?? 10));
      setAdminConfigs(configuration?.adminConfigs || []);
      setDefaultAdminPercent(Number(configuration?.defaultAdminCommissionPercent ?? 5));
      setErrors(allocationErrors || []);
    } catch (error) {
      Alert.alert("No se pudo cargar", error.reason || error.message);
    }
  }, [isPrincipal]);

  React.useEffect(() => {
    loadPrincipalData();
  }, [loadPrincipalData]);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary, data.movements.length]);

  const run = async (action, successMessage) => {
    setWorking(true);
    try {
      await action();
      if (successMessage) Alert.alert("Listo", successMessage);
      return true;
    } catch (error) {
      Alert.alert("No se pudo completar", error.reason || error.message || "Inténtalo nuevamente.");
      return false;
    } finally {
      setWorking(false);
    }
  };

  const registerPayment = async () => {
    const success = await run(
      () => callMethod("cursos.ganancias.registrarPago", { ...paymentForm, beneficiaryId: selectedBeneficiaryId }),
      "El pago quedó registrado en el historial.",
    );
    if (success) {
      await loadSummary();
      setPaymentDialog(false);
      setPaymentForm(EMPTY_PAYMENT_FORM);
    }
  };

  const storeSelectedReceipt = async ({ fileName, fileSize, mimeType, uri }) => {
    const fileInfo = fileSize ? null : await FileSystem.getInfoAsync(uri);
    const size = Number(fileSize || fileInfo?.size || 0);
    if (size <= 0 || size > 10 * 1024 * 1024) {
      Alert.alert("Comprobante inválido", "El archivo debe tener un tamaño máximo de 10MB.");
      return;
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    setPaymentForm((current) => ({
      ...current,
      receipt: { base64, name: fileName, size, type: mimeType },
    }));
  };

  const selectReceiptImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Permita el acceso a sus fotos para seleccionar el comprobante.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    await storeSelectedReceipt({
      fileName: asset.fileName || `comprobante_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType || "image/jpeg",
      uri: asset.uri,
    });
  };

  const selectReceiptPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: "application/pdf" });
    if (result.canceled) return;
    const asset = result.assets[0];
    await storeSelectedReceipt({ fileName: asset.name, fileSize: asset.size, mimeType: asset.mimeType || "application/pdf", uri: asset.uri });
  };

  const selectReceipt = () => Alert.alert("Seleccionar comprobante", "Elija el formato que desea adjuntar.", [
    { style: "cancel", text: "Cancelar" },
    { onPress: () => selectReceiptImage().catch((error) => Alert.alert("Error", error.message)), text: "Foto" },
    { onPress: () => selectReceiptPdf().catch((error) => Alert.alert("Error", error.message)), text: "PDF" },
  ]);

  const downloadReceipt = async (movement) => {
    setWorking(true);
    try {
      const receipt = await callMethod("cursos.ganancias.comprobante.descargar", movement._id);
      const safeName = String(receipt.fileName || "comprobante").replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;
      await FileSystem.writeAsStringAsync(fileUri, receipt.base64, { encoding: FileSystem.EncodingType.Base64 });
      if (!await Sharing.isAvailableAsync()) {
        throw new Error("No hay una aplicación disponible para abrir el comprobante.");
      }
      await Sharing.shareAsync(fileUri, { dialogTitle: "Abrir o guardar comprobante", mimeType: receipt.mimeType });
    } catch (error) {
      Alert.alert("No se pudo descargar", error.reason || error.message || "Inténtalo nuevamente.");
    } finally {
      setWorking(false);
    }
  };

  const saveGlobalConfig = async () => {
    const success = await run(
      () => callMethod("cursos.ganancias.configuracion.guardarGeneral", { generalAdminId: Meteor.userId(), generalCommissionPercent: Number(globalPercent) }),
      "Comisión general actualizada para próximas ventas.",
    );
    if (success) loadPrincipalData();
  };

  const saveAdminConfig = async () => {
    const success = await run(
      () => callMethod("cursos.ganancias.configuracion.guardarAdmin", { adminCommissionPercent: Number(adminConfig.percent), adminId: adminConfig.adminId }),
      "Comisión del administrador actualizada.",
    );
    if (success) loadPrincipalData();
  };

  const selectAdminConfig = (adminId) => {
    const savedConfig = adminConfigs.find((config) => config.adminId === adminId);
    setAdminConfig({
      adminId,
      percent: String(savedConfig?.adminCommissionPercent ?? defaultAdminPercent),
    });
    setAdminMenu(false);
  };

  const retryAllocation = (saleId) => run(
    () => callMethod("cursos.ganancias.reintentar", saleId),
    "La distribución se procesó nuevamente.",
  ).then((success) => success && loadPrincipalData());
  const partialAmount = parseLocalAmount(paymentForm.amountUsd);
  const paymentAmount = paymentForm.paymentType === "TOTAL" ? summary.balance : partialAmount;
  const remainingBalance = Number.isFinite(paymentAmount) ? Math.max(0, summary.balance - paymentAmount) : summary.balance;
  const paymentInvalid = paymentForm.paymentType === "PARTIAL" && (!Number.isFinite(partialAmount) || partialAmount <= 0 || partialAmount > summary.balance);

  const renderMovement = ({ item }) => {
    const meta = movementMeta[item.reason] || { color: palette.muted, icon: "swap-horizontal", label: item.reason || "Movimiento" };
    const paymentMethodLabel = item.paymentMethod === "CUSTOM" ? item.paymentMethodCustom : PAYMENT_METHODS.find((method) => method.value === item.paymentMethod)?.label;
    return (
      <Surface style={[styles.movement, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
        <View style={[styles.movementIcon, { backgroundColor: `${meta.color}18` }]}><Icon source={meta.icon} color={meta.color} size={22} /></View>
        <View style={styles.movementCopy}>
          <Text style={[styles.movementTitle, { color: palette.text }]}>{item.courseTitle || meta.label}</Text>
          <Text style={[styles.movementMeta, { color: palette.muted }]}>{meta.label} · {new Date(item.createdAt).toLocaleDateString("es")}{paymentMethodLabel ? ` · ${paymentMethodLabel}` : ""}</Text>
          {item.paymentReference ? <Text style={[styles.movementMeta, { color: palette.muted }]}>Ref. {item.paymentReference}</Text> : null}
        </View>
        <View style={styles.movementActions}><Text style={[styles.movementAmount, { color: Number(item.signedAmountUsd) >= 0 ? "#15803d" : "#b91c1c" }]}>{Number(item.signedAmountUsd) >= 0 ? "+" : "-"}{money(Math.abs(Number(item.signedAmountUsd || 0)))}</Text>{item.receipt?.fileId ? <Button compact disabled={working} icon="download" onPress={() => downloadReceipt(item)}>Comprobante</Button> : null}</View>
      </Surface>
    );
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>CURSOS · FONDOS</Text>
          <Text variant="headlineSmall" style={[styles.title, { color: palette.text }]}>Ganancias de cursos</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>Créditos, cobros y reversiones expresados siempre en USD.</Text>
        </View>
        {isPrincipal ? <Button icon="cog-outline" mode="outlined" onPress={() => setConfigDialog(true)}>Configurar</Button> : null}
      </View>

      {isAdmin ? (
        <Menu visible={beneficiaryMenu} onDismiss={() => setBeneficiaryMenu(false)} anchor={
          <Button icon="account-switch-outline" mode="outlined" onPress={() => setBeneficiaryMenu(true)}>{displayName(selectedBeneficiary)}</Button>
        }>
          {data.beneficiaries.map((beneficiary) => <Menu.Item key={beneficiary._id} title={displayName(beneficiary)} onPress={() => { setSelectedBeneficiaryId(beneficiary._id); setBeneficiaryMenu(false); }} />)}
        </Menu>
      ) : null}

      <Surface style={[styles.balanceBand, { backgroundColor: theme.dark ? "#103143" : "#dff4f7" }]} elevation={0}>
        <View><Text style={[styles.balanceLabel, { color: palette.muted }]}>Fondo disponible</Text><Text style={[styles.balanceValue, { color: summary.balance < 0 ? "#b91c1c" : palette.text }]}>{money(summary.balance)}</Text></View>
        {isPrincipal && summary.balance > 0 ? <Button icon="bank-transfer-out" mode="contained" onPress={() => setPaymentDialog(true)}>Registrar pago</Button> : null}
      </Surface>

      <View style={styles.metrics}>
        <View style={[styles.metric, { borderColor: palette.border }]}><Text style={[styles.metricLabel, { color: palette.muted }]}>Generado</Text><Text style={[styles.metricValue, { color: palette.text }]}>{money(summary.generated)}</Text></View>
        <View style={[styles.metric, { borderColor: palette.border }]}><Text style={[styles.metricLabel, { color: palette.muted }]}>Pagado</Text><Text style={[styles.metricValue, { color: palette.text }]}>{money(summary.paid)}</Text></View>
        <View style={[styles.metric, { borderColor: palette.border }]}><Text style={[styles.metricLabel, { color: palette.muted }]}>Revertido</Text><Text style={[styles.metricValue, { color: palette.text }]}>{money(summary.reversed)}</Text></View>
      </View>

      {isPrincipal && errors.length ? (
        <View style={styles.errorSection}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Distribuciones pendientes</Text>
          {errors.map((error) => (
            <Surface key={error._id} style={[styles.errorRow, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
              <View style={styles.movementCopy}><Text style={[styles.movementTitle, { color: palette.text }]}>{error.courseTitle}</Text><Text style={[styles.movementMeta, { color: "#b91c1c" }]}>{error.errorMessage}</Text></View>
              <Button compact disabled={working} onPress={() => retryAllocation(error.saleId)}>Reintentar</Button>
            </Surface>
          ))}
        </View>
      ) : null}
      <Text style={[styles.sectionTitle, { color: palette.text }]}>Historial</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Ganancias de cursos" showBackButton backHref="/(normal)/Main" overlapContent />
      {data.loading ? <ActivityIndicator style={{ marginTop: headerInset + 80 }} /> : (
        <FlatList contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]} data={data.movements} keyExtractor={(item) => item._id} renderItem={renderMovement} ListHeaderComponent={listHeader} ListEmptyComponent={<Text style={[styles.empty, { color: palette.muted }]}>Todavía no hay movimientos para este beneficiario.</Text>} />
      )}

      <Portal>
        <Dialog visible={paymentDialog} onDismiss={() => !working && setPaymentDialog(false)} style={styles.dialog}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0} style={styles.keyboardDialog}>
            <Dialog.Title>Registrar pago</Dialog.Title>
            <Dialog.ScrollArea style={styles.dialogScroll}>
              <ScrollView contentContainerStyle={styles.dialogContent} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Surface style={[styles.paymentSummary, { backgroundColor: theme.dark ? "rgba(103,232,249,0.08)" : "rgba(14,116,144,0.07)", borderColor: palette.border }]} elevation={0}><View><Text style={[styles.paymentSummaryLabel, { color: palette.muted }]}>DISPONIBLE</Text><Text style={[styles.paymentSummaryValue, { color: palette.text }]}>{money(summary.balance)}</Text></View><View style={styles.paymentSummaryRight}><Text style={[styles.paymentSummaryLabel, { color: palette.muted }]}>QUEDARÁ</Text><Text style={[styles.paymentSummaryValue, { color: palette.text }]}>{money(remainingBalance)}</Text></View></Surface>
                <SegmentedButtons value={paymentForm.paymentType} onValueChange={(value) => setPaymentForm((current) => ({ ...current, amountUsd: value === "TOTAL" ? "" : current.amountUsd, paymentType: value }))} buttons={[{ icon: "check-all", label: "Total", value: "TOTAL" }, { icon: "cash-minus", label: "Parcial", value: "PARTIAL" }]} />
                {paymentForm.paymentType === "TOTAL" ? <Text style={{ color: palette.muted }}>Se registrará el saldo completo: {money(summary.balance)}.</Text> : <TextInput error={paymentInvalid && paymentForm.amountUsd !== ""} label="Importe parcial USD" keyboardType="decimal-pad" mode="outlined" right={<TextInput.Affix text="USD" />} value={paymentForm.amountUsd} onChangeText={(value) => setPaymentForm((current) => ({ ...current, amountUsd: value }))} />}
                {paymentForm.paymentType === "PARTIAL" ? <Text style={[styles.paymentHint, { color: paymentInvalid && paymentForm.amountUsd !== "" ? "#b91c1c" : palette.muted }]}>{paymentInvalid && paymentForm.amountUsd !== "" ? `Escriba entre 0,01 y ${summary.balance.toFixed(2)} USD.` : "Puede escribir 0,10 o 0.10."}</Text> : null}
                <Menu visible={paymentMethodMenu} onDismiss={() => setPaymentMethodMenu(false)} anchor={<Button icon="wallet-outline" mode="outlined" onPress={() => setPaymentMethodMenu(true)}>{PAYMENT_METHODS.find((method) => method.value === paymentForm.paymentMethod)?.label || "Método"}</Button>}>{PAYMENT_METHODS.map((method) => <Menu.Item key={method.value} title={method.label} onPress={() => { setPaymentForm((current) => ({ ...current, paymentMethod: method.value, paymentMethodCustom: method.value === "CUSTOM" ? current.paymentMethodCustom : "" })); setPaymentMethodMenu(false); }} />)}</Menu>
                {paymentForm.paymentMethod === "CUSTOM" ? <TextInput label="Nombre del método" mode="outlined" value={paymentForm.paymentMethodCustom} onChangeText={(value) => setPaymentForm((current) => ({ ...current, paymentMethodCustom: value }))} /> : null}
                <TextInput label="Referencia" mode="outlined" value={paymentForm.paymentReference} onChangeText={(value) => setPaymentForm((current) => ({ ...current, paymentReference: value }))} />
                <Surface style={[styles.receiptBox, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}><View style={styles.movementCopy}><Text style={[styles.movementTitle, { color: palette.text }]}>{paymentForm.receipt?.name || "Sin comprobante"}</Text><Text style={[styles.movementMeta, { color: palette.muted }]}>JPG, PNG o PDF · máximo 10MB</Text></View><Button compact icon={paymentForm.receipt ? "file-replace-outline" : "paperclip"} mode="outlined" onPress={selectReceipt}>{paymentForm.receipt ? "Cambiar" : "Adjuntar"}</Button></Surface>
                <TextInput label="Nota" mode="outlined" value={paymentForm.notes} onChangeText={(value) => setPaymentForm((current) => ({ ...current, notes: value }))} />
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions><Button onPress={() => setPaymentDialog(false)}>Cancelar</Button><Button disabled={paymentInvalid || (paymentForm.paymentMethod === "CUSTOM" && !paymentForm.paymentMethodCustom.trim())} mode="contained" loading={working} onPress={registerPayment}>{paymentForm.paymentType === "TOTAL" ? `Pagar ${money(summary.balance)}` : "Registrar parcial"}</Button></Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>

        <Dialog visible={configDialog} onDismiss={() => !working && setConfigDialog(false)} style={styles.dialog}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0} style={styles.keyboardDialog}>
            <Dialog.Title>Comisiones de cursos</Dialog.Title>
            <Dialog.ScrollArea style={styles.dialogScroll}>
              <ScrollView contentContainerStyle={styles.configContent} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text variant="titleMedium">Comisión general</Text>
                <TextInput label="Porcentaje" keyboardType="decimal-pad" mode="outlined" right={<TextInput.Affix text="%" />} value={globalPercent} onChangeText={setGlobalPercent} />
                <Button mode="contained-tonal" loading={working} onPress={saveGlobalConfig}>Guardar general</Button>
                <Divider />
                <Text variant="titleMedium">Porcentajes por administrador</Text>
                <View style={styles.adminConfigList}>
                  {admins.length ? admins.map((admin) => {
                    const savedConfig = adminConfigs.find((config) => config.adminId === admin._id);
                    const percent = savedConfig?.adminCommissionPercent ?? defaultAdminPercent;
                    const selected = adminConfig.adminId === admin._id;
                    return <Pressable key={admin._id} onPress={() => selectAdminConfig(admin._id)} style={[styles.adminConfigRow, { backgroundColor: selected ? `${palette.primary}18` : palette.card, borderColor: selected ? palette.primary : palette.border }]}><View style={styles.movementCopy}><Text style={[styles.movementTitle, { color: palette.text }]}>{displayName(admin)}</Text><Text style={[styles.movementMeta, { color: palette.muted }]}>{savedConfig ? "Configuración personalizada" : "Valor predeterminado"}</Text></View><Text style={[styles.adminConfigPercent, { color: palette.primary }]}>{Number(percent).toFixed(2)}%</Text></Pressable>;
                  }) : <Text style={{ color: palette.muted }}>No hay administradores disponibles.</Text>}
                </View>
                <Menu visible={adminMenu} onDismiss={() => setAdminMenu(false)} anchor={<Button mode="outlined" onPress={() => setAdminMenu(true)}>{adminConfig.adminId ? displayName(admins.find((admin) => admin._id === adminConfig.adminId)) : "Seleccionar admin"}</Button>}>
                  {admins.map((admin) => <Menu.Item key={admin._id} title={displayName(admin)} onPress={() => selectAdminConfig(admin._id)} />)}
                </Menu>
                <TextInput disabled={!adminConfig.adminId} label="Porcentaje" keyboardType="decimal-pad" mode="outlined" right={<TextInput.Affix text="%" />} value={adminConfig.percent} onChangeText={(value) => setAdminConfig((current) => ({ ...current, percent: value }))} />
                <Button disabled={!adminConfig.adminId} loading={working} mode="contained-tonal" onPress={saveAdminConfig}>Guardar admin</Button>
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions><Button onPress={() => setConfigDialog(false)}>Cerrar</Button></Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 9, padding: 16, paddingBottom: 36 },
  headerContent: { gap: 14, marginBottom: 6 },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  titleCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 10, fontWeight: "900" },
  title: { fontWeight: "900" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  balanceBand: { alignItems: "center", borderRadius: 8, flexDirection: "row", justifyContent: "space-between", minHeight: 104, padding: 16 },
  balanceLabel: { fontSize: 11, fontWeight: "800" },
  balanceValue: { fontSize: 28, fontWeight: "900", marginTop: 4 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { borderBottomWidth: 2, flex: 1, gap: 4, padding: 10 },
  metricLabel: { fontSize: 10, fontWeight: "700" },
  metricValue: { fontSize: 14, fontWeight: "900" },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginTop: 5 },
  movement: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 72, padding: 11 },
  movementIcon: { alignItems: "center", borderRadius: 8, height: 40, justifyContent: "center", width: 40 },
  movementCopy: { flex: 1, gap: 3, minWidth: 0 },
  movementTitle: { fontSize: 13, fontWeight: "800" },
  movementMeta: { fontSize: 10, lineHeight: 14 },
  movementAmount: { fontSize: 13, fontWeight: "900" },
  movementActions: { alignItems: "flex-end", gap: 2 },
  errorSection: { gap: 8 },
  errorRow: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  empty: { padding: 28, textAlign: "center" },
  dialog: { },
  keyboardDialog: { flexShrink: 1 },
  dialogScroll: { borderBottomWidth: 0, borderTopWidth: 0 },
  dialogContent: { gap: 12, paddingVertical: 4 },
  paymentSummary: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 12 },
  paymentSummaryLabel: { fontSize: 10, fontWeight: "800" },
  paymentSummaryValue: { fontSize: 17, fontWeight: "900", marginTop: 3 },
  paymentSummaryRight: { alignItems: "flex-end" },
  paymentHint: { fontSize: 11, marginTop: -7 },
  receiptBox: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  configContent: { gap: 12, padding: 18 },
  adminConfigList: { gap: 8 },
  adminConfigRow: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 58, padding: 11 },
  adminConfigPercent: { fontSize: 16, fontWeight: "900" },
});
