import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Button, Chip, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader, { DEFAULT_HEADER_COLOR } from "../Header/AppHeader";
import {
  getSeasonChapters,
  getSeries,
  getSeriesSeasons,
} from "../../services/series/seriesPlayback.native";

function listOf(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,;\n|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const chapterImageOf = (chapter, fallback) => (
  chapter?.urlBackgroundHTTPS || chapter?.urlBackground || chapter?.poster || fallback || null
);

export default function SeriesDetail({ idSerie }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const heroHeight = Math.max(380, windowWidth * 0.95);
  const palette = {
    accent: theme.dark ? "#818cf8" : "#4f46e5",
    background: theme.dark ? "#090d16" : "#f8fafc",
    border: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
    muted: theme.dark ? "#b6c0d0" : "#64748b",
    surface: theme.dark ? "#0f172a" : "#ffffff",
    surfaceElevated: theme.dark ? "#1e293b" : "#f1f5f9",
    text: theme.dark ? "#f8fafc" : "#172033",
  };
  const [serie, setSerie] = React.useState(null);
  const [seasons, setSeasons] = React.useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = React.useState(null);
  const [chaptersBySeason, setChaptersBySeason] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [loadingChapters, setLoadingChapters] = React.useState(false);

  React.useEffect(() => {
    if (!idSerie) return;
    setLoading(true);
    Promise.all([getSeries(idSerie), getSeriesSeasons(idSerie)])
      .then(([serieRes, seasonsRes]) => {
        setSerie(serieRes);
        const seasonsList = Array.isArray(seasonsRes) ? seasonsRes : [];
        setSeasons(seasonsList);
        if (seasonsList.length > 0) {
          setSelectedSeasonId(seasonsList[0]._id);
        }
      })
      .catch((err) => {
        Alert.alert("Error", "No se pudo cargar la información de la serie.");
      })
      .finally(() => setLoading(false));
  }, [idSerie]);

  React.useEffect(() => {
    if (!selectedSeasonId) return;
    if (chaptersBySeason[selectedSeasonId]) return;

    setLoadingChapters(true);
    getSeasonChapters(selectedSeasonId)
      .then((res) => {
        setChaptersBySeason((prev) => ({
          ...prev,
          [selectedSeasonId]: Array.isArray(res) ? res : [],
        }));
      })
      .catch(() => {
        Alert.alert("Error", "No se pudieron cargar los capítulos.");
      })
      .finally(() => setLoadingChapters(false));
  }, [selectedSeasonId, chaptersBySeason]);

  const currentChapters = React.useMemo(
    () => (selectedSeasonId && chaptersBySeason[selectedSeasonId]) || [],
    [chaptersBySeason, selectedSeasonId]
  );
  const playFirstAvailable = React.useCallback(() => {
    if (currentChapters.length > 0) {
      router.push({
        pathname: "/(normal)/SeriesPlayer",
        params: { id: currentChapters[0]._id },
      });
    } else if (seasons.length > 0) {
      const firstSeason = seasons[0];
      if (chaptersBySeason[firstSeason._id]?.length > 0) {
        router.push({
          pathname: "/(normal)/SeriesPlayer",
          params: { id: chaptersBySeason[firstSeason._id][0]._id },
        });
      } else {
        getSeasonChapters(firstSeason._id).then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            router.push({
              pathname: "/(normal)/SeriesPlayer",
              params: { id: res[0]._id },
            });
          } else {
            Alert.alert("Sin capítulos", "No hay capítulos disponibles para reproducir.");
          }
        });
      }
    } else {
      Alert.alert("Sin contenido", "Esta serie aún no tiene temporadas cargadas.");
    }
  }, [currentChapters, seasons, chaptersBySeason, router]);

  const playChapter = React.useCallback(
    (chapter) => {
      if (!chapter?._id) return;
      router.push({
        pathname: "/(normal)/SeriesPlayer",
        params: { id: chapter._id },
      });
    },
    [router]
  );

  const openTrailer = React.useCallback(() => {
    const url = serie?.trailer || serie?.urlTrailer;
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert("Error", "No se pudo abrir el enlace del tráiler.")
      );
    } else {
      Alert.alert("Tráiler", "No hay tráiler disponible para esta serie.");
    }
  }, [serie]);

  const posterUri = serie?.poster || serie?.urlBackground || serie?.imagen;
  const genres = listOf(serie?.clasificacion);
  const actors = listOf(serie?.actors);
  const directors = listOf(serie?.directors);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={{ color: palette.muted, marginTop: 12 }}>Cargando serie...</Text>
      </View>
    );
  }

  if (!serie) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <IconButton icon="television-off" iconColor={palette.muted} size={48} />
        <Text variant="titleMedium" style={{ color: palette.text }}>
          Serie no encontrada
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 14 }}>
          Volver al catálogo
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <AppHeader
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
        showBackButton
        title={serie.nombre || "Detalles de la Serie"}
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        {/* HERO BANNER */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={posterUri ? { uri: posterUri } : undefined}
            style={[styles.heroBanner, { minHeight: heroHeight }]}
            imageStyle={styles.heroImageStyle}
          >
            <LinearGradient
              colors={["rgba(9,13,22,0.1)", "rgba(9,13,22,0.75)", palette.background]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>SERIE VIDKAR</Text>
              <Text style={styles.heroTitle}>{serie.nombre}</Text>

              {/* METADATA PILLS */}
              <View style={styles.metaRow}>
                {serie.anoLanzamiento || serie.year ? (
                  <Surface style={styles.metaPill} elevation={0}>
                    <Text style={styles.metaPillText}>
                      {serie.anoLanzamiento || serie.year}
                    </Text>
                  </Surface>
                ) : null}
                <Surface style={styles.metaPill} elevation={0}>
                  <Text style={styles.metaPillText}>
                    {seasons.length} {seasons.length === 1 ? "Temporada" : "Temporadas"}
                  </Text>
                </Surface>
                {genres.slice(0, 2).map((g) => (
                  <Surface key={g} style={styles.metaPill} elevation={0}>
                    <Text style={styles.metaPillText}>{g}</Text>
                  </Surface>
                ))}
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.heroActions}>
                <Button
                  mode="contained"
                  buttonColor={palette.accent}
                  textColor="#fff"
                  icon="play"
                  onPress={playFirstAvailable}
                  style={styles.primaryBtn}
                  contentStyle={styles.btnContent}
                >
                  Reproducir
                </Button>
                {serie.trailer || serie.urlTrailer ? (
                  <Button
                    mode="outlined"
                    textColor="#fff"
                    icon="video"
                    onPress={openTrailer}
                    style={styles.secondaryBtn}
                    contentStyle={styles.btnContent}
                  >
                    Ver Tráiler
                  </Button>
                ) : null}
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* BODY CONTAINER */}
        <View style={styles.body}>
          {/* SYNOPSIS */}
          {serie.descripcion || serie.sinopsis ? (
            <Surface style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Sinopsis</Text>
              <Text style={[styles.synopsisText, { color: palette.muted }]}>
                {serie.descripcion || serie.sinopsis}
              </Text>
            </Surface>
          ) : null}

          {/* SEASONS & EPISODES */}
          <Surface style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Episodios</Text>
              <Text style={[styles.seasonCountBadge, { color: palette.muted }]}>
                {seasons.length} {seasons.length === 1 ? "temporada" : "temporadas"}
              </Text>
            </View>

            {/* SEASONS CHIPS SELECTOR */}
            {seasons.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsChipsContainer}
              >
                {seasons.map((season) => {
                  const isSelected = season._id === selectedSeasonId;
                  return (
                    <Chip
                      key={season._id}
                      selected={isSelected}
                      onPress={() => setSelectedSeasonId(season._id)}
                      showSelectedCheck={false}
                      style={[
                        styles.seasonChip,
                        { backgroundColor: isSelected ? palette.accent : palette.surfaceElevated, borderColor: palette.border },
                      ]}
                      textStyle={[
                        styles.seasonChipText,
                        { color: isSelected ? "#fff" : palette.muted, fontWeight: isSelected ? "900" : "700" },
                      ]}
                    >
                      {season.nombre || `Temporada ${season.numeroTemporada || 1}`}
                    </Chip>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* CHAPTERS LIST */}
            {loadingChapters ? (
              <View style={styles.chaptersLoading}>
                <ActivityIndicator color={palette.accent} />
                <Text style={{ color: palette.muted, marginTop: 8 }}>
                  Cargando capítulos...
                </Text>
              </View>
            ) : currentChapters.length === 0 ? (
              <View style={styles.emptyChapters}>
                <IconButton icon="filmstrip-off" iconColor={palette.muted} size={28} />
                <Text style={{ color: palette.muted }}>
                  No hay capítulos registrados para esta temporada.
                </Text>
              </View>
            ) : (
              <View style={styles.chaptersList}>
                {currentChapters.map((chapter, index) => (
                  <Pressable
                    key={chapter._id}
                    onPress={() => playChapter(chapter)}
                    style={({ pressed }) => [
                      styles.chapterCard,
                      { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                      pressed && styles.chapterCardPressed,
                    ]}
                  >
                    <View style={styles.chapterThumbWrapper}>
                      {chapterImageOf(chapter, posterUri) ? (
                        <Image
                          source={{ uri: chapterImageOf(chapter, posterUri) }}
                          style={styles.chapterThumb}
                        />
                      ) : (
                        <View style={[styles.chapterThumb, styles.thumbPlaceholder]}>
                          <IconButton icon="movie-play" iconColor="#fff" size={24} />
                        </View>
                      )}
                      <View style={styles.playOverlay}>
                        <IconButton
                          icon="play-circle"
                          iconColor="#fff"
                          size={28}
                          style={{ margin: 0 }}
                        />
                      </View>
                    </View>

                    <View style={styles.chapterInfo}>
                      <Text numberOfLines={1} style={[styles.chapterTitle, { color: palette.text }]}>
                        {chapter.numeroCapitulo || index + 1}. {chapter.nombre || `Capítulo ${index + 1}`}
                      </Text>
                      <Text numberOfLines={2} style={[styles.chapterDescription, { color: palette.muted }]}>
                        {chapter.descripcion ||
                          (chapter.subtitle
                            ? `Subtítulos: ${chapter.subtitle}`
                            : "Disponible para reproducción.")}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Surface>

          {/* TECHNICAL INFO & CAST */}
          <Surface style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Ficha Técnica</Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.muted }]}>Géneros:</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>{genres.join(", ") || "General"}</Text>
            </View>

            {directors.length > 0 ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: palette.muted }]}>Dirección:</Text>
                <Text style={[styles.infoValue, { color: palette.text }]}>{directors.join(", ")}</Text>
              </View>
            ) : null}

            {actors.length > 0 ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: palette.muted }]}>Reparto:</Text>
                <Text style={[styles.infoValue, { color: palette.text }]}>{actors.join(", ")}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.muted }]}>Año:</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>
                {serie.anoLanzamiento || serie.year || "No especificado"}
              </Text>
            </View>
          </Surface>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heroContainer: {
    overflow: "hidden",
  },
  heroBanner: {
    justifyContent: "flex-end",
  },
  heroImageStyle: {
    opacity: 0.92,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 100,
  },
  heroEyebrow: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  metaPillText: {
    color: "#f1f5f9",
    fontSize: 12,
    fontWeight: "800",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  primaryBtn: {
    borderRadius: 10,
    flex: 1,
    minWidth: 140,
  },
  secondaryBtn: {
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 10,
    flex: 1,
    minWidth: 140,
  },
  btnContent: {
    height: 44,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  seasonCountBadge: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  synopsisText: {
    color: "rgba(241, 245, 249, 0.82)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  seasonsChipsContainer: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 12,
  },
  seasonChip: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 10,
  },
  seasonChipText: {
    fontWeight: "700",
    fontSize: 13,
  },
  chaptersLoading: {
    alignItems: "center",
    padding: 24,
  },
  emptyChapters: {
    alignItems: "center",
    padding: 20,
    gap: 6,
  },
  chaptersList: {
    gap: 10,
  },
  chapterCard: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 12,
  },
  chapterCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  chapterThumbWrapper: {
    width: 90,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#020617",
  },
  chapterThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  chapterDescription: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    width: 75,
  },
  infoValue: {
    color: "#f8fafc",
    fontSize: 13,
    flex: 1,
  },
});
