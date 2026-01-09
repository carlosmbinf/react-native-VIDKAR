import React, { Component } from 'react';
import { View, StyleSheet, Alert, FlatList, Dimensions } from 'react-native';
import { Title, Paragraph, Chip, IconButton, ActivityIndicator, Surface, withTheme, Text } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';
import ProxyPackageCardItem from '../proxy/ProxyPackageCardItem';
import VPNPackageCardItem from '../vpn/VPNPackageCardItem';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

class ProxyVPNPackagesHorizontal extends Component {
  state = {
    paquetesProxyMegas: [],
    paquetesVPNMegas: [],
    paqueteProxyTiempo: null,
    paqueteVPNTiempo: null,
    loading: true,
    megasActuales: 0,
    vpnMegasActuales: 0,
    isIlimitado: false,
    vpnIsIlimitado: false,
    descuentoProxy: 0,
    descuentoVPN: 0
  };

  flatListProxyRef = React.createRef();
  flatListVPNRef = React.createRef();

  componentDidMount() {
    this.loadUserData();
    this.loadAllPackages();
  }

  loadUserData = async () => {
    const user = await Meteor.user();
    if (user) {
      this.setState({
        megasActuales: user.megas || 0,
        vpnMegasActuales: user.vpnmegas || 0,
        isIlimitado: user.isIlimitado || false,
        vpnIsIlimitado: user.vpnisIlimitado || false,
        descuentoProxy: user.descuentoproxy || 0,
        descuentoVPN: parseFloat(user.descuentovpn) || 0
      });
    }
  };

  loadAllPackages = async () => {
    this.setState({ loading: true });

    // Cargar paquetes Proxy
    Meteor.call('precios.getAllProxyVPNPackages', 'PROXY', (error, resultProxy) => {
      if (error) {
        console.error('Error cargando paquetes Proxy:', error);
      } else {
        this.setState({
          paquetesProxyMegas: (resultProxy.porMegas || []).sort((a, b) => a.megas - b.megas),
          paqueteProxyTiempo: resultProxy.porTiempo && resultProxy.porTiempo.length > 0 
            ? resultProxy.porTiempo[0] 
            : null
        });
      }

      // Cargar paquetes VPN
      Meteor.call('precios.getAllProxyVPNPackages', 'VPN', (errorVPN, resultVPN) => {
        if (errorVPN) {
          console.error('Error cargando paquetes VPN:', errorVPN);
        } else {
          this.setState({
            paquetesVPNMegas: (resultVPN.porMegas || []).sort((a, b) => a.megas - b.megas),
            paqueteVPNTiempo: resultVPN.porTiempo && resultVPN.porTiempo.length > 0 
              ? resultVPN.porTiempo[0] 
              : null
          });
        }
        this.setState({ loading: false });
      });
    });
  };

  handleComprarProxy = (paquete, esPorTiempo = false) => {
    const { isIlimitado } = this.state;
    const user = Meteor.user();
    
    if (user?.baneado === false && !isIlimitado) {
      Alert.alert(
        'Paquete Proxy Activo',
        'Ya tienes un paquete Proxy activo. Debes consumirlo antes de comprar otro.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    this.props.navigation.navigate('ProxyPurchase', {
      paquete: { ...paquete, esPorTiempo },
      descuentoProxy: this.state.descuentoProxy
    });
  };

  handleComprarVPN = (paquete, esPorTiempo = false) => {
    const { vpnIsIlimitado } = this.state;
    const user = Meteor.user();
    
    if (user?.vpn === true && !vpnIsIlimitado) {
      Alert.alert(
        'Paquete VPN Activo',
        'Ya tienes un paquete VPN activo. Debes consumirlo antes de comprar otro.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    this.props.navigation.navigate('VPNPurchase', {
      paquete: { ...paquete, esPorTiempo },
      descuentoVPN: this.state.descuentoVPN
    });
  };

  renderProxySection = () => {
    const { paquetesProxyMegas, paqueteProxyTiempo, megasActuales, isIlimitado } = this.state;
    const { theme } = this.props;
    const proxyColor = theme.dark ? '#42A5F5' : '#2196F3';

    // Combinar paquetes: ilimitado primero, luego por megas
    const allProxyPackages = [
      ...(paqueteProxyTiempo ? [{ ...paqueteProxyTiempo, esPorTiempo: true }] : []),
      ...paquetesProxyMegas
    ];

    if (allProxyPackages.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <IconButton icon="wifi" size={28} iconColor={proxyColor} style={{ margin: 0 }} />
            <Title style={[styles.sectionTitle, { color: proxyColor }]}>
              Paquetes Proxy
            </Title>
          </View>
          <Chip
            icon={isIlimitado ? 'infinity' : 'database'}
            style={[
              styles.statusChip,
              { backgroundColor: theme.dark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD' }
            ]}
          >
            {isIlimitado ? 'Ilimitado' : megasToGB(megasActuales)}
          </Chip>
        </View>

        <FlatList
          ref={this.flatListProxyRef}
          data={allProxyPackages}
          renderItem={({ item, index }) => (
            <ProxyPackageCardItem
              paquete={item}
              index={index}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => this.handleComprarProxy(item, item.esPorTiempo)}
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

  renderVPNSection = () => {
    const { paquetesVPNMegas, paqueteVPNTiempo, vpnMegasActuales, vpnIsIlimitado } = this.state;
    const { theme } = this.props;
    const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50';

    const allVPNPackages = [
      ...(paqueteVPNTiempo ? [{ ...paqueteVPNTiempo, esPorTiempo: true }] : []),
      ...paquetesVPNMegas
    ];

    if (allVPNPackages.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <IconButton icon="shield-check" size={28} iconColor={vpnColor} style={{ margin: 0 }} />
            <Title style={[styles.sectionTitle, { color: vpnColor }]}>
              Paquetes VPN
            </Title>
          </View>
          <Chip
            icon={vpnIsIlimitado ? 'infinity' : 'database'}
            style={[
              styles.statusChip,
              { backgroundColor: theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9' }
            ]}
          >
            {vpnIsIlimitado ? 'Ilimitado' : megasToGB(vpnMegasActuales)}
          </Chip>
        </View>

        <FlatList
          ref={this.flatListVPNRef}
          data={allVPNPackages}
          renderItem={({ item, index }) => (
            <VPNPackageCardItem
              paquete={item}
              index={index}
              isRecommended={index === 2 && !item.esPorTiempo}
              onPress={() => this.handleComprarVPN(item, item.esPorTiempo)}
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

  render() {
    const { loading } = this.state;
    const { theme } = this.props;

    if (loading) {
      return (
        <></>
      );
    }

    return (
      <View
        elevation={0}
        style={[
          styles.container,
          // { backgroundColor: theme?.colors?.background },
        ]}
      >
        {this.renderProxySection()}
        {this.renderVPNSection()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16
  },
  sectionContainer: {
    marginBottom: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: -8
  },
  statusChip: {
    // backgroundColor dinámico en render
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default withTheme(ProxyVPNPackagesHorizontal);
