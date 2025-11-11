import React, { Component } from 'react';
import { View, StyleSheet, Alert, ScrollView, Animated, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Badge, IconButton, Surface, withTheme } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

// Sistema de columnas responsive mejorado con orientación
const getColumnsCount = (screenWidth, screenHeight) => {
  const isLandscape = screenWidth > screenHeight;
  
  // Ajuste solicitado: máximo 3 columnas en landscape para evitar cards muy pequeños
  if (screenWidth >= 1200) return isLandscape ? 3 : 3; // Desktop: 3 horizontal, 3 vertical
  if (screenWidth >= 900) return isLandscape ? 3 : 2;   // Tablet grande: 3 horizontal, 2 vertical  
  if (screenWidth >= 600) return isLandscape ? 3 : 2;   // Tablet: 3 horizontal, 2 vertical
  // Teléfono: siempre 1 por fila (portrait y landscape)
  if (screenWidth >= 400) return 1;   // Móvil grande: 1 horizontal, 1 vertical
  return 1; // Móvil pequeño: siempre 1 columna
};

class ProxyPackageCard extends Component {
  state = {
    paquetesDisponibles: [],
    paquetePorTiempo: null, // ✅ NUEVO: Paquete ilimitado
    loading: true,
    megasActuales: 0,
    isIlimitado: false,
    fechaVencimiento: null,
    descuentoProxy: 0,
    // Ancho medido del contenedor para cálculo de grid en píxeles
    containerWidth: Dimensions.get('window').width
  };

  // Animaciones
  fadeAnim = new Animated.Value(0);
  slideAnim = new Animated.Value(50);
  skeletonAnim = new Animated.Value(0);

  componentDidMount() {
    this.setState({ loading: true });
    this.startSkeletonAnimation();
    this.loadUserProxyData();
    this.loadPaquetesDisponibles();
  }

  componentWillUnmount() {
    this.skeletonAnim.stopAnimation();
  }

  startSkeletonAnimation = async () => {
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

  loadUserProxyData = async () => {
    const user = await Meteor.user();
    if (user) {
      this.setState({
        megasActuales: user.megas || 0,
        isIlimitado: user.isIlimitado || false,
        fechaVencimiento: user.fechaSubscripcion,
        descuentoProxy: user.descuentoproxy || 0
      });
    }
  };

  loadPaquetesDisponibles = async () => {
    // ✅ ACTUALIZADO: Cargar ambos tipos de paquetes
    Meteor.call('precios.getAllProxyVPNPackages', 'PROXY', (error, result) => {
      if (error) {
        console.error('Error cargando paquetes Proxy:', error);
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

  // Medir ancho del contenedor para calcular anchos exactos por columna
  handlePackagesLayout = (e) => {
    const { width } = e?.nativeEvent?.layout || {};
    if (width && Math.abs(width - this.state.containerWidth) > 1) {
      this.setState({ containerWidth: width });
    }
  };

  handleComprarPaquete = (paquete, esPorTiempo = false) => {
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
      paquete: {
        ...paquete,
        esPorTiempo // ✅ Pasar flag
      },
      descuentoProxy: this.state.descuentoProxy
    });
  };

  renderSkeleton = () => {
    const { theme } = this.props;
    const opacity = this.skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7]
    });

    return (
      <View
        style={[
          styles.packagesContainer,
          getColumnsCount(Dimensions.get('window').width, Dimensions.get('window').height) > 1 && styles.packagesContainerGrid
        ]}
        onLayout={this.handlePackagesLayout}
      >
        {[1, 2, 3].map((item, index) => {
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
          const columnsCount = getColumnsCount(screenWidth, screenHeight);
          const gutter = 12;
          const containerWidth = this.state.containerWidth || screenWidth;
          const cols = Math.max(1, columnsCount);
          const totalGutter = gutter * (cols - 1);
          const cardWidthPx = Math.floor((containerWidth - totalGutter) / cols);
          const marginRight = (cols > 1 && (index % cols !== cols - 1)) ? gutter : 0;
          const cardHeight = 220;

          return (
            <Animated.View
              key={item}
              style={{ opacity, width: cardWidthPx, height: cardHeight, marginRight, marginBottom: gutter }}
            >
              <Surface 
                style={[
                  styles.skeletonCard,
                  { backgroundColor: theme.colors.surfaceVariant, height: '100%' }
                ]} 
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
          );
        })}
      </View>
    );
  };

  renderPackageCard = (paquete, index) => {
    const { theme } = this.props;
    const animatedStyle = {
      opacity: this.fadeAnim,
      transform: [{ translateY: this.slideAnim }]
    };

    const isRecommended = index === 1;
    const proxyColor = theme.dark ? '#42A5F5' : '#2196F3'; // Azul más claro en modo oscuro

    // Calcular columnas dinámicamente para el dispositivo actual
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const columnsCount = getColumnsCount(screenWidth, screenHeight);
    
    // Altura fija para uniformidad - ajustada según si es recomendado
    const cardHeight = isRecommended ? 220 : 220; // Misma altura para todos
    
    // Cálculo en píxeles basado en el ancho real del contenedor (más confiable que %)
    const gutter = 12; // espacio entre columnas
    const containerWidth = this.state.containerWidth || screenWidth;
    const cols = Math.max(1, columnsCount);
    const totalGutter = gutter * (cols - 1);
    const cardWidthPx = Math.floor((containerWidth - totalGutter) / cols);
    const marginRight = (cols > 1 && (index % cols !== cols - 1)) ? gutter : 0;

    const responsiveCardStyle = {
      width: cardWidthPx,
      height: cardHeight,
      marginRight,
      marginBottom: gutter
    };

    console.log(`📱 Proxy Card ${index}: cols=${cols}, containerWidth=${containerWidth}, cardWidth=${cardWidthPx}, height=${cardHeight}, isRecommended=${isRecommended}`);

    return (
      <Animated.View key={paquete._id} style={[animatedStyle, responsiveCardStyle]}>
        <Surface 
          style={[
            styles.packageCard,
            isRecommended && styles.recommendedCard,
            { height: '100%' } // Asegurar que el Surface llene el contenedor de 220px
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
          
          <View style={[styles.packageContent, !isTablet && styles.packageContentMobile]}>
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton 
                  icon="wifi" 
                  size={isTablet ? 32 : 24} 
                  iconColor={proxyColor}
                  style={styles.packageIcon}
                />
                <Title style={[
                  styles.packageTitle, 
                  isTablet && styles.packageTitleTablet,
                  { color: proxyColor }
                ]}>
                  {megasToGB(paquete.megas)}
                </Title>
              </View>
              <View style={[
                styles.priceContainer,
                { backgroundColor: theme.dark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD' }
              ]}>
                <Paragraph style={[
                  styles.packagePrice, 
                  isTablet && styles.packagePriceTablet,
                  { color: proxyColor }
                ]}>
                  ${paquete.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: proxyColor }]}>
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
                buttonColor={isRecommended ? (theme.dark ? '#1976D2' : '#1565C0') : proxyColor}
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

  // ✅ NUEVO: Renderizar card de paquete ilimitado por tiempo
  renderUnlimitedPackageCard = () => {
    const { paquetePorTiempo } = this.state;
    const { theme } = this.props;
    
    if (!paquetePorTiempo) return null;

    const animatedStyle = {
      opacity: this.fadeAnim,
      transform: [{ translateY: this.slideAnim }]
    };

    const proxyColor = theme.dark ? '#42A5F5' : '#2196F3';
    const goldColor = '#FFD700';

    // Calcular mismo ancho que los cards normales (consistencia de grilla)
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const columnsCount = getColumnsCount(screenWidth, screenHeight);
    const gutter = 12;
    const containerWidth = this.state.containerWidth || screenWidth;
    const cols = Math.max(1, columnsCount);
    const totalGutter = gutter * (cols - 1);
    const baseCardWidthPx = Math.floor((containerWidth - totalGutter) / cols);
    const premiumWidthDelta = 8; // unos píxeles más ancho que los normales
    const cardWidthPx = Math.min(baseCardWidthPx + premiumWidthDelta, containerWidth);

    const unlimitedCardStyle = {
      width: cardWidthPx,
      height: 236, // un poquito más alto que 220
      marginRight: 0, // evitar overflow por delta de ancho
      marginBottom: gutter,
      alignSelf: 'flex-start'
    };

    return (
      <Animated.View style={[animatedStyle, unlimitedCardStyle]}>
        <Surface 
          style={[
            styles.unlimitedCard,
            { height: '100%' }
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
          
          <View style={[styles.packageContent, !isTablet && styles.packageContentMobile]}>
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
                styles.priceContainerShadow,
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
              🚀 Datos ilimitados durante 30 días
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

  render() {
    const { paquetesDisponibles, paquetePorTiempo, loading, megasActuales, isIlimitado, descuentoProxy } = this.state;
    const { theme } = this.props;
    const proxyColor = theme.dark ? '#42A5F5' : '#2196F3';

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
          <View style={[
            styles.cardContent,
            !isTablet && styles.cardContentMobile,
            isLargeTablet && styles.cardContentLargeTablet
          ]}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <IconButton icon="wifi" size={isTablet ? 40 : 32} iconColor={proxyColor} />
                <Title style={[
                  styles.title, 
                  isTablet && styles.titleTablet,
                  { color: proxyColor }
                ]}>
                  Paquetes Proxy
                </Title>
              </View>
              {/* {!!descuentoProxy && descuentoProxy > 0 && (
                <Badge 
                  style={[styles.discountBadge, { backgroundColor: theme.colors.tertiary }]} 
                  size={isTablet ? 28 : 24}
                >
                  -{descuentoProxy}% OFF
                </Badge>
              )} */}
            </View>

            <Paragraph style={[
              styles.subtitle, 
              isTablet && styles.subtitleTablet
            ]}>
              Internet rápido y sin límites 🚀
            </Paragraph>

            <View style={styles.currentStatus}>
              <Chip
                icon={isIlimitado ? 'infinity' : 'database'}
                style={[
                  styles.statusChip, 
                  isTablet && styles.statusChipTablet,
                  { backgroundColor: theme.dark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD' }
                ]}
                textStyle={isTablet && styles.statusChipTextTablet}
              >
                Saldo: {isIlimitado ? 'Ilimitado' : megasToGB(megasActuales)}
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
                    <IconButton icon="package-variant" size={64} iconColor={theme.colors.surfaceDisabled} />
                    <Paragraph style={styles.emptyText}>
                      No hay paquetes disponibles en este momento
                    </Paragraph>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.packagesContainer,
                      getColumnsCount(Dimensions.get('window').width, Dimensions.get('window').height) > 1 && styles.packagesContainerGrid
                    ]}
                    onLayout={this.handlePackagesLayout}
                  >
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
              onPress={() => this.props.navigation.navigate('ProxyVPNHistory')}
              style={[styles.historyButton, isTablet && styles.historyButtonTablet]}
              textColor={proxyColor}
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
    width:"100%",
    height:"100%",
    // margin: 16,
    borderRadius: 12
  },
  cardTablet: {
    margin: 24,
    borderRadius: 16
  },
  cardContent: {
    padding: 16
  },
  cardContentMobile: {
    padding: 8
  },
  cardContentLargeTablet: {
    paddingHorizontal: 32 // Más padding en tablets grandes
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
  packagesContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 8
  },
  packageCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3', // Este color se mantiene como acento
    borderRadius: 12,
    overflow: 'hidden',
    flex: 0, // No flex para mantener ancho fijo
    justifyContent: 'space-between', // Distribuir contenido uniformemente
    backgroundColor: 'transparent'
  },
  recommendedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700' // Borde izquierdo dorado para "MÁS POPULAR"
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
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'space-between' // Distribuir el contenido uniformemente
  },
  packageContentMobile: {
    paddingVertical: 12,
    paddingHorizontal: 12
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
  priceContainerShadow: {
    // Sombra sutil para destacar el precio del Premium
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  packagePriceTablet: {
    fontSize: 20
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
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  // ✅ NUEVOS estilos para card ilimitado
  unlimitedCard: {
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    height: 220 // ✅ Altura fija igual que los cards normales
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

export default withTheme(ProxyPackageCard);
