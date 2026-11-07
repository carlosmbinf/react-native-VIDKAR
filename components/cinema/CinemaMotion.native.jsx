import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";

// Un único listener por catálogo; las cards consumen la misma preferencia.
const MotionContext = React.createContext(true);

export function CinemaMotionProvider({ children }) {
  const reducedMotion = useSystemReducedMotion();

  return <MotionContext.Provider value={reducedMotion}>{children}</MotionContext.Provider>;
}

export const useCinemaReducedMotion = () => React.useContext(MotionContext);

const PRESS_SPRING = { stiffness: 600, damping: 42, mass: 0.65, reduceMotion: ReduceMotion.System };
const RELEASE_SPRING = { stiffness: 420, damping: 27, mass: 0.7, reduceMotion: ReduceMotion.System };
const CINEMA_SPRING = { stiffness: 220, damping: 22, mass: 0.78, reduceMotion: ReduceMotion.System };

export function CinemaPosterPressable({ children, height, motionEnabled = true, style, ...props }) {
  const reducedMotion = useCinemaReducedMotion();
  const pressure = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  React.useEffect(() => () => {
    cancelAnimation(pressure);
    cancelAnimation(tiltX);
    cancelAnimation(tiltY);
  }, [pressure, tiltX, tiltY]);

  const animatedStyle = useAnimatedStyle(() => motionEnabled ? ({
    transform: [
      { perspective: 850 },
      { scale: reducedMotion ? 1 : 1 - pressure.get() * 0.04 },
      { rotateX: `${reducedMotion ? 0 : tiltX.get()}deg` },
      { rotateY: `${reducedMotion ? 0 : tiltY.get()}deg` },
      { translateY: reducedMotion ? 0 : pressure.get() * 2 },
    ],
  }) : {});

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [style, pressed && styles.pressed]}
      onPressIn={({ nativeEvent }) => {
        if (reducedMotion || !motionEnabled) return;
        const x = Math.max(-1, Math.min(1, nativeEvent.locationX / 158 * 2 - 1));
        const y = Math.max(-1, Math.min(1, nativeEvent.locationY / height * 2 - 1));
        pressure.set(withSpring(1, PRESS_SPRING));
        tiltX.set(withSpring(-y * 5, PRESS_SPRING));
        tiltY.set(withSpring(x * 5, PRESS_SPRING));
      }}
      onPressOut={() => {
        if (!motionEnabled) return;
        pressure.set(withSpring(0, RELEASE_SPRING));
        tiltX.set(withSpring(0, RELEASE_SPRING));
        tiltY.set(withSpring(0, RELEASE_SPRING));
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export function CinemaDetailReveal({ children, delay = 0, style }) {
  const reducedMotion = useCinemaReducedMotion();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.set(reducedMotion ? 1 : withDelay(delay, withSpring(1, CINEMA_SPRING)));
    return () => cancelAnimation(progress);
  }, [delay, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : progress.get(),
    transform: [
      { translateY: reducedMotion ? 0 : (1 - progress.get()) * 42 },
      { scale: reducedMotion ? 1 : 0.9 + progress.get() * 0.1 },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function CinemaEntrance({ children, delay = 0, variant = "content", style }) {
  const reducedMotion = useCinemaReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const distance = variant === "headline" ? 32 : 22;
  const initialScale = variant === "headline" ? 0.92 : 0.97;

  React.useEffect(() => {
    cancelAnimation(progress);
    progress.set(reducedMotion ? 1 : 0);
    if (!reducedMotion) progress.set(withDelay(delay, withSpring(1, CINEMA_SPRING)));
    return () => cancelAnimation(progress);
  }, [delay, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : progress.get(),
    transform: [
      { translateY: reducedMotion ? 0 : (1 - progress.get()) * distance },
      { scale: reducedMotion ? 1 : initialScale + progress.get() * (1 - initialScale) },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function CinemaHeroAtmosphere({ entranceProgress, scrollY }) {
  const reducedMotion = useCinemaReducedMotion();
  const farCloudStyle = useAnimatedStyle(() => {
    const progress = entranceProgress.get();
    const scroll = scrollY.get();
    return {
      opacity: reducedMotion ? 0.46 : progress * 0.62,
      transform: [
        { translateX: reducedMotion ? 0 : (progress - 1) * 92 - Math.min(20, scroll * 0.035) },
        { translateY: reducedMotion ? 0 : 10 - Math.min(14, scroll * 0.025) },
        { scale: reducedMotion ? 1 : 1.24 - progress * 0.24 },
      ],
    };
  });
  const midCloudStyle = useAnimatedStyle(() => {
    const progress = entranceProgress.get();
    const scroll = scrollY.get();
    return {
      opacity: reducedMotion ? 0.5 : progress * 0.68,
      transform: [
        { translateX: reducedMotion ? 0 : (1 - progress) * 88 + Math.min(28, scroll * 0.05) },
        { translateY: reducedMotion ? 0 : 18 - Math.min(22, scroll * 0.04) },
        { scale: reducedMotion ? 1 : 1.2 - progress * 0.2 },
      ],
    };
  });
  const nearCloudStyle = useAnimatedStyle(() => {
    const progress = entranceProgress.get();
    const scroll = scrollY.get();
    return {
      opacity: reducedMotion ? 0.32 : progress * 0.48,
      transform: [
        { translateX: reducedMotion ? 0 : (progress - 1) * 54 - Math.min(34, scroll * 0.065) },
        { translateY: reducedMotion ? 0 : 24 - Math.min(30, scroll * 0.055) },
        { scale: reducedMotion ? 1 : 1.16 - progress * 0.16 },
      ],
    };
  });
  const orbitStyle = useAnimatedStyle(() => {
    const progress = entranceProgress.get();
    return {
      opacity: reducedMotion ? 0.34 : progress * 0.42,
      transform: [{ scale: reducedMotion ? 1 : 0.68 + progress * 0.32 }, { rotateZ: `${reducedMotion ? 0 : (1 - progress) * -18}deg` }],
    };
  });
  const sparkStyle = useAnimatedStyle(() => {
    const progress = entranceProgress.get();
    return {
      opacity: reducedMotion ? 0.62 : progress,
      transform: [
        { rotateZ: "45deg" },
        { scale: reducedMotion ? 1 : 0.35 + progress * 0.65 },
        { translateY: reducedMotion ? 0 : (1 - progress) * 12 },
      ],
    };
  });

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.atmosphere}>
      <Animated.View style={[styles.cloudLayer, styles.cloudFar, farCloudStyle]}>
        <LinearGradient colors={["rgba(129,140,248,0.44)", "rgba(129,140,248,0.12)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cloudGradient} />
        <View style={[styles.cloudLobe, styles.cloudFarLobeOne]} />
        <View style={[styles.cloudLobe, styles.cloudFarLobeTwo]} />
        <View style={[styles.cloudLobe, styles.cloudFarLobeThree]} />
      </Animated.View>
      <Animated.View style={[styles.cloudLayer, styles.cloudMid, midCloudStyle]}>
        <LinearGradient colors={["rgba(244,114,182,0.32)", "rgba(167,139,250,0.24)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cloudGradient} />
        <View style={[styles.cloudLobe, styles.cloudMidLobeOne]} />
        <View style={[styles.cloudLobe, styles.cloudMidLobeTwo]} />
        <View style={[styles.cloudLobe, styles.cloudMidLobeThree]} />
      </Animated.View>
      <Animated.View style={[styles.cloudLayer, styles.cloudNear, nearCloudStyle]}>
        <LinearGradient colors={["rgba(56,189,248,0.28)", "rgba(99,102,241,0.2)", "transparent"]} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} style={styles.cloudGradient} />
        <View style={[styles.cloudLobe, styles.cloudNearLobeOne]} />
        <View style={[styles.cloudLobe, styles.cloudNearLobeTwo]} />
      </Animated.View>
      <Animated.View style={[styles.orbit, orbitStyle]}>
        <View style={styles.orbitDot} />
      </Animated.View>
      <Animated.View style={[styles.spark, styles.sparkOne, sparkStyle]} />
      <Animated.View style={[styles.spark, styles.sparkTwo, sparkStyle]} />
      <Animated.View style={[styles.spark, styles.sparkThree, sparkStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.94 },
  atmosphere: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  cloudLayer: { position: "absolute", height: 170 },
  cloudFar: { right: -132, top: 62, width: 360 },
  cloudMid: { left: -150, top: 166, width: 360 },
  cloudNear: { right: -164, top: 254, width: 390, height: 140 },
  cloudGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  cloudLobe: { position: "absolute", borderRadius: 999 },
  cloudFarLobeOne: { left: 34, top: 50, width: 212, height: 68, backgroundColor: "rgba(165,180,252,0.2)" },
  cloudFarLobeTwo: { left: 88, top: 14, width: 100, height: 94, backgroundColor: "rgba(196,181,253,0.18)" },
  cloudFarLobeThree: { left: 166, top: 40, width: 126, height: 76, backgroundColor: "rgba(147,197,253,0.16)" },
  cloudMidLobeOne: { left: 26, top: 50, width: 210, height: 68, backgroundColor: "rgba(251,182,206,0.18)" },
  cloudMidLobeTwo: { left: 84, top: 16, width: 100, height: 92, backgroundColor: "rgba(196,181,253,0.2)" },
  cloudMidLobeThree: { left: 162, top: 39, width: 130, height: 74, backgroundColor: "rgba(244,114,182,0.15)" },
  cloudNearLobeOne: { left: 24, top: 46, width: 232, height: 64, backgroundColor: "rgba(125,211,252,0.16)" },
  cloudNearLobeTwo: { left: 112, top: 15, width: 104, height: 88, backgroundColor: "rgba(165,180,252,0.16)" },
  orbit: { position: "absolute", right: 42, top: 86, width: 92, height: 92, borderColor: "rgba(224,231,255,0.34)", borderRadius: 46, borderWidth: 1 },
  orbitDot: { position: "absolute", right: 8, top: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: "#fbcfe8", shadowColor: "#fbcfe8", shadowOpacity: 0.8, shadowRadius: 10, elevation: 3 },
  spark: { position: "absolute", width: 9, height: 9, backgroundColor: "#f5d0fe", transform: [{ rotate: "45deg" }] },
  sparkOne: { left: "12%", top: "23%" },
  sparkTwo: { right: "16%", top: "42%", width: 6, height: 6, backgroundColor: "#bae6fd" },
  sparkThree: { left: "28%", top: "57%", width: 5, height: 5, backgroundColor: "#fbcfe8" },
});