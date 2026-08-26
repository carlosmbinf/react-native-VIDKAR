import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
    Button,
    IconButton,
    Paragraph,
    Surface,
    Title,
} from "react-native-paper";

import { megasToGB } from "../shared/MegasConverter";

const VPNPackageCardItem = ({
  paquete,
  isHorizontal = false,
  isRecommended = false,
  onPress,
  theme,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const vpnColor = theme.dark ? "#66BB6A" : "#4CAF50";
  const isIlimitado =
    paquete?.esPorTiempo ||
    paquete?.megas === null ||
    paquete?.megas === 999999;
  const goldColor = "#FFD700";
  const accentColor = isIlimitado ? goldColor : vpnColor;
  const cardBackground = isIlimitado
    ? theme.dark
      ? "#211F14"
      : "#FFFDF5"
    : theme.dark
      ? "#151F19"
      : "#F7FCF8";
  const tonalBackground = isIlimitado
    ? theme.dark
      ? "rgba(255, 215, 0, 0.14)"
      : "#FFF6CC"
    : theme.dark
      ? "rgba(102, 187, 106, 0.14)"
      : "#EAF6EC";

  return (
    <Surface
      style={[
        styles.packageCard,
        {
          backgroundColor: cardBackground,
          borderColor: isIlimitado
            ? theme.dark
              ? "rgba(255, 215, 0, 0.34)"
              : "rgba(184, 134, 11, 0.25)"
            : theme.dark
              ? "rgba(102, 187, 106, 0.30)"
              : "rgba(76, 175, 80, 0.20)",
        },
        isHorizontal && styles.packageCardHorizontal,
        isTablet && styles.packageCardTablet,
        isRecommended && !isIlimitado && styles.recommendedCard,
        isIlimitado && styles.unlimitedCard,
      ]}
      elevation={3}
    >
      <View
        pointerEvents="none"
        style={[styles.accentOrb, { backgroundColor: accentColor }]}
      />

      <View style={styles.packageContent}>
        <View style={styles.metaRow}>
          <View
            style={[styles.serviceBadge, { backgroundColor: tonalBackground }]}
          >
            <IconButton
              icon="shield-check"
              size={12}
              iconColor={vpnColor}
              style={styles.metaIcon}
            />
            <Paragraph
              style={[styles.serviceText, { color: vpnColor }]}
              numberOfLines={1}
            >
              VPN
            </Paragraph>
          </View>

          {isIlimitado || isRecommended ? (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isIlimitado
                    ? goldColor
                    : theme.dark
                      ? "#388E3C"
                      : "#2E7D32",
                },
              ]}
            >
              <IconButton
                icon={isIlimitado ? "crown" : "star"}
                size={11}
                iconColor={isIlimitado ? "#241F00" : "#FFFFFF"}
                style={styles.metaIcon}
              />
              <Paragraph
                style={[
                  styles.statusText,
                  { color: isIlimitado ? "#241F00" : "#FFFFFF" },
                ]}
                numberOfLines={1}
              >
                {isIlimitado ? "PREMIUM" : "POPULAR"}
              </Paragraph>
            </View>
          ) : null}
        </View>

        <View style={styles.packageHeader}>
          <View style={styles.packageTitleContainer}>
            <View
              style={[styles.iconContainer, { backgroundColor: tonalBackground }]}
            >
              <IconButton
                icon={isIlimitado ? "infinity" : "database-outline"}
                size={isTablet ? 25 : 21}
                iconColor={accentColor}
                style={styles.packageIcon}
              />
            </View>
            <View style={styles.packageTitleCopy}>
              <Paragraph style={styles.packageEyebrow}>
                {isIlimitado ? "30 DÍAS" : "CAPACIDAD"}
              </Paragraph>
              <Title
                style={[
                  styles.packageTitle,
                  isTablet && styles.packageTitleTablet,
                  { color: accentColor },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isIlimitado ? "Ilimitado" : megasToGB(paquete?.megas)}
              </Title>
            </View>
          </View>

          <View
            style={[
              styles.priceContainer,
              {
                backgroundColor: tonalBackground,
              },
            ]}
          >
            <Paragraph
              style={[
                styles.packagePrice,
                isTablet && styles.packagePriceTablet,
                { color: isIlimitado ? goldColor : vpnColor },
              ]}
              numberOfLines={1}
            >
              ${paquete?.precio}
            </Paragraph>
            <Paragraph
              style={[
                styles.priceCurrency,
                { color: isIlimitado ? goldColor : vpnColor },
              ]}
                numberOfLines={1}
            >
              CUP
            </Paragraph>
          </View>
        </View>

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
            accessibilityLabel={`Comprar paquete VPN ${
              isIlimitado ? "ilimitado" : megasToGB(paquete?.megas)
            } por ${paquete?.precio} CUP`}
            accessibilityHint="Abre el resumen de compra del paquete VPN"
            icon={isIlimitado ? "lightning-bolt" : "cart-plus"}
            buttonColor={
              isIlimitado
                ? goldColor
                : isRecommended
                  ? theme.dark
                    ? "#388E3C"
                    : "#2E7D32"
                  : vpnColor
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
    borderRadius: 14,
    width: "100%",
  },
  buyButtonContent: {
    minHeight: 38,
    paddingVertical: 2,
  },
  buyButtonLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  buyButtonLabelGold: {
    fontWeight: "900",
  },
  buyButtonLabelTablet: {
    fontSize: 13,
  },
  buyButtonTablet: {
    borderRadius: 14,
  },
  packageActions: {
    justifyContent: "center",
    marginTop: "auto",
  },
  packageCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 196,
    overflow: "hidden",
    width: 268,
  },
  packageCardHorizontal: {
    alignSelf: "stretch",
    height: "100%",
    marginBottom: 0,
    marginRight: 12,
  },
  packageCardTablet: {
    minHeight: 212,
    width: 316,
  },
  packageContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 14,
  },
  packageDescription: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  packageDescriptionTablet: {
    fontSize: 13,
    lineHeight: 17,
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
  accentOrb: {
    borderRadius: 80,
    height: 150,
    opacity: 0.06,
    position: "absolute",
    right: -64,
    top: -70,
    width: 150,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  metaIcon: {
    height: 20,
    margin: 0,
    width: 20,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: "800",
  },
  packagePriceTablet: {
    fontSize: 18,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  packageTitleContainer: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  packageTitleCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  packageEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    lineHeight: 12,
    opacity: 0.62,
  },
  packageTitleTablet: {
    fontSize: 21,
  },
  serviceBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  priceContainer: {
    alignItems: "baseline",
    borderRadius: 12,
    flexDirection: "row",
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  priceCurrency: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedCard: {
    borderColor: "#FFD700",
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  unlimitedCard: {
    borderColor: "#FFD700",
    borderWidth: 1,
  },
});

export default VPNPackageCardItem;
