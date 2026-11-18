import React, { useCallback, useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const CLOUDS = [
  { top: "13%", height: 155, speed: 5.5, opacity: 0.32, color: "#887fff", lobes: [[195, 58, 195, 44], [113, 45, 112, 38], [280, 51, 127, 37]] },
  { top: "38%", height: 190, speed: 10, opacity: 0.49, color: "#64b4ff", lobes: [[200, 64, 200, 48], [131, 44, 93, 46], [240, 44, 109, 39]] },
  { top: "67%", height: 215, speed: 16, opacity: 0.55, color: "#99c8ff", lobes: [[202, 66, 195, 43], [80, 59, 80, 38], [165, 47, 107, 41], [284, 49, 108, 55]] },
];
const STARS = [[24, 17], [79, 33], [117, 78], [170, 16], [209, 57], [252, 25], [312, 67], [366, 43], [391, 8]];

const CloudArt = React.memo(function CloudArt({ layer, width }) {
  return (
    <Svg width={width} height={layer.height} viewBox="0 0 400 120" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="cloud" cx="50%" cy="49%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={layer.color} stopOpacity={0.86} />
          <Stop offset="0.46" stopColor={layer.color} stopOpacity={0.49} />
          <Stop offset="1" stopColor={layer.color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {layer.lobes.map(([cx, cy, rx, ry]) => (
        <Ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#cloud)" />
      ))}
    </Svg>
  );
});

function CloudLayer({ layer, clock, width, index }) {
  const track = useAnimatedStyle(() => {
    const x = (clock.get() * layer.speed + width * index * 0.29) % width;
    return { transform: [{ translateX: -x }] };
  }, [layer.speed, index, width]);
  return (
    <View style={[styles.lane, { height: layer.height, opacity: layer.opacity, top: layer.top }]}>
      <Animated.View style={[styles.track, { width: width * 2 }, track]}>
        <CloudArt layer={layer} width={width} />
        <CloudArt layer={layer} width={width} />
      </Animated.View>
    </View>
  );
}

function ParticleLayer({ clock, width, near }) {
  const drift = useAnimatedStyle(() => {
    const value = clock.get();
    const rate = near ? 0.36 : 0.22;
    return {
      opacity: 0.68 + Math.sin(value * rate) * 0.22,
      transform: [
        { translateX: Math.sin(value * rate) * (near ? 44 : 22) },
        { translateY: Math.cos(value * rate * 0.73) * (near ? 14 : 7) },
      ],
    };
  }, [near]);
  return (
    <Animated.View style={[styles.particles, { top: near ? "64%" : "12%" }, drift]}>
      <Svg width={width} height={135} viewBox="0 0 420 95" preserveAspectRatio="none">
        {STARS.map(([x, y], index) => (
          <Circle key={x} cx={near ? 420 - x : x} cy={y} r={near ? 0.85 + index % 3 * 0.35 : 0.65}
            fill="#cbe9ff" opacity={0.3 + index % 4 * 0.14} />
        ))}
      </Svg>
    </Animated.View>
  );
}

export default function LoginAtmosphere({
  enabled, reducedMotion = false, compact = false, foreground = false, authenticating = false, confirmed = false,
}) {
  const { width } = useWindowDimensions();
  const tileWidth = Math.max(1, width) * 1.48;
  const clock = useSharedValue(0);
  const speed = useSharedValue(1);
  const advanceClock = useCallback(({ timeSincePreviousFrame }) => {
    "worklet";
    const elapsed = Math.min(timeSincePreviousFrame ?? 0, 34) / 1000;
    clock.set(clock.get() + elapsed * speed.get());
  }, [clock, speed]);
  const frame = useFrameCallback(advanceClock, false);

  useEffect(() => {
    frame.setActive(enabled && !reducedMotion);
    return () => frame.setActive(false);
  }, [enabled, frame, reducedMotion]);

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    speed.set(withTiming(foreground ? 4.5 : confirmed ? 3.8 : authenticating ? 0.28 : 1, {
      duration: 260,
      reduceMotion: ReduceMotion.Never,
    }));
    return () => cancelAnimation(speed);
  }, [authenticating, confirmed, enabled, foreground, reducedMotion, speed]);

  const layers = foreground ? [CLOUDS[2]] : compact || reducedMotion ? [CLOUDS[0], CLOUDS[2]] : CLOUDS;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}
    >
      {layers.map((layer, index) => (
        <CloudLayer key={layer.speed} layer={layer} clock={clock} width={tileWidth} index={index} />
      ))}
      {!foreground && !compact && !reducedMotion ? (
        <>
          <ParticleLayer clock={clock} width={width} />
          <ParticleLayer clock={clock} width={width} near />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  lane: { left: 0, right: 0, position: "absolute" },
  track: { flexDirection: "row" },
  particles: { position: "absolute", left: 0 },
});
