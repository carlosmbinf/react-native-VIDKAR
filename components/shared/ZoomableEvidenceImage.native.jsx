import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const clamp = (value, minimum, maximum) => {
  "worklet";
  return Math.min(Math.max(value, minimum), maximum);
};

export default function ZoomableEvidenceImage({ source, style }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const springConfig = useMemo(
    () => ({
      dampingRatio: 0.8,
      duration: 300,
      reduceMotion: reducedMotion ? ReduceMotion.Always : ReduceMotion.System,
    }),
    [reducedMotion],
  );

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.set(scale.get());
    })
    .onUpdate((event) => {
      scale.set(clamp(savedScale.get() * event.scale, 1, 4));
    })
    .onEnd(() => {
      if (scale.get() <= 1.02) {
        scale.set(withSpring(1, springConfig));
        translateX.set(withSpring(0, springConfig));
        translateY.set(withSpring(0, springConfig));
      }
    });

  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      savedTranslateX.set(translateX.get());
      savedTranslateY.set(translateY.get());
    })
    .onUpdate((event) => {
      if (scale.get() > 1) {
        translateX.set(savedTranslateX.get() + event.translationX);
        translateY.set(savedTranslateY.get() + event.translationY);
      }
    })
    .onEnd(() => {
      if (scale.get() <= 1) {
        translateX.set(withSpring(0, springConfig));
        translateY.set(withSpring(0, springConfig));
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(280)
    .onEnd(() => {
      const zoomed = scale.get() > 1;
      scale.set(withSpring(zoomed ? 1 : 2, springConfig));
      translateX.set(withSpring(0, springConfig));
      translateY.set(withSpring(0, springConfig));
    });

  const gesture = Gesture.Simultaneous(
    Gesture.Simultaneous(pinch, pan),
    doubleTap,
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Animated.Image
          resizeMode="contain"
          source={source}
          style={[style, imageStyle]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    minHeight: 200,
    overflow: "hidden",
    width: "100%",
  },
});
