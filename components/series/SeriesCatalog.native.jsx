import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, FlatList, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import CinemaBottomNav from "../cinema/CinemaBottomNav.native";
import { SeriesCollection } from "../collections/collections";
import { Meteor } from "../../services/meteor/client.native";
import { useCurrentSession } from "../../services/meteor/session";
import { getSeasonChapters, getSeries, getSeriesSeasons } from "../../services/series/seriesPlayback.native";

const ALL_GENRES = "Todos";
const isVisible = (item) => item?.mostrar === true || item?.mostrar === "true";
const listOf = (value) => Array.isArray(value) ? value.filter(Boolean).map(String).map((item) => item.trim()).filter(Boolean) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
const titleOf = (item) => item?.nombre || "Serie sin título";
const yearOf = (item) => item?.anoLanzamiento ? String(item.anoLanzamiento) : "Sin año";
const imageOf = (item) => item?.urlBackgroundHTTPS || item?.urlBackground || null;
const summaryOf = (item) => item?.descripcion && item.descripcion !== titleOf(item) ? item.descripcion : "Descubre temporadas y capítulos disponibles en VIDKAR Cinema.";
const numberOf = (item) => item?.capitulo || item?.numeroCapitulo || "";

const usePalette = (theme) => ({
  background: theme.colors.background,
  surface: theme.colors.surface,
  elevated: theme.colors.elevation?.level2 || theme.colors.surface,
  border: theme.dark ? "rgba(226,232,240,0.14)" : "rgba(15,23,42,0.12)",
  text: theme.colors.onSurface,
  muted: theme.colors.onSurfaceVariant,
  accent: theme.dark ? "#6366f1" : "#4f46e5",
  accentSoft: theme.dark ? "rgba(99,102,241,0.2)" : "rgba(79,70,229,0.12)",
});

const SeriesPoster = ({ item, onPress, compact, palette }) => (
  <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.posterPressable, compact && styles.posterPressableCompact, pressed && styles.pressed]}>
    <Surface elevation={1} style={[styles.posterCard, { backgroundColor: palette.elevated, borderColor: palette.border }]}>
      <ImageBackground source={imageOf(item) ? { uri: imageOf(item) } : undefined} style={styles.posterImage} imageStyle={styles.posterImageStyle}>
        <LinearGradient colors={["transparent", "rgba(2,6,23,0.9)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.posterBadge}><Text style={styles.posterBadgeText}>SERIE</Text></View>
        <View style={styles.posterFooter}><Text numberOfLines={2} style={styles.posterTitle}>{titleOf(item)}</Text><Text numberOfLines={1} style={styles.posterMeta}>{yearOf(item)}  ·  {listOf(item?.clasificacion)[0] || "Catálogo"}</Text></View>
      </ImageBackground>
    </Surface>
  </Pressable>
);

const SeriesRow = ({ items, onPress, palette, title }) => !items.length ? null : <View style={styles.row}><View style={styles.rowHeader}><Text variant="titleLarge" style={[styles.rowTitle, { color: palette.text }]}>{title}</Text><Text variant="labelMedium" style={{ color: palette.muted }}>{items.length}</Text></View><FlatList data={items} horizontal keyExtractor={(item) => item._id} renderItem={({ item }) => <SeriesPoster compact item={item} onPress={onPress} palette={palette} />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent} /></View>;

const Restricted = ({ palette, onBack }) => <View style={[styles.center, { backgroundColor: palette.background }]}><IconButton icon="lock-outline" iconColor={palette.accent} size={44} /><Text variant="headlineSmall" style={{ color: palette.text }}>Suscripción requerida</Text><Text style={[styles.centerCopy, { color: palette.muted }]}>Activa tu suscripción de películas para acceder a Series.</Text><Button mode="outlined" onPress={onBack}>Volver</Button></View>;

export default function SeriesCatalog() {
  const theme = useTheme();
  const palette = usePalette(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const { user: currentUser, userReady } = useCurrentSession();
  const [query, setQuery] = React.useState("");
  const [genre, setGenre] = React.useState(ALL_GENRES);
  const [selected, setSelected] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [seasons, setSeasons] = React.useState([]);
  const [chaptersBySeason, setChaptersBySeason] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [chaptersLoading, setChaptersLoading] = React.useState(null);
  const tracker = Meteor.useTracker(() => {
    const handle = Meteor.subscribe("series", {}, { sort: { nombre: 1 }, limit: 1000 });
    return { ready: handle.ready(), series: SeriesCollection.find({}, { sort: { nombre: 1 } }).fetch() };
  });
  React.useEffect(() => setLoading(!tracker.ready), [tracker.ready]);
  const availableSeries = React.useMemo(() => tracker.series.filter(isVisible), [tracker.series]);
  const genres = React.useMemo(() => [ALL_GENRES, ...Array.from(new Set(availableSeries.flatMap((item) => listOf(item.clasificacion)))).slice(0, 12)], [availableSeries]);
  const filtered = React.useMemo(() => availableSeries.filter((item) => { const text = [item.nombre, item.descripcion, item.anoLanzamiento, listOf(item.clasificacion).join(" "), listOf(item.actors).join(" ")].filter(Boolean).join(" ").toLowerCase(); return (genre === ALL_GENRES || listOf(item.clasificacion).includes(genre)) && (!query.trim() || text.includes(query.trim().toLowerCase())); }), [availableSeries, genre, query]);
  const featured = filtered[0] || availableSeries[0];
  const recent = React.useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 18), [filtered]);
  const popular = filtered.slice(0, 18);

  React.useEffect(() => {
    if (userReady && !currentUser) router.replace("/(auth)/login");
  }, [currentUser, router, userReady]);

  const openDetails = React.useCallback((item) => {
    setSelected(item); setDetail(item); setSeasons([]); setChaptersBySeason({}); setDetailLoading(true);
    getSeriesSeasons(item._id).then((result) => setSeasons(Array.isArray(result) ? result : [])).catch(() => Alert.alert("No se pudo cargar", "Intenta nuevamente más tarde.")).finally(() => setDetailLoading(false));
    getSeries(item._id).then((result) => result && setDetail(result)).catch(() => null);
  }, []);
  const loadChapters = React.useCallback((seasonId) => {
    if (!seasonId || chaptersBySeason[seasonId]) return;
    setChaptersLoading(seasonId);
    getSeasonChapters(seasonId).then((result) => setChaptersBySeason((current) => ({ ...current, [seasonId]: Array.isArray(result) ? result : [] }))).catch(() => Alert.alert("No se pudo cargar", "Los capítulos no están disponibles ahora.")).finally(() => setChaptersLoading(null));
  }, [chaptersBySeason]);
  const playChapter = React.useCallback((chapter) => { if (!chapter?._id) return; setSelected(null); router.push({ pathname: "/(normal)/SeriesPlayer", params: { id: chapter._id } }); }, [router]);
  const closeDetails = React.useCallback(() => { setSelected(null); setDetail(null); }, []);
  const logout = React.useCallback(() => { Meteor.logout(() => router.replace("/(auth)/login")); }, [router]);

  if (!userReady || !currentUser) return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.accent} size="large" /></View>;
  if (currentUser.subscipcionPelis !== true) return <Restricted onBack={() => router.replace("/(normal)/Main")} palette={palette} />;

  return <View style={[styles.screen, { backgroundColor: palette.background }]}>
    <AppHeader backgroundColor={DEFAULT_HEADER_COLOR} overlapContent showBackButton title="Series" backHref="/(normal)/Main" actions={<IconButton icon="logout" iconColor="#fff" onPress={logout} />} />
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 112 }]} showsVerticalScrollIndicator={false}>
      {featured ? <View style={styles.hero}><ImageBackground source={imageOf(featured) ? { uri: imageOf(featured) } : undefined} style={[styles.heroImage, { minHeight: Math.max(430, width * 0.94) }]} imageStyle={styles.heroImageStyle}><LinearGradient colors={["rgba(2,6,23,0.04)", "rgba(2,6,23,0.72)", palette.background]} locations={[0, 0.54, 1]} style={StyleSheet.absoluteFill} /><View style={[styles.heroContent, { paddingTop: headerInset + 18 }]}><Text style={styles.eyebrow}>VIDKAR CINEMA · SERIES</Text><View style={styles.searchBox}><IconButton icon="magnify" iconColor="#fff" style={{ margin: 0 }} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar serie, género o actor" placeholderTextColor="rgba(255,255,255,0.58)" style={styles.searchInput} /></View><FlatList data={genres} horizontal keyExtractor={(item) => item} renderItem={({ item }) => <Chip compact onPress={() => setGenre(item)} selected={genre === item} showSelectedCheck={false} style={[styles.genreChip, genre === item && { backgroundColor: palette.accent }]} textStyle={{ color: "#fff", fontWeight: "800" }}>{item}</Chip>} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreList} /><Text numberOfLines={3} style={styles.heroTitle}>{titleOf(featured)}</Text><Text style={styles.heroMeta}>{yearOf(featured)}  ·  {listOf(featured.clasificacion)[0] || "Serie"}</Text><Text numberOfLines={3} style={styles.heroCopy}>{summaryOf(featured)}</Text><View style={styles.heroActions}><Button mode="contained" buttonColor={palette.accent} textColor="#fff" icon="play" onPress={() => openDetails(featured)}>Explorar</Button><Button mode="outlined" textColor="#fff" onPress={() => openDetails(featured)}>Detalles</Button></View></View></ImageBackground></View> : null}
      {loading && !tracker.series.length ? <View style={styles.loading}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.muted }}>Cargando catálogo de series...</Text></View> : null}
      {!loading && !filtered.length ? <Surface style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}><IconButton icon="television-off" iconColor={palette.muted} size={36} /><Text style={{ color: palette.text }}>No hay series para mostrar</Text></Surface> : null}
      <SeriesRow items={popular} onPress={openDetails} palette={palette} title="Para descubrir" /><SeriesRow items={recent} onPress={openDetails} palette={palette} title="Agregadas recientemente" />
    </ScrollView>
    <Modal animationType="slide" onRequestClose={closeDetails} transparent visible={Boolean(selected)}><Pressable onPress={closeDetails} style={styles.modalBackdrop}><Pressable onPress={(event) => event.stopPropagation()} style={[styles.modalSheet, { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, 18) }]}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text variant="headlineSmall" style={{ color: palette.text, fontWeight: "900" }}>{titleOf(detail || selected)}</Text><Text style={{ color: palette.muted }}>{yearOf(detail || selected)}  ·  {listOf((detail || selected)?.clasificacion).join(" · ") || "Serie"}</Text></View><IconButton icon="close" iconColor={palette.muted} onPress={closeDetails} /></View><ScrollView showsVerticalScrollIndicator={false}><Text style={[styles.detailCopy, { color: palette.muted }]}>{summaryOf(detail || selected)}</Text>{detailLoading ? <View style={styles.loading}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.muted }}>Cargando temporadas...</Text></View> : seasons.map((season) => <View key={season._id} style={[styles.season, { borderColor: palette.border, backgroundColor: palette.accentSoft }]}><View style={styles.seasonHeader}><Text variant="titleMedium" style={{ color: palette.text, fontWeight: "900" }}>Temporada {season.numeroTemporada || 1}</Text><Button compact mode="outlined" onPress={() => loadChapters(season._id)}>{chaptersBySeason[season._id] ? "Lista" : "Capítulos"}</Button></View>{chaptersLoading === season._id ? <ActivityIndicator color={palette.accent} /> : null}{(chaptersBySeason[season._id] || []).map((chapter) => <Pressable key={chapter._id} onPress={() => playChapter(chapter)} style={({ pressed }) => [styles.chapter, { borderColor: palette.border }, pressed && styles.pressed]}><View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: palette.text, fontWeight: "800" }}>{numberOf(chapter) ? `E${String(numberOf(chapter)).padStart(2, "0")} · ` : ""}{chapter.nombre || "Capítulo sin título"}</Text><Text numberOfLines={1} style={{ color: palette.muted }}>{chapter.descripcion || "Disponible para reproducir"}</Text></View><IconButton icon="play-circle-outline" iconColor={palette.accent} /></Pressable>)}</View>)}</ScrollView></Pressable></Pressable></Modal>
    <CinemaBottomNav />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, scroll: { paddingBottom: 30 }, center: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center", padding: 24 }, centerCopy: { lineHeight: 22, maxWidth: 360, textAlign: "center" }, hero: { overflow: "hidden" }, heroImage: { justifyContent: "flex-end" }, heroImageStyle: { opacity: 0.96 }, heroContent: { flex: 1, justifyContent: "flex-end", paddingBottom: 28, paddingHorizontal: 18 }, eyebrow: { color: "#c7d2fe", fontSize: 12, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 }, searchBox: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.72)", borderColor: "rgba(255,255,255,0.32)", borderRadius: 12, borderWidth: 1, flexDirection: "row", maxWidth: 560, minHeight: 50 }, searchInput: { color: "#fff", flex: 1, fontSize: 15, fontWeight: "700", paddingHorizontal: 2 }, genreList: { gap: 8, paddingVertical: 10 }, genreChip: { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.32)", borderWidth: 1 }, heroTitle: { color: "#fff", fontSize: 38, fontWeight: "900", lineHeight: 43, maxWidth: 650 }, heroMeta: { color: "rgba(255,255,255,0.82)", fontSize: 16, fontWeight: "800", marginTop: 10 }, heroCopy: { color: "rgba(255,255,255,0.78)", fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 590 }, heroActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 }, row: { gap: 10, marginTop: 24 }, rowHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18 }, rowTitle: { fontWeight: "900" }, rowContent: { gap: 12, paddingHorizontal: 16, paddingBottom: 2 }, posterPressable: { width: 158 }, posterPressableCompact: { width: 148 }, posterCard: { borderRadius: 14, borderWidth: 1, height: 236, overflow: "hidden" }, posterImage: { flex: 1 }, posterImageStyle: { borderRadius: 14 }, posterBadge: { alignSelf: "flex-start", backgroundColor: "#6366f1", borderRadius: 5, margin: 10, paddingHorizontal: 8, paddingVertical: 4 }, posterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" }, posterFooter: { bottom: 0, left: 0, padding: 12, position: "absolute", right: 0 }, posterTitle: { color: "#fff", fontSize: 15, fontWeight: "900", lineHeight: 19 }, posterMeta: { color: "rgba(255,255,255,0.68)", fontSize: 11, fontWeight: "700", marginTop: 4 }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }, loading: { alignItems: "center", gap: 10, justifyContent: "center", padding: 28 }, empty: { alignItems: "center", borderRadius: 14, borderWidth: 1, gap: 8, margin: 18, padding: 24 }, modalBackdrop: { backgroundColor: "rgba(0,0,0,0.62)", flex: 1, justifyContent: "flex-end" }, modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingHorizontal: 18, paddingTop: 10 }, sheetHandle: { alignSelf: "center", backgroundColor: "rgba(148,163,184,0.54)", borderRadius: 999, height: 5, marginBottom: 12, width: 52 }, sheetHeader: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 10 }, detailCopy: { fontSize: 16, lineHeight: 24, marginBottom: 12 }, season: { borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 12 }, seasonHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, chapter: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 8, minHeight: 62, paddingVertical: 8 },
});
