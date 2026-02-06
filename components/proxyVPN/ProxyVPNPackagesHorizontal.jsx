import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, FlatList, Dimensions, Platform, Text } from 'react-native';
import { Title, IconButton, withTheme, Chip } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';
import ProxyPackageCardItem from '../proxy/ProxyPackageCardItem';
import VPNPackageCardItem from '../vpn/VPNPackageCardItem';

const { width } = Dimensions.get('window');

// Helper functions para ServiceProgressPill
const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);

const getUsageTone = (ratio01, { ok, warn, danger } = {}) => {
  const r = clamp01(ratio01);
  if (r >= 0.8) return { fill: danger || '#D32F2F', track: '#FFEBEE' };
  if (r >= 0.6) return { fill: warn || '#EF6C00', track: '#FFF3E0' };
  return { fill: ok || '#2E7D32', track: '#E8F5E9' };
};

const ServiceProgressPill = ({
  label,
  icon,
  ratio,
  rightText,
  height = 32,
  palette,
  width,
}) => {
  const safeRatio = clamp01(ratio);
  const tone = getUsageTone(safeRatio, palette);

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: tone.track,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        width,
      }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${safeRatio * 100}%`,
          backgroundColor: tone.fill,
          opacity: 0.22,
        }}
      />
      <View
        style={{
          flex: 1,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
        <Chip
          mode="outlined"
          compact
          // icon={icon}
          style={{
            backgroundColor: 'transparent',
            borderWidth: 0,
          }}
          textStyle={{ fontSize: 10, fontWeight: '700', color:'black' }}>
          {label}
        </Chip>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'right',
            fontSize: 11,
            opacity: 0.85,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          }}>
          {rightText}
        </Text>
      </View>
    </View>
  );
};

const ProxyVPNPackagesHorizontal = ({ navigation, theme }) => {
  const [paquetesProxyMegas, setPaquetesProxyMegas] = useState([]);
  const [paquetesVPNMegas, setPaquetesVPNMegas] = useState([]);
  const [paqueteProxyTiempo, setPaqueteProxyTiempo] = useState(null);
  const [paqueteVPNTiempo, setPaqueteVPNTiempo] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const flatListProxyRef = useRef(null);
  const flatListVPNRef = useRef(null);

  // Suscripción reactiva al usuario (similar a UsersHome)
  const { userData, loading: loadingUser } = useTracker(() => {
    const handle = Meteor.subscribe('user', {}, {
      fields: {
        megas: 1,
        vpnmegas: 1,
        isIlimitado: 1,
        vpnisIlimitado: 1,
        descuentoproxy: 1,
        descuentovpn: 1,
        megasGastadosinBytes: 1,
        vpnMbGastados: 1,
        baneado: 1,
        vpn: 1,
      },
    });

    const user = Meteor.user();

    return {
      userData: user
        ? {
            megasActuales: user.megas || 0,
            vpnMegasActuales: user.vpnmegas || 0,
            isIlimitado: user.isIlimitado || false,
            vpnIsIlimitado: user.vpnisIlimitado || false,
            descuentoProxy: user.descuentoproxy || 0,
            descuentoVPN: parseFloat(user.descuentovpn) || 0,
            proxyConsumidoBytes: user.megasGastadosinBytes || 0,
            vpnConsumidoBytes: user.vpnMbGastados || 0,
            proxyActivo: user.baneado === false,
            vpnActivo: user.vpn === true,
          }
        : null,
      loading: !handle.ready(),
    };
  });

  // Cargar paquetes disponibles (solo al montar)
  useEffect(() => {
    setLoadingPackages(true);

    Meteor.call('precios.getAllProxyVPNPackages', 'PROXY', (error, resultProxy) => {
      if (error) {
        console.error('Error cargando paquetes Proxy:', error);
      } else {
        setPaquetesProxyMegas((resultProxy.porMegas || []).sort((a, b) => a.megas - b.megas));
        setPaqueteProxyTiempo(
          resultProxy.porTiempo && resultProxy.porTiempo.length > 0
            ? resultProxy.porTiempo[0]
            : null
        );
      }

      Meteor.call('precios.getAllProxyVPNPackages', 'VPN', (errorVPN, resultVPN) => {
        if (errorVPN) {
          console.error('Error cargando paquetes VPN:', errorVPN);
        } else {
          setPaquetesVPNMegas((resultVPN.porMegas || []).sort((a, b) => a.megas - b.megas));
          setPaqueteVPNTiempo(
            resultVPN.porTiempo && resultVPN.porTiempo.length > 0
              ? resultVPN.porTiempo[0]
              : null
          );
        }
        setLoadingPackages(false);
      });
    });
  }, []);

  const handleComprarProxy = (paquete, esPorTiempo = false) => {
    if (!userData) return;
    const { isIlimitado, proxyActivo } = userData;

    if (proxyActivo && !isIlimitado) {
      Alert.alert(
        'Paquete Proxy Activo',
        'Ya tienes un paquete Proxy activo. Debes consumirlo antes de comprar otro.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    navigation.navigate('ProxyPurchase', {
      paquete: { ...paquete, esPorTiempo },
      descuentoProxy: userData.descuentoProxy,
    });
  };

  const handleComprarVPN = (paquete, esPorTiempo = false) => {
    if (!userData) return;
    const { vpnIsIlimitado, vpnActivo } = userData;

    if (vpnActivo && !vpnIsIlimitado) {
      Alert.alert(
        'Paquete VPN Activo',
        'Ya tienes un paquete VPN activo. Debes consumirlo antes de comprar otro.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    navigation.navigate('VPNPurchase', {
      paquete: { ...paquete, esPorTiempo },
      descuentoVPN: userData.descuentoVPN,
    });
  };

  const renderProxySection = () => {
    if (!userData) return null;

    const {
      megasActuales,
      isIlimitado,
      proxyConsumidoBytes,
      proxyActivo,
    } = userData;

    const proxyColor = theme.dark ? '#42A5F5' : '#2196F3';
    const BYTES_IN_MB_BINARY = 1048576;
    const BYTES_IN_GB_BINARY = 1073741824;

    const proxyConsumidoMB = proxyConsumidoBytes / BYTES_IN_MB_BINARY;
    const proxyConsumidoGB = proxyConsumidoBytes / BYTES_IN_GB_BINARY;
    const proxyLimiteMB = Number(megasActuales || 0);
    const proxyPorMegas = !isIlimitado && proxyLimiteMB > 0;
    const proxyProgress = proxyPorMegas ? clamp01(proxyConsumidoMB / proxyLimiteMB) : 0;

    const proxyRightText = proxyActivo
      ? `${proxyConsumidoGB.toFixed(1)} GB${proxyPorMegas ? ` / ${formatGB(proxyLimiteMB)} GB` : ''}${isIlimitado ? ' (∞)' : ''}`
      : 'Inactivo';

    const allProxyPackages = [
      ...(paqueteProxyTiempo ? [{ ...paqueteProxyTiempo, esPorTiempo: true }] : []),
      ...paquetesProxyMegas,
    ];

    if (allProxyPackages.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Title style={[styles.sectionTitle, { color: proxyColor }]}>
              Paquetes Proxy
            </Title>
          </View>
          <View style={{ minWidth: 180 }}>
            <ServiceProgressPill
              label="PROXY"
              icon={proxyActivo ? 'wifi-check' : 'wifi-off'}
              ratio={proxyActivo && proxyPorMegas ? proxyProgress : 0}
              rightText={proxyRightText}
              palette={{ ok: '#1565C0' }}
              width={230}
            />
          </View>
        </View>

        <FlatList
          ref={flatListProxyRef}
          data={allProxyPackages}
          renderItem={({ item, index }) => (
            <ProxyPackageCardItem
              paquete={item}
              index={index}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => handleComprarProxy(item, item.esPorTiempo)}
              isHorizontal={true}
            />
          )}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item._id || `proxy-${index}`}
          contentContainerStyle={styles.flatListContent}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
        />
      </View>
    );
  };

  const renderVPNSection = () => {
    if (!userData) return null;

    const {
      vpnMegasActuales,
      vpnIsIlimitado,
      vpnConsumidoBytes,
      vpnActivo,
    } = userData;

    const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50';
    const BYTES_IN_MB_BINARY = 1048576;
    const BYTES_IN_GB_BINARY = 1073741824;

    const vpnConsumidoMB = vpnConsumidoBytes / BYTES_IN_MB_BINARY;
    const vpnConsumidoGB = vpnConsumidoBytes / BYTES_IN_GB_BINARY;
    const vpnLimiteMB = Number(vpnMegasActuales || 0);
    const vpnPorMegas = !vpnIsIlimitado && vpnLimiteMB > 0;
    const vpnProgress = vpnPorMegas ? clamp01(vpnConsumidoMB / vpnLimiteMB) : 0;

    const vpnRightText = vpnActivo
      ? `${vpnConsumidoGB.toFixed(1)} GB${vpnPorMegas ? ` / ${formatGB(vpnLimiteMB)} GB` : ''}${vpnIsIlimitado ? ' (∞)' : ''}`
      : 'Inactivo';

    const allVPNPackages = [
      ...(paqueteVPNTiempo ? [{ ...paqueteVPNTiempo, esPorTiempo: true }] : []),
      ...paquetesVPNMegas,
    ];

    if (allVPNPackages.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Title style={[styles.sectionTitle, { color: vpnColor }]}>
              Paquetes VPN
            </Title>
          </View>
          <View style={{ minWidth: 180 }}>
            <ServiceProgressPill
              label="VPN"
              icon={vpnActivo ? 'shield-check' : 'shield-off'}
              ratio={vpnActivo && vpnPorMegas ? vpnProgress : 0}
              rightText={vpnRightText}
              palette={{ ok: '#2E7D32' }}
              width={230}
            />
          </View>
        </View>

        <FlatList
          ref={flatListVPNRef}
          data={allVPNPackages}
          renderItem={({ item, index }) => (
            <VPNPackageCardItem
              paquete={item}
              index={index}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => handleComprarVPN(item, item.esPorTiempo)}
              isHorizontal={true}
            />
          )}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item._id || `vpn-${index}`}
          contentContainerStyle={styles.flatListContent}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
        />
      </View>
    );
  };

  if (loadingUser || loadingPackages) {
    return <></>;
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
    flex: 1,
    paddingVertical: 16,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: -8,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
});

export default withTheme(ProxyVPNPackagesHorizontal);
