import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

export default function PeliculaPlayerWeb() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineSmall" style={styles.title}>
          Reproducción no disponible en este navegador
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Abre VIDKAR en la aplicación móvil para reproducir esta película.
          {id ? "" : " No se recibió una película válida."}
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.button}>
          Volver
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    maxWidth: 520,
    padding: 24,
    width: "100%",
  },
  title: {
    marginBottom: 12,
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 24,
  },
});
