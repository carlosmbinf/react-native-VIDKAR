import FontAwesome5Icon from "@expo/vector-icons/FontAwesome5";
import React, { useState } from "react";
import {
    Appearance,
    Dimensions,
    ImageBackground,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { loginScreenStyles as styles } from "./Loguin.styles";

const { width: screenWidth } = Dimensions.get("window");
const { height: screenHeight } = Dimensions.get("window");

const Loguin = () => {
  const [isDarkMode] = useState(Appearance.getColorScheme() === "dark");
  const [isLandscape] = useState(screenWidth > screenHeight);
  const isLargeScreen = screenWidth >= 980;
  const shouldUseSplitLayout = isLandscape || isLargeScreen;

  const backgroundStyle = {
    minHeight: "100%",
    minWidth: "100%",
  };

  const overlayColor = isDarkMode
    ? "rgba(4, 10, 24, 0.68)"
    : "rgba(244, 247, 252, 0.58)";

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

      <SafeAreaView style={styles.safeArea}>
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
              <Text style={styles.brandEyebrow}>Plataforma operativa</Text>
              <Text style={styles.brandTitle}>VIDKAR</Text>
              <Text style={styles.brandDescription}>
                Recargas, remesas, servicios digitales y comercio en una sola
                experiencia, preparada para operar también en pantallas grandes.
              </Text>

              <View style={styles.brandHighlights}>
                <View style={styles.brandHighlightCard}>
                  <Text style={styles.brandHighlightLabel}>Recargas</Text>
                  <Text style={styles.brandHighlightValue}>Promos activas</Text>
                </View>
                <View style={styles.brandHighlightCard}>
                  <Text style={styles.brandHighlightLabel}>Servicios</Text>
                  <Text style={styles.brandHighlightValue}>VPN y Proxy</Text>
                </View>
                <View style={styles.brandHighlightCard}>
                  <Text style={styles.brandHighlightLabel}>Pedidos</Text>
                  <Text style={styles.brandHighlightValue}>
                    Comercio y remesas
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formPanel}>
              <View style={styles.blurCard}>
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(10, 18, 32, 0.72)"
                        : "rgba(255, 255, 255, 0.68)",
                    },
                  ]}
                />
                <View style={styles.blurCardContent}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formEyebrow}>Inicio de sesión</Text>
                    <Text style={styles.title}>Acceso principal de VIDKAR</Text>
                    <Text style={styles.formDescription}>
                      Descubre una entrada más clara y profesional para
                      gestionar los productos y servicios del sistema.
                    </Text>
                  </View>

                  <View style={styles.fieldsBlock}>
                    <TextInput
                      mode="flat"
                      label="Usuario"
                      disabled
                      style={styles.input}
                    />
                    <TextInput
                      mode="flat"
                      label="Contraseña"
                      secureTextEntry
                      disabled
                      style={styles.input}
                    />
                  </View>

                  <Button
                    mode="contained"
                    disabled
                    style={styles.primaryButton}
                    contentStyle={styles.primaryButtonContent}
                    labelStyle={styles.primaryButtonLabel}
                  >
                    Iniciar sesión
                  </Button>

                  <View style={styles.socialSection}>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.altText}>o continúa con</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialButtons}>
                      <Button
                        mode="outlined"
                        icon="google"
                        disabled
                        style={styles.secondaryButton}
                        contentStyle={styles.secondaryButtonContent}
                      >
                        Entrar con Google
                      </Button>
                    </View>
                  </View>

                  <View style={styles.footerPanel}>
                    <Text style={styles.statusText}>
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
