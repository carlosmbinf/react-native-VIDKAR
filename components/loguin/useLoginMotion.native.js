import { useCallback, useEffect } from "react";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export { Animated };

export default function useLoginMotion({ enabled, submitting, confirmed }) {
  const press = useSharedValue(0);
  const wave = useSharedValue(1);
  const rejection = useSharedValue(0);
  const glow = useSharedValue(0);
  const anticipation = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    anticipation.set(withSpring(confirmed ? 1 : submitting ? 0.42 : 0, {
      duration: 185, dampingRatio: 0.85, reduceMotion: ReduceMotion.Never,
    }));
    return () => cancelAnimation(anticipation);
  }, [anticipation, confirmed, enabled, submitting]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      for (const value of [press, wave, rejection, glow, anticipation]) cancelAnimation(value);
      press.set(0);
      wave.set(1);
      rejection.set(0);
      glow.set(0);
      anticipation.set(0);
    };
  }, [anticipation, enabled, glow, press, rejection, wave]);

  const pressIn = useCallback(() => {
    if (!enabled) return;
    press.set(withSpring(1, { mass: 0.45, stiffness: 360, damping: 20 }));
  }, [enabled, press]);
  const pressOut = useCallback(() => {
    if (!enabled) return;
    press.set(withSpring(0, { mass: 0.55, stiffness: 300, damping: 21 }));
  }, [enabled, press]);
  const pulse = useCallback(() => {
    if (!enabled) return;
    cancelAnimation(wave);
    wave.set(0);
    wave.set(withTiming(1, { duration: 390 }));
  }, [enabled, wave]);
  useEffect(() => {
    if (confirmed) pulse();
  }, [confirmed, pulse]);

  const reject = useCallback(() => {
    if (!enabled) return;
    rejection.set(withSequence(
      withTiming(1, { duration: 70 }),
      withSpring(0, { mass: 0.52, damping: 8, stiffness: 205 }),
    ));
    glow.set(withSequence(withTiming(1, { duration: 105 }), withTiming(0, { duration: 490 })));
  }, [enabled, glow, rejection]);

  const cardStyle = useAnimatedStyle(() => {
    const depth = anticipation.get();
    const shake = rejection.get();
    if (Math.abs(shake) < 0.001 && depth < 0.001) return { transform: [] };
    return { transform: [
      { perspective: 1050 },
      { translateY: -depth * 7 },
      { scale: 1 + depth * 0.012 },
      { rotateX: `${depth * 3}deg` },
      { rotateY: `${shake * 5 - depth * 1.5}deg` },
    ] };
  });
  const passwordStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rejection.get() * 10 }] }));
  const buttonStyle = useAnimatedStyle(() => {
    const depth = Math.max(press.get(), anticipation.get() * 0.6);
    return { transform: [
      { perspective: 760 },
      { translateY: depth * 1.8 },
      { scale: 1 - depth * 0.04 },
      { rotateX: `${depth * 5}deg` },
    ] };
  });
  const waveStyle = useAnimatedStyle(() => {
    const value = wave.get();
    return {
      opacity: Math.sin(Math.PI * value) * 0.75,
      transform: [{ translateX: (value - 0.5) * 540 }, { skewX: "-19deg" }],
    };
  });
  const errorStyle = useAnimatedStyle(() => ({ opacity: glow.get() * 0.7 }));

  return { buttonStyle, cardStyle, errorStyle, passwordStyle, pressIn, pressOut, pulse, reject, waveStyle };
}
