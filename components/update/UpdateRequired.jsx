import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

const IOS_APP_STORE_ID = "6751348594";

const UpdateRequired = ({ currentVersion, requiredVersion }) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );

    rotationLoop.start();

    return () => {
      rotationLoop.stop();
    };
  }, [fadeAnim, rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleUpdate = () => {
    const storeUrl = Platform.select({
      android: "https://play.google.com/store/apps/details?id=com.vidkar",
      ios: `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`,
    });

    if (!storeUrl) {
      return;
    }

    Linking.openURL(storeUrl).catch((error) => {
      console.error("[UpdateRequired] Error abriendo tienda:", error);
    });
  };

  return (
    <Surface style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Surface style={styles.iconContainer} elevation={4}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="update" size={80} color={theme.colors.primary} />
          </Animated.View>
        </Surface>

        <Text variant="headlineMedium" style={styles.title}>
          Actualización Requerida
        </Text>

        <Text variant="bodyLarge" style={styles.description}>
          Para seguir disfrutando de VIDKAR, necesitas actualizar la aplicación
          a la última versión.
        </Text>

        <Surface style={styles.versionCard} elevation={2}>
          <View style={styles.versionRow}>
            <View style={styles.versionItem}>
              <Icon name="cellphone" size={24} color={theme.colors.error} />
              <Text variant="labelSmall" style={styles.versionLabel}>
                Tu versión
              </Text>
              <Text variant="titleMedium" style={styles.versionNumber}>
                {currentVersion}
              </Text>
            </View>

            <Icon
              name="arrow-right-bold"
              size={32}
              color={theme.colors.primary}
            />

            <View style={styles.versionItem}>
              <Icon name="star" size={24} color={theme.colors.primary} />
              <Text variant="labelSmall" style={styles.versionLabel}>
                Requerida
              </Text>
              <Text
                variant="titleMedium"
                style={[styles.versionNumber, styles.requiredVersion]}
              >
                {requiredVersion}
              </Text>
            </View>
          </View>
        </Surface>

        <View style={styles.featuresContainer}>
          <Text variant="titleSmall" style={styles.featuresTitle}>
            ¿Qué hay de nuevo?
          </Text>

          {[
            "Mejoras de rendimiento",
            "Nuevas funcionalidades",
            "Correcciones de seguridad",
            "Experiencia mejorada",
          ].map((feature) => (
            <View key={feature} style={styles.featureItem}>
              <Icon
                name="check-circle"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.featureText}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Icon name="information" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.infoText}>
            La actualización es necesaria para continuar usando la aplicación
          </Text>
        </View>

        <Button
          mode="outlined"
          onPress={handleUpdate}
          icon="download"
          style={styles.updateButton}
          contentStyle={styles.updateButtonContent}
          labelStyle={styles.updateButtonLabel}
        >
          Actualizar Ahora
        </Button>
      </Animated.View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    textAlign: "center",
    color: "#666",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  versionCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    width: "100%",
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  versionItem: {
    alignItems: "center",
    flex: 1,
  },
  versionLabel: {
    marginTop: 8,
    color: "#999",
    textTransform: "uppercase",
  },
  versionNumber: {
    marginTop: 4,
    fontWeight: "bold",
    fontSize: 18,
  },
  requiredVersion: {
    color: "#00ff00",
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 32,
  },
  featuresTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    color: "#666",
  },
  updateButton: {
    width: "100%",
    borderRadius: 30,
  },
  updateButtonContent: {
    height: 56,
  },
  updateButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  infoText: {
    marginLeft: 8,
    color: "#999",
    textAlign: "center",
    flex: 1,
  },
});

export default UpdateRequired;
