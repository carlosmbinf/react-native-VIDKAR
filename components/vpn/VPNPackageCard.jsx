import React, { Component } from 'react';
import { View, StyleSheet, Alert, ScrollView, Animated, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Badge, IconButton, Surface, withTheme } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

class VPNPackageCard extends Component {
  state = {
    paquetesDisponibles: [],
    paquetePorTiempo: null, // ✅ NUEVO: Paquete ilimitado
    loading: true,
    vpnMegasActuales: 0,
    vpnIsIlimitado: false,
    vpnFechaVencimiento: null,
    descuentoVPN: 0
  };

  fadeAnim = new Animated.Value(0);
  slideAnim = new Animated.Value(50);
  skeletonAnim = new Animated.Value(0);

  componentDidMount() {
    this.setState({ loading: true });
    this.startSkeletonAnimation();
    this.loadUserVPNData();
    this.loadPaquetesDisponibles();
  }

  componentWillUnmount() {
    this.skeletonAnim.stopAnimation();
  }

  startSkeletonAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.skeletonAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(this.skeletonAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(this.fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(this.slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  };

  loadUserVPNData = () => {
    const user = Meteor.user();
    if (user) {
      this.setState({
        vpnMegasActuales: user.vpnmegas || 0,
        vpnIsIlimitado: user.vpnisIlimitado || false,
        vpnFechaVencimiento: user.vpnfechaSubscripcion,
        descuentoVPN: parseFloat(user.descuentovpn) || 0
      });
    }
  };

  loadPaquetesDisponibles = () => {
    // ✅ ACTUALIZADO: Cargar ambos tipos de paquetes
    Meteor.call('precios.getAllProxyVPNPackages', 'VPN', (error, result) => {
      if (error) {
        console.error('Error cargando paquetes VPN:', error);
        Alert.alert('Error', 'No se pudieron cargar los paquetes disponibles');
        this.setState({ loading: false });
        return;
      }
      
      const paquetesPorMegas = (result.porMegas || []).sort((a, b) => a.megas - b.megas);
      const paquetePorTiempo = result.porTiempo && result.porTiempo.length > 0 
        ? result.porTiempo[0] 
        : null;

      this.setState({ 
        paquetesDisponibles: paquetesPorMegas,
        paquetePorTiempo: paquetePorTiempo,
        loading: false 
      }, () => {
        this.startEntranceAnimation();
      });
    });
  };

  handleComprarPaquete = (paquete, esPorTiempo = false) => {
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
      paquete: {
        ...paquete,
        esPorTiempo // ✅ Pasar flag
      },
      descuentoVPN: this.state.descuentoVPN
    });
  };

  renderPackageCard = (paquete, index) => {
    const { theme } = this.props;
    const animatedStyle = {
      opacity: this.fadeAnim,
      transform: [{ translateY: this.slideAnim }]
    };

    const isRecommended = index === 1;
    const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50'; // Verde más claro en modo oscuro

    return (
      <Animated.View key={paquete._id} style={[animatedStyle, { marginBottom: 16 }]}>
        <Surface 
          style={[
            styles.packageCard,
            isTablet && styles.packageCardTablet,
            isRecommended && styles.recommendedCard
          ]} 
          elevation={isRecommended ? 4 : 2}
        >
          {isRecommended && (
            <View style={[styles.recommendedBadge, { backgroundColor: theme.colors.tertiary }]}>
              <Paragraph style={[styles.recommendedText]}>
                ⭐ MÁS POPULAR
              </Paragraph>
            </View>
          )}
          
          <View style={styles.packageContent}>
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton 
                  icon="shield-check" 
                  size={isTablet ? 32 : 24} 
                  iconColor={vpnColor}
                  style={styles.packageIcon}
                />
                <Title style={[
                  styles.packageTitle, 
                  isTablet && styles.packageTitleTablet,
                  { color: vpnColor }
                ]}>
                  {megasToGB(paquete.megas)}
                </Title>
              </View>
              <View style={[
                styles.priceContainer,
                { backgroundColor: theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9' }
              ]}>
                <Paragraph style={[
                  styles.packagePrice, 
                  isTablet && styles.packagePriceTablet,
                  { color: vpnColor }
                ]}>
                  ${paquete.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: vpnColor }]}>
                  CUP
                </Paragraph>
              </View>
            </View>
            
            {!!paquete.detalles && (
              <Paragraph style={[
                styles.packageDescription, 
                isTablet && styles.packageDescriptionTablet
              ]}>
                {paquete.detalles}
              </Paragraph>
            )}

            <View style={styles.packageActions}>
              <Button
                mode="contained"
                onPress={() => this.handleComprarPaquete(paquete)}
                icon="cart-plus"
                buttonColor={isRecommended ? (theme.dark ? '#388E3C' : '#2E7D32') : vpnColor}
                textColor="#FFFFFF"
                style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
                labelStyle={[styles.buyButtonLabel, isTablet && styles.buyButtonLabelTablet]}
                contentStyle={styles.buyButtonContent}
              >
                Comprar Ahora
              </Button>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  renderUnlimitedPackageCard = () => {
    const { paquetePorTiempo } = this.state;
    const { theme } = this.props;
    
    if (!paquetePorTiempo) return null;

    const animatedStyle = {
      opacity: this.fadeAnim,
      transform: [{ translateY: this.slideAnim }]
    };

    const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50';
    const goldColor = '#FFD700';

    return (
      <Animated.View style={[animatedStyle, { marginBottom: 24 }]}>
        <Surface 
          style={[
            styles.unlimitedCard,
            isTablet && styles.packageCardTablet
          ]} 
          elevation={5}
        >
          {/* Badge Premium */}
          <View style={[styles.premiumBadge, { backgroundColor: goldColor }]}>
            <IconButton icon="crown" size={16} iconColor="#000" style={{ margin: 0 }} />
            <Paragraph style={[styles.premiumText, { color: '#000' }]}>
              ⭐ PAQUETE PREMIUM ⭐
            </Paragraph>
          </View>
          
          <View style={styles.packageContent}>
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton 
                  icon="infinity" 
                  size={isTablet ? 40 : 32} 
                  iconColor={goldColor}
                  style={styles.packageIcon}
                />
                <Title style={[
                  styles.unlimitedTitle, 
                  isTablet && styles.packageTitleTablet,
                  { color: goldColor }
                ]}>
                  ILIMITADO
                </Title>
              </View>
              <View style={[
                styles.priceContainer,
                { backgroundColor: theme.dark ? 'rgba(255, 215, 0, 0.15)' : '#FFF9E6' }
              ]}>
                <Paragraph style={[
                  styles.packagePrice, 
                  isTablet && styles.packagePriceTablet,
                  { color: goldColor }
                ]}>
                  ${paquetePorTiempo.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: goldColor }]}>
                  CUP
                </Paragraph>
              </View>
            </View>
            
            <Paragraph style={[
              styles.unlimitedDescription,
              isTablet && styles.packageDescriptionTablet
            ]}>
              🔒 Navegación ilimitada y segura durante 30 días
            </Paragraph>

            {!!paquetePorTiempo.detalles && (
              <Paragraph style={[
                styles.packageDescription, 
                isTablet && styles.packageDescriptionTablet
              ]}>
                {paquetePorTiempo.detalles}
              </Paragraph>
            )}

            <View style={styles.packageActions}>
              <Button
                mode="contained"
                onPress={() => this.handleComprarPaquete(paquetePorTiempo, true)}
                icon="lightning-bolt"
                buttonColor={goldColor}
                textColor="#000"
                style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
                labelStyle={[styles.buyButtonLabel, isTablet && styles.buyButtonLabelTablet, { fontWeight: '900' }]}
                contentStyle={styles.buyButtonContent}
              >
                Comprar Premium
              </Button>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  renderSkeleton = () => {
    const { theme } = this.props;
    const opacity = this.skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7]
    });

    return (
      <View style={styles.packagesContainer}>
        {[1, 2, 3].map((item) => (
          <Animated.View key={item} style={{ opacity }}>
            <Surface 
              style={styles.skeletonCard} 
              elevation={1}
            >
              <View style={styles.skeletonHeader}>
                <View style={[styles.skeletonTitle, { backgroundColor: theme.colors.surfaceDisabled }]} />
                <View style={[styles.skeletonPrice, { backgroundColor: theme.colors.surfaceDisabled }]} />
              </View>
              <View style={[styles.skeletonDescription, { backgroundColor: theme.colors.surfaceDisabled }]} />
              <View style={[styles.skeletonButton, { backgroundColor: theme.colors.surfaceDisabled }]} />
            </Surface>
          </Animated.View>
        ))}
      </View>
    );
  };

  render() {
    const { paquetesDisponibles, paquetePorTiempo, loading, vpnMegasActuales, vpnIsIlimitado, descuentoVPN } = this.state;
    const { theme } = this.props;
    const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50';

    return (
      <ScrollView 
        style={[styles.scrollContainer, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* <Surface style={[styles.card, isTablet && styles.cardTablet]} elevation={4}> */}
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <IconButton icon="shield-check" size={isTablet ? 40 : 32} iconColor={vpnColor} />
                <Title style={[
                  styles.title, 
                  isTablet && styles.titleTablet,
                  { color: vpnColor }
                ]}>
                  Paquetes VPN
                </Title>
              </View>
              {!!descuentoVPN && descuentoVPN > 0 && (
                <Badge 
                  style={[styles.discountBadge, { backgroundColor: theme.colors.tertiary }]} 
                  size={isTablet ? 28 : 24}
                >
                  -{descuentoVPN}% OFF
                </Badge>
              )}
            </View>

            <Paragraph style={[
              styles.subtitle, 
              isTablet && styles.subtitleTablet
            ]}>
              Navegación segura y privada 🔒
            </Paragraph>

            <View style={styles.currentStatus}>
              <Chip
                icon={vpnIsIlimitado ? 'infinity' : 'database'}
                style={[
                  styles.statusChip, 
                  isTablet && styles.statusChipTablet,
                  { backgroundColor: theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9' }
                ]}
                textStyle={isTablet && styles.statusChipTextTablet}
              >
                Saldo: {vpnIsIlimitado ? 'Ilimitado' : megasToGB(vpnMegasActuales)}
              </Chip>
            </View>

            {loading ? (
              this.renderSkeleton()
            ) : (
              <>
                {/* ✅ NUEVO: Card de paquete ilimitado primero */}
                {paquetePorTiempo && this.renderUnlimitedPackageCard()}

                {/* Paquetes por megas */}
                {paquetesDisponibles.length === 0 && !paquetePorTiempo ? (
                  <View style={styles.emptyContainer}>
                    <IconButton icon="package-variant-closed" size={64} iconColor={theme.colors.surfaceDisabled} />
                    <Paragraph style={styles.emptyText}>
                      No hay paquetes disponibles en este momento
                    </Paragraph>
                  </View>
                ) : (
                  <View style={[styles.packagesContainer, isTablet && styles.packagesContainerTablet]}>
                    {paquetesDisponibles.map((paquete, index) => 
                      this.renderPackageCard(paquete, index)
                    )}
                  </View>
                )}
              </>
            )}

            <Button
              mode="outlined"
              icon="history"
              onPress={() => this.props.navigation.navigate('VPNHistory')}
              style={[styles.historyButton, isTablet && styles.historyButtonTablet]}
              textColor={vpnColor}
              contentStyle={styles.historyButtonContent}
            >
              Ver Historial de Compras
            </Button>
          </View>
        {/* </Surface> */}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 24
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 40
  },
  card: {
    margin: 16,
    borderRadius: 12
  },
  cardTablet: {
    margin: 24,
    borderRadius: 16
  },
  cardContent: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: -8
  },
  titleTablet: {
    fontSize: 28
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 14
    // ✅ Removido color hardcodeado - Paper maneja automáticamente
  },
  subtitleTablet: {
    fontSize: 16,
    marginBottom: 24
  },
  discountBadge: {
    // backgroundColor dinámico en render
  },
  currentStatus: {
    marginBottom: 24,
    alignItems: 'flex-start',
    maxHeight: 30
  },
  statusChip: {
    // backgroundColor dinámico en render
  },
  statusChipTablet: {
    height: 40
  },
  statusChipTextTablet: {
    fontSize: 16
  },
  packagesContainer: {
    marginVertical: 8
  },
  packagesContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8
  },
  packageCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50', // Color característico VPN
    borderRadius: 12,
    overflow: 'hidden'
  },
  packageCardTablet: {
    width: '48%',
    marginHorizontal: 8
  },
  recommendedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  recommendedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  packageContent: {
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  packageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  packageIcon: {
    margin: 0
  },
  packageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4
  },
  packageTitleTablet: {
    fontSize: 28
  },
  priceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  packagePriceTablet: {
    fontSize: 24
  },
  priceCurrency: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600'
  },
  packageDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
    // ✅ Removido color hardcodeado - Paper maneja automáticamente
  },
  packageDescriptionTablet: {
    fontSize: 15,
    lineHeight: 22
  },
  packageActions: {
    justifyContent: 'center',
    marginTop: 16
  },
  buyButton: {
    borderRadius: 8
  },
  buyButtonTablet: {
    borderRadius: 10
  },
  buyButtonContent: {
    paddingVertical: 6
  },
  buyButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  buyButtonLabelTablet: {
    fontSize: 16
  },
  historyButton: {
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: 8
  },
  historyButtonTablet: {
    marginTop: 32,
    borderRadius: 10
  },
  historyButtonContent: {
    paddingVertical: 4
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16
    // ✅ Removido color hardcodeado - Paper maneja automáticamente
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0'
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  skeletonTitle: {
    width: '40%',
    height: 24,
    borderRadius: 4
  },
  skeletonPrice: {
    width: '25%',
    height: 32,
    borderRadius: 8
  },
  skeletonDescription: {
    width: '80%',
    height: 16,
    borderRadius: 4,
    marginBottom: 16
  },
  skeletonButton: {
    width: '100%',
    height: 40,
    borderRadius: 8
  },
  unlimitedCard: {
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  premiumBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 4
  },
  unlimitedTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 1
  },
  unlimitedDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center'
  }
});

export default withTheme(VPNPackageCard);

