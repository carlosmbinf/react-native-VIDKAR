import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton, Surface, withTheme } from 'react-native-paper';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ProxyPackageCardItem = ({ 
  paquete, 
  index, 
  isRecommended, 
  onPress, 
  theme,
  isHorizontal = false // ✅ NUEVO: Flag para modo horizontal
}) => {
  const proxyColor = theme.dark ? '#42A5F5' : '#2196F3';
  const isIlimitado = paquete.esPorTiempo || paquete.megas === null || paquete.megas === 999999;
  const goldColor = '#FFD700';

  return (
    <Surface 
      style={[
        styles.packageCard,
        isHorizontal && styles.packageCardHorizontal,
        isTablet && styles.packageCardTablet,
        isRecommended && styles.recommendedCard,
        isIlimitado && styles.unlimitedCard
      ]} 
      elevation={isRecommended ? 4 : isIlimitado ? 5 : 2}
    >
      {isIlimitado && (
        <View style={[styles.premiumBadge, { backgroundColor: goldColor }]}>
          <IconButton icon="crown" size={14} iconColor="#000" style={{ margin: 0 }} />
          <Paragraph style={[styles.premiumText, { color: '#000' }]}>
            ⭐ PREMIUM ⭐
          </Paragraph>
        </View>
      )}

      {!isIlimitado && isRecommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: theme.colors.tertiary }]}>
          <Paragraph style={styles.recommendedText}>
            ⭐ MÁS POPULAR
          </Paragraph>
        </View>
      )}
      
      <View style={styles.packageContent}>
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleContainer}>
            <IconButton 
              icon={isIlimitado ? "infinity" : "wifi"}
              size={isTablet ? 28 : 20} 
              iconColor={isIlimitado ? goldColor : proxyColor}
              style={styles.packageIcon}
            />
            <Title style={[
              styles.packageTitle, 
              isTablet && styles.packageTitleTablet,
              { color: isIlimitado ? goldColor : proxyColor }
            ]}>
              {isIlimitado ? 'ILIMITADO' : megasToGB(paquete.megas)}
            </Title>
          </View>
          <View style={[
            styles.priceContainer,
            { 
              backgroundColor: isIlimitado 
                ? (theme.dark ? 'rgba(255, 215, 0, 0.15)' : '#FFF9E6')
                : (theme.dark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD')
            }
          ]}>
            <Paragraph style={[
              styles.packagePrice, 
              isTablet && styles.packagePriceTablet,
              { color: isIlimitado ? goldColor : proxyColor }
            ]}>
              ${paquete.precio}
            </Paragraph>
            <Paragraph style={[styles.priceCurrency, { color: isIlimitado ? goldColor : proxyColor }]}>
              CUP
            </Paragraph>
          </View>
        </View>
        
        {isIlimitado && (
          <Paragraph style={[
            styles.unlimitedDescription,
            isTablet && styles.packageDescriptionTablet
          ]} numberOfLines={1}>
            🚀 Datos ilimitados 30 días
          </Paragraph>
        )}

        {!!paquete.detalles && (
          <Paragraph style={[
            styles.packageDescription, 
            isTablet && styles.packageDescriptionTablet
          ]} numberOfLines={2} ellipsizeMode="tail">
            {paquete.detalles}
          </Paragraph>
        )}

        <View style={styles.packageActions}>
          <Button
            mode="contained"
            onPress={onPress}
            icon={isIlimitado ? "lightning-bolt" : "cart-plus"}
            buttonColor={
              isIlimitado 
                ? goldColor 
                : isRecommended 
                  ? (theme.dark ? '#1976D2' : '#1565C0') 
                  : proxyColor
            }
            textColor={isIlimitado ? "#000" : "#FFFFFF"}
            style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
            labelStyle={[
              styles.buyButtonLabel, 
              isTablet && styles.buyButtonLabelTablet,
              isIlimitado && { fontWeight: '900' }
            ]}
            contentStyle={styles.buyButtonContent}
            compact
          >
            {isIlimitado ? 'Comprar Premium' : 'Comprar'}
          </Button>
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  packageCard: {
    width: 280,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 12,
    minHeight: 180, // ✅ Reducido de 280px a 180px
  },
  packageCardHorizontal: {
    marginRight: 16,
    marginBottom: 0
  },
  packageCardTablet: {
    width: 320,
    minHeight: 200 // ✅ Reducido de 320px a 200px
  },
  recommendedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  unlimitedCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  premiumBadge: {
    paddingVertical: 5, // ✅ Reducido de 8px a 5px
    paddingHorizontal: 12, // ✅ Reducido de 16px a 12px
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  premiumText: {
    fontSize: 10, // ✅ Reducido de 12px a 10px
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 4
  },
  recommendedBadge: {
    paddingVertical: 4, // ✅ Reducido de 6px a 4px
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  recommendedText: {
    fontSize: 10, // ✅ Reducido de 11px a 10px
    fontWeight: 'bold',
    letterSpacing: 1
  },
  packageContent: {
    paddingVertical: 10, // ✅ Reducido de 16px a 10px
    paddingHorizontal: 12, // ✅ Reducido de 16px a 12px
    flex: 1, // ✅ Permitir que el contenido se expanda
    justifyContent: 'space-between' // ✅ Empujar el botón al final
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 // ✅ Reducido de 12px a 8px
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
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 4
  },
  packageTitleTablet: {
    fontSize: 24 // ✅ Reducido de 28px a 24px
  },
  priceContainer: {
    paddingHorizontal: 10, // ✅ Reducido de 12px a 10px
    paddingVertical: 4, // ✅ Reducido de 6px a 4px
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  packagePrice: {
    fontSize: 18, // ✅ Reducido de 20px a 18px
    fontWeight: 'bold'
  },
  packagePriceTablet: {
    fontSize: 20
  },
  priceCurrency: {
    fontSize: 11, // ✅ Reducido de 12px a 11px
    marginLeft: 4,
    fontWeight: '600'
  },
  packageDescription: {
    fontSize: 12, // ✅ Reducido de 13px a 12px
    lineHeight: 16, // ✅ Reducido de 20px a 16px
    marginTop: 4 // ✅ Reducido de 8px a 4px
  },
  packageDescriptionTablet: {
    fontSize: 14, // ✅ Reducido de 15px a 14px
    lineHeight: 18 // ✅ Reducido de 22px a 18px
  },
  unlimitedDescription: {
    fontSize: 13, // ✅ Reducido de 15px a 13px
    lineHeight: 18, // ✅ Reducido de 22px a 18px
    marginTop: 4, // ✅ Reducido de 8px a 4px
    marginBottom: 4, // ✅ Reducido de 8px a 4px
    fontWeight: '600',
    textAlign: 'center'
  },
  packageActions: {
    justifyContent: 'center',
    marginTop: 'auto' // ✅ Forzar al final del contenedor
  },
  buyButton: {
    borderRadius: 8
  },
  buyButtonTablet: {
    borderRadius: 10
  },
  buyButtonContent: {
    paddingVertical: 2 // ✅ Reducido de 6px a 2px
  },
  buyButtonLabel: {
    fontSize: 13, // ✅ Reducido de 14px a 13px
    fontWeight: 'bold'
  },
  buyButtonLabelTablet: {
    fontSize: 15 // ✅ Reducido de 16px a 15px
  }
});

export default withTheme(ProxyPackageCardItem);
