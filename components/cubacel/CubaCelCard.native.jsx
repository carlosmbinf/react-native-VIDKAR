import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
      Image,
    ImageBackground,
    InteractionManager,
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

const extractPromoImageUrl = (promos, product = null) => {
  const promotionsList = normalizeToArray(promos);

  for (const promotion of promotionsList) {
    if (!promotion || typeof promotion !== "object") {
      continue;
    }

    // 1. Direct image properties on promotion object
    const directUrl =
      promotion.imageUrl ||
      promotion.image_url ||
      promotion.image ||
      promotion.bannerUrl ||
      promotion.banner_url ||
      promotion.mediaUrl ||
      promotion.media_url ||
      promotion.src;

    if (
      typeof directUrl === "string" &&
      directUrl.trim().length > 0 &&
      directUrl.trim().startsWith("http")
    ) {
      return directUrl.trim();
    }

    // 2. Search text fields (terms, terms_and_conditions, description, title)
    const textSources = [
      promotion.terms,
      promotion.terms_and_conditions,
      promotion.description,
      promotion.title,
    ]
      .filter((text) => typeof text === "string" && text.trim().length > 0)
      .join(" ");

    if (textSources) {
      // Markdown image: ![alt](https://...)
      const markdownMatch = textSources.match(
        /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i,
      );
      if (markdownMatch?.[1]) {
        return markdownMatch[1].trim();
      }

      // HTML img tag src: <img src="https://..." />
      const htmlMatch = textSources.match(
        /<img[^>]+src=["'](https?:\/\/[^"'\s]+)["']/i,
      );
      if (htmlMatch?.[1]) {
        return htmlMatch[1].trim();
      }

      // Image URL with extension
      const imageExtMatch = textSources.match(
        /https?:\/\/[^\s<>"')]+?\.(?:png|jpg|jpeg|webp|gif|svg)(?:\?[^\s<>"')]*|)/i,
      );
      if (imageExtMatch?.[0]) {
        return imageExtMatch[0].replace(/[.,;:)]+$/, "").trim();
      }

      // Any plain HTTP/HTTPS URL
      const plainUrlMatch = textSources.match(/https?:\/\/[^\s<>"')]+/i);
      if (plainUrlMatch?.[0]) {
        return plainUrlMatch[0].replace(/[.,;:)]+$/, "").trim();
      }
    }
  }

  // 3. Direct image properties or description on product object
  if (product && typeof product === "object") {
    const productUrl =
      product.imageUrl ||
      product.image_url ||
      product.image ||
      product.bannerUrl ||
      product.banner_url ||
      product.mediaUrl ||
      product.media_url;

    if (
      typeof productUrl === "string" &&
      productUrl.trim().length > 0 &&
      productUrl.trim().startsWith("http")
    ) {
      return productUrl.trim();
    }

    if (typeof product.description === "string" && product.description.trim()) {
      const descMarkdownMatch = product.description.match(
        /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i,
      );
      if (descMarkdownMatch?.[1]) {
        return descMarkdownMatch[1].trim();
      }

      const descUrlMatch = product.description.match(
        /https?:\/\/[^\s<>"')]+?\.(?:png|jpg|jpeg|webp|gif|svg)(?:\?[^\s<>"')]*|)/i,
      );
      if (descUrlMatch?.[0]) {
        return descUrlMatch[0].replace(/[.,;:)]+$/, "").trim();
      }
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

const conversionCache = new Map();
let conversionQueue = Promise.resolve();

const getConversionCacheKey = (amount, currency) => `${amount}:USD:${currency}`;

const convertCurrency = (amount, currency) =>
  new Promise((resolve, reject) => {
    Meteor.call(
      "moneda.convertir",
      amount,
      "USD",
      currency,
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

const getCachedConvertedPrice = (amount, currency) => {
  const cacheKey = getConversionCacheKey(amount, currency);

  if (conversionCache.has(cacheKey)) {
    return Promise.resolve(conversionCache.get(cacheKey));
  }

  const task = conversionQueue.then(async () => {
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey);
    }

    const result = await convertCurrency(amount, currency);
    conversionCache.set(cacheKey, result);
    return result;
  });

  conversionQueue = task.catch(() => undefined);
  return task;
};

const CubaCelCard = ({ product, fullWidth = false, style }) => {
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
    () => extractPromoImageUrl(normalizedPromotions, product),
    [normalizedPromotions, product],
  );
  const promoStartDate = formatPromoDate(promotion?.startDate);
  const promoEndDate = formatPromoDate(promotion?.endDate);
  const localFallback = require("./Gemini_Generated_Image_rtg44brtg44brtg4.png");
  const promoImageSource =
    promoImageUrl && !bgLoadError ? { uri: promoImageUrl }  : localFallback;
  const contextPromoTitle = promotion?.title || name || operadorNombre;

  useEffect(() => {
    setBgLoadError(false);
  }, [promoImageUrl]);

  useEffect(() => {
    let cancelled = false;
    let interactionTask = null;

    const cargarPreciosConvertidos = async () => {
      if (precioUSD === "---" || typeof precioUSD !== "number") {
        setLoadingPrecios(false);
        return;
      }

      try {
        if (cancelled) return;
        setLoadingPrecios(true);

        const [cup, uyu] = await Promise.all([
          getCachedConvertedPrice(precioUSD, "CUP"),
          getCachedConvertedPrice(precioUSD, "UYU"),
        ]);

        if (cancelled) return;
        setPrecioCUP(cup);
        setPrecioUYU(uyu);
      } catch (error) {
        console.error("Error al convertir precios:", error);
      } finally {
        if (!cancelled) {
          setLoadingPrecios(false);
        }
      }
    };

    interactionTask = InteractionManager.runAfterInteractions(() => {
      cargarPreciosConvertidos();
    });

    return () => {
      cancelled = true;
      interactionTask?.cancel?.();
    };
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
    <Card
      style={[
        styles.card,
        fullWidth ? styles.cardFullWidth : styles.cardCarousel,
        !hasPromo ? styles.cardNoPromo : null,
        overlayMode ? styles.overlayCard : null,
      ]}
    >
      <ImageBackground
        source={promoImageSource}
        defaultSource={Platform.OS === "ios" ? localFallback : undefined}
        onError={() => setBgLoadError(true)}
        resizeMode="cover"
        style={styles.imageLayer}
        blurRadius={ocultarFondo ? 35 : 0}
      />
      <View style={styles.cardSurface}>
        

        {hasPromo ? (
          <LinearGradient
            colors={[
              "rgba(5, 12, 24, 0.42)",
              "rgba(5, 12, 24, 0.08)",
              "rgba(4, 9, 20, 0.58)",
              "rgba(3, 7, 18, 0.78)",
            ]}
            locations={[0, 0.3, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.noPromoBackgroundOverlay} />
        )}

        {overlayMode ? <View style={styles.peekOverlayScrim} /> : null}

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
            <View style={styles.promoContent}>
              <View style={styles.promoTopRow}>
                <View style={styles.promoTag}>
                  <View style={styles.promoTagDot} />
                  <Text style={styles.promoTagText}>{operadorNombre}</Text>
                </View>

                {promoStatus ? (
                  <View
                    style={[
                      styles.promoStatusBadge,
                      promoStatus === "ADELANTADA"
                        ? styles.promoStatusBadgeAdelantada
                        : styles.promoStatusBadgeActiva,
                    ]}
                  >
                    <Text
                      style={[
                        styles.promoStatusBadgeText,
                        promoStatus === "ADELANTADA"
                          ? styles.promoStatusBadgeTextAdelantada
                          : styles.promoStatusBadgeTextActiva,
                      ]}
                    >
                      {promoStatus === "ACTIVA"
                        ? "🎁 PROMO ACTIVA"
                        : "⏰ ADELANTA PROMO"}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.promoMiddleBlock}>
                <Text style={styles.promoTitle} numberOfLines={1}>
                  {promotion?.title || name || "Oferta Especial"}
                </Text>
                {promoStartDate && promoEndDate ? (
                  <View style={styles.promoDatesRow}>
                    <IconButton
                      icon="calendar-clock"
                      iconColor="#93c5fd"
                      size={14}
                      style={styles.promoCalendarIcon}
                    />
                    <Text style={styles.promoDatesText}>
                      {`${promoStartDate} - ${promoEndDate}`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.noPromoPriceRow}>
                <View style={styles.promoPrimaryPriceChip}>
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
          )}
        </View>
      </View>
    </Card>
  );

  if (precioUSD === "---") {
    return null;
  }

  return (
    <View
      style={[
        fullWidth ? styles.rootContainerFull : styles.rootContainerCarousel,
        style,
      ]}
    >
      <View
        ref={cardRef}
        collapsable={false}
        style={fullWidth ? styles.fullWidth : null}
      >
        <Animated.View
          style={[
            styles.cardWrapper,
            fullWidth ? styles.fullWidth : null,
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
            style={fullWidth ? styles.fullWidth : null}
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
                  <View style={styles.peekTrayThumb}>
                    <Image
                      source={promoImageSource}
                      defaultSource={
                        Platform.OS === "ios" ? localFallback : undefined
                      }
                      onError={() => setBgLoadError(true)}
                      resizeMode="cover"
                      style={styles.peekTrayThumbImage}
                    />
                    <View style={styles.peekTrayThumbScrim} />
                  </View>

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
  rootContainerCarousel: {
    margin: 15,
  },
  rootContainerFull: {
    margin: 0,
    width: "100%",
  },
  fullWidth: {
    width: "100%",
  },
  card: {
    backgroundColor: "#0b3d2e",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  cardSurface: {
    flex: 1,
    minHeight: 0,
    // position: "relative",
    ...StyleSheet.absoluteFill,
  },
  cardCarousel: {
    height: 205,
    width: 285,
  },
  cardFullWidth: {
    height: 205,
    width: "100%",
  },
  cardNoPromo: {
    height: undefined,
    minHeight: 205,
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
  imageLayer: {
    // ...StyleSheet.absoluteFill,
    borderRadius: 20,
    height: "100%",
    overflow: "hidden",
    // width: "100%",
    maxHeight: 200,
  },
  peekOverlayScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  noPromoBackgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(6, 16, 30, 0.52)",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 205,
    overflow: "hidden",
    paddingBottom: 8,
    paddingTop: 10,
    backgroundColor: "transparent",
    position: "relative",
    zIndex: 1,
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
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  peekBackdrop: {
    ...StyleSheet.absoluteFill,
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
  peekTrayThumbImage: {
    ...StyleSheet.absoluteFill,
    height: "100%",
    width: "100%",
  },
  peekTrayThumbBorder: {
    borderRadius: 16,
  },
  peekTrayThumbScrim: {
    ...StyleSheet.absoluteFill,
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
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 14,
    fontWeight: "bold",
    maxWidth: "85%",
  },
  beneficios: {
    fontSize: 12,
    marginLeft: 8,
  },
  promoContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  promoTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  promoTag: {
    alignItems: "center",
    backgroundColor: "rgba(10, 20, 36, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  promoTagDot: {
    backgroundColor: "#38bdf8",
    borderRadius: 999,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  promoTagText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  promoStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  promoStatusBadgeActiva: {
    backgroundColor: "rgba(16, 185, 129, 0.26)",
    borderColor: "rgba(52, 211, 153, 0.45)",
  },
  promoStatusBadgeAdelantada: {
    backgroundColor: "rgba(245, 158, 11, 0.28)",
    borderColor: "rgba(251, 191, 36, 0.48)",
  },
  promoStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  promoStatusBadgeTextActiva: {
    color: "#6ee7b7",
  },
  promoStatusBadgeTextAdelantada: {
    color: "#fde68a",
  },
  promoMiddleBlock: {
    marginVertical: 4,
  },
  promoTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promoDatesRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 2,
  },
  promoCalendarIcon: {
    margin: 0,
    marginLeft: -6,
    padding: 0,
  },
  promoDatesText: {
    color: "rgba(219, 234, 254, 0.95)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promoPrimaryPriceChip: {
    backgroundColor: "rgba(16, 110, 75, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});

export default CubaCelCard;
