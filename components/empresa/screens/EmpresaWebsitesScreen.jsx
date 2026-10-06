import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Button, Dialog, HelperText, Portal, Surface, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createWebsiteService,
  getWebsiteErrorMessage,
  getWebsiteProgress,
  hasEmpresaWebsiteAccess,
  normalizeWebsiteName,
  normalizeWebsiteSlug,
  WEBSITE_ACTIONS,
} from "../../../services/commerceProvisioning";
import { ComercioProvisioningRequestsCollection } from "../../collections/collections";
import AppHeader from "../../Header/AppHeader";
import WebsiteRequestCard, { WebsiteNotice } from "../components/WebsiteRequestCard";
import { createEmpresaPalette, EMPRESA_BRAND, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

export default function PaginasWebScreen({ header }) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const metrics = getEmpresaScreenMetrics(width);
  const service = useMemo(() => createWebsiteService(Meteor), []);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const mounted = useRef(true);
  const operation = useRef(null);
  const listRef = useRef(null);
  const session = Meteor.useTracker(() => {
    const userId = Meteor.userId();
    const connected = Meteor.status()?.connected === true;
    if (!userId || !connected) return { userId, connected, ready: false, user: null, requests: [], handles: [] };
    const accessHandle = Meteor.subscribe("comercio.empresaAccess");
    const modeHandle = Meteor.subscribe("user", { _id: userId }, { fields: { modoEmpresa: 1 } });
    const user = Meteor.users.findOne({ _id: userId });
    const accessReady = accessHandle.ready() && modeHandle.ready();
    const requestsHandle = accessReady && hasEmpresaWebsiteAccess(user)
      ? Meteor.subscribe("comercio.provisioning.mine")
      : null;
    const ready = accessReady && (!requestsHandle || requestsHandle.ready());
    return {
      userId,
      user,
      connected,
      ready,
      requests: ready && requestsHandle
        ? ComercioProvisioningRequestsCollection.find({ ownerId: userId }, { sort: { createdAt: -1 } }).fetch()
        : [],
      handles: [accessHandle, modeHandle, requestsHandle].filter(Boolean),
    };
  }, [subscriptionAttempt]);
  const hasAccess = hasEmpresaWebsiteAccess(session.user);
  const disabled = Boolean(busy) || !session.connected || !session.ready || !hasAccess;
  const normalizedSlug = normalizeWebsiteSlug(slug);
  const normalizedName = normalizeWebsiteName(displayName);
  const selectedRequest = session.requests.find((request) => request._id === confirmation?.requestId);
  const selectedAction = confirmation ? WEBSITE_ACTIONS[confirmation.action] : null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    operation.current = null;
    setDisplayName("");
    setSlug("");
    setBusy("");
    setBusyRequestId("");
    setError("");
    setNotice("");
    setConfirmation(null);
  }, [session.userId]);

  useEffect(() => {
    setLoadTimedOut(false);
    if (!session.userId || !session.connected || session.ready) return undefined;
    const timer = setTimeout(() => setLoadTimedOut(true), 25000);
    return () => clearTimeout(timer);
  }, [session.userId, session.connected, session.ready, subscriptionAttempt]);

  useEffect(() => {
    if (error || notice) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [error, notice]);

  const retryLoading = () => {
    session.handles.forEach((handle) => handle.stop());
    Meteor.reconnect();
    setSubscriptionAttempt((current) => current + 1);
  };

  const runOperation = async (action, request) => {
    if (operation.current || disabled) return;
    if (action !== "create" && !WEBSITE_ACTIONS[action]?.allowed(getWebsiteProgress(request))) {
      setConfirmation(null);
      setError("La solicitud cambió de estado y ya no permite esta acción.");
      return;
    }
    const current = { userId: session.userId };
    operation.current = current;
    const stillCurrent = () => mounted.current && operation.current === current && Meteor.userId() === current.userId;
    setError("");
    setNotice("");
    setBusy(action);
    setBusyRequestId(request?._id || "");
    setConfirmation(null);
    try {
      if (action === "create") {
        const result = await service.create({ displayName, slug });
        if (!stillCurrent()) return;
        setNotice(result.created === false
          ? `Ya existe una solicitud para ${result.hostname}; puedes seguir su estado en tus páginas web.`
          : `Solicitud recibida para ${result.hostname}. La página permanecerá pendiente hasta verificar el DNS.`);
        setDisplayName("");
        setSlug("");
      } else {
        await service.perform(action, request._id);
        if (stillCurrent()) setNotice(WEBSITE_ACTIONS[action].notice(request));
      }
    } catch (actionError) {
      if (stillCurrent()) setError(getWebsiteErrorMessage(actionError, "No se pudo completar la operación."));
    } finally {
      if (stillCurrent()) {
        setBusy("");
        setBusyRequestId("");
        operation.current = null;
      }
    }
  };

  const openWebsite = async (request) => {
    try {
      const url = new URL(request.publicUrl);
      if (url.protocol !== "https:" || url.hostname !== request.hostname || url.username || url.password) {
        throw new Error("La dirección de esta página web no es válida.");
      }
      await Linking.openURL(url.toString());
    } catch (openError) {
      if (mounted.current) setError(getWebsiteErrorMessage(openError, "No se pudo abrir la página web."));
    }
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <Surface elevation={0} style={[styles.hero, { backgroundColor: palette.hero, borderColor: palette.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: palette.brandSoft }]}>
          <MaterialCommunityIcons color="#60a5fa" name="web" size={30} />
        </View>
        <View style={styles.flexCopy}>
          <Text style={[styles.title, { color: palette.title }]} variant="headlineSmall">Páginas web de tu empresa</Text>
          <Text style={{ color: palette.copy }} variant="bodyMedium">
            Administra varias páginas web para esta empresa, cada una con su propio subdominio y DNS.
          </Text>
        </View>
      </Surface>
      {error ? <WebsiteNotice palette={palette} severity="error">{error}</WebsiteNotice> : null}
      {notice ? <WebsiteNotice palette={palette} severity="success">{notice}</WebsiteNotice> : null}
      {!session.connected ? <>
        <WebsiteNotice palette={palette}>Sin conexión con VIDKAR. Los estados se actualizarán al reconectar.</WebsiteNotice>
        <Button icon="refresh" onPress={retryLoading}>Reconectar</Button>
      </> : null}
      {session.userId && session.connected && !session.ready ? loadTimedOut ? <>
        <WebsiteNotice palette={palette} severity="error">No se pudo cargar el espacio de Empresa. Comprueba la conexión y reintenta.</WebsiteNotice>
        <Button icon="refresh" onPress={retryLoading}>Reintentar carga</Button>
      </> : <View style={styles.loading}><ActivityIndicator /><Text style={{ color: palette.copy }}>Cargando el espacio de Empresa…</Text></View> : null}
      {!session.userId || (session.ready && !hasAccess) ? <>
        <WebsiteNotice palette={palette} severity="warning">
          {session.user?.empresaBloqueada === true
            ? "El acceso de empresa está bloqueado. Contacta con administración para revisar tu cuenta."
            : "Esta sección requiere iniciar sesión y tener el modo empresa activo, con sus términos aceptados."}
        </WebsiteNotice>
        <Button onPress={() => router.replace(session.userId ? "/(normal)/Main" : "/(auth)/Loguin")}>Volver al inicio</Button>
      </> : null}
      {session.ready && hasAccess ? <>
        <Surface elevation={0} style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.title }]} variant="titleLarge">
            {session.requests.length ? "Solicita otra página web" : "Crea tu página web"}
          </Text>
          <Text style={{ color: palette.copy }} variant="bodyMedium">
            Cada página queda asociada a la misma cuenta y catálogo de Empresa, pero usa su propio subdominio. Administración configura el DNS en Squarespace y el sistema lo verifica antes de iniciar la instalación.
          </Text>
          <View style={[styles.form, width >= 760 ? styles.formWide : null]}>
            <TextInput
              accessibilityLabel="Nombre público del comercio"
              disabled={Boolean(busy)}
              label="Nombre público del comercio"
              maxLength={80}
              mode="outlined"
              onChangeText={setDisplayName}
              style={[styles.input, width >= 760 ? styles.inputWide : null, { backgroundColor: palette.input }]}
              value={displayName}
            />
            <TextInput
              accessibilityLabel="Subdominio"
              autoCapitalize="none"
              autoCorrect={false}
              disabled={Boolean(busy)}
              label="Subdominio"
              mode="outlined"
              onChangeText={setSlug}
              style={[styles.input, width >= 760 ? styles.inputWide : null, { backgroundColor: palette.input }]}
              value={slug}
            />
          </View>
          <HelperText type="info">Usa letras, números y guiones; entre 3 y 40 caracteres.</HelperText>
          <View style={styles.preview}>
            <MaterialCommunityIcons color="#60a5fa" name="storefront-outline" size={22} />
            <Text style={[styles.flexCopy, { color: "#60a5fa" }]} variant="titleMedium">
              {normalizedSlug ? `${normalizedSlug}.vidkar.com` : "El dominio aparecerá aquí"}
            </Text>
          </View>
          <Button
            disabled={disabled || normalizedSlug.length < 3 || normalizedName.length < 2 || normalizedName.length > 80}
            icon="storefront-outline"
            loading={busy === "create"}
            mode="contained"
            onPress={() => runOperation("create")}
            style={styles.primaryButton}
          >
            {busy === "create" ? "Enviando solicitud…" : "Solicitar otra página web"}
          </Button>
        </Surface>
        <Text style={[styles.title, { color: palette.title }]} variant="titleLarge">Tus páginas web</Text>
      </> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.screen, { backgroundColor: palette.background }]}>
      {header || <AppHeader backHref="/(empresa)/EmpresaNavigator" backgroundColor={EMPRESA_BRAND} showBackButton title="Páginas web" subtitle="Creación y seguimiento" />}
      <FlatList
        ref={listRef}
        contentContainerStyle={[styles.content, {
          maxWidth: metrics.contentMaxWidth || 1040,
          paddingHorizontal: metrics.horizontalPadding,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        }]}
        data={session.requests}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(request) => request._id}
        ListEmptyComponent={session.ready && hasAccess ? <WebsiteNotice palette={palette}>
          Todavía no solicitaste una página web. Crea la primera usando el formulario de arriba.
        </WebsiteNotice> : null}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => <WebsiteRequestCard
          busy={busy}
          busyRequestId={busyRequestId}
          disabled={disabled}
          onAction={(action, request) => setConfirmation({ action, requestId: request._id })}
          onOpen={openWebsite}
          palette={palette}
          request={item}
        />}
      />
      <Portal>
        <Dialog onDismiss={() => setConfirmation(null)} visible={Boolean(selectedAction && selectedRequest && hasAccess)}>
          <Dialog.Title>{selectedAction?.title}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{selectedAction && selectedRequest ? selectedAction.confirm(selectedRequest) : ""}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmation(null)}>Volver</Button>
            <Button disabled={disabled} onPress={() => selectedRequest && runOperation(confirmation.action, selectedRequest)}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignSelf: "center", paddingTop: 20, width: "100%" },
  headerContent: { gap: 18, marginBottom: 18 },
  hero: { alignItems: "center", borderRadius: 24, borderWidth: 1, flexDirection: "row", gap: 16, padding: 20 },
  heroIcon: { alignItems: "center", borderRadius: 18, height: 60, justifyContent: "center", width: 60 },
  flexCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: "800" },
  section: { borderRadius: 22, borderWidth: 1, gap: 12, padding: 20 },
  form: { gap: 12 },
  formWide: { flexDirection: "row" },
  input: { minWidth: 0 },
  inputWide: { flex: 1 },
  preview: { alignItems: "center", flexDirection: "row", gap: 8 },
  primaryButton: { alignSelf: "flex-start", maxWidth: "100%" },
  loading: { alignItems: "center", gap: 12, paddingVertical: 30 },
  separator: { height: 18 },
});
