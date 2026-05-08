import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  ProgressBar,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import { getMeteorUrl } from "../../services/meteor/client.native";
import AppHeader, {
  DEFAULT_HEADER_COLOR,
  useAppHeaderContentInset,
} from "../Header/AppHeader";

const { VLCPlayer } = require("react-native-vlc-media-player");

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const DEFAULT_MEDIA_ORIGIN = "https://www.vidkar.com";
const SUBTITLE_DISABLE_TRACK_ID = -1;
const VLC_BUFFER_OPTIONS = Object.freeze([
  "--network-caching=1500",
  "--live-caching=1500",
  "--file-caching=1200",
  "--disc-caching=1200",
  "--http-reconnect",
  "--avcodec-fast",
]);
const SUBTITLE_FIELD_CANDIDATES = [
  "textSubtitle",
  "subtitulo",
  "subtitle",
  "subtitleUri",
  "subtitleUrl",
  "urlSubtitle",
  "urlSubtitulo",
  "srt",
  "srtUrl",
  "vtt",
  "vttUrl",
  "captions",
  "subtitles",
  "subtitleTracks",
];
const MEDIA_URL_KEYS = ["uri", "url", "src", "path", "file", "location", "link"];

const getHttpOriginFromMeteorUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_MEDIA_ORIGIN;
  }

  try {
    const parsedUrl = new URL(value.trim());

    if (parsedUrl.hostname === "www.vidkar.com") {
      return DEFAULT_MEDIA_ORIGIN;
    }

    const protocol = parsedUrl.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsedUrl.host}`;
  } catch (_error) {
    return DEFAULT_MEDIA_ORIGIN;
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
const getMovieYear = (movie) => (movie?.year ? String(movie.year) : "Sin año");
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

const isAbsoluteMediaUrl = (value) =>
  typeof value === "string" &&
  /^(https?:|file:|content:|asset:|ms-appx:|ms-appdata:)/i.test(value.trim());

const normalizeMediaUrl = (value, mediaOrigin) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();

  if (isAbsoluteMediaUrl(trimmedValue)) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    return `${mediaOrigin}${trimmedValue}`;
  }

  return `${mediaOrigin}/${trimmedValue.replace(/^\.?\//, "")}`;
};

const extractCandidateString = (value, depth = 0) => {
  if (depth > 4 || value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolvedItem = extractCandidateString(item, depth + 1);
      if (resolvedItem) {
        return resolvedItem;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    for (const key of MEDIA_URL_KEYS) {
      const resolvedKey = extractCandidateString(value[key], depth + 1);
      if (resolvedKey) {
        return resolvedKey;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const resolvedNestedValue = extractCandidateString(nestedValue, depth + 1);
      if (resolvedNestedValue) {
        return resolvedNestedValue;
      }
    }
  }

  return null;
};

const resolveMovieSubtitleUri = (movie, mediaOrigin) => {
  for (const field of SUBTITLE_FIELD_CANDIDATES) {
    const candidate = extractCandidateString(movie?.[field]);
    const normalizedCandidate = normalizeMediaUrl(candidate, mediaOrigin);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
};

const getMovieSummary = (movie) => {
  const summary = typeof movie?.descripcion === "string" ? movie.descripcion.trim() : "";
  if (summary && summary !== getMovieTitle(movie)) {
    return summary;
  }

  return "Película disponible para reproducción con compatibilidad VLC, subtítulos y reproducción continua en segundo plano.";
};

const getPalette = (theme) => {
  const isDark = theme.dark;

  return {
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceElevated: theme.colors.elevation?.level2 || theme.colors.surface,
    surfaceSoft: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    surfaceStrong: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
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
    playerScrim: "rgba(0,0,0,0.68)",
    playerStage: "#000000",
  };
};

const getMovieId = (value) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatPlaybackTime = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const getTrackName = (track) => {
  if (track?.name && typeof track.name === "string") {
    return track.name;
  }

  if (track?.id === SUBTITLE_DISABLE_TRACK_ID) {
    return "Desactivados";
  }

  return "Subtítulo";
};

const PeliculaPlayer = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => getPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const movieId = React.useMemo(() => getMovieId(params.id), [params.id]);
  const mediaOrigin = React.useMemo(
    () => getHttpOriginFromMeteorUrl(getMeteorUrl()),
    []
  );

  const [movie, setMovie] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(movieId));
  const [loadError, setLoadError] = React.useState(null);
  const [playerError, setPlayerError] = React.useState(null);
  const [buffering, setBuffering] = React.useState(Boolean(movieId));
  const [paused, setPaused] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [hasRenderedFrame, setHasRenderedFrame] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [videoInfo, setVideoInfo] = React.useState(null);
  const [selectedTextTrack, setSelectedTextTrack] = React.useState(undefined);
  const [playback, setPlayback] = React.useState({
    currentTime: 0,
    duration: 0,
    position: 0,
    remainingTime: 0,
  });

  const playerRef = React.useRef(null);
  const viewsRegisteredRef = React.useRef(false);

  const { currentUser } = Meteor.useTracker(() => ({ currentUser: Meteor.user() }));
  const isAdmin =
    currentUser?.profile?.role === "admin" || currentUser?.username === "carlosmbinf";

  React.useEffect(() => {
    if (!movieId) {
      setLoading(false);
      setLoadError("No se recibió una película válida para reproducir.");
      return;
    }

    let cancelled = false;
    const currentPlayerRef = playerRef.current;
    setLoading(true);
    setLoadError(null);
    setPlayerError(null);
    setMovie(null);
    setBuffering(true);
    setPaused(false);
    setReloadToken(0);
    setHasRenderedFrame(false);
    setIsPlaying(false);
    setVideoInfo(null);
    setSelectedTextTrack(undefined);
    setPlayback({
      currentTime: 0,
      duration: 0,
      position: 0,
      remainingTime: 0,
    });
    viewsRegisteredRef.current = false;

    Meteor.call("getPelicula", movieId, (...args) => {
      if (cancelled) {
        return;
      }

      const { error, result } = normalizeMeteorCallback(args);
      setLoading(false);

      if (error) {
        setLoadError(error.reason || error.message || "No fue posible cargar la película.");
        return;
      }

      if (!result) {
        setLoadError("No encontramos los datos de esta película.");
        return;
      }

      setMovie(result);
    });

    return () => {
      cancelled = true;
      currentPlayerRef?.stopPlayer?.();
    };
  }, [movieId]);

  const streamUrl = React.useMemo(() => resolveMovieStreamUrl(movie), [movie]);
  const posterUrl = React.useMemo(() => getMovieImageUrl(movie?._id, "hig"), [movie?._id]);
  const subtitleUri = React.useMemo(
    () => resolveMovieSubtitleUri(movie, mediaOrigin),
    [mediaOrigin, movie]
  );
  const genres = React.useMemo(() => normalizeList(movie?.clasificacion, 10), [movie?.clasificacion]);
  const actors = React.useMemo(() => normalizeList(movie?.actors, 6), [movie?.actors]);
  const isWide = width >= 720;
  const availableTextTracks = React.useMemo(
    () =>
      Array.isArray(videoInfo?.textTracks)
        ? videoInfo.textTracks.filter((track) => typeof track?.id === "number")
        : [],
    [videoInfo?.textTracks]
  );
  const selectableTextTracks = React.useMemo(
    () => availableTextTracks.filter((track) => track.id !== SUBTITLE_DISABLE_TRACK_ID),
    [availableTextTracks]
  );
  const durationMs = playback.duration || videoInfo?.duration || 0;
  const progressRatio = Number.isFinite(playback.position)
    ? clamp(playback.position, 0, 1)
    : durationMs > 0
      ? clamp(playback.currentTime / durationMs, 0, 1)
      : 0;
  const hasSubtitle = Boolean(subtitleUri || selectableTextTracks.length);

  React.useEffect(() => {
    if (subtitleUri || selectedTextTrack !== undefined || !selectableTextTracks.length) {
      return;
    }

    setSelectedTextTrack(selectableTextTracks[0].id);
  }, [selectedTextTrack, selectableTextTracks, subtitleUri]);

  React.useEffect(() => {
    if (!movie?._id || !streamUrl || viewsRegisteredRef.current) {
      return;
    }

    viewsRegisteredRef.current = true;
    Meteor.call("addVistas", movie._id);
  }, [movie?._id, streamUrl]);

  const vlcSource = React.useMemo(() => {
    if (!streamUrl) {
      return null;
    }

    return {
      uri: streamUrl,
      initType: 2,
      initOptions: [...VLC_BUFFER_OPTIONS],
      acceptInvalidCertificates: false,
    };
  }, [streamUrl]);

  const activeTextTrackLabel = React.useMemo(() => {
    if (subtitleUri) {
      return "Subtítulos externos activos";
    }

    if (selectedTextTrack === SUBTITLE_DISABLE_TRACK_ID) {
      return "Subtítulos desactivados";
    }

    if (selectedTextTrack !== undefined) {
      return getTrackName(availableTextTracks.find((track) => track.id === selectedTextTrack));
    }

    if (selectableTextTracks.length) {
      return `${selectableTextTracks.length} pista(s) disponibles`;
    }

    return "Sin subtítulos";
  }, [availableTextTracks, selectableTextTracks.length, selectedTextTrack, subtitleUri]);

  const handleLoad = React.useCallback((event) => {
    setVideoInfo(event);
    setBuffering(false);
    setPlayerError(null);
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      duration: event?.duration || currentPlayback.duration,
    }));
  }, []);

  const handleProgress = React.useCallback((event) => {
    setPlayback({
      currentTime: Number(event?.currentTime || 0),
      duration: Number(event?.duration || 0),
      position: Number(event?.position || 0),
      remainingTime: Number(event?.remainingTime || 0),
    });

    if (Number(event?.currentTime || 0) > 0) {
      setHasRenderedFrame(true);
    }
  }, []);

  const handleBuffering = React.useCallback(() => {
    setBuffering(true);
  }, []);

  const handlePlaying = React.useCallback(() => {
    setBuffering(false);
    setPaused(false);
    setIsPlaying(true);
    setHasRenderedFrame(true);
    setPlayerError(null);
  }, []);

  const handlePaused = React.useCallback(() => {
    setBuffering(false);
    setIsPlaying(false);
  }, []);

  const handleEnded = React.useCallback(() => {
    setPaused(true);
    setIsPlaying(false);
    setBuffering(false);
  }, []);

  const handleError = React.useCallback(() => {
    setBuffering(false);
    setIsPlaying(false);
    setPlayerError(
      "VLC no pudo continuar la reproducción. Reintenta o revisa el enlace de la película."
    );
  }, []);

  const openTrailer = React.useCallback(() => {
    if (!movie?.urlTrailer) {
      return;
    }

    Linking.openURL(movie.urlTrailer).catch(() => {
      Alert.alert("No se pudo abrir", "El dispositivo no pudo abrir el tráiler.");
    });
  }, [movie?.urlTrailer]);

  const handleTogglePlayback = React.useCallback(() => {
    if (!streamUrl) {
      return;
    }

    setPaused((currentValue) => !currentValue);
  }, [streamUrl]);

  const handleRetryPlayback = React.useCallback(() => {
    if (!streamUrl) {
      return;
    }

    setReloadToken((value) => value + 1);
    setPaused(false);
    setBuffering(true);
    setHasRenderedFrame(false);
    setPlayerError(null);
    setIsPlaying(false);
    setPlayback({
      currentTime: 0,
      duration: durationMs,
      position: 0,
      remainingTime: 0,
    });
  }, [durationMs, streamUrl]);

  const handleSeekBySeconds = React.useCallback(
    (deltaSeconds) => {
      if (!durationMs || !playerRef.current?.seek) {
        return;
      }

      const nextTime = clamp(playback.currentTime + deltaSeconds * 1000, 0, durationMs);
      playerRef.current.seek(nextTime / durationMs);
      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        currentTime: nextTime,
        remainingTime: Math.max(durationMs - nextTime, 0),
        position: durationMs > 0 ? nextTime / durationMs : 0,
      }));
    },
    [durationMs, playback.currentTime]
  );

  const handleCycleSubtitleTrack = React.useCallback(() => {
    if (subtitleUri || !availableTextTracks.length) {
      return;
    }

    const cycleTracks = [
      { id: SUBTITLE_DISABLE_TRACK_ID, name: "Desactivados" },
      ...selectableTextTracks,
    ];
    const currentTrackId =
      selectedTextTrack !== undefined
        ? selectedTextTrack
        : selectableTextTracks[0]?.id ?? SUBTITLE_DISABLE_TRACK_ID;
    const currentIndex = Math.max(
      cycleTracks.findIndex((track) => track.id === currentTrackId),
      0
    );
    const nextTrack = cycleTracks[(currentIndex + 1) % cycleTracks.length];

    setSelectedTextTrack(nextTrack.id);
  }, [availableTextTracks.length, selectableTextTracks, selectedTextTrack, subtitleUri]);

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
          <Text variant="bodyMedium" style={{ color: palette.muted }}>
            Preparando la sesión...
          </Text>
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
            <Text variant="headlineSmall" style={[styles.centerTitle, { color: palette.text }]}>
              Acceso administrativo
            </Text>
            <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>
              Esta reproducción está disponible solo para administradores.
            </Text>
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
          <Text variant="bodyMedium" style={{ color: palette.muted }}>
            Cargando película...
          </Text>
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
            <Text variant="headlineSmall" style={[styles.centerTitle, { color: palette.text }]}>
              No se pudo reproducir
            </Text>
            <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>
              {loadError || "La película no está disponible."}
            </Text>
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
        <View style={[styles.playerStage, { paddingTop: headerInset + 8, backgroundColor: palette.playerStage }]}>
          <ImageBackground
            source={posterUrl ? { uri: posterUrl } : undefined}
            style={styles.playerBackdrop}
            imageStyle={styles.playerBackdropImage}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.22)", palette.playerScrim, "#000000"]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Surface style={styles.playerShell} elevation={0}>
              {streamUrl && vlcSource ? (
                <View style={styles.videoFrame}>
                  <VLCPlayer
                    key={`${movie?._id || "movie"}:${reloadToken}`}
                    ref={playerRef}
                    style={styles.video}
                    source={vlcSource}
                    autoplay
                    paused={paused}
                    subtitleUri={subtitleUri || undefined}
                    textTrack={!subtitleUri && selectedTextTrack !== undefined ? selectedTextTrack : undefined}
                    playInBackground
                    videoAspectRatio="16:9"
                    resizeMode="contain"
                    acceptInvalidCertificates={false}
                    onLoad={handleLoad}
                    onProgress={handleProgress}
                    onBuffering={handleBuffering}
                    onPlaying={handlePlaying}
                    onPaused={handlePaused}
                    onEnd={handleEnded}
                    onError={handleError}
                  />

                  {!hasRenderedFrame && posterUrl ? (
                    <ImageBackground
                      pointerEvents="none"
                      source={{ uri: posterUrl }}
                      style={styles.posterOverlay}
                      imageStyle={styles.posterOverlayImage}
                    >
                      <LinearGradient
                        colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0.78)"]}
                        style={StyleSheet.absoluteFill}
                      />
                      <ActivityIndicator color="#fff" />
                      <Text variant="labelLarge" style={styles.posterLoading}>
                        Preparando reproducción VLC
                      </Text>
                    </ImageBackground>
                  ) : null}

                  {buffering ? (
                    <View style={styles.playerOverlayCenter}>
                      <ActivityIndicator color="#fff" />
                      <Text variant="labelLarge" style={styles.overlayCopy}>
                        Ajustando buffer optimizado
                      </Text>
                    </View>
                  ) : null}

                  {playerError ? (
                    <View style={styles.playerOverlayBottom}>
                      <Surface style={[styles.playerErrorBox, { backgroundColor: "rgba(9, 17, 31, 0.86)" }]} elevation={0}>
                        <Text variant="titleSmall" style={styles.playerErrorTitle}>
                          Reproducción interrumpida
                        </Text>
                        <Text variant="bodySmall" style={styles.playerErrorCopy}>
                          {playerError}
                        </Text>
                        <Button
                          mode="contained"
                          icon="refresh"
                          buttonColor={palette.accent}
                          textColor={palette.onAccent}
                          onPress={handleRetryPlayback}
                        >
                          Reintentar
                        </Button>
                      </Surface>
                    </View>
                  ) : null}

                  <View style={styles.playerBadgeRow}>
                    <Chip compact icon="play-circle-outline" style={styles.playerBadge} textStyle={styles.playerBadgeText}>
                      VLC interno
                    </Chip>
                    <Chip compact icon="motion-play-outline" style={styles.playerBadge} textStyle={styles.playerBadgeText}>
                      Segundo plano
                    </Chip>
                    {hasSubtitle ? (
                      <Chip compact icon="subtitles-outline" style={styles.playerBadge} textStyle={styles.playerBadgeText}>
                        Subtítulos
                      </Chip>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.unavailableBox}>
                  <IconButton icon="link-off" size={38} iconColor={palette.accent} />
                  <Text variant="titleMedium" style={[styles.centerTitle, { color: palette.text }]}>
                    Sin enlace de reproducción
                  </Text>
                  <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>
                    Esta película todavía no tiene una URL de video disponible.
                  </Text>
                </View>
              )}
            </Surface>
          </ImageBackground>
        </View>

        <View style={styles.contentArea}>
          <Surface style={[styles.movieHeaderCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={1}>
            <View style={styles.movieHeaderTopRow}>
              <View style={styles.movieTitleBlock}>
                <Text variant="labelLarge" style={[styles.eyebrow, { color: palette.accent }]}>
                  VIDKAR CINEMA
                </Text>
                <Text variant="headlineMedium" style={[styles.movieTitle, { color: palette.text }]} numberOfLines={3}>
                  {getMovieTitle(movie)}
                </Text>
              </View>
              <View style={styles.titleMetaColumn}>
                <Chip compact icon={isPlaying ? "play-circle" : "pause-circle"} style={[styles.infoChip, { backgroundColor: palette.accentSoft }]} textStyle={{ color: palette.text }}>
                  {isPlaying ? "En reproducción" : paused ? "En pausa" : "Lista"}
                </Chip>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Chip compact icon="calendar-blank-outline" style={[styles.infoChip, { backgroundColor: palette.surfaceSoft }]} textStyle={{ color: palette.text }}>
                {getMovieYear(movie)}
              </Chip>
              <Chip compact icon="eye-outline" style={[styles.infoChip, { backgroundColor: palette.surfaceSoft }]} textStyle={{ color: palette.text }}>
                {getMovieViews(movie).toFixed(0)} vistas
              </Chip>
              {movie?.extension ? (
                <Chip compact style={[styles.formatChip, { backgroundColor: palette.accent }]} textStyle={styles.formatChipText}>
                  {String(movie.extension).toUpperCase()}
                </Chip>
              ) : null}
            </View>

            <Text variant="bodyLarge" style={[styles.description, styles.headerDescription, { color: palette.muted }]} numberOfLines={4}>
              {getMovieSummary(movie)}
            </Text>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text variant="labelLarge" style={[styles.progressLabel, { color: palette.subtle }]}>
                  Progreso de reproducción
                </Text>
                <Text variant="labelMedium" style={[styles.progressTime, { color: palette.text }]}>
                  {formatPlaybackTime(playback.currentTime)} / {formatPlaybackTime(durationMs)}
                </Text>
              </View>
              <ProgressBar progress={progressRatio} color={palette.accent} style={[styles.progressBar, { backgroundColor: palette.surfaceSoft }]} />
              <View style={styles.progressFooter}>
                <Text variant="bodySmall" style={{ color: palette.muted }}>
                  Buffer profesional activo
                </Text>
                <Text variant="bodySmall" style={{ color: palette.muted }}>
                  Restante {formatPlaybackTime(Math.max(durationMs - playback.currentTime, 0))}
                </Text>
              </View>
            </View>

            <View style={styles.transportRow}>
              <IconButton
                icon="rewind-10"
                size={22}
                mode="contained-tonal"
                containerColor={palette.surfaceSoft}
                iconColor={palette.text}
                disabled={!durationMs}
                onPress={() => handleSeekBySeconds(-10)}
              />
              <IconButton
                icon={paused ? "play" : "pause"}
                size={26}
                mode="contained"
                containerColor={palette.accent}
                iconColor={palette.onAccent}
                disabled={!streamUrl}
                onPress={handleTogglePlayback}
              />
              <IconButton
                icon="fast-forward-10"
                size={22}
                mode="contained-tonal"
                containerColor={palette.surfaceSoft}
                iconColor={palette.text}
                disabled={!durationMs}
                onPress={() => handleSeekBySeconds(10)}
              />
            </View>

            <View style={styles.primaryActionsRow}>
              <Button
                mode="contained"
                icon="refresh"
                buttonColor={palette.accent}
                textColor={palette.onAccent}
                disabled={!streamUrl}
                onPress={handleRetryPlayback}
                style={styles.primaryActionButton}
              >
                Recargar stream
              </Button>
              <Button
                mode="outlined"
                icon="youtube"
                textColor={palette.text}
                style={[styles.primaryActionButton, { borderColor: palette.border }]}
                disabled={!movie?.urlTrailer}
                onPress={openTrailer}
              >
                Tráiler
              </Button>
            </View>
          </Surface>

          <View style={[styles.detailGrid, isWide && styles.detailGridWide]}>
            <Surface style={[styles.infoPanel, { borderColor: palette.border }]} elevation={1}>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>
                Ficha de la película
              </Text>

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
                  <Text variant="labelLarge" style={[styles.castLabel, { color: palette.subtle }]}>
                    Reparto
                  </Text>
                  <Text variant="bodyMedium" style={[styles.castText, { color: palette.text }]}>
                    {actors.join("  |  ")}
                  </Text>
                </View>
              ) : null}

              <View style={styles.supportList}>
                <View style={styles.supportItem}>
                  <IconButton icon="image-outline" size={18} iconColor={palette.accent} style={styles.metricIcon} />
                  <View style={styles.metricCopy}>
                    <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>
                      Poster del catálogo
                    </Text>
                    <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]}>
                      El reproductor reutiliza la misma imagen hero del card de la película.
                    </Text>
                  </View>
                </View>
                <View style={styles.supportItem}>
                  <IconButton icon="cached" size={18} iconColor={palette.accent} style={styles.metricIcon} />
                  <View style={styles.metricCopy}>
                    <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>
                      Buffer optimizado
                    </Text>
                    <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]}>
                      Perfil VLC ajustado para streaming remoto estable y reconexión HTTP.
                    </Text>
                  </View>
                </View>
              </View>
            </Surface>

            <Surface style={[styles.sidePanel, { borderColor: palette.border }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.text }]}>
                Controles rápidos
              </Text>

              <View style={styles.quickMetricRow}>
                <IconButton icon="play-network-outline" size={22} iconColor={palette.accent} style={styles.metricIcon} />
                <View style={styles.metricCopy}>
                  <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>
                    Origen
                  </Text>
                  <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]} numberOfLines={2}>
                    {streamUrl ? "Streaming interno con VLC" : "No disponible"}
                  </Text>
                </View>
              </View>

              <View style={styles.quickMetricRow}>
                <IconButton
                  icon="subtitles-outline"
                  size={22}
                  iconColor={hasSubtitle ? palette.accent : palette.muted}
                  style={styles.metricIcon}
                />
                <View style={styles.metricCopy}>
                  <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>
                    Subtítulos
                  </Text>
                  <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]} numberOfLines={2}>
                    {activeTextTrackLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.quickMetricRow}>
                <IconButton icon="motion-play-outline" size={22} iconColor={palette.accent} style={styles.metricIcon} />
                <View style={styles.metricCopy}>
                  <Text variant="labelMedium" style={[styles.metricLabel, { color: palette.subtle }]}>
                    Background
                  </Text>
                  <Text variant="bodyMedium" style={[styles.metricValue, { color: palette.text }]} numberOfLines={2}>
                    Continúa la reproducción cuando la app pasa a segundo plano.
                  </Text>
                </View>
              </View>

              {!subtitleUri && selectableTextTracks.length ? (
                <Button
                  mode="outlined"
                  icon="subtitles-outline"
                  textColor={palette.text}
                  style={{ borderColor: palette.border }}
                  onPress={handleCycleSubtitleTrack}
                >
                  Cambiar subtítulo
                </Button>
              ) : (
                <Button
                  mode="contained-tonal"
                  icon="subtitles-outline"
                  buttonColor={palette.surfaceSoft}
                  textColor={palette.text}
                  disabled={!hasSubtitle}
                >
                  {hasSubtitle ? "Subtítulos listos" : "Sin subtítulos"}
                </Button>
              )}
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
    paddingBottom: 10,
  },
  playerBackdrop: {
    minHeight: 280,
    justifyContent: "flex-end",
  },
  playerBackdropImage: {
    resizeMode: "cover",
  },
  playerShell: {
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  videoFrame: {
    minHeight: 236,
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  posterOverlayImage: {
    resizeMode: "cover",
  },
  posterLoading: {
    color: "#fff",
    fontWeight: "700",
  },
  playerOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  overlayCopy: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  playerOverlayBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  playerErrorBox: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  playerErrorTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  playerErrorCopy: {
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
  playerBadgeRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerBadge: {
    backgroundColor: "rgba(9, 17, 31, 0.72)",
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  playerBadgeText: {
    color: "#fff",
  },
  unavailableBox: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  contentArea: {
    paddingHorizontal: 16,
    gap: 16,
  },
  movieHeaderCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 16,
  },
  movieHeaderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  movieTitleBlock: {
    flex: 1,
    gap: 6,
  },
  titleMetaColumn: {
    alignItems: "flex-end",
  },
  eyebrow: {
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  movieTitle: {
    fontWeight: "900",
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoChip: {
    borderRadius: 999,
  },
  formatChip: {
    borderRadius: 999,
  },
  formatChipText: {
    color: "#fff",
    fontWeight: "800",
  },
  description: {
    lineHeight: 22,
  },
  headerDescription: {
    marginTop: -2,
  },
  progressBlock: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  progressLabel: {
    fontWeight: "800",
  },
  progressTime: {
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryActionButton: {
    flex: 1,
    minWidth: 180,
  },
  detailGrid: {
    gap: 16,
  },
  detailGridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoPanel: {
    flex: 1.2,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  sidePanel: {
    flex: 0.8,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontWeight: "900",
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  castLabel: {
    fontWeight: "800",
  },
  castText: {
    lineHeight: 22,
  },
  supportList: {
    gap: 12,
  },
  supportItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  quickMetricRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  metricIcon: {
    margin: 0,
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontWeight: "800",
  },
  metricValue: {
    lineHeight: 20,
  },
});

export default PeliculaPlayer;
