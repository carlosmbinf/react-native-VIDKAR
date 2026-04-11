import { View } from "react-native";
import { Chip, useTheme } from "react-native-paper";

import { segmentedButtonsStyles } from "./styles/dashboardStyles";

const CustomSegmentedButtons = ({ value, onValueChange, buttons }) => {
  const theme = useTheme();

  return (
    <View style={segmentedButtonsStyles.container}>
      {buttons.map((button) => {
        const isSelected = value === button.value;

        return (
          <Chip
            icon={button.icon}
            key={button.value}
            mode={isSelected ? "flat" : "outlined"}
            onPress={() => onValueChange(button.value)}
            selected={isSelected}
            style={[
              segmentedButtonsStyles.button,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : theme.dark
                    ? "rgba(30, 41, 59, 0.82)"
                    : "rgba(248, 250, 252, 0.96)",
                borderColor: isSelected
                  ? theme.colors.primary
                  : theme.dark
                    ? "rgba(148, 163, 184, 0.28)"
                    : "rgba(15, 23, 42, 0.08)",
              },
              isSelected && segmentedButtonsStyles.buttonActive,
            ]}
            textStyle={[
              segmentedButtonsStyles.buttonText,
              { color: isSelected ? "#ffffff" : theme.colors.onSurface },
              isSelected && segmentedButtonsStyles.buttonTextActive,
            ]}
          >
            {button.label}
          </Chip>
        );
      })}
    </View>
  );
};

export default CustomSegmentedButtons;
