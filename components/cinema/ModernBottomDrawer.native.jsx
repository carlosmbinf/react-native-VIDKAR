import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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

  const isLandscape = width > height;
  const isWide = width > 768 || isLandscape;
  const sheetMaxWidth = Math.min(width - 32, isLandscape ? 820 : 680);
  const availableHeight = height - Math.max(insets.top, 16) - 16;
  const minimumSheetHeight = isLandscape
    ? Math.min(minHeight, 280)
    : Math.min(minHeight, 360);
  const maxSheetHeight = Math.min(
    Math.max(minimumSheetHeight, height * (isLandscape ? Math.min(maxHeightFraction, 0.78) : maxHeightFraction)),
    availableHeight,
  );
  const [headerHeight, setHeaderHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const measuredSheetHeight = headerHeight > 0 && contentHeight > 0
    ? headerHeight + contentHeight + Math.max(insets.bottom, 16)
    : maxSheetHeight;
  const expandedHeight = Math.max(
    minimumSheetHeight,
    Math.min(availableHeight, maxSheetHeight, measuredSheetHeight),
  );
  const collapsedHeight = Math.min(
    expandedHeight,
    minimumSheetHeight,
  );
  const expandedOffset = expandedHeight - collapsedHeight;
  const reducedMotion = useReducedMotion();

  const translateY = useSharedValue(expandedOffset + 60);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);
  const [mounted, setMounted] = useState(Boolean(visible));
  const isClosingRef = useRef(false);
  const scrollOffsetRef = useRef(0);

  const openSheet = useCallback(() => {
    isClosingRef.current = false;
    scrollOffsetRef.current = 0;
    setMounted(true);
    translateY.set(expandedOffset + 60);
    opacity.set(0);
    opacity.set(withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System }));
    translateY.set(withSpring(expandedOffset, reducedMotion ? { duration: 1, dampingRatio: 1 } : { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System }));
  }, [expandedOffset, opacity, reducedMotion, translateY]);

  const finishClose = useCallback(() => {
    setMounted(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(
    (velocity = 0) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const duration = velocity > 1.5 ? 160 : 220;

      opacity.set(withTiming(0, { duration: duration * 0.9 }));
      translateY.set(withTiming(expandedHeight + 60, { duration }, (finished) => {
        if (finished) runOnJS(finishClose)();
      }));
    },
    [expandedHeight, finishClose, opacity, translateY]
  );

  useEffect(() => {
    if (visible) {
      openSheet();
    } else if (mounted && !isClosingRef.current) {
      closeSheet();
    }
  }, [closeSheet, mounted, openSheet, visible]);

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-40, 40])
    .onStart(() => {
      startY.set(translateY.get());
    })
    .onUpdate((event) => {
      const nextY = Math.max(0, Math.min(expandedOffset, startY.get() + event.translationY));
      translateY.set(nextY);
    })
    .onEnd((event) => {
      const current = translateY.get();
      const projected = current + event.velocityY * 0.18;
      if (projected > expandedOffset * 0.35 || event.velocityY > 1100) {
        runOnJS(closeSheet)(event.velocityY);
        return;
      }
      const target = projected < expandedOffset * 0.55 ? 0 : expandedOffset;
      translateY.set(withSpring(target, { duration: 300, dampingRatio: 0.8, velocity: event.velocityY, reduceMotion: ReduceMotion.System }));
    }), [closeSheet, collapsedHeight, expandedOffset, startY, translateY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

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
      supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
      onRequestClose={() => closeSheet()}
    >
      <View style={styles.container}>
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Cerrar detalles"
            accessibilityRole="button"
            onPress={closeSheet}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              height: expandedHeight,
              maxHeight: expandedHeight,
              backgroundColor: "transparent",
              borderColor,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            isLandscape && styles.sheetLandscape,
            isWide && {
              width: sheetMaxWidth,
              alignSelf: "center",
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              marginBottom: isLandscape ? -84 : Math.max(insets.bottom, 20),
            },
          ]}
        >
          <BlurView
            intensity={56}
            tint="dark"
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            renderToHardwareTextureAndroid
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[styles.sheetGlassOverlay, { backgroundColor: "rgba(15, 23, 42, 0.42)" }]}
          />
          <View pointerEvents="none" style={styles.sheetGlassBorder} />
          <View pointerEvents="none" style={styles.sheetTopHighlight} />
          {/* Zona de agarre / Handle para arrastrar */}
          <GestureDetector gesture={panGesture}>
            <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} style={styles.handleContainer}>
              {!hideHandle && <View style={[styles.handleBar, { backgroundColor: handleColor }]} />}
              {header}
            </View>
          </GestureDetector>

          {/* Contenido scrolleable */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={styles.scrollContent}
            style={styles.scroll}
            onContentSizeChange={(_contentWidth, nextContentHeight) => setContentHeight(nextContentHeight)}
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
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetLandscape: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  sheetGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetTopHighlight: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    height: 1,
    left: 28,
    position: "absolute",
    right: 28,
    top: 0,
  },
  sheetGlassBorder: {
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 28,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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
