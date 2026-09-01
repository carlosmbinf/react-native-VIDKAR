import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * ModernBottomDrawer
 * Drawer modal deslizante de alto rendimiento con animaciones de resorte fluidas (damping/stiffness),
 * soporte para arrastrar con gesto (PanResponder), backdrop interactivo con desvanecimiento (fade),
 * soporte para tabletas/pantallas anchas y diseño visual refinado.
 */
export default function ModernBottomDrawer({
  visible,
  onDismiss,
  children,
  header,
  maxHeightFraction = 0.88,
  minHeight = 360,
  palette,
  hideHandle = false,
}) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const isWide = width > 768;
  const sheetMaxWidth = Math.min(width - 32, 680);
  const sheetHeight = Math.min(
    Math.max(minHeight, height * maxHeightFraction),
    height - Math.max(insets.top, 16) - 16
  );

  const translateY = useRef(new Animated.Value(sheetHeight + 60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(Boolean(visible));
  const isClosingRef = useRef(false);
  const currentYRef = useRef(sheetHeight + 60);
  const scrollOffsetRef = useRef(0);

  const openSheet = useCallback(() => {
    isClosingRef.current = false;
    scrollOffsetRef.current = 0;
    setMounted(true);
    translateY.setValue(sheetHeight + 60);
    currentYRef.current = sheetHeight + 60;
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 26,
        stiffness: 280,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]).start(() => {
      currentYRef.current = 0;
    });
  }, [opacity, sheetHeight, translateY]);

  const closeSheet = useCallback(
    (velocity = 0) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const duration = velocity > 1.5 ? 160 : 220;

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: sheetHeight + 60,
          duration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onDismiss?.();
        }
      });
    },
    [onDismiss, opacity, sheetHeight, translateY]
  );

  useEffect(() => {
    if (visible) {
      openSheet();
    } else if (mounted && !isClosingRef.current) {
      closeSheet();
    }
  }, [closeSheet, mounted, openSheet, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          // Solo capturar gestos verticales hacia abajo
          return (
            scrollOffsetRef.current <= 0 &&
            gestureState.dy > 6 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
          );
        },
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          return (
            scrollOffsetRef.current <= 0 &&
            gestureState.dy > 6 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.25
          );
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          // Iniciar seguimiento
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
            const progress = Math.max(0, 1 - gestureState.dy / sheetHeight);
            opacity.setValue(progress);
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.8) {
            closeSheet(gestureState.vy);
          } else {
            // Regresar a posición abierta con rebote sutil
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: 0,
                damping: 24,
                stiffness: 300,
                mass: 0.8,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
      }),
    [closeSheet, opacity, sheetHeight, translateY]
  );

  if (!mounted) return null;

  const backgroundColor = palette?.surface || "#1e293b";
  const borderColor = palette?.border || "rgba(255, 255, 255, 0.12)";
  const handleColor = palette?.muted ? `${palette.muted}66` : "rgba(255, 255, 255, 0.35)";

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeSheet()}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              maxHeight: sheetHeight,
              backgroundColor,
              borderColor,
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom, 16),
            },
            isWide && {
              width: sheetMaxWidth,
              alignSelf: "center",
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              marginBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Zona de agarre / Handle para arrastrar */}
          <View style={styles.handleContainer}>
            {!hideHandle && <View style={[styles.handleBar, { backgroundColor: handleColor }]} />}
            {header}
          </View>

          {/* Contenido scrolleable */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={styles.scrollContent}
            style={styles.scroll}
            onScroll={(event) => {
              scrollOffsetRef.current = Math.max(0, event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 24,
  },
  handleContainer: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: "center",
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 999,
    marginBottom: 8,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
});
