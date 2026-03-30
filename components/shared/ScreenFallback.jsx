import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import AppHeader from "../Header/AppHeader";

const ScreenFallback = ({ title, legacyPath, description }) => {
  return (
    <View style={styles.screen}>
      <AppHeader title={title} />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineSmall">{title}</Text>
            <Text variant="bodyMedium" style={styles.copy}>
              {description ||
                "Esta pantalla ya tiene ruta activa en Expo y queda lista para sustituirse por la implementación real del proyecto legacy."}
            </Text>
            {legacyPath ? (
              <Text variant="bodySmall" style={styles.path}>
                Legacy: {legacyPath}
              </Text>
            ) : null}
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f5fb",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    borderRadius: 20,
  },
  cardContent: {
    gap: 12,
  },
  copy: {
    lineHeight: 22,
    opacity: 0.8,
  },
  path: {
    color: "#3f51b5",
    fontWeight: "700",
  },
});

export default ScreenFallback;
