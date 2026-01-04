import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
// ✅ Flechas: cuando el swipe supera ~5% del ancho, empiezan a aparecer
const ARROW_VISIBILITY_THRESHOLD = width * 0.05;

async function safeOpenSettings() {
  Linking.openSettings?.();
}

export default function PermissionsGate({
  steps = [],
  onAllGranted,
  onOpenSettings = safeOpenSettings,
}) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState('');

  const gestureX = useRef(new Animated.Value(0)).current;

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
    [arrowLeftOpacity, arrowRightOpacity, index, steps.length]
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
    [gestureX, hideArrows, index, settleToIndex, showArrowForDx, steps.length]
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
    new Animated.Value(-index * width),
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

    const showPrimary = stepIndex === index && !isGranted;
    const showSettings = stepIndex === index && (step?.canOpenSettings ?? true);

    const isActiveSlide = stepIndex === index;

    return (
      <View key={String(step?.id || stepIndex)} style={[styles.slide, { width }]}>
        {/* ✅ Ribbon "APROBADO" */}
        {isGranted && (
          <View pointerEvents="none" style={styles.ribbonWrapper}>
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>APROBADO</Text>
            </View>
          </View>
        )}

        <Animated.View style={{ width: '100%', alignItems: 'center', opacity: isActiveSlide ? contentOpacity : 1 }}>
          <MaterialCommunityIcons
            name={step?.icon || 'shield-check'}
            size={110}
            color={isGranted ? '#4CAF50' : step?.iconColor || '#FF9800'}
          />

          <Text style={styles.title}>{step?.title || 'Permiso'}</Text>
          {/* {!!step?.description && <Text style={styles.subtitle}>{step.description}</Text>} */}
          {!!step?.rationale?.message && <Text style={[styles.subtitle, {justifyContent:'flex-start'}]}>{step?.rationale?.message}</Text>}
          
          {shouldRenderInfoCard && !isGranted && (
            <Chip style={styles.card}>
              <Card.Content >
                {hasDetail && <Text style={styles.detailText}>{step.detail}</Text>}

                {/* {isGranted && (
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
                    <Text style={styles.statusGrantedText}>Aprobado</Text>
                  </View>
                )} */}

                {!isGranted && isBlocked && (
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons name="alert-circle" size={18} color="#F57C00" />
                    <Text style={styles.statusBlockedText}>
                      Bloqueado: habilítalo desde Ajustes
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
              {step?.primaryText || 'Conceder permiso'}
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
              width: width * steps.length,
              transform: [{ translateX: trackTranslateX }],
            },
          ]}
        >
          {steps.map((step, stepIndex) => {
            // ✅ Performance/UX: solo renderizar el slide activo.
            // Los demás son placeholders del mismo ancho para mantener el desplazamiento y el layout.
            if (stepIndex !== index) {
              return <View key={String(step?.id || stepIndex)} style={{ width }} />;
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
  slide: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },

  swipeHintRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  hintText: { color: '#9E9E9E', fontSize: 12 },

  bottomArea: {
    paddingBottom: 14,
    paddingTop: 10,
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

  title: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 18 },

  card: { width: '100%', borderRadius: 14, marginTop: 10 },
  detailText: { color: '#424242', fontSize: 14, lineHeight: 20 },

  statusRow: { flexDirection: 'row', alignItems: 'center',  gap: 8 },
  statusGrantedText: { color: '#2E7D32', fontWeight: '800' },
  statusBlockedText: { color: '#E65100', fontWeight: '700' },

  errorText: { marginTop: 12, color: '#D32F2F', fontSize: 13, lineHeight: 18 },

  primaryBtn: { width: '100%', marginTop: 16, borderRadius: 30 },
  primaryBtnContent: { paddingVertical: 8 },
  primaryBtnLabel: { fontSize: 15, fontWeight: '700' },

  secondaryBtn: { width: '100%', marginTop: 10, borderRadius: 30 },

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
