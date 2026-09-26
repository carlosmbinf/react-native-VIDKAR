import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const steps = [
  { key: 1, label: "Preparando", icon: "chef-hat" },
  { key: 2, label: "Cadete en local", icon: "storefront" },
  { key: 3, label: "En camino", icon: "motorbike" },
  { key: 4, label: "En destino", icon: "map-marker-check" },
  { key: 5, label: "Entregado", icon: "check-circle" },
];

const PedidoStepperNative = ({ currentStep, tone }) => {
  const theme = useTheme();
  const isDarkTone = tone ? tone === "dark" : theme.dark;
  const resolvedCurrentStep = Number.isFinite(Number(currentStep))
    ? Number(currentStep)
    : 1;

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => {
        const isActive = resolvedCurrentStep >= step.key;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepCircleContainer}>
              <View
                style={[
                  styles.stepCircle,
                  isActive ? styles.stepCircleActive : null,
                  resolvedCurrentStep === step.key ? styles.stepCircleCurrent : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={isActive ? "#FFFFFF" : "#9E9E9E"}
                  name={step.icon}
                  size={20}
                />
              </View>

              {!isLast ? (
                <View
                  style={[
                    styles.stepConnector,
                    isActive && resolvedCurrentStep > step.key
                      ? styles.stepConnectorActive
                      : null,
                  ]}
                />
              ) : null}
            </View>

            <Text
              numberOfLines={2}
              style={[
                styles.stepLabel,
                isDarkTone ? styles.stepLabelDark : null,
                isActive ? styles.stepLabelActive : null,
                isDarkTone && isActive ? styles.stepLabelActiveDark : null,
                resolvedCurrentStep >= step.key ? styles.stepLabelCurrent : null,
                isDarkTone && resolvedCurrentStep >= step.key
                  ? styles.stepLabelCurrentDark
                  : null,
              ]}
              variant="bodySmall"
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stepCircle: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stepCircleActive: {
    backgroundColor: "#FF6F00",
    borderColor: "#FF6F00",
  },
  stepCircleContainer: {
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  stepCircleCurrent: {
    backgroundColor: "#FF8F00",
    borderColor: "#FF8F00",
    transform: [{ scale: 1.1 }],
  },
  stepConnector: {
    backgroundColor: "#E0E0E0",
    height: 2,
    left: "20%",
    position: "absolute",
    top: 20,
    transform: [{ translateX: 20 }],
    width: "60%",
    zIndex: -1,
  },
  stepConnectorActive: {
    backgroundColor: "#FF6F00",
  },
  stepLabel: {
    color: "#64748b",
    fontSize: 9,
    lineHeight: 12,
    paddingHorizontal: 2,
    textAlign: "center",
  },
  stepLabelActive: {
    color: "#475569",
    fontWeight: "600",
  },
  stepLabelCurrent: {
    color: "#c2410c",
    fontWeight: "800",
  },
  stepLabelDark: {
    color: "#8290a5",
  },
  stepLabelActiveDark: {
    color: "#cbd5e1",
  },
  stepLabelCurrentDark: {
    color: "#fb923c",
  },
  stepWrapper: {
    alignItems: "center",
    flex: 1,
  },
  stepperContainer: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 2,
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
});

export default PedidoStepperNative;
