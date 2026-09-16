import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
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

const DrawerBottom = ({
  actions = [],
  children,
  contentAtTopRef,
  footer,
  headerContent,
  headerStyle,
  onClose,
  open,
  overlayOpacity = 0.45,
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
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const internalContentAtTopRef = useRef(true);
  const drawerContentAtTopRef = contentAtTopRef || (scrollable ? internalContentAtTopRef : null);
  const contentGestureStartedAtTopRef = useRef(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const maxSheetHeight = screenHeight * (isLandscape ? 0.96 : 0.9);
  const scrollViewportHeight = Math.max(
    120,
    maxSheetHeight - chromeHeight - footerHeight,
  );
  const measuredContentHeight = scrollable
    ? Math.min(contentHeight, scrollViewportHeight)
    : contentHeight;
  const drawerHeight = chromeHeight > 0 && measuredContentHeight > 0
    ? Math.min(
        maxSheetHeight,
        chromeHeight + measuredContentHeight + footerHeight,
      )
    : maxSheetHeight;
  const sheetHeight = drawerHeight;
  const [mounted, setMounted] = useState(Boolean(open));

  useEffect(() => {
    if (!isBottom) {
      return undefined;
    }

    translateY.stopAnimation();

    if (open) {
      setMounted(true);
      translateY.setValue(screenHeight);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }

    return () => translateY.stopAnimation();
  }, [isBottom, open, screenHeight, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        isBottom && gestureState.dy > 4,
      onPanResponderMove: (_, gestureState) => {
        if (!isBottom || gestureState.dy <= 0) {
          return;
        }

        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isBottom) {
          return;
        }

        if (gestureState.dy > sheetHeight * 0.25 || gestureState.vy > 1.1) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose?.();
          });
          return;
        }

        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const contentPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        isBottom &&
        contentGestureStartedAtTopRef.current &&
        drawerContentAtTopRef?.current === true &&
        gestureState.dy > 4 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onMoveShouldSetPanResponder: (_, gestureState) =>
        isBottom &&
        contentGestureStartedAtTopRef.current &&
        drawerContentAtTopRef?.current === true &&
        gestureState.dy > 4 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (!isBottom || gestureState.dy <= 0) {
          return;
        }

        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isBottom) {
          return;
        }

        if (gestureState.dy > sheetHeight * 0.25 || gestureState.vy > 1.1) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose?.();
          });
          return;
        }

        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
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
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.actionsRow}>
            {actions.map((action, index) => (
              <IconButton
                key={`${action.icon || "action"}-${index}`}
                icon={action.icon}
                size={20}
                onPress={action.onPress}
                disabled={action.disabled}
              />
            ))}
            <IconButton icon="close" size={22} onPress={onClose} />
          </View>
        </View>
      )}
      <Divider />
    </>
  ) : null;
  const footerNode = typeof footer === "function" ? footer() : footer;

  const drawerContent = (
    <View style={styles.portalContainer}>
      <Pressable
        style={[
          styles.backdropPressable,
            { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
          ]}
          onPress={() => onClose?.()}
        />
        <Animated.View
          style={[
            styles.bottomSheetWrapper,
            {
              transform: [{ translateY }],
              left: (screenWidth - drawerWidth) / 2,
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
              style={styles.drawerChrome}
            >
              <View style={styles.handleZone} {...panResponder.panHandlers}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: theme.colors.outlineVariant || "#ccc" },
                  ]}
                />
              </View>
              {headerNode}
            </View>
            {scrollable ? (
              <ScrollView
                bounces={false}
                contentContainerStyle={[
                  styles.bottomScrollContent,
                  { paddingBottom: footerNode ? 0 : insets.bottom },
                ]}
                nestedScrollEnabled
                onContentSizeChange={(_, height) => setContentHeight(height)}
                onScroll={(event) => {
                    if (drawerContentAtTopRef) {
                      drawerContentAtTopRef.current = event.nativeEvent.contentOffset.y <= 0.5;
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
                  { paddingBottom: footerNode ? 0 : insets.bottom },
                ]}
                {...(drawerContentAtTopRef ? contentPanResponder.panHandlers : {})}
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
                  { paddingBottom: insets.bottom },
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
      onRequestClose={onClose}
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
});

export default DrawerBottom;
