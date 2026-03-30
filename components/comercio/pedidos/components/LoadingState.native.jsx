import { StyleSheet } from "react-native";
import { ActivityIndicator, Surface, Text } from "react-native-paper";

const LoadingStateNative = () => {
  return (
    <Surface style={styles.loadingContainer}>
      <ActivityIndicator color="#FF6F00" size="large" />
      <Text style={styles.loadingText} variant="bodyMedium">
        Cargando pedidos...
      </Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: "#616161",
    marginTop: 16,
  },
});

export default LoadingStateNative;
