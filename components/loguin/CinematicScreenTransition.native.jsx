import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router/react-navigation";
import React, { createContext, useContext, useLayoutEffect, useState } from "react";
import { Keyboard, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import LoginAtmosphere from "./LoginAtmosphere.native";
import { CINEMATIC_DURATION, menuEntrance, screenPoses } from "./cinematicTimeline";

const MenuTimeline = createContext(null);

export function MainMenuEntranceMotion({ children, offset = 0, distance = 18, style }) {
  const time = useContext(MenuTimeline);
  const entranceStyle = useAnimatedStyle(() => {
    const progress = time ? menuEntrance(time.get(), offset) : 1;
    if (progress === 1) return { opacity: 1, transform: [] };
    return {
      opacity: 0.12 + Math.min(progress, 1) * 0.88,
      transform: [
        { perspective: 920 },
        { translateY: (1 - progress) * distance },
        { scale: 0.955 + progress * 0.045 },
        { rotateX: `${(1 - progress) * 7}deg` },
      ],
    };
  }, [time, offset, distance]);
  return <Animated.View style={[style, entranceStyle]}>{children}</Animated.View>;
}

export default function CinematicScreenTransition({
  active, appActive, children, fallback, login, onComplete, reducedMotion,
}) {
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const time = useSharedValue(login ? 0 : CINEMATIC_DURATION);
  const [hasMenuLayout, setHasMenuLayout] = useState(false);
  const hasLogin = Boolean(login);
  const hasMenu = Boolean(children);
  const canPlay = active && appActive && focused && !reducedMotion;

  useLayoutEffect(() => {
    if (!active) {
      time.set(hasLogin ? 0 : CINEMATIC_DURATION);
      return;
    }
    if (!canPlay) {
      time.set(CINEMATIC_DURATION);
      onComplete();
      return;
    }

    let frame;
    let kickoff;
    let started = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      time.set(CINEMATIC_DURATION);
      onComplete();
    };
    const start = () => {
      if (started || finished) return;
      started = true;
      frame = requestAnimationFrame(() => {
        time.set(withTiming(CINEMATIC_DURATION, {
          duration: CINEMATIC_DURATION,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }, (completed) => {
          if (completed) scheduleOnRN(finish);
        }));
      });
    };

    // onLayout and the keyboard are allowed a brief head start. The watchdog
    // releases the real menu even if a layout event or worklet never completes.
    const watchdog = setTimeout(finish, CINEMATIC_DURATION + 450);
    const keyboard = Keyboard.addListener("keyboardDidHide", () => {
      if (hasMenuLayout) start();
    });
    if (hasMenuLayout) {
      if (Keyboard.isVisible()) kickoff = setTimeout(start, 230);
      else start();
    }
    return () => {
      finished = true;
      keyboard.remove();
      clearTimeout(kickoff);
      clearTimeout(watchdog);
      if (frame !== undefined) cancelAnimationFrame(frame);
      cancelAnimation(time);
    };
  }, [active, canPlay, hasLogin, hasMenuLayout, onComplete, time]);

  useLayoutEffect(() => {
    if (!hasMenu) setHasMenuLayout(false);
  }, [hasMenu]);

  const perspective = Math.max(760, width * 2.45);
  const outgoing = useAnimatedStyle(() => {
    const value = time.get();
    if (value === 0) return { transform: [] };
    const pose = screenPoses(value);
    return { transform: [
      { perspective },
      { translateX: pose.loginX * width },
      { translateY: pose.loginY },
      { scale: pose.loginScale },
      { rotateY: `${pose.loginYaw}deg` },
      { rotateX: `${pose.loginPitch}deg` },
    ] };
  }, [perspective, width]);
  const incoming = useAnimatedStyle(() => {
    if (!canPlay || time.get() >= 1320) return { transform: [] };
    const pose = screenPoses(time.get());
    return { transform: [
      { perspective },
      { translateX: pose.menuX * width },
      { translateY: pose.menuY },
      { scale: pose.menuScale },
      { rotateY: `${pose.menuYaw}deg` },
      { rotateX: `${pose.menuPitch}deg` },
    ] };
  }, [canPlay, perspective, width]);
  const edgeLighting = useAnimatedStyle(() => {
    const { rim } = screenPoses(time.get());
    return { opacity: rim };
  });
  const mist = useAnimatedStyle(() => {
    const pose = screenPoses(time.get());
    return {
      opacity: pose.mist,
      transform: [{ translateX: pose.loginX * width * 0.27 }, { scale: 1.16 }],
    };
  }, [width]);

  return (
    <View style={styles.stage}>
      {fallback}
      {login ? (
        <Animated.View
          key="login"
          pointerEvents={active ? "none" : "auto"}
          accessibilityElementsHidden={active}
          importantForAccessibility={active ? "no-hide-descendants" : "auto"}
          style={[styles.screen, outgoing]}
        >
          {login}
          {canPlay ? <Animated.View pointerEvents="none" style={[styles.loginRim, edgeLighting]} /> : null}
        </Animated.View>
      ) : null}

      {canPlay ? (
        <Animated.View key="mist" pointerEvents="none" style={[styles.screen, mist]}>
          <LoginAtmosphere enabled={canPlay} compact foreground />
        </Animated.View>
      ) : null}

      {hasMenu ? (
        <Animated.View
          key="menu"
          onLayout={() => setHasMenuLayout(true)}
          pointerEvents={canPlay ? "none" : "auto"}
          accessibilityElementsHidden={canPlay}
          importantForAccessibility={canPlay ? "no-hide-descendants" : "auto"}
          style={[styles.screen, incoming]}
        >
          <MenuTimeline.Provider value={canPlay ? time : null}>
            {children}
          </MenuTimeline.Provider>
          {canPlay ? (
            <Animated.View pointerEvents="none" style={[styles.menuRim, edgeLighting]}>
              <LinearGradient
                colors={["#9ce8ffcc", "#63a9ff33", "#63a9ff00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.2 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: "#060e20", overflow: "hidden" },
  screen: { ...StyleSheet.absoluteFillObject },
  loginRim: {
    ...StyleSheet.absoluteFillObject,
    borderRightWidth: 3,
    borderRightColor: "#7198d7",
    backgroundColor: "#02091b38",
  },
  menuRim: {
    position: "absolute", top: 0, bottom: 0, left: 0, width: 36,
    borderLeftWidth: 2, borderLeftColor: "#c7f4ff", borderTopLeftRadius: 14,
    overflow: "hidden",
  },
});
