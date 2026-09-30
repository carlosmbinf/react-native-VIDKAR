import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { FieldGroup, Host, Picker, Switch as NativeSwitch } from "@expo/ui";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Surface, Text, Tooltip, useTheme } from "react-native-paper";

import { TiendasComercioCollection } from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import { createEmpresaPalette, EMPRESA_BRAND } from "../styles/empresaTheme";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (MeteorBase);
const MOBILE_REDIRECT_URL = "vidkar://mercadolibre/callback";

const callMeteorMethod = (methodName, ...args) => new Promise((resolve, reject) => {
  Meteor.call(methodName, ...args, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
});

const errorMessage = (error, fallback) => error?.reason || error?.message || fallback;
const displayStatus = (state) => {
  if (state?.status === "reauthorization_required") return "Requiere autorización";
  if (state?.enabled) return "Habilitado";
  if (state?.configured) return "Desactivado";
  if (state?.oauthApp?.configured) return "Lista para vincular";
  return "Requiere configuración de VIDKAR";
};

const MercadoLibreSettingsScreen = () => {
  const theme = useTheme();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const session = Meteor.useTracker(() => ({ userId: Meteor.userId() }), []);
  const [integration, setIntegration] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [stockLocations, setStockLocations] = useState([]);
  const [selectedStockLocation, setSelectedStockLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { stores, storesReady } = Meteor.useTracker(() => {
    if (!session.userId || !Meteor.status()?.connected) return { stores: [], storesReady: false };
    const handle = Meteor.subscribe("comercio.tiendasEmpresa");
    const ready = handle.ready();
    return {
      stores: ready
        ? TiendasComercioCollection.find(
            { idUser: session.userId },
            { fields: { _id: 1, title: 1 }, sort: { title: 1 } },
          ).fetch()
        : [],
      storesReady: ready,
    };
  }, [session.userId]);

  const loadState = useCallback(async () => {
    if (!session.userId) {
      setIntegration(null);
      setLoading(false);
      return;
    }
    try {
      const [nextIntegration, nextSync] = await Promise.all([
        callMeteorMethod("comercio.mercadoLibre.getEstado"),
        callMeteorMethod("comercio.mercadoLibre.estadoSincronizacion"),
      ]);
      setIntegration(nextIntegration || null);
      setSyncState(nextSync || null);
      setSelectedStoreId((current) => current || stores[0]?._id || "");
      setError("");
    } catch (loadError) {
      setError(errorMessage(loadError, "No se pudo cargar Mercado Libre."));
    } finally {
      setLoading(false);
    }
  }, [session.userId, stores]);

  useEffect(() => {
    setLoading(true);
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (!integration?.enabled || !["pending", "processing"].includes(syncState?.status)) return undefined;
    const timer = setInterval(() => {
      callMeteorMethod("comercio.mercadoLibre.estadoSincronizacion").then(setSyncState).catch(() => null);
    }, 1800);
    return () => clearInterval(timer);
  }, [integration?.enabled, syncState?.status]);

  useEffect(() => {
    if (!integration?.enabled || !(integration.sellerTags || []).includes("warehouse_management") || !selectedStoreId) {
      setStockLocations([]);
      setSelectedStockLocation("");
      return undefined;
    }
    let active = true;
    callMeteorMethod("comercio.mercadoLibre.ubicacionesStock", selectedStoreId)
      .then((result) => {
        if (!active) return;
        const locations = Array.isArray(result?.locations) ? result.locations : [];
        setStockLocations(locations);
        const selected = result?.selected;
        setSelectedStockLocation(selected ? `${selected.storeId}|${selected.networkNodeId}` : locations.length === 1 ? `${locations[0].storeId}|${locations[0].networkNodeId}` : "");
      })
      .catch((locationError) => {
        if (active) setError(errorMessage(locationError, "No se pudieron consultar los depósitos de Mercado Libre."));
      });
    return () => { active = false; };
  }, [integration?.enabled, integration?.sellerTags, selectedStoreId]);

  const connect = async () => {
    if (busy || integration?.oauthApp?.configured !== true) return;
    setBusy("connect");
    setError("");
    setNotice("");
    try {
      const result = await callMeteorMethod("comercio.mercadoLibre.iniciarOAuth", "mobile");
      if (!result?.authorizationUrl) throw new Error("El servidor no devolvió la URL de autorización.");
      const authResult = await WebBrowser.openAuthSessionAsync(result.authorizationUrl, result.callbackUrl || MOBILE_REDIRECT_URL);
      if (authResult.type === "success") {
        const parsed = new URL(authResult.url);
        const completion = await callMeteorMethod(
          "comercio.mercadoLibre.completarOAuth",
          parsed.searchParams.get("code") || "",
          parsed.searchParams.get("state") || "",
          parsed.searchParams.get("error") || "",
          "mobile",
        );
        if (!completion?.success) {
          const messages = {
            previous_account_has_open_publications: "Cierra las publicaciones abiertas de la cuenta anterior antes de vincular otro vendedor.",
            seller_already_linked: "Esta cuenta de Mercado Libre ya está vinculada a otro usuario VIDKAR.",
            user_mismatch: "Completa la autorización desde la misma cuenta VIDKAR que la inició.",
          };
          throw new Error(messages[completion?.reason] || "Mercado Libre no completó la autorización. Puedes volver a intentarlo.");
        }
        await loadState();
        setNotice("Cuenta de Mercado Libre vinculada correctamente.");
      } else {
        setNotice("La autorización se canceló. No se guardaron credenciales nuevas.");
      }
    } catch (connectError) {
      setError(errorMessage(connectError, "No se pudo iniciar la autorización de Mercado Libre."));
    } finally {
      setBusy("");
    }
  };

  const toggleEnabled = async (enabled) => {
    if (busy) return;
    setBusy(enabled ? "enable" : "disable");
    setError("");
    try {
      const next = await callMeteorMethod(enabled
        ? "comercio.mercadoLibre.habilitar"
        : "comercio.mercadoLibre.desactivar");
      setIntegration(next);
      setNotice(enabled ? "La integración quedó habilitada." : "La integración quedó desactivada.");
    } catch (toggleError) {
      setError(errorMessage(toggleError, "No se pudo cambiar el estado de la integración."));
    } finally {
      setBusy("");
    }
  };

  const disconnect = () => {
    if (busy) return;
    Alert.alert(
      "Desconectar Mercado Libre",
      "Primero deben estar cerradas todas las publicaciones vinculadas. Los artículos locales seguirán disponibles; si quedan publicaciones activas, VIDKAR bloqueará la desconexión para evitar ventas sin sincronización.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            setBusy("disconnect");
            setError("");
            try {
              const next = await callMeteorMethod("comercio.mercadoLibre.desconectar");
              setIntegration(next);
              setSyncState(null);
              setNotice("Cuenta desconectada.");
            } catch (disconnectError) {
              setError(errorMessage(disconnectError, "No se pudo desconectar la cuenta."));
            } finally {
              setBusy("");
            }
          },
        },
      ],
    );
  };

  const synchronizeCatalog = async () => {
    if (!selectedStoreId || busy || !integration?.enabled) return;
    setBusy("sync");
    setError("");
    try {
      const result = await callMeteorMethod("comercio.mercadoLibre.sincronizarCatalogo", selectedStoreId);
      setSyncState((current) => ({ ...current, ...result, status: result?.status || "pending" }));
      setNotice("La sincronización completa del catálogo se inició.");
    } catch (syncError) {
      setError(errorMessage(syncError, "No se pudo iniciar la sincronización."));
    } finally {
      setBusy("");
    }
  };

  const saveStockLocation = async () => {
    if (!selectedStoreId || !selectedStockLocation || busy) return;
    const [storeId, networkNodeId] = selectedStockLocation.split("|");
    const location = stockLocations.find((entry) => entry.storeId === storeId && entry.networkNodeId === networkNodeId);
    if (!location) return;
    setBusy("location");
    setError("");
    try {
      await callMeteorMethod("comercio.mercadoLibre.asignarUbicacionStock", {
        localStoreId: selectedStoreId,
        storeId: location.storeId,
        networkNodeId: location.networkNodeId,
      });
      setNotice(`Depósito Mercado Libre asociado a ${stores.find((store) => store._id === selectedStoreId)?.title || "la tienda"}.`);
    } catch (locationError) {
      setError(errorMessage(locationError, "No se pudo asociar el depósito."));
    } finally {
      setBusy("");
    }
  };

  const enabled = integration?.enabled === true;
  const configured = integration?.configured === true;
  const isSyncing = ["pending", "processing"].includes(syncState?.status);
  const hasWarehouseStock = (integration?.sellerTags || []).includes("warehouse_management");

  if (loading || !storesReady) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}>
        <EmpresaTopBar backHref="/(empresa)/EmpresaNavigator" subtitle="Comercio" title="Mercado Libre" />
        <View style={styles.centerState}><ActivityIndicator animating color={palette.brand} /><Text style={{ color: palette.copy }}>Preparando la integración…</Text></View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <EmpresaTopBar backHref="/(empresa)/EmpresaNavigator" subtitle="Cuenta del comercio" title="Mercado Libre" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.hero, { backgroundColor: palette.hero, borderColor: palette.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: palette.brandSoft }]}>
            <MaterialCommunityIcons color={palette.brandStrong} name="store-sync-outline" size={26} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={{ color: palette.title }} variant="headlineSmall">Mercado Libre Uruguay</Text>
            <Text style={{ color: palette.copy }} variant="bodyMedium">Vincula tu cuenta. La aplicación y sus claves OAuth se administran únicamente en el servidor de VIDKAR.</Text>
          </View>
          <Chip compact style={{ backgroundColor: palette.brandSoft }} textStyle={{ color: palette.brandStrong }}>{displayStatus(integration)}</Chip>
        </Surface>

        {error ? <Surface style={[styles.message, { backgroundColor: theme.colors.errorContainer }]}><Text selectable style={{ color: theme.colors.onErrorContainer }}>{error}</Text></Surface> : null}
        {notice ? <Surface style={[styles.message, { backgroundColor: palette.cardSoft }]}><Text style={{ color: palette.copy }}>{notice}</Text></Surface> : null}
        {integration?.status === "reauthorization_required" ? (
          <Surface style={[styles.message, { backgroundColor: theme.colors.errorContainer }]}><Text style={{ color: theme.colors.onErrorContainer }}>La autorización expiró o fue revocada. Vuelve a autorizar para continuar.</Text></Surface>
        ) : null}
        <Surface style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={{ color: palette.title }} variant="titleMedium">Cuenta vinculada</Text>
          <Text selectable style={{ color: palette.copy }} variant="bodyMedium">
            {configured ? `${integration.account?.nickname || "Vendedor"} · ID ${integration.account?.sellerId || ""} · ${integration.account?.siteId || "MLU"}` : "Aún no hay una cuenta de Mercado Libre asociada a este usuario."}
          </Text>
          <Text style={{ color: palette.copy }} variant="bodySmall">Cada comerciante autoriza su propio vendedor. VIDKAR no solicita ni guarda la contraseña de Mercado Libre.</Text>
          {!integration?.oauthApp?.configured ? (
            <Surface style={[styles.message, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={{ color: theme.colors.onErrorContainer }}>
                La aplicación OAuth común todavía no está configurada por VIDKAR. Contacta a administración.
                {integration?.oauthApp?.missing?.length ? ` Falta: ${integration.oauthApp.missing.join(", ")}.` : ""}
              </Text>
            </Surface>
          ) : null}
          {(!configured || integration?.status === "reauthorization_required") ? (
            <Tooltip title="Autoriza tu vendedor; VIDKAR nunca ve tu contraseña.">
              <Button disabled={Boolean(busy) || integration?.oauthApp?.configured !== true} icon={busy === "connect" ? "loading" : "link-variant"} mode="contained" onPress={connect}>
                {configured ? "Reautorizar cuenta" : "Conectar Mercado Libre"}
              </Button>
            </Tooltip>
          ) : null}

          {!configured ? (
            <Text style={{ color: palette.muted }} variant="bodySmall">Al conectar, Mercado Libre pedirá que autorices esta cuenta con su inicio de sesión oficial.</Text>
          ) : (
            <>
              <View style={{ alignItems: "flex-end", marginBottom: -8 }}>
                <Tooltip title="Activa sync automática; cierra anuncios antes de desactivar.">
                  <MaterialCommunityIcons accessibilityLabel="Ayuda sobre disponibilidad" color={palette.muted} name="information-outline" size={19} />
                </Tooltip>
              </View>
              <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.nativeHost}>
                <FieldGroup>
                  <FieldGroup.Section title="Disponibilidad">
                    <NativeSwitch
                      disabled={Boolean(busy) || integration?.status === "reauthorization_required"}
                      label={enabled ? "Integración habilitada" : "Integración desactivada"}
                      onValueChange={toggleEnabled}
                      value={enabled}
                    />
                  </FieldGroup.Section>
                </FieldGroup>
              </Host>
              <Text style={{ color: palette.muted }} variant="bodySmall">Para detener la sincronización, primero cierra los anuncios desde Productos. La integración no se desactiva mientras haya publicaciones abiertas.</Text>
              <Tooltip title="Desvincula la cuenta; cierra primero sus anuncios.">
                <Button disabled={Boolean(busy)} icon="link-off" mode="text" onPress={disconnect} textColor={theme.colors.error}>
                  Desconectar cuenta
                </Button>
              </Tooltip>
            </>
          )}
        </Surface>

        {enabled ? (
          <Surface style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={{ color: palette.title }} variant="titleMedium">Catálogo y depósitos</Text>
            <Text style={{ color: palette.copy }} variant="bodySmall">La sincronización recorre publicaciones activas, pausadas y otros estados por lotes con scan/scroll_id.</Text>
            {stores.length ? (
              <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.nativeHost}>
                <Picker selectedValue={selectedStoreId} onValueChange={setSelectedStoreId}>
                  {stores.map((store) => <Picker.Item key={store._id} label={store.title || "Tienda"} value={String(store._id)} />)}
                </Picker>
              </Host>
            ) : <Text style={{ color: palette.muted }} variant="bodySmall">Primero crea una tienda VIDKAR para importar productos.</Text>}

            {hasWarehouseStock ? (
              <View style={styles.locationSection}>
                <Text style={{ color: palette.title }} variant="titleSmall">Depósito para stock multiorigen</Text>
                {stockLocations.length ? (
                  <>
                    <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.nativeHost}>
                      <Picker selectedValue={selectedStockLocation} onValueChange={setSelectedStockLocation}>
                        <Picker.Item label="Selecciona un depósito" value="" />
                        {stockLocations.map((location) => <Picker.Item
                          key={`${location.storeId}|${location.networkNodeId}`}
                          label={`${location.description}${location.city ? ` · ${location.city}` : ""}`}
                          value={`${location.storeId}|${location.networkNodeId}`}
                        />)}
                      </Picker>
                    </Host>
                    <Tooltip title="Vincula el depósito que gestionará esta tienda.">
                      <Button disabled={!selectedStockLocation || Boolean(busy)} mode="outlined" onPress={saveStockLocation}>
                        {busy === "location" ? "Guardando…" : "Asociar depósito"}
                      </Button>
                    </Tooltip>
                  </>
                ) : <Text style={{ color: palette.muted }} variant="bodySmall">No se encontraron depósitos de stock. Configúralos primero en Mercado Libre.</Text>}
              </View>
            ) : null}

            <Tooltip title="Importa o actualiza anuncios en esta tienda.">
              <Button disabled={!stores.length || !selectedStoreId || isSyncing || Boolean(busy)} icon={isSyncing || busy === "sync" ? "loading" : "cloud-sync"} mode="contained" onPress={synchronizeCatalog}>
                {isSyncing ? "Sincronizando…" : "Importar / actualizar catálogo"}
              </Button>
            </Tooltip>
            {syncState && syncState.status !== "idle" ? (
              <Surface style={[styles.syncStatus, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                <Text style={{ color: palette.title }} variant="titleSmall">{syncState.message || "Estado de la última sincronización"}</Text>
                <Text selectable style={{ color: palette.copy }} variant="bodySmall">
                  {`${Number(syncState.processed || 0)} procesadas · ${Number(syncState.imported || 0)} nuevas · ${Number(syncState.updated || 0)} actualizadas · ${Number(syncState.failed || 0)} con error`}
                </Text>
              </Surface>
            ) : null}
          </Surface>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hero: { alignItems: "center", borderRadius: 24, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 16 },
  heroIcon: { alignItems: "center", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  heroCopy: { flex: 1, gap: 4, minWidth: 180 },
  card: { borderRadius: 22, borderWidth: 1, gap: 12, padding: 16 },
  message: { borderRadius: 16, padding: 12 },
  nativeHost: { width: "100%" },
  locationSection: { gap: 8, paddingTop: 8 },
  syncStatus: { borderRadius: 14, borderWidth: 1, gap: 4, padding: 12 },
});

export default MercadoLibreSettingsScreen;
