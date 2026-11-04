import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Keyboard,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
  import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Divider,
    IconButton,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { canStartDrawerDrag } from "./drawerGesturePolicy";

const DrawerBottom = ({
  allowContentSwipeToClose = true,
  allowSwipeToClose = true,
  actions = [],
  children,
  closeOnBackdropPress = true,
  contentAtTopRef,
  debugLabel = "",
  footer,
  headerContent,
  headerStyle,
  maxHeightRatio = 0.9,
  keyboardShouldPersistTaps = "never",
  motionPreset,
  onBackdropPress,
  onClose,
  onClosed,
  onCloseReason,
  open,
  overlayHeader = false,
  overlayOpacity = 0.45,
  reducedMotion = false,
  scrollable = false,
  showHeader = true,
  side = "bottom",
  surfaceStyle,
  title,
}) => {
  const theme = useTheme();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isBottom = side === "bottom";
  const isLandscape = screenWidth > screenHeight;
  const drawerWidth = isLandscape ? Math.min(screenWidth - 48, 640) : screenWidth;
  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const cinemaWipeProgress = useRef(new Animated.Value(1)).current;
  const reducedMotionRef = useRef(Boolean(reducedMotion));
  reducedMotionRef.current = Boolean(reducedMotion);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const cinematicRef = useRef(motionPreset === "cinema");
  cinematicRef.current = motionPreset === "cinema";
  const openRef = useRef(Boolean(open));
  openRef.current = Boolean(open);
  const mountedRef = useRef(Boolean(open));
  const dragOriginRef = useRef(0);
  const closingFromGestureRef = useRef(false);
  const onCloseReasonRef = useRef(onCloseReason);
  onCloseReasonRef.current = onCloseReason;
  const allowSwipeToCloseRef = useRef(Boolean(allowSwipeToClose));
  allowSwipeToCloseRef.current = Boolean(allowSwipeToClose);
  const internalContentAtTopRef = useRef(true);
  const trackedContentAtTopRef = contentAtTopRef || (scrollable ? internalContentAtTopRef : null);
  const trackedContentAtTopRefRef = useRef(trackedContentAtTopRef);
  trackedContentAtTopRefRef.current = trackedContentAtTopRef;
  const contentSwipeEnabled = allowContentSwipeToClose ? Boolean(allowSwipeToClose) : false;
  const contentSwipeEnabledRef = useRef(contentSwipeEnabled);
  contentSwipeEnabledRef.current = contentSwipeEnabled;
  const drawerContentAtTopRef = contentSwipeEnabled ? trackedContentAtTopRef : null;
  const contentGestureStartedAtTopRef = useRef(false);
  const headerGestureStartedAtTopRef = useRef(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardFrame, setKeyboardFrame] = useState(() => Keyboard.metrics() || null);
  const [containerFrame, setContainerFrame] = useState(null);
  const keyboardOverlap = keyboardFrame?.screenY > 0 && containerFrame
    ? Math.max(0, containerFrame.y + containerFrame.height - keyboardFrame.screenY)
    : 0;
  const availableHeight = Math.max(
    120,
    (containerFrame?.height || screenHeight) - keyboardOverlap,
  );
  const portraitMaxHeightRatio = Math.max(0.82, Math.min(0.97, Number(maxHeightRatio) || 0.9));
  const maxSheetHeight = availableHeight * (isLandscape ? 0.96 : portraitMaxHeightRatio);
  const bottomSafeInset = keyboardFrame ? 0 : insets.bottom;
  const occupiedChromeHeight = overlayHeader ? 0 : chromeHeight;
  const scrollViewportHeight = Math.max(
    120,
    maxSheetHeight - occupiedChromeHeight - footerHeight,
  );
  const measuredContentHeight = scrollable
    ? Math.min(contentHeight, scrollViewportHeight)
    : contentHeight;
  const drawerHeight = chromeHeight > 0 && measuredContentHeight > 0
    ? Math.min(
        maxSheetHeight,
        Math.max(overlayHeader ? chromeHeight : 0, occupiedChromeHeight + measuredContentHeight) + footerHeight,
      )
    : maxSheetHeight;
  const sheetHeightRef = useRef(drawerHeight);
  sheetHeightRef.current = drawerHeight;
  const [mounted, setMounted] = useState(Boolean(open));

  // Mantiene la velocidad al soltar el panel; los demás drawers conservan su timing.
  const animateTo = (toValue, duration, velocity = 0) => (
    cinematicRef.current && !reducedMotionRef.current
      ? Animated.spring(translateY, {
          toValue,
          stiffness: 340,
          damping: 36,
          mass: 0.9,
          velocity: Math.max(-2400, Math.min(2400, velocity)),
          overshootClamping: true,
          restDisplacementThreshold: 0.5,
          restSpeedThreshold: 5,
          useNativeDriver: true,
        })
      : Animated.timing(translateY, {
          toValue,
          duration: reducedMotionRef.current ? 0 : duration,
          useNativeDriver: true,
        })
  );
  const animateToRef = useRef(animateTo);
  animateToRef.current = animateTo;

  const finishClose = () => {
    mountedRef.current = false;
    setMounted(false);
    onClosedRef.current?.();
  };
  const finishCloseRef = useRef(finishClose);
  finishCloseRef.current = finishClose;

  useEffect(() => {
    if (!mounted) {
      if (trackedContentAtTopRefRef.current) {
        trackedContentAtTopRefRef.current.current = true;
      }
      contentGestureStartedAtTopRef.current = false;
      headerGestureStartedAtTopRef.current = false;
    }
  }, [mounted]);

  useEffect(() => {
    if (debugLabel && process.env.NODE_ENV !== "production") {
      console.info(
        `[DrawerBottom:${debugLabel}] state open=${Boolean(open)} mounted=${mounted} height=${Math.round(drawerHeight)} keyboardOverlap=${Math.round(keyboardOverlap)}`,
      );
    }
  }, [debugLabel, drawerHeight, keyboardOverlap, mounted, open]);

  useEffect(() => {
    if (!mounted) return undefined;

    setKeyboardFrame(Keyboard.metrics() || null);
    const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardFrame(event.endCoordinates);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardFrame(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [mounted]);

  useEffect(() => {
    if (!isBottom) {
      return undefined;
    }

    translateY.stopAnimation();

    if (open) {
      if (debugLabel && process.env.NODE_ENV !== "production") {
        console.info(`[DrawerBottom:${debugLabel}] animation-open:start`);
      }
      setMounted(true);
      if (!mountedRef.current) translateY.setValue(screenHeightRef.current);
      mountedRef.current = true;
      closingFromGestureRef.current = false;
      if (motionPreset === "cinema" && !reducedMotion) {
        cinemaWipeProgress.setValue(0);
        Animated.timing(cinemaWipeProgress, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }).start();
      } else {
        cinemaWipeProgress.setValue(1);
      }
      animateToRef.current(0, 260).start(({ finished }) => {
        if (debugLabel && process.env.NODE_ENV !== "production") {
          console.info(`[DrawerBottom:${debugLabel}] animation-open:end finished=${finished}`);
        }
      });
    } else {
      if (debugLabel && process.env.NODE_ENV !== "production") {
        console.info(`[DrawerBottom:${debugLabel}] animation-close:start`);
      }
      if (!mountedRef.current) return undefined;
      cinemaWipeProgress.stopAnimation();
      if (closingFromGestureRef.current) {
        closingFromGestureRef.current = false;
        finishCloseRef.current();
        return undefined;
      }
      animateToRef.current(screenHeightRef.current, 220).start(({ finished }) => {
        if (debugLabel && process.env.NODE_ENV !== "production") {
          console.info(`[DrawerBottom:${debugLabel}] animation-close:end finished=${finished}`);
        }
        if (finished && !openRef.current) {
          finishCloseRef.current();
        }
      });
    }

    return () => {
      translateY.stopAnimation();
      cinemaWipeProgress.stopAnimation();
    };
  }, [cinemaWipeProgress, debugLabel, isBottom, motionPreset, open, reducedMotion, translateY]);

  const animateCloseFromGesture = (velocity) => {
    animateToRef.current(screenHeightRef.current, 180, velocity).start(({ finished }) => {
      if (!finished || !openRef.current) return;
      closingFromGestureRef.current = true;
      onCloseReasonRef.current?.("gesture");
      onCloseRef.current?.();
    });
  };

  const requestClose = (reason) => {
    onCloseReasonRef.current?.(reason);
    onCloseRef.current?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        headerGestureStartedAtTopRef.current = trackedContentAtTopRefRef.current?.current !== false;
        return false;
      },
      onMoveShouldSetPanResponder: (_, gestureState) =>
        canStartDrawerDrag({
          isBottom,
          enabled: allowSwipeToCloseRef.current && openRef.current,
          atTop: trackedContentAtTopRefRef.current?.current !== false,
          startedAtTop: headerGestureStartedAtTopRef.current,
          dx: gestureState.dx,
          dy: gestureState.dy,
        }),
      onPanResponderGrant: () => {
        if (!openRef.current) return;
        translateY.stopAnimation((value) => { dragOriginRef.current = value; });
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isBottom || !allowSwipeToCloseRef.current || !openRef.current) {
          return;
        }

        translateY.setValue(Math.max(0, dragOriginRef.current + gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isBottom || !allowSwipeToCloseRef.current || !openRef.current) {
          return;
        }

        if (dragOriginRef.current + gestureState.dy > sheetHeightRef.current * 0.25 || gestureState.vy > 1.1) {
          animateCloseFromGesture(gestureState.vy * 1000);
          return;
        }

        animateToRef.current(0, 180, gestureState.vy * 1000).start();
      },
      onPanResponderTerminate: () => {
        if (!openRef.current) return;
        animateToRef.current(0, 180).start();
      },
    }),
  ).current;

  const contentPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        canStartDrawerDrag({
          isBottom,
          enabled: contentSwipeEnabledRef.current && openRef.current,
          atTop: trackedContentAtTopRefRef.current?.current === true,
          startedAtTop: contentGestureStartedAtTopRef.current,
          dx: gestureState.dx,
          dy: gestureState.dy,
        }),
      onMoveShouldSetPanResponder: (_, gestureState) =>
        canStartDrawerDrag({
          isBottom,
          enabled: contentSwipeEnabledRef.current && openRef.current,
          atTop: trackedContentAtTopRefRef.current?.current === true,
          startedAtTop: contentGestureStartedAtTopRef.current,
          dx: gestureState.dx,
          dy: gestureState.dy,
        }),
      onPanResponderGrant: () => {
        if (!openRef.current) return;
        translateY.stopAnimation((value) => { dragOriginRef.current = value; });
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isBottom || !allowSwipeToCloseRef.current || !openRef.current) {
          return;
        }

        translateY.setValue(Math.max(0, dragOriginRef.current + gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isBottom || !allowSwipeToCloseRef.current || !openRef.current) {
          return;
        }

        if (dragOriginRef.current + gestureState.dy > sheetHeightRef.current * 0.25 || gestureState.vy > 1.1) {
          animateCloseFromGesture(gestureState.vy * 1000);
          return;
        }

        animateToRef.current(0, 180, gestureState.vy * 1000).start();
      },
      onPanResponderTerminate: () => {
        if (!openRef.current) return;
        animateToRef.current(0, 180).start();
      },
    }),
  ).current;

  if (!isBottom) {
    return null;
  }

  const headerNode = showHeader ? (
    <>
      {headerContent ? (
        <View style={[styles.customHeader, headerStyle]} {...panResponder.panHandlers}>
          {headerContent}
        </View>
      ) : (
        <View style={[styles.header, headerStyle]}>
          <View style={styles.headerTitleContainer} {...panResponder.panHandlers}>
            <Text style={[styles.title, overlayHeader && styles.overlayHeaderTitle]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.actionsRow}>
            {actions.map((action, index) => (
              <IconButton
                key={`${action.icon || "action"}-${index}`}
                icon={action.icon}
                iconColor={overlayHeader ? "#ffffff" : undefined}
                size={20}
                onPress={action.onPress}
                disabled={action.disabled}
              />
            ))}
            <IconButton accessibilityLabel="Cerrar" icon="close" iconColor={overlayHeader ? "#ffffff" : undefined} size={22} onPress={() => requestClose("header")} />
          </View>
        </View>
      )}
      {!overlayHeader ? <Divider /> : null}
    </>
  ) : null;
  const footerNode = typeof footer === "function" ? footer() : footer;

  const drawerContent = (
    <View
      onLayout={(event) => {
        const { height, y } = event.nativeEvent.layout;
        setContainerFrame((current) => (
          current?.height === height && current?.y === y ? current : { height, y }
        ));
      }}
      style={styles.portalContainer}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.backdropPressable,
            {
              opacity: motionPreset === "cinema" ? translateY.interpolate({
                inputRange: [0, Math.max(1, drawerHeight)],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }) : 1,
            },
          ]}
      >
        <Pressable
          accessible={closeOnBackdropPress}
          accessibilityRole={closeOnBackdropPress ? "button" : undefined}
          accessibilityLabel={closeOnBackdropPress ? "Cerrar panel" : undefined}
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}
          onPress={() => {
            onBackdropPress?.();
            if (closeOnBackdropPress) requestClose("backdrop");
          }}
        />
      </Animated.View>
        {motionPreset === "cinema" ? (
          <Animated.View
            accessible={false}
            pointerEvents="none"
            style={[
              styles.cinemaWipe,
              {
                height: screenHeight * 1.6,
                opacity: reducedMotion ? 0 : cinemaWipeProgress.interpolate({
                  inputRange: [0, 0.24, 0.68, 1],
                  outputRange: [0, 0.68, 0.32, 0],
                  extrapolate: "clamp",
                }),
                transform: [
                  { translateX: cinemaWipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-screenWidth * 1.35, screenWidth * 1.35],
                    extrapolate: "clamp",
                  }) },
                  { rotateZ: "-18deg" },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(99,102,241,0)", "rgba(167,139,250,0.36)", "rgba(244,114,182,0.28)", "rgba(56,189,248,0)"]}
              locations={[0, 0.36, 0.62, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.bottomSheetWrapper,
            {
              transform: [{ translateY }],
              left: (screenWidth - drawerWidth) / 2,
              bottom: keyboardOverlap,
              height: drawerHeight,
              maxHeight: maxSheetHeight,
              width: drawerWidth,
            },
          ]}
          pointerEvents="auto"
        >
          <Surface
            elevation={0}
            style={[
              styles.bottomSurface,
              {
                backgroundColor: "transparent",
                height: drawerHeight,
                maxHeight: maxSheetHeight,
              },
              surfaceStyle,
            ]}
          >
            <View style={styles.surfaceClip}>
            <BlurView
              intensity={56}
              tint={theme.dark ? "dark" : "light"}
              experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
              renderToHardwareTextureAndroid
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View
              pointerEvents="none"
              style={[
                styles.sheetTint,
                {
                  backgroundColor: theme.dark
                    ? "rgba(15, 23, 42, 0.42)"
                    : "rgba(255, 255, 255, 0.34)",
                },
              ]}
            />
            <View
              onLayout={(event) => setChromeHeight(event.nativeEvent.layout.height)}
              style={[styles.drawerChrome, overlayHeader && styles.drawerChromeOverlay]}
            >
              {overlayHeader ? (
                <LinearGradient
                  colors={["rgba(4, 8, 16, 0.78)", "rgba(4, 8, 16, 0.62)", "rgba(4, 8, 16, 0)"]}
                  locations={[0, 0.65, 1]}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={styles.handleZone} {...panResponder.panHandlers}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: overlayHeader ? "#ffffff" : theme.colors.outlineVariant || "#ccc" },
                  ]}
                />
              </View>
              {headerNode}
            </View>
            {scrollable ? (
              <ScrollView
                alwaysBounceVertical={false}
                bounces={false}
                contentContainerStyle={[
                  styles.bottomScrollContent,
                  { paddingBottom: footerNode ? 0 : bottomSafeInset },
                ]}
                keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                nestedScrollEnabled
                onContentSizeChange={(_, height) => setContentHeight(height)}
                onScroll={(event) => {
                  if (trackedContentAtTopRef) {
                    trackedContentAtTopRef.current = event.nativeEvent.contentOffset.y <= 0.5;
                    if (!trackedContentAtTopRef.current) {
                      contentGestureStartedAtTopRef.current = false;
                    }
                  }
                }}
                onTouchCancel={() => {
                  contentGestureStartedAtTopRef.current = false;
                }}
                onTouchEnd={() => {
                  contentGestureStartedAtTopRef.current = false;
                }}
                onTouchStart={() => {
                  contentGestureStartedAtTopRef.current = drawerContentAtTopRef?.current === true;
                }}
                onTouchMove={() => {
                  if (drawerContentAtTopRef?.current !== true) {
                    contentGestureStartedAtTopRef.current = false;
                  }
                }}
                overScrollMode="never"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={[
                  styles.bottomScroll,
                  { maxHeight: scrollViewportHeight },
                ]}
                {...(drawerContentAtTopRef ? contentPanResponder.panHandlers : {})}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.bottomContent,
                  { paddingBottom: footerNode ? 0 : bottomSafeInset },
                ]}
                {...(drawerContentAtTopRef ? contentPanResponder.panHandlers : {})}
                onTouchStart={() => {
                  contentGestureStartedAtTopRef.current = drawerContentAtTopRef?.current === true;
                }}
                onTouchMove={() => {
                  if (drawerContentAtTopRef?.current !== true) {
                    contentGestureStartedAtTopRef.current = false;
                  }
                }}
                onTouchEnd={() => {
                  contentGestureStartedAtTopRef.current = false;
                }}
                onTouchCancel={() => {
                  contentGestureStartedAtTopRef.current = false;
                }}
                onLayout={(event) => {
                  setContentHeight(event.nativeEvent.layout.height);
                }}
              >
                {children}
              </View>
            )}
            {footerNode ? (
              <View
                onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
                style={[
                  styles.drawerFooter,
                  { paddingBottom: bottomSafeInset },
                ]}
              >
                {footerNode}
              </View>
            ) : null}
            </View>
          </Surface>
        </Animated.View>
      </View>
  );

  return Platform.OS === "ios" ? (
    mounted ? <Portal>{drawerContent}</Portal> : null
  ) : (
    <Modal
      animationType="none"
      onRequestClose={() => requestClose("system")}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />
      {drawerContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  cinemaWipe: {
    left: 0,
    position: "absolute",
    top: "-30%",
    width: "100%",
    zIndex: 1000,
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  bottomScroll: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  bottomScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  drawerFooter: {
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  drawerChrome: {
    flexShrink: 0,
  },
  drawerChromeOverlay: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  bottomSheetWrapper: {
    alignSelf: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    zIndex: 1001,
  },
  bottomSurface: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  surfaceClip: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flex: 1,
    overflow: "hidden",
  },
  handle: {
    borderRadius: 3,
    height: 6,
    opacity: 0.6,
    width: 54,
  },
  handleZone: {
    alignItems: "center",
    paddingBottom: 4,
    paddingTop: 10,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  customHeader: {
    width: "100%",
  },
  headerTitleContainer: {
    flex: 1,
    paddingVertical: 6,
  },
  portalContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    flex: 1,
    zIndex: 9999,
  },
  sheetTint: {
    ...StyleSheet.absoluteFill,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  overlayHeaderTitle: {
    color: "#ffffff",
  },
});

export default DrawerBottom;
