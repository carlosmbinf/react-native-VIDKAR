import React from "react";
import { BlurView } from "expo-blur";
import { Alert, ImageBackground, Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, IconButton, Text, useTheme } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Meteor } from "../../services/meteor/client.native";
import { getMeteorHttpOriginUrl } from "../../services/appUrls";
import AppHeader from "../Header/AppHeader";
import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";

function DetailPill({ label, value, onImage = false }) {
  const theme = useTheme();
  const lightSurface = !onImage && !theme.dark;
  return (
    <View style={[styles.detailPill, lightSurface && {
      backgroundColor: theme.colors.surfaceVariant,
      borderColor: theme.colors.outlineVariant,
    }]}>
      <Text style={[styles.pillLabel, lightSurface && { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.pillValue, lightSurface && { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

export default function PeliculaDetalle({ movieId }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useSystemReducedMotion();
  const zoomEnabled = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 18 && !reducedMotion;
  const [movie, setMovie] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(movieId));
  const [footerHeight, setFooterHeight] = React.useState(0);
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
  const background = theme.dark ? "#090d16" : "#e2e8f0";
  const muted = theme.colors.onSurfaceVariant;
  const actors = Array.isArray(movie?.actors)
    ? movie.actors
    : movie?.actors ? [movie.actors] : [];
  const stream = movie?.urlPeliHTTPS || movie?.urlPeli;
  const play = () => {
    if (!stream) return Alert.alert("Sin enlace", "Esta película todavía no tiene una URL de reproducción disponible.");
    router.push({ pathname: "/(normal)/PeliculaPlayer", params: { id: movieId } });
  };
  const openTrailer = () => {
    if (!movie?.urlTrailer) return;
    Linking.openURL(movie.urlTrailer).catch((error) => {
      console.warn("[PeliculaDetalle] No se pudo abrir el trailer:", error);
      Alert.alert("No se pudo abrir el tráiler", "Inténtalo de nuevo en unos momentos.");
    });
  };
  const hero = (
    <View style={styles.hero}>
      {zoomEnabled ? (
        <Link.AppleZoomTarget>
          <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={StyleSheet.absoluteFill} imageStyle={styles.image} />
        </Link.AppleZoomTarget>
      ) : (
        <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={StyleSheet.absoluteFill} imageStyle={styles.image} />
      )}
      <View style={styles.scrim} />
      <View style={styles.heroContent}>
        <Text variant="labelLarge" style={styles.eyebrow}>VIDKAR CINEMA · PELÍCULA</Text>
        <Text variant="headlineMedium" style={styles.title}>{movie?.nombrePeli || "Cargando película..."}</Text>
        <View style={styles.chips}>
          {movie?.year ? <DetailPill onImage label="Año" value={String(movie.year)} /> : null}
          {movie?.extension ? <DetailPill onImage label="Formato" value={String(movie.extension).toUpperCase()} /> : null}
          {movie?.tamano ? <DetailPill onImage label="Tamaño" value={String(movie.tamano)} /> : null}
        </View>
      </View>
    </View>
  );
  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <AppHeader
        title={movie?.nombrePeli || "Detalles de película"}
        showBackButton
        onBack={() => router.back()}
        overlapContent
      />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: footerHeight + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {hero}
        <View style={[styles.body, { backgroundColor: theme.colors.surface }, !theme.dark && styles.lightBody]}>
          {loading ? <ActivityIndicator style={{ alignSelf: "flex-start" }} /> : null}
          {movie?.descripcion ? (
            <View style={styles.synopsis}>
              <Text style={[styles.pillLabel, { color: muted }]}>Sinopsis</Text>
              <Text variant="bodyLarge" style={{ color: muted, lineHeight: 23 }}>{movie.descripcion}</Text>
            </View>
          ) : null}
          {Array.isArray(movie?.clasificacion) ? <View style={styles.chips}>{movie.clasificacion.map((genre) => <DetailPill key={genre} label="Género" value={genre} />)}</View> : null}
          {actors.length ? <View style={styles.chips}>{actors.map((actor, index) => <DetailPill key={`${actor}-${index}`} label="Reparto" value={actor} />)}</View> : null}
          {!loading && !movie ? <IconButton icon="movie-off-outline" size={38} iconColor={muted} /> : null}
        </View>
      </ScrollView>
      <View
        onLayout={({ nativeEvent }) => setFooterHeight(nativeEvent.layout.height)}
        style={[styles.footer, {
          paddingBottom: Math.max(insets.bottom, 18),
          backgroundColor: theme.dark ? "rgba(9,13,22,0.88)" : "rgba(248,250,252,0.92)",
          borderTopColor: theme.colors.outlineVariant,
        }]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <BlurView intensity={22} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.footerActions}>
          <Button
            mode="outlined"
            icon="youtube"
            accessibilityLabel="Ver tráiler"
            disabled={loading || !movie?.urlTrailer}
            onPress={openTrailer}
            style={styles.footerButton}
            labelStyle={styles.footerLabel}
          >
            Tráiler
          </Button>
          <Button
            mode="contained"
            icon="play"
            accessibilityLabel="Reproducir película"
            disabled={loading || !movie || !stream}
            onPress={play}
            style={styles.footerButton}
            labelStyle={styles.footerLabel}
          >
            Reproducir
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: 470, justifyContent: "flex-end", backgroundColor: "#172033", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  image: { resizeMode: "cover", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,7,18,0.42)" },
  heroContent: { gap: 8, padding: 24, paddingBottom: 34 },
  eyebrow: { color: "#c7d2fe", fontWeight: "900", letterSpacing: 1 },
  title: { color: "#fff", fontWeight: "900" },
  body: { gap: 18, marginHorizontal: 16, marginTop: -20, borderRadius: 22, padding: 20, zIndex: 1 },
  lightBody: { borderWidth: 1, borderColor: "#cbd5e1", boxShadow: "0px 6px 18px rgba(15, 23, 42, 0.12)" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailPill: { alignSelf: "flex-start", maxWidth: "100%", backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  pillLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  pillValue: { color: "#ffffff", fontSize: 16, fontWeight: "800", flexShrink: 1 },
  synopsis: { gap: 8 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, borderTopWidth: 1, overflow: "hidden", paddingHorizontal: 16, paddingTop: 14 },
  footerActions: { flexDirection: "row", gap: 8 },
  footerButton: { flex: 1, borderRadius: 16 },
  footerLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
});
