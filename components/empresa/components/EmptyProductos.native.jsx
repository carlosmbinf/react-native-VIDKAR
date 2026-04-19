import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

import { createEmpresaPalette } from "../styles/empresaTheme";

const EmptyProductos = ({ onCreate }) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: palette.cardSoft,
          borderColor: palette.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: palette.brandSoft,
          },
        ]}
      >
        <MaterialCommunityIcons color={palette.brandStrong} name="package-variant-closed-remove" size={42} />
      </View>
      <Text style={{ color: palette.title }} variant="headlineSmall">
        Todavía no hay productos
      </Text>
      <Text style={[styles.copy, { color: palette.copy }]} variant="bodyMedium">
        Agrega el primer producto de esta tienda para empezar a venderlo desde la app.
      </Text>
      {typeof onCreate === "function" ? (
        <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={onCreate} textColor={palette.brandStrong}>
          Crear producto
        </Button>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  copy: {
    opacity: 0.78,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
});

export default EmptyProductos;