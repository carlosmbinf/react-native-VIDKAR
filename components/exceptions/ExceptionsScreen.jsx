import Meteor, { useTracker } from "@meteorrn/core";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Button, Divider, Icon, IconButton, Searchbar, Surface, Text, useTheme } from "react-native-paper";
import AppHeader, { MENU_PRINCIPAL_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import ExceptionProductGallery from "./ExceptionProductGallery";
import { isPrincipalAdmin } from "../../services/mcp/mcpAccess";
import {
  EXCEPTION_CONTEXT_LABELS, EXCEPTION_METHODS, EXCEPTION_PAGE_SIZE, exceptionDate, exceptionErrorLabel,
  exceptionFailure, exceptionGroupKey, exceptionGroupLabel, exceptionValue, loadExceptionGroups, loadExceptionProduct,
} from "../../services/integrationExceptions";

const call = (method, ...args) => new Promise((resolve, reject) => {
  Meteor.call(method, ...args, (error, result) => error ? reject(error) : resolve(result));
});

const getPalette = (theme) => {
  const isDark = theme.dark;
  const isEmpresa = Boolean(theme.empresaAppearance);
  return {
    screen: isEmpresa ? theme.colors.background : isDark ? "#090d16" : "#f1f5f9",
    surface: isEmpresa ? theme.colors.surface : isDark ? "#111c2e" : "#ffffff",
    nestedSurface: isEmpresa ? theme.colors.surfaceVariant : isDark ? "#172338" : "#f8fafc",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    title: theme.colors.onSurface,
    copy: theme.colors.onSurfaceVariant,
    muted: isDark ? "#94a3b8" : "#64748b",
    accent: isEmpresa ? theme.colors.primary : isDark ? "#38bdf8" : "#0369a1",
    accentBg: isDark ? "rgba(56,189,248,0.12)" : "rgba(14,165,233,0.10)",
    error: theme.colors.error || "#ef4444",
    errorBg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.10)",
  };
};

function Failure({ message, retry }) {
  const theme = useTheme();
  const palette = getPalette(theme);
  return <Surface style={[styles.failure, { backgroundColor: palette.errorBg, borderColor: `${palette.error}44` }]} elevation={0}>
    <Text accessibilityRole="alert" style={{ color: palette.error }}>{message}</Text>
    <Button onPress={retry}>Reintentar</Button>
  </Surface>;
}

function Fields({ entries }) {
  const palette = getPalette(useTheme());
  return <Surface style={[styles.fields, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
    {entries.map(([label, value], index) => <React.Fragment key={`${label}-${index}`}>
      <View style={styles.field}>
        <Text variant="labelMedium" style={{ color: palette.muted }}>{label}</Text>
        <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{exceptionValue(value)}</Text>
      </View>
      {index < entries.length - 1 && <Divider style={{ backgroundColor: palette.border }} />}
    </React.Fragment>)}
  </Surface>;
}

function Trace({ frames }) {
  const palette = getPalette(useTheme());
  return <Surface style={[styles.traceCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]} elevation={0}>
    <Text selectable style={[styles.trace, { color: palette.copy }]}>{frames?.length
      ? frames.map((frame) => `${frame.function || "Función anónima"} · ${frame.file}:${frame.line}:${frame.column}`).join("\n")
      : "No hay ubicaciones disponibles para esta excepción."}</Text>
  </Surface>;
}

function SectionTitle({ children }) {
  const palette = getPalette(useTheme());
  return <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.title }]}>{children}</Text>;
}

function HttpStatus({ value, compact = false }) {
  const palette = getPalette(useTheme());
  const status = Number(value);
  const isError = Number.isFinite(status) && status >= 400;
  return <View style={[styles.httpBadge, compact && styles.compactBadge, {
    backgroundColor: isError ? palette.errorBg : palette.nestedSurface,
    borderColor: isError ? `${palette.error}44` : palette.border,
  }]}>
    <Text variant="labelSmall" style={{
      color: isError ? palette.error : palette.muted,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    }}>{value ? `${compact ? "" : "HTTP "}${value}` : "—"}</Text>
  </View>;
}

function ProductPreview({ preview, retry }) {
  const palette = getPalette(useTheme());
  if (preview.loading) return <View style={styles.productLoading}>
    <ActivityIndicator size="small" accessibilityLabel="Cargando producto" />
    <Text variant="bodySmall" style={{ color: palette.muted }}>Cargando producto e imágenes...</Text>
  </View>;
  if (preview.error) return <Failure message={preview.error} retry={retry} />;
  const result = preview.result;
  if (!result) return null;
  if (result.status !== "found") {
    const messages = {
      "not-found": "El producto local ya no está disponible o aún no ha sido importado.",
      ambiguous: "Hay varios productos vinculados a esta publicación. No es posible identificar uno con certeza.",
      unassigned: "Esta excepción no contiene una referencia de producto.",
      unsupported: "No hay información de producto disponible para esta integración.",
    };
    return <Text variant="bodySmall" style={{ color: palette.muted }}>{messages[result.status]}</Text>;
  }
  const { product } = result;
  return <View style={styles.productPreview}>
    <ExceptionProductGallery key={product._id} images={product.images} />
    <Text selectable variant="titleMedium" style={[styles.sectionTitle, { color: palette.title }]}>
      {product.name || "Producto sin nombre"}
    </Text>
    {product.descripcion ? <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
      {product.descripcion}
    </Text> : null}
  </View>;
}

function ExceptionDetail({ id, onClose, productPreview, retryProduct }) {
  const theme = useTheme();
  const palette = getPalette(theme);
  const headerInset = useAppHeaderContentInset();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setLoading(true);
    setError("");
    call(EXCEPTION_METHODS.detail, id)
      .then((result) => { if (active) setDetail(result); })
      .catch((failure) => { if (active) setError(exceptionFailure(failure, "No se pudo cargar el detalle.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, refresh]);
  return <Modal visible animationType="fade" onRequestClose={onClose}>
    <View style={[styles.root, { backgroundColor: palette.screen }]}>
      <StatusBar style="light" />
      <AppHeader
        title="Detalle de la excepción"
        subtitle={detail?.integration === "mercadolibre" ? "Mercado Libre · Integraciones" : "Registro de integración"}
        backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
        showBackButton={false}
        overlapContent
        portal={false}
        showBottomBorder
        actions={<IconButton icon="close" iconColor="#ffffff" accessibilityLabel="Cerrar detalle" onPress={onClose} />}
      />
      <ScrollView contentContainerStyle={[styles.detail, { paddingTop: headerInset + 16 }]} contentInsetAdjustmentBehavior="never">
        {loading ? <View style={[styles.loadingCard, { backgroundColor: palette.surface }]}>
          <ActivityIndicator accessibilityLabel="Cargando detalle" />
          <Text variant="bodyMedium" style={{ color: palette.muted }}>Cargando información de la excepción…</Text>
        </View> : error
          ? <Failure message={error} retry={() => setRefresh((value) => value + 1)} />
          : detail && <>
            <View style={styles.section}>
              <SectionTitle>Producto relacionado</SectionTitle>
              <Surface style={[styles.productDetailCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
                <ProductPreview preview={productPreview} retry={retryProduct} />
              </Surface>
            </View>
            <Surface style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryText}>
                  <Text variant="labelMedium" style={{ color: palette.error }}>EXCEPCIÓN</Text>
                  <Text selectable variant="titleLarge" style={{ color: palette.title }}>{exceptionErrorLabel(detail.error)}</Text>
                  <Text variant="bodySmall" style={{ color: palette.muted }}>
                    {detail.error?.name || "Error"} · {exceptionDate(detail.createdAt)}
                  </Text>
                </View>
                <HttpStatus value={detail.error?.httpStatus} />
              </View>
              <Divider style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
              <View style={styles.summaryMessage}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Mensaje disponible</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>
                  {exceptionValue(detail.error?.message)}
                </Text>
              </View>
            </Surface>

            <View style={styles.section}>
              <SectionTitle>Información del registro</SectionTitle>
              <Fields entries={[
                ["Fecha", exceptionDate(detail.createdAt)],
                ["Integración", detail.integration === "mercadolibre" ? "Mercado Libre" : detail.integration],
                ["Identificador", detail._id],
                ["Tipo", detail.error?.name],
                ["Código", detail.error?.code],
                ["Estado HTTP", detail.error?.httpStatus],
              ]} />
            </View>

            <View style={styles.section}>
              <SectionTitle>Contexto de la operación</SectionTitle>
              {Object.keys(detail.context || {}).length
                ? <Fields entries={Object.entries(detail.context).filter(([, value]) => value != null)
                  .map(([key, value]) => [EXCEPTION_CONTEXT_LABELS[key] || key, value])} />
                : <Surface style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
                  <Text variant="bodyMedium" style={{ color: palette.muted }}>No hay contexto disponible.</Text>
                </Surface>}
            </View>

            {detail.error?.validation?.length > 0 && <View style={styles.section}>
              <SectionTitle>Validaciones</SectionTitle>
              <Fields entries={detail.error.validation.map((entry, index) => [
                `Validación ${index + 1}`,
                `${entry.field || "Campo desconocido"} · ${entry.type || "Validación"}`,
              ])} />
            </View>}

            <View style={styles.section}>
              <SectionTitle>Ubicación del error</SectionTitle>
              <Trace frames={detail.error?.frames} />
            </View>

            {detail.error?.causes?.map((cause, index) => <View key={index} style={styles.section}>
              <SectionTitle>Causa {index + 1}: {exceptionErrorLabel(cause)}</SectionTitle>
              {cause.message && <Surface style={[styles.causeCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{cause.message}</Text>
              </Surface>}
              <Trace frames={cause.frames} />
            </View>)}
          </>}
      </ScrollView>
    </View>
  </Modal>;
}

function ExceptionsBrowser() {
  const theme = useTheme();
  const palette = getPalette(theme);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const showSecondaryColumn = width >= 500;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [groups, setGroups] = useState([]);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productState, setProductState] = useState({ key: "", loading: false, error: "", result: null });
  const [productRefresh, setProductRefresh] = useState(0);
  const selected = groups.find((entry) => exceptionGroupKey(entry.group) === selectedKey);
  const selectedGroup = selected?.group;
  const groupIntegration = selectedGroup?.integration;
  const groupType = selectedGroup?.type;
  const groupId = selectedGroup?.id;
  const entries = selected ? selected.records : groups;
  const pages = Math.max(1, Math.ceil(entries.length / EXCEPTION_PAGE_SIZE));
  const page = Math.min(selected ? recordPage : groupPage, pages);
  const items = entries.slice((page - 1) * EXCEPTION_PAGE_SIZE, page * EXCEPTION_PAGE_SIZE);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setProgress("");
    loadExceptionGroups(call, { search, isActive: () => active,
      onProgress: (value) => { if (active) setProgress(value); } })
      .then((result) => { if (active && result) setGroups(result); })
      .catch((failure) => { if (active) setError(exceptionFailure(failure, "No se pudieron cargar las excepciones.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, refresh]);

  useEffect(() => {
    if (!selectedKey || !groupType) return undefined;
    let active = true;
    setProductState({ key: selectedKey, loading: true, error: "", result: null });
    loadExceptionProduct(call, { integration: groupIntegration, type: groupType, id: groupId })
      .then((result) => {
        if (active) setProductState({ key: selectedKey, loading: false, error: "", result });
      })
      .catch((failure) => {
        if (active) setProductState({
          key: selectedKey, loading: false,
          error: exceptionFailure(failure, "No se pudo cargar el producto."), result: null,
        });
      });
    return () => { active = false; };
  }, [selectedKey, groupIntegration, groupType, groupId, productRefresh]);

  const submitSearch = () => {
    setSelectedKey("");
    setGroupPage(1);
    setSearch(searchInput.trim());
    setRefresh((value) => value + 1);
  };
  const productPreview = productState.key === selectedKey && selectedKey
    ? productState : { loading: true, error: "", result: null };
  const retryProduct = () => setProductRefresh((value) => value + 1);
  const surfaceStyle = { backgroundColor: palette.surface, borderColor: palette.border };
  return <View style={[styles.root, { backgroundColor: palette.screen }]}>
    <AppHeader title="Excepciones" subtitle="Administración principal · Integraciones"
      backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
      showBackButton backHref="/(normal)/Main" overlapContent
      onBack={selected ? () => setSelectedKey("") : undefined}
      actions={<IconButton icon="refresh" iconColor="#ffffff" accessibilityLabel="Actualizar excepciones"
        disabled={loading} onPress={() => setRefresh((value) => value + 1)} />} />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}
      keyboardShouldPersistTaps="handled">
      <Surface style={[styles.introCard, { backgroundColor: palette.accentBg, borderColor: `${palette.accent}44` }]} elevation={0}>
        <Text variant="labelMedium" style={{ color: palette.accent, fontWeight: "700" }}>INTEGRACIONES</Text>
        <Text variant="bodyMedium" style={{ color: palette.copy }}>
          Errores de Mercado Libre organizados por producto. Selecciona un producto para ver sus registros y una fila para consultar el detalle.
        </Text>
      </Surface>
      {!selected && <Surface style={[styles.search, surfaceStyle]} elevation={0}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.title }]}>Buscar excepciones</Text>
        <Searchbar placeholder="ID de producto, pedido, usuario o error" value={searchInput}
          style={{ backgroundColor: palette.nestedSurface }}
          onChangeText={setSearchInput} maxLength={120} onSubmitEditing={submitSearch} />
        <Button mode="outlined" icon="magnify" style={styles.pillButton} disabled={loading} onPress={submitSearch}>Buscar</Button>
      </Surface>}
      {selected && <Surface style={[styles.selectedCard, surfaceStyle]} elevation={0}>
        <Button icon="arrow-left" compact mode="outlined" style={styles.pillButton}
          onPress={() => setSelectedKey("")}>Volver a productos</Button>
        <Text variant="labelMedium" style={{ color: palette.muted }}>PRODUCTO RELACIONADO</Text>
        <ProductPreview preview={productPreview} retry={retryProduct} />
        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
          {exceptionGroupLabel(selected)} · {selected.group.integration === "mercadolibre" ? "Mercado Libre" : selected.group.integration}
        </Text>
      </Surface>}
      {search !== "" && <Text variant="bodySmall" style={{ color: palette.muted }}>
        Resultados para “{search}”
      </Text>}
      {loading ? <View style={styles.status}><ActivityIndicator accessibilityLabel="Cargando excepciones" />
        <Text accessibilityLiveRegion="polite" style={{ color: palette.copy }}>{progress || "Cargando excepciones..."}</Text>
      </View>
        : error ? <Failure message={error} retry={() => setRefresh((value) => value + 1)} />
          : <View style={styles.listSection}>
            <View style={styles.sectionTitleBlock}>
              <Text variant="titleLarge" style={[styles.mainSectionTitle, { color: palette.title }]}>
                {selected ? "Registros de excepciones" : "Excepciones por producto"}
              </Text>
              <Text variant="bodySmall" style={{ color: palette.muted }}>
                {entries.length} {selected ? "registro(s)" : "agrupamiento(s)"} · Toca una fila para ver el detalle.
              </Text>
            </View>
            {items.length > 0 ? <View style={[styles.tableSurface, { borderColor: palette.border }]}>
              <View style={[styles.tableHeaderRow, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                <Text numberOfLines={1} style={[styles.thText, styles.flexMainColumn, { color: palette.muted }]}>
                  {selected ? "Error" : "Producto"}
                </Text>
                {showSecondaryColumn && <Text numberOfLines={1} style={[styles.thText, styles.flexSecondaryColumn, { color: palette.muted }]}>
                  {selected ? "Etapa / referencia" : "Último error"}
                </Text>}
                <Text numberOfLines={1} style={[styles.thText, styles.flexCountColumn, { color: palette.muted }]}>
                  {selected ? "HTTP" : "Errores"}
                </Text>
                <Text numberOfLines={1} style={[styles.thText, styles.flexDateColumn, { color: palette.muted }]}>Fecha</Text>
                <View style={styles.actionIndicator} />
              </View>
              {items.map((entry, index) => {
                const date = exceptionDate(selected ? entry.createdAt : entry.latestAt).split(",")[0];
                const title = selected ? exceptionErrorLabel(entry.error) : exceptionGroupLabel(entry);
                const subtitle = selected
                  ? `${entry.context?.stage || "Etapa no disponible"} · ${entry.context?.orderId || entry.context?.eventId || entry._id}`
                  : `${entry.group.id || "Sin identificador"} · ${exceptionErrorLabel(entry.latestError)}`;
                const secondary = selected
                  ? subtitle
                  : exceptionErrorLabel(entry.latestError);
                const accessibilityLabel = selected
                  ? `Ver detalle de ${title}, ${exceptionDate(entry.createdAt)}`
                  : `Ver ${entry.count} errores de ${title}`;
                return <TouchableOpacity
                  key={selected ? entry._id : exceptionGroupKey(entry.group)}
                  accessibilityRole="button"
                  accessibilityLabel={accessibilityLabel}
                  activeOpacity={0.65}
                  onPress={() => {
                    if (selected) setSelectedId(entry._id);
                    else { setRecordPage(1); setSelectedKey(exceptionGroupKey(entry.group)); }
                  }}
                  style={[styles.tableRow, {
                    backgroundColor: index % 2 === 0 ? palette.surface : palette.nestedSurface,
                    borderColor: palette.border,
                  }]}
                >
                  <View style={styles.flexMainColumn}>
                    <Text numberOfLines={1} style={[styles.tdText, styles.rowTitle, { color: palette.title }]}>{title}</Text>
                    {!showSecondaryColumn && <Text numberOfLines={1} variant="bodySmall" style={{ color: palette.muted }}>{subtitle}</Text>}
                  </View>
                  {showSecondaryColumn && <Text numberOfLines={1} style={[styles.tdText, styles.flexSecondaryColumn, { color: palette.copy }]}>
                    {secondary}
                  </Text>}
                  <View style={styles.flexCountColumn}>
                    {selected ? <HttpStatus compact value={entry.error?.httpStatus} />
                      : <View style={[styles.countBadge, { backgroundColor: palette.accentBg, borderColor: `${palette.accent}44` }]}>
                        <Text style={[styles.badgeText, { color: palette.accent }]}>{entry.count}</Text>
                      </View>}
                  </View>
                  <Text numberOfLines={1} style={[styles.tdText, styles.flexDateColumn, { color: palette.muted }]}>
                    {date}
                  </Text>
                  <View style={styles.actionIndicator} accessible={false}>
                    <Icon source="chevron-right" size={16} color={palette.muted} />
                  </View>
                </TouchableOpacity>;
              })}
            </View> : <View style={[styles.emptyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
              <Text variant="titleSmall" style={{ color: palette.title, fontWeight: "700" }}>No hay resultados</Text>
              <Text variant="bodySmall" style={{ color: palette.muted }}>
                No se encontraron {selected ? "registros para este producto" : "excepciones"}.
              </Text>
            </View>}
            <Surface elevation={0} style={[styles.pagination, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
              <IconButton
                accessibilityLabel="Página anterior"
                icon="chevron-left"
                iconColor={palette.title}
                size={20}
                disabled={page <= 1}
                onPress={() => (selected ? setRecordPage : setGroupPage)(page - 1)}
              />
              <Text selectable variant="labelMedium" style={{ color: palette.muted, fontVariant: ["tabular-nums"] }}>
                {entries.length ? (page - 1) * EXCEPTION_PAGE_SIZE + 1 : 0}–{Math.min(page * EXCEPTION_PAGE_SIZE, entries.length)} de {entries.length}
              </Text>
              <IconButton
                accessibilityLabel="Página siguiente"
                icon="chevron-right"
                iconColor={palette.title}
                size={20}
                disabled={page >= pages}
                onPress={() => (selected ? setRecordPage : setGroupPage)(page + 1)}
              />
            </Surface>
          </View>}
    </ScrollView>
    {selectedId !== "" && <ExceptionDetail key={selectedId} id={selectedId} onClose={() => setSelectedId("")}
      productPreview={productPreview} retryProduct={retryProduct} />}
  </View>;
}

export default function ExceptionsScreen() {
  const { user, userId } = useTracker(() => ({ user: Meteor.user(), userId: Meteor.userId() }), []);
  const theme = useTheme();
  const palette = getPalette(theme);
  const headerInset = useAppHeaderContentInset();
  if (isPrincipalAdmin(user)) return <ExceptionsBrowser key={userId} />;
  return <View style={[styles.root, { backgroundColor: palette.screen }]}>
    <AppHeader title="Excepciones" backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
      showBackButton backHref="/(normal)/Main" overlapContent />
    <ScrollView contentContainerStyle={[styles.deniedContent, { paddingTop: headerInset + 16 }]}>
      <Surface style={[styles.deniedCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
        <Text accessibilityRole="alert" variant="bodyMedium" style={{ color: palette.title }}>
          Solo el Administrador Principal puede consultar excepciones.
        </Text>
      </Surface>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  introCard: { borderWidth: 1, borderRadius: 18, borderCurve: "continuous", padding: 14, gap: 6 },
  search: { borderWidth: 1, borderRadius: 24, borderCurve: "continuous", padding: 18, gap: 12 },
  selectedCard: { borderWidth: 1, borderRadius: 24, borderCurve: "continuous", padding: 18, gap: 8 },
  productPreview: { gap: 8 },
  productLoading: { minHeight: 80, alignItems: "center", justifyContent: "center", gap: 8 },
  productDetailCard: { borderWidth: 1, borderRadius: 24, borderCurve: "continuous", padding: 16 },
  pillButton: { borderRadius: 999, alignSelf: "flex-start" },
  status: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 12 },
  failure: { borderWidth: 1, borderRadius: 18, borderCurve: "continuous", padding: 14, gap: 12 },
  listSection: { gap: 16 },
  sectionTitleBlock: { gap: 3 },
  mainSectionTitle: { fontWeight: "800", letterSpacing: -0.3 },
  tableSurface: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  thText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  tdText: { fontSize: 13, fontVariant: ["tabular-nums"] },
  rowTitle: { fontWeight: "700" },
  flexMainColumn: { flex: 1.75, minWidth: 0, paddingRight: 6 },
  flexSecondaryColumn: { flex: 1.3, minWidth: 0, paddingRight: 6 },
  flexCountColumn: { flex: 0.7, minWidth: 46, alignItems: "flex-start", justifyContent: "center" },
  flexDateColumn: { flex: 1.1, minWidth: 64 },
  actionIndicator: { width: 28, alignItems: "center", justifyContent: "center" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  badgeText: { fontWeight: "700", fontSize: 11, fontVariant: ["tabular-nums"] },
  httpBadge: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderRadius: 999, alignSelf: "flex-start" },
  compactBadge: { minWidth: 36, alignItems: "center" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "center", marginTop: 6 },
  deniedContent: { flexGrow: 1, padding: 16 },
  detail: { paddingHorizontal: 16, paddingBottom: 40, gap: 18 },
  loadingCard: { minHeight: 160, alignItems: "center", justifyContent: "center", borderRadius: 20, gap: 14 },
  summaryCard: { borderWidth: 1, borderRadius: 24, borderCurve: "continuous", padding: 18, gap: 14 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryText: { flex: 1, gap: 5 },
  summaryDivider: { height: StyleSheet.hairlineWidth },
  summaryMessage: { gap: 5 },
  section: { gap: 10 },
  sectionTitle: { marginBottom: 1, fontWeight: "700" },
  fields: { borderWidth: 1, borderRadius: 18, borderCurve: "continuous", paddingHorizontal: 14 },
  deniedCard: { borderWidth: 1, borderRadius: 18, borderCurve: "continuous", padding: 18 },
  field: { paddingVertical: 13, gap: 5 },
  emptyCard: { borderWidth: 1, borderRadius: 18, borderCurve: "continuous", padding: 18, gap: 5 },
  traceCard: { borderWidth: 1, borderRadius: 16, borderCurve: "continuous", padding: 14 },
  trace: { fontFamily: "monospace", fontSize: 12, lineHeight: 19 },
  causeCard: { borderWidth: 1, borderRadius: 16, borderCurve: "continuous", padding: 14 },
});
