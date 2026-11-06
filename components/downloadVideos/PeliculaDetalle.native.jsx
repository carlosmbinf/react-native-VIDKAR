import React from "react";
import { Alert, ImageBackground, Linking, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Meteor } from "../../services/meteor/client.native";
import { getMeteorHttpOriginUrl } from "../../services/appUrls";
import AppHeader from "../Header/AppHeader";

export default function PeliculaDetalle({ movieId }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [movie, setMovie] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(movieId));
  React.useEffect(() => {
    if (!movieId) return;
    let active = true;
    Meteor.call("getPelicula", movieId, (error, result) => {
      if (!active) return;
      setLoading(false);
      if (error) {
        Alert.alert("No se pudo cargar", error.reason || error.message || "No fue posible obtener los detalles.");
        return;
      }
      setMovie(result || null);
    });
    return () => { active = false; };
  }, [movieId]);
  const imageUri = movieId ? `${getMeteorHttpOriginUrl()}/imagenesPeliculas?calidad=mid&idPeli=${encodeURIComponent(movieId)}` : null;
  const background = theme.dark ? "#090d16" : "#f8fafc";
  const foreground = theme.colors.onSurface;
  const muted = theme.colors.onSurfaceVariant;
  const stream = movie?.urlPeliHTTPS || movie?.urlPeli;
  const play = () => {
    if (!stream) return Alert.alert("Sin enlace", "Esta película todavía no tiene una URL de reproducción disponible.");
    router.push({ pathname: "/(normal)/PeliculaPlayer", params: { id: movieId } });
  };
  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <AppHeader title={movie?.nombrePeli || "Detalles de película"} showBackButton onBackPress={() => router.back()} overlapContent />
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 30 }} showsVerticalScrollIndicator={false}>
        <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={styles.hero} imageStyle={styles.image}>
          <View style={styles.scrim} />
          <View style={styles.heroContent}>
            <Text variant="labelLarge" style={styles.eyebrow}>VIDKAR CINEMA · PELÍCULA</Text>
            <Text variant="headlineMedium" style={styles.title}>{movie?.nombrePeli || "Cargando película..."}</Text>
            <Text style={styles.meta}>{movie?.year || ""}{movie?.extension ? `  ·  ${String(movie.extension).toUpperCase()}` : ""}</Text>
          </View>
        </ImageBackground>
        <View style={styles.body}>
          {loading ? <ActivityIndicator style={{ alignSelf: "flex-start" }} /> : null}
          <View style={styles.actions}>
            <Button mode="contained" icon="play" onPress={play} disabled={!movie || !stream}>Reproducir</Button>
            {movie?.urlTrailer ? <Button mode="outlined" icon="youtube" onPress={() => Linking.openURL(movie.urlTrailer).catch(() => null)}>Tráiler</Button> : null}
          </View>
          {movie?.descripcion ? <Text variant="bodyLarge" style={{ color: muted, lineHeight: 23 }}>{movie.descripcion}</Text> : null}
          {Array.isArray(movie?.clasificacion) ? <View style={styles.chips}>{movie.clasificacion.map((genre) => <Chip key={genre}>{genre}</Chip>)}</View> : null}
          {movie?.actors ? <Text variant="bodyMedium" style={{ color: foreground }}>Reparto: {Array.isArray(movie.actors) ? movie.actors.join(" · ") : movie.actors}</Text> : null}
          {movie?.tamano ? <Text variant="bodyMedium" style={{ color: muted }}>Tamaño: {movie.tamano}</Text> : null}
          {!loading && !movie ? <IconButton icon="movie-off-outline" size={38} iconColor={muted} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: 470, justifyContent: "flex-end", backgroundColor: "#172033" },
  image: { resizeMode: "cover" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,7,18,0.42)" },
  heroContent: { gap: 8, padding: 24, paddingBottom: 34 },
  eyebrow: { color: "#c7d2fe", fontWeight: "900", letterSpacing: 1 },
  title: { color: "#fff", fontWeight: "900" },
  meta: { color: "rgba(255,255,255,0.8)" },
  body: { gap: 18, marginHorizontal: 16, marginTop: -20, borderRadius: 22, padding: 20, backgroundColor: "#111827", zIndex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
