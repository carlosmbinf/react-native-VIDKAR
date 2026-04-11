import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const EmptyStateNative = () => {
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons color="#BDBDBD" name="cart-off" size={64} />
      <Text style={styles.emptyTitle} variant="titleLarge">
        No tienes pedidos
      </Text>
      <Text style={styles.emptySubtitle} variant="bodyMedium">
        Tus pedidos de comercios aparecerán aquí
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  emptySubtitle: {
    color: "#757575",
    marginTop: 8,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#424242",
    fontWeight: "bold",
    marginTop: 16,
  },
});

export default EmptyStateNative;
