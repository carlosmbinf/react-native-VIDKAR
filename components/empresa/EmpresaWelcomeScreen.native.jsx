import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    ScrollView,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const EMPRESA_USER_FIELDS = {
  empresaBloqueada: 1,
  empresaTerminosCondicionesAcepted: 1,
  fechaEmpresaTerminosCondicionesAcepted: 1,
  permiteEmpresa: 1,
  "profile.firstName": 1,
  "profile.roleComercio": 1,
  username: 1,
};

const HERO_PRIMARY_GLOW_SIZE = 190;
const HERO_SECONDARY_GLOW_SIZE = 170;
const HERO_GLOW_VISUAL_PADDING = 18;

const getGlowBounds = (cardSize, glowSize) => ({
  minX: HERO_GLOW_VISUAL_PADDING,
  maxX: Math.max(
    HERO_GLOW_VISUAL_PADDING,
    cardSize.width - glowSize - HERO_GLOW_VISUAL_PADDING,
  ),
  minY: HERO_GLOW_VISUAL_PADDING,
  maxY: Math.max(
    HERO_GLOW_VISUAL_PADDING,
    cardSize.height - glowSize - HERO_GLOW_VISUAL_PADDING,
  ),
});

const GLOW_MOTION_PATTERNS = {
  primarySweep: {
    x: ["max", "max", "min", "min", "max"],
    y: ["min", "max", "max", "min", "min"],
  },
  secondarySweep: {
    x: ["min", "max", "max", "min", "min"],
    y: ["max", "max", "min", "min", "max"],
  },
};

const resolveGlowPoint = (key, bounds) => bounds[key] ?? bounds.minX;

const buildGlowMotion = (progress, cardSize, glowSize, patternName) => {
  const { minX, maxX, minY, maxY } = getGlowBounds(cardSize, glowSize);
  const xDistance = maxX - minX;
  const yDistance = maxY - minY;
  const bounds = {
    min: minX,
    max: maxX,
    mid: minX + xDistance * 0.5,
    innerMin: minX + xDistance * 0.24,
    innerMax: minX + xDistance * 0.76,
  };
  const yBounds = {
    min: minY,
    max: maxY,
    mid: minY + yDistance * 0.5,
    innerMin: minY + yDistance * 0.24,
    innerMax: minY + yDistance * 0.76,
  };
  const pattern = GLOW_MOTION_PATTERNS[patternName] || GLOW_MOTION_PATTERNS.primarySweep;

  return {
    translateX: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.x.map((key) => resolveGlowPoint(key, bounds)),
    }),
    translateY: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.y.map((key) => resolveGlowPoint(key, yBounds)),
    }),
  };
};

const SLIDES = [
  {
    accent: "#38bdf8",
    icon: "storefront-outline",
    eyebrow: "Bienvenida",
    title: "Tu espacio para vender mejor",
    description:
      "El modo empresa reúne tus tiendas, productos y pedidos en una superficie dedicada para operar con más orden y responder más rápido.",
    bullets: [
      "Gestiona tu catálogo desde una vista enfocada en comercio.",
      "Revisa pedidos y avanza estados sin salir del panel empresa.",
      "Mantén separada tu operación comercial del menú personal.",
    ],
  },
  {
    accent: "#22c55e",
    icon: "map-marker-radius-outline",
    eyebrow: "Tiendas",
    title: "Cada tienda representa un punto de venta",
    description:
      "Crea tiendas con identidad propia, ubicación y descripción clara para que los clientes encuentren lo que pueden comprar cerca de ellos.",
    bullets: [
      "Usa nombres y descripciones reales del negocio.",
      "Mantén la ubicación correcta para mejorar entregas y asignación.",
      "Revisa el catálogo de cada tienda desde su detalle operativo.",
    ],
  },
  {
    accent: "#f97316",
    icon: "package-variant-closed",
    eyebrow: "Productos",
    title: "Publica productos claros, disponibles y verificables",
    description:
      "Los productos deben tener información honesta: nombre, precio, cantidad, descripción e imagen cuando sea posible.",
    bullets: [
      "Evita precios confusos o datos incompletos.",
      "Actualiza disponibilidad antes de recibir pedidos.",
      "Usa imágenes propias o autorizadas para representar el producto.",
    ],
  },
  {
    accent: "#ef4444",
    icon: "shield-alert-outline",
    eyebrow: "Términos y condiciones",
    title: "Comercio responsable dentro de VIDKAR",
    description:
      "Al activar el modo empresa aceptas operar con productos permitidos, información veraz y respeto por la seguridad de los clientes.",
    bullets: [
      "No se pueden publicar drogas, armas, municiones ni artículos destinados a causar daño.",
      "No se permiten productos robados, falsificados, ilegales, peligrosos o sujetos a permisos especiales sin autorización válida.",
      "No publiques medicamentos controlados, sustancias reguladas, documentos oficiales, servicios fraudulentos ni contenido sexual explícito.",
      "VIDKAR puede retirar productos, bloquear tiendas o suspender el modo empresa si detecta incumplimientos.",
    ],
    terms: true,
  },
];

const normalizeMeteorCallback = (error, result) => {
  if (error) {
    throw error;
  }

  if (
    result &&
    typeof result === "object" &&
    Object.prototype.hasOwnProperty.call(result, "error") &&
    Object.prototype.hasOwnProperty.call(result, "success")
  ) {
    if (result.error) {
      throw result.error;
    }

    return result.success;
  }

  return result;
};

const callMeteorMethod = (methodName, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (error, result) => {
      try {
        resolve(normalizeMeteorCallback(error, result));
      } catch (callbackError) {
        reject(callbackError);
      }
    });
  });

const getErrorMessage = (error) =>
  error?.reason || error?.message || "No se pudo activar el modo empresa.";

const getFirstName = (user) =>
  user?.profile?.firstName || user?.profile?.name || user?.username || "";

const userHasEmpresaRole = (user) => {
  const roles = user?.profile?.roleComercio;
  return Array.isArray(roles) && roles.includes("EMPRESA");
};

const useEmpresaWelcomeUser = () =>
  Meteor.useTracker(() => {
    const userId = Meteor.userId();

    if (!userId) {
      return {
        loading: false,
        user: null,
        userId: null,
      };
    }

    const handle = Meteor.subscribe(
      "user",
      { _id: userId },
      { fields: EMPRESA_USER_FIELDS },
    );

    return {
      loading: !handle.ready(),
      user: Meteor.users.findOne({ _id: userId }),
      userId,
    };
  }, []);

const createPalette = (theme) => {
  const isDark = theme.dark;

  return {
    accent: "#22c55e",
    background: isDark ? "#020617" : "#eef5f1",
    card: isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.94)",
    cardBorder: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    copy: isDark ? "#cbd5e1" : "#475569",
    heroEnd: isDark ? "#064e3b" : "#dcfce7",
    heroStart: isDark ? "#0f172a" : "#f8fafc",
    muted: isDark ? "#94a3b8" : "#64748b",
    pill: isDark ? "rgba(34, 197, 94, 0.16)" : "rgba(22, 163, 74, 0.1)",
    title: isDark ? "#f8fafc" : "#0f172a",
    warning: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(254, 226, 226, 0.9)",
  };
};

const SlideBullet = ({ color, label, palette }) => (
  <View style={styles.bulletRow}>
    <View style={[styles.bulletIcon, { backgroundColor: `${color}22` }]}>
      <MaterialCommunityIcons color={color} name="check" size={16} />
    </View>
    <Text style={[styles.bulletText, { color: palette.copy }]}>{label}</Text>
  </View>
);

const SlideCard = ({
  alreadyAccepted,
  isDarkMode,
  maxHeight,
  onTermsScrollEndChange,
  palette,
  slide,
}) => {
  const [scrollMetrics, setScrollMetrics] = useState({
    containerHeight: 0,
    contentHeight: 0,
    scrollY: 0,
  });

  const remainingScroll = scrollMetrics.contentHeight - scrollMetrics.containerHeight - scrollMetrics.scrollY;
  const showScrollHint = scrollMetrics.contentHeight > scrollMetrics.containerHeight + 24 && remainingScroll > 18;
  const termsScrollCompleted =
    alreadyAccepted ||
    !slide.terms ||
    (scrollMetrics.contentHeight > 0 &&
      (scrollMetrics.contentHeight <= scrollMetrics.containerHeight + 24 || remainingScroll <= 18));

  useEffect(() => {
    if (!slide.terms || !onTermsScrollEndChange) {
      return;
    }

    onTermsScrollEndChange(termsScrollCompleted);
  }, [onTermsScrollEndChange, slide.terms, termsScrollCompleted]);

  return (
    <Surface
      elevation={0}
      style={[
        styles.slideCard,
        slide.terms ? styles.slideCardTerms : null,
        maxHeight ? { maxHeight } : null,
        {
          backgroundColor: palette.card,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.slideScrollContent,
          slide.terms ? styles.slideScrollContentTerms : null,
        ]}
        nestedScrollEnabled
        onContentSizeChange={(_, contentHeight) => {
          setScrollMetrics((current) =>
            current.contentHeight === contentHeight ? current : { ...current, contentHeight },
          );
        }}
        onLayout={(event) => {
          const containerHeight = event.nativeEvent.layout.height;
          setScrollMetrics((current) =>
            current.containerHeight === containerHeight ? current : { ...current, containerHeight },
          );
        }}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          setScrollMetrics((current) =>
            Math.abs(current.scrollY - scrollY) < 1 ? current : { ...current, scrollY },
          );
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.slideScroll}
      >
        <View style={[styles.slideIconWrap, { backgroundColor: `${slide.accent}18` }]}> 
          <MaterialCommunityIcons color={slide.accent} name={slide.icon} size={34} />
        </View>
        <Chip compact style={[styles.eyebrowChip, { backgroundColor: `${slide.accent}18` }]} textStyle={{ color: slide.accent }}>
          {slide.eyebrow}
        </Chip>
        <Text style={[styles.slideTitle, slide.terms ? styles.slideTitleTerms : null, { color: palette.title }]}>{slide.title}</Text>
        <Text style={[styles.slideDescription, { color: palette.copy }]}>{slide.description}</Text>

        <View style={[styles.bulletList, slide.terms ? styles.bulletListTerms : null]}>
          {slide.bullets.map((bullet) => (
            <SlideBullet color={slide.accent} key={bullet} label={bullet} palette={palette} />
          ))}
        </View>

        {slide.terms ? (
          <View
            style={[
              styles.termsBox,
              {
                backgroundColor: palette.warning,
                borderColor: `${slide.accent}44`,
              },
            ]}
          >
            <View style={styles.termsHeader}>
              <MaterialCommunityIcons color={slide.accent} name="alert-octagon-outline" size={22} />
              <Text style={[styles.termsTitle, { color: palette.title }]}>Compromiso obligatorio</Text>
            </View>
            <Text style={[styles.termsText, { color: palette.copy }]}> 
              Al continuar, confirmas que publicarás productos legales, seguros y permitidos. También aceptas que VIDKAR pueda retirar contenido, pausar tiendas o suspender el modo empresa si detecta incumplimientos.
            </Text>
            {alreadyAccepted ? (
              <View style={[styles.acceptedBadge, { backgroundColor: `${slide.accent}18` }]}> 
                <MaterialCommunityIcons color={slide.accent} name="check-decagram-outline" size={18} />
                <Text style={[styles.acceptedBadgeText, { color: slide.accent }]}>Términos aceptados anteriormente</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {showScrollHint ? (
        <View pointerEvents="none" style={styles.scrollHintWrap}>
          <View style={[styles.scrollHintShell, { borderColor: `${palette.title}18` }]}>
            <BlurView
              intensity={20}
              style={[
                styles.scrollHint,
                {
                  backgroundColor: `${palette.title}12`,
                },
              ]}
              tint={isDarkMode ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
            >
              <MaterialCommunityIcons color={`${palette.title}90`} name="chevron-double-down" size={16} />
            </BlurView>
          </View>
        </View>
      ) : null}
    </Surface>
  );
};

const EmpresaWelcomeScreen = () => {
  const theme = useTheme();
  const palette = useMemo(() => createPalette(theme), [theme]);
  const { bottom, top } = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const { loading, user } = useEmpresaWelcomeUser();
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [termsScrollCompleted, setTermsScrollCompleted] = useState(false);
  const [heroCardSize, setHeroCardSize] = useState({ width: 0, height: 0 });
  const heroGlowPrimaryProgress = useRef(new Animated.Value(0)).current;
  const heroGlowSecondaryProgress = useRef(new Animated.Value(0)).current;

  const horizontalPadding = width < 380 ? 16 : 22;
  const slideGap = width < 380 ? 12 : 16;
  const slideWidth = Math.max(1, width - horizontalPadding * 2 - slideGap);
  const snapInterval = slideWidth + slideGap;
  const slideMaxHeight = Math.max(320, height - Math.max(42, top + 18) - 320 - Math.max(bottom, 14));
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const alreadyAccepted = user?.empresaTerminosCondicionesAcepted === true;
  const firstName = getFirstName(user);
  const canRequestEmpresa = user?.permiteEmpresa === true;
  const blocked = user?.empresaBloqueada === true;
  const heroPrimaryGlowMotion = useMemo(
    () => buildGlowMotion(heroGlowPrimaryProgress, heroCardSize, HERO_PRIMARY_GLOW_SIZE, "primarySweep"),
    [heroCardSize, heroGlowPrimaryProgress],
  );
  const heroSecondaryGlowMotion = useMemo(
    () => buildGlowMotion(heroGlowSecondaryProgress, heroCardSize, HERO_SECONDARY_GLOW_SIZE, "secondarySweep"),
    [heroCardSize, heroGlowSecondaryProgress],
  );

  useEffect(() => {
    if (alreadyAccepted) {
      setTermsScrollCompleted(true);
    }
  }, [alreadyAccepted]);

  useEffect(() => {
    if (!loading && user?.modoEmpresa && userHasEmpresaRole(user)) {
      router.replace("/(empresa)/EmpresaNavigator");
    }
  }, [loading, user]);

  useEffect(() => {
    if (!heroCardSize.width || !heroCardSize.height) {
      return undefined;
    }

    const primaryLoop = Animated.loop(
      Animated.timing(heroGlowPrimaryProgress, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const secondaryLoop = Animated.loop(
      Animated.timing(heroGlowSecondaryProgress, {
        toValue: 1,
        duration: 21000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    heroGlowPrimaryProgress.setValue(0);
    heroGlowSecondaryProgress.setValue(0);
    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      heroGlowPrimaryProgress.stopAnimation();
      heroGlowSecondaryProgress.stopAnimation();
    };
  }, [
    heroCardSize.height,
    heroCardSize.width,
    heroGlowPrimaryProgress,
    heroGlowSecondaryProgress,
  ]);

  const handleMomentumEnd = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.max(0, Math.min(SLIDES.length - 1, nextIndex)));
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(normal)/Main");
  };

  const handleActivate = async () => {
    if (blocked) {
      Alert.alert("Modo empresa", "Tu acceso empresa está bloqueado. Contacta con administración para revisar la cuenta.");
      return;
    }

    if (!canRequestEmpresa) {
      Alert.alert("Modo empresa", "Tu cuenta todavía no está habilitada para usar el modo empresa.");
      return;
    }

    setSubmitting(true);
    try {
      if (!alreadyAccepted) {
        await callMeteorMethod("users.aceptarTerminosEmpresa");
      }

      await callMeteorMethod("users.toggleModoEmpresa", true);
      router.replace("/(empresa)/EmpresaNavigator");
    } catch (error) {
      Alert.alert("Modo empresa", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isLastSlide) {
      handleCancel();
      return;
    }

    handleActivate();
  };

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: palette.background }]}> 
      <StatusBar
        animated
        backgroundColor="transparent"
        barStyle={theme.dark ? "light-content" : "dark-content"}
        translucent
      />
      <LinearGradient
        colors={[palette.heroStart, palette.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        onLayout={({ nativeEvent }) => {
          const { height: heroHeight, width: heroWidth } = nativeEvent.layout;

          setHeroCardSize((current) => {
            if (current.width === heroWidth && current.height === heroHeight) {
              return current;
            }

            return { width: heroWidth, height: heroHeight };
          });
        }}
        style={[
          styles.hero,
          {
            minHeight: Math.max(262, height * 0.32),
            paddingHorizontal: horizontalPadding,
            paddingTop: Math.max(42, top + 18),
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroOrb,
            styles.heroOrbPrimary,
            {
              transform: [
                { translateX: heroPrimaryGlowMotion.translateX },
                { translateY: heroPrimaryGlowMotion.translateY },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroOrb,
            styles.heroOrbSecondary,
            {
              transform: [
                { translateX: heroSecondaryGlowMotion.translateX },
                { translateY: heroSecondaryGlowMotion.translateY },
              ],
            },
          ]}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <Chip compact icon="briefcase-outline" style={[styles.heroChip, { backgroundColor: palette.pill }]} textStyle={{ color: palette.accent }}>
              Modo empresa
            </Chip>
            {loading ? <ActivityIndicator color={palette.accent} size={18} /> : null}
          </View>
          <Text style={[styles.heroTitle, { color: palette.title }]}> 
            {firstName ? `${firstName}, prepara tu modo empresa` : "Prepara tu modo empresa"}
          </Text>
          <Text style={[styles.heroCopy, { color: palette.copy }]}> 
            Revisa cómo funcionarán tus tiendas, tus productos y las reglas que protegen el marketplace antes de activar tu panel comercial.
          </Text>
        </View>
      </LinearGradient>

      <View style={[styles.carouselArea]}> 
        <ScrollView
          ref={scrollRef}
          horizontal
          onMomentumScrollEnd={handleMomentumEnd}
          decelerationRate="fast"
          disableIntervalMomentum
          snapToAlignment="start"
          snapToInterval={snapInterval}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.carouselContent,
            {
              paddingLeft: horizontalPadding,
              paddingRight: horizontalPadding - slideGap,
            },
          ]}
          style={styles.carousel}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.slideFrame,
                {
                  height: slideMaxHeight,
                  marginRight: index === SLIDES.length - 1 ? 0 : slideGap,
                  width: slideWidth,
                },
              ]}
            > 
              <SlideCard
                alreadyAccepted={alreadyAccepted}
                isDarkMode={theme.dark}
                maxHeight={slideMaxHeight}
                onTermsScrollEndChange={slide.terms ? setTermsScrollCompleted : undefined}
                palette={palette}
                slide={slide}
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.paginationRow}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === activeIndex ? SLIDES[activeIndex].accent : palette.cardBorder,
                  width: index === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: palette.background,
            borderTopColor: palette.cardBorder,
            paddingBottom: Math.max(bottom, 14),
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <Button
          disabled={isLastSlide && !termsScrollCompleted}
          icon={isLastSlide ? "store-check-outline" : "close"}
          loading={submitting}
          mode={isLastSlide ? "contained" : "outlined"}
          onPress={handlePrimaryAction}
          style={[styles.primaryButton, !isLastSlide && { borderColor: palette.cardBorder }]}
          textColor={isLastSlide ? undefined : palette.copy}
        >
          {isLastSlide ? "Aceptar términos y condiciones" : "Cancelar"}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingBottom: 46,
  },
  heroOrb: {
    borderRadius: 999,
    left: 0,
    position: "absolute",
    top: 0,
  },
  heroOrbPrimary: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    height: 190,
    width: 190,
  },
  heroOrbSecondary: {
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    height: 170,
    width: 170,
  },
  heroContent: {
    gap: 14,
    maxWidth: 760,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  heroChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 680,
  },
  carouselArea: {
    flex: 1,
    marginTop: -30,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselContent: {
    paddingVertical: 2,
  },
  slideFrame: {
    minHeight: 320,
    paddingHorizontal: 0,
  },
  slideCard: {
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    gap: 14,
    padding: 24,
    paddingBottom: 18,
  },
  slideScrollContentTerms: {
    gap: 12,
    paddingBottom: 20,
    paddingTop: 22,
  },
  slideCardTerms: {
  },
  scrollHintWrap: {
    alignItems: "center",
    bottom: 10,
    left: 0,
    position: "absolute",
    right: 0,
  },
  scrollHintShell: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  scrollHint: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  slideIconWrap: {
    alignItems: "center",
    borderRadius: 22,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  eyebrowChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  slideTitle: {
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
  },
  slideTitleTerms: {
    fontSize: 21,
    lineHeight: 27,
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 23,
  },
  bulletList: {
    gap: 10,
    marginTop: 4,
  },
  bulletListTerms: {
    gap: 8,
    marginTop: 2,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  bulletIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  termsBox: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 2,
    padding: 14,
  },
  termsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  termsTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  termsText: {
    fontSize: 13,
    lineHeight: 19,
  },
  acceptedBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptedBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  paginationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16,
  },
  paginationDot: {
    borderRadius: 999,
    height: 8,
  },
  footer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingTop: 14,
  },
  primaryButton: {
    borderRadius: 999,
    width: "100%",
  },
});

export default EmpresaWelcomeScreen;