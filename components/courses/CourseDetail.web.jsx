import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

export default function CourseDetailWeb() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineSmall" style={styles.title}>
          Cursos disponibles en la aplicación móvil
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Abre VIDKAR en iOS o Android para consultar el curso y reproducir sus lecciones.
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
