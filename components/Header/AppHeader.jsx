import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Appbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const DEFAULT_HEADER_COLOR = "#0f172a";
export const APP_HEADER_HEIGHT = 56;

export const useAppHeaderContentInset = (includeSafeAreaTop = true) => {
  const { top } = useSafeAreaInsets();
  return APP_HEADER_HEIGHT + (includeSafeAreaTop ? top : 0);
};

const getHeaderOverlayColor = (backgroundColor, opacity = 0.36) => {
  if (typeof backgroundColor !== "string") {
    return `rgba(15, 23, 42, ${opacity})`;
  }

  const normalizedHex = backgroundColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return backgroundColor;
  }

  const red = parseInt(normalizedHex.slice(0, 2), 16);
  const green = parseInt(normalizedHex.slice(2, 4), 16);
  const blue = parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const AppHeader = ({
  actions,
  backHref,
  backIconColor = "#ffffff",
  backgroundColor = DEFAULT_HEADER_COLOR,
  containerStyle,
  elevated = true,
  floating = false,
  glassIntensity = 42,
  glassOverlayOpacity = 0.36,
  includeSafeAreaTop = true,
  left,
  onBack,
  overlapContent = false,
  showBackButton,
  statusBarHeight = 0,
  subtitle,
  subtitleStyle,
  title,
  titleStyle,
}) => {
  const router = useRouter();
  const resolvedHeaderHeight = useAppHeaderContentInset(includeSafeAreaTop);
  const topInset = resolvedHeaderHeight - APP_HEADER_HEIGHT;

  const handleBack = React.useCallback(() => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (backHref) {
      router.replace(backHref);
    }
  }, [backHref, onBack, router]);

  const shouldShowBackButton =
    !left &&
    (typeof showBackButton === "boolean"
      ? showBackButton && (router.canGoBack() || Boolean(backHref))
      : router.canGoBack());

  const resolvedLeft =
    left ||
    (shouldShowBackButton ? (
      <Appbar.BackAction iconColor={backIconColor} onPress={handleBack} />
    ) : null);

  const headerNode = (
    <View
      style={[
        styles.headerFrame,
        floating && styles.floatingHeader,
        {
          marginBottom: !floating && overlapContent ? -resolvedHeaderHeight : 0,
          minHeight: resolvedHeaderHeight,
          paddingTop: topInset,
        },
        containerStyle,
      ]}
    >
      <BlurView
        intensity={glassIntensity}
        tint="dark"
        style={styles.blurLayer}
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        renderToHardwareTextureAndroid={true}
      />
      <View
        pointerEvents="none"
        style={[
          styles.colorOverlay,
          {
            backgroundColor: getHeaderOverlayColor(
              backgroundColor,
              glassOverlayOpacity,
            ),
          },
        ]}
      />
      <View pointerEvents="none" style={styles.sheenOverlay} />
      <Appbar.Header
        elevated={elevated}
        statusBarHeight={statusBarHeight}
        style={styles.header}
      >
        {resolvedLeft}
        <Appbar.Content
          title={title}
          subtitle={subtitle}
          titleStyle={[styles.title, titleStyle]}
          subtitleStyle={[styles.subtitle, subtitleStyle]}
        />
        {actions || null}
      </Appbar.Header>
      <View pointerEvents="none" style={styles.bottomBorder} />
    </View>
  );

  return headerNode;
};

const styles = StyleSheet.create({
  headerFrame: {
    backgroundColor: "transparent",
    elevation: 12,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    zIndex: 20,
  },
  floatingHeader: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.055)",
  },
  header: {
    backgroundColor: "transparent",
    height: APP_HEADER_HEIGHT,
  },
  bottomBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: "absolute",
    right: 0,
  },
  title: {
    color: "#ffffff",
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
  },
});

export default AppHeader;
