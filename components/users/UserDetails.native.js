import MeteorBase from "@meteorrn/core";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
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
import { EMPRESA_BRAND } from "../empresa/styles/empresaTheme";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { ServiceAtmosphere, ServiceEntrance, ServiceMotionProvider, ServiceScrollViewport } from "../motion/ServiceMotion";
import McpSettingsLinkCard from "./componentsUserDetails/McpSettingsLinkCard.native";
import WelcomeServicesLinkCard from "./componentsUserDetails/WelcomeServicesLinkCard.native";
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
import { NestableScrollContainer } from "react-native-draggable-flatlist";

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
  emails: 1,
  empresaBloqueada: 1,
  empresaTerminosCondicionesAcepted: 1,
  fechaSubscripcion: 1,
  fechaEmpresaTerminosCondicionesAcepted: 1,
  isIlimitado: 1,
  megas: 1,
  megasGastadosinBytes: 1,
  modoEmpresa: 1,
  permitirAprobacionEfectivoCUP: 1,
  permitirPagoEfectivoCUP: 1,
  permiteEmpresa: 1,
  permiteRemesas: 1,
  passvpn: 1,
  picture: 1,
  profile: 1,
  saldoRecargas: 1,
  "services.google.email": 1,
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
  vpnip: 1,
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

const ProfileEntrance = ({ children, enabled, style, delay, variant }) =>
  enabled ? (
    <ServiceEntrance delay={delay} style={style} variant={variant}>{children}</ServiceEntrance>
  ) : (
    <View style={style}>{children}</View>
  );

const SectionHeading = ({ title, subtitle, palette, motionEnabled, delay }) => (
  <ProfileEntrance enabled={motionEnabled} delay={delay} style={styles.sectionHeading}>
    <View style={[styles.sectionIndicatorWrap, { backgroundColor: palette.cardAlt }]}>
      <View style={[styles.sectionDot, { backgroundColor: palette.accent }]} />
    </View>
    <View style={styles.sectionCopy}>
      <Text style={[styles.sectionTitle, { color: palette.title }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: palette.label }]}>{subtitle}</Text>
    </View>
  </ProfileEntrance>
);

const UserDetails = () => {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const motionEnabled = !theme.empresaAppearance && !pathname?.startsWith("/(empresa)");
  const routeItemId = Array.isArray(params.item) ? params.item[0] : params.item;
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const currentUser = Meteor.useTracker(() => Meteor.user());
  const isAdminUser =
    currentUser?.profile?.role === "admin" ||
    String(currentUser?.username || "").toLowerCase() === "carlosmbinf";
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
    () => theme.empresaAppearance ? {
      border: theme.colors.outlineVariant, card: theme.colors.surface,
      cardAlt: theme.colors.surfaceVariant, dropdown: theme.colors.surface,
      dropdownBorder: theme.colors.outline, label: theme.colors.onSurfaceVariant,
      screen: theme.colors.background, text: theme.colors.onSurfaceVariant, title: theme.colors.onSurface,
    } : ({
      border: theme.dark
        ? "rgba(148, 163, 184, 0.14)"
        : "rgba(15, 23, 42, 0.08)",
      card: theme.dark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
      cardAlt: theme.dark
        ? "rgba(30, 41, 59, 0.72)"
        : "rgba(248, 250, 252, 0.94)",
      dropdown: theme.dark ? "rgba(15, 23, 42, 0.92)" : "#ffffff",
      dropdownBorder: theme.dark
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(15, 23, 42, 0.14)",
      label: theme.dark ? "#94a3b8" : "#64748b",
      screen: theme.dark ? "#020617" : "#eef3fb",
      text: theme.dark ? "#cbd5e1" : "#334155",
      title: theme.dark ? "#f8fafc" : "#0f172a",
    }),
    [theme],
  );
  const profileStyles = useMemo(
    () => ({
      ...styles,
      cards: [
        styles.cards,
        {
          backgroundColor: profilePalette.card,
          borderColor: profilePalette.border,
          boxShadow: theme.dark
            ? "0px 8px 22px rgba(0, 0, 0, 0.38)"
            : "0px 8px 20px rgba(35, 51, 86, 0.16)",
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
      placeholderStyle: [
        styles.placeholderStyle,
        { color: profilePalette.label },
      ],
      selectedTextStyle: [
        styles.selectedTextStyle,
        { color: profilePalette.title },
      ],
      title: [styles.title, { color: profilePalette.title }],
    }),
    [profilePalette, theme.dark],
  );
  const timelinePalette = useMemo(
    () => theme.empresaAppearance ? {
      description: theme.colors.onSurfaceVariant, icon: theme.colors.primary,
      iconSurface: theme.colors.primaryContainer, label: theme.colors.onSurfaceVariant,
      surface: theme.colors.surface, title: theme.colors.onSurface,
    } : ({
      description: theme.dark ? "#cbd5e1" : "#64748b",
      icon: theme.dark ? "#dbeafe" : "#1d4ed8",
      iconSurface: theme.dark
        ? "rgba(59, 130, 246, 0.22)"
        : "rgba(37, 99, 235, 0.12)",
      label: theme.dark ? "#93c5fd" : "#64748b",
      surface: theme.dark ? "rgba(15, 23, 42, 0.96)" : theme.colors.surface,
      title: theme.dark ? "#f8fafc" : "#0f172a",
    }),
    [theme],
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
    const userHandle = Meteor.subscribe(
      "user",
      { _id: itemId },
      {
        fields: USER_DETAIL_FIELDS,
      },
    );
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
  const headerTitle = useMemo(() => {
    const resolvedUser =
      item || (itemId === currentUserId ? currentUser : null);
    const firstName = String(resolvedUser?.profile?.firstName || "").trim();
    const username = String(resolvedUser?.username || "").trim();

    return firstName || username || "Usuario";
  }, [currentUser, currentUserId, item, itemId]);

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
  const headerBackgroundColor = pathname?.startsWith("/(empresa)")
    ? EMPRESA_BRAND
    : undefined;

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

  const handleOpenWelcomeServices = () => {
    if (!item?._id) return;
    const servicesRoute = pathname?.startsWith("/(empresa)")
      ? "/(empresa)/UserServices"
      : "/(normal)/UserServices";
    router.push({ pathname: servicesRoute, params: { item: item._id } });
  };

  const handleOpenMcpSettings = () => {
    const mcpRoute = pathname?.startsWith("/(empresa)")
      ? "/(empresa)/MCPSettings"
      : "/(normal)/MCPSettings";
    router.push(mcpRoute);
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
    <ServiceMotionProvider>
    <Surface
      style={[styles.background, { backgroundColor: profilePalette.screen }]}
    >
      <AppHeader
        title={headerTitle}
        subtitle={item ? "Detalle y configuración" : "Cargando detalle"}
        backgroundColor={headerBackgroundColor}
        left={<Appbar.BackAction iconColor="#fff" onPress={handleBack} />}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        overlapContent
      />
      <ServiceScrollViewport topInset={headerInset}>
      <NestableScrollContainer
        contentContainerStyle={{
          paddingTop: headerInset + 12,
          paddingBottom: 24,
        }}
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
            <SectionHeading title="Resumen de la cuenta" subtitle="Identidad, acceso y actividad" palette={{ ...profilePalette, accent: accentColor }} motionEnabled={motionEnabled} delay={0} />
            <ProfileEntrance enabled={motionEnabled} delay={50} variant="hero" style={[styles.cardItem, computedCardWidth]}>
              <PersonalDataCard item={item} styles={profileStyles} />
            </ProfileEntrance>
            <ProfileEntrance enabled={motionEnabled} delay={100} style={[styles.cardItem, computedCardWidth]}>
              <UserDataCard
                item={item}
                styles={profileStyles}
                edit={edit}
                setEdit={setEdit}
                accentColor={accentColor}
              />
            </ProfileEntrance>
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
            <SectionHeading title="Herramientas y actividad" subtitle="Configuración y seguimiento del usuario" palette={{ ...profilePalette, accent: accentColor }} motionEnabled={motionEnabled} delay={150} />
            {isAdminUser ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <WelcomeServicesLinkCard
                  accentColor={accentColor}
                  item={item}
                  onPress={handleOpenWelcomeServices}
                  styles={profileStyles}
                />
              </View>
            ) : null}
            {isAdminUser && item?._id === currentUserId ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <McpSettingsLinkCard
                  accentColor={accentColor}
                  onPress={handleOpenMcpSettings}
                  styles={profileStyles}
                />
              </View>
            ) : null}
            <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, computedCardWidth]}>
              <Surface
                elevation={0}
                style={[
                  profileStyles.cards,
                  styles.timelineLinkCard,
                  { backgroundColor: timelinePalette.surface, borderColor: profilePalette.border },
                ]}
                testID="user-logs-timeline-card"
              >
                {motionEnabled ? <ServiceAtmosphere color={accentColor} /> : null}
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
                        size={24}
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
                    Revisa los eventos y accesos, ordenados por fecha en una vista cronológica.
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
            </ProfileEntrance>
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
            <SectionHeading title="Conectividad" subtitle="Planes, consumo y configuración" palette={{ ...profilePalette, accent: accentColor }} motionEnabled={motionEnabled} delay={200} />
            {isTablet ? (
              <View style={styles.rowPairFull}>
                <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, styles.pairItemWidth]}>
                  <ProxyCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </ProfileEntrance>
                <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, styles.pairItemWidth]}>
                  <VpnCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                </ProfileEntrance>
              </View>
            ) : (
              <>
                <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, computedCardWidth]}>
                  <ProxyCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </ProfileEntrance>
                <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, computedCardWidth]}>
                  <VpnCard
                    item={item}
                    styles={profileStyles}
                    accentColor={accentColor}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                </ProfileEntrance>
              </>
            )}
            <SectionHeading title="Administración" subtitle="Opciones disponibles para esta cuenta" palette={{ ...profilePalette, accent: accentColor }} motionEnabled={motionEnabled} delay={250} />
            <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, computedCardWidth]}>
              <OptionsCardAdmin
                item={item}
                styles={profileStyles}
                accentColor={accentColor}
              />
            </ProfileEntrance>
            {item?._id === currentUserId ? (
              <ProfileEntrance enabled={motionEnabled} style={[styles.cardItem, computedCardWidth]}>
                <DeleteAccountCard userId={item._id} username={item.username} />
              </ProfileEntrance>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text variant="titleMedium">
              No se encontró el usuario solicitado.
            </Text>
          </View>
        )}
      </NestableScrollContainer>
      </ServiceScrollViewport>
    </Surface>
    </ServiceMotionProvider>
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
    paddingTop: 4,
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
  cardItem: { marginBottom: 18, minWidth: 0 },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    marginTop: 22,
    width: "100%",
  },
  sectionIndicatorWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sectionDot: {
    borderRadius: 3,
    height: 16,
    width: 4,
  },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 13, lineHeight: 18 },
  element: { fontSize: 12 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    paddingBottom: 5,
    textAlign: "center",
  },
  data: { fontSize: 14, fontWeight: "600", lineHeight: 20, paddingVertical: 4 },
  cards: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 0,
    overflow: "hidden",
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
    borderWidth: 1,
    overflow: "hidden",
  },
  timelineLinkContent: {
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  timelineLinkHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  timelineIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 46,
    justifyContent: "center",
    width: 46,
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
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  timelineDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  timelineButton: {
    borderRadius: 14,
  },
  timelineButtonContent: {
    minHeight: 44,
  },
});

export default UserDetails;
