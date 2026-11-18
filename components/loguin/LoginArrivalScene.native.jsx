import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export default function LoginArrivalScene({
  children,
  enabled = false,
  reducedMotion = false,
}) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    cancelAnimation(progress);

    if (!enabled) {
      progress.set(1);
      return undefined;
    }

    progress.set(0);
    progress.set(
      withTiming(1, {
        duration: reducedMotion ? 160 : 320,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.Never,
      }),
    );

    return () => cancelAnimation(progress);
  }, [enabled, progress, reducedMotion]);

  const arrivalStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: value,
      transform: [
        { translateY: reducedMotion ? 0 : (1 - value) * 18 },
        { scale: reducedMotion ? 1 : 0.985 + value * 0.015 },
      ],
    };
  }, [reducedMotion]);

  return (
    <Animated.View
      collapsable={false}
      style={[styles.container, arrivalStyle]}
    >
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
  },
});
