import React, { Component } from 'react';
import { View, StyleSheet, Alert, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Badge, IconButton } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default class ProxyPackageCard extends Component {
  state = {
    paquetesDisponibles: [],
    loading: true,
    megasActuales: 0,
    isIlimitado: false,
    fechaVencimiento: null,
    descuentoProxy: 0
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

  loadUserProxyData =async () => {
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
   await Meteor.call('precios.getByType', 'megas', (error, result) => {
      if (error) {
        console.error('Error cargando paquetes Proxy:', error);
        Alert.alert('Error', 'No se pudieron cargar los paquetes disponibles');
        this.setState({ loading: false });
        return;
      }
      
      const paquetes = (result || []).sort((a, b) => a.megas - b.megas);
      this.setState({ paquetesDisponibles: paquetes, loading: false }, () => {
        this.startEntranceAnimation();
      });
    });
  };

  handleComprarPaquete = (paquete) => {
    const { isIlimitado } = this.state;
    const user = Meteor.user();
    
    // ✅ CORRECCIÓN: La validación correcta es verificar user.baneado === false
    // baneado = false significa que tiene un paquete Proxy activo
    if (user?.baneado === false && !isIlimitado) {
      Alert.alert(
        'Paquete Proxy Activo',
        'Ya tienes un paquete Proxy activo. Debes consumirlo antes de comprar otro.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    this.props.navigation.navigate('ProxyPurchase', {
      paquete,
      descuentoProxy: this.state.descuentoProxy
    });
  };

  renderSkeleton = () => {
    const opacity = this.skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7]
    });

    return (
      <View style={styles.packagesContainer}>
        {[1, 2, 3].map((item) => (
          <Animated.View key={item} style={[styles.skeletonCard, { opacity }]}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonPrice} />
            </View>
            <View style={styles.skeletonDescription} />
            <View style={styles.skeletonButton} />
          </Animated.View>
        ))}
      </View>
    );
  };

  renderPackageCard = (paquete, index) => {
    const animatedStyle = {
      opacity: this.fadeAnim,
      transform: [
        { 
          translateY: this.slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 50]
          })
        }
      ]
    };

    const isRecommended = index === 1; // Segundo paquete como recomendado

    return (
      <Animated.View key={paquete._id} style={[animatedStyle, { marginBottom: 16 }]}>
        <Card 
          style={[
            styles.packageCard,
            isTablet && styles.packageCardTablet,
            isRecommended && styles.recommendedCard
          ]} 
          elevation={isRecommended ? 4 : 2}
        >
          {isRecommended && (
            <View style={styles.recommendedBadge}>
              <Paragraph style={styles.recommendedText}>⭐ MÁS POPULAR</Paragraph>
            </View>
          )}
          
          <Card.Content style={styles.packageContent}>
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton 
                  icon="wifi" 
                  size={isTablet ? 32 : 24} 
                  iconColor="#2196F3"
                  style={styles.packageIcon}
                />
                <Title style={[styles.packageTitle, isTablet && styles.packageTitleTablet]}>
                  {megasToGB(paquete.megas)}
                </Title>
              </View>
              <View style={styles.priceContainer}>
                <Paragraph style={[styles.packagePrice, isTablet && styles.packagePriceTablet]}>
                  ${paquete.precio}
                </Paragraph>
                <Paragraph style={styles.priceCurrency}>CUP</Paragraph>
              </View>
            </View>
            
            {!!paquete.comentario && (
              <Paragraph style={[styles.packageDescription, isTablet && styles.packageDescriptionTablet]}>
                {paquete.comentario}
              </Paragraph>
            )}
          </Card.Content>
          
          <Card.Actions style={styles.packageActions}>
            <Button
              mode="contained"
              onPress={() => this.handleComprarPaquete(paquete)}
              icon="cart-plus"
              buttonColor={isRecommended ? "#1976D2" : "#2196F3"}
              style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
              labelStyle={[styles.buyButtonLabel, isTablet && styles.buyButtonLabelTablet]}
              contentStyle={styles.buyButtonContent}
            >
              Comprar Ahora
            </Button>
          </Card.Actions>
        </Card>
      </Animated.View>
    );
  };

  render() {
    const { paquetesDisponibles, loading, megasActuales, isIlimitado, descuentoProxy } = this.state;

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, isTablet && styles.cardTablet]}>
          <Card.Content>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <IconButton icon="wifi" size={isTablet ? 40 : 32} iconColor="#2196F3" />
                <Title style={[styles.title, isTablet && styles.titleTablet]}>
                  Paquetes Proxy
                </Title>
              </View>
              {!!descuentoProxy && descuentoProxy > 0 && (
                <Badge style={styles.discountBadge} size={isTablet ? 28 : 24}>
                  -{descuentoProxy}% OFF
                </Badge>
              )}
            </View>

            <Paragraph style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Internet rápido y sin límites 🚀
            </Paragraph>

            {/* Estado actual */}
            <View style={styles.currentStatus}>
              <Chip
                icon={isIlimitado ? 'infinity' : 'database'}
                style={[styles.statusChip, isTablet && styles.statusChipTablet]}
                textStyle={isTablet && styles.statusChipTextTablet}
              >
                Saldo: {isIlimitado ? 'Ilimitado' : megasToGB(megasActuales)}
              </Chip>
            </View>

            {/* Paquetes */}
            {loading ? (
              this.renderSkeleton()
            ) : paquetesDisponibles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconButton icon="package-variant" size={64} iconColor="#CCC" />
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

            {/* Botón Historial */}
            <Button
              mode="outlined"
              icon="history"
              onPress={() => this.props.navigation.navigate('ProxyHistory')}
              style={[styles.historyButton, isTablet && styles.historyButtonTablet]}
              textColor="#2196F3"
              contentStyle={styles.historyButtonContent}
            >
              Ver Historial de Compras
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5'
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
    elevation: 4,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  cardTablet: {
    margin: 24,
    borderRadius: 16
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
    color: '#2196F3',
    marginLeft: -8
  },
  titleTablet: {
    fontSize: 28
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
    fontSize: 14
  },
  subtitleTablet: {
    fontSize: 16,
    marginBottom: 24
  },
  discountBadge: {
    backgroundColor: '#4CAF50'
  },
  currentStatus: {
    marginBottom: 24,
    alignItems: 'flex-start',
    maxHeight: 30
  },
  statusChip: {
    backgroundColor: '#E3F2FD'
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
    backgroundColor: '#FAFAFA',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
    borderLeftColor: '#2196F3'
  },
  recommendedBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1976D2',
    letterSpacing: 1
  },
  packageContent: {
    paddingVertical: 16
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
    color: '#2196F3',
    marginLeft: 4
  },
  packageTitleTablet: {
    fontSize: 28
  },
  priceContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2'
  },
  packagePriceTablet: {
    fontSize: 24
  },
  priceCurrency: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 4,
    fontWeight: '600'
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginTop: 8
  },
  packageDescriptionTablet: {
    fontSize: 15,
    lineHeight: 22
  },
  packageActions: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  buyButton: {
    flex: 1,
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
    borderColor: '#2196F3',
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
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16
  },
  // Skeleton Styles
  skeletonCard: {
    backgroundColor: '#F0F0F0',
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
    backgroundColor: '#E0E0E0',
    borderRadius: 4
  },
  skeletonPrice: {
    width: '25%',
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 8
  },
  skeletonDescription: {
    width: '80%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16
  },
  skeletonButton: {
    width: '100%',
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 8
  }
});
