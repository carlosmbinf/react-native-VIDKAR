import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Vibration,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";

const TRACK_PADDING = 4;
const THUMB_SIZE = 56;
const CONFIRMATION_THRESHOLD = 0.82;
const FALLBACK_RESET_DELAY = 900;

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return { blue: 0, green: 0, red: 0 };
  }

  const value = Number.parseInt(normalized, 16);

  return {
    blue: value & 255,
    green: (value >> 8) & 255,
    red: (value >> 16) & 255,
  };
};

const SlideToConfirm = ({
  onConfirm,
  backgroundColor = "#2563eb",
  icon = "\u25b6",
  text = "Desliza para confirmar",
  disabled = false,
  onInteractionChange,
}) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const currentValueRef = useRef(0);
  const disabledWasTrueRef = useRef(false);
  const dragStartValueRef = useRef(0);

  const maxSlide = useMemo(
    () => Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 0),
    [trackWidth],
  );

  useEffect(() => {
    const listenerId = slideAnimation.addListener(({ value }) => {
      currentValueRef.current = value;
    });

    return () => {
      slideAnimation.removeListener(listenerId);
    };
  }, [slideAnimation]);

  const resetThumb = useCallback(() => {
    setIsDragging(false);
    onInteractionChange?.(false);
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 8,
      speed: 14,
    }).start();
  }, [onInteractionChange, slideAnimation]);

  useEffect(() => {
    if (!isCompleting) {
      disabledWasTrueRef.current = false;
      return;
    }

    if (disabled) {
      disabledWasTrueRef.current = true;
      slideAnimation.stopAnimation();
      slideAnimation.setValue(maxSlide);
      return;
    }

    if (disabledWasTrueRef.current) {
      disabledWasTrueRef.current = false;
      setIsCompleting(false);
      resetThumb();
      return;
    }

    const fallbackReset = setTimeout(() => {
      disabledWasTrueRef.current = false;
      setIsCompleting(false);
      resetThumb();
    }, FALLBACK_RESET_DELAY);

    return () => {
      clearTimeout(fallbackReset);
    };
  }, [disabled, isCompleting, maxSlide, resetThumb, slideAnimation]);

  const updateThumbPosition = useCallback((deltaX) => {
    const nextValue = Math.max(
      0,
      Math.min(dragStartValueRef.current + deltaX, maxSlide),
    );
    slideAnimation.setValue(nextValue);
  }, [maxSlide, slideAnimation]);

  const confirmSlide = useCallback(() => {
    if (isCompleting || disabled) {
      return;
    }

    setIsDragging(false);
    setIsCompleting(true);
    onInteractionChange?.(false);
    Vibration.vibrate([0, 45, 90, 45]);

    Animated.timing(slideAnimation, {
      toValue: maxSlide,
      duration: 120,
      useNativeDriver: false,
    }).start(() => {
      onConfirm?.();
    });
  }, [disabled, isCompleting, maxSlide, onConfirm, onInteractionChange, slideAnimation]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && maxSlide > 0,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !disabled &&
          maxSlide > 0 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (!disabled) {
            setIsDragging(true);
            onInteractionChange?.(true);
            dragStartValueRef.current = currentValueRef.current;
            Vibration.vibrate(10);
          }
        },
        onPanResponderMove: (_event, gestureState) => {
          if (disabled) {
            return;
          }

          updateThumbPosition(gestureState.dx);
        },
        onPanResponderRelease: () => {
          if (disabled) {
            onInteractionChange?.(false);
            return;
          }

          if (currentValueRef.current >= maxSlide * CONFIRMATION_THRESHOLD) {
            confirmSlide();
            return;
          }

          Vibration.vibrate(45);
          resetThumb();
        },
        onPanResponderTerminate: () => {
          if (isCompleting) {
            return;
          }

          resetThumb();
        },
      }),
    [confirmSlide, disabled, isCompleting, maxSlide, onInteractionChange, resetThumb, updateThumbPosition],
  );

  const textOpacity = slideAnimation.interpolate({
    inputRange: [0, maxSlide * 0.5 || 1, maxSlide || 1],
    outputRange: [1, 0.75, 0.08],
    extrapolate: "clamp",
  });

  const progressWidth = slideAnimation.interpolate({
    inputRange: [0, maxSlide || 1],
    outputRange: [THUMB_SIZE, maxSlide + THUMB_SIZE || THUMB_SIZE],
    extrapolate: "clamp",
  });
  const textBaseColor = useMemo(() => hexToRgb(backgroundColor), [backgroundColor]);
  const textColor = slideAnimation.interpolate({
    inputRange: [0, maxSlide * 0.5 || 1, maxSlide || 1],
    outputRange: [
      `rgb(${textBaseColor.red}, ${textBaseColor.green}, ${textBaseColor.blue})`,
      `rgb(${textBaseColor.red}, ${textBaseColor.green}, ${textBaseColor.blue})`,
      "rgb(0, 0, 0)",
    ],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <View
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        style={[
          styles.track,
          {
            backgroundColor: theme.dark
              ? "rgba(148, 163, 184, 0.16)"
              : "rgba(15, 23, 42, 0.06)",
            borderColor: backgroundColor,
            opacity: disabled ? 0.68 : 1,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.progress,
            {
              backgroundColor: `${backgroundColor}${theme.dark ? "26" : "22"}`,
              width: progressWidth,
            },
          ]}
        />

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: textColor,
              // opacity: disabled && isCompleting ? 0.12 : textOpacity,
            },
          ]}
        >
          {text}
        </Animated.Text>

        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor,
              shadowOpacity: isDragging || isCompleting ? 0.3 : 0.18,
              transform: [{ translateX: slideAnimation }],
            },
          ]}
        >
          <Text style={styles.thumbText}>{icon}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  track: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: THUMB_SIZE + TRACK_PADDING * 2,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  progress: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    paddingHorizontal: THUMB_SIZE + 28,
    textAlign: "center",
  },
  thumb: {
    alignItems: "center",
    borderRadius: THUMB_SIZE / 2,
    height: THUMB_SIZE,
    justifyContent: "center",
    left: TRACK_PADDING,
    position: "absolute",
    shadowColor: "#0f172a",
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowRadius: 14,
    top: TRACK_PADDING,
    width: THUMB_SIZE,
  },
  thumbText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 24,
  },
});

export default SlideToConfirm;