import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { segmentedButtonsStyles } from "./styles/dashboardStyles";

const safeHaptic = () => {
  try {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  } catch (_) {}
};

const CustomSegmentedButtons = ({
  buttons,
  onValueChange,
  scrollable = false,
  value,
}) => {
  const theme = useTheme();

  const handlePress = (buttonValue) => {
    safeHaptic();
    if (onValueChange) {
      onValueChange(buttonValue);
    }
  };

  const renderButtons = () =>
    buttons.map((button) => {
      const isSelected = value === button.value;

      return (
        <Pressable
          key={button.value}
          onPress={() => handlePress(button.value)}
          style={[
            segmentedButtonsStyles.button,
            {
              alignItems: "center",
              backgroundColor: isSelected
                ? theme.colors.primary
                : theme.dark
                  ? "rgba(30, 41, 59, 0.82)"
                  : "rgba(248, 250, 252, 0.96)",
              borderColor: isSelected
                ? theme.colors.primary
                : theme.dark
                  ? "rgba(148, 163, 184, 0.24)"
                  : "rgba(15, 23, 42, 0.08)",
              flexDirection: "row",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
            },
            isSelected && segmentedButtonsStyles.buttonActive,
          ]}
        >
          {button.icon ? (
            <MaterialCommunityIcons
              color={
                isSelected
                  ? "#ffffff"
                  : theme.dark
                    ? "#94a3b8"
                    : "#64748b"
              }
              name={button.icon}
              size={16}
            />
          ) : null}
          <Text
            style={[
              segmentedButtonsStyles.buttonText,
              {
                color: isSelected ? "#ffffff" : theme.colors.onSurface,
              },
              isSelected && segmentedButtonsStyles.buttonTextActive,
            ]}
          >
            {button.label}
          </Text>
        </Pressable>
      );
    });

  if (scrollable) {
    return (
      <ScrollView
        contentContainerStyle={[segmentedButtonsStyles.container, { flexWrap: "nowrap" }]}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {renderButtons()}
      </ScrollView>
    );
  }

  return (
    <View style={segmentedButtonsStyles.container}>
      {renderButtons()}
    </View>
  );
};

export default CustomSegmentedButtons;
