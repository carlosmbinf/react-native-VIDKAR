import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton, Surface, withTheme } from 'react-native-paper';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const VPNPackageCardItem = ({ 
  paquete, 
  index, 
  isRecommended, 
  onPress, 
  theme,
  isHorizontal = false
}) => {
  const vpnColor = theme.dark ? '#66BB6A' : '#4CAF50';
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
          <IconButton icon="crown" size={16} iconColor="#000" style={{ margin: 0 }} />
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
              icon={isIlimitado ? "infinity" : "shield-check"}
              size={isTablet ? 32 : 24} 
              iconColor={isIlimitado ? goldColor : vpnColor}
              style={styles.packageIcon}
            />
            <Title style={[
              styles.packageTitle, 
              isTablet && styles.packageTitleTablet,
              { color: isIlimitado ? goldColor : vpnColor }
            ]}>
              {isIlimitado ? 'ILIMITADO' : megasToGB(paquete.megas)}
            </Title>
          </View>
          <View style={[
            styles.priceContainer,
            { 
              backgroundColor: isIlimitado 
                ? (theme.dark ? 'rgba(255, 215, 0, 0.15)' : '#FFF9E6')
                : (theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9')
            }
          ]}>
            <Paragraph style={[
              styles.packagePrice, 
              isTablet && styles.packagePriceTablet,
              { color: isIlimitado ? goldColor : vpnColor }
            ]}>
              ${paquete.precio}
            </Paragraph>
            <Paragraph style={[styles.priceCurrency, { color: isIlimitado ? goldColor : vpnColor }]}>
              CUP
            </Paragraph>
          </View>
        </View>
        
        {isIlimitado && (
          <Paragraph style={[
            styles.unlimitedDescription,
            isTablet && styles.packageDescriptionTablet
          ]}>
            🔒 Navegación ilimitada y segura durante 30 días
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
                  ? (theme.dark ? '#388E3C' : '#2E7D32') 
                  : vpnColor
            }
            textColor={isIlimitado ? "#000" : "#FFFFFF"}
            style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
            labelStyle={[
              styles.buyButtonLabel, 
              isTablet && styles.buyButtonLabelTablet,
              isIlimitado && { fontWeight: '900' }
            ]}
            contentStyle={styles.buyButtonContent}
          >
            {isIlimitado ? 'Comprar Premium' : 'Comprar Ahora'}
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
    borderLeftColor: '#4CAF50',
    borderRadius: 20,
    minHeight: 280, // ✅ Altura mínima consistente
  },
  packageCardHorizontal: {
    marginRight: 16,
    marginBottom: 0
  },
  packageCardTablet: {
    width: 320,
    minHeight: 320
  },
  recommendedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  unlimitedCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    borderRadius: 16,
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
    flex: 1, // ✅ Permitir que el contenido se expanda
    justifyContent: 'space-between' // ✅ Empujar el botón al final
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
    fontSize: 18,
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
  unlimitedDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 8,
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
    paddingVertical: 6
  },
  buyButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  buyButtonLabelTablet: {
    fontSize: 16
  }
});

export default withTheme(VPNPackageCardItem);
