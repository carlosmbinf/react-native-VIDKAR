import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import {
    Alert,
    ImageBackground,
    Linking,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { getMeteorUrl } from "../../services/meteor/client.native";
import AppHeader, {
    DEFAULT_HEADER_COLOR,
    useAppHeaderContentInset,
} from "../Header/AppHeader";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const getHttpOriginFromMeteorUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "https://www.vidkar.com";
  }

  try {
    const parsedUrl = new URL(value.trim());

    if (parsedUrl.hostname === "www.vidkar.com") {
      return "https://www.vidkar.com";
    }

    const protocol = parsedUrl.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsedUrl.host}`;
  } catch (_error) {
    return "https://www.vidkar.com";
  }
};

const normalizeMeteorCallback = (args) => {
  const [first, second] = args;

  if (
    first &&
    typeof first === "object" &&
    (Object.prototype.hasOwnProperty.call(first, "success") ||
      Object.prototype.hasOwnProperty.call(first, "error")) &&
    second === undefined
  ) {
    return { error: first.error, result: first.success };
  }

  return { error: first, result: second };
};

const normalizeList = (value, limit = 8) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).slice(0, limit);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  return [];
};

const getMovieTitle = (movie) => movie?.nombrePeli || "Pelicula sin titulo";
const getMovieYear = (movie) => (movie?.year ? String(movie.year) : "Sin ano");
const getMovieViews = (movie) => Number(movie?.vistas || 0);

const getMovieImageUrl = (movieId, quality = "hig") => {
  if (!movieId) {
    return null;
  }

  const mediaOrigin = getHttpOriginFromMeteorUrl(getMeteorUrl());
  return `${mediaOrigin}/imagenesPeliculas?calidad=${quality}&&idPeli=${encodeURIComponent(movieId)}`;
};

const resolveMovieStreamUrl = (movie) => {
  const candidate = movie?.urlPeliHTTPS || movie?.urlPeli;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
};

const getMovieSummary = (movie) => {
  const summary = typeof movie?.descripcion === "string" ? movie.descripcion.trim() : "";
  if (summary && summary !== getMovieTitle(movie)) {
    return summary;
  }

  return "Pelicula disponible para reproduccion desde el catalogo audiovisual de VidKar.";
};

const getPalette = (theme) => {
  const isDark = theme.dark;

  return {
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceElevated: theme.colors.elevation?.level2 || theme.colors.surface,
    surfaceSoft: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    border: isDark ? "rgba(226,232,240,0.14)" : "rgba(15,23,42,0.12)",
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    subtle: isDark ? "rgba(203,213,225,0.72)" : "rgba(71,85,105,0.72)",
    accent: isDark ? "#f43f5e" : "#c1121f",
    accentSoft: isDark ? "rgba(244,63,94,0.16)" : "rgba(193,18,31,0.1)",
    accentBorder: isDark ? "rgba(244,63,94,0.42)" : "rgba(193,18,31,0.26)",
    onAccent: "#ffffff",
    heroText: "#ffffff",
    heroMuted: "rgba(255,255,255,0.82)",
  };
};

const getMovieId = (value) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : null;
};

const PeliculaPlayer = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => getPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const movieId = React.useMemo(() => getMovieId(params.id), [params.id]);
  const [movie, setMovie] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(movieId));
  const [loadError, setLoadError] = React.useState(null);
  const [firstFrameReady, setFirstFrameReady] = React.useState(false);
  const videoViewRef = React.useRef(null);
  const viewsRegisteredRef = React.useRef(false);

  const { currentUser } = Meteor.useTracker(() => ({ currentUser: Meteor.user() }));
  const isAdmin = currentUser?.profile?.role === "admin" || currentUser?.username === "carlosmbinf";

  React.useEffect(() => {
    if (!movieId) {
      setLoading(false);
      setLoadError("No se recibio una pelicula valida para reproducir.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMovie(null);
    setFirstFrameReady(false);
    viewsRegisteredRef.current = false;

    Meteor.call("getPelicula", movieId, (...args) => {
      if (cancelled) {
        return;
      }

      const { error, result } = normalizeMeteorCallback(args);
      setLoading(false);

      if (error) {
        setLoadError(error.reason || error.message || "No fue posible cargar la pelicula.");
        return;
      }

      if (!result) {
        setLoadError("No encontramos los datos de esta pelicula.");
        return;
      }

      setMovie(result);
    });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const streamUrl = React.useMemo(() => resolveMovieStreamUrl(movie), [movie]);
  const posterUrl = React.useMemo(() => getMovieImageUrl(movie?._id, "hig"), [movie?._id]);
  const genres = React.useMemo(() => normalizeList(movie?.clasificacion, 10), [movie?.clasificacion]);
  const actors = React.useMemo(() => normalizeList(movie?.actors, 6), [movie?.actors]);
  const isWide = width >= 720;
  const hasSubtitle = Boolean(movie?.textSubtitle || movie?.subtitulo);

  const videoSource = React.useMemo(() => {
    if (!streamUrl) {
      return null;
    }

    return {
      uri: streamUrl,
      metadata: {
        title: getMovieTitle(movie),
        artist: "VidKar Cinema",
        artwork: posterUrl || undefined,
      },
    };
  }, [movie, posterUrl, streamUrl]);

  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = false;
    if (videoSource) {
      videoPlayer.play();
    }
  });

  React.useEffect(() => {
    if (!movie?._id || !streamUrl || viewsRegisteredRef.current) {
      return;
    }

    viewsRegisteredRef.current = true;
    Meteor.call("addVistas", movie._id);
  }, [movie?._id, streamUrl]);

  const openTrailer = React.useCallback(() => {
    if (!movie?.urlTrailer) {
      return;
    }

    Linking.openURL(movie.urlTrailer).catch(() => {
      Alert.alert("No se pudo abrir", "El dispositivo no pudo abrir el trailer.");
    });
  }, [movie?.urlTrailer]);

  if (!currentUser) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Reproductor"
          showBackButton
          backHref="/(normal)/PeliculasVideos"
          backgroundColor={DEFAULT_HEADER_COLOR}
          overlapContent
        />
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="bodyMedium" style={{ color: palette.muted }}>Preparando la sesion...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Reproductor"
          showBackButton
          backHref="/(normal)/PeliculasVideos"
          backgroundColor={DEFAULT_HEADER_COLOR}
          overlapContent
        />
        <View style={styles.centerState}>
          <Surface style={[styles.stateCard, { borderColor: palette.border }]} elevation={1}>
            <IconButton icon="lock-outline" size={40} iconColor={palette.accent} />
            <Text variant="headlineSmall" style={[styles.centerTitle, { color: palette.text }]}>Acceso administrativo</Text>
            <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>Esta reproduccion esta disponible solo para administradores.</Text>
          </Surface>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Reproductor"
          showBackButton
          backHref="/(normal)/PeliculasVideos"
          backgroundColor={DEFAULT_HEADER_COLOR}
          overlapContent
        />
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="bodyMedium" style={{ color: palette.muted }}>Cargando pelicula...</Text>
        </View>
      </View>
    );
  }

  if (loadError || !movie) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Reproductor"
          showBackButton
          backHref="/(normal)/PeliculasVideos"
          backgroundColor={DEFAULT_HEADER_COLOR}
          overlapContent
        />
        <View style={styles.centerState}>
          <Surface style={[styles.stateCard, { borderColor: palette.border }]} elevation={1}>
            <IconButton icon="movie-off-outline" size={42} iconColor={palette.accent} />
            <Text variant="headlineSmall" style={[styles.centerTitle, { color: palette.text }]}>No se pudo reproducir</Text>
            <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>{loadError || "La pelicula no esta disponible."}</Text>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}> 
      <AppHeader
        title="Reproductor"
        showBackButton
        backHref="/(normal)/PeliculasVideos"
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.playerStage, { paddingTop: headerInset + 8 }]}> 
          <Surface style={styles.playerShell} elevation={0}>
            {streamUrl ? (
              <View style={styles.videoFrame}>
                <VideoView
                  ref={videoViewRef}
                  player={player}
                  style={styles.video}
                  nativeControls
                  contentFit="contain"
                  fullscreenOptions={{ enable: true }}
                  allowsPictureInPicture={false}
                  onFirstFrameRender={() => setFirstFrameReady(true)}
                />
                {!firstFrameReady && posterUrl ? (
                  <ImageBackground pointerEvents="none" source={{ uri: posterUrl }} style={styles.posterOverlay} imageStyle={styles.posterOverlayImage}>
                    <LinearGradient colors={["rgba(0,0,0,0.24)", "rgba(0,0,0,0.76)"]} style={StyleSheet.absoluteFill} />
                    <ActivityIndicator color="#fff" />
                    <Text variant="labelLarge" style={styles.posterLoading}>Preparando reproduccion</Text>
                  </ImageBackground>
                ) : null}
              </View>
            ) : (
              <View style={styles.unavailableBox}>
                <IconButton icon="link-off" size={38} iconColor={palette.accent} />
                <Text variant="titleMedium" style={[styles.centerTitle, { color: palette.text }]}>Sin enlace de reproduccion</Text>
                <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>Esta pelicula todavia no tiene una URL de video disponible.</Text>
              </View>
            )}
          </Surface>
        </View>

        <View style={styles.contentArea}>
          <Surface style={[styles.movieHeaderCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={1}>
            <View style={styles.movieHeaderTopRow}>
              <View style={styles.movieTitleBlock}>
                <Text variant="labelLarge" style={[styles.eyebrow, { color: palette.accent }]}>VIDKAR CINEMA</Text>
                <Text variant="headlineMedium" style={[styles.movieTitle, { color: palette.text }]} numberOfLines={3}>{getMovieTitle(movie)}</Text>
              </View>
              <IconButton
                icon="fullscreen"
                size={22}
                iconColor={palette.onAccent}
                containerColor={palette.accent}
                disabled={!streamUrl}
                onPress={() => videoViewRef.current?.enterFullscreen?.()}
              />
            </View>

            <View style={styles.metaRow}>
              <Chip compact icon="calendar-blank-outline" style={[styles.infoChip, { backgroundColor: palette.surfaceSoft }]} textStyle={{ color: palette.text }}>{getMovieYear(movie)}</Chip>
              <Chip compact icon="eye-outline" style={[styles.infoChip, { backgroundColor: palette.surfaceSoft }]} textStyle={{ color: palette.text }}>{getMovieViews(movie).toFixed(0)} vistas</Chip>
              {movie?.extension ? <Chip compact style={[styles.formatChip, { backgroundColor: palette.accent }]} textStyle={styles.formatChipText}>{String(movie.extension).toUpperCase()}</Chip> : null}
            </View>

            <Text variant="bodyLarge" style={[styles.description, styles.headerDescription, { color: palette.muted }]} numberOfLines={4}>{getMovieSummary(movie)}</Text>

            <View style={styles.primaryActionsRow}>
              <Button
                mode="contained"
                icon="play-circle-outline"
                buttonColor={palette.accent}
                textColor={palette.onAccent}
                disabled={!streamUrl}
                onPress={() => player.play()}
                style={styles.primaryActionButton}
              >
                Reproducir
              </Button>
              <Button
                mode="outlined"
                icon="youtube"
                textColor={palette.text}
                style={[styles.primaryActionButton, { borderColor: palette.border }]}
                disabled={!movie?.urlTrailer}
                onPress={openTrailer}
              >
                Trailer
              </Button>
            </View>
          </Surface>

          <View style={[styles.detailGrid, isWide && styles.detailGridWide]}>
            <Surface style={[styles.infoPanel, { borderColor: palette.border }]} elevation={1}>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>Ficha de la pelicula</Text>

              {genres.length ? (
                <View style={styles.wrapRow}>
                  {genres.map((genre) => (
                    <Chip key={genre} compact style={[styles.genreChip, { backgroundColor: palette.surfaceSoft }]} textStyle={{ color: palette.text }}>
                      {genre}
                    </Chip>
                  ))}
                </View>
              ) : null}

              {actors.length ? (
                <View style={[styles.castBox, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                  <Text variant="labelLarge" style={[styles.castLabel, { color: palette.subtle }]}>Reparto</Text>
                  <Text variant="bodyMedium" style={[styles.castText, { color: palette.text }]}>{actors.join("  |  ")}</Text>
                </View>
              ) : null}
            </Surface>

            <Surface style={[styles.sidePanel, { borderColor: palette.border }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.text }]}>Controles rápidos</Text>
              <View style={styles.quickMetricRow}>
                <IconButton icon="play-circle-outline" size={22} iconColor={palette.accent} style={styles.metricIcon} />
                <View style={styles.metricCopy}>
                  <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>Origen</Text>
                  <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]} numberOfLines={1}>{streamUrl ? "Streaming interno" : "No disponible"}</Text>
                </View>
              </View>
              <View style={styles.quickMetricRow}>
                <IconButton icon="subtitles-outline" size={22} iconColor={hasSubtitle ? palette.accent : palette.muted} style={styles.metricIcon} />
                <View style={styles.metricCopy}>
                  <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>Subtitulos</Text>
                  <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]} numberOfLines={1}>{hasSubtitle ? "Disponibles" : "Sin registro"}</Text>
                </View>
              </View>
              <Button
                mode="contained"
                icon="fullscreen"
                buttonColor={palette.accent}
                textColor={palette.onAccent}
                disabled={!streamUrl}
                onPress={() => videoViewRef.current?.enterFullscreen?.()}
              >
                Pantalla completa
              </Button>
              <Button
                mode="outlined"
                icon="youtube"
                textColor={palette.text}
                style={{ borderColor: palette.border }}
                disabled={!movie?.urlTrailer}
                onPress={openTrailer}
              >
                Ver trailer
              </Button>
            </Surface>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  stateCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  centerTitle: {
    fontWeight: "900",
    textAlign: "center",
  },
  centerCopy: {
    textAlign: "center",
    lineHeight: 20,
  },
  playerStage: {
    backgroundColor: "#000",
    paddingBottom: 10,
  },
  eyebrow: {
    color: "#ffccd2",
    fontWeight: "900",
    letterSpacing: 0,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contentArea: {
    padding: 16,
    gap: 16,
  },
  playerShell: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  videoFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  posterOverlayImage: {
    opacity: 0.9,
  },
  posterLoading: {
    color: "#fff",
    fontWeight: "900",
  },
  unavailableBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  movieHeaderCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  movieHeaderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  movieTitleBlock: {
    flex: 1,
    gap: 5,
  },
  movieTitle: {
    fontWeight: "900",
    lineHeight: 34,
  },
  infoChip: {
    borderRadius: 999,
  },
  formatChip: {
    borderRadius: 999,
  },
  formatChipText: {
    color: "#fff",
    fontWeight: "900",
  },
  headerDescription: {
    marginTop: 2,
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 6,
  },
  detailGrid: {
    gap: 16,
  },
  detailGridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoPanel: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sidePanel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "900",
  },
  description: {
    lineHeight: 23,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    borderRadius: 999,
  },
  castBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  castLabel: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  castText: {
    lineHeight: 21,
  },
  quickMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricIcon: {
    margin: 0,
  },
  metricCopy: {
    flex: 1,
  },
  metricLabel: {
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricValue: {
    fontWeight: "800",
  },
  subtitleHint: {
    lineHeight: 17,
  },
});

export default PeliculaPlayer;