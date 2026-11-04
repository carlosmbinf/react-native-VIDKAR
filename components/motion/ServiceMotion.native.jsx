import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  measure,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";

const MotionContext = createContext(true);
const ViewportContext = createContext(null);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function ServiceMotionProvider({ children }) {
  const reducedMotion = useSystemReducedMotion();
  return <MotionContext.Provider value={reducedMotion}>{children}</MotionContext.Provider>;
}

// El ref y los eventos son independientes del onScroll de la pantalla; esto
// también conserva la coordinación interna de NestableScrollContainer.
export function ServiceScrollViewport({ children, horizontal = false, topInset = 0, bottomInset = 0 }) {
  const parentViewport = useContext(ViewportContext);
  const scrollRef = useAnimatedRef();
  const viewportRef = useAnimatedRef();
  const offset = useScrollOffset(scrollRef);
  const layoutVersion = useSharedValue(0);
  const child = React.Children.only(children);
  const originalRef = child.props.ref;
  const setScrollRef = useCallback((node) => {
    // NestableScrollContainer comparte esta referencia con sus listas hijas.
    setScrollRef.current = node;
    let host = node;
    while (host?.getNativeScrollRef) {
      const next = host.getNativeScrollRef();
      if (!next || next === host) break;
      host = next;
    }
    scrollRef(host);
    if (typeof originalRef === "function") originalRef(node);
    else if (originalRef) originalRef.current = node;
  }, [originalRef, scrollRef]);
  const viewport = useMemo(() => ({ bottomInset, layoutVersion, offset, parent: parentViewport, topInset, viewportRef }), [bottomInset, layoutVersion, offset, parentViewport, topInset, viewportRef]);

  return (
    <ViewportContext.Provider value={viewport}>
      <View collapsable={false} ref={viewportRef} style={horizontal ? styles.horizontalViewport : styles.viewport} onLayout={() => layoutVersion.set((value) => value + 1)}>
      {React.cloneElement(child, {
        ref: setScrollRef,
        scrollEventThrottle: 16,
        onLayout: (event) => {
          layoutVersion.set((value) => value + 1);
          child.props.onLayout?.(event);
        },
        onContentSizeChange: (width, height) => {
          layoutVersion.set((value) => value + 1);
          child.props.onContentSizeChange?.(width, height);
        },
      })}
      </View>
    </ViewportContext.Provider>
  );
}

export function isServiceEntranceVisible(viewport, item) {
  "worklet";
  if (!viewport || !item || item.width <= 0 || item.height <= 0) return false;
  let current = viewport;
  while (current) {
    const bounds = current.viewportRef ? measure(current.viewportRef) : current;
    if (!bounds) return false;
    const viewportTop = bounds.pageY + (current.topInset || 0);
    const viewportBottom = bounds.pageY + bounds.height - (current.bottomInset || 0);
    const visibleHeight = Math.min(viewportBottom, item.pageY + item.height) - Math.max(viewportTop, item.pageY);
    const visibleWidth = Math.min(bounds.pageX + bounds.width, item.pageX + item.width) - Math.max(bounds.pageX, item.pageX);
    if (visibleWidth < Math.min(24, item.width) || visibleHeight < Math.min(24, item.height)) return false;
    current = current.parent;
  }
  return true;
}

function useConfirmedEntrance(progress, reducedMotion, delay, duration, enabled = true) {
  const completed = useRef(reducedMotion);

  useEffect(() => {
    if (!enabled && !reducedMotion) return undefined;
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", () => {
      preferenceChanged = true;
      completed.current = true;
      cancelAnimation(progress);
      progress.set(1);
    });
    if (reducedMotion) {
      completed.current = true;
      cancelAnimation(progress);
      progress.set(1);
    } else if (!completed.current) {
      // Reanimated puede conservar la preferencia del arranque; confirmar la actual
      // antes de iniciar movimiento tras volver de ajustes del sistema.
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        if (!active || preferenceChanged) return;
        completed.current = true;
        if (enabled) {
          progress.set(1);
        } else {
          progress.set(withDelay(delay, withTiming(1, {
            duration,
            easing: EASE_OUT,
            reduceMotion: ReduceMotion.Never,
          }), ReduceMotion.Never));
        }
      }).catch(() => {
        if (active) {
          completed.current = true;
          progress.set(1);
        }
      });
    }
    return () => {
      active = false;
      subscription.remove();
      cancelAnimation(progress);
    };
  }, [delay, duration, enabled, progress, reducedMotion]);
}

export function ServiceEntrance({ children, delay = 0, initiallyRevealed = false, onReveal, style, variant }) {
  const reducedMotion = useContext(MotionContext);
  const viewport = useContext(ViewportContext);
  const entranceRef = useAnimatedRef();
  const layoutVersion = useSharedValue(0);
  const initial = useRef({ delay: Math.max(0, Math.min(Number(delay) || 0, 600)), reducedMotion: reducedMotion || initiallyRevealed, revealed: initiallyRevealed });
  const triggered = useSharedValue(initial.current.revealed);
  const [visible, setVisible] = useState(!viewport);
  const progress = useSharedValue(initial.current.reducedMotion ? 1 : 0);
  useConfirmedEntrance(progress, reducedMotion || initial.current.revealed, viewport ? Math.min(initial.current.delay, 60) : initial.current.delay, 300, visible);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const reveal = useCallback(() => {
    if (!mounted.current) return;
    onReveal?.();
    setVisible(true);
  }, [onReveal]);

  useAnimatedReaction(
    () => {
      if (!viewport || reducedMotion || triggered.get()) return null;
      const signals = [layoutVersion.get()];
      let current = viewport;
      while (current) {
        signals.push(current.offset.get(), current.layoutVersion.get());
        current = current.parent;
      }
      return signals;
    },
    (signal) => {
      if (!signal || triggered.get()) return;
      if (isServiceEntranceVisible(viewport, measure(entranceRef))) {
        triggered.set(true);
        scheduleOnRN(reveal);
      }
    },
    [reducedMotion, reveal, viewport],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: 0.7 + value * 0.3,
      transform: [
        { translateY: (1 - value) * (variant === "hero" ? 16 : 10) },
        { scale: 0.98 + value * 0.02 },
      ],
    };
  }, [variant]);

  return <Animated.View collapsable={false} ref={entranceRef} onLayout={() => layoutVersion.set((value) => value + 1)} style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function ServicePressable({ children, style, onPress, onPressIn, onPressOut, disabled, ...props }) {
  const reducedMotion = useContext(MotionContext);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  useEffect(() => {
    if (reducedMotion || disabled) {
      cancelAnimation(scale);
      scale.set(1);
    }
  }, [disabled, reducedMotion, scale]);

  useEffect(() => () => cancelAnimation(scale), [scale]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        disabled={disabled}
        onPress={onPress}
        onPressIn={(event) => {
          if (!reducedMotion) scale.set(withTiming(0.97, { duration: 120, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reducedMotion) scale.set(withTiming(1, { duration: 120, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }));
          onPressOut?.(event);
        }}
        style={(state) => [
          typeof style === "function" ? style(state) : style,
          reducedMotion && state.pressed ? styles.reducedPressed : null,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function ServiceAtmosphere({ color = "#818cf8" }) {
  const reducedMotion = useContext(MotionContext);
  const initialReduced = useRef(reducedMotion);
  const progress = useSharedValue(initialReduced.current ? 1 : 0);
  useConfirmedEntrance(progress, reducedMotion, 0, 600);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.12 * progress.get(),
    transform: [{ scale: 0.88 + 0.12 * progress.get() }],
  }));

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.atmosphere, { backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  horizontalViewport: { width: "100%" },
  atmosphere: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
  },
  reducedPressed: { opacity: 0.8 },
});