import FontAwesome5Icon from "@expo/vector-icons/FontAwesome5";
import React, { useState } from "react";
import {
    Dimensions,
    ImageBackground,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLoginPalette, loginScreenStyles as styles } from "./Loguin.styles";

const { width: screenWidth } = Dimensions.get("window");
const { height: screenHeight } = Dimensions.get("window");

const Loguin = () => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const [isLandscape] = useState(screenWidth > screenHeight);
  const isLargeScreen = screenWidth >= 980;
  const shouldUseSplitLayout = isLandscape || isLargeScreen;
  const palette = getLoginPalette(isDarkMode);
  const inputTheme = {
    ...theme,
    colors: {
      ...theme.colors,
      onSurface: palette.inputText,
      onSurfaceVariant: palette.inputLabel,
      outline: palette.secondaryButtonBorder,
      primary: palette.inputTint,
      surfaceVariant: palette.inputBackground,
    },
  };

  const backgroundStyle = {
    minHeight: "100%",
    minWidth: "100%",
  };

  const overlayColor = palette.backgroundOverlay;

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require("../files/space-bg-shadowcodex.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View
        pointerEvents="none"
        style={[styles.backgroundOverlay, { backgroundColor: overlayColor }]}
      />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            shouldUseSplitLayout
              ? styles.scrollContentCentered
              : styles.scrollContentStacked,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.screen}
        >
          <View
            style={[
              backgroundStyle,
              styles.layoutShell,
              shouldUseSplitLayout
                ? styles.layoutShellWide
                : styles.layoutShellStacked,
            ]}
          >
            <View
              style={[
                styles.brandPanel,
                shouldUseSplitLayout
                  ? styles.brandPanelWide
                  : styles.brandPanelStacked,
              ]}
            >
              <View style={styles.brandBadge}>
                <FontAwesome5Icon
                  name="house-user"
                  size={shouldUseSplitLayout ? 42 : 34}
                  color="#ffffff"
                />
              </View>
              <Text
                style={[styles.brandEyebrow, { color: palette.brandEyebrow }]}
              >
                Plataforma operativa
              </Text>
              <Text style={[styles.brandTitle, { color: palette.brandTitle }]}>
                VIDKAR
              </Text>
              <Text
                style={[
                  styles.brandDescription,
                  { color: palette.brandDescription },
                ]}
              >
                Recargas, remesas, servicios digitales y comercio en una sola
                experiencia, preparada para operar también en pantallas grandes.
              </Text>

              <View style={styles.brandHighlights}>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Recargas
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    Promos activas
                  </Text>
                </View>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Servicios
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    VPN y Proxy
                  </Text>
                </View>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Pedidos
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    Comercio y remesas
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formPanel}>
              <View
                style={[
                  styles.blurCard,
                  { borderColor: palette.blurCardBorder },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: palette.blurCardOverlay },
                  ]}
                />
                <View style={styles.blurCardContent}>
                  <View style={styles.formHeader}>
                    <Text
                      style={[
                        styles.formEyebrow,
                        { color: palette.formEyebrow },
                      ]}
                    >
                      Inicio de sesión
                    </Text>
                    <Text style={[styles.title, { color: palette.formTitle }]}>
                      Acceso principal de VIDKAR
                    </Text>
                    <Text
                      style={[
                        styles.formDescription,
                        { color: palette.formDescription },
                      ]}
                    >
                      Descubre una entrada más clara y profesional para
                      gestionar los productos y servicios del sistema.
                    </Text>
                  </View>

                  <View style={styles.fieldsBlock}>
                    <TextInput
                      mode="flat"
                      label="Usuario"
                      disabled
                      style={[
                        styles.input,
                        { backgroundColor: palette.inputBackground },
                      ]}
                      textColor={palette.inputText}
                      theme={inputTheme}
                    />
                    <TextInput
                      mode="flat"
                      label="Contraseña"
                      secureTextEntry
                      disabled
                      style={[
                        styles.input,
                        { backgroundColor: palette.inputBackground },
                      ]}
                      textColor={palette.inputText}
                      theme={inputTheme}
                    />
                  </View>

                  <Button
                    mode="contained"
                    disabled
                    style={styles.primaryButton}
                    contentStyle={styles.primaryButtonContent}
                    labelStyle={styles.primaryButtonLabel}
                    buttonColor={theme.colors.primary}
                    textColor="#ffffff"
                  >
                    Iniciar sesión
                  </Button>

                  <View style={styles.socialSection}>
                    <View style={styles.dividerRow}>
                      <View
                        style={[
                          styles.dividerLine,
                          { backgroundColor: palette.divider },
                        ]}
                      />
                      <Text
                        style={[styles.altText, { color: palette.altText }]}
                      >
                        o continúa con
                      </Text>
                      <View
                        style={[
                          styles.dividerLine,
                          { backgroundColor: palette.divider },
                        ]}
                      />
                    </View>

                    <View style={styles.socialButtons}>
                      <Button
                        mode="outlined"
                        icon="google"
                        disabled
                        style={[
                          styles.secondaryButton,
                          { borderColor: palette.secondaryButtonBorder },
                        ]}
                        contentStyle={styles.secondaryButtonContent}
                        textColor={palette.secondaryButtonText}
                      >
                        Entrar con Google
                      </Button>
                    </View>
                  </View>

                  <View style={styles.footerPanel}>
                    <Text
                      style={[styles.statusText, { color: palette.statusText }]}
                    >
                      Vista previa del acceso principal de VIDKAR
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Loguin;
