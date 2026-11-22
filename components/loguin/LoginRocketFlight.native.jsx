import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export const LOGIN_ROCKET_LAUNCH_DURATION_MS = 740;
export const LOGIN_ROCKET_REDUCED_DURATION_MS = 180;

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_ANTICIPATION = Easing.out(Easing.quad);
const EASE_BOOST = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_FLIGHT = Easing.in(Easing.quad);

function RocketIllustration({ isLaunching = false, reducedMotion = false, active = true }) {
  const flameBoost = useSharedValue(1);
  const hover = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(hover);
    hover.set(0);
    if (!active || reducedMotion || isLaunching) return undefined;
    hover.set(withRepeat(withTiming(1, {
      duration: 3200,
      easing: Easing.inOut(Easing.sin),
      reduceMotion: ReduceMotion.Never,
    }), -1, true, undefined, ReduceMotion.Never));
    return () => cancelAnimation(hover);
  }, [active, hover, isLaunching, reducedMotion]);

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

  const rocketStyle = useAnimatedStyle(() => {
    const value = hover.get();
    return {
      transform: [
        { perspective: 700 },
        { translateY: -value * 9 },
        { rotateY: `${value * 12 - 6}deg` },
        { rotateZ: `${value * 4 - 2}deg` },
        { scale: flameBoost.get() },
      ],
    };
  });
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 850 }, { rotateX: `${hover.get() * 9}deg` }],
  }));

  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hero}>
      <Animated.View style={[styles.heroPlanet, orbitStyle]}>
        <Svg width="330" height="164" viewBox="0 0 330 164">
          <Defs>
            <RadialGradient id="vkGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#147afc" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#147afc" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="vkPlanet" cx="35%" cy="18%" rx="75%" ry="88%">
              <Stop offset="0" stopColor="#6deaff" />
              <Stop offset="0.3" stopColor="#1269d8" />
              <Stop offset="0.75" stopColor="#0a2453" />
              <Stop offset="1" stopColor="#071221" />
            </RadialGradient>
            <LinearGradient id="vkTile" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3569b7" />
              <Stop offset="1" stopColor="#10223f" />
            </LinearGradient>
          </Defs>
          <Ellipse cx="174" cy="93" rx="159" ry="70" fill="url(#vkGlow)" />
          <G transform="rotate(-12 165 101)">
            <Ellipse cx="165" cy="101" rx="156" ry="35" fill="none" stroke="#348bff" strokeOpacity="0.36" strokeWidth="7" />
            <Ellipse cx="165" cy="101" rx="156" ry="35" fill="none" stroke="#70ddff" strokeWidth="1.8" />
          </G>
          <Circle cx="168" cy="139" r="63" fill="url(#vkPlanet)" stroke="#6cd9ff" strokeWidth="1.5" />
          <G fill="none" stroke="#7ddaff" strokeOpacity="0.38">
            <Ellipse cx="168" cy="139" rx="31" ry="63" />
            <Ellipse cx="168" cy="139" rx="51" ry="63" />
            <Ellipse cx="168" cy="139" rx="61" ry="21" />
            <Path d="M112 110 Q168 136 224 110 M115 155 Q168 129 221 155" />
          </G>
          {[[23,29],[79,15],[123,37],[282,22],[307,85],[44,123],[267,126]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={i%2 ? 1.5 : 2.5} fill="#b7efff" opacity={0.8} />)}
          <G transform="translate(40 75) rotate(-10)">
            <Rect width="47" height="48" rx="12" fill="url(#vkTile)" stroke="#73caff" />
            <Rect x="15" y="8" width="17" height="31" rx="4" fill="none" stroke="#d8f5ff" strokeWidth="2.5" />
            <Path d="M19 25l5-6 5 6 M24 19v13" fill="none" stroke="#6ee7ff" strokeWidth="2.5" />
          </G>
          <G transform="translate(247 89) rotate(12)">
            <Rect width="47" height="48" rx="12" fill="url(#vkTile)" stroke="#73caff" />
            <Path d="M10 20h27l-3-9H13z M13 21v17h21V21 M21 38V27h8v11" fill="none" stroke="#d8f5ff" strokeWidth="2.5" strokeLinejoin="round" />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.rocketIllustration, rocketStyle]}>
        <Svg width="132" height="152" viewBox="0 0 120 140">
          <Defs>
            <LinearGradient id="vkMetal" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#355a9c" />
              <Stop offset="0.23" stopColor="#e9f8ff" />
              <Stop offset="0.55" stopColor="#b7d3ef" />
              <Stop offset="1" stopColor="#263d71" />
            </LinearGradient>
            <LinearGradient id="vkBlue" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#a8f4ff" />
              <Stop offset="0.45" stopColor="#247aff" />
              <Stop offset="1" stopColor="#11266e" />
            </LinearGradient>
            <LinearGradient id="vkJet" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e7ffff" />
              <Stop offset="0.35" stopColor="#46ddff" />
              <Stop offset="1" stopColor="#1669ff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <G transform="translate(61 54) rotate(24)">
            <Path d="M-12 27 Q-24 62 0 83 Q24 62 12 27Z" fill="url(#vkJet)" />
            <Path d="M-5 28 Q-9 49 0 59 Q9 49 5 28Z" fill="#e6ffff" />
            <Path d="M-17 10Q-35 16-35 37L-12 25 M17 10Q35 16 35 37L12 25" fill="url(#vkBlue)" stroke="#72b6ff" />
            <Path d="M0-44Q-28-18-20 17L-13 30H13L20 17Q28-18 0-44Z" fill="url(#vkMetal)" stroke="#b0d9ff" strokeWidth="1" />
            <Path d="M0-44Q-14-32-19-19Q0-11 19-19Q14-32 0-44Z" fill="url(#vkBlue)" />
            <Circle cy="-4" r="12" fill="#071b3e" stroke="#61caff" strokeWidth="3" />
            <Path d="M-6 -6 L0 1 7 -8" fill="none" stroke="#93ecff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M-14 23H14L11 32H-11Z" fill="url(#vkBlue)" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function LoginRocketFlight({
  children,
  isLaunching = false,
  onLaunchComplete,
  reducedMotion = false,
  showRocket = true,
  active = true,
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
      { perspective: 1000 },
      { rotateY: `${flightRotateDeg.get() * 3}deg` },
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
          active={active}
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
  hero: {
    height: 156,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  heroPlanet: { position: "absolute", bottom: 0, alignSelf: "center" },
  rocketIllustration: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 132,
    height: 152,
    zIndex: 2,
  },
});
