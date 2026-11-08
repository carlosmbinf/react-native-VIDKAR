import Meteor, { useTracker } from "@meteorrn/core";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, DataTable, Divider, IconButton, Searchbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { isPrincipalAdmin } from "../../services/mcp/mcpAccess";
import {
  EXCEPTION_CONTEXT_LABELS, EXCEPTION_METHODS, EXCEPTION_PAGE_SIZE, exceptionDate, exceptionErrorLabel,
  exceptionFailure, exceptionGroupKey, exceptionGroupLabel, exceptionValue, loadExceptionGroups,
} from "../../services/integrationExceptions";

const call = (method, ...args) => new Promise((resolve, reject) => {
  Meteor.call(method, ...args, (error, result) => error ? reject(error) : resolve(result));
});

function Failure({ message, retry }) {
  const theme = useTheme();
  return <View style={styles.status}>
    <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{message}</Text>
    <Button onPress={retry}>Reintentar</Button>
  </View>;
}

function Fields({ entries }) {
  return entries.map(([label, value]) => <View key={label} style={styles.field}>
    <Text variant="labelMedium">{label}</Text>
    <Text selectable variant="bodyMedium">{exceptionValue(value)}</Text>
  </View>);
}

function Trace({ frames }) {
  return <Text selectable style={styles.trace}>{frames?.length
    ? frames.map((frame) => `${frame.function || "Función anónima"} · ${frame.file}:${frame.line}:${frame.column}`).join("\n")
    : "No hay ubicaciones disponibles para esta excepción."}</Text>;
}

function ExceptionDetail({ id, onClose }) {
  const theme = useTheme();
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
  return <Modal visible animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.heading}>
        <Text variant="titleLarge" style={styles.headingText}>Detalle de la excepción</Text>
        <IconButton icon="close" accessibilityLabel="Cerrar detalle" onPress={onClose} />
      </View>
      <Divider />
      <ScrollView contentContainerStyle={styles.detail}>
        {loading ? <ActivityIndicator accessibilityLabel="Cargando detalle" /> : error
          ? <Failure message={error} retry={() => setRefresh((value) => value + 1)} />
          : detail && <>
            <Fields entries={[
              ["Fecha", exceptionDate(detail.createdAt)],
              ["Integración", detail.integration === "mercadolibre" ? "Mercado Libre" : detail.integration],
              ["Identificador", detail._id], ["Tipo", detail.error?.name],
              ["Código", detail.error?.code], ["Estado HTTP", detail.error?.httpStatus],
              ["Mensaje disponible", detail.error?.message],
            ]} />
            <Text variant="titleMedium" style={styles.section}>Contexto de la operación</Text>
            {Object.keys(detail.context || {}).length
              ? <Fields entries={Object.entries(detail.context).filter(([, value]) => value != null)
                .map(([key, value]) => [EXCEPTION_CONTEXT_LABELS[key] || key, value])} />
              : <Text>No hay contexto disponible.</Text>}
            {detail.error?.validation?.length > 0 && <>
              <Text variant="titleMedium" style={styles.section}>Validaciones</Text>
              {detail.error.validation.map((entry, index) => <Text selectable key={index}>
                {entry.field || "Campo desconocido"} · {entry.type || "Validación"}
              </Text>)}
            </>}
            <Text variant="titleMedium" style={styles.section}>Ubicación del error</Text>
            <Trace frames={detail.error?.frames} />
            {detail.error?.causes?.map((cause, index) => <View key={index}>
              <Text variant="titleMedium" style={styles.section}>Causa {index + 1}: {exceptionErrorLabel(cause)}</Text>
              {cause.message && <Text selectable>{cause.message}</Text>}
              <Trace frames={cause.frames} />
            </View>)}
          </>}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

function ExceptionsBrowser() {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
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
  const selected = groups.find((entry) => exceptionGroupKey(entry.group) === selectedKey);
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

  const submitSearch = () => {
    setSelectedKey("");
    setGroupPage(1);
    setSearch(searchInput.trim());
    setRefresh((value) => value + 1);
  };
  return <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
    <AppHeader title="Excepciones" subtitle="Administración principal · Integraciones"
      showBackButton backHref="/(normal)/Main" overlapContent
      onBack={selected ? () => setSelectedKey("") : undefined}
      actions={<IconButton icon="refresh" iconColor="#ffffff" accessibilityLabel="Actualizar excepciones"
        disabled={loading} onPress={() => setRefresh((value) => value + 1)} />} />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}
      keyboardShouldPersistTaps="handled">
      <Text variant="bodyMedium">Errores de Mercado Libre organizados por producto. Toca un producto para ver sus registros y una fila para consultar el detalle.</Text>
      {!selected && <View style={styles.search}>
        <Searchbar placeholder="ID de producto, pedido, usuario o error" value={searchInput}
          onChangeText={setSearchInput} maxLength={120} onSubmitEditing={submitSearch} />
        <Button mode="contained" disabled={loading} onPress={submitSearch}>Buscar</Button>
      </View>}
      {selected && <>
        <Button icon="arrow-left" onPress={() => setSelectedKey("")}>Volver a productos</Button>
        <Text variant="titleMedium">{exceptionGroupLabel(selected)}</Text>
        <Text variant="bodySmall">{selected.group.id || "Sin producto identificado"} · {selected.group.integration === "mercadolibre" ? "Mercado Libre" : selected.group.integration}</Text>
      </>}
      {search !== "" && <Text variant="bodySmall">Registros que coinciden con: {search}</Text>}
      {loading ? <View style={styles.status}><ActivityIndicator accessibilityLabel="Cargando excepciones" />
        <Text accessibilityLiveRegion="polite">{progress || "Cargando excepciones..."}</Text>
      </View>
        : error ? <Failure message={error} retry={() => setRefresh((value) => value + 1)} />
          : <>
            <ScrollView horizontal>
              <DataTable style={styles.table}>
                <DataTable.Header>
                  <DataTable.Title style={styles.mainColumn}>{selected ? "Error / etapa" : "Producto / publicación"}</DataTable.Title>
                  <DataTable.Title style={styles.countColumn}>{selected ? "HTTP" : "Errores"}</DataTable.Title>
                  <DataTable.Title style={styles.dateColumn}>{selected ? "Fecha" : "Último error"}</DataTable.Title>
                </DataTable.Header>
                {items.map((entry) => <DataTable.Row
                  key={selected ? entry._id : exceptionGroupKey(entry.group)}
                  accessibilityRole="button"
                  accessibilityLabel={selected
                    ? `Ver detalle de ${exceptionErrorLabel(entry.error)}, ${exceptionDate(entry.createdAt)}`
                    : `Ver ${entry.count} errores de ${exceptionGroupLabel(entry)}`}
                  onPress={() => {
                    if (selected) setSelectedId(entry._id);
                    else { setRecordPage(1); setSelectedKey(exceptionGroupKey(entry.group)); }
                  }} style={styles.row}>
                  <View style={styles.mainColumn}>
                    <Text numberOfLines={2} variant="bodyMedium">{selected ? exceptionErrorLabel(entry.error) : exceptionGroupLabel(entry)}</Text>
                    <Text numberOfLines={2} variant="bodySmall">{selected
                      ? `${entry.context?.stage || "Etapa no disponible"} · ${entry.context?.orderId || entry.context?.eventId || entry._id}`
                      : `${entry.group.id || "Sin identificador"} · ${exceptionErrorLabel(entry.latestError)}`}</Text>
                  </View>
                  <Text style={styles.countColumn}>{selected ? entry.error?.httpStatus || "—" : entry.count}</Text>
                  <Text variant="bodySmall" style={styles.dateColumn}>{exceptionDate(selected ? entry.createdAt : entry.latestAt)}</Text>
                </DataTable.Row>)}
              </DataTable>
            </ScrollView>
            {!items.length && <Text style={styles.status}>No se encontraron {selected ? "registros para este producto" : "excepciones"}.</Text>}
            <View style={styles.pagination}>
              <Text variant="bodySmall">{entries.length} {selected ? "registros" : "agrupamientos"} · Página {page} de {pages}</Text>
              <View style={styles.heading}>
                <Button disabled={page <= 1} onPress={() => (selected ? setRecordPage : setGroupPage)(page - 1)}>Anterior</Button>
                <Button disabled={page >= pages}
                  onPress={() => (selected ? setRecordPage : setGroupPage)(page + 1)}>Siguiente</Button>
              </View>
            </View>
          </>}
    </ScrollView>
    {selectedId !== "" && <ExceptionDetail key={selectedId} id={selectedId} onClose={() => setSelectedId("")} />}
  </View>;
}

export default function ExceptionsScreen() {
  const { user, userId } = useTracker(() => ({ user: Meteor.user(), userId: Meteor.userId() }), []);
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  if (isPrincipalAdmin(user)) return <ExceptionsBrowser key={userId} />;
  return <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
    <AppHeader title="Excepciones" showBackButton backHref="/(normal)/Main" overlapContent />
    <Text accessibilityRole="alert" style={[styles.status, { marginTop: headerInset }]}>
      Solo el Administrador Principal puede consultar excepciones.
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  search: { gap: 8 },
  status: { padding: 24, gap: 12 },
  table: { width: 620 },
  row: { minHeight: 76, alignItems: "center" },
  mainColumn: { flex: 1, paddingRight: 12, justifyContent: "center" },
  countColumn: { width: 72, flex: 0, textAlign: "center" },
  dateColumn: { width: 160, flex: 0, paddingLeft: 12 },
  pagination: { gap: 8, alignItems: "center" },
  heading: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  headingText: { flex: 1 },
  detail: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 16, gap: 4 },
  section: { marginTop: 16, marginBottom: 12 },
  trace: { fontFamily: "monospace", lineHeight: 20 },
});
