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
import { Appbar, Surface, Text } from "react-native-paper";

import {
    PreciosCollection,
    VentasCollection,
} from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import DeleteAccountCard from "./componentsUserDetails/DeleteAccountCard";
import OptionsCardAdmin from "./componentsUserDetails/OptionsCardAdmin";
import PersonalDataCard from "./componentsUserDetails/PersonalDataCard";
import ProxyCard from "./componentsUserDetails/ProxyCard";
import SaldoRecargasCard from "./componentsUserDetails/SaldoRecargasCard";
import TarjetaDebitoCard from "./componentsUserDetails/TarjetaDebitoCard";
import UserDataCard from "./componentsUserDetails/UserDataCard";
import VentasCard from "./componentsUserDetails/VentasCard";
import VpnCard from "./componentsUserDetails/VpnCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const UserDetails = () => {
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const routeItemId = Array.isArray(params.item) ? params.item[0] : params.item;
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const itemId = routeItemId || currentUserId || null;
  const [edit, setEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const currentWidth = width;

  const { ready, item, precioslist, preciosVPNlist } = Meteor.useTracker(() => {
    if (!itemId) {
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
      { sort: { type: 1, precio: 1 } },
    );
    const ventasHandle = Meteor.subscribe("ventas", {
      adminId: itemId,
      cobrado: false,
    });
    const userHandle = Meteor.subscribe("user", { _id: itemId });
    const precioslistData = PreciosCollection.find(
      { userId: Meteor.userId(), type: "megas" },
      { fields: { megas: 1, precio: 1 }, sort: { precio: 1 } },
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
      { fields: { type: 1, megas: 1, precio: 1 }, sort: { precio: 1 } },
    )
      .fetch()
      .map((price) => ({
        value: price.megas,
        label: `${price.type} • ${price.megas}MB • $${price.precio >= 0 ? price.precio : 0}`,
      }));
    return {
      ready:
        preciosHandle.ready() && ventasHandle.ready() && userHandle.ready(),
      item: Meteor.users.findOne({ _id: itemId }),
      precioslist: precioslistData,
      preciosVPNlist: preciosVPNData,
    };
  }, [itemId, refreshKey]);

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
    return VentasCollection.find({ adminId: item._id, cobrado: false })
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
    <Surface style={styles.background}>
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
                  styles={styles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
            {Meteor.user()?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <SaldoRecargasCard
                  refreshKey={refreshKey}
                  accentColor={accentColor}
                  styles={styles}
                />
              </View>
            ) : null}
            <View style={[styles.cardItem, computedCardWidth]}>
              <PersonalDataCard item={item} styles={styles} />
            </View>
            <View style={[styles.cardItem, computedCardWidth]}>
              <UserDataCard
                item={item}
                styles={styles}
                edit={edit}
                setEdit={setEdit}
                accentColor={accentColor}
              />
            </View>
            {item?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <TarjetaDebitoCard
                  item={item}
                  styles={styles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
            {isTablet ? (
              <View style={styles.rowPairFull}>
                <View style={[styles.cardItem, styles.pairItemWidth]}>
                  <ProxyCard
                    item={item}
                    styles={styles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </View>
                <View style={[styles.cardItem, styles.pairItemWidth]}>
                  <VpnCard
                    item={item}
                    styles={styles}
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
                    styles={styles}
                    accentColor={accentColor}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                </View>
                <View style={[styles.cardItem, computedCardWidth]}>
                  <VpnCard
                    item={item}
                    styles={styles}
                    accentColor={accentColor}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                </View>
              </>
            )}
            {Meteor.user()?.profile?.role === "admin" ? (
              <View style={[styles.cardItem, computedCardWidth]}>
                <OptionsCardAdmin
                  item={item}
                  styles={styles}
                  accentColor={accentColor}
                />
              </View>
            ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    width: "100%",
  },
  rootTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "flex-start",
    paddingHorizontal: 32,
    paddingTop: 24,
    maxWidth: 1400,
    alignSelf: "center",
  },
  cardItem: { marginBottom: 24, minWidth: 300 },
  element: { fontSize: 12 },
  title: { fontSize: 18, textAlign: "center", paddingBottom: 5 },
  data: { padding: 3 },
  cards: { marginBottom: 20, borderRadius: 20 },
  dropdown: {
    height: 50,
    borderColor: "gray",
    borderWidth: 0.5,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
  label: {
    position: "absolute",
    backgroundColor: "white",
    left: 22,
    top: 8,
    zIndex: 999,
    paddingHorizontal: 8,
    fontSize: 12,
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
});

export default UserDetails;
