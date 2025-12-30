import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Paragraph, Button, IconButton, Surface, Title, withTheme } from 'react-native-paper';
import { megasToGB } from '../shared/MegasConverter';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const VPNPackageCardItem = ({
  paquete,
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
        isRecommended && !isIlimitado && styles.recommendedCard,
        isIlimitado && styles.unlimitedCard
      ]}
      elevation={isRecommended ? 4 : isIlimitado ? 5 : 2}
    >
      {isIlimitado && (
        <View style={[styles.premiumBadge, { backgroundColor: goldColor }]}>
          <IconButton icon="crown" size={14} iconColor="#000" style={{ margin: 0 }} />
          <Paragraph style={[styles.premiumText, { color: '#000' }]}>⭐ PREMIUM ⭐</Paragraph>
        </View>
      )}

      {!isIlimitado && isRecommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: theme.colors.tertiary }]}>
          <Paragraph style={styles.recommendedText}>⭐ MÁS POPULAR</Paragraph>
        </View>
      )}

      <View style={styles.packageContent}>
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleContainer}>
            <IconButton
              icon={isIlimitado ? 'infinity' : 'shield-check'}
              size={isTablet ? 28 : 20}
              iconColor={isIlimitado ? goldColor : vpnColor}
              style={styles.packageIcon}
            />
            <Title
              style={[
                styles.packageTitle,
                isTablet && styles.packageTitleTablet,
                { color: isIlimitado ? goldColor : vpnColor }
              ]}
            >
              {isIlimitado ? 'ILIMITADO' : megasToGB(paquete.megas)}
            </Title>
          </View>

          <View
            style={[
              styles.priceContainer,
              {
                backgroundColor: isIlimitado
                  ? (theme.dark ? 'rgba(255, 215, 0, 0.15)' : '#FFF9E6')
                  : (theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9')
              }
            ]}
          >
            <Paragraph style={[styles.packagePrice, isTablet && styles.packagePriceTablet, { color: isIlimitado ? goldColor : vpnColor }]}>
              ${paquete.precio}
            </Paragraph>
            <Paragraph style={[styles.priceCurrency, { color: isIlimitado ? goldColor : vpnColor }]}>CUP</Paragraph>
          </View>
        </View>

        {isIlimitado && (
          <Paragraph style={[styles.unlimitedDescription, isTablet && styles.packageDescriptionTablet]} numberOfLines={1}>
            🔒 Navegación ilimitada 30 días
          </Paragraph>
        )}

        {!!paquete.detalles && (
          <Paragraph style={[styles.packageDescription, isTablet && styles.packageDescriptionTablet]} numberOfLines={2} ellipsizeMode="tail">
            {paquete.detalles}
          </Paragraph>
        )}

        <View style={styles.packageActions}>
          <Button
            mode="contained"
            onPress={onPress}
            icon={isIlimitado ? 'lightning-bolt' : 'cart-plus'}
            buttonColor={
              isIlimitado
                ? goldColor
                : isRecommended
                  ? (theme.dark ? '#388E3C' : '#2E7D32')
                  : vpnColor
            }
            textColor={isIlimitado ? '#000' : '#FFFFFF'}
            style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
            labelStyle={[styles.buyButtonLabel, isTablet && styles.buyButtonLabelTablet, isIlimitado && { fontWeight: '900' }]}
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
    borderLeftColor: '#4CAF50',
    borderRadius: 30, // ✅ igual que ProxyPackageCardItem
    minHeight: 180
  },
  packageCardHorizontal: {
    marginRight: 16,
    marginBottom: 0
  },
  packageCardTablet: {
    width: 320,
    minHeight: 200
  },
  recommendedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    borderLeftWidth: 2, // ✅ antes 4
    borderLeftColor: '#4CAF50',
    borderRadius: 30
  },
  unlimitedCard: {
    borderLeftWidth: 2, // ✅ antes 6
    borderLeftColor: '#FFD700',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  premiumBadge: {
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 4
  },
  recommendedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  packageContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 1,
    justifyContent: 'space-between'
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
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
    fontSize: 24
  },
  priceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30, // ✅ clave del “pill”
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  packagePriceTablet: {
    fontSize: 20
  },
  priceCurrency: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600'
  },
  packageDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4
  },
  packageDescriptionTablet: {
    fontSize: 14,
    lineHeight: 18
  },
  unlimitedDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center'
  },
  packageActions: {
    justifyContent: 'center',
    marginTop: 'auto'
  },
  buyButton: {
    borderRadius: 30
  },
  buyButtonTablet: {
    borderRadius: 30
  },
  buyButtonContent: {
    paddingVertical: 2
  },
  buyButtonLabel: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  buyButtonLabelTablet: {
    fontSize: 15
  }
});

export default withTheme(VPNPackageCardItem);
