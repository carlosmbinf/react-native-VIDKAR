import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { Title, useTheme } from "react-native-paper";

import ProxyPackageCardItem from "../proxy/ProxyPackageCardItem.native";
import ServiceProgressPill from "../shared/ServiceProgressPill";
import VPNPackageCardItem from "../vpn/VPNPackageCardItem.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const clamp01 = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);

const ProxyVPNPackagesHorizontal = () => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [paqueteProxyTiempo, setPaqueteProxyTiempo] = useState(null);
  const [paqueteVPNTiempo, setPaqueteVPNTiempo] = useState(null);
  const [paquetesProxyMegas, setPaquetesProxyMegas] = useState([]);
  const [paquetesVPNMegas, setPaquetesVPNMegas] = useState([]);
  const flatListProxyRef = useRef(null);
  const flatListVPNRef = useRef(null);

  const { loading: loadingUser, userData } = Meteor.useTracker(() => {
    const handle = Meteor.subscribe(
      "user",
      {},
      {
        fields: {
          baneado: 1,
          descuentoproxy: 1,
          descuentovpn: 1,
          isIlimitado: 1,
          megas: 1,
          megasGastadosinBytes: 1,
          vpn: 1,
          vpnMbGastados: 1,
          vpnmegas: 1,
          vpnisIlimitado: 1,
        },
      },
    );

    const user = Meteor.user();

    return {
      loading: !handle.ready(),
      userData: user
        ? {
            descuentoProxy: user.descuentoproxy || 0,
            descuentoVPN: parseFloat(user.descuentovpn) || 0,
            isIlimitado: user.isIlimitado || false,
            megasActuales: user.megas || 0,
            proxyActivo: user.baneado === false,
            proxyConsumidoBytes: user.megasGastadosinBytes || 0,
            vpnActivo: user.vpn === true,
            vpnConsumidoBytes: user.vpnMbGastados || 0,
            vpnIsIlimitado: user.vpnisIlimitado || false,
            vpnMegasActuales: user.vpnmegas || 0,
          }
        : null,
    };
  }, []);

  useEffect(() => {
    setLoadingPackages(true);

    Meteor.call(
      "precios.getAllProxyVPNPackages",
      "PROXY",
      (proxyError, proxyResult) => {
        if (!proxyError) {
          setPaquetesProxyMegas(
            (proxyResult?.porMegas || []).sort((a, b) => a.megas - b.megas),
          );
          setPaqueteProxyTiempo(
            proxyResult?.porTiempo?.length ? proxyResult.porTiempo[0] : null,
          );
        }

        Meteor.call(
          "precios.getAllProxyVPNPackages",
          "VPN",
          (vpnError, vpnResult) => {
            if (!vpnError) {
              setPaquetesVPNMegas(
                (vpnResult?.porMegas || []).sort((a, b) => a.megas - b.megas),
              );
              setPaqueteVPNTiempo(
                vpnResult?.porTiempo?.length ? vpnResult.porTiempo[0] : null,
              );
            }
            setLoadingPackages(false);
          },
        );
      },
    );
  }, []);

  const handleComprarProxy = (paquete, esPorTiempo = false) => {
    if (!userData) return;
    if (userData.proxyActivo && !userData.isIlimitado) {
      Alert.alert(
        "Paquete Proxy Activo",
        "Ya tienes un paquete Proxy activo. Debes consumirlo antes de comprar otro.",
        [{ style: "cancel", text: "Entendido" }],
      );
      return;
    }

    router.push({
      pathname: "/(normal)/ProxyPurchase",
      params: {
        descuentoProxy: String(userData.descuentoProxy || 0),
        paquete: JSON.stringify({ ...paquete, esPorTiempo }),
      },
    });
  };

  const handleComprarVPN = (paquete, esPorTiempo = false) => {
    if (!userData) return;
    if (userData.vpnActivo && !userData.vpnIsIlimitado) {
      Alert.alert(
        "Paquete VPN Activo",
        "Ya tienes un paquete VPN activo. Debes consumirlo antes de comprar otro.",
        [{ style: "cancel", text: "Entendido" }],
      );
      return;
    }

    router.push({
      pathname: "/(normal)/VPNPurchase",
      params: {
        descuentoVPN: String(userData.descuentoVPN || 0),
        paquete: JSON.stringify({ ...paquete, esPorTiempo }),
      },
    });
  };

  const renderProxySection = () => {
    if (!userData) return null;

    const proxyColor = theme.dark ? "#42A5F5" : "#2196F3";
    const bytesInMb = 1048576;
    const bytesInGb = 1073741824;
    const consumedMb = userData.proxyConsumidoBytes / bytesInMb;
    const consumedGb = userData.proxyConsumidoBytes / bytesInGb;
    const limitMb = Number(userData.megasActuales || 0);
    const porMegas = !userData.isIlimitado && limitMb > 0;
    const progress = porMegas ? clamp01(consumedMb / limitMb) : 0;
    const rightText = userData.proxyActivo
      ? `${consumedGb.toFixed(1)} GB${porMegas ? ` / ${formatGB(limitMb)} GB` : ""}${userData.isIlimitado ? " (∞)" : ""}`
      : "Inactivo";

    const allPackages = [
      ...(paqueteProxyTiempo
        ? [{ ...paqueteProxyTiempo, esPorTiempo: true }]
        : []),
      ...paquetesProxyMegas,
    ];

    if (!allPackages.length) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Title style={[styles.sectionTitle, { color: proxyColor }]}>
              Paquetes Proxy
            </Title>
          </View>
          <View style={styles.progressWrapper}>
            <ServiceProgressPill
              label="PROXY"
              ratio={userData.proxyActivo && porMegas ? progress : 0}
              rightText={rightText}
              palette={{ ok: "#1565C0" }}
              width={Math.min(230, width - 48)}
            />
          </View>
        </View>

        <FlatList
          ref={flatListProxyRef}
          data={allPackages}
          renderItem={({ index, item }) => (
            <ProxyPackageCardItem
              paquete={item}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => handleComprarProxy(item, item.esPorTiempo)}
              isHorizontal={true}
              theme={theme}
            />
          )}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item._id || `proxy-${index}`}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
    );
  };

  const renderVPNSection = () => {
    if (!userData) return null;

    const vpnColor = theme.dark ? "#66BB6A" : "#4CAF50";
    const bytesInMb = 1048576;
    const bytesInGb = 1073741824;
    const consumedMb = userData.vpnConsumidoBytes / bytesInMb;
    const consumedGb = userData.vpnConsumidoBytes / bytesInGb;
    const limitMb = Number(userData.vpnMegasActuales || 0);
    const porMegas = !userData.vpnIsIlimitado && limitMb > 0;
    const progress = porMegas ? clamp01(consumedMb / limitMb) : 0;
    const rightText = userData.vpnActivo
      ? `${consumedGb.toFixed(1)} GB${porMegas ? ` / ${formatGB(limitMb)} GB` : ""}${userData.vpnIsIlimitado ? " (∞)" : ""}`
      : "Inactivo";

    const allPackages = [
      ...(paqueteVPNTiempo ? [{ ...paqueteVPNTiempo, esPorTiempo: true }] : []),
      ...paquetesVPNMegas,
    ];

    if (!allPackages.length) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Title style={[styles.sectionTitle, { color: vpnColor }]}>
              Paquetes VPN
            </Title>
          </View>
          <View style={styles.progressWrapper}>
            <ServiceProgressPill
              label="VPN"
              ratio={userData.vpnActivo && porMegas ? progress : 0}
              rightText={rightText}
              palette={{ ok: "#2E7D32" }}
              width={Math.min(230, width - 48)}
            />
          </View>
        </View>

        <FlatList
          ref={flatListVPNRef}
          data={allPackages}
          renderItem={({ index, item }) => (
            <VPNPackageCardItem
              paquete={item}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => handleComprarVPN(item, item.esPorTiempo)}
              isHorizontal={true}
              theme={theme}
            />
          )}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item._id || `vpn-${index}`}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
    );
  };

  if (loadingUser || loadingPackages || !userData) {
    return null;
  }

  return (
    <View style={styles.container}>
      {renderProxySection()}
      {renderVPNSection()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  flatListContent: {
    paddingBottom: 14,
    paddingTop: 8,
  },
  pillChip: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  pillChipText: {
    color: "black",
    fontSize: 10,
    fontWeight: "700",
  },
  pillContainer: {
    borderColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    overflow: "hidden",
  },
  progressWrapper: {
    minWidth: 180,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sectionTitleContainer: {
    flex: 1,
  },
});

export default ProxyVPNPackagesHorizontal;
