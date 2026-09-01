import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Animated,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Linking,
    ActivityIndicator as NativeActivityIndicator,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    IconButton,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMeteorUrl } from "../../services/meteor/client.native";
import AppHeader, {
    DEFAULT_HEADER_COLOR,
    useAppHeaderContentInset,
} from "../Header/AppHeader";
import { PelisCollection } from "../collections/collections";
import { syncMovieSpotlightIndex } from "../../services/spotlight/spotlight";
import ModernBottomDrawer from "../cinema/ModernBottomDrawer.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const MOVIE_FIELDS = {
  _id: 1,
  actors: 1,
  clasificacion: 1,
  createdAt: 1,
  descripcion: 1,
  extension: 1,
  idimdb: 1,
  mostrar: 1,
  nombrePeli: 1,
  subtitulo: 1,
  tamano: 1,
  urlBackground: 1,
  urlBackgroundHTTPS: 1,
  urlPadre: 1,
  urlPeli: 1,
  urlPeliHTTPS: 1,
  urlTrailer: 1,
  vistas: 1,
  year: 1,
};

const ALL_GENRES = "Todos";
const MOVIE_LIMIT = 10000;
const MOVIE_SEARCH_LIMIT = 240;
const MOVIE_SEARCH_DEBOUNCE_MS = 2000;
const MOVIE_SUBSCRIPTION_DEBUG = false;

const MOVIE_DIALOG_MODE = {
  MANUAL: "manual",
  YEAR: "year",
};

const INITIAL_MOVIE_FORM = {
  nombre: "",
  year: "",
  peli: "",
  poster: "",
  subtitle: "",
  urlPadre: "",
  descripcion: "",
  tamano: "",
  mostrar: true,
};

const INITIAL_MOVIE_YEAR_FORM = {
  year: "",
};

const summarizeMovieForDebug = (movie) => ({
  _id: movie?._id,
  nombrePeli: movie?.nombrePeli,
  year: movie?.year,
  extension: movie?.extension,
  mostrar: movie?.mostrar,
  vistas: movie?.vistas,
  urlPeli: Boolean(movie?.urlPeli),
  urlPeliHTTPS: Boolean(movie?.urlPeliHTTPS),
});

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

const normalizeGenres = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeActors = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).slice(0, 4);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return [];
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRegexSelector = (value) => ({ $regex: escapeRegExp(value), $options: "i" });

const buildMovieSelector = ({ genre, query }) => {
  const clauses = [
    { mostrar: { $in: [true, "true"] } },
    { extension: { $in: ["mkv", "mp4"] } },
  ];
  const normalizedQuery = String(query || "").trim();

  if (genre && genre !== ALL_GENRES) {
    clauses.push({ clasificacion: buildRegexSelector(genre) });
  }

  if (normalizedQuery) {
    const searchClauses = [
      { nombrePeli: buildRegexSelector(normalizedQuery) },
      { descripcion: buildRegexSelector(normalizedQuery) },
      { clasificacion: buildRegexSelector(normalizedQuery) },
      { actors: buildRegexSelector(normalizedQuery) },
      { idimdb: buildRegexSelector(normalizedQuery) },
    ];
    const numericYear = Number(normalizedQuery);

    if (/^\d{4}$/.test(normalizedQuery) && !Number.isNaN(numericYear)) {
      searchClauses.push({ year: numericYear }, { year: normalizedQuery });
    }

    clauses.push({ $or: searchClauses });
  }

  return { $and: clauses };
};

const LOCAL_MOVIE_CACHE_SELECTOR = {};

const useDebouncedValue = (value, delay = MOVIE_SEARCH_DEBOUNCE_MS) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
};

const useStableCatalogValue = (value, loading) => {
  const stableRef = React.useRef(value);

  React.useEffect(() => {
    if (!loading) {
      stableRef.current = value;
    }
  }, [loading, value]);

  return loading ? stableRef.current : value;
};

const useProgressiveCatalogValue = (value, loading) => {
  const stableRef = React.useRef(value);

  React.useEffect(() => {
    if (!loading || value.length >= stableRef.current.length) {
      stableRef.current = value;
    }
  }, [loading, value]);

  return loading && value.length < stableRef.current.length ? stableRef.current : value;
};

const CachedMovieImageBackground = ({ children, imageStyle, source, style }) => {
  const uri = source?.uri;
  const [imageState, setImageState] = React.useState(uri ? "loading" : "empty");

  React.useEffect(() => {
    setImageState(uri ? "loading" : "empty");
  }, [uri]);

  const showLoading = imageState === "loading";
  const showError = imageState === "error" || imageState === "empty";
  return (
    <View style={style}>
      <LinearGradient
        colors={["#111827", "#1f2937", "#020617"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, imageStyle]}
      />
      {uri ? (
        <ImageBackground
          source={{ uri }}
          resizeMode="cover"
          imageStyle={imageStyle}
          style={StyleSheet.absoluteFill}
          onLoad={(e) => {setImageState("loaded")}}
          onError={() => {console.log("Error loading image"); setImageState("error")}}
        />
      ) : null}
      {showLoading ? (
        <View style={styles.movieImageLoadingOverlay} pointerEvents="none">
          <View style={styles.movieImageLoadingBadge}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text variant="labelSmall" style={styles.movieImageLoadingText}>
              Cargando
            </Text>
          </View>
        </View>
      ) : null}
      {showError ? (
        <View style={styles.movieImageErrorOverlay} pointerEvents="none">
          <View style={styles.movieImageErrorBadge}>
            <IconButton
              icon="image-off-outline"
              size={22}
              iconColor="rgba(255,255,255,0.82)"
              style={styles.movieImageErrorIcon}
            />
            <Text variant="labelSmall" style={styles.movieImageErrorText}>
              Imagen no disponible en estos momentos
            </Text>
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
};

const normalizeCacheSignatureValue = (value) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (Array.isArray(value)) {
    return value.join("|");
  }

  return value ?? "";
};

const getMovieCacheSignature = (movie) =>
  [
    movie?._id,
    movie?.actors,
    movie?.clasificacion,
    movie?.createdAt,
    movie?.descripcion,
    movie?.extension,
    movie?.idimdb,
    movie?.mostrar,
    movie?.nombrePeli,
    movie?.subtitulo,
    movie?.tamano,
    movie?.urlBackground,
    movie?.urlBackgroundHTTPS,
    movie?.urlPadre,
    movie?.urlPeli,
    movie?.urlPeliHTTPS,
    movie?.urlTrailer,
    movie?.vistas,
    movie?.year,
  ]
    .map(normalizeCacheSignatureValue)
    .join("::");

const mergeMovieForCache = (currentMovie, nextMovie) => {
  if (!currentMovie) {
    return nextMovie;
  }

  return { ...currentMovie, ...nextMovie };
};

const sortCachedMovies = (movies) =>
  [...movies].sort((a, b) => {
    const viewsDiff = getMovieViews(b) - getMovieViews(a);
    if (viewsDiff) {
      return viewsDiff;
    }

    return getMovieTitle(a).localeCompare(getMovieTitle(b));
  });

const isVisibleMovie = (movie) => movie?.mostrar === true || movie?.mostrar === "true";
const getMovieSourceExtension = (movie) => {
  const explicitExtension = String(movie?.extension || "").trim().toLowerCase();

  if (explicitExtension) {
    return explicitExtension.replace(/^\./, "");
  }

  const streamUrl = movie?.urlPeliHTTPS || movie?.urlPeli || "";
  const match = String(streamUrl).toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/);
  return match?.[1] || "";
};
const isPlayableExtension = (movie) => ["mkv", "mp4"].includes(getMovieSourceExtension(movie));

const getMovieTitle = (movie) => movie?.nombrePeli || "Pelicula sin titulo";
const getMovieYear = (movie) => (movie?.year ? String(movie.year) : "Sin ano");
const getMovieViews = (movie) => Number(movie?.vistas || 0);

const getMovieImageUrl = (movieId, quality = "low") => {
  if (!movieId) {
    return null;
  }

  const mediaOrigin = getHttpOriginFromMeteorUrl(getMeteorUrl());
  return `${mediaOrigin}/imagenesPeliculas?calidad=${quality}&idPeli=${encodeURIComponent(movieId)}`;
};

const resolveMovieStreamUrl = (movie) => {
  const candidate = movie?.urlPeliHTTPS || movie?.urlPeli;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
};

const normalizeYearInput = (value) => String(value || "").replace(/[^0-9]/g, "").slice(0, 4);

const validateMovieForm = (form) => {
  if (!form.nombre.trim()) return "Escribe el nombre de la pelicula.";
  if (!/^\d{4}$/.test(form.year)) return "Escribe un año valido de 4 digitos.";
  if (!form.peli.trim()) return "Agrega la URL del video.";
  if (!form.poster.trim()) return "Agrega la URL del poster o background.";
  if (form.tamano && Number.isNaN(Number(form.tamano))) return "El tamaño debe ser numerico.";
  return "";
};

const validateMovieYearForm = (form) => {
  if (!/^\d{4}$/.test(form.year)) return "Escribe el año a importar con 4 digitos.";
  return "";
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

const getMovieSummary = (movie) => {
  const summary = typeof movie?.descripcion === "string" ? movie.descripcion.trim() : "";
  if (summary && summary !== getMovieTitle(movie)) {
    return summary;
  }

  return "Catalogo audiovisual disponible para revision y reproduccion desde VidKar.";
};

const getPalette = (theme) => {
  const isDark = theme.dark;

  return {
    background: theme.colors.background,
    isDark,
    surface: theme.colors.surface,
    surfaceElevated: theme.colors.elevation?.level2 || theme.colors.surface,
    surfaceSoft: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.06)",
    surfaceStrong: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.1)",
    border: isDark ? "rgba(226, 232, 240, 0.14)" : "rgba(15, 23, 42, 0.12)",
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    subtle: isDark ? "rgba(203, 213, 225, 0.72)" : "rgba(71, 85, 105, 0.72)",
    accent: isDark ? "#f43f5e" : "#c1121f",
    accentSoft: isDark ? "rgba(244, 63, 94, 0.16)" : "rgba(193, 18, 31, 0.1)",
    accentBorder: isDark ? "rgba(244, 63, 94, 0.42)" : "rgba(193, 18, 31, 0.26)",
    accentText: isDark ? "#ffe4e8" : "#7f101b",
    dialogGlassOverlay: isDark ? "rgba(15, 23, 42, 0.68)" : "rgba(255, 255, 255, 0.72)",
    onAccent: "#ffffff",
    heroText: "#ffffff",
    heroMuted: "rgba(255, 255, 255, 0.84)",
    heroSubtle: "rgba(255, 255, 255, 0.68)",
  };
};

const HeroBackdrop = ({ movie, palette, children, contentTopInset = 0 }) => {
  const imageUrl = getMovieImageUrl(movie?._id, "mid");

  return (
    <CachedMovieImageBackground source={imageUrl ? { uri: imageUrl } : undefined} style={styles.hero} imageStyle={styles.heroImage} >
      <LinearGradient
        colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.62)", palette.background]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroContent, { paddingTop: contentTopInset }]}>{children}</View>
    </CachedMovieImageBackground>
  );
};

const MetaPill = ({ icon, label, palette, strong = false }) => (
  <View
    style={[
      styles.metaPill,
      {
        backgroundColor: strong ? palette.accentSoft : palette.surfaceSoft,
        borderColor: strong ? palette.accentBorder : palette.border,
      },
    ]}
  >
    {icon ? <IconButton icon={icon} size={14} iconColor={strong ? palette.accentText : palette.muted} style={styles.metaIcon} /> : null}
    <Text variant="labelMedium" style={[styles.metaPillText, { color: strong ? palette.accentText : palette.muted }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const MoviePosterCard = ({ movie, palette, onPress, compact }) => {
  const imageUrl = getMovieImageUrl(movie?._id, "mid");
  const genres = normalizeGenres(movie?.clasificacion);

  return (
    <Pressable onPress={() => onPress?.(movie)} style={({ pressed }) => [styles.posterPressable, pressed && styles.pressed]}>
      <Surface style={[styles.posterCard, compact && styles.posterCardCompact, { backgroundColor: palette.surfaceElevated }]} elevation={1}>
        <CachedMovieImageBackground source={imageUrl ? { uri: imageUrl } : undefined} style={styles.posterImage} imageStyle={styles.posterImageStyle}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.92)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.posterTopRow}>
            <View style={[styles.posterBadge, { backgroundColor: palette.accent }]}> 
              <Text variant="labelSmall" style={styles.posterBadgeText}>HD</Text>
            </View>
            {getMovieViews(movie) > 0 ? (
              <View style={styles.posterViews}>
                <IconButton icon="eye-outline" size={12} iconColor="#fff" style={styles.posterViewsIcon} />
                <Text variant="labelSmall" style={styles.posterViewsText}>{getMovieViews(movie).toFixed(0)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.posterFooter}>
            <Text variant="titleSmall" style={styles.posterTitle} numberOfLines={2}>
              {getMovieTitle(movie)}
            </Text>
            <Text variant="labelSmall" style={styles.posterSubtitle} numberOfLines={1}>
              {getMovieYear(movie)}{genres[0] ? `  |  ${genres[0]}` : ""}
            </Text>
          </View>
        </CachedMovieImageBackground>
      </Surface>
    </Pressable>
  );
};

const MovieRow = ({ title, movies, palette, onPress, compact }) => {
  if (!movies.length) {
    return null;
  }

  return (
    <View style={styles.rowSection}>
      <View style={styles.rowHeader}>
        <Text variant="titleLarge" style={[styles.rowTitle, { color: palette.text }]}>{title}</Text>
        <Text variant="labelMedium" style={[styles.rowCount, { color: palette.subtle }]}>{movies.length}</Text>
      </View>
      <FlatList
        horizontal
        alwaysBounceHorizontal={false}
        bounces={false}
        data={movies}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <MoviePosterCard movie={item} palette={palette} onPress={onPress} compact={compact} />}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
};

const EmptyState = ({ palette, loading, style }) => (
  <Surface style={[styles.emptyState, style, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
    {loading ? <ActivityIndicator color={palette.accent} /> : <IconButton icon="movie-off-outline" size={34} iconColor={palette.muted} />}
    <Text variant="titleMedium" style={[styles.emptyTitle, { color: palette.text }]}>
      {loading ? "Cargando catalogo" : "No hay peliculas para mostrar"}
    </Text>
    <Text variant="bodyMedium" style={[styles.emptyCopy, { color: palette.muted }]}> 
      {loading ? "Estamos preparando el catalogo disponible." : "Prueba cambiando el filtro o revisa que existan peliculas visibles en el backend."}
    </Text>
  </Surface>
);

const MovieFormField = ({ label, multiline, onChangeText, palette, style, value, ...props }) => (
  <View style={[styles.movieFormFieldShell, style, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
    <Text variant="labelMedium" style={[styles.movieFormLabel, { color: palette.subtle }]}>{label}</Text>
    <TextInput
      {...props}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholderTextColor={palette.subtle}
      style={[
        styles.movieFormInput,
        multiline && styles.movieFormInputMultiline,
        { color: palette.text },
      ]}
      value={value}
    />
  </View>
);

const MovieDialogSection = ({ children, label, palette }) => (
  <View style={[styles.movieDialogSection, { backgroundColor: palette.card, borderColor: palette.border }]}> 
    <Text variant="labelLarge" style={[styles.movieDialogSectionTitle, { color: palette.text }]}>
      {label}
    </Text>
    {children}
  </View>
);

const AddMovieDialog = ({ onClose, onCreated, open, palette }) => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [mode, setMode] = React.useState(MOVIE_DIALOG_MODE.MANUAL);
  const [form, setForm] = React.useState(INITIAL_MOVIE_FORM);
  const [yearForm, setYearForm] = React.useState(INITIAL_MOVIE_YEAR_FORM);
  const [feedback, setFeedback] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setMode(MOVIE_DIALOG_MODE.MANUAL);
      setForm(INITIAL_MOVIE_FORM);
      setYearForm(INITIAL_MOVIE_YEAR_FORM);
      setFeedback("");
      setSubmitting(false);
    }
  }, [open]);

  const updateFormField = React.useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback("");
  }, []);

  const handleSubmit = React.useCallback(() => {
    if (mode === MOVIE_DIALOG_MODE.YEAR) {
      const validation = validateMovieYearForm(yearForm);
      if (validation) {
        setFeedback(validation);
        return;
      }

      setSubmitting(true);
      Meteor.call("insertAsyncpelisbyyears", { year: Number(yearForm.year) }, (...args) => {
        const { error } = normalizeMeteorCallback(args);
        setSubmitting(false);

        if (error) {
          setFeedback(error.reason || error.message || "No se pudo iniciar la importacion por año.");
          return;
        }

        onCreated?.({
          movie: null,
          message: `Se inicio la carga de peliculas del año ${yearForm.year}. El servidor continuara el proceso en segundo plano.`,
        });
        onClose?.();
      });
      return;
    }

    const validation = validateMovieForm(form);
    if (validation) {
      setFeedback(validation);
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      year: Number(form.year),
      peli: form.peli.trim(),
      poster: form.poster.trim(),
      subtitle: form.subtitle.trim(),
      urlPadre: form.urlPadre.trim(),
      descripcion: form.descripcion.trim(),
      tamano: form.tamano ? Number(form.tamano) : "",
      mostrar: Boolean(form.mostrar),
    };

    setSubmitting(true);
    Meteor.call("insertAsyncPelis", payload, true, (...args) => {
      const { error, result } = normalizeMeteorCallback(args);
      setSubmitting(false);

      if (error) {
        setFeedback(error.reason || error.message || "No se pudo agregar la pelicula.");
        return;
      }

      onCreated?.({
        movie: result?.movie || null,
        message: result?.message || "Pelicula agregada al catalogo.",
      });
      onClose?.();
    });
  }, [form, mode, onClose, onCreated, yearForm]);

  const isCompactDialog = windowWidth < 420;
  const dialogMaxHeight = Math.max(360, Math.round(windowHeight * 0.82));
  const scrollMaxHeight = Math.max(180, dialogMaxHeight - 156);

  return (
    <Portal>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none" style={styles.movieDialogKeyboard}>
      <Dialog visible={open} onDismiss={submitting ? undefined : onClose} style={[styles.movieDialog, { maxHeight: dialogMaxHeight }]}> 
        {palette.isDark ? (
          <BlurView
            tint="dark"
            intensity={42}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            renderToHardwareTextureAndroid
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <BlurView
            tint="light"
            intensity={46}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            renderToHardwareTextureAndroid
            style={StyleSheet.absoluteFill}
          />
        )}
        <View pointerEvents="none" style={[styles.movieDialogGlassOverlay, { backgroundColor: palette.dialogGlassOverlay }]} />
        <View style={[styles.movieDialogHeader, { borderBottomColor: palette.border }]}> 
          <View style={styles.movieDialogHeaderText}>
            <Text variant="titleLarge" style={[styles.movieDialogTitle, { color: palette.text }]}>Agregar pelicula</Text>
            <Text variant="bodySmall" style={[styles.movieDialogSubtitle, { color: palette.muted }]}>Carga manual o importacion anual en segundo plano.</Text>
          </View>
          <IconButton icon="close" size={20} disabled={submitting} iconColor={palette.muted} onPress={onClose} style={styles.movieDialogCloseButton} />
        </View>
        <Dialog.ScrollArea style={[styles.movieDialogScrollArea, { maxHeight: scrollMaxHeight }]}> 
          <ScrollView contentContainerStyle={[styles.movieDialogBody, isCompactDialog && styles.movieDialogBodyCompact]} showsVerticalScrollIndicator>
            <View style={[styles.movieModePanel, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <Text variant="labelMedium" style={[styles.movieFormLabel, { color: palette.subtle }]}>Flujo de alta</Text>
              <View style={styles.movieModeRow}>
              <Chip disabled={submitting} mode={mode === MOVIE_DIALOG_MODE.MANUAL ? "flat" : "outlined"} selected={mode === MOVIE_DIALOG_MODE.MANUAL} onPress={() => setMode(MOVIE_DIALOG_MODE.MANUAL)} style={[styles.movieModeChip, mode === MOVIE_DIALOG_MODE.MANUAL && { backgroundColor: palette.accentSoft }]} textStyle={{ color: mode === MOVIE_DIALOG_MODE.MANUAL ? palette.accentText : palette.muted, fontWeight: "900" }}>Carga manual</Chip>
              <Chip disabled={submitting} mode={mode === MOVIE_DIALOG_MODE.YEAR ? "flat" : "outlined"} selected={mode === MOVIE_DIALOG_MODE.YEAR} onPress={() => setMode(MOVIE_DIALOG_MODE.YEAR)} style={[styles.movieModeChip, mode === MOVIE_DIALOG_MODE.YEAR && { backgroundColor: palette.accentSoft }]} textStyle={{ color: mode === MOVIE_DIALOG_MODE.YEAR ? palette.accentText : palette.muted, fontWeight: "900" }}>Importar por año</Chip>
              </View>
            </View>
            {mode === MOVIE_DIALOG_MODE.MANUAL ? (
              <View style={styles.movieFormStack}>
                <MovieDialogSection label="Datos principales" palette={palette}>
                <View style={[styles.movieFormRow, isCompactDialog && styles.movieFormRowCompact]}>
                  <MovieFormField label="Nombre" palette={palette} style={styles.movieFormFieldPrimary} value={form.nombre} onChangeText={(value) => updateFormField("nombre", value)} />
                  <MovieFormField label="Año" palette={palette} style={styles.movieFormFieldSmall} value={form.year} keyboardType="number-pad" maxLength={4} onChangeText={(value) => updateFormField("year", normalizeYearInput(value))} />
                </View>
                </MovieDialogSection>
                <MovieDialogSection label="Archivos y origen" palette={palette}>
                <MovieFormField label="URL del video" palette={palette} style={styles.movieFormFieldFull} value={form.peli} autoCapitalize="none" onChangeText={(value) => updateFormField("peli", value)} />
                <MovieFormField label="URL del poster o background" palette={palette} style={styles.movieFormFieldFull} value={form.poster} autoCapitalize="none" onChangeText={(value) => updateFormField("poster", value)} />
                <MovieFormField label="URL del subtitulo SRT" palette={palette} style={styles.movieFormFieldFull} value={form.subtitle} autoCapitalize="none" onChangeText={(value) => updateFormField("subtitle", value)} />
                <MovieFormField label="URL padre / carpeta origen" palette={palette} style={styles.movieFormFieldFull} value={form.urlPadre} autoCapitalize="none" onChangeText={(value) => updateFormField("urlPadre", value)} />
                </MovieDialogSection>
                <MovieDialogSection label="Presentacion" palette={palette}>
                <MovieFormField label="Descripcion visible" palette={palette} style={styles.movieFormFieldFull} value={form.descripcion} multiline onChangeText={(value) => updateFormField("descripcion", value)} />
                <View style={[styles.movieFormRow, isCompactDialog && styles.movieFormRowCompact]}>
                  <MovieFormField label="Tamaño" palette={palette} style={styles.movieFormFieldSmall} value={form.tamano} keyboardType="numeric" onChangeText={(value) => updateFormField("tamano", value.replace(/[^0-9.]/g, ""))} />
                  <View style={[styles.movieVisibilityBox, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                    <Text variant="labelMedium" style={[styles.movieFormLabel, { color: palette.subtle }]}>Visibilidad</Text>
                    <Button mode={form.mostrar ? "contained" : "outlined"} compact buttonColor={form.mostrar ? palette.accent : undefined} textColor={form.mostrar ? palette.onAccent : palette.muted} onPress={() => updateFormField("mostrar", !form.mostrar)} disabled={submitting}>{form.mostrar ? "Mostrar" : "Oculta"}</Button>
                  </View>
                </View>
                </MovieDialogSection>
              </View>
            ) : (
              <View style={[styles.movieYearPanel, { backgroundColor: palette.card, borderColor: palette.border }]}> 
                <Text variant="titleMedium" style={[styles.movieYearTitle, { color: palette.text }]}>Importacion anual</Text>
                <Text variant="bodyMedium" style={[styles.movieDialogCopy, { color: palette.muted }]}>Indica el año de la carpeta anual. La llamada vuelve rapido y el servidor sigue importando en segundo plano.</Text>
                <MovieFormField label="Año a importar" palette={palette} value={yearForm.year} keyboardType="number-pad" maxLength={4} onChangeText={(value) => { setYearForm({ year: normalizeYearInput(value) }); setFeedback(""); }} />
              </View>
            )}
            {feedback ? (
              <Surface style={[styles.movieFeedback, { backgroundColor: palette.accentSoft, borderColor: palette.accentBorder }]} elevation={0}>
                <Text variant="bodySmall" style={{ color: palette.accentText }}>{feedback}</Text>
              </Surface>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={[styles.movieDialogActions, isCompactDialog && styles.movieDialogActionsCompact, { backgroundColor: "transparent", borderTopColor: palette.border }]}> 
          <Button style={isCompactDialog && styles.movieDialogActionButton} disabled={submitting} onPress={onClose} textColor={palette.muted}>Cancelar</Button>
          <Button style={isCompactDialog && styles.movieDialogActionButton} mode="contained" icon={submitting ? undefined : "plus"} loading={submitting} disabled={submitting} buttonColor={palette.accent} textColor={palette.onAccent} onPress={handleSubmit}>{submitting ? (mode === MOVIE_DIALOG_MODE.YEAR ? "Iniciando" : "Procesando") : mode === MOVIE_DIALOG_MODE.YEAR ? "Importar año" : "Agregar"}</Button>
        </Dialog.Actions>
      </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  );
};

const HeroMovieFilters = ({
  genreOptions,
  loadingCatalog,
  palette,
  searchQuery,
  selectedGenre,
  setSearchQuery,
  setSelectedGenre,
}) => (
  <View style={styles.heroSearchSurface}>
    <View style={styles.heroSearchInputRow}>
      <IconButton icon="magnify" iconColor="rgba(255,255,255,0.78)" size={20} style={styles.searchIcon} />
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Buscar pelicula, genero, ano o actor"
        placeholderTextColor="rgba(255,255,255,0.58)"
        cursorColor={palette.accent}
        selectionColor="rgba(244, 63, 94, 0.32)"
        style={styles.heroSearchInput}
      />
      {searchQuery ? (
        <IconButton icon="close" iconColor="rgba(255,255,255,0.78)" size={18} onPress={() => setSearchQuery("")} />
      ) : null}
    </View>
    {loadingCatalog ? (
      <View style={styles.heroSearchLoadingRow}>
        <View style={styles.heroSearchLoadingPill}>
          <NativeActivityIndicator size="small" color="#ffffff" />
          <Text variant="labelSmall" style={styles.heroSearchLoadingText}>Actualizando catalogo</Text>
        </View>
      </View>
    ) : null}
    <FlatList
      horizontal
      alwaysBounceHorizontal={false}
      bounces={false}
      data={genreOptions}
      keyExtractor={(item) => item}
      overScrollMode="never"
      renderItem={({ item }) => {
        const selected = selectedGenre === item;
        return (
          <Chip
            compact
            selected={selected}
            showSelectedCheck={false}
            icon={selected ? "movie-open" : undefined}
            selectedColor={selected ? palette.onAccent : "#ffffff"}
            style={[
              styles.heroGenreChip,
              {
                backgroundColor: selected ? palette.accent : "rgba(255,255,255,0.28)",
                borderColor: selected ? palette.accent : "rgba(255,255,255,0.44)",
              },
            ]}
            textStyle={[styles.heroGenreChipText, { color: selected ? palette.onAccent : "#ffffff" }]}
            onPress={() => setSelectedGenre(item)}
          >
            {item}
          </Chip>
        );
      }}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.heroGenreList}
    />
  </View>
);

const MovieDetailBottomDrawer = ({ visible, movie, detail, loading, palette, onDismiss, onPlay, onTrailer }) => {
  const resolvedMovie = detail || movie;
  const genres = normalizeGenres(resolvedMovie?.clasificacion);
  const actors = normalizeActors(resolvedMovie?.actors);
  const streamUrl = resolveMovieStreamUrl(resolvedMovie);
  const imageUrl = getMovieImageUrl(resolvedMovie?._id, "mid");

  if (!visible && !resolvedMovie) {
    return null;
  }

  return (
    <ModernBottomDrawer
      visible={visible}
      onDismiss={onDismiss}
      palette={{
        surface: palette.surfaceElevated || palette.surface,
        border: palette.border,
        muted: palette.muted,
      }}
      maxHeightFraction={0.9}
      header={
        <View style={styles.drawerModernHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={styles.drawerEyebrow}>VIDKAR CINEMA</Text>
            <Text variant="titleMedium" style={[styles.drawerHeaderTitle, { color: palette.text }]} numberOfLines={1}>
              {getMovieTitle(resolvedMovie)}
            </Text>
          </View>
          <IconButton icon="close" size={20} iconColor={palette.muted} onPress={onDismiss} style={{ margin: 0 }} />
        </View>
      }
    >
      <CachedMovieImageBackground source={imageUrl ? { uri: imageUrl } : undefined} style={styles.drawerHero} imageStyle={styles.drawerHeroImage}>
        <LinearGradient colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.88)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.drawerHeroContent}>
          <Text variant="headlineSmall" style={styles.drawerTitle} numberOfLines={3}>{getMovieTitle(resolvedMovie)}</Text>
          <View style={styles.metaRow}>
            <MetaPill icon="calendar-blank-outline" label={getMovieYear(resolvedMovie)} palette={palette} />
            <MetaPill icon="eye-outline" label={`${getMovieViews(resolvedMovie).toFixed(0)} vistas`} palette={palette} />
            {resolvedMovie?.extension ? <MetaPill label={String(resolvedMovie.extension).toUpperCase()} palette={palette} strong /> : null}
          </View>
        </View>
      </CachedMovieImageBackground>

      {loading ? (
        <View style={styles.detailLoadingRow}>
          <NativeActivityIndicator color={palette.accent} />
          <Text variant="bodyMedium" style={{ color: palette.muted }}>Cargando detalles...</Text>
        </View>
      ) : null}

      <View style={styles.drawerBody}>
        <View style={styles.dialogActions}>
          <Button mode="contained" icon="play" buttonColor={palette.accent} textColor={palette.onAccent} style={styles.dialogActionButton} disabled={!streamUrl} onPress={() => onPlay?.(resolvedMovie)}>
            Reproducir
          </Button>
          <Button mode="outlined" icon="youtube" textColor={palette.text} style={[styles.dialogActionButton, { borderColor: palette.border }]} disabled={!resolvedMovie?.urlTrailer} onPress={() => onTrailer?.(resolvedMovie)}>
            Trailer
          </Button>
        </View>

        <Text variant="bodyLarge" style={[styles.description, { color: palette.muted }]}>
          {getMovieSummary(resolvedMovie)}
        </Text>

        {genres.length ? (
          <View style={styles.genreWrap}>
            {genres.map((genre) => (
              <Chip key={genre} compact style={[styles.detailGenreChip, { backgroundColor: palette.surfaceStrong }]} textStyle={{ color: palette.text }}>
                {genre}
              </Chip>
            ))}
          </View>
        ) : null}

        {actors.length ? (
          <Surface style={[styles.detailBlock, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]} elevation={0}>
            <Text variant="labelLarge" style={[styles.detailBlockLabel, { color: palette.subtle }]}>Reparto destacado</Text>
            <Text variant="bodyMedium" style={[styles.detailBlockCopy, { color: palette.text }]}>{actors.join("  |  ")}</Text>
          </Surface>
        ) : null}

        <Surface style={[styles.detailBlock, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]} elevation={0}>
          <Text variant="labelLarge" style={[styles.detailBlockLabel, { color: palette.subtle }]}>Informacion de reproduccion</Text>
          <Text variant="bodyMedium" style={[styles.detailBlockCopy, { color: palette.text }]}>Formato: {resolvedMovie?.extension ? String(resolvedMovie.extension).toUpperCase() : "No registrado"}</Text>
          <Text variant="bodyMedium" style={[styles.detailBlockCopy, { color: palette.text }]}>Tamano: {resolvedMovie?.tamano || "No registrado"}</Text>
        </Surface>
      </View>
    </ModernBottomDrawer>
  );
};

const DownloadVideosHome = () => {
  const theme = useTheme();
  const router = useRouter();
  const palette = React.useMemo(() => getPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState(ALL_GENRES);
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const [movieDetail, setMovieDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [addMovieOpen, setAddMovieOpen] = React.useState(false);
  const [createdMovies, setCreatedMovies] = React.useState([]);
  const movieCatalogCacheRef = React.useRef(new Map());
  const movieCatalogSignaturesRef = React.useRef(new Map());
  const [movieCatalogCacheVersion, setMovieCatalogCacheVersion] = React.useState(0);
  const movieDetailsCacheRef = React.useRef(new Map());
  const activeDetailMovieIdRef = React.useRef(null);

  const movieSelector = React.useMemo(
    () => buildMovieSelector({ genre: selectedGenre, query: debouncedSearchQuery }),
    [debouncedSearchQuery, selectedGenre],
  );
  const isSearchingCatalog = Boolean(debouncedSearchQuery.trim()) || selectedGenre !== ALL_GENRES;
  const movieLimit = isSearchingCatalog ? MOVIE_SEARCH_LIMIT : MOVIE_LIMIT;

  const { currentUser, loading, completeCatalogReady, movies } = Meteor.useTracker(() => {
    const user = Meteor.user();
    const filteredHandle = Meteor.subscribe("pelis", movieSelector, {
      sort: { vistas: -1, nombrePeli: 1 },
      limit: movieLimit,
    });
    const completeCatalogHandle = Meteor.subscribe("pelis", {}, {
      fields: MOVIE_FIELDS,
      sort: { vistas: -1, nombrePeli: 1 },
    });
    const ready = filteredHandle.ready();
    const localCatalogMovies = PelisCollection.find(LOCAL_MOVIE_CACHE_SELECTOR, {
      fields: MOVIE_FIELDS,
      sort: { vistas: -1, nombrePeli: 1 },
    }).fetch();

    if (MOVIE_SUBSCRIPTION_DEBUG && ready) {
      console.log("[PeliculasSubscription] snapshot", {
        ready: filteredHandle.ready(),
        completeCatalogReady: completeCatalogHandle.ready(),
        loading: !filteredHandle.ready(),
        searchQuery,
        debouncedSearchQuery,
        selectedGenre,
        movieLimit,
        selector: JSON.stringify(movieSelector),
        localCatalogTotal: localCatalogMovies.length,
        localCatalogMovies: localCatalogMovies.map(summarizeMovieForDebug),
      });
    }

    return {
      currentUser: user,
      loading: !filteredHandle.ready(),
      completeCatalogReady: completeCatalogHandle.ready(),
      movies: localCatalogMovies,
    };
  });

  const canAccessMovies = currentUser?.subscipcionPelis === true;
  const canAddMovies = currentUser?.username === "carlosmbinf";

  const syncMoviesToCatalogCache = React.useCallback((movieList) => {
    let changed = false;

    movieList.forEach((movie) => {
      if (!movie?._id) {
        return;
      }

      const currentMovie = movieCatalogCacheRef.current.get(movie._id);
      const mergedMovie = mergeMovieForCache(currentMovie, movie);
      const nextSignature = getMovieCacheSignature(mergedMovie);

      if (movieCatalogSignaturesRef.current.get(movie._id) !== nextSignature) {
        movieCatalogCacheRef.current.set(movie._id, mergedMovie);
        movieCatalogSignaturesRef.current.set(movie._id, nextSignature);
        changed = true;
      }
    });

    if (changed) {
      setMovieCatalogCacheVersion((version) => version + 1);
    }
  }, []);

  React.useEffect(() => {
    syncMoviesToCatalogCache([...createdMovies, ...movies]);
  }, [createdMovies, movies, syncMoviesToCatalogCache]);

  const catalogMovies = React.useMemo(() => {
    const cachedMoviesById = new Map(movieCatalogCacheVersion >= 0 ? movieCatalogCacheRef.current : []);

    [...createdMovies, ...movies].forEach((movie) => {
      if (!movie?._id) {
        return;
      }

      cachedMoviesById.set(movie._id, mergeMovieForCache(cachedMoviesById.get(movie._id), movie));
    });

    return sortCachedMovies(Array.from(cachedMoviesById.values()));
  }, [createdMovies, movieCatalogCacheVersion, movies]);

  const visibleMovies = React.useMemo(
    () => catalogMovies.filter((movie) => isVisibleMovie(movie) && isPlayableExtension(movie)),
    [catalogMovies],
  );

  const genreOptions = React.useMemo(() => {
    const genres = new Map();

    visibleMovies.forEach((movie) => {
      normalizeGenres(movie.clasificacion).forEach((genre) => {
        genres.set(genre, (genres.get(genre) || 0) + 1);
      });
    });

    return [ALL_GENRES, ...Array.from(genres.entries()).sort((a, b) => b[1] - a[1]).map(([genre]) => genre).slice(0, 12)];
  }, [visibleMovies]);
  const displayGenreOptions = useStableCatalogValue(genreOptions, loading);
  const isSearchDebouncePending = searchQuery.trim() !== debouncedSearchQuery.trim();

  const filteredMovies = React.useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();

    return visibleMovies.filter((movie) => {
      const genres = normalizeGenres(movie.clasificacion);
      const matchesGenre = selectedGenre === ALL_GENRES || genres.includes(selectedGenre);
      const searchableText = [movie.nombrePeli, movie.descripcion, movie.year, genres.join(" "), normalizeActors(movie.actors).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesGenre && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [debouncedSearchQuery, selectedGenre, visibleMovies]);
  const displayMovies = useProgressiveCatalogValue(filteredMovies, loading);

  React.useEffect(() => {
    if (!completeCatalogReady) {
      return;
    }

    const spotlightMovies = visibleMovies.map((movie) => ({
      ...movie,
      thumbnailURL: getMovieImageUrl(movie?._id, "mid"),
    }));
    syncMovieSpotlightIndex(spotlightMovies).catch((error) => {
      console.warn("[Spotlight] No se pudo sincronizar películas:", error);
    });
  }, [completeCatalogReady, visibleMovies]);

  React.useEffect(() => {
    if (!MOVIE_SUBSCRIPTION_DEBUG) {
      return;
    }

    console.log("[PeliculasSubscription] render-pipeline", {
      loading,
      searchQuery,
      debouncedSearchQuery,
      selectedGenre,
      localCatalogTotal: movies.length,
      cacheTotal: catalogMovies.length,
      visibleTotal: visibleMovies.length,
      filteredTotal: filteredMovies.length,
      displayTotal: displayMovies.length,
      localCatalogMovies: movies.map(i => i.nombrePeli),
      filteredMovies: filteredMovies.map(i => i.nombrePeli),
      displayMovies: displayMovies.map(i => i.nombrePeli),
    });
  }, [catalogMovies, debouncedSearchQuery, displayMovies, filteredMovies, loading, movies, searchQuery, selectedGenre, visibleMovies]);

  const featuredMovie = displayMovies[0] || filteredMovies[0] || visibleMovies[0];
  const trendingMovies = React.useMemo(() => [...displayMovies].sort((a, b) => getMovieViews(b) - getMovieViews(a)).slice(0, 18), [displayMovies]);
  const recentMovies = React.useMemo(
    () =>
      [...displayMovies]
        .sort((a, b) => {
          const createdDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          return createdDiff || Number(b.year || 0) - Number(a.year || 0);
        })
        .slice(0, 18),
    [displayMovies],
  );

  const genreRows = React.useMemo(() => {
    if (selectedGenre !== ALL_GENRES || searchQuery.trim()) {
      return [];
    }

    return displayGenreOptions
      .filter((genre) => genre !== ALL_GENRES)
      .slice(0, 5)
      .map((genre) => ({
        title: genre,
        data: displayMovies.filter((movie) => normalizeGenres(movie.clasificacion).includes(genre)).slice(0, 18),
      }))
      .filter((row) => row.data.length > 0);
  }, [displayGenreOptions, displayMovies, searchQuery, selectedGenre]);

  const openMovieDetail = React.useCallback((movie) => {
    setSelectedMovie(movie);
    activeDetailMovieIdRef.current = movie._id;
    const cachedMovieDetail = movieDetailsCacheRef.current.get(movie._id);

    if (cachedMovieDetail) {
      setMovieDetail(cachedMovieDetail);
      setDetailLoading(false);
      return;
    }

    setMovieDetail(movie);
    setDetailLoading(false);
  }, []);

  React.useEffect(() => {
    if (!selectedMovie?._id) {
      return undefined;
    }

    const activeMovieId = selectedMovie._id;
    const cachedMovieDetail = movieDetailsCacheRef.current.get(activeMovieId);

    if (cachedMovieDetail) {
      setMovieDetail(cachedMovieDetail);
      setDetailLoading(false);
      return undefined;
    }

    let cancelled = false;
    setDetailLoading(true);

    const requestId = requestAnimationFrame(() => {
      Meteor.call("getPelicula", activeMovieId, (...args) => {
        if (cancelled || activeDetailMovieIdRef.current !== activeMovieId) {
          return;
        }

        const { error, result } = normalizeMeteorCallback(args);
        setDetailLoading(false);

        if (error) {
          Alert.alert("No se pudo cargar", error.reason || error.message || "No fue posible obtener los detalles de la pelicula.");
          return;
        }

        const resolvedResult = result || selectedMovie;
        movieDetailsCacheRef.current.set(activeMovieId, resolvedResult);
        setMovieDetail(resolvedResult);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(requestId);
    };
  }, [selectedMovie]);

  const closeMovieDetail = React.useCallback(() => {
    activeDetailMovieIdRef.current = null;
    setSelectedMovie(null);
    setMovieDetail(null);
    setDetailLoading(false);
  }, []);

  const openStream = React.useCallback((movie) => {
    const streamUrl = resolveMovieStreamUrl(movie);

    if (!streamUrl) {
      Alert.alert("Sin enlace", "Esta pelicula todavia no tiene una URL de reproduccion disponible.");
      return;
    }

    setSelectedMovie(null);
    setMovieDetail(null);
    router.push({
      pathname: "/(normal)/PeliculaPlayer",
      params: { id: movie._id },
    });
  }, [router]);

  const openTrailer = React.useCallback((movie) => {
    if (!movie?.urlTrailer) {
      return;
    }

    Linking.openURL(movie.urlTrailer).catch(() => {
      Alert.alert("No se pudo abrir", "El dispositivo no pudo abrir el trailer.");
    });
  }, []);

  const handleMovieCreated = React.useCallback(({ movie, message }) => {
    if (movie?._id) {
      setCreatedMovies((current) => [movie, ...current.filter((item) => item?._id !== movie._id)]);
      movieDetailsCacheRef.current.set(movie._id, movie);
    }

    Alert.alert("Peliculas", message || "Operacion iniciada correctamente.");
  }, []);

  if (!currentUser) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Peliculas"
          showBackButton
          backHref="/(normal)/Main"
          backgroundColor={DEFAULT_HEADER_COLOR}
        />
        <View style={[styles.loadingContent, { paddingTop: headerInset + 20 }]}> 
          <EmptyState palette={palette} loading style={styles.loadingEmptyState} />
        </View>
      </View>
    );
  }

  if (!canAccessMovies) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <AppHeader
          title="Peliculas"
          showBackButton
          backHref="/(normal)/Main"
          backgroundColor={DEFAULT_HEADER_COLOR}
        />
        <View style={[styles.restrictedContent, { paddingTop: headerInset + 20 }]}>
          <Surface style={[styles.restrictedCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
            <IconButton icon="lock-outline" size={42} iconColor={palette.accent} />
            <Text variant="headlineSmall" style={{ color: palette.text }}>Suscripcion requerida</Text>
            <Text variant="bodyMedium" style={[styles.restrictedCopy, { color: palette.muted }]}> 
              Este catalogo esta disponible cuando tu cuenta tiene activa la suscripcion de peliculas.
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}> 
      <AppHeader
        title="Peliculas"
        showBackButton
        backHref="/(normal)/Main"
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
        actions={canAddMovies ? <IconButton icon="plus" iconColor="#ffffff" onPress={() => setAddMovieOpen(true)} /> : null}
      />
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.scrollContent}
      >
        {featuredMovie ? (
          <HeroBackdrop movie={featuredMovie} palette={palette} contentTopInset={headerInset + 20}>
            <View style={styles.heroMetaBlock}>
              <Text variant="labelLarge" style={[styles.heroEyebrow, { color: "#ffb4ba" }]}>VIDKAR CINEMA</Text>
              <HeroMovieFilters
                genreOptions={displayGenreOptions}
                loadingCatalog={loading}
                palette={palette}
                searchQuery={searchQuery}
                selectedGenre={selectedGenre}
                setSearchQuery={setSearchQuery}
                setSelectedGenre={setSelectedGenre}
              />
              <Text variant="displaySmall" style={styles.heroTitle} numberOfLines={3}>{getMovieTitle(featuredMovie)}</Text>
              <View style={styles.metaRow}>
                <MetaPill icon="calendar-blank-outline" label={getMovieYear(featuredMovie)} palette={palette} />
                <MetaPill icon="eye-outline" label={`${getMovieViews(featuredMovie).toFixed(0)} vistas`} palette={palette} />
                {normalizeGenres(featuredMovie.clasificacion)[0] ? (
                  <MetaPill label={normalizeGenres(featuredMovie.clasificacion)[0]} palette={palette} strong />
                ) : null}
              </View>
              <Text variant="bodyLarge" style={styles.heroDescription} numberOfLines={3}>
                {getMovieSummary(featuredMovie)}
              </Text>
              <View style={styles.heroActions}>
                <Button mode="contained" icon="play" buttonColor={palette.accent} textColor={palette.onAccent} onPress={() => openMovieDetail(featuredMovie)}>
                  Ver ahora
                </Button>
                <Button mode="outlined" icon="information-outline" textColor={palette.heroText} style={{ borderColor: "rgba(255, 255, 255, 0.42)" }} onPress={() => openMovieDetail(featuredMovie)}>
                  Detalles
                </Button>
              </View>
            </View>
          </HeroBackdrop>
        ) : (
          <EmptyState
            palette={palette}
            loading={loading}
            style={[styles.catalogTopEmptyState, { marginTop: headerInset + 20 }]}
          />
        )}

        <View style={styles.contentArea}>
          {!displayMovies.length && !loading && !isSearchDebouncePending ? (
            <EmptyState palette={palette} loading={false} />
          ) : null}

          <MovieRow title={selectedGenre === ALL_GENRES ? "Populares ahora" : selectedGenre} movies={trendingMovies} palette={palette} onPress={openMovieDetail} compact={compact} />
          <MovieRow title="Agregadas recientemente" movies={recentMovies} palette={palette} onPress={openMovieDetail} compact={compact} />
          {genreRows.map((row) => (
            <MovieRow key={row.title} title={row.title} movies={row.data} palette={palette} onPress={openMovieDetail} compact={compact} />
          ))}
        </View>
      </ScrollView>

      <MovieDetailBottomDrawer
        visible={Boolean(selectedMovie)}
        movie={selectedMovie}
        detail={movieDetail}
        loading={detailLoading}
        palette={palette}
        onDismiss={closeMovieDetail}
        onPlay={openStream}
        onTrailer={openTrailer}
      />
      <AddMovieDialog
        open={addMovieOpen}
        palette={palette}
        onClose={() => setAddMovieOpen(false)}
        onCreated={handleMovieCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 118,
  },
  hero: {
    minHeight: 440,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroImage: {
    opacity: 0.98,
  },
  movieImageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  movieImageLoadingBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  movieImageLoadingText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "900",
  },
  movieImageErrorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.56)",
  },
  movieImageErrorBadge: {
    maxWidth: "82%",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  movieImageErrorIcon: {
    margin: 0,
  },
  movieImageErrorText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "900",
    textAlign: "center",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroMetaBlock: {
    maxWidth: 620,
    gap: 12,
  },
  heroEyebrow: {
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroSearchSurface: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    backgroundColor: "rgba(2,6,23,0.72)",
    overflow: "hidden",
  },
  heroSearchInputRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  heroSearchInput: {
    flex: 1,
    minHeight: 42,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 0,
  },
  heroSearchLoadingRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: -2,
  },
  heroSearchLoadingPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  heroSearchLoadingText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "800",
    letterSpacing: 0,
  },
  heroGenreList: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  heroGenreChip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  heroGenreChipText: {
    fontSize: 15,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "900",
    lineHeight: 44,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 23,
    maxWidth: 540,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaIcon: {
    width: 16,
    height: 16,
    margin: 0,
  },
  metaPillText: {
    fontWeight: "800",
  },
  contentArea: {
    gap: 24,
    paddingTop: 8,
  },
  searchIcon: {
    margin: 0,
  },
  rowSection: {
    gap: 12,
  },
  rowHeader: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    color: "#fff",
    fontWeight: "900",
  },
  rowCount: {
    fontWeight: "800",
  },
  horizontalList: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  posterPressable: {
    width: 158,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  posterCard: {
    height: 238,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#181818",
  },
  posterCardCompact: {
    height: 222,
  },
  posterImage: {
    flex: 1,
  },
  posterImageStyle: {
    borderRadius: 8,
  },
  posterTopRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  posterBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  posterBadgeText: {
    color: "#fff",
    fontWeight: "900",
  },
  posterViews: {
    minHeight: 24,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  posterViewsIcon: {
    width: 22,
    height: 22,
    margin: 0,
  },
  posterViewsText: {
    color: "#fff",
    fontWeight: "800",
  },
  posterFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    gap: 4,
    zIndex: 2,
  },
  posterTitle: {
    color: "#fff",
    fontWeight: "900",
    lineHeight: 18,
  },
  posterSubtitle: {
    color: "rgba(255,255,255,0.66)",
    fontWeight: "700",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
  },
  loadingEmptyState: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  catalogTopEmptyState: {
    marginBottom: 18,
  },
  emptyTitle: {
    fontWeight: "900",
    textAlign: "center",
  },
  emptyCopy: {
    textAlign: "center",
    lineHeight: 20,
  },
  movieDialog: {
    borderRadius: 18,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  movieDialogKeyboard: {
    flex: 1,
    justifyContent: "center",
  },
  movieDialogGlassOverlay: {
    ...StyleSheet.absoluteFill,
  },
  movieDialogHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 72,
    paddingBottom: 12,
    paddingLeft: 18,
    paddingRight: 8,
    paddingTop: 14,
  },
  movieDialogHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  movieDialogTitle: {
    fontWeight: "900",
  },
  movieDialogSubtitle: {
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 2,
  },
  movieDialogCloseButton: {
    margin: 0,
  },
  movieDialogScrollArea: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  movieDialogBody: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 12,
  },
  movieDialogBodyCompact: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
  },
  movieDialogCopy: {
    lineHeight: 21,
  },
  movieModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  movieModePanel: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  movieModeChip: {
    borderRadius: 999,
  },
  movieFormStack: {
    gap: 10,
  },
  movieDialogSection: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  movieDialogSectionTitle: {
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  movieFormRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  movieFormRowCompact: {
    flexDirection: "column",
    gap: 10,
  },
  movieFormFieldShell: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  movieFormFieldFull: {
    flexBasis: "100%",
    width: "100%",
  },
  movieFormFieldPrimary: {
    flexGrow: 1.8,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 170,
  },
  movieFormFieldSmall: {
    flexGrow: 0.8,
    flexShrink: 0,
    flexBasis: 96,
    minWidth: 96,
  },
  movieFormLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  movieFormInput: {
    fontSize: 15,
    fontWeight: "700",
    minHeight: 28,
    padding: 0,
  },
  movieFormInputMultiline: {
    minHeight: 72,
    paddingTop: 6,
    textAlignVertical: "top",
  },
  movieVisibilityBox: {
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 128,
    justifyContent: "space-between",
    minHeight: 68,
    minWidth: 128,
    padding: 10,
  },
  movieYearPanel: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  movieYearTitle: {
    fontWeight: "900",
  },
  movieFeedback: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  movieDialogActions: {
    alignItems: "center",
    borderTopWidth: 1,
    justifyContent: "flex-end",
    marginTop: 0,
    minHeight: 76,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  movieDialogActionsCompact: {
    alignItems: "stretch",
    flexDirection: "column-reverse",
    gap: 8,
    paddingHorizontal: 18,
  },
  movieDialogActionButton: {
    marginHorizontal: 0,
  },
  restrictedContent: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-start",
  },
  restrictedCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  restrictedCopy: {
    textAlign: "center",
    lineHeight: 21,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.44)",
  },
  bottomDrawer: {
    position: "absolute",
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 18,
  },
  drawerHandleZone: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingHorizontal: 14,
    zIndex: 2,
  },
  drawerHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    opacity: 0.8,
  },
  drawerHandleTextRow: {
    width: "100%",
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerHint: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
  },
  drawerCloseButton: {
    position: "absolute",
    right: 0,
    margin: 0,
  },
  drawerScrollContent: {
    paddingBottom: 20,
  },
  drawerHero: {
    minHeight: 244,
    justifyContent: "flex-end",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 2,
    marginBottom: 8,
  },
  drawerModernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  drawerHeaderTitle: {
    fontWeight: "900",
  },
  drawerHeroImage: {
    opacity: 0.96,
  },
  drawerHeroContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  drawerEyebrow: {
    color: "#ffccd2",
    fontWeight: "900",
    letterSpacing: 0,
  },
  drawerTitle: {
    color: "#fff",
    fontWeight: "900",
    lineHeight: 32,
  },
  drawerBody: {
    padding: 18,
    gap: 16,
  },
  detailLoadingRow: {
    paddingHorizontal: 18,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10,
  },
  dialogActionButton: {
    flex: 1,
    borderRadius: 6,
  },
  genreWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailGenreChip: {
    borderRadius: 999,
  },
  description: {
    lineHeight: 23,
  },
  detailBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  detailBlockLabel: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailBlockCopy: {
    lineHeight: 21,
  },
});

export default DownloadVideosHome;
