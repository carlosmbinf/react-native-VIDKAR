import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export const LOGIN_ROCKET_LAUNCH_DURATION_MS = 740;
export const LOGIN_ROCKET_REDUCED_DURATION_MS = 180;

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_ANTICIPATION = Easing.out(Easing.quad);
const EASE_BOOST = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_FLIGHT = Easing.in(Easing.quad);

function RocketIllustration({ isLaunching = false, reducedMotion = false }) {
  const flameBoost = useSharedValue(1);

  useEffect(() => {
    if (!isLaunching || reducedMotion) {
      cancelAnimation(flameBoost);
      flameBoost.set(1);
      return undefined;
    }

    flameBoost.set(
      withSequence(
        withTiming(1.08, {
          duration: Math.round(LOGIN_ROCKET_LAUNCH_DURATION_MS * 0.22),
          easing: EASE_ANTICIPATION,
          reduceMotion: ReduceMotion.Never,
        }),
        withTiming(1.16, {
          duration: Math.round(LOGIN_ROCKET_LAUNCH_DURATION_MS * 0.78),
          easing: EASE_BOOST,
          reduceMotion: ReduceMotion.Never,
        }),
      ),
    );

    return () => cancelAnimation(flameBoost);
  }, [flameBoost, isLaunching, reducedMotion]);

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameBoost.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      style={[styles.rocketIllustration, rocketStyle]}
    >
      <Svg width="260" height="140" viewBox="0 0 260 140">
        <Path
          d="M160 49C110 68 64 96 20 132M174 54c13 30 39 57 68 78"
          fill="none"
          stroke="#93c5fd"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <Circle cx="20" cy="132" r="4" fill="#93c5fd" />
        <Circle cx="242" cy="132" r="4" fill="#93c5fd" />
        <G transform="translate(168 45) rotate(38)">
          <Path
            d="M-13 22-27 42-10 36M13 22l14 20 10-6-14-20"
            fill="#6366f1"
            stroke="#3730a3"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <Path d="M-7 32Q0 58 7 32" fill="#fb923c" />
          <Path d="M-3 32Q0 47 3 32" fill="#fef08a" />
          <Path
            d="M0-38C-14-25-16 5-11 25Q0 31 11 25C16 5 14-25 0-38Z"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <Path d="M-11 17Q0 21 11 17v7q-11 6-22 0Z" fill="#6366f1" />
          <Circle cy="-5" r="8" fill="#0284c7" stroke="#dbeafe" strokeWidth="2" />
          <Path
            d="M-4-9q4-3 8 0"
            fill="none"
            stroke="#fff"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

export default function LoginRocketFlight({
  children,
  isLaunching = false,
  onLaunchComplete,
  reducedMotion = false,
  showRocket = true,
}) {
  const { height, width } = useWindowDimensions();
  const completionRef = React.useRef(onLaunchComplete);
  const flightRunRef = React.useRef(0);
  const dimensionsRef = React.useRef({ height, width });
  useEffect(() => {
    completionRef.current = onLaunchComplete;
    dimensionsRef.current = { height, width };
  }, [height, onLaunchComplete, width]);
  const completeFlight = React.useCallback((run) => {
    if (flightRunRef.current !== run) {
      return;
    }
    flightRunRef.current += 1;
    completionRef.current?.();
  }, []);
  const cardEntranceProgress = useSharedValue(reducedMotion ? 1 : 0);
  const flightOpacity = useSharedValue(1);
  const flightTranslateX = useSharedValue(0);
  const flightTranslateY = useSharedValue(0);
  const flightRotateDeg = useSharedValue(0);
  const flightScale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(cardEntranceProgress);

    if (reducedMotion) {
      cardEntranceProgress.set(
        withTiming(1, {
          duration: 160,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.Never,
        }),
      );
    } else {
      cardEntranceProgress.set(
        withTiming(1, {
          duration: 320,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.Never,
        }),
      );
    }

    return () => cancelAnimation(cardEntranceProgress);
  }, [cardEntranceProgress, reducedMotion]);

  useEffect(() => {
    const run = ++flightRunRef.current;
    // El teclado y la rotación no deben reiniciar un vuelo ya iniciado.
    const { height, width } = dimensionsRef.current;
    const notifyCompletion = (finished) => {
      "worklet";
      if (finished) {
        scheduleOnRN(completeFlight, run);
      }
    };
    cancelAnimation(flightOpacity);
    cancelAnimation(flightTranslateX);
    cancelAnimation(flightTranslateY);
    cancelAnimation(flightRotateDeg);
    cancelAnimation(flightScale);

    if (!isLaunching) {
      flightOpacity.set(1);
      flightTranslateX.set(0);
      flightTranslateY.set(0);
      flightRotateDeg.set(0);
      flightScale.set(1);
      return undefined;
    }

    if (reducedMotion) {
      flightOpacity.set(
        withTiming(0, {
          duration: LOGIN_ROCKET_REDUCED_DURATION_MS,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.Never,
        }, notifyCompletion),
      );
      return () => {
        flightRunRef.current += 1;
        cancelAnimation(flightOpacity);
      };
    }

    const fadeStart = Math.round(LOGIN_ROCKET_LAUNCH_DURATION_MS * 0.7);
    const fadeDuration = LOGIN_ROCKET_LAUNCH_DURATION_MS - fadeStart;
    const flightTiming = {
      duration: LOGIN_ROCKET_LAUNCH_DURATION_MS,
      easing: EASE_FLIGHT,
      reduceMotion: ReduceMotion.Never,
    };

    flightTranslateX.set(
      withTiming(width * 0.42, flightTiming),
    );
    flightTranslateY.set(
      withTiming(-height * 1.25, flightTiming),
    );
    flightRotateDeg.set(
      withTiming(8, flightTiming),
    );
    flightScale.set(
      withTiming(0.72, flightTiming),
    );
    flightOpacity.set(
      withSequence(
        withTiming(1, {
          duration: fadeStart,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }),
        withTiming(0, {
          duration: fadeDuration,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }, notifyCompletion),
      ),
    );

    return () => {
      flightRunRef.current += 1;
      cancelAnimation(flightOpacity);
      cancelAnimation(flightTranslateX);
      cancelAnimation(flightTranslateY);
      cancelAnimation(flightRotateDeg);
      cancelAnimation(flightScale);
    };
  }, [
    completeFlight,
    flightOpacity,
    flightRotateDeg,
    flightScale,
    flightTranslateX,
    flightTranslateY,
    isLaunching,
    reducedMotion,
  ]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const entrance = cardEntranceProgress.get();
    return {
      opacity: 0.12 + entrance * 0.88,
      transform: [
        { translateY: reducedMotion ? 0 : (1 - entrance) * 18 },
        { scale: reducedMotion ? 1 : 0.97 + entrance * 0.03 },
      ],
    };
  }, [reducedMotion]);

  const flightStyle = useAnimatedStyle(() => ({
    opacity: flightOpacity.get(),
    transform: [
      { translateX: flightTranslateX.get() },
      { translateY: flightTranslateY.get() },
      { rotate: `${flightRotateDeg.get()}deg` },
      { scale: flightScale.get() },
    ],
  }));

  return (
    <Animated.View
      collapsable={false}
      pointerEvents={isLaunching ? "none" : "auto"}
      style={[styles.container, flightStyle]}
    >
      {showRocket || isLaunching ? (
        <RocketIllustration
          isLaunching={isLaunching}
          reducedMotion={reducedMotion}
        />
      ) : null}
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <View style={styles.cardInner}>{children}</View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  card: {
    width: "100%",
    zIndex: 1,
  },
  cardInner: {
    width: "100%",
  },
  rocketIllustration: {
    height: 140,
    position: "absolute",
    right: -8,
    top: -98,
    width: 260,
    zIndex: 2,
  },
});
