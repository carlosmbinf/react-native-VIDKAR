import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export const DEFAULT_HEADER_COLOR = "#0f172a";

const getHeaderOverlayColor = (backgroundColor) => {
  if (typeof backgroundColor !== "string") {
    return "rgba(15, 23, 42, 0.72)";
  }

  const normalizedHex = backgroundColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return backgroundColor;
  }

  const red = parseInt(normalizedHex.slice(0, 2), 16);
  const green = parseInt(normalizedHex.slice(2, 4), 16);
  const blue = parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, 0.72)`;
};

const AppHeader = ({
  actions,
  backHref,
  backIconColor = "#ffffff",
  backgroundColor = DEFAULT_HEADER_COLOR,
  elevated = true,
  includeSafeAreaTop = true,
  left,
  onBack,
  showBackButton,
  statusBarHeight = 0,
  subtitle,
  subtitleStyle,
  title,
  titleStyle,
}) => {
  const router = useRouter();

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
    <View style={[styles.headerFrame, { backgroundColor }]}>
      <BlurView
        intensity={52}
        tint="dark"
        style={styles.blurLayer}
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
      />
      <View
        pointerEvents="none"
        style={[
          styles.colorOverlay,
          { backgroundColor: getHeaderOverlayColor(backgroundColor) },
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
          titleStyle={[styles.title, titleStyle]}
          subtitleStyle={[styles.subtitle, subtitleStyle]}
        />
        {actions || null}
      </Appbar.Header>
    </View>
  );

  if (!includeSafeAreaTop) {
    return headerNode;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor }]}
      edges={["top", "left", "right"]}
    >
      {headerNode}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: "100%",
  },
  headerFrame: {
    overflow: "hidden",
    position: "relative",
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    backgroundColor: "transparent",
    height: 56,
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
