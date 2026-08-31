import { BlurView } from "expo-blur";
import { useIsFocused } from "expo-router/react-navigation";
import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Appbar, Portal, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appHeaderBlurTargetRef } from "./appHeaderBlurTarget";
import useSafeBack, { useCanNavigateBack } from "../navigation/useSafeBack";

export const DEFAULT_HEADER_COLOR = "#0f172a";
export const MENU_PRINCIPAL_HEADER_COLOR = "#1e3a8a";
export const CADETE_HEADER_COLOR = "#13803d";
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
  backIconColor,
  backgroundColor = DEFAULT_HEADER_COLOR,
  blurTarget,
  containerStyle,
  elevated = true,
  floating = false,
  glassIntensity = 42,
  glassOverlayOpacity = 0.68,
  includeSafeAreaTop = true,
  left,
  onBack,
  overlapContent = false,
  portal = true,
  showBackButton,
  statusBarHeight = 0,
  subtitle,
  subtitleStyle,
  title,
  titleStyle,
}) => {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const canNavigateBack = useCanNavigateBack();
  const { width, height } = useWindowDimensions();
  const safeBack = useSafeBack(backHref);
  const resolvedHeaderHeight = useAppHeaderContentInset(includeSafeAreaTop);
  const topInset = resolvedHeaderHeight - APP_HEADER_HEIGHT;
  const resolvedBackgroundColor = backgroundColor;
  const headerForegroundColor = "#ffffff";
  const headerSubtitleColor = "rgba(255, 255, 255, 0.82)";
  const resolvedBackIconColor = backIconColor || headerForegroundColor;
  const resolvedBlurTarget =
    Platform.OS === "android"
      ? blurTarget ?? appHeaderBlurTargetRef
      : undefined;

  const handleBack = React.useCallback(() => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    safeBack();
  }, [onBack, safeBack]);

  const shouldShowBackButton =
    !left &&
    (typeof showBackButton === "boolean"
      ? showBackButton && (canNavigateBack || Boolean(backHref))
      : canNavigateBack || Boolean(backHref));

  const resolvedLeft =
    left ||
    (shouldShowBackButton ? (
      <Appbar.BackAction
        iconColor={resolvedBackIconColor}
        onPress={handleBack}
      />
    ) : null);

  const headerStyle = [
    styles.headerFrame,
    (floating || portal) && styles.floatingHeader,
    {
      marginBottom: !floating && overlapContent ? -resolvedHeaderHeight : 0,
      minHeight: resolvedHeaderHeight,
      paddingTop: topInset,
    },
    containerStyle,
  ];

  const headerNode = (
    <View style={headerStyle}>
      <BlurView
        key={`${width}-${height}`}
        blurTarget={resolvedBlurTarget}
        blurReductionFactor={4}
        intensity={glassIntensity}
        tint="dark"
        blurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        renderToHardwareTextureAndroid={true}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.colorOverlay,
          {
            backgroundColor: getHeaderOverlayColor(
              resolvedBackgroundColor,
              glassOverlayOpacity,
            ),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.sheenOverlay,
          {
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.055)"
              : "rgba(255, 255, 255, 0.055)",
          },
        ]}
      />
      <Appbar.Header
        elevated={elevated}
        statusBarHeight={statusBarHeight}
        style={styles.header}
      >
        {resolvedLeft}
        <Appbar.Content
          title={title}
          subtitle={subtitle}
          titleStyle={[
            styles.title,
            { color: headerForegroundColor },
            titleStyle,
          ]}
          subtitleStyle={[
            styles.subtitle,
            { color: headerSubtitleColor },
            subtitleStyle,
          ]}
        />
        {actions || null}
      </Appbar.Header>
      <View
        pointerEvents="none"
        style={[
          styles.bottomBorder,
          {
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.13)"
              : "rgba(15, 23, 42, 0.14)",
          },
        ]}
      />
    </View>
  );

  if (!portal) {
    return headerNode;
  }

  if (!isFocused) {
    return null;
  }

  return (
    <>
      {!floating && !overlapContent ? (
        <View style={{ height: resolvedHeaderHeight }} />
      ) : null}
      <Portal>{headerNode}</Portal>
    </>
  );
};

const styles = StyleSheet.create({
  headerFrame: {
    backgroundColor: "transparent",
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
  colorOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sheenOverlay: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    backgroundColor: "transparent",
    height: APP_HEADER_HEIGHT,
  },
  bottomBorder: {
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: "absolute",
    right: 0,
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {},
});

export default AppHeader;
