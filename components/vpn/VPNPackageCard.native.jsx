import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    Button,
    Chip,
    IconButton,
    Paragraph,
    Surface,
    Title,
    useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { megasToGB } from "../shared/MegasConverter";

const Meteor = MeteorBase;

const getColumnsCount = (screenWidth, screenHeight) => {
  const isLandscape = screenWidth > screenHeight;
  if (screenWidth >= 1200) return isLandscape ? 3 : 3;
  if (screenWidth >= 900) return isLandscape ? 3 : 2;
  if (screenWidth >= 600) return isLandscape ? 3 : 2;
  if (screenWidth >= 400) return 1;
  return 1;
};

const VPNPackageCard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;
  const vpnColor = theme.dark ? "#66BB6A" : "#4CAF50";
  const headerInset = useAppHeaderContentInset();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width,
  );
  const [descuentoVPN, setDescuentoVPN] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paquetePorTiempo, setPaquetePorTiempo] = useState(null);
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([]);
  const [vpnIsIlimitado, setVpnIsIlimitado] = useState(false);
  const [vpnMegasActuales, setVpnMegasActuales] = useState(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          duration: 1000,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          duration: 1000,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [skeletonAnim]);

  useEffect(() => {
    const user = Meteor.user();
    if (!user) {
      return;
    }

    setVpnMegasActuales(user.vpnmegas || 0);
    setVpnIsIlimitado(user.vpnisIlimitado || false);
    setDescuentoVPN(parseFloat(user.descuentovpn) || 0);
  }, []);

  useEffect(() => {
    setLoading(true);
    Meteor.call("precios.getAllProxyVPNPackages", "VPN", (error, result) => {
      if (error) {
        Alert.alert("Error", "No se pudieron cargar los paquetes disponibles");
        setLoading(false);
        return;
      }

      const paquetesPorMegas = (result?.porMegas || []).sort(
        (first, second) => first.megas - second.megas,
      );
      const premiumPackage = result?.porTiempo?.length
        ? result.porTiempo[0]
        : null;

      setPaquetesDisponibles(paquetesPorMegas);
      setPaquetePorTiempo(premiumPackage);
      setLoading(false);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          duration: 600,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          friction: 7,
          tension: 50,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const columnsCount = useMemo(
    () => getColumnsCount(screenWidth, screenHeight),
    [screenHeight, screenWidth],
  );

  const handlePackagesLayout = (event) => {
    const nextWidth = event?.nativeEvent?.layout?.width;
    if (nextWidth && Math.abs(nextWidth - containerWidth) > 1) {
      setContainerWidth(nextWidth);
    }
  };

  const handleComprarPaquete = (paquete, esPorTiempo = false) => {
    const user = Meteor.user();
    if (user?.vpn === true && !vpnIsIlimitado) {
      Alert.alert(
        "Paquete VPN Activo",
        "Ya tienes un paquete VPN activo. Debes consumirlo antes de comprar otro.",
        [{ style: "cancel", text: "Entendido" }],
      );
      return;
    }

    router.push({
      pathname: "/(normal)/VPNPurchase",
      params: {
        descuentoVPN: String(descuentoVPN || 0),
        paquete: JSON.stringify({ ...paquete, esPorTiempo }),
      },
    });
  };

  const renderSkeleton = () => {
    const opacity = skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });
    const gutter = 12;
    const cols = Math.max(1, columnsCount);
    const totalGutter = gutter * (cols - 1);
    const cardWidthPx = Math.floor((containerWidth - totalGutter) / cols);

    return (
      <View
        style={[
          styles.packagesContainer,
          cols > 1 && styles.packagesContainerGrid,
        ]}
        onLayout={handlePackagesLayout}
      >
        {[1, 2, 3].map((item, index) => {
          const marginRight =
            cols > 1 && index % cols !== cols - 1 ? gutter : 0;
          return (
            <Animated.View
              key={item}
              style={{
                height: 180,
                marginBottom: gutter,
                marginRight,
                opacity,
                width: cardWidthPx,
              }}
            >
              <Surface
                style={[
                  styles.skeletonCard,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.skeletonHeader}>
                  <View
                    style={[
                      styles.skeletonTitle,
                      { backgroundColor: theme.colors.surfaceDisabled },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonPrice,
                      { backgroundColor: theme.colors.surfaceDisabled },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.skeletonDescription,
                    { backgroundColor: theme.colors.surfaceDisabled },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonButton,
                    { backgroundColor: theme.colors.surfaceDisabled },
                  ]}
                />
              </Surface>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderPackageCard = (paquete, index) => {
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    };

    const isRecommended = index === 1;
    const vpnColor = theme.dark ? "#66BB6A" : "#4CAF50";
    const gutter = 12;
    const cols = Math.max(1, columnsCount);
    const totalGutter = gutter * (cols - 1);
    const cardWidthPx = Math.floor((containerWidth - totalGutter) / cols);
    const marginRight = cols > 1 && index % cols !== cols - 1 ? gutter : 0;

    return (
      <Animated.View
        key={paquete._id || `${paquete.megas}-${index}`}
        style={[
          animatedStyle,
          {
            height: 180,
            marginBottom: gutter,
            marginRight,
            width: cardWidthPx,
          },
        ]}
      >
        <Surface
          style={[
            styles.packageCard,
            isRecommended && styles.recommendedCard,
            { height: "100%" },
          ]}
        >
          {isRecommended ? (
            <View
              style={[
                styles.recommendedBadge,
                { backgroundColor: theme.colors.tertiary },
              ]}
            >
              <Paragraph style={styles.recommendedText}>
                ⭐ MÁS POPULAR
              </Paragraph>
            </View>
          ) : null}

          <View
            style={[
              styles.packageContent,
              !isTablet && styles.packageContentMobile,
            ]}
          >
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton
                  icon="shield-check"
                  size={isTablet ? 28 : 20}
                  iconColor={vpnColor}
                  style={styles.packageIcon}
                />
                <Title
                  style={[
                    styles.packageTitle,
                    isTablet && styles.packageTitleTablet,
                    { color: vpnColor },
                  ]}
                >
                  {megasToGB(paquete.megas)}
                </Title>
              </View>
              <View
                style={[
                  styles.priceContainer,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(102, 187, 106, 0.15)"
                      : "#E8F5E9",
                  },
                ]}
              >
                <Paragraph
                  style={[
                    styles.packagePrice,
                    isTablet && styles.packagePriceTablet,
                    { color: vpnColor },
                  ]}
                >
                  ${paquete.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: vpnColor }]}>
                  CUP
                </Paragraph>
              </View>
            </View>

            {paquete.detalles ? (
              <Paragraph
                style={[
                  styles.packageDescription,
                  isTablet && styles.packageDescriptionTablet,
                ]}
                numberOfLines={2}
              >
                {paquete.detalles}
              </Paragraph>
            ) : null}

            <View style={styles.packageActions}>
              <Button
                mode="contained"
                onPress={() => handleComprarPaquete(paquete)}
                icon="cart-plus"
                buttonColor={
                  isRecommended
                    ? theme.dark
                      ? "#388E3C"
                      : "#2E7D32"
                    : vpnColor
                }
                textColor="#FFFFFF"
                style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
                labelStyle={[
                  styles.buyButtonLabel,
                  isTablet && styles.buyButtonLabelTablet,
                ]}
                contentStyle={styles.buyButtonContent}
                compact
              >
                Comprar
              </Button>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderUnlimitedPackageCard = () => {
    if (!paquetePorTiempo) {
      return null;
    }

    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    };
    const goldColor = "#FFD700";
    const gutter = 12;
    const cols = Math.max(1, columnsCount);
    const totalGutter = gutter * (cols - 1);
    const baseCardWidthPx = Math.floor((containerWidth - totalGutter) / cols);
    const premiumWidthDelta = 100;
    const cardWidthPx = Math.min(
      baseCardWidthPx + premiumWidthDelta,
      containerWidth,
    );

    return (
      <Animated.View
        style={[
          animatedStyle,
          {
            alignSelf: "flex-start",
            height: 220,
            marginBottom: gutter,
            width: cardWidthPx,
          },
        ]}
      >
        <Surface style={[styles.unlimitedCard, { height: "100%" }]}>
          <View style={[styles.premiumBadge, { backgroundColor: goldColor }]}>
            <IconButton
              icon="crown"
              size={14}
              iconColor="#000"
              style={{ margin: 0 }}
            />
            <Paragraph style={[styles.premiumText, { color: "#000" }]}>
              ⭐ PREMIUM ⭐
            </Paragraph>
          </View>

          <View
            style={[
              styles.packageContent,
              !isTablet && styles.packageContentMobile,
            ]}
          >
            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <IconButton
                  icon="infinity"
                  size={isTablet ? 32 : 24}
                  iconColor={goldColor}
                  style={styles.packageIcon}
                />
                <Title
                  style={[
                    styles.unlimitedTitle,
                    isTablet && styles.packageTitleTablet,
                    { color: goldColor },
                  ]}
                >
                  ILIMITADO
                </Title>
              </View>
              <View
                style={[
                  styles.priceContainer,
                  styles.priceContainerShadow,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(255, 215, 0, 0.15)"
                      : "#FFF9E6",
                  },
                ]}
              >
                <Paragraph
                  style={[
                    styles.packagePrice,
                    isTablet && styles.packagePriceTablet,
                    { color: goldColor },
                  ]}
                >
                  ${paquetePorTiempo.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: goldColor }]}>
                  CUP
                </Paragraph>
              </View>
            </View>

            <Paragraph
              style={[
                styles.unlimitedDescription,
                isTablet && styles.packageDescriptionTablet,
              ]}
              numberOfLines={1}
            >
              🔒 Navegación ilimitada 30 días
            </Paragraph>

            {paquetePorTiempo.detalles ? (
              <Paragraph
                style={[
                  styles.packageDescription,
                  isTablet && styles.packageDescriptionTablet,
                ]}
                numberOfLines={2}
              >
                {paquetePorTiempo.detalles}
              </Paragraph>
            ) : null}

            <View style={styles.packageActions}>
              <Button
                mode="contained"
                onPress={() => handleComprarPaquete(paquetePorTiempo, true)}
                icon="lightning-bolt"
                buttonColor={goldColor}
                textColor="#000"
                style={[styles.buyButton, isTablet && styles.buyButtonTablet]}
                labelStyle={[
                  styles.buyButtonLabel,
                  isTablet && styles.buyButtonLabelTablet,
                  { fontWeight: "900" },
                ]}
                contentStyle={styles.buyButtonContent}
                compact
              >
                Comprar Premium
              </Button>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  return (
    <Surface
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Paquetes VPN"
        subtitle="Navegación segura y privada 🔒"
        backHref="/(normal)/Main"
        overlapContent
        showBackButton
      />
      <ScrollView
        style={[
          styles.scrollContainer,
          { backgroundColor: theme.colors.background },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerInset + 18 },
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.cardContent,
            !isTablet && styles.cardContentMobile,
            isLargeTablet && styles.cardContentLargeTablet,
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <IconButton
                icon="shield-check"
                size={isTablet ? 40 : 32}
                iconColor={vpnColor}
              />
              <Title
                style={[
                  styles.title,
                  isTablet && styles.titleTablet,
                  { color: vpnColor },
                ]}
              >
                Paquetes VPN
              </Title>
            </View>
          </View>

          <Paragraph
            style={[styles.subtitle, isTablet && styles.subtitleTablet]}
          >
            Navegación segura y privada 🔒
          </Paragraph>

          <View style={styles.currentStatus}>
            <Chip
              icon={vpnIsIlimitado ? "infinity" : "database"}
              style={[
                styles.statusChip,
                isTablet && styles.statusChipTablet,
                {
                  backgroundColor: theme.dark
                    ? "rgba(102, 187, 106, 0.15)"
                    : "#E8F5E9",
                },
              ]}
              textStyle={isTablet ? styles.statusChipTextTablet : undefined}
            >
              Saldo:{" "}
              {vpnIsIlimitado ? "Ilimitado" : megasToGB(vpnMegasActuales)}
            </Chip>
          </View>

          {loading ? (
            renderSkeleton()
          ) : (
            <>
              {paquetePorTiempo ? renderUnlimitedPackageCard() : null}

              {paquetesDisponibles.length === 0 && !paquetePorTiempo ? (
                <View style={styles.emptyContainer}>
                  <IconButton
                    icon="package-variant-closed"
                    size={64}
                    iconColor={theme.colors.surfaceDisabled}
                  />
                  <Paragraph style={styles.emptyText}>
                    No hay paquetes disponibles en este momento
                  </Paragraph>
                </View>
              ) : (
                <View
                  style={[
                    styles.packagesContainer,
                    columnsCount > 1 && styles.packagesContainerGrid,
                  ]}
                  onLayout={handlePackagesLayout}
                >
                  {paquetesDisponibles.map((paquete, index) =>
                    renderPackageCard(paquete, index),
                  )}
                </View>
              )}
            </>
          )}

          <Button
            mode="outlined"
            icon="history"
            onPress={() => router.push("/(normal)/ProxyVPNHistory")}
            style={[
              styles.historyButton,
              isTablet && styles.historyButtonTablet,
            ]}
            textColor={vpnColor}
            contentStyle={styles.historyButtonContent}
          >
            Ver Historial de Compras
          </Button>
        </View>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cardContent: { padding: 16 },
  cardContentLargeTablet: { paddingHorizontal: 32 },
  cardContentMobile: { padding: 8 },
  currentStatus: { alignItems: "flex-start", marginBottom: 24, maxHeight: 30 },
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyText: { fontStyle: "italic", marginTop: 16, textAlign: "center" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyButton: { borderRadius: 8, borderWidth: 1.5, marginTop: 24 },
  historyButtonTablet: { borderRadius: 10, marginTop: 32 },
  historyButtonContent: { paddingVertical: 4 },
  packageActions: {
    justifyContent: "center",
    marginTop: 8,
  },
  packageCard: {
    borderLeftColor: "#2196F3",
    borderLeftWidth: 4,
    borderRadius: 30,
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  packageContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  packageContentMobile: {
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  packageIcon: { margin: 0 },
  packagePrice: { fontSize: 18, fontWeight: "bold" },
  packagePriceTablet: { fontSize: 20 },
  packageTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 4 },
  packageTitleContainer: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  packageTitleTablet: { fontSize: 24 },
  packagesContainer: { marginVertical: 8 },
  packagesContainerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  premiumBadge: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  priceContainerShadow: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
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
  },
  recommendedCard: {
    borderColor: "#FFD700",
    borderLeftColor: "#FFD700",
    // borderLeftWidth: 2,
    borderRadius: 30,
    borderWidth: 2,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  scrollContentTablet: { paddingBottom: 40, paddingHorizontal: 40 },
  skeletonButton: {
    borderRadius: 8,
    height: 40,
    width: "100%",
  },
  skeletonCard: {
    borderLeftColor: "#E0E0E0",
    borderLeftWidth: 4,
    borderRadius: 30,
    flex: 1,
    padding: 16,
  },
  skeletonDescription: {
    borderRadius: 4,
    height: 16,
    marginBottom: 16,
    width: "80%",
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  skeletonPrice: { borderRadius: 8, height: 32, width: "25%" },
  skeletonTitle: { borderRadius: 4, height: 24, width: "40%" },
  statusChip: {},
  statusChipTablet: { height: 40 },
  statusChipTextTablet: { fontSize: 16 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  subtitleTablet: { fontSize: 16, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginLeft: -8 },
  titleContainer: { alignItems: "center", flex: 1, flexDirection: "row" },
  titleTablet: { fontSize: 28 },
  unlimitedCard: {
    borderColor: "#FFD700",
    borderLeftColor: "#FFD700",
    borderLeftWidth: 2,
    borderRadius: 30,
    borderWidth: 2,
    height: 220,
    marginBottom: 16,
    overflow: "hidden",
  },
  unlimitedDescription: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 4,
    marginTop: 4,
    textAlign: "center",
  },
  unlimitedTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 4,
  },
  buyButton: {
    borderRadius: 30,
  },
  buyButtonTablet: {
    borderRadius: 30,
  },
  buyButtonContent: {
    paddingVertical: 2,
  },
  buyButtonLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
  buyButtonLabelTablet: {
    fontSize: 15,
  },
});

export default VPNPackageCard;
