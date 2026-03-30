import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Surface } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../Header/AppHeader";
import Productos from "./Productos.native";
import TableRecargas from "./TableRecargas";

const ProductosScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Surface style={styles.screen}>
        <AppHeader
          title="Productos Cubacel"
          subtitle="Ofertas, recargas y seguimiento"
          left={
            <Appbar.BackAction
              iconColor="#fff"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(normal)/Main")
              }
            />
          }
        />
        <Productos isDegradado={true} />
        <View style={styles.tableContainer}>
          <ScrollView style={styles.tableScroll}>
            <TableRecargas />
          </ScrollView>
        </View>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  screen: {
    flex: 1,
    minHeight: "100%",
  },
  tableContainer: {
    flex: 1,
  },
  tableScroll: {
    flex: 1,
  },
});

export default ProductosScreen;
