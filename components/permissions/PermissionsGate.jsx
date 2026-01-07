import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Linking,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

async function safeOpenSettings() {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Abre directamente la configuración de la app
      await Linking.openSettings();
    } else {
      // Android: Abre la configuración de la app
      await Linking.openSettings();
    }
  } catch (error) {
    console.warn('⚠️ No se pudo abrir la configuración:', error);
    // Fallback: intentar abrir ajustes generales
    Linking.openSettings?.();
  }
}

export default function PermissionsGate({
  steps = [],
  onAllGranted,
  onOpenSettings = safeOpenSettings,
}) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState('');
  
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  // ✅ Calcular thresholds dinámicamente basados en el ancho actual
  const SWIPE_THRESHOLD = screenWidth * 0.25;
  const ARROW_VISIBILITY_THRESHOLD = screenWidth * 0.05;

  const gestureX = useRef(new Animated.Value(0)).current;

  // ✅ Resetear gestureX cuando cambia el ancho de pantalla (rotación)
  useEffect(() => {
    gestureX.setValue(0);
  }, [screenWidth, gestureX]);

  // ✅ Fade del contenido al cambiar de slide:
  // - salida instantánea
  // - entrada gradual
  const contentOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(contentOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, index]);

  useEffect(() => {
    if (!steps.length) return;
    setIndex((prev) => Math.min(prev, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const current = steps[index];

  useEffect(() => {
    if (!steps.length) return;
    if (!current) setIndex(0);
  }, [current, steps.length]);

  const goNext = useCallback(() => {
    setLastError('');
    if (index + 1 >= steps.length) {
      onAllGranted?.();
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [index, onAllGranted, steps.length]);

  const goPrev = useCallback(() => {
    setLastError('');
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const settleToIndex = useCallback(
    (nextIndex) => {
      setIndex(nextIndex);
      Animated.spring(gestureX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    },
    [gestureX]
  );

  // ✅ Flechas laterales (overlay) visibles solo durante el gesto
  const arrowLeftOpacity = useRef(new Animated.Value(0)).current;
  const arrowRightOpacity = useRef(new Animated.Value(0)).current;

  const hideArrows = useCallback(() => {
    Animated.parallel([
      Animated.timing(arrowLeftOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(arrowRightOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [arrowLeftOpacity, arrowRightOpacity]);

  const showArrowForDx = useCallback(
    (dx) => {
      const absDx = Math.abs(dx);
      const raw = (absDx - ARROW_VISIBILITY_THRESHOLD) / (SWIPE_THRESHOLD - ARROW_VISIBILITY_THRESHOLD);
      const nextOpacity = Math.max(0, Math.min(1, raw));

      const wantsPrev = dx > 0 && index > 0;
      const wantsNext = dx < 0 && index < steps.length - 1;

      arrowLeftOpacity.setValue(wantsPrev ? nextOpacity : 0);
      arrowRightOpacity.setValue(wantsNext ? nextOpacity : 0);
    },
    [arrowLeftOpacity, arrowRightOpacity, index, steps.length, ARROW_VISIBILITY_THRESHOLD, SWIPE_THRESHOLD]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
        onPanResponderMove: (_, g) => {
          gestureX.setValue(g.dx);
          showArrowForDx(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const canGoNext = index < steps.length - 1;
          const canGoPrev = index > 0;

          hideArrows();

          if (g.dx < -SWIPE_THRESHOLD && canGoNext) {
            settleToIndex(index + 1);
            return;
          }

          if (g.dx > SWIPE_THRESHOLD && canGoPrev) {
            settleToIndex(index - 1);
            return;
          }

          Animated.spring(gestureX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 11,
          }).start();
        },
      }),
    [gestureX, hideArrows, index, settleToIndex, showArrowForDx, steps.length, SWIPE_THRESHOLD]
  );

  const handleRequest = useCallback(async () => {
    if (!current?.onRequest) return;

    setLastError('');
    setLoading(true);
    try {
      const res = await current.onRequest();
      if (!res?.ok) {
        setLastError(res?.message || 'No se pudo conceder este permiso.');
        return;
      }

      // ✅ UX: no auto-avanzar. Dejar que el usuario vea "Aprobado" y avance manualmente.
      // Nota: el status del step debe actualizarse desde PermissionsManager (checkAllPermissions).
      setLastError('');
    } catch (e) {
      setLastError('No se pudo conceder este permiso. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [current]);

  if (!steps.length) return null;
  if (!current) return null;

  const trackTranslateX = Animated.add(
    new Animated.Value(-index * screenWidth),
    gestureX
  );

  const renderSlide = (step, stepIndex) => {
    const status = step?.status;
    const isGranted = status === 'granted';
    const isBlocked = status === 'blocked';

    const hasDetail = !!step?.detail;
    const hasStatusInfo = isGranted || isBlocked;
    const shouldRenderInfoCard =
      stepIndex === index && (hasDetail || hasStatusInfo || !!lastError);

    const showPrimary = stepIndex === index && !isGranted && !isBlocked;
    const showSettings = stepIndex === index && isBlocked && !isGranted && (step?.canOpenSettings ?? true);

    const isActiveSlide = stepIndex === index;

    return (
      <View key={String(step?.id || stepIndex)} style={[styles.slide, { width: screenWidth }]}>
        {/* ✅ Ribbon "APROBADO" */}
        {isGranted && (
          <View pointerEvents="none" style={styles.ribbonWrapper}>
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>APROBADO</Text>
            </View>
          </View>
        )}

        <Animated.View style={{ 
          width: '100%',
          maxWidth: isLandscape ? screenWidth * 0.85 : '100%',
          opacity: isActiveSlide ? contentOpacity : 1,
          flexDirection: isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isLandscape ? 32 : 0,
          paddingHorizontal: isLandscape ? 20 : 0,
          paddingVertical: isLandscape ? 10 : 0,
          // height: '100%',
        }}>
          {/* ✅ Modo Landscape: Icono + Título + Descripción a la izquierda */}
          {isLandscape ? (
            <>
              <ScrollView 
                style={styles.leftSectionLandscape}
                contentContainerStyle={styles.leftSectionScrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                <MaterialCommunityIcons
                  name={step?.icon || 'shield-check'}
                  size={70}
                  color={isGranted ? '#4CAF50' : step?.iconColor || '#FF9800'}
                  style={{ alignSelf: 'center' }}
                />
                <Text style={[styles.title, styles.titleLandscape]}>
                  {step?.title || 'Permiso'}
                </Text>
                {!!step?.rationale?.message && (
                  <Text style={[styles.subtitle, styles.subtitleLandscape]}>
                    {step?.rationale?.message}
                  </Text>
                )}
              </ScrollView>

              {/* ✅ Lado derecho: Botones + Estado */}
              <View style={styles.rightSectionLandscape}>
                {shouldRenderInfoCard && !isGranted && (
                  <Chip style={styles.cardLandscape}>
                    <Card.Content>
                      {hasDetail && <Text style={styles.detailText}>{step.detail}</Text>}

                      {!isGranted && isBlocked && (
                        <View style={styles.statusRow}>
                          <MaterialCommunityIcons name="alert-circle" size={18} color="#F57C00" />
                          <Text style={styles.statusBlockedText}>
                            Bloqueado: {'\n'}habilítalo manualmente desde Ajustes
                          </Text>
                        </View>
                      )}

                      {!!lastError && <Text style={styles.errorText}>{lastError}</Text>}
                    </Card.Content>
                  </Chip>
                )}

                {showPrimary && (
                  <Button
                    mode="outlined"
                    onPress={handleRequest}
                    loading={loading}
                    disabled={loading}
                    style={styles.primaryBtnLandscape}
                    contentStyle={styles.primaryBtnContent}
                    labelStyle={styles.primaryBtnLabel}
                  >
                    {step?.primaryText || 'Continuar'}
                  </Button>
                )}

                {showSettings && (
                  <Button
                    mode={isBlocked ? 'contained' : 'outlined'}
                    onPress={onOpenSettings}
                    disabled={loading}
                    style={styles.secondaryBtnLandscape}
                  >
                    Abrir ajustes
                  </Button>
                )}
              </View>
            </>
          ) : (
            <>
              {/* ✅ Modo Portrait: Layout original */}
              <View style={styles.iconTitleSection}>
                <MaterialCommunityIcons
                  name={step?.icon || 'shield-check'}
                  size={110}
                  color={isGranted ? '#4CAF50' : step?.iconColor || '#FF9800'}
                />
                <Text style={styles.title}>
                  {step?.title || 'Permiso'}
                </Text>
              </View>

              <View style={styles.contentSection}>
                {!!step?.rationale?.message && (
                  <Text style={styles.subtitle}>
                    {step?.rationale?.message}
                  </Text>
                )}
                
                {shouldRenderInfoCard && !isGranted && (
                  <Chip style={styles.card}>
                    <Card.Content>
                      {hasDetail && <Text style={styles.detailText}>{step.detail}</Text>}

                      {!isGranted && isBlocked && (
                        <View style={styles.statusRow}>
                          <MaterialCommunityIcons name="alert-circle" size={18} color="#F57C00" />
                          <Text style={styles.statusBlockedText}>
                            Bloqueado: {'\n'}habilítalo manualmente desde Ajustes
                          </Text>
                        </View>
                      )}

                      {!!lastError && <Text style={styles.errorText}>{lastError}</Text>}
                    </Card.Content>
                  </Chip>
                )}

                {showPrimary && (
                  <Button
                    mode="outlined"
                    onPress={handleRequest}
                    loading={loading}
                    disabled={loading}
                    style={styles.primaryBtn}
                    contentStyle={styles.primaryBtnContent}
                    labelStyle={styles.primaryBtnLabel}
                  >
                    {step?.primaryText || 'Continuar'}
                  </Button>
                )}

                {showSettings && (
                  <Button
                    mode={isBlocked ? 'contained' : 'outlined'}
                    onPress={onOpenSettings}
                    disabled={loading}
                    style={styles.secondaryBtn}
                  >
                    Abrir ajustes
                  </Button>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </View>
    );
  };

  return (
    <Surface style={styles.container}>
      {/* ✅ Track primero (contenido) */}
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.track,
            {
              width: screenWidth * steps.length,
              transform: [{ translateX: trackTranslateX }],
            },
          ]}
        >
          {steps.map((step, stepIndex) => {
            // ✅ Performance/UX: solo renderizar el slide activo.
            // Los demás son placeholders del mismo ancho para mantener el desplazamiento y el layout.
            if (stepIndex !== index) {
              return <View key={String(step?.id || stepIndex)} style={{ width: screenWidth }} />;
            }
            return renderSlide(step, stepIndex);
          })}
        </Animated.View>

        {/* ✅ Flechas overlay (solo visibles durante swipe) */}
        <View pointerEvents="none" style={styles.arrowsOverlay}>
          <Animated.View style={[styles.arrowSide, styles.arrowLeft, { opacity: arrowLeftOpacity }]}>
            <MaterialCommunityIcons name="chevron-left" size={56} color="#FFFFFF" />
          </Animated.View>

          <Animated.View style={[styles.arrowSide, styles.arrowRight, { opacity: arrowRightOpacity }]}>
            <MaterialCommunityIcons name="chevron-right" size={56} color="#FFFFFF" />
          </Animated.View>
        </View>
      </View>

      {/* ✅ Hint fijo encima de los dots */}
      <View style={styles.bottomArea}>
        <View style={styles.swipeHintRow}>
          <MaterialCommunityIcons name="chevron-left" size={18} color="#9E9E9E" />
          <Text style={styles.hintText}>Desliza hacia los lados para navegar</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#9E9E9E" />
        </View>

        <View style={styles.dotsContainer}>
          {steps.map((s, idx) => {
            const sGranted = s?.status === 'granted';
            return (
              <View
                key={String(s?.id || idx)}
                style={[
                  styles.progressDot,
                  sGranted && styles.progressDotGranted,
                  idx === index && styles.progressDotActive,
                ]}
              />
            );
          })}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  viewport: { flex: 1, overflow: 'hidden' },
  track: { flex: 1, flexDirection: 'row' },
  slide: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 22,
    paddingVertical: 8,
  },

  swipeHintRow: {
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  hintText: { color: '#9E9E9E', fontSize: 12 },

  bottomArea: {
    paddingBottom: 8,
    paddingTop: 6,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  progressDotActive: { width: 24, backgroundColor: '#2196F3' },
  progressDotGranted: { backgroundColor: '#4CAF50' },

  // ✅ Sección de icono y título
  iconTitleSection: {
    alignItems: 'center',
  },
  iconTitleSectionLandscape: {
    flex: 0.35,
    justifyContent: 'center',
    minWidth: 120,
  },

  title: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 10, textAlign: 'center' },
  titleLandscape: {
    fontSize: 18,
    marginTop: 8,
    marginBottom: 6,
  },

  // ✅ Sección de contenido (descripción, info, botones)
  contentSection: {
    width: '100%',
    alignItems: 'center',
  },
  
  // ✅ Landscape: lado izquierdo con scroll (icono, título, descripción)
  leftSectionLandscape: {
    flex: 0.55,
    maxWidth: 500,
    maxHeight: '100%',
  },
  leftSectionScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  
  // ✅ Landscape: lado derecho (botones y estado)
  rightSectionLandscape: {
    flex: 0.45,
    maxWidth: 350,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  
  contentSectionLandscape: {
    flex: 0.65,
    maxWidth: 450,
    maxHeight: '80%',
  },
  contentSectionScrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'stretch',
  },

  subtitle: { 
    fontSize: 15, 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 18,
  },
  subtitleLandscape: {
    fontSize: 13,
    textAlign: 'left',
    marginBottom: 8,
    lineHeight: 18,
  },

  card: { width: '100%', borderRadius: 14, marginTop: 10 },
  cardLandscape: {
    marginTop: 6,
    marginBottom: 6,
  },
  detailText: { color: '#424242', fontSize: 14, lineHeight: 20 },

  statusRow: { flexDirection: 'row', alignItems: 'center',  gap: 8 },
  statusGrantedText: { color: '#2E7D32', fontWeight: '800' },
  statusBlockedText: { color: '#E65100', fontWeight: '700' },

  errorText: { marginTop: 12, color: '#D32F2F', fontSize: 13, lineHeight: 18 },

  primaryBtn: { width: '100%', marginTop: 16, borderRadius: 30 },
  primaryBtnLandscape: {
    marginTop: 8,
  },
  primaryBtnContent: { paddingVertical: 8 },
  primaryBtnLabel: { fontSize: 15, fontWeight: '700' },

  secondaryBtn: { width: '100%', marginTop: 10, borderRadius: 30 },
  secondaryBtnLandscape: {
    marginTop: 6,
  },

  // ✅ Flechas overlay
  arrowsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  arrowSide: {
    position: 'absolute',
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },

  // ✅ Ribbon "APROBADO" (esquina superior derecha)
  ribbonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    overflow: 'hidden',
    zIndex: 10,
  },
  ribbon: {
    position: 'absolute',
    top: 28,
    right: -42,
    width: 180,
    paddingVertical: 10,
    backgroundColor: '#2E7D32',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    elevation: 8, // Android
    shadowColor: '#000', // iOS
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  ribbonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 12,
  },
});
