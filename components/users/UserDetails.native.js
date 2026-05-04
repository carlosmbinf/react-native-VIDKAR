import MeteorBase from "@meteorrn/core";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Appbar,
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import {
  PreciosCollection,
  VentasCollection,
} from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import AdminAssignmentCard from "./componentsUserDetails/AdminAssignmentCard";
import DeleteAccountCard from "./componentsUserDetails/DeleteAccountCard";
import DevicesCard from "./componentsUserDetails/DevicesCard";
import OptionsCardAdmin from "./componentsUserDetails/OptionsCardAdmin";
import PersonalDataCard from "./componentsUserDetails/PersonalDataCard";
import ProxyCard from "./componentsUserDetails/ProxyCard";
import SaldoRecargasCard from "./componentsUserDetails/SaldoRecargasCard";
import TarjetaDebitoCard from "./componentsUserDetails/TarjetaDebitoCard";
import UserDataCard from "./componentsUserDetails/UserDataCard";
import VentasCard from "./componentsUserDetails/VentasCard";
import VpnCard from "./componentsUserDetails/VpnCard";
import { canAccessPushTokenDashboards } from "./pushTokens/utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const USER_DETAIL_FIELDS = {
  baneado: 1,
  bloqueadoDesbloqueadoPor: 1,
  descuentoproxy: 1,
  descuentovpn: 1,
  desconectarVPN: 1,
  fechaSubscripcion: 1,
  isIlimitado: 1,
  megas: 1,
  megasGastadosinBytes: 1,
  modoEmpresa: 1,
  permitirAprobacionEfectivoCUP: 1,
  permitirPagoEfectivoCUP: 1,
  permiteRemesas: 1,
  picture: 1,
  profile: 1,
  saldoRecargas: 1,
  subscipcionPelis: 1,
  username: 1,
  vpn: 1,
  vpn2mbConnected: 1,
  vpn2mb: 1,
  vpnMbGastados: 1,
  vpnfechaSubscripcion: 1,
  vpnmegas: 1,
  vpnplus: 1,
  vpnplusConnected: 1,
  vpnisIlimitado: 1,
};

const USER_DETAIL_PRICE_FIELDS = {
  megas: 1,
  precio: 1,
  type: 1,
  userId: 1,
};

const USER_PENDING_VENTAS_FIELDS = {
  adminId: 1,
  cobrado: 1,
  precio: 1,
};

const UserDetails = () => {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const routeItemId = Array.isArray(params.item) ? params.item[0] : params.item;
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const canViewPushDashboard = Meteor.useTracker(
    () => canAccessPushTokenDashboards(Meteor.user()),
    [],
  );
  const itemId = routeItemId || currentUserId || null;
  const [edit, setEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const currentWidth = width;
  const dataReady = useDeferredScreenData();
  const profilePalette = useMemo(
    () => ({
      border: theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)",
      card: theme.dark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
      cardAlt: theme.dark ? "rgba(30, 41, 59, 0.72)" : "rgba(248, 250, 252, 0.94)",
      dropdown: theme.dark ? "rgba(15, 23, 42, 0.92)" : "#ffffff",
      dropdownBorder: theme.dark ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.14)",
      label: theme.dark ? "#94a3b8" : "#64748b",
      screen: theme.dark ? "#020617" : "#eef3fb",
      text: theme.dark ? "#cbd5e1" : "#334155",
      title: theme.dark ? "#f8fafc" : "#0f172a",
    }),
    [theme.dark],
  );
  const profileStyles = useMemo(
    () => ({
      ...styles,
      cards: [
        styles.cards,
        {
          backgroundColor: profilePalette.card,
          borderColor: profilePalette.border,
          shadowColor: theme.dark ? "#000000" : "#0f172a",
        },
      ],
      data: [styles.data, { color: profilePalette.text }],
      dropdown: [
        styles.dropdown,
        {
          backgroundColor: profilePalette.dropdown,
          borderColor: profilePalette.dropdownBorder,
        },
      ],
      inputSearchStyle: [
        styles.inputSearchStyle,
        {
          backgroundColor: profilePalette.dropdown,
          color: profilePalette.title,
        },
      ],
      label: [
        styles.label,
        {
          backgroundColor: profilePalette.card,
          color: profilePalette.label,
        },
      ],
      placeholderStyle: [styles.placeholderStyle, { color: profilePalette.label }],
      selectedTextStyle: [styles.selectedTextStyle, { color: profilePalette.title }],
      title: [styles.title, { color: profilePalette.title }],
    }),
    [profilePalette, theme.dark],
  );
  const timelinePalette = useMemo(
    () => ({
      description: theme.dark ? "#cbd5e1" : "#64748b",
      icon: theme.dark ? "#dbeafe" : "#1d4ed8",
      iconSurface: theme.dark
        ? "rgba(59, 130, 246, 0.22)"
        : "rgba(37, 99, 235, 0.12)",
      label: theme.dark ? "#93c5fd" : "#64748b",
      surface: theme.dark
        ? "rgba(15, 23, 42, 0.96)"
        : theme.colors.surface,
      title: theme.dark ? "#f8fafc" : "#0f172a",
    }),
    [theme.colors.surface, theme.dark],
  );

  const { ready, item, precioslist, preciosVPNlist } = Meteor.useTracker(() => {
    if (!dataReady || !itemId) {
      return {
        ready: false,
        item: null,
        precioslist: [],
        preciosVPNlist: [],
        loadventas: false,
      };
    }

    const preciosHandle = Meteor.subscribe(
      "precios",
      {},
      { fields: USER_DETAIL_PRICE_FIELDS, sort: { type: 1, precio: 1 } },
    );
    const ventasHandle = Meteor.subscribe(
      "ventas",
      {
        adminId: itemId,
        cobrado: false,
      },
      { fields: USER_PENDING_VENTAS_FIELDS },
    );
    const userHandle = Meteor.subscribe("user", { _id: itemId }, {
      fields: USER_DETAIL_FIELDS,
    });
    const precioslistData = PreciosCollection.find(
      { userId: Meteor.userId(), type: "megas" },
      { fields: USER_DETAIL_PRICE_FIELDS, sort: { precio: 1 } },
    )
      .fetch()
      .map((price) => ({
        value: price.megas,
        label: `${price.megas}MB • $${price.precio >= 0 ? price.precio : 0}`,
      }));
    const preciosVPNData = PreciosCollection.find(
      {
        userId: Meteor.userId(),
        $or: [{ type: "vpnplus" }, { type: "vpn2mb" }],
      },
      { fields: USER_DETAIL_PRICE_FIELDS, sort: { precio: 1 } },
    )
      .fetch()
      .map((price) => ({
        value: price.megas,
        label: `${price.type} • ${price.megas}MB • $${price.precio >= 0 ? price.precio : 0}`,
      }));
    return {
      ready:
        preciosHandle.ready() && ventasHandle.ready() && userHandle.ready(),
      item: Meteor.users.findOne(
        { _id: itemId },
        { fields: USER_DETAIL_FIELDS },
      ),
      precioslist: precioslistData,
      preciosVPNlist: preciosVPNData,
    };
  }, [dataReady, itemId, refreshKey]);

  const accentColor = useMemo(() => {
    const seed = item?.username || item?._id || "U";
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = seed.charCodeAt(index) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00ffffff).toString(16).toUpperCase();
    return `#${"00000".substring(0, 6 - color.length)}${color}`;
  }, [item?._id, item?.username]);

  const deuda = () => {
    if (!item?._id) {
      return 0;
    }
    return VentasCollection.find(
      { adminId: item._id, cobrado: false },
      { fields: USER_PENDING_VENTAS_FIELDS },
    )
      .fetch()
      .reduce((total, sale) => total + (Number(sale.precio) || 0), 0);
  };

  const handleVPNStatus = () => {
    let validacion = false;
    if (
      item?.vpnisIlimitado &&
      new Date() < new Date(item.vpnfechaSubscripcion)
    ) {
      validacion = true;
    }
    if (
      !item?.vpnisIlimitado &&
      (item?.vpnMbGastados ? item.vpnMbGastados / 1024000 : 0) <
        (item?.vpnmegas || 0)
    ) {
      validacion = true;
    }
    if (!validacion) {
      alert("Revise los límites del usuario");
      return;
    }
    Meteor.call("addVentasVPN", item._id, Meteor.userId(), (error, result) => {
      if (error) {
        alert(error.message);
        return;
      }
      if (result) {
        alert(result);
      }
    });
  };

  const handleReiniciarConsumo = async () => {
    try {
      await Meteor.call("guardarDatosConsumidosByUserPROXYHoras", item);
      await Meteor.call("reiniciarConsumoDeDatosPROXY", item);
      await Meteor.call("desactivarUserProxy", item);
      await Meteor.call(
        "registrarLog",
        "Reinicio PROXY",
        item._id,
        Meteor.userId(),
        `Ha sido reiniciado el consumo de Datos del PROXY de ${item.profile.firstName} ${item.profile.lastName} y desactivado el proxy`,
      );
      alert(`Se reinició el consumo del PROXY de ${item.profile.firstName}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReiniciarConsumoVPN = async () => {
    try {
      await Meteor.call("guardarDatosConsumidosByUserVPNHoras", item);
      await Meteor.call("reiniciarConsumoDeDatosVPN", item);
      await Meteor.call("desactivarUserVPN", item);
      await Meteor.call(
        "registrarLog",
        "Reinicio VPN",
        item._id,
        Meteor.userId(),
        `Ha sido reiniciado el consumo de Datos de la VPN de ${item.profile.firstName} ${item.profile.lastName}`,
      );
      alert(
        `Ha sido reiniciado el consumo de Datos de la VPN de ${item.profile.firstName} ${item.profile.lastName}`,
      );
    } catch (error) {
      console.error(error);
    }
  };

  const addVenta = () => {
    let validacion = false;
    if (item?.isIlimitado && new Date() < new Date(item.fechaSubscripcion)) {
      validacion = true;
    }
    if (
      !item?.isIlimitado &&
      (item?.megasGastadosinBytes ? item.megasGastadosinBytes / 1024000 : 0) <
        (item?.megas || 0)
    ) {
      validacion = true;
    }
    if (!validacion) {
      alert("Revise los límites del usuario");
      return;
    }
    Meteor.call(
      "addVentasProxy",
      item._id,
      Meteor.userId(),
      (error, result) => {
        if (error) {
          alert(error.message);
          return;
        }
        if (result) {
          alert(result);
        }
      },
    );
  };

  const computedCardWidth = !isTablet
    ? { width: "100%" }
    : currentWidth >= 1200
      ? { width: "31%" }
      : { width: "48%" };

  const fallbackRoute = pathname?.startsWith("/(empresa)")
    ? "/(empresa)/EmpresaNavigator"
    : "/(normal)/Main";

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRoute);
  };

  const handleOpenVentasPendientes = () => {
    if (!item?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/Ventas",
      params: {
        id: item._id,
        pago: "PENDIENTE",
      },
    });
  };

  const handleOpenPushDevices = () => {
    if (!item?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/UserPushTokens",
      params: {
        item: item._id,
        username: item.username || "",
      },
    });
  };

  const handleOpenLogsTimeline = () => {
    if (!item?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/UserLogsTimeline",
      params: {
        id: item._id,
        name:
          `${item?.profile?.firstName || ""} ${item?.profile?.lastName || ""}`.trim() ||
          item.username ||
          "Usuario",
        username: item.username || "",
      },
    });
  };

  if (!itemId) {
    return (
      <Surface style={styles.emptyState}>
        <Text variant="titleMedium">
          No se recibió el usuario a visualizar.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.background, { backgroundColor: profilePalette.screen }]}>
      <AppHeader
        title={item ? item.username || "Usuario" : "Usuario"}
        subtitle={item ? "Detalle y configuración" : "Cargando detalle"}
        left={<Appbar.BackAction iconColor="#fff" onPress={handleBack} />}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => setRefreshKey((current) => current + 1)}
          />
        }
      >
        {!ready ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#3f51b5" />
          </View>
        ) : item ? (
          <View style={[styles.root, isTablet && styles.rootTablet]}>
            {Meteor.user()?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <VentasCard
                  deuda={deuda}
                  onPressDetalles={handleOpenVentasPendientes}
                  styles={profileStyles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
            {Meteor.user()?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <SaldoRecargasCard
                  refreshKey={refreshKey}
                  accentColor={accentColor}
                  styles={profileStyles}
                />
              </View>
            ) : null}
            <View style={[styles.cardItem, computedCardWidth]}>
              <PersonalDataCard item={item} styles={profileStyles} />
            </View>
            <View style={[styles.cardItem, computedCardWidth]}>
              <UserDataCard
                item={item}
                styles={profileStyles}
                edit={edit}
                setEdit={setEdit}
                accentColor={accentColor}
              />
            </View>
            <View style={[styles.cardItem, computedCardWidth]}>
              <Surface
                elevation={5}
                style={[
                  styles.cards,
                  styles.timelineLinkCard,
                  { backgroundColor: timelinePalette.surface },
                ]}
                testID="user-logs-timeline-card"
              >
                <View style={[styles.timelineAccentBar, { backgroundColor: accentColor }]} />
                <View style={styles.timelineLinkContent}>
                  <View style={styles.timelineLinkHeader}>
                    <View
                      style={[
                        styles.timelineIconWrap,
                        { backgroundColor: timelinePalette.iconSurface },
                      ]}
                    >
                      <IconButton
                        icon="timeline-clock-outline"
                        size={26}
                        iconColor={timelinePalette.icon}
                        style={styles.timelineIcon}
                      />
                    </View>
                    <View style={styles.timelineLinkCopy}>
                      <Text
                        style={[
                          styles.timelineEyebrow,
                          { color: timelinePalette.label },
                        ]}
                      >
                        Auditoría del usuario
                      </Text>
                      <Text
                        style={[
                          styles.timelineTitle,
                          { color: timelinePalette.title },
                        ]}
                      >
                        Línea de tiempo de logs
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.timelineDescription,
                      { color: timelinePalette.description },
                    ]}
                  >
                    Revisa los eventos, ordenados por fecha en una vista cronológica.
                  </Text>
                  <Button
                    mode="contained-tonal"
                    icon="timeline-text-outline"
                    onPress={handleOpenLogsTimeline}
                    style={styles.timelineButton}
                    contentStyle={styles.timelineButtonContent}
                  >
                    Ver línea de tiempo
                  </Button>
                </View>
              </Surface>
            </View>
            {Meteor.user()?.username === "carlosmbinf" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <AdminAssignmentCard
                  item={item}
                  styles={profileStyles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
            {canViewPushDashboard ? (
              <DevicesCard
                userId={item._id}
                parentStyles={profileStyles}
                accentColor={accentColor}
                onOpenDevices={handleOpenPushDevices}
                containerStyle={[styles.cardItem, computedCardWidth]}
              />
            ) : null}
            {item?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <TarjetaDebitoCard
                  item={item}
                  styles={profileStyles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
            {isTablet ? (
              <View style={styles.rowPairFull}>
                <View style={[styles.cardItem, styles.pairItemWidth]}>
                  <ProxyCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </View>
                <View style={[styles.cardItem, styles.pairItemWidth]}>
                  <VpnCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.cardItem, computedCardWidth]}>
                  <ProxyCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </View>
                <View style={[styles.cardItem, computedCardWidth]}>
                  <VpnCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                </View>
              </>
            )}
            <View style={[styles.cardItem, computedCardWidth]}>
              <OptionsCardAdmin
                item={item}
                styles={profileStyles}
                accentColor={accentColor}
              />
            </View>
            {item?._id === currentUserId ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <DeleteAccountCard userId={item._id} username={item.username} />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text variant="titleMedium">
              No se encontró el usuario solicitado.
            </Text>
          </View>
        )}
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  headerTitle: { fontWeight: "700" },
  loadingState: { flex: 1, minHeight: "100%", justifyContent: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  root: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    width: "100%",
  },
  rootTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "flex-start",
    paddingHorizontal: 28,
    paddingTop: 24,
    maxWidth: 1400,
    alignSelf: "center",
  },
  cardItem: { marginBottom: 18, minWidth: 300 },
  element: { fontSize: 12 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: 0, paddingBottom: 5, textAlign: "center" },
  data: { fontSize: 14, fontWeight: "600", lineHeight: 20, paddingVertical: 4 },
  cards: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 0,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  label: {
    position: "absolute",
    backgroundColor: "white",
    left: 22,
    top: 6,
    zIndex: 999,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  placeholderStyle: { fontSize: 14 },
  selectedTextStyle: { fontSize: 14 },
  iconStyle: { width: 20, height: 20 },
  inputSearchStyle: { height: 40, fontSize: 14, borderRadius: 22 },
  rowPairFull: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    marginBottom: 8,
  },
  pairItemWidth: { flexBasis: "48%", maxWidth: "48%", minWidth: 300 },
  timelineLinkCard: {
    overflow: "hidden",
  },
  timelineAccentBar: {
    height: 4,
    width: "100%",
  },
  timelineLinkContent: {
    gap: 14,
    padding: 16,
  },
  timelineLinkHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  timelineIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
  },
  timelineIcon: {
    margin: 0,
  },
  timelineLinkCopy: {
    flex: 1,
    gap: 2,
  },
  timelineEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timelineTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  timelineDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  timelineButton: {
    borderRadius: 14,
  },
  timelineButtonContent: {
    minHeight: 42,
  },
});

export default UserDetails;
