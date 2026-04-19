import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, useTheme } from "react-native-paper";

import { createEmpresaPalette } from "../styles/empresaTheme";

const normalizeCoordinates = (tienda) => {
  const source = tienda?.coordenadas || tienda?.cordenadas || null;
  const latitude = Number(source?.latitude ?? source?.latitud);
  const longitude = Number(source?.longitude ?? source?.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const TiendaHeader = ({ tienda, productosCount }) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const coordinates = normalizeCoordinates(tienda);

  const handleOpenMaps = () => {
    if (!coordinates) {
      return;
    }

    const query = `${coordinates.latitude},${coordinates.longitude}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        {
          backgroundColor: palette.hero,
          borderColor: palette.border,
          shadowColor: palette.shadowColor,
        },
      ]}
    >
      <Card.Content style={styles.content}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: palette.brandSoft }]}> 
            <MaterialCommunityIcons color={palette.brandStrong} name="storefront-outline" size={26} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={{ color: palette.title }} variant="headlineSmall">
              {tienda?.title || "Tienda"}
            </Text>
            <Text numberOfLines={3} style={{ color: palette.copy }} variant="bodyMedium">
              {tienda?.descripcion || "Esta tienda todavía no tiene una descripción visible."}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Chip
            compact
            icon="package-variant-closed"
            style={{ backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1 }}
            textStyle={{ color: palette.brandStrong }}
          >
            {productosCount} producto{productosCount === 1 ? "" : "s"}
          </Chip>
          {coordinates ? (
            <Chip
              compact
              icon="map-marker-outline"
              style={{ backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1 }}
              textStyle={{ color: palette.copy }}
            >
              {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </Chip>
          ) : (
            <Chip
              compact
              icon="map-marker-off-outline"
              style={{ backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1 }}
              textStyle={{ color: palette.copy }}
            >
              Sin coordenadas
            </Chip>
          )}
        </View>

        {coordinates ? (
          <View style={styles.actionsRow}>
            <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={handleOpenMaps} textColor={palette.brandStrong}>
              Abrir en mapas
            </Button>
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "flex-start",
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  content: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(103, 58, 183, 0.1)",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  titleCopy: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
});

export default TiendaHeader;