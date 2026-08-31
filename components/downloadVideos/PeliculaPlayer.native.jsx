import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SecureStore from "expo-secure-store";
import React from "react";
import {
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Dialog,
    Divider,
    IconButton,
    Portal,
    RadioButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHlsServerUrl, getMeteorUrl } from "../../services/meteor/client.native";
import { setNativePipPlayerActive } from "../../services/pip/nativePip";

const { VLCPlayer } = require("react-native-vlc-media-player");

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const DEFAULT_MEDIA_ORIGIN = "https://www.vidkar.com";
const SUBTITLE_DISABLE_TRACK_ID = -1;
const PLAYER_MODE_INLINE = "inline";
const PLAYER_MODE_FULLSCREEN = "fullscreen";
const SUBTITLE_EXTERNAL_TRACK_ID = "external";
const DEFAULT_SUBTITLE_SIZE_ID = "md";
const PLAYBACK_INTERRUPTION_TIMEOUT_MS = 30000;
const PLAYER_UNAVAILABLE_TITLE = "Servicio no disponible";
const PLAYER_UNAVAILABLE_MESSAGE = "El servicio no está disponible en este momento. Intenta nuevamente más tarde.";
const HLS_STATUS_POLL_MS = 2500;
const MOVIE_PLAYBACK_CACHE_KEY = "vidkar.moviePlaybackCache.v1";
const MOVIE_RESUME_MIN_SECONDS = 15;
const MOVIE_PROGRESS_SAVE_INTERVAL_SECONDS = 5;
const VLC_BUFFER_OPTIONS = Object.freeze([
  "--network-caching=1500",
  "--live-caching=1500",
  "--file-caching=1200",
  "--disc-caching=1200",
  "--http-reconnect",
  "--avcodec-fast",
]);
const SUBTITLE_SIZE_OPTIONS = Object.freeze([
  { id: "sm", label: "Pequeños", relativeFontSize: 11, textScale: 65 },
  { id: DEFAULT_SUBTITLE_SIZE_ID, label: "Medianos", relativeFontSize: 14, textScale: 82 },
  { id: "lg", label: "Grandes", relativeFontSize: 18, textScale: 100 },
]);
const SUBTITLE_FIELD_CANDIDATES = [
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

const getMovieTitle = (movie) => movie?.nombrePeli || "Pelicula sin titulo";

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

const joinMediaUrl = (baseUrl, path) => {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/$/, "");
  if (!normalizedBaseUrl) {
    return path;
  }

  return `${normalizedBaseUrl}${String(path || "").startsWith("/") ? path : `/${path}`}`;
};

const createHlsSessionId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;

const normalizeHlsStartAt = (value) => {
  const parsedValue = Number(value || 0);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.max(0, Math.floor(parsedValue));
};

const normalizePositiveMilliseconds = (value) => {
  const parsedValue = Number(value || 0);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

const normalizeHlsDurationMs = (value) => {
  const durationSeconds = Number(value || 0);
  return Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds * 1000 : 0;
};

const buildHlsEndpoints = (movieId, sessionId, startAtSeconds, hlsServerOrigin) => {
  if (!movieId || !sessionId) {
    return null;
  }

  const encodedMovieId = encodeURIComponent(movieId);
  const encodedSessionId = encodeURIComponent(sessionId);
  const normalizedStartAt = normalizeHlsStartAt(startAtSeconds);
  const startAtQuery = normalizedStartAt > 0 ? `&startAt=${encodeURIComponent(normalizedStartAt)}` : "";

  return {
    cancelUrl: joinMediaUrl(hlsServerOrigin, `/peliculas/hls/${encodedMovieId}/${encodedSessionId}/cancel`),
    prepareUrl: joinMediaUrl(hlsServerOrigin, `/peliculas/hls/${encodedMovieId}/prepare?sessionId=${encodedSessionId}${startAtQuery}`),
    statusUrl: joinMediaUrl(hlsServerOrigin, `/peliculas/hls/${encodedMovieId}/status?sessionId=${encodedSessionId}`),
  };
};

const normalizeHlsPlaylistUrl = (playlistUrl, hlsServerOrigin) => {
  if (typeof playlistUrl !== "string" || !playlistUrl.trim()) {
    return null;
  }

  const trimmedValue = playlistUrl.trim();
  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return joinMediaUrl(hlsServerOrigin, trimmedValue);
};

const cancelHlsSession = (cancelUrl) => {
  if (!cancelUrl) {
    return;
  }

  fetch(cancelUrl, { method: "POST" }).catch(() => null);
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
  if (movie?._id && (movie.textSubtitle || movie.subtitulo)) {
    return `${mediaOrigin}/getsubtitle?idPeli=${encodeURIComponent(movie._id)}`;
  }

  for (const field of SUBTITLE_FIELD_CANDIDATES) {
    const candidate = extractCandidateString(movie?.[field]);
    const normalizedCandidate = normalizeMediaUrl(candidate, mediaOrigin);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
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

const getTrackName = (track) => {
  if (track?.name && typeof track.name === "string") {
    return track.name;
  }

  if (track?.id === SUBTITLE_DISABLE_TRACK_ID) {
    return "Desactivados";
  }

  return "Subtítulo";
};

const getSubtitleSizeOption = (sizeId) =>
  SUBTITLE_SIZE_OPTIONS.find((option) => option.id === sizeId) ||
  SUBTITLE_SIZE_OPTIONS.find((option) => option.id === DEFAULT_SUBTITLE_SIZE_ID) ||
  SUBTITLE_SIZE_OPTIONS[0];

const readMoviePlaybackCache = async () => {
  try {
    const rawValue = await SecureStore.getItemAsync(MOVIE_PLAYBACK_CACHE_KEY);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch (_error) {
    return {};
  }
};

const writeMoviePlaybackCache = async (updater) => {
  try {
    const currentCache = await readMoviePlaybackCache();
    const nextCache =
      typeof updater === "function" ? updater(currentCache || {}) : updater || {};

    await SecureStore.setItemAsync(
      MOVIE_PLAYBACK_CACHE_KEY,
      JSON.stringify(nextCache || {})
    );

    return nextCache || {};
  } catch (_error) {
    return null;
  }
};

const getCachedPlaybackData = async (movieId) => {
  if (!movieId) {
    return { completed: false, currentTime: 0, duration: 0 };
  }

  const currentCache = await readMoviePlaybackCache();
  const cachedEntry = currentCache?.[movieId];

  return {
    completed: Boolean(cachedEntry?.playback?.completed),
    currentTime: Number(cachedEntry?.playback?.currentTime || 0),
    duration: Number(cachedEntry?.playback?.duration || 0),
  };
};

const buildMovieCachedData = (movie) => ({
  _id: movie?._id || null,
  nombrePeli: movie?.nombrePeli || "",
  year: movie?.year || "",
  urlBackground: movie?.urlBackground || movie?.urlBackgroundHTTPS || "",
});

const PeliculaPlayer = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => getPalette(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const movieId = React.useMemo(() => getMovieId(params.id), [params.id]);
  const mediaOrigin = React.useMemo(
    () => getHttpOriginFromMeteorUrl(getMeteorUrl()),
    []
  );
  const hlsServerOrigin = React.useMemo(() => getHlsServerUrl() || mediaOrigin, [mediaOrigin]);

  const [movie, setMovie] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(movieId));
  const [loadError, setLoadError] = React.useState(null);
  const [movieReloadToken, setMovieReloadToken] = React.useState(0);
  const [playerError, setPlayerError] = React.useState(null);
  const [, setBuffering] = React.useState(Boolean(movieId));
  const [paused, setPaused] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [hasRenderedFrame, setHasRenderedFrame] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playerMetadataReady, setPlayerMetadataReady] = React.useState(false);
  const [videoInfo, setVideoInfo] = React.useState(null);
  const [selectedTextTrack, setSelectedTextTrack] = React.useState(undefined);
  const [externalSubtitleEnabled, setExternalSubtitleEnabled] = React.useState(true);
  const [subtitleSizeId, setSubtitleSizeId] = React.useState(DEFAULT_SUBTITLE_SIZE_ID);
  const [subtitleDialogVisible, setSubtitleDialogVisible] = React.useState(false);
  const [playerMode, setPlayerMode] = React.useState(PLAYER_MODE_INLINE);
  const [playerChromeVisible, setPlayerChromeVisible] = React.useState(true);
  const [playback, setPlayback] = React.useState({
    currentTime: 0,
    duration: 0,
    position: 0,
    remainingTime: 0,
  });
  const [hlsPlayback, setHlsPlayback] = React.useState({
    durationSeconds: 0,
    error: null,
    playlistUrl: null,
    startAtSeconds: 0,
    status: "idle",
  });
  const [serverHlsDurationMs, setServerHlsDurationMs] = React.useState(0);
  const [hlsReloadToken, setHlsReloadToken] = React.useState(0);
  const [hlsStartAtRequest, setHlsStartAtRequest] = React.useState(0);
  const [resumePromptVisible, setResumePromptVisible] = React.useState(false);
  const [resumeTimeMs, setResumeTimeMs] = React.useState(0);
  const [cachedDurationMs, setCachedDurationMs] = React.useState(0);
  const [resumeStateReady, setResumeStateReady] = React.useState(false);

  const playerRef = React.useRef(null);
  const viewsRegisteredRef = React.useRef(false);
  const playbackInterruptionTimerRef = React.useRef(null);
  const pendingPlaybackErrorRef = React.useRef(null);
  const hlsPollTimerRef = React.useRef(null);
  const hlsCancelUrlRef = React.useRef(null);
  const persistedPlaybackSecondsRef = React.useRef(0);

  const clearPlaybackInterruptionTimer = React.useCallback(() => {
    if (playbackInterruptionTimerRef.current) {
      clearTimeout(playbackInterruptionTimerRef.current);
      playbackInterruptionTimerRef.current = null;
    }
  }, []);

  const { currentUser } = Meteor.useTracker(() => ({ currentUser: Meteor.user() }));
  const canAccessMovies = currentUser?.subscipcionPelis === true;

  React.useEffect(() => {
    let mounted = true;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => null);

    return () => {
      if (!mounted) {
        return;
      }

      mounted = false;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => null);
    };
  }, []);

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
    setPlayerMetadataReady(false);
    setVideoInfo(null);
    setSelectedTextTrack(undefined);
    setExternalSubtitleEnabled(true);
    setSubtitleDialogVisible(false);
    setPlayerMode(PLAYER_MODE_INLINE);
    setPlayerChromeVisible(true);
    setPlayback({
      currentTime: 0,
      duration: 0,
      position: 0,
      remainingTime: 0,
    });
    setHlsPlayback({
      durationSeconds: 0,
      error: null,
      playlistUrl: null,
      startAtSeconds: 0,
      status: "idle",
    });
    setServerHlsDurationMs(0);
    setHlsStartAtRequest(0);
    setResumePromptVisible(false);
    setResumeTimeMs(0);
    setCachedDurationMs(0);
    setResumeStateReady(false);
    persistedPlaybackSecondsRef.current = 0;
    viewsRegisteredRef.current = false;
    pendingPlaybackErrorRef.current = null;
    clearPlaybackInterruptionTimer();

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
  }, [clearPlaybackInterruptionTimer, movieId, movieReloadToken]);

  React.useEffect(() => {
    let cancelled = false;

    if (!movieId) {
      setResumePromptVisible(false);
      setResumeTimeMs(0);
      setCachedDurationMs(0);
      setResumeStateReady(true);
      return undefined;
    }

    setResumeStateReady(false);

    getCachedPlaybackData(movieId).then((cachedPlayback) => {
      if (cancelled) {
        return;
      }

      const cachedPositionSeconds = Number(cachedPlayback.currentTime || 0);
      const nextCachedDurationSeconds = Number(cachedPlayback.duration || 0);
      const shouldResume =
        !cachedPlayback.completed &&
        cachedPositionSeconds > MOVIE_RESUME_MIN_SECONDS &&
        (!nextCachedDurationSeconds ||
          cachedPositionSeconds <
            Math.max(0, nextCachedDurationSeconds - MOVIE_RESUME_MIN_SECONDS));

      setCachedDurationMs(nextCachedDurationSeconds * 1000);

      if (!shouldResume) {
        setResumePromptVisible(false);
        setResumeTimeMs(0);
        setResumeStateReady(true);
        return;
      }

      setResumeTimeMs(cachedPositionSeconds * 1000);
      setResumePromptVisible(true);
      setResumeStateReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const sourceVideoUrl = React.useMemo(() => resolveMovieStreamUrl(movie), [movie]);
  const streamUrl = hlsPlayback.playlistUrl;
  const hlsPreparing = ["starting", "processing"].includes(hlsPlayback.status) && !streamUrl;
  const hlsDurationMs =
    serverHlsDurationMs || normalizeHlsDurationMs(hlsPlayback.durationSeconds);
  const hlsStartOffsetMs = Number(hlsPlayback.startAtSeconds || 0) * 1000;

  React.useEffect(() => {
    if (!resumeStateReady || resumePromptVisible) {
      return undefined;
    }

    if (!movie?._id || !sourceVideoUrl) {
      if (movie && !sourceVideoUrl) {
        setHlsPlayback({
          durationSeconds: 0,
          error: "Esta película todavía no tiene una URL de video disponible.",
          playlistUrl: null,
          startAtSeconds: 0,
          status: "error",
        });
      }
      return undefined;
    }

    let cancelled = false;
    const sessionId = createHlsSessionId();
    const endpoints = buildHlsEndpoints(movie._id, sessionId, hlsStartAtRequest, hlsServerOrigin);
    hlsCancelUrlRef.current = endpoints?.cancelUrl || null;

    const clearHlsPollTimer = () => {
      if (hlsPollTimerRef.current) {
        clearTimeout(hlsPollTimerRef.current);
        hlsPollTimerRef.current = null;
      }
    };

    const applyHlsStatus = (status) => {
      const playlistUrl = normalizeHlsPlaylistUrl(status?.playlistUrl, hlsServerOrigin);
      const nextDurationMs = normalizeHlsDurationMs(status?.durationSeconds);
      if (nextDurationMs > 0) {
        setServerHlsDurationMs(nextDurationMs);
      }

      setHlsPlayback((currentValue) => ({
        durationSeconds: nextDurationMs > 0
          ? nextDurationMs / 1000
          : Number(currentValue.durationSeconds || 0),
        error: status?.error || null,
        playlistUrl: status?.playlistReady || status?.ready ? playlistUrl : null,
        startAtSeconds: Number(status?.startAtSeconds || hlsStartAtRequest || 0),
        status: status?.status || "processing",
      }));
    };

    const pollHlsStatus = async () => {
      if (cancelled || !endpoints?.statusUrl) {
        return;
      }

      try {
        const response = await fetch(endpoints.statusUrl);
        const status = await response.json();
        if (cancelled) {
          return;
        }

        if (!response.ok || status?.success === false || status?.status === "error") {
          setHlsPlayback((currentValue) => ({
            ...currentValue,
            error: PLAYER_UNAVAILABLE_MESSAGE,
            status: "error",
          }));
          return;
        }

        applyHlsStatus(status);

        if (!status?.playlistReady && status?.status !== "ready") {
          hlsPollTimerRef.current = setTimeout(pollHlsStatus, HLS_STATUS_POLL_MS);
        }
      } catch (_error) {
        if (cancelled) {
          return;
        }

        setHlsPlayback((currentValue) => ({
          ...currentValue,
          error: PLAYER_UNAVAILABLE_MESSAGE,
          status: "error",
        }));
      }
    };

    const prepareHls = async () => {
      setHlsPlayback((currentValue) => ({
        durationSeconds: Number(currentValue.durationSeconds || 0),
        error: null,
        playlistUrl: null,
        startAtSeconds: normalizeHlsStartAt(hlsStartAtRequest),
        status: "starting",
      }));
      setPlayerError(null);
      setBuffering(true);
      setHasRenderedFrame(false);
      setPlayerMetadataReady(false);
      setIsPlaying(false);
      pendingPlaybackErrorRef.current = null;

      try {
        const response = await fetch(endpoints.prepareUrl, { method: "POST" });
        const status = await response.json();
        if (cancelled) {
          return;
        }

        if (!response.ok || status?.success === false) {
          const nextDurationMs = normalizeHlsDurationMs(status?.durationSeconds);
          if (nextDurationMs > 0) {
            setServerHlsDurationMs(nextDurationMs);
          }

          setHlsPlayback((currentValue) => ({
            durationSeconds: nextDurationMs > 0
              ? nextDurationMs / 1000
              : Number(currentValue.durationSeconds || 0),
            error: PLAYER_UNAVAILABLE_MESSAGE,
            playlistUrl: null,
            startAtSeconds: normalizeHlsStartAt(hlsStartAtRequest),
            status: "error",
          }));
          return;
        }

        applyHlsStatus(status);
        if (!status?.playlistReady && status?.status !== "ready") {
          hlsPollTimerRef.current = setTimeout(pollHlsStatus, HLS_STATUS_POLL_MS);
        }
      } catch (_error) {
        if (cancelled) {
          return;
        }

        setHlsPlayback((currentValue) => ({
          durationSeconds: Number(currentValue.durationSeconds || 0),
          error: PLAYER_UNAVAILABLE_MESSAGE,
          playlistUrl: null,
          startAtSeconds: normalizeHlsStartAt(hlsStartAtRequest),
          status: "error",
        }));
      }
    };

    prepareHls();

    return () => {
      cancelled = true;
      clearHlsPollTimer();
      cancelHlsSession(endpoints?.cancelUrl);
      if (hlsCancelUrlRef.current === endpoints?.cancelUrl) {
        hlsCancelUrlRef.current = null;
      }
    };
  }, [
    hlsReloadToken,
    hlsServerOrigin,
    hlsStartAtRequest,
    movie,
    resumePromptVisible,
    resumeStateReady,
    sourceVideoUrl,
  ]);

  React.useEffect(() => {
    const active = Boolean(streamUrl && !loadError && movie && currentUser && canAccessMovies);
    setNativePipPlayerActive(active);

    return () => {
      setNativePipPlayerActive(false);
    };
  }, [canAccessMovies, currentUser, loadError, movie, streamUrl]);

  const detectedSubtitleUri = React.useMemo(
    () => resolveMovieSubtitleUri(movie, hlsServerOrigin),
    [hlsServerOrigin, movie]
  );
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
  const durationMs =
    hlsDurationMs ||
    normalizePositiveMilliseconds(playback.duration) ||
    normalizePositiveMilliseconds(videoInfo?.duration) ||
    cachedDurationMs ||
    0;
  const progressRatio = durationMs > 0
    ? clamp(playback.currentTime / durationMs, 0, 1)
    : Number.isFinite(playback.position)
      ? clamp(playback.position, 0, 1)
      : 0;
  const hasSubtitle = Boolean(detectedSubtitleUri || selectableTextTracks.length);
  const subtitleOptions = React.useMemo(() => {
    const options = [{ id: SUBTITLE_DISABLE_TRACK_ID, label: "Sin subtítulos" }];

    if (detectedSubtitleUri) {
      options.push({ id: SUBTITLE_EXTERNAL_TRACK_ID, label: "Subtítulo externo" });
    }

    selectableTextTracks.forEach((track, index) => {
      options.push({
        id: track.id,
        label: getTrackName(track) || `Pista ${index + 1}`,
      });
    });

    return options;
  }, [detectedSubtitleUri, selectableTextTracks]);
  const selectedSubtitleOption = detectedSubtitleUri
    ? externalSubtitleEnabled
      ? SUBTITLE_EXTERNAL_TRACK_ID
      : selectedTextTrack ?? SUBTITLE_DISABLE_TRACK_ID
    : selectedTextTrack ?? SUBTITLE_DISABLE_TRACK_ID;

  React.useEffect(() => {
    pendingPlaybackErrorRef.current = null;
    clearPlaybackInterruptionTimer();

    if (!streamUrl || hasRenderedFrame || playerError) {
      return undefined;
    }

    playbackInterruptionTimerRef.current = setTimeout(() => {
      playbackInterruptionTimerRef.current = null;
      setBuffering(false);
      setIsPlaying(false);
      setPlayerError(pendingPlaybackErrorRef.current || PLAYER_UNAVAILABLE_MESSAGE);
    }, PLAYBACK_INTERRUPTION_TIMEOUT_MS);

    return clearPlaybackInterruptionTimer;
  }, [clearPlaybackInterruptionTimer, hasRenderedFrame, movie?._id, playerError, reloadToken, streamUrl]);

  React.useEffect(() => {
    if (detectedSubtitleUri || selectedTextTrack !== undefined || !selectableTextTracks.length) {
      return;
    }

    setSelectedTextTrack(selectableTextTracks[0].id);
  }, [detectedSubtitleUri, selectedTextTrack, selectableTextTracks]);

  React.useEffect(() => {
    if (!isPlaying || paused || !playerChromeVisible || subtitleDialogVisible || playerError) {
      return undefined;
    }

    const chromeTimer = setTimeout(() => {
      setPlayerChromeVisible(false);
    }, 4200);

    return () => clearTimeout(chromeTimer);
  }, [isPlaying, paused, playerChromeVisible, playerError, subtitleDialogVisible]);

  const selectedSubtitleSize = React.useMemo(
    () => getSubtitleSizeOption(subtitleSizeId),
    [subtitleSizeId]
  );

  const vlcSource = React.useMemo(() => {
    if (!streamUrl) {
      return null;
    }

    return {
      uri: streamUrl,
      initType: 2,
      initOptions: [
        ...VLC_BUFFER_OPTIONS,
        `--freetype-rel-fontsize=${selectedSubtitleSize.relativeFontSize}`,
        `--sub-text-scale=${selectedSubtitleSize.textScale}`,
      ],
      acceptInvalidCertificates: false,
    };
  }, [selectedSubtitleSize.relativeFontSize, selectedSubtitleSize.textScale, streamUrl]);

  const activeTextTrackLabel = React.useMemo(() => {
    if (detectedSubtitleUri) {
      if (externalSubtitleEnabled && !playerMetadataReady) {
        return "Preparando subtítulo externo";
      }

      if (externalSubtitleEnabled) {
        return "Subtítulo externo activo";
      }

      if (selectedTextTrack === SUBTITLE_DISABLE_TRACK_ID || selectedTextTrack === undefined) {
        return "Subtítulos desactivados";
      }

      return getTrackName(availableTextTracks.find((track) => track.id === selectedTextTrack));
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
  }, [
    availableTextTracks,
    detectedSubtitleUri,
    externalSubtitleEnabled,
    playerMetadataReady,
    selectableTextTracks.length,
    selectedTextTrack,
  ]);

  const persistPlaybackState = React.useCallback(
    async ({ completed = false, currentTime = 0, duration = 0 }) => {
      if (!movie?._id) {
        return;
      }

      const normalizedDurationSeconds = Math.max(
        0,
        Math.floor((Number(duration) || 0) / 1000)
      );
      const normalizedCurrentTimeSeconds = completed
        ? 0
        : Math.max(0, Math.floor((Number(currentTime) || 0) / 1000));

      await writeMoviePlaybackCache((currentCache) => ({
        ...currentCache,
        [movie._id]: {
          ...currentCache?.[movie._id],
          movie: buildMovieCachedData(movie),
          playback: {
            completed,
            currentTime: normalizedCurrentTimeSeconds,
            duration: normalizedDurationSeconds,
            updatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [movie]
  );

  React.useEffect(() => {
    if (!movie?._id || !resumeStateReady || !durationMs) {
      return;
    }

    const currentTimeSeconds = Math.max(
      0,
      Math.floor((Number(playback.currentTime) || 0) / 1000)
    );
    const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const reachedEnd =
      durationSeconds > 0 &&
      currentTimeSeconds >=
        Math.max(0, durationSeconds - MOVIE_RESUME_MIN_SECONDS);

    if (reachedEnd) {
      persistedPlaybackSecondsRef.current = 0;
      persistPlaybackState({ completed: true, currentTime: 0, duration: durationMs });
      return;
    }

    if (currentTimeSeconds < MOVIE_RESUME_MIN_SECONDS) {
      return;
    }

    if (
      Math.abs(currentTimeSeconds - persistedPlaybackSecondsRef.current) <
      MOVIE_PROGRESS_SAVE_INTERVAL_SECONDS
    ) {
      return;
    }

    persistedPlaybackSecondsRef.current = currentTimeSeconds;
    persistPlaybackState({
      completed: false,
      currentTime: playback.currentTime,
      duration: durationMs,
    });
  }, [durationMs, movie?._id, persistPlaybackState, playback.currentTime, resumeStateReady]);

  const handleLoad = React.useCallback((event) => {
    const resolvedDuration = hlsDurationMs || Number(event?.duration || 0) || cachedDurationMs;
    setVideoInfo(event);
    setBuffering(false);
    setPlayerError(null);
    setPlayerMetadataReady(true);
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      duration: resolvedDuration || currentPlayback.duration,
    }));

    if (!viewsRegisteredRef.current && movie?._id && Number(resolvedDuration || 0) > 0) {
      viewsRegisteredRef.current = true;
      Meteor.call("addVistas", movie._id);
    }
  }, [cachedDurationMs, hlsDurationMs, movie?._id]);

  const handleProgress = React.useCallback((event) => {
    const relativeCurrentTime = Number(event?.currentTime || 0);
    const resolvedDuration = hlsDurationMs || Number(event?.duration || 0);
    const absoluteCurrentTime = hlsStartOffsetMs + relativeCurrentTime;
    const resolvedPosition = resolvedDuration > 0
      ? clamp(absoluteCurrentTime / resolvedDuration, 0, 1)
      : Number(event?.position || 0);

    setPlayback({
      currentTime: absoluteCurrentTime,
      duration: resolvedDuration,
      position: resolvedPosition,
      remainingTime: resolvedDuration > 0 ? Math.max(resolvedDuration - absoluteCurrentTime, 0) : Number(event?.remainingTime || 0),
    });

    if (relativeCurrentTime > 0) {
      clearPlaybackInterruptionTimer();
      setHasRenderedFrame(true);
    }
  }, [clearPlaybackInterruptionTimer, hlsDurationMs, hlsStartOffsetMs]);

  const handleBuffering = React.useCallback(() => {
    setBuffering(true);
  }, []);

  const handlePlaying = React.useCallback(() => {
    clearPlaybackInterruptionTimer();
    setBuffering(false);
    setPaused(false);
    setIsPlaying(true);
    setHasRenderedFrame(true);
    setPlayerError(null);
  }, [clearPlaybackInterruptionTimer]);

  const handlePaused = React.useCallback(() => {
    setBuffering(false);
    setIsPlaying(false);
  }, []);

  const handleEnded = React.useCallback(() => {
    clearPlaybackInterruptionTimer();
    setPaused(true);
    setIsPlaying(false);
    setBuffering(false);
    persistedPlaybackSecondsRef.current = 0;
    persistPlaybackState({ completed: true, currentTime: 0, duration: durationMs });
  }, [clearPlaybackInterruptionTimer, durationMs, persistPlaybackState]);

  const handleError = React.useCallback(() => {
    setIsPlaying(false);
    pendingPlaybackErrorRef.current = PLAYER_UNAVAILABLE_MESSAGE;

    if (!hasRenderedFrame) {
      setBuffering(true);
      return;
    }

    clearPlaybackInterruptionTimer();
    setBuffering(false);
    setPlayerError(pendingPlaybackErrorRef.current);
  }, [clearPlaybackInterruptionTimer, hasRenderedFrame]);

  const handleTogglePlayback = React.useCallback(() => {
    if (!streamUrl) {
      return;
    }

    setPaused((currentValue) => !currentValue);
  }, [streamUrl]);

  const handleRetryPlayback = React.useCallback(() => {
    if (!movie?._id || !sourceVideoUrl) {
      return;
    }

    cancelHlsSession(hlsCancelUrlRef.current);
    hlsCancelUrlRef.current = null;
    setHlsStartAtRequest(0);
    setHlsReloadToken((value) => value + 1);
    setReloadToken((value) => value + 1);
    setPaused(false);
    setBuffering(true);
    setHasRenderedFrame(false);
    setPlayerMetadataReady(false);
    setPlayerError(null);
    setIsPlaying(false);
    pendingPlaybackErrorRef.current = null;
    clearPlaybackInterruptionTimer();
    setPlayback({
      currentTime: 0,
      duration: hlsDurationMs || playback.duration || videoInfo?.duration || 0,
      position: 0,
      remainingTime: 0,
    });
  }, [clearPlaybackInterruptionTimer, hlsDurationMs, movie?._id, playback.duration, sourceVideoUrl, videoInfo?.duration]);

  const handleRetryMovieLoad = React.useCallback(() => {
    if (!movieId) {
      return;
    }

    setMovieReloadToken((value) => value + 1);
  }, [movieId]);

  const handleSeekBySeconds = React.useCallback(
    (deltaSeconds) => {
      if (!durationMs || !movie?._id || !sourceVideoUrl) {
        return;
      }

      const nextTime = clamp(playback.currentTime + deltaSeconds * 1000, 0, durationMs);
      const nextStartAtSeconds = normalizeHlsStartAt(nextTime / 1000);
      cancelHlsSession(hlsCancelUrlRef.current);
      hlsCancelUrlRef.current = null;
      setHlsStartAtRequest(nextStartAtSeconds);
      setHlsReloadToken((value) => value + 1);
      setReloadToken((value) => value + 1);
      setPaused(false);
      setBuffering(true);
      setHasRenderedFrame(false);
      setPlayerMetadataReady(false);
      setPlayerError(null);
      setIsPlaying(false);
      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        currentTime: nextTime,
        remainingTime: Math.max(durationMs - nextTime, 0),
        position: durationMs > 0 ? nextTime / durationMs : 0,
      }));
    },
    [durationMs, movie?._id, playback.currentTime, sourceVideoUrl]
  );

  const handleSelectSubtitleTrack = React.useCallback((trackId) => {
    if (trackId === SUBTITLE_EXTERNAL_TRACK_ID) {
      setExternalSubtitleEnabled(true);
      setSelectedTextTrack(undefined);
      setSubtitleDialogVisible(false);
      return;
    }

    setExternalSubtitleEnabled(false);
    setSelectedTextTrack(trackId);
    setSubtitleDialogVisible(false);
  }, []);

  const handleSelectSubtitleSize = React.useCallback(
    (nextSizeId) => {
      if (!nextSizeId || nextSizeId === subtitleSizeId) {
        return;
      }

      setSubtitleSizeId(nextSizeId);

      if (!movie?._id || !sourceVideoUrl || !streamUrl) {
        return;
      }

      const nextStartAtSeconds = normalizeHlsStartAt(playback.currentTime / 1000);
      cancelHlsSession(hlsCancelUrlRef.current);
      hlsCancelUrlRef.current = null;
      setHlsStartAtRequest(nextStartAtSeconds);
      setHlsReloadToken((value) => value + 1);
      setReloadToken((value) => value + 1);
      setPaused(false);
      setBuffering(true);
      setHasRenderedFrame(false);
      setPlayerMetadataReady(false);
      setPlayerError(null);
      setIsPlaying(false);
      pendingPlaybackErrorRef.current = null;
      clearPlaybackInterruptionTimer();
    },
    [
      clearPlaybackInterruptionTimer,
      movie?._id,
      playback.currentTime,
      sourceVideoUrl,
      streamUrl,
      subtitleSizeId,
    ]
  );

  const handleTogglePlayerChrome = React.useCallback(() => {
    setPlayerChromeVisible((currentValue) => !currentValue);
  }, []);

  const handleResumePlayback = React.useCallback(() => {
    setHlsStartAtRequest(normalizeHlsStartAt(resumeTimeMs / 1000));
    setResumePromptVisible(false);
  }, [resumeTimeMs]);

  const handleStartFromBeginning = React.useCallback(() => {
    setHlsStartAtRequest(0);
    setResumePromptVisible(false);
    setResumeTimeMs(0);
    persistedPlaybackSecondsRef.current = 0;
    persistPlaybackState({ completed: false, currentTime: 0, duration: durationMs });
  }, [durationMs, persistPlaybackState]);

  const handleGoBack = React.useCallback(() => {
    persistPlaybackState({
      completed: false,
      currentTime: playback.currentTime,
      duration: durationMs,
    });

    if (playerMode !== PLAYER_MODE_INLINE) {
      setPlayerMode(PLAYER_MODE_INLINE);
      return;
    }

    cancelHlsSession(hlsCancelUrlRef.current);
    hlsCancelUrlRef.current = null;

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(normal)/PeliculasVideos");
  }, [durationMs, persistPlaybackState, playback.currentTime, playerMode, router]);

  const handleOpenFullscreen = React.useCallback(() => {
    if (!streamUrl) {
      return;
    }

    setPlayerMode(PLAYER_MODE_FULLSCREEN);
  }, [streamUrl]);

  const handleClosePlayerOverlay = React.useCallback(() => {
    setPlayerMode(PLAYER_MODE_INLINE);
  }, []);

  const renderPlayerSurface = React.useCallback(
    (mode = PLAYER_MODE_INLINE) => {
      const isFullscreenMode = mode === PLAYER_MODE_FULLSCREEN;

      if (!sourceVideoUrl) {
        return (
          <View style={styles.videoFrame}>
            <View style={styles.playerOverlayCenter}>
              <Surface style={[styles.playerErrorBox, { backgroundColor: "rgba(9, 17, 31, 0.9)" }]} elevation={0}>
                <IconButton icon="link-off" size={38} iconColor={palette.accent} />
                <Text variant="titleMedium" style={styles.playerErrorTitle}>
                  Sin enlace de reproducción
                </Text>
                <Text variant="bodySmall" style={styles.playerErrorCopy}>
                  Esta película todavía no tiene una URL de video disponible.
                </Text>
              </Surface>
            </View>
          </View>
        );
      }

      if (!streamUrl || !vlcSource) {
        const hasHlsError = hlsPlayback.status === "error";

        return (
          <View style={styles.videoFrame}>
            <View style={styles.playerOverlayCenter}>
              <Surface
                style={[
                  hasHlsError ? styles.playerErrorBox : styles.playerPreparingBox,
                  { backgroundColor: "rgba(9, 17, 31, 0.9)" },
                ]}
                elevation={0}
              >
                {hasHlsError ? (
                  <IconButton icon="alert-circle-outline" size={38} iconColor={palette.accent} />
                ) : (
                  <ActivityIndicator color="#fff" />
                )}
                <Text variant="titleMedium" style={styles.playerErrorTitle}>
                  {hasHlsError ? PLAYER_UNAVAILABLE_TITLE : "Preparando reproducción"}
                </Text>
                <Text variant="bodySmall" style={styles.playerErrorCopy}>
                  {hasHlsError
                    ? PLAYER_UNAVAILABLE_MESSAGE
                    : "Estamos preparando una sesión de streaming segura para esta película."}
                </Text>
                {hasHlsError ? (
                  <Button
                    mode="contained"
                    icon="refresh"
                    buttonColor={palette.accent}
                    textColor={palette.onAccent}
                    onPress={handleRetryPlayback}
                  >
                    Reintentar
                  </Button>
                ) : null}
              </Surface>
            </View>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.videoFrame,
            isFullscreenMode && styles.videoFrameFullscreen,
          ]}
        >
          <VLCPlayer
            key={`${movie?._id || "movie"}:${reloadToken}:${mode}:${subtitleSizeId}`}
            ref={playerRef}
            style={styles.video}
            source={vlcSource}
            autoplay
            paused={paused}
            subtitleUri={externalSubtitleEnabled ? detectedSubtitleUri || undefined : undefined}
            textTrack={
              !externalSubtitleEnabled && selectedTextTrack !== undefined
                ? selectedTextTrack
                : undefined
            }
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

          <Pressable
            style={styles.videoTapLayer}
            onPress={handleTogglePlayerChrome}
            accessibilityRole="button"
            accessibilityLabel={playerChromeVisible ? "Ocultar controles" : "Mostrar controles"}
          />

          {!hasRenderedFrame && !playerError ? (
            <View pointerEvents="none" style={styles.playerLoadingOverlay}>
              <ActivityIndicator color="#fff" />
              <Text variant="labelLarge" style={styles.posterLoading}>
                {hlsPreparing ? "Preparando streaming" : "Preparando reproducción"}
              </Text>
            </View>
          ) : null}

          {playerError ? (
            <View style={styles.playerOverlayCenter}>
              <Surface
                style={[styles.playerErrorBox, { backgroundColor: "rgba(9, 17, 31, 0.86)" }]}
                elevation={0}
              >
                <Text variant="titleSmall" style={styles.playerErrorTitle}>
                  {PLAYER_UNAVAILABLE_TITLE}
                </Text>
                <Text variant="bodySmall" style={styles.playerErrorCopy}>
                  {PLAYER_UNAVAILABLE_MESSAGE}
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

          {playerChromeVisible ? (
            <View style={styles.netflixControls} pointerEvents="box-none">
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                  <View style={[styles.progressKnob, { left: `${progressRatio * 100}%` }]} />
                </View>
                <Text variant="labelSmall" style={styles.progressTimeText}>
                  {formatPlaybackTime(durationMs)}
                </Text>
              </View>

              <View style={styles.netflixControlRow}>
                <View style={styles.controlCluster}>
                  <IconButton
                    icon={paused ? "play" : "pause"}
                    size={34}
                    iconColor="#fff"
                    style={styles.netflixIconButton}
                    onPress={handleTogglePlayback}
                    accessibilityLabel={paused ? "Reproducir" : "Pausar"}
                  />
                  <IconButton
                    icon="rewind-10"
                    size={30}
                    iconColor="#fff"
                    style={styles.netflixIconButton}
                    disabled={!durationMs}
                    onPress={() => handleSeekBySeconds(-10)}
                    accessibilityLabel="Retroceder diez segundos"
                  />
                  <IconButton
                    icon="fast-forward-10"
                    size={30}
                    iconColor="#fff"
                    style={styles.netflixIconButton}
                    disabled={!durationMs}
                    onPress={() => handleSeekBySeconds(10)}
                    accessibilityLabel="Adelantar diez segundos"
                  />
                </View>

                <Text variant="labelLarge" style={styles.netflixMovieTitle} numberOfLines={1}>
                  {getMovieTitle(movie)}
                </Text>

                <View style={[styles.controlCluster, styles.controlClusterRight]}>
                  <IconButton
                    icon="subtitles-outline"
                    size={30}
                    iconColor="#fff"
                    style={styles.netflixIconButton}
                    disabled={!hasSubtitle}
                    onPress={() => setSubtitleDialogVisible(true)}
                    accessibilityLabel={activeTextTrackLabel}
                  />
                  {!isFullscreenMode ? (
                    <IconButton
                      icon="fullscreen"
                      size={32}
                      iconColor="#fff"
                      style={styles.netflixIconButton}
                      onPress={handleOpenFullscreen}
                      accessibilityLabel="Pantalla completa"
                    />
                  ) : (
                    <IconButton
                      icon="fullscreen-exit"
                      size={32}
                      iconColor="#fff"
                      style={styles.netflixIconButton}
                      onPress={handleClosePlayerOverlay}
                      accessibilityLabel="Salir de pantalla completa"
                    />
                  )}
                </View>
              </View>
            </View>
          ) : (
            <IconButton
              icon="gesture-tap"
              size={24}
              mode="contained-tonal"
              containerColor="rgba(15, 23, 42, 0.38)"
              iconColor="#fff"
              style={styles.playerChromeRevealButton}
              onPress={() => setPlayerChromeVisible(true)}
              accessibilityLabel="Mostrar controles"
            />
          )}
        </View>
      );
    },
    [
      activeTextTrackLabel,
      detectedSubtitleUri,
      durationMs,
      externalSubtitleEnabled,
      handleBuffering,
      handleClosePlayerOverlay,
      handleEnded,
      handleError,
      handleLoad,
      handleOpenFullscreen,
      handlePaused,
      handlePlaying,
      handleProgress,
      handleRetryPlayback,
      handleSeekBySeconds,
      handleTogglePlayback,
      handleTogglePlayerChrome,
      hasRenderedFrame,
      hasSubtitle,
      hlsPlayback.error,
      hlsPlayback.status,
      hlsPreparing,
      movie,
      palette.accent,
      palette.onAccent,
      paused,
      playerChromeVisible,
      playerError,
      progressRatio,
      reloadToken,
      selectedTextTrack,
      subtitleSizeId,
      sourceVideoUrl,
      streamUrl,
      vlcSource,
    ]
  );

  if (!currentUser) {
    return (
      <View style={[styles.screen, styles.playerOnlyScreen, { backgroundColor: palette.playerStage }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#fff"
          style={[styles.playerBackButton, { top: Math.max(insets.top, 8) }]}
          onPress={handleGoBack}
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

  if (!canAccessMovies) {
    return (
      <View style={[styles.screen, styles.playerOnlyScreen, { backgroundColor: palette.playerStage }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#fff"
          style={[styles.playerBackButton, { top: Math.max(insets.top, 8) }]}
          onPress={handleGoBack}
        />
        <View style={styles.centerState}>
          <Surface style={[styles.stateCard, { borderColor: palette.border }]} elevation={1}>
            <IconButton icon="lock-outline" size={40} iconColor={palette.accent} />
            <Text variant="headlineSmall" style={[styles.centerTitle, { color: palette.text }]}>
              Suscripcion requerida
            </Text>
            <Text variant="bodyMedium" style={[styles.centerCopy, { color: palette.muted }]}>
              Esta reproduccion esta disponible cuando tu cuenta tiene activa la suscripcion de peliculas.
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.playerOnlyScreen, { backgroundColor: palette.playerStage }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#fff"
          style={[styles.playerBackButton, { top: Math.max(insets.top, 8) }]}
          onPress={handleGoBack}
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
      <View style={[styles.screen, styles.playerOnlyScreen, { backgroundColor: palette.playerStage }]}> 
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#fff"
          style={[styles.playerBackButton, { top: Math.max(insets.top, 8) }]}
          onPress={handleGoBack}
        />
        <View style={styles.videoFrame}>
          <View style={styles.playerOverlayCenter}>
            <Surface style={[styles.playerErrorBox, { backgroundColor: "rgba(9, 17, 31, 0.9)" }]} elevation={0}>
              <IconButton icon="movie-off-outline" size={42} iconColor={palette.accent} />
              <Text variant="titleMedium" style={styles.playerErrorTitle}>
                No se pudo reproducir
              </Text>
              <Text variant="bodySmall" style={styles.playerErrorCopy}>
                {loadError || "La película no está disponible."}
              </Text>
              <Button
                mode="contained"
                icon="refresh"
                buttonColor={palette.accent}
                textColor={palette.onAccent}
                onPress={handleRetryMovieLoad}
              >
                Reintentar
              </Button>
            </Surface>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.playerOnlyScreen, { backgroundColor: palette.playerStage }]}> 
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {renderPlayerSurface(PLAYER_MODE_INLINE)}
      <IconButton
        icon="arrow-left"
        size={24}
        iconColor="#fff"
        style={[styles.playerBackButton, { top: Math.max(insets.top, 8) }]}
        onPress={handleGoBack}
      />

      <Portal>
        <Dialog
          visible={resumePromptVisible}
          dismissable={false}
          style={[styles.resumeDialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title style={{ color: palette.text }}>Continuar reproducción</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.resumeDialogCopy, { color: palette.muted }]}> 
              Encontramos un punto guardado de esta película para que sigas exactamente donde te quedaste.
            </Text>
            <Text variant="titleMedium" style={[styles.resumeDialogMetric, { color: palette.text }]}> 
              Último punto: {formatPlaybackTime(resumeTimeMs)}
            </Text>
            {cachedDurationMs > 0 ? (
              <Text variant="bodySmall" style={[styles.resumeDialogCopy, { color: palette.muted }]}> 
                Duración registrada: {formatPlaybackTime(cachedDurationMs)}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleStartFromBeginning} textColor={palette.text}>
              Empezar de nuevo
            </Button>
            <Button
              mode="contained"
              buttonColor={palette.accent}
              textColor={palette.onAccent}
              onPress={handleResumePlayback}
            >
              Continuar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={subtitleDialogVisible && playerMode !== PLAYER_MODE_FULLSCREEN}
          onDismiss={() => setSubtitleDialogVisible(false)}
          style={[styles.subtitleDialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title style={{ color: palette.text }}>Subtítulos</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.subtitleDialogCopy, { color: palette.muted }]}>
              Selecciona la pista que quieres ver durante la reproducción.
            </Text>
            <View style={styles.subtitleSizeSection}>
              <Text variant="labelLarge" style={[styles.subtitleSizeTitle, { color: palette.text }]}> 
                Tamaño del subtítulo
              </Text>
              <View style={styles.subtitleSizeActions}>
                {SUBTITLE_SIZE_OPTIONS.map((option) => {
                  const selected = option.id === subtitleSizeId;

                  return (
                    <Button
                      key={option.id}
                      compact
                      mode={selected ? "contained" : "outlined"}
                      buttonColor={selected ? palette.accent : undefined}
                      textColor={selected ? palette.onAccent : palette.text}
                      onPress={() => handleSelectSubtitleSize(option.id)}
                      style={styles.subtitleSizeButton}
                      contentStyle={styles.subtitleSizeButtonContent}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </View>
            </View>
            <Divider style={styles.subtitleDialogDivider} />
            <RadioButton.Group
              value={String(selectedSubtitleOption)}
              onValueChange={(value) => {
                const normalizedValue =
                  value === SUBTITLE_EXTERNAL_TRACK_ID ? value : Number(value);
                handleSelectSubtitleTrack(normalizedValue);
              }}
            >
              {subtitleOptions.map((option, index) => (
                <View key={String(option.id)}>
                  {index > 0 ? <Divider /> : null}
                  <RadioButton.Item
                    label={option.label}
                    value={String(option.id)}
                    labelStyle={{ color: palette.text }}
                    color={palette.accent}
                    uncheckedColor={palette.muted}
                  />
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSubtitleDialogVisible(false)} textColor={palette.text}>
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Modal
        visible={playerMode === PLAYER_MODE_FULLSCREEN}
        animationType="fade"
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
        onRequestClose={handleClosePlayerOverlay}
      >
        <StatusBar hidden />
        <View style={styles.fullscreenRoot}>
          {renderPlayerSurface(PLAYER_MODE_FULLSCREEN)}
          {subtitleDialogVisible ? (
            <View style={styles.fullscreenSubtitleOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setSubtitleDialogVisible(false)}
              />
              <Surface style={styles.fullscreenSubtitleSheet} elevation={4}>
                <Text variant="titleMedium" style={styles.fullscreenSubtitleTitle}>
                  Subtítulos
                </Text>
                <Text variant="labelLarge" style={styles.fullscreenSubtitleSectionLabel}>
                  Tamaño
                </Text>
                <View style={styles.fullscreenSubtitleSizeRow}>
                  {SUBTITLE_SIZE_OPTIONS.map((option) => {
                    const selected = option.id === subtitleSizeId;

                    return (
                      <Button
                        key={option.id}
                        compact
                        mode={selected ? "contained" : "outlined"}
                        buttonColor={selected ? "rgba(255,255,255,0.18)" : "transparent"}
                        textColor="#fff"
                        onPress={() => handleSelectSubtitleSize(option.id)}
                        style={styles.fullscreenSubtitleSizeButton}
                        contentStyle={styles.fullscreenSubtitleSizeButtonContent}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </View>
                <Divider style={styles.fullscreenSubtitleDivider} />
                {subtitleOptions.map((option) => (
                  <Pressable
                    key={String(option.id)}
                    style={styles.fullscreenSubtitleItem}
                    onPress={() => handleSelectSubtitleTrack(option.id)}
                  >
                    <IconButton
                      icon={
                        String(option.id) === String(selectedSubtitleOption)
                          ? "radiobox-marked"
                          : "radiobox-blank"
                      }
                      size={18}
                      iconColor="#fff"
                      style={styles.fullscreenSubtitleIcon}
                    />
                    <Text variant="bodyMedium" style={styles.fullscreenSubtitleLabel}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </Surface>
            </View>
          ) : null}
        </View>
      </Modal>
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
  playerOnlyScreen: {
    justifyContent: "center",
    backgroundColor: "#000",
  },
  playerBackButton: {
    position: "absolute",
    left: 8,
    zIndex: 6,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
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
  playerShell: {
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  videoFrame: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  videoFrameFullscreen: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    aspectRatio: undefined,
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  videoTapLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  playerLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    zIndex: 2,
  },
  posterLoading: {
    color: "#fff",
    fontWeight: "700",
  },
  playerOverlayCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    zIndex: 5,
  },
  playerErrorBox: {
    width: 420,
    maxWidth: "92%",
    alignSelf: "center",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  playerPreparingBox: {
    alignSelf: "center",
    width: "auto",
    maxWidth: 360,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  playerErrorTitle: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
  },
  playerErrorCopy: {
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
    textAlign: "center",
  },
  netflixControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.44)",
    zIndex: 3,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.34)",
    position: "relative",
  },
  progressFill: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "#e50914",
  },
  progressKnob: {
    position: "absolute",
    top: -4,
    width: 11,
    height: 11,
    marginLeft: -5,
    borderRadius: 999,
    backgroundColor: "#e50914",
  },
  progressTimeText: {
    minWidth: 46,
    color: "rgba(255,255,255,0.82)",
    textAlign: "right",
    fontWeight: "700",
  },
  netflixControlRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlCluster: {
    width: 168,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  controlClusterRight: {
    justifyContent: "flex-end",
  },
  netflixIconButton: {
    margin: 0,
  },
  netflixMovieTitle: {
    flex: 1,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    fontWeight: "800",
    paddingHorizontal: 12,
  },
  playerChromeRevealButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 4,
  },
  unavailableBox: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  detachedPlayerPlaceholder: {
    minHeight: 236,
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  detachedPlayerTitle: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
  detachedPlayerCopy: {
    color: "rgba(255,255,255,0.76)",
    textAlign: "center",
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  fullscreenSubtitleOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  fullscreenSubtitleSheet: {
    margin: 18,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  fullscreenSubtitleTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 6,
  },
  fullscreenSubtitleSectionLabel: {
    color: "rgba(255,255,255,0.74)",
    marginBottom: 8,
  },
  fullscreenSubtitleSizeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  fullscreenSubtitleSizeButton: {
    borderRadius: 999,
  },
  fullscreenSubtitleSizeButtonContent: {
    minHeight: 34,
    paddingHorizontal: 4,
  },
  fullscreenSubtitleDivider: {
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  fullscreenSubtitleItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  fullscreenSubtitleIcon: {
    margin: 0,
  },
  fullscreenSubtitleLabel: {
    color: "#fff",
    flex: 1,
  },
  subtitleDialog: {
    borderRadius: 26,
  },
  resumeDialog: {
    borderRadius: 26,
  },
  resumeDialogCopy: {
    lineHeight: 20,
    marginBottom: 8,
  },
  resumeDialogMetric: {
    fontWeight: "700",
    marginBottom: 4,
    marginTop: 4,
  },
  subtitleDialogDivider: {
    marginBottom: 10,
    marginTop: 4,
  },
  subtitleDialogCopy: {
    marginBottom: 8,
    lineHeight: 20,
  },
  subtitleSizeSection: {
    marginBottom: 12,
  },
  subtitleSizeTitle: {
    marginBottom: 10,
  },
  subtitleSizeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subtitleSizeButton: {
    borderRadius: 999,
  },
  subtitleSizeButtonContent: {
    minHeight: 34,
    paddingHorizontal: 4,
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
    columnGap: 8,
    rowGap: 8,
    flexWrap: "wrap",
  },
  primaryActionButton: {
    flex: 1,
    minWidth: 138,
    borderRadius: 999,
  },
  primaryActionButtonCompact: {
    flexBasis: "48%",
    minWidth: 0,
  },
  primaryActionContent: {
    minHeight: 46,
    paddingHorizontal: 8,
  },
  primaryActionLabel: {
    fontSize: 14,
    fontWeight: "800",
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
