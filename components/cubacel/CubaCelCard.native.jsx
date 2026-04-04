import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, IconButton, Portal, Text } from "react-native-paper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const formatPromoDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = new Intl.DateTimeFormat("es-ES", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
    date,
  );
  return `${day} ${month}`;
};

const normalizeToArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }

  return [];
};

const extractPromoImageUrl = (promos) => {
  for (const promotion of normalizeToArray(promos)) {
    const text = [promotion?.terms, promotion?.description, promotion?.title]
      .filter(Boolean)
      .join(" ");
    const markdownImage = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    if (markdownImage?.[1]) {
      return markdownImage[1];
    }
    const plainUrl = text.match(/https?:\/\/[^\s)]+/i);
    if (plainUrl?.[0]) {
      return plainUrl[0];
    }
  }
  return null;
};

const getPromoStatus = (promotion) => {
  if (!promotion?.startDate) {
    return null;
  }

  const now = new Date();
  const startDate = new Date(promotion.startDate);
  const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

  if (startDate.getTime() > now.getTime()) {
    return "ADELANTADA";
  }

  if (
    startDate.getTime() <= now.getTime() &&
    (!endDate || endDate.getTime() > now.getTime())
  ) {
    return "ACTIVA";
  }

  return null;
};

const toMoneyLabel = (value, currency) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return `${value} ${currency}`;
};

const CubaCelCard = ({ product }) => {
  const {
    benefits,
    description,
    name,
    ocultarFondo = false,
    operator,
    prices,
    promotions,
  } = product || {};

  const [bgLoadError, setBgLoadError] = useState(false);
  const [loadingPrecios, setLoadingPrecios] = useState(true);
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekLayout, setPeekLayout] = useState({
    height: 150,
    width: 280,
    x: 16,
    y: 16,
  });
  const [precioCUP, setPrecioCUP] = useState(null);
  const [precioUYU, setPrecioUYU] = useState(null);
  const cardRef = useRef(null);
  const pressScale = useRef(new Animated.Value(1)).current;
  const peekProgress = useRef(new Animated.Value(0)).current;

  const precioUSD = prices?.retail?.amount || "---";
  const windowWidth = Dimensions.get("window").width;
  const operadorNombre = operator?.name || "ETECSA";
  const normalizedPromotions = useMemo(
    () => normalizeToArray(promotions),
    [promotions],
  );
  const benefitsText = useMemo(
    () =>
      description ||
      benefits?.reduce((accumulator, benefit) => {
        if (benefit.amount?.totalIncludingTax === -1) {
          return accumulator;
        }

        const unit = benefit.type !== "SMS" ? benefit.unit : benefit.type;
        return `${accumulator}${benefit.amount?.totalIncludingTax} ${unit}\n`;
      }, "") ||
      "",
    [benefits, description],
  );
  const noPromoBenefitLines = useMemo(
    () =>
      benefitsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2),
    [benefitsText],
  );
  const hasPromo = normalizedPromotions.length > 0;
  const promotion = hasPromo ? normalizedPromotions[0] : null;
  const promoStatus = getPromoStatus(promotion);
  const promoImageUrl = useMemo(
    () => extractPromoImageUrl(normalizedPromotions),
    [normalizedPromotions],
  );
  const promoStartDate = formatPromoDate(promotion?.startDate);
  const promoEndDate = formatPromoDate(promotion?.endDate);
  const localFallback = require("./Gemini_Generated_Image_rtg44brtg44brtg4.png");
  const backgroundSource =
    promoImageUrl && !bgLoadError ? { uri: promoImageUrl } : localFallback;
  const contextPromoTitle = promotion?.title || name || operadorNombre;

  useEffect(() => {
    const cargarPreciosConvertidos = async () => {
      if (precioUSD === "---" || typeof precioUSD !== "number") {
        setLoadingPrecios(false);
        return;
      }

      try {
        setLoadingPrecios(true);

        const cup = await new Promise((resolve, reject) => {
          Meteor.call(
            "moneda.convertir",
            precioUSD,
            "USD",
            "CUP",
            null,
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(result);
            },
          );
        });

        const uyu = await new Promise((resolve, reject) => {
          Meteor.call(
            "moneda.convertir",
            precioUSD,
            "USD",
            "UYU",
            null,
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(result);
            },
          );
        });

        setPrecioCUP(cup);
        setPrecioUYU(uyu);
      } catch (error) {
        console.error("Error al convertir precios:", error);
      } finally {
        setLoadingPrecios(false);
      }
    };

    cargarPreciosConvertidos();
  }, [precioUSD]);

  const animatePressState = (pressed) => {
    Animated.spring(pressScale, {
      damping: 18,
      mass: 0.8,
      stiffness: 260,
      toValue: pressed ? 0.985 : 1,
      useNativeDriver: true,
    }).start();
  };

  const closePeek = (callback) => {
    Animated.parallel([
      Animated.timing(peekProgress, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(pressScale, {
        damping: 18,
        mass: 0.8,
        stiffness: 260,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setPeekVisible(false);
      callback?.();
    });
  };

  const handleCardPress = () => {
    if (peekVisible) {
      return;
    }

    router.push({
      pathname: "/(normal)/CubacelOferta",
      params: {
        productId: product?._id,
      },
    });
  };

  const openPeek = () => {
    if (!cardRef.current || peekVisible) {
      return;
    }

    cardRef.current.measureInWindow((x, y, width, height) => {
      const safeWidth = width || 280;
      const safeHeight = height || 150;
      const clampedX = Math.min(
        Math.max(12, x),
        Math.max(12, windowWidth - safeWidth - 12),
      );

      setPeekLayout({
        height: safeHeight,
        width: safeWidth,
        x: clampedX,
        y: Math.max(18, y),
      });
      setPeekVisible(true);
      peekProgress.setValue(0);

      Animated.parallel([
        Animated.timing(peekProgress, {
          duration: 240,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(pressScale, {
          damping: 18,
          mass: 0.8,
          stiffness: 260,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handlePeekDetails = () => {
    closePeek(() =>
      router.push({
        pathname: "/(normal)/CubacelOferta",
        params: {
          productId: product?._id,
        },
      }),
    );
  };

  const backdropOpacity = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.24],
  });

  const overlayCardScale = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const overlayCardTranslateY = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  const trayOpacity = peekProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
  });

  const trayTranslateY = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });

  const renderCardVisual = ({ showPeekHint = false, overlayMode = false }) => (
    <Card style={[styles.card, overlayMode ? styles.overlayCard : null]}>
      <ImageBackground
        source={backgroundSource}
        defaultSource={Platform.OS === "ios" ? localFallback : undefined}
        onError={() => setBgLoadError(true)}
        resizeMode="cover"
        imageStyle={styles.imageBackgroundBorder}
        style={styles.imageBackground}
        blurRadius={ocultarFondo || !promoImageUrl ? 35 : 0}
      >
        {!hasPromo ? <View style={styles.noPromoBackgroundOverlay} /> : null}
        <View style={overlayMode ? styles.peekOverlayScrim : null} />

        {hasPromo && promoStatus ? (
          <View
            style={[
              styles.ribbonContainer,
              promoStatus === "ADELANTADA"
                ? styles.ribbonContainerAdelantada
                : null,
            ]}
          >
            <Text style={styles.ribbonText}>
              {promoStatus === "ACTIVA"
                ? "🎁 PROMOCIÓN ACTIVA"
                : "⏰ ADELANTA PROMO"}
            </Text>
          </View>
        ) : null}

        {/* {showPeekHint ? (
          <View style={styles.contextHintBadge}>
            <IconButton
              icon="gesture-tap-hold"
              iconColor="#fff"
              size={14}
              style={styles.contextHintIcon}
            />
            <Text style={styles.contextHintText}>Mantener</Text>
          </View>
        ) : null} */}

        <View
          style={[
            styles.cardContent,
            !hasPromo && {
              paddingBottom: 0,
              minHeight: 200,
            },
          ]}
        >
          {!hasPromo ? (
            <View style={styles.noPromoContent}>
              <View style={styles.noPromoTopRow}>
                <View style={styles.noPromoTag}>
                  <View style={styles.noPromoTagDot} />
                  <Text style={styles.noPromoTagText}>Recarga directa</Text>
                </View>

                <View style={styles.noPromoStatusBadge}>
                  <Text style={styles.noPromoStatusText}>Disponible 24/7</Text>
                </View>
              </View>

              <View style={styles.noPromoHeaderRow}>
                <View style={styles.noPromoIconWrap}>
                  <IconButton
                    icon="cellphone"
                    iconColor="#ffffff"
                    size={18}
                    style={styles.noPromoIcon}
                  />
                </View>

                <View style={styles.noPromoCopyBlock}>
                  <Text style={styles.noPromoEyebrow}>Operador</Text>
                  <Text style={styles.noPromoTitle} numberOfLines={1}>
                    {operadorNombre}
                  </Text>
                  <Text style={styles.noPromoSubtitle} numberOfLines={2}>
                    {name || "Recarga internacional sin promoción activa"}
                  </Text>
                </View>
              </View>

              {noPromoBenefitLines.length ? (
                <View style={styles.noPromoBenefitsPanel}>
                  {noPromoBenefitLines.map((line, index) => (
                    <View
                      key={`${line}-${index}`}
                      style={styles.noPromoBenefitRow}
                    >
                      <View style={styles.noPromoBenefitBullet} />
                      <Text style={styles.noPromoBenefitText} numberOfLines={1}>
                        {line}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.noPromoPriceRow}>
                <View style={styles.noPromoPrimaryPriceChip}>
                  <Text style={styles.noPromoPrimaryPriceLabel}>Precio</Text>
                  <Text
                    style={styles.noPromoPrimaryPriceValue}
                    numberOfLines={1}
                  >
                    {toMoneyLabel(precioUSD, "USD")}
                  </Text>
                </View>

                <View style={styles.noPromoSecondaryPriceWrap}>
                  {!loadingPrecios && precioCUP !== null ? (
                    <View style={styles.noPromoSecondaryPricePillBlue}>
                      <Text
                        style={styles.noPromoSecondaryPriceText}
                        numberOfLines={1}
                      >
                        {toMoneyLabel(precioCUP, "CUP")}
                      </Text>
                    </View>
                  ) : null}

                  {!loadingPrecios && precioUYU !== null ? (
                    <View style={styles.noPromoSecondaryPricePillOrange}>
                      <Text
                        style={styles.noPromoSecondaryPriceText}
                        numberOfLines={1}
                      >
                        {toMoneyLabel(precioUYU, "UYU")}
                      </Text>
                    </View>
                  ) : null}

                  {loadingPrecios ? (
                    <View style={styles.noPromoSecondaryPricePillGray}>
                      <Text style={styles.noPromoSecondaryPriceText}>
                        Cargando precios...
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                {!promoImageUrl ? (
                  <>
                    <IconButton icon="cellphone" iconColor="white" size={16} />
                    <Text
                      style={styles.title}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {operadorNombre}
                    </Text>
                  </>
                ) : null}
              </View>

              {benefitsText !== "" && !promoImageUrl ? (
                <Text
                  style={styles.beneficios}
                >{`Beneficios: \n${benefitsText}`}</Text>
              ) : null}

              <View style={styles.chips}>
                <View style={styles.chipsComponentGreen}>
                  <Text style={styles.chipText}>
                    {toMoneyLabel(precioUSD, "USD")}
                  </Text>
                </View>

                {!loadingPrecios && precioCUP !== null ? (
                  <View style={styles.chipsComponentBlue}>
                    <Text style={styles.chipText}>
                      {toMoneyLabel(precioCUP, "CUP")}
                    </Text>
                  </View>
                ) : null}

                {!loadingPrecios && precioUYU !== null ? (
                  <View style={styles.chipsComponentOrange}>
                    <Text style={styles.chipText}>
                      {toMoneyLabel(precioUYU, "UYU")}
                    </Text>
                  </View>
                ) : null}

                {loadingPrecios ? (
                  <View style={styles.chipsComponentGray}>
                    <Text style={styles.chipText}>Cargando Precios...</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>

        {hasPromo && promoStartDate && promoEndDate ? (
          <View style={styles.promoFooter}>
            <View style={styles.promoFooterContent}>
              <IconButton
                icon="calendar-clock"
                iconColor="#fff"
                size={14}
                style={styles.promoFooterIcon}
              />
              <Text
                style={styles.promoFooterText}
              >{`${promoStartDate} - ${promoEndDate}`}</Text>
            </View>
          </View>
        ) : null}
      </ImageBackground>
    </Card>
  );

  if (precioUSD === "---") {
    return null;
  }

  return (
    <View style={styles.rootContainer}>
      <View ref={cardRef} collapsable={false}>
        <Animated.View
          style={[
            styles.cardWrapper,
            peekVisible ? styles.cardWrapperHidden : null,
            {
              transform: [{ scale: pressScale }],
            },
          ]}
        >
          <Pressable
            onLongPress={openPeek}
            onPress={handleCardPress}
            onPressIn={() => animatePressState(true)}
            onPressOut={() => animatePressState(false)}
            delayLongPress={500}
          >
            {renderCardVisual({ showPeekHint: true })}
          </Pressable>
        </Animated.View>
      </View>

      <Portal>
        {peekVisible ? (
          <View style={styles.peekPortalLayer} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closePeek()}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.peekBackdrop, { opacity: backdropOpacity }]}
              />
            </Pressable>

            <View
              pointerEvents="box-none"
              style={[
                styles.peekOverlayColumn,
                {
                  left: peekLayout.x,
                  top: peekLayout.y,
                  width: peekLayout.width,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.peekCardContainer,
                  {
                    transform: [
                      { translateY: overlayCardTranslateY },
                      { scale: overlayCardScale },
                    ],
                  },
                ]}
              >
                {renderCardVisual({ overlayMode: true })}
              </Animated.View>

              <Animated.View
                style={[
                  styles.peekTray,
                  {
                    opacity: trayOpacity,
                    transform: [{ translateY: trayTranslateY }],
                  },
                ]}
              >
                <View style={styles.peekTrayHandle} />

                <View style={styles.peekTrayHeader}>
                  <ImageBackground
                    source={backgroundSource}
                    defaultSource={
                      Platform.OS === "ios" ? localFallback : undefined
                    }
                    imageStyle={styles.peekTrayThumbBorder}
                    resizeMode="cover"
                    style={styles.peekTrayThumb}
                  >
                    <View style={styles.peekTrayThumbScrim} />
                  </ImageBackground>

                  <View style={styles.peekTrayCopy}>
                    <Text style={styles.peekTrayEyebrow}>Menu contextual</Text>
                    <Text style={styles.peekTrayTitle} numberOfLines={3}>
                      {contextPromoTitle}
                    </Text>
                    {promoStartDate && promoEndDate ? (
                      <Text style={styles.peekTrayMeta}>
                        {`${promoStartDate} - ${promoEndDate}`}
                      </Text>
                    ) : null}
                    {/* {contextPromoTerms ? (
                      <Text style={styles.peekTrayTerms} numberOfLines={2}>
                        {contextPromoTerms}
                      </Text>
                    ) : null} */}
                  </View>
                </View>

                <View style={styles.peekActionRow}>
                  <Button
                    compact
                    icon="file-document-outline"
                    mode="contained-tonal"
                    onPress={handlePeekDetails}
                    style={styles.peekSecondaryAction}
                    contentStyle={styles.peekActionContent}
                    labelStyle={styles.peekSecondaryActionLabel}
                  >
                    Ver promo
                  </Button>
                  {/* <Button
                    compact
                    icon="shopping-outline"
                    mode="contained"
                    onPress={handleMenuRecarga}
                    style={styles.peekPrimaryAction}
                    contentStyle={styles.peekActionContent}
                    labelStyle={styles.peekPrimaryActionLabel}
                  >
                    Recargar
                  </Button> */}
                </View>

                <Text style={styles.peekDismissHint}>
                  Toca afuera para cerrar
                </Text>
              </Animated.View>
            </View>
          </View>
        ) : null}
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    margin: 15,
  },
  card: {
    backgroundColor: "#0b3d2e",
    borderRadius: 20,
    height: 150,
    overflow: "hidden",
    width: 280,
  },
  overlayCard: {
    elevation: 14,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.34,
    shadowRadius: 28,
  },
  cardWrapper: {
    borderRadius: 20,
    shadowColor: "#04120d",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  cardWrapperHidden: {
    opacity: 0.0,
  },
  imageBackground: {
    borderRadius: 20,
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 0,
    margin: 0,
    backgroundColor: "transparent",
  },
  peekOverlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  noPromoBackgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 16, 30, 0.52)",
  },
  imageBackgroundBorder: {
    borderRadius: 20,
    minHeight: 200,
    minWidth: "100%",
    maxHeight: 200,
    maxWidth: "100%",
    position: "absolute",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 120,
    overflow: "hidden",
    paddingBottom: 8,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  noPromoContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  noPromoTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  noPromoTag: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  noPromoTagDot: {
    backgroundColor: "#58d68d",
    borderRadius: 999,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  noPromoTagText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  noPromoStatusBadge: {
    backgroundColor: "rgba(8, 145, 178, 0.2)",
    borderColor: "rgba(103, 232, 249, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  noPromoStatusText: {
    color: "#dff8ff",
    fontSize: 9,
    fontWeight: "700",
  },
  noPromoHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  noPromoIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(10, 110, 180, 0.24)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  noPromoIcon: {
    margin: 0,
  },
  noPromoCopyBlock: {
    flex: 1,
    paddingLeft: 10,
  },
  noPromoEyebrow: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  noPromoTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  noPromoSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    lineHeight: 14,
    marginTop: 3,
  },
  noPromoBenefitsPanel: {
    backgroundColor: "rgba(3, 12, 24, 0.38)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noPromoBenefitRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  noPromoBenefitBullet: {
    backgroundColor: "#60a5fa",
    borderRadius: 999,
    height: 5,
    marginRight: 8,
    width: 5,
  },
  noPromoBenefitText: {
    color: "rgba(255,255,255,0.92)",
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  noPromoPriceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginTop: 8,
  },
  noPromoPrimaryPriceChip: {
    backgroundColor: "rgba(12, 86, 58, 0.96)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noPromoPrimaryPriceLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  noPromoPrimaryPriceValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 1,
  },
  noPromoSecondaryPriceWrap: {
    alignItems: "flex-end",
    flexShrink: 0,
    justifyContent: "flex-end",
    width: 102,
  },
  noPromoSecondaryPricePillBlue: {
    backgroundColor: "rgba(33, 150, 243, 0.92)",
    borderRadius: 999,
    minHeight: 18,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  noPromoSecondaryPricePillOrange: {
    backgroundColor: "rgba(255, 152, 0, 0.94)",
    borderRadius: 999,
    marginTop: 5,
    minHeight: 18,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  noPromoSecondaryPricePillGray: {
    backgroundColor: "rgba(100, 116, 139, 0.95)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 39,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noPromoSecondaryPriceText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  contextHintBadge: {
    alignItems: "center",
    backgroundColor: "rgba(8, 15, 32, 0.62)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    left: 10,
    paddingHorizontal: 6,
    position: "absolute",
    top: 10,
    zIndex: 40,
  },
  contextHintIcon: {
    margin: 0,
  },
  contextHintText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: -2,
    paddingRight: 6,
    textTransform: "uppercase",
  },
  peekPortalLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  peekBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  peekOverlayColumn: {
    position: "absolute",
  },
  peekCardContainer: {
    zIndex: 3,
  },
  peekTray: {
    backgroundColor: "rgba(5, 12, 24, 0.96)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    elevation: 12,
    marginTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  peekTrayHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 42,
  },
  peekTrayHeader: {
    flexDirection: "row",
  },
  peekTrayThumb: {
    borderRadius: 16,
    height: 88,
    overflow: "hidden",
    width: 88,
  },
  peekTrayThumbBorder: {
    borderRadius: 16,
  },
  peekTrayThumbScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 12, 24, 0.2)",
  },
  peekTrayCopy: {
    flex: 1,
    paddingLeft: 12,
  },
  peekTrayEyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  peekTrayTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  peekTrayMeta: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  peekTrayTerms: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  peekActionRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  peekActionContent: {
    minHeight: 40,
  },
  peekSecondaryAction: {
    borderRadius: 14,
    flex: 1,
    marginRight: 8,
  },
  peekPrimaryAction: {
    borderRadius: 14,
    flex: 1,
  },
  peekSecondaryActionLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  peekPrimaryActionLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  peekDismissHint: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
  },
  title: {
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 14,
    fontWeight: "bold",
    maxWidth: 200,
  },
  beneficios: {
    fontSize: 12,
    marginLeft: 8,
    // marginTop: -35,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
    paddingTop: 8,
    paddingBottom: 0,
    paddingLeft: 8,
  },
  chipsComponentGreen: {
    alignContent: "center",
    backgroundColor: "#4caf50",
    borderRadius: 25,
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  chipsComponentBlue: {
    alignContent: "center",
    backgroundColor: "#2196f3",
    borderRadius: 25,
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  chipsComponentOrange: {
    alignContent: "center",
    backgroundColor: "#ff9800",
    borderRadius: 25,
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  chipsComponentGray: {
    alignContent: "center",
    backgroundColor: "#9e9e9e",
    borderRadius: 25,
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  chipText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  ribbonContainer: {
    alignItems: "center",
    backgroundColor: "#4caf50",
    elevation: 5,
    justifyContent: "center",
    paddingHorizontal: 45,
    paddingVertical: 6,
    position: "absolute",
    right: -55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4.65,
    top: 25,
    transform: [{ rotate: "45deg" }],
    zIndex: 100,
  },
  ribbonContainerAdelantada: {
    backgroundColor: "#FF6F00",
  },
  ribbonText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
  },
  promoFooter: {
    backgroundColor: "rgba(0, 0, 102, 0.80)",
    width: "100%",
    height: 32,
  },
  promoFooterContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  promoFooterIcon: {
    margin: 0,
    padding: 0,
  },
  promoFooterText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

export default CubaCelCard;
