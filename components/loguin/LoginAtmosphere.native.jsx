import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Ellipse, G } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

function CloudArt({ height, width }) {
  return (
    <Svg height={height} viewBox="0 0 800 320" width={width}>
      <G fill="#a8d7ff" opacity={0.38}>
        <Ellipse cx="205" cy="246" rx="170" ry="54" />
        <Circle cx="112" cy="212" r="62" />
        <Circle cx="188" cy="159" r="84" />
        <Circle cx="277" cy="204" r="68" />
        <Ellipse cx="516" cy="274" rx="116" ry="38" />
        <Circle cx="452" cy="248" r="48" />
        <Circle cx="507" cy="210" r="62" />
        <Circle cx="573" cy="246" r="48" />
      </G>
      <G fill="#e0f2fe" opacity={0.36}>
        <Ellipse cx="188" cy="116" rx="38" ry="9" />
        <Ellipse cx="504" cy="164" rx="27" ry="7" />
      </G>
    </Svg>
  );
}

function CloudLayer({ duration, enabled, height, opacity, reducedMotion, top, width }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      progress.set(0);
      return undefined;
    }

    progress.set(withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    ));

    return () => cancelAnimation(progress);
  }, [duration, enabled, progress, reducedMotion]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.get() * width }],
  }), [width]);

  return (
    <View pointerEvents="none" style={[styles.layer, { height, opacity, top }]}>
      <Animated.View style={[styles.track, { height, width: width * 2 }, trackStyle]}>
        {[0, 1].map((group) => (
          <View key={group} style={[styles.group, { height, width }]}>
            <CloudArt height={height} width={width / 2} />
            <CloudArt height={height} width={width / 2} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export default function LoginAtmosphere({ enabled = true, reducedMotion = false }) {
  const { height, width } = useWindowDimensions();
  const cloudHeight = Math.max(68, Math.min(width * 0.24, height * 0.14));

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}
    >
      <CloudLayer duration={36000} enabled={enabled} height={cloudHeight} opacity={0.15} reducedMotion={reducedMotion} top={height * 0.13} width={width} />
      <CloudLayer duration={25000} enabled={enabled} height={cloudHeight} opacity={0.19} reducedMotion={reducedMotion} top={height * 0.39} width={width} />
      <CloudLayer duration={17000} enabled={enabled} height={cloudHeight} opacity={0.16} reducedMotion={reducedMotion} top={height * 0.67} width={width} />
      <View style={[styles.orbit, styles.orbitFar]} />
      <View style={[styles.orbit, styles.orbitNear]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  layer: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  track: {
    flexDirection: "row",
    left: 0,
    position: "absolute",
    top: 0,
  },
  group: {
    flexDirection: "row",
    flexShrink: 0,
  },
  orbit: {
    borderColor: "rgba(147, 197, 253, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    position: "absolute",
  },
  orbitFar: {
    height: 126,
    right: -48,
    top: "12%",
    width: 126,
  },
  orbitNear: {
    bottom: "12%",
    height: 58,
    left: "12%",
    width: 58,
  },
});
