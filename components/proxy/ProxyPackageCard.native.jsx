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

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const getColumnsCount = (screenWidth, screenHeight) => {
  const isLandscape = screenWidth > screenHeight;
  if (screenWidth >= 1200) return isLandscape ? 3 : 3;
  if (screenWidth >= 900) return isLandscape ? 3 : 2;
  if (screenWidth >= 600) return isLandscape ? 3 : 2;
  if (screenWidth >= 400) return 1;
  return 1;
};

const ProxyPackageCard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;
  const proxyColor = theme.dark ? "#42A5F5" : "#2196F3";
  const headerInset = useAppHeaderContentInset();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width,
  );
  const [descuentoProxy, setDescuentoProxy] = useState(0);
  const [isIlimitado, setIsIlimitado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [megasActuales, setMegasActuales] = useState(0);
  const [paquetePorTiempo, setPaquetePorTiempo] = useState(null);
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([]);

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
    const loadUserProxyData = async () => {
      const user = await Meteor.user();
      if (!user) {
        return;
      }

      setMegasActuales(user.megas || 0);
      setIsIlimitado(user.isIlimitado || false);
      setDescuentoProxy(user.descuentoproxy || 0);
    };

    loadUserProxyData();
  }, []);

  useEffect(() => {
    setLoading(true);
    Meteor.call("precios.getAllProxyVPNPackages", "PROXY", (error, result) => {
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
    if (user?.baneado === false && !isIlimitado) {
      Alert.alert(
        "Paquete Proxy Activo",
        "Ya tienes un paquete Proxy activo. Debes consumirlo antes de comprar otro.",
        [{ style: "cancel", text: "Entendido" }],
      );
      return;
    }

    router.push({
      pathname: "/(normal)/ProxyPurchase",
      params: {
        descuentoProxy: String(descuentoProxy || 0),
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
                height: isTablet ? 236 : 220,
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
    const proxyColor = theme.dark ? "#42A5F5" : "#2196F3";
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
            height: isTablet ? 236 : 220,
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
            {
              backgroundColor: theme.dark ? "#151D26" : "#F7FBFF",
              borderColor: isRecommended
                ? theme.dark
                  ? "rgba(255, 215, 0, 0.38)"
                  : "rgba(184, 134, 11, 0.28)"
                : theme.dark
                  ? "rgba(66, 165, 245, 0.30)"
                  : "rgba(33, 150, 243, 0.20)",
              height: "100%",
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.accentOrb, { backgroundColor: proxyColor }]}
          />

          <View
            style={[
              styles.packageContent,
              !isTablet && styles.packageContentMobile,
            ]}
          >
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.serviceBadge,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(66, 165, 245, 0.14)"
                      : "#E8F4FD",
                  },
                ]}
              >
                <IconButton
                  icon="wifi"
                  size={12}
                  iconColor={proxyColor}
                  style={styles.metaIcon}
                />
                <Paragraph
                  style={[styles.serviceText, { color: proxyColor }]}
                  numberOfLines={1}
                >
                  PROXY
                </Paragraph>
              </View>
              {isRecommended ? (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: theme.dark ? "#1976D2" : "#1565C0",
                    },
                  ]}
                >
                  <IconButton
                    icon="star"
                    size={11}
                    iconColor="#FFFFFF"
                    style={styles.metaIcon}
                  />
                    <Paragraph style={styles.statusText} numberOfLines={1}>
                      POPULAR
                    </Paragraph>
                </View>
              ) : null}
            </View>

            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(66, 165, 245, 0.14)"
                        : "#E8F4FD",
                    },
                  ]}
                >
                  <IconButton
                    icon="database-outline"
                    size={isTablet ? 25 : 21}
                    iconColor={proxyColor}
                    style={styles.packageIcon}
                  />
                </View>
                <View style={styles.packageTitleCopy}>
                  <Paragraph style={styles.packageEyebrow}>CAPACIDAD</Paragraph>
                  <Title
                    style={[
                      styles.packageTitle,
                      isTablet && styles.packageTitleTablet,
                      { color: proxyColor },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {megasToGB(paquete.megas)}
                  </Title>
                </View>
              </View>
              <View
                style={[
                  styles.priceContainer,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(66, 165, 245, 0.15)"
                      : "#E3F2FD",
                  },
                ]}
              >
                <Paragraph
                  style={[
                    styles.packagePrice,
                    isTablet && styles.packagePriceTablet,
                    { color: proxyColor },
                  ]}
                  numberOfLines={1}
                >
                  ${paquete.precio}
                </Paragraph>
                <Paragraph
                  style={[styles.priceCurrency, { color: proxyColor }]}
                >
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
                accessibilityLabel={`Comprar paquete Proxy ${megasToGB(
                  paquete.megas,
                )} por ${paquete.precio} CUP`}
                accessibilityHint="Abre el resumen de compra del paquete Proxy"
                icon="cart-plus"
                buttonColor={
                  isRecommended
                    ? theme.dark
                      ? "#1976D2"
                      : "#1565C0"
                    : proxyColor
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
    const premiumWidthDelta = 8;
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
            height: isTablet ? 252 : 232,
            marginBottom: gutter,
            width: cardWidthPx,
          },
        ]}
      >
        <Surface
          style={[
            styles.unlimitedCard,
            {
              backgroundColor: theme.dark ? "#211F14" : "#FFFDF5",
              borderColor: theme.dark
                ? "rgba(255, 215, 0, 0.38)"
                : "rgba(184, 134, 11, 0.28)",
              height: "100%",
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.accentOrb, { backgroundColor: goldColor }]}
          />

          <View
            style={[
              styles.packageContent,
              !isTablet && styles.packageContentMobile,
            ]}
          >
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.serviceBadge,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(255, 215, 0, 0.14)"
                      : "#FFF6CC",
                  },
                ]}
              >
                <IconButton
                  icon="wifi"
                  size={12}
                  iconColor={goldColor}
                  style={styles.metaIcon}
                />
                <Paragraph
                  style={[styles.serviceText, { color: goldColor }]}
                  numberOfLines={1}
                >
                  PROXY
                </Paragraph>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: goldColor }]}
              >
                <IconButton
                  icon="crown"
                  size={11}
                  iconColor="#241F00"
                  style={styles.metaIcon}
                />
                <Paragraph
                  style={[styles.statusText, { color: "#241F00" }]}
                  numberOfLines={1}
                >
                  PREMIUM
                </Paragraph>
              </View>
            </View>

            <View style={styles.packageHeader}>
              <View style={styles.packageTitleContainer}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(255, 215, 0, 0.14)"
                        : "#FFF6CC",
                    },
                  ]}
                >
                  <IconButton
                    icon="infinity"
                    size={isTablet ? 27 : 23}
                    iconColor={goldColor}
                    style={styles.packageIcon}
                  />
                </View>
                <View style={styles.packageTitleCopy}>
                  <Paragraph style={styles.packageEyebrow}>30 DÍAS</Paragraph>
                  <Title
                    style={[
                      styles.unlimitedTitle,
                      isTablet && styles.packageTitleTablet,
                      { color: goldColor },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Ilimitado
                  </Title>
                </View>
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
                  numberOfLines={1}
                >
                  ${paquetePorTiempo.precio}
                </Paragraph>
                <Paragraph style={[styles.priceCurrency, { color: goldColor }]}>
                  CUP
                </Paragraph>
              </View>
            </View>

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
                accessibilityLabel={`Comprar paquete Proxy ilimitado por ${paquetePorTiempo.precio} CUP`}
                accessibilityHint="Abre el resumen de compra del paquete Proxy Premium"
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
        title="Paquetes Proxy"
        subtitle="Internet rápido y sin límites 🚀"
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
                icon="wifi"
                size={isTablet ? 40 : 32}
                iconColor={proxyColor}
              />
              <Title
                style={[
                  styles.title,
                  isTablet && styles.titleTablet,
                  { color: proxyColor },
                ]}
              >
                Paquetes Proxy
              </Title>
            </View>
          </View>

          <Paragraph
            style={[styles.subtitle, isTablet && styles.subtitleTablet]}
          >
            Internet rápido y sin límites 🚀
          </Paragraph>

          <View style={styles.currentStatus}>
            <Chip
              icon={isIlimitado ? "infinity" : "database"}
              style={[
                styles.statusChip,
                isTablet && styles.statusChipTablet,
                {
                  backgroundColor: theme.dark
                    ? "rgba(66, 165, 245, 0.15)"
                    : "#E3F2FD",
                },
              ]}
              textStyle={isTablet ? styles.statusChipTextTablet : undefined}
            >
              Saldo: {isIlimitado ? "Ilimitado" : megasToGB(megasActuales)}
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
                    icon="package-variant"
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
            textColor={proxyColor}
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
  screen: {
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },
  cardContentLargeTablet: {
    paddingHorizontal: 32,
  },
  cardContentMobile: {
    padding: 8,
  },
  currentStatus: {
    alignItems: "flex-start",
    marginBottom: 24,
    maxHeight: 30,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontStyle: "italic",
    marginTop: 16,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    marginTop: 24,
  },
  historyButtonTablet: {
    borderRadius: 10,
    marginTop: 32,
  },
  historyButtonContent: {
    paddingVertical: 4,
  },
  packageActions: {
    justifyContent: "center",
    marginTop: 8,
  },
  packageCard: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  packageContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  packageContentMobile: {
    padding: 14,
  },
  packageDescription: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  packageDescriptionTablet: {
    fontSize: 12,
    lineHeight: 16,
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
    borderRadius: 90,
    height: 170,
    opacity: 0.06,
    position: "absolute",
    right: -72,
    top: -78,
    width: 170,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
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
    marginBottom: 10,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  packagePriceTablet: {
    fontSize: 18,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
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
    fontSize: 19,
  },
  packagesContainer: {
    marginVertical: 8,
  },
  packagesContainerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  serviceBadge: {
    alignItems: "center",
    flexDirection: "row",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  serviceText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  priceContainer: {
    alignItems: "baseline",
    borderRadius: 12,
    flexDirection: "row",
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  priceContainerShadow: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
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
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scrollContentTablet: {
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  skeletonButton: {
    borderRadius: 20,
    height: 36,
    marginTop: "auto",
    width: "100%",
  },
  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
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
  skeletonPrice: {
    borderRadius: 8,
    height: 32,
    width: "25%",
  },
  skeletonTitle: {
    borderRadius: 4,
    height: 24,
    width: "40%",
  },
  statusChip: {},
  statusChipTablet: {
    height: 40,
  },
  statusChipTextTablet: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  subtitleTablet: {
    fontSize: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: -8,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  titleTablet: {
    fontSize: 28,
  },
  unlimitedCard: {
    borderRadius: 20,
    borderWidth: 1,
    height: 232,
    marginBottom: 16,
    overflow: "hidden",
  },
  unlimitedTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  buyButton: {
    borderRadius: 14,
    width: "100%",
  },
  buyButtonTablet: {
    borderRadius: 14,
  },
  buyButtonContent: {
    minHeight: 38,
    paddingVertical: 2,
  },
  buyButtonLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  buyButtonLabelTablet: {
    fontSize: 13,
  },
});

export default ProxyPackageCard;
