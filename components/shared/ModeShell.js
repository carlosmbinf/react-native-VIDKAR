import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
    Appbar,
    Button,
    Card,
    Chip,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import AppHeader, { DEFAULT_HEADER_COLOR } from "../Header/AppHeader";

const ModeShell = ({ color, title, subtitle, badge, onLogout, actions }) => {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Surface style={styles.screen}>
      <AppHeader
        title={title}
        backgroundColor={color || DEFAULT_HEADER_COLOR}
        actions={
          <Appbar.Action icon="logout" iconColor="#fff" onPress={onLogout} />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card
          style={[
            styles.heroCard,
            { backgroundColor: theme.dark ? "#12192c" : "#f7f8fd" },
          ]}
        >
          <Card.Content style={styles.heroContent}>
            <Chip
              style={[styles.badge, { backgroundColor: `${color}18` }]}
              textStyle={{ color }}
            >
              {badge}
            </Chip>
            <Text variant="headlineMedium" style={styles.title}>
              {title}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {subtitle}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.grid}>
          {actions.map((action) => (
            <Card key={action.label} style={styles.itemCard} mode="elevated">
              <Card.Content style={styles.itemContent}>
                <MaterialCommunityIcons
                  name={action.icon}
                  size={28}
                  color={color}
                />
                <Text variant="titleMedium">{action.label}</Text>
                <Text variant="bodyMedium" style={styles.itemDescription}>
                  {action.description}
                </Text>
                <Button
                  mode="contained-tonal"
                  onPress={() => {
                    if (typeof action.onPress === "function") {
                      action.onPress();
                      return;
                    }

                    if (action.href) {
                      router.push(action.href);
                    }
                  }}
                >
                  Abrir estructura
                </Button>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  heroCard: {
    borderRadius: 24,
  },
  heroContent: {
    gap: 12,
    paddingVertical: 8,
  },
  badge: {
    alignSelf: "flex-start",
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    lineHeight: 24,
    opacity: 0.8,
  },
  grid: {
    gap: 16,
  },
  itemCard: {
    borderRadius: 20,
  },
  itemContent: {
    gap: 12,
  },
  itemDescription: {
    opacity: 0.72,
    lineHeight: 21,
  },
});

export default ModeShell;
