import { Dimensions, StyleSheet, View } from "react-native";
import {
  Button,
  IconButton,
  Paragraph,
  Surface,
  Title,
} from "react-native-paper";

import { megasToGB } from "../shared/MegasConverter";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const ProxyPackageCardItem = ({
  paquete,
  isHorizontal = false,
  isRecommended = false,
  onPress,
  theme,
}) => {
  const proxyColor = theme.dark ? "#42A5F5" : "#2196F3";
  const isIlimitado =
    paquete?.esPorTiempo ||
    paquete?.megas === null ||
    paquete?.megas === 999999;
  const goldColor = "#FFD700";

  return (
    <Surface
      style={[
        styles.packageCard,
        isHorizontal && styles.packageCardHorizontal,
        isTablet && styles.packageCardTablet,
        isRecommended && styles.recommendedCard,
        isIlimitado && styles.unlimitedCard,
      ]}
      elevation={2}
    >
      {isIlimitado ? (
        <View style={[styles.premiumBadge, { backgroundColor: goldColor }]}>
          <IconButton
            icon="crown"
            size={14}
            iconColor="#000"
            style={styles.zeroMargin}
          />
          <Paragraph style={[styles.premiumText, { color: "#000" }]}>
            ⭐ PREMIUM ⭐
          </Paragraph>
        </View>
      ) : null}

      {!isIlimitado && isRecommended ? (
        <View
          style={[
            styles.recommendedBadge,
            { backgroundColor: theme.dark ? "#1976D2" : "#1565C0" },
          ]}
        >
          <Paragraph style={styles.recommendedText}>⭐ MÁS POPULAR</Paragraph>
        </View>
      ) : null}

      <View style={styles.packageContent}>
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleContainer}>
            <IconButton
              icon={isIlimitado ? "infinity" : "wifi"}
              size={isTablet ? 28 : 20}
              iconColor={isIlimitado ? goldColor : proxyColor}
              style={styles.packageIcon}
            />
            <Title
              style={[
                styles.packageTitle,
                isTablet && styles.packageTitleTablet,
                { color: isIlimitado ? goldColor : proxyColor },
              ]}
            >
              {isIlimitado ? "ILIMITADO" : megasToGB(paquete?.megas)}
            </Title>
          </View>

          <View
            style={[
              styles.priceContainer,
              {
                backgroundColor: isIlimitado
                  ? theme.dark
                    ? "rgba(255, 215, 0, 0.15)"
                    : "#FFF9E6"
                  : theme.dark
                    ? "rgba(66, 165, 245, 0.15)"
                    : "#E3F2FD",
              },
            ]}
          >
            <Paragraph
              style={[
                styles.packagePrice,
                isTablet && styles.packagePriceTablet,
                { color: isIlimitado ? goldColor : proxyColor },
              ]}
            >
              ${paquete?.precio}
            </Paragraph>
            <Paragraph
              style={[
                styles.priceCurrency,
                { color: isIlimitado ? goldColor : proxyColor },
              ]}
            >
              CUP
            </Paragraph>
          </View>
        </View>

        {isIlimitado ? (
          <Paragraph
            style={[
              styles.unlimitedDescription,
              isTablet && styles.packageDescriptionTablet,
            ]}
            numberOfLines={1}
          >
            🚀 Datos ilimitados 30 días
          </Paragraph>
        ) : null}

        {!!paquete?.detalles ? (
          <Paragraph
            style={[
              styles.packageDescription,
              isTablet && styles.packageDescriptionTablet,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {paquete.detalles}
          </Paragraph>
        ) : null}

        <View style={styles.packageActions}>
          <Button
            mode="contained"
            onPress={onPress}
            icon={isIlimitado ? "lightning-bolt" : "cart-plus"}
            buttonColor={
              isIlimitado
                ? goldColor
                : isRecommended
                  ? theme.dark
                    ? "#1976D2"
                    : "#1565C0"
                  : proxyColor
            }
            textColor={isIlimitado ? "#000" : "#FFFFFF"}
            style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
            labelStyle={[
              styles.buyButtonLabel,
              isTablet && styles.buyButtonLabelTablet,
              isIlimitado && styles.buyButtonLabelGold,
            ]}
            contentStyle={styles.buyButtonContent}
            compact
          >
            {isIlimitado ? "Comprar Premium" : "Comprar"}
          </Button>
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  buyButton: {
    borderRadius: 30,
  },
  buyButtonContent: {
    paddingVertical: 2,
  },
  buyButtonLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
  buyButtonLabelGold: {
    fontWeight: "900",
  },
  buyButtonLabelTablet: {
    fontSize: 15,
  },
  buyButtonTablet: {
    borderRadius: 30,
  },
  packageActions: {
    justifyContent: "center",
    marginTop: "auto",
  },
  packageCard: {
    borderLeftColor: "#2196F3",
    borderLeftWidth: 4,
    borderRadius: 30,
    marginBottom: 16,
    minHeight: 180,
    width: 280,
    marginHorizontal: 15,
  },
  packageCardHorizontal: {
    marginBottom: 0,
    marginRight: 16,
  },
  packageCardTablet: {
    minHeight: 200,
    width: 320,
  },
  packageContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  packageDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  packageDescriptionTablet: {
    fontSize: 14,
    lineHeight: 18,
  },
  packageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  packageIcon: {
    margin: 0,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  packagePriceTablet: {
    fontSize: 20,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 4,
  },
  packageTitleContainer: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  packageTitleTablet: {
    fontSize: 24,
  },
  premiumBadge: {
    alignItems: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: "baseline",
    borderRadius: 30,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceCurrency: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  recommendedBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  recommendedCard: {
    borderColor: "#FFD700",
    borderLeftColor: "#FFD700",
    borderLeftWidth: 2,
    borderWidth: 2,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  unlimitedCard: {
    borderColor: "#FFD700",
    borderLeftColor: "#FFD700",
    borderLeftWidth: 2,
    borderWidth: 2,
  },
  unlimitedDescription: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 4,
    marginTop: 4,
    textAlign: "center",
  },
  zeroMargin: {
    margin: 0,
  },
});

export default ProxyPackageCardItem;
