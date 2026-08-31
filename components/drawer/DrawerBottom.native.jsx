import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    Divider,
    IconButton,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { appHeaderBlurTargetRef } from "../Header/appHeaderBlurTarget";

const DrawerBottom = ({
  actions = [],
  children,
  headerStyle,
  onClose,
  open,
  overlayOpacity = 0.45,
  showHeader = true,
  side = "bottom",
  surfaceStyle,
  title,
}) => {
  const theme = useTheme();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isBottom = side === "bottom";
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const maxSheetHeight = screenHeight * 0.85;
  const sheetHeight = Math.min(contentHeight || maxSheetHeight, maxSheetHeight);
  const [mounted, setMounted] = useState(Boolean(open));

  useEffect(() => {
    if (!isBottom) {
      return undefined;
    }

    translateY.stopAnimation();

    if (open) {
      setMounted(true);
      translateY.setValue(screenHeight);
    }

    Animated.timing(translateY, {
      toValue: open ? 0 : screenHeight,
      duration: open ? 260 : 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) {
        setMounted(false);
      }
    });

    return () => translateY.stopAnimation();
  }, [isBottom, open, screenHeight, screenWidth, translateY]);

  useEffect(() => {
    if (!isBottom || !mounted) {
      return;
    }

    translateY.stopAnimation();
    translateY.setValue(open ? 0 : screenHeight);
    setContentHeight(0);
  }, [isBottom, mounted, open, screenHeight, screenWidth, translateY]);

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
          onClose?.();
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
      <View style={[styles.header, headerStyle]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
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
      <Divider />
    </>
  ) : null;

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
            { transform: [{ translateY }], maxHeight: maxSheetHeight },
          ]}
          pointerEvents="auto"
        >
          <Surface
            elevation={0}
            style={[
              styles.bottomSurface,
              {
                backgroundColor: "transparent",
                maxHeight: maxSheetHeight,
              },
              surfaceStyle,
            ]}
          >
            {theme.dark ? (
              <BlurView
                key={`${screenWidth}-${screenHeight}-dark`}
                blurTarget={Platform.OS === "android" ? appHeaderBlurTargetRef : undefined}
                intensity={42}
                tint="dark"
                style={StyleSheet.absoluteFill}
                blurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
                renderToHardwareTextureAndroid={true}
              />
            ) : (
              <BlurView
                key={`${screenWidth}-${screenHeight}-light`}
                blurTarget={Platform.OS === "android" ? appHeaderBlurTargetRef : undefined}
                intensity={42}
                tint="light"
                style={StyleSheet.absoluteFill}
                blurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
                renderToHardwareTextureAndroid={true}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                styles.sheetTint,
                {
                  backgroundColor: theme.dark
                    ? "rgba(6, 12, 24, 0.68)"
                    : "rgba(255, 255, 255, 0.62)",
                },
              ]}
            />
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: theme.colors.outlineVariant || "#ccc" },
                ]}
              />
            </View>
            {headerNode}
            <View
              style={styles.bottomContent}
              onLayout={(event) => {
                setContentHeight(event.nativeEvent.layout.height + 30);
              }}
            >
              {children}
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  bottomSheetWrapper: {
    bottom: 0,
    left: 0,
    position: "absolute",
    width: "100%",
    zIndex: 1001,
  },
  bottomSurface: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    paddingBottom: 12,
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
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
  },
});

export default DrawerBottom;
