import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Animated, Easing, FlatList, ImageBackground, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import { SeriesCollection } from "../collections/collections";
import { Meteor } from "../../services/meteor/client.native";
import { useCurrentSession } from "../../services/meteor/session.native";
import { getSeries, getSeriesSeasons } from "../../services/series/seriesPlayback.native";
import ModernBottomDrawer from "../cinema/ModernBottomDrawer.native";

const ALL_GENRES = "Todos";
const isVisible = (item) => item?.mostrar === true || item?.mostrar === "true";
const listOf = (value) => Array.isArray(value) ? value.filter(Boolean).map(String).map((item) => item.trim()).filter(Boolean) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
const titleOf = (item) => item?.nombre || "Serie sin título";
const yearOf = (item) => item?.anoLanzamiento ? String(item.anoLanzamiento) : "Sin año";
const imageOf = (item) => item?.urlBackgroundHTTPS || item?.urlBackground || null;
const summaryOf = (item) => item?.descripcion && item.descripcion !== titleOf(item) ? item.descripcion : "Descubre temporadas y capítulos disponibles en VIDKAR Cinema.";
const isSeriesAdministrator = (user) => user?.profile?.role === "admin" || String(user?.username || "").toLowerCase() === "carlosmbinf";
const initialManualForm = { nombre: "", year: "", temporada: "1", capitulo: "1", nombreCapitulo: "", url: "", poster: "", subtitle: "", extension: "mkv", mostrar: true };

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

const SeriesRow = ({ items, onPress, palette, title }) => !items.length ? null : <View style={styles.row}><View style={styles.rowHeader}><Text variant="titleLarge" style={[styles.rowTitle, { color: palette.text }]}>{title}</Text><Text variant="labelMedium" style={{ color: palette.muted }}>{items.length}</Text></View><FlatList data={items} horizontal keyExtractor={(item) => item._id} renderItem={({ item }) => <SeriesPoster compact item={item} onPress={onPress} palette={palette} />} showsHorizontalScrollIndicator={false} bounces={false} alwaysBounceHorizontal={false} overScrollMode="never" contentContainerStyle={styles.rowContent} /></View>;

const Restricted = ({ palette, onBack }) => <View style={[styles.center, { backgroundColor: palette.background }]}><IconButton icon="lock-outline" iconColor={palette.accent} size={44} /><Text variant="headlineSmall" style={{ color: palette.text }}>Suscripción requerida</Text><Text style={[styles.centerCopy, { color: palette.muted }]}>Activa tu suscripción de películas para acceder a Series.</Text><Button mode="outlined" onPress={onBack}>Volver</Button></View>;

export default function SeriesCatalog() {
  const theme = useTheme();
  const palette = usePalette(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerInset = useAppHeaderContentInset();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { connected, user: currentUser, userId: currentUserId, userReady } = useCurrentSession();
  const [query, setQuery] = React.useState("");
  const [genre, setGenre] = React.useState(ALL_GENRES);
  const [selected, setSelected] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [seasons, setSeasons] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [adminModal, setAdminModal] = React.useState(false);
  const [adminMode, setAdminMode] = React.useState("manual");
  const [manualForm, setManualForm] = React.useState(initialManualForm);
  const [urlForm, setUrlForm] = React.useState({ urlSerie: "", year: "", seriesName: "" });
  const [adminLoading, setAdminLoading] = React.useState(false);
  const adminBackdropOpacity = React.useRef(new Animated.Value(0)).current;
  const adminSheetTranslateY = React.useRef(new Animated.Value(42)).current;
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
    if (connected && userReady && !currentUserId && !currentUser) router.replace("/(auth)/Loguin");
  }, [connected, currentUser, currentUserId, router, userReady]);

  const openDetails = React.useCallback((item) => {
    setSelected(item);
    setDetail(item);
    setSeasons([]);
    setDetailLoading(true);
    getSeriesSeasons(item._id)
      .then((result) => setSeasons(Array.isArray(result) ? result : []))
      .catch(() => null)
      .finally(() => setDetailLoading(false));
    getSeries(item._id)
      .then((result) => result && setDetail(result))
      .catch(() => null);
  }, []);

  const goToDetail = React.useCallback((item) => {
    const target = item || detail || selected;
    if (!target?._id) return;
    setSelected(null);
    setDetail(null);
    router.push({
      pathname: "/(normal)/SeriesDetail",
      params: { id: target._id },
    });
  }, [detail, selected, router]);

  const closeDetails = React.useCallback(() => { setSelected(null); setDetail(null); }, []);
  const canManageSeries = isSeriesAdministrator(currentUser);
  React.useEffect(() => {
    if (!adminModal) return;
    adminBackdropOpacity.setValue(0);
    adminSheetTranslateY.setValue(42);
    Animated.parallel([
      Animated.timing(adminBackdropOpacity, { duration: 220, easing: Easing.linear, toValue: 1, useNativeDriver: true }),
      Animated.timing(adminSheetTranslateY, { duration: 220, easing: Easing.linear, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [adminBackdropOpacity, adminModal, adminSheetTranslateY]);
  const closeAdminModal = React.useCallback(() => {
    if (adminLoading) return;
    Animated.parallel([
      Animated.timing(adminBackdropOpacity, { duration: 220, easing: Easing.linear, toValue: 0, useNativeDriver: true }),
      Animated.timing(adminSheetTranslateY, { duration: 220, easing: Easing.linear, toValue: 42, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setAdminModal(false);
    });
  }, [adminBackdropOpacity, adminLoading, adminSheetTranslateY]);
  const updateManual = (field) => (value) => setManualForm((current) => ({ ...current, [field]: value }));
  const submitAdmin = React.useCallback(() => {
    if (adminMode === "url") {
      if (!urlForm.urlSerie.trim() || !/^\d{4}$/.test(urlForm.year) || !urlForm.seriesName.trim()) return Alert.alert("Datos incompletos", "Completa URL, año y nombre de la serie.");
      setAdminLoading(true);
      return Meteor.call("insertAsyncSeriesByTemporadasURL", { urlSerie: urlForm.urlSerie.trim(), year: Number(urlForm.year), seriesName: urlForm.seriesName.trim() }, (error) => { setAdminLoading(false); if (error) return Alert.alert("No se pudo importar", error.reason || error.message); closeAdminModal(); Alert.alert("Importación iniciada", `Se procesará ${urlForm.seriesName.trim()}.`); });
    }
    if (!manualForm.nombre.trim() || !manualForm.url.trim() || !manualForm.poster.trim() || !/^\d{4}$/.test(manualForm.year)) return Alert.alert("Datos incompletos", "Completa nombre, año, video y póster.");
    setAdminLoading(true);
    Meteor.call("insertAsyncSeries", { ...manualForm, nombre: manualForm.nombre.trim(), year: Number(manualForm.year), temporada: Number(manualForm.temporada), capitulo: Number(manualForm.capitulo), nombreCapitulo: manualForm.nombreCapitulo.trim() || `${manualForm.nombre.trim()} S${String(manualForm.temporada).padStart(2, "0")}E${String(manualForm.capitulo).padStart(2, "0")}`, url: manualForm.url.trim(), poster: manualForm.poster.trim(), subtitle: manualForm.subtitle.trim(), extension: manualForm.extension.trim().toLowerCase(), mostrar: Boolean(manualForm.mostrar) }, (error) => { setAdminLoading(false); if (error) return Alert.alert("No se pudo agregar", error.reason || error.message); closeAdminModal(); Alert.alert("Serie actualizada", `Se agregó el capítulo a ${manualForm.nombre.trim()}.`); });
  }, [adminMode, closeAdminModal, manualForm, urlForm]);

  if (!userReady || !currentUser) return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.accent} size="large" /></View>;
  if (currentUser.subscipcionPelis !== true) return <Restricted onBack={() => router.replace("/(normal)/Main")} palette={palette} />;

  return <View style={[styles.screen, { backgroundColor: palette.background }]}>
    <AppHeader backgroundColor={DEFAULT_HEADER_COLOR} overlapContent showBackButton title="Series" backHref="/(normal)/Main" actions={canManageSeries ? <IconButton accessibilityLabel="Agregar serie" icon="movie-plus" iconColor="#fff" onPress={() => setAdminModal(true)} /> : null} />
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 112 }]} showsVerticalScrollIndicator={false} bounces={false} alwaysBounceVertical={false} overScrollMode="never" contentInsetAdjustmentBehavior="never">
      {featured ? <View style={styles.hero}><ImageBackground source={imageOf(featured) ? { uri: imageOf(featured) } : undefined} style={[styles.heroImage, { minHeight: Math.max(430, width * 0.94) }]} imageStyle={styles.heroImageStyle}><LinearGradient colors={["rgba(2,6,23,0.04)", "rgba(2,6,23,0.72)", palette.background]} locations={[0, 0.54, 1]} style={StyleSheet.absoluteFill} /><View style={[styles.heroContent, { paddingTop: headerInset + 18 }]}><Text style={styles.eyebrow}>VIDKAR CINEMA · SERIES</Text><View style={styles.searchBox}><IconButton icon="magnify" iconColor="#fff" style={{ margin: 0 }} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar serie, género o actor" placeholderTextColor="rgba(255,255,255,0.58)" style={styles.searchInput} /></View><FlatList data={genres} horizontal keyExtractor={(item) => item} renderItem={({ item }) => <Chip compact onPress={() => setGenre(item)} selected={genre === item} showSelectedCheck={false} style={[styles.genreChip, isLandscape && styles.genreChipLandscape, genre === item && { backgroundColor: palette.accent }]} textStyle={[styles.genreChipLabel, { color: "#fff" }]}>{item}</Chip>} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreList} /><Text numberOfLines={3} style={styles.heroTitle}>{titleOf(featured)}</Text><Text style={styles.heroMeta}>{yearOf(featured)}  ·  {listOf(featured.clasificacion)[0] || "Serie"}</Text><Text numberOfLines={3} style={styles.heroCopy}>{summaryOf(featured)}</Text><View style={styles.heroActions}><Button mode="contained" buttonColor={palette.accent} textColor="#fff" icon="play" onPress={() => openDetails(featured)}>Explorar</Button><Button mode="outlined" textColor="#fff" onPress={() => openDetails(featured)}>Detalles</Button></View></View></ImageBackground></View> : null}
      {loading && !tracker.series.length ? <View style={styles.loading}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.muted }}>Cargando catálogo de series...</Text></View> : null}
      {!loading && !filtered.length ? <Surface style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}><IconButton icon="television-off" iconColor={palette.muted} size={36} /><Text style={{ color: palette.text }}>No hay series para mostrar</Text></Surface> : null}
      <SeriesRow items={popular} onPress={openDetails} palette={palette} title="Para descubrir" />
      <SeriesRow items={recent} onPress={openDetails} palette={palette} title="Agregadas recientemente" />
    </ScrollView>

    <ModernBottomDrawer
      visible={Boolean(selected)}
      onDismiss={closeDetails}
      palette={palette}
      header={
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderInfo}>
            <Text style={styles.sheetEyebrow}>SERIE VIDKAR</Text>
            <Text numberOfLines={2} style={[styles.sheetTitle, { color: palette.text }]}>
              {titleOf(detail || selected)}
            </Text>
          </View>
          <IconButton
            icon="close"
            iconColor={palette.muted}
            size={22}
            style={styles.sheetCloseBtn}
            onPress={closeDetails}
          />
        </View>
      }
    >
      <View style={styles.sheetContent}>
        {/* METADATA CHIPS ROW */}
        <View style={styles.sheetChipsRow}>
          {yearOf(detail || selected) !== "Sin año" ? (
            <Surface style={[styles.sheetBadge, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: palette.border }]} elevation={0}>
              <IconButton icon="calendar-range" iconColor={palette.accent} size={14} style={styles.chipIcon} />
              <Text style={[styles.sheetBadgeText, { color: palette.text }]}>{yearOf(detail || selected)}</Text>
            </Surface>
          ) : null}

          <Surface style={[styles.sheetBadge, { backgroundColor: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.3)" }]} elevation={0}>
            <IconButton icon="filmstrip" iconColor="#a5b4fc" size={14} style={styles.chipIcon} />
            <Text style={[styles.sheetBadgeText, { color: palette.accent }]}>
              {detailLoading
                ? "Cargando..."
                : `${seasons.length} ${seasons.length === 1 ? "Temporada" : "Temporadas"}`}
            </Text>
          </Surface>

          {listOf((detail || selected)?.clasificacion).slice(0, 3).map((g) => (
            <Surface key={g} style={[styles.sheetBadge, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: palette.border }]} elevation={0}>
              <Text style={[styles.sheetBadgeText, { color: palette.text }]}>{g}</Text>
            </Surface>
          ))}
        </View>

        {/* SINOPSIS CARD */}
        <Surface style={[styles.sheetCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
          <View style={styles.sheetCardHeader}>
            <IconButton icon="text-box-outline" iconColor={palette.accent} size={16} style={styles.cardHeaderIcon} />
            <Text style={[styles.sheetCardTitle, { color: palette.text }]}>Sinopsis</Text>
          </View>
          <Text numberOfLines={5} style={[styles.detailCopy, { color: palette.muted }]}>
            {summaryOf(detail || selected)}
          </Text>
        </Surface>

        {/* REPARTO / ACTORES */}
        {listOf((detail || selected)?.actors).length > 0 ? (
          <Surface style={[styles.sheetCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
            <View style={styles.sheetCardHeader}>
              <IconButton icon="account-group-outline" iconColor={palette.accent} size={16} style={styles.cardHeaderIcon} />
              <Text style={[styles.sheetCardTitle, { color: palette.text }]}>Reparto principal</Text>
            </View>
            <View style={styles.actorsContainer}>
              {listOf((detail || selected)?.actors).slice(0, 5).map((actor) => (
                <View key={actor} style={styles.actorChip}>
                  <Text numberOfLines={1} style={[styles.actorName, { color: palette.text }]}>{actor}</Text>
                </View>
              ))}
            </View>
          </Surface>
        ) : null}

        {/* ACCIONES */}
        <View style={styles.sheetActions}>
          <Button
            mode="contained"
            buttonColor={palette.accent}
            textColor="#fff"
            icon="play-circle-outline"
            onPress={() => goToDetail(detail || selected)}
            style={styles.sheetPrimaryBtn}
            contentStyle={{ height: 48 }}
            labelStyle={{ fontSize: 15, fontWeight: "900", letterSpacing: 0.2 }}
          >
            {detailLoading
              ? "Ver temporadas y episodios"
              : `Ver ${seasons.length > 0 ? `${seasons.length} ${seasons.length === 1 ? "temporada" : "temporadas"}` : "temporadas"} y episodios`}
          </Button>

          {((detail || selected)?.trailer || (detail || selected)?.urlTrailer) ? (
            <Button
              mode="outlined"
              textColor="#fff"
              icon="video-vintage"
              onPress={() => {
                const url = (detail || selected)?.trailer || (detail || selected)?.urlTrailer;
                if (url) Linking.openURL(url).catch(() => null);
              }}
              style={styles.sheetSecondaryBtn}
              contentStyle={{ height: 44 }}
              labelStyle={{ fontSize: 14, fontWeight: "700" }}
            >
              Ver Tráiler Oficial
            </Button>
          ) : null}
        </View>
      </View>
    </ModernBottomDrawer>
    <Modal animationType="none" onRequestClose={closeAdminModal} transparent visible={adminModal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.adminModalRoot}>
        <Animated.View pointerEvents="none" style={[styles.adminBackdrop, { opacity: adminBackdropOpacity }]}><BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill} /><View style={styles.adminBackdropOverlay} /></Animated.View>
        <Animated.View style={[styles.adminSheet, { backgroundColor: palette.surface, transform: [{ translateY: adminSheetTranslateY }] }]}>
          <View style={styles.adminHeader}><Text variant="headlineSmall" style={{ color: palette.text, fontWeight: "900" }}>Agregar serie</Text><IconButton disabled={adminLoading} icon="close" iconColor={palette.muted} onPress={closeAdminModal} /></View>
          <View style={styles.adminModes}><Button compact disabled={adminLoading} mode={adminMode === "manual" ? "contained" : "outlined"} onPress={() => setAdminMode("manual")} buttonColor={palette.accent}>Capítulo manual</Button><Button compact disabled={adminLoading} mode={adminMode === "url" ? "contained" : "outlined"} onPress={() => setAdminMode("url")} buttonColor={palette.accent}>Importar por URL</Button></View>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} alwaysBounceVertical={false} overScrollMode="never" contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.adminContent}>
            {adminMode === "url" ? <><TextInput autoCapitalize="none" editable={!adminLoading} onChangeText={(value) => setUrlForm((current) => ({ ...current, urlSerie: value }))} placeholder="URL de carpeta o página" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={urlForm.urlSerie} /><TextInput editable={!adminLoading} keyboardType="number-pad" maxLength={4} onChangeText={(value) => setUrlForm((current) => ({ ...current, year: value.replace(/\D/g, "") }))} placeholder="Año" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={urlForm.year} /><TextInput editable={!adminLoading} onChangeText={(value) => setUrlForm((current) => ({ ...current, seriesName: value }))} placeholder="Nombre de la serie" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={urlForm.seriesName} /></> : <><View style={styles.adminColumns}><TextInput editable={!adminLoading} onChangeText={updateManual("nombre")} placeholder="Nombre de la serie" placeholderTextColor={palette.muted} style={[styles.adminInput, styles.adminColumn, { borderColor: palette.border, color: palette.text }]} value={manualForm.nombre} /><TextInput editable={!adminLoading} keyboardType="number-pad" maxLength={4} onChangeText={(value) => updateManual("year")(value.replace(/\D/g, ""))} placeholder="Año" placeholderTextColor={palette.muted} style={[styles.adminInput, styles.adminColumn, { borderColor: palette.border, color: palette.text }]} value={manualForm.year} /></View><View style={styles.adminColumns}><TextInput editable={!adminLoading} keyboardType="number-pad" onChangeText={updateManual("temporada")} placeholder="Temporada" placeholderTextColor={palette.muted} style={[styles.adminInput, styles.adminColumn, { borderColor: palette.border, color: palette.text }]} value={manualForm.temporada} /><TextInput editable={!adminLoading} keyboardType="number-pad" onChangeText={updateManual("capitulo")} placeholder="Capítulo" placeholderTextColor={palette.muted} style={[styles.adminInput, styles.adminColumn, { borderColor: palette.border, color: palette.text }]} value={manualForm.capitulo} /></View><TextInput editable={!adminLoading} onChangeText={updateManual("nombreCapitulo")} placeholder="Nombre del capítulo (opcional)" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={manualForm.nombreCapitulo} /><TextInput autoCapitalize="none" editable={!adminLoading} onChangeText={updateManual("url")} placeholder="URL del video" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={manualForm.url} /><TextInput autoCapitalize="none" editable={!adminLoading} onChangeText={updateManual("poster")} placeholder="URL del póster o background" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={manualForm.poster} /><TextInput autoCapitalize="none" editable={!adminLoading} onChangeText={updateManual("subtitle")} placeholder="URL del subtítulo SRT (opcional)" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={manualForm.subtitle} /><TextInput editable={!adminLoading} onChangeText={updateManual("extension")} placeholder="Extensión (mkv)" placeholderTextColor={palette.muted} style={[styles.adminInput, { borderColor: palette.border, color: palette.text }]} value={manualForm.extension} /><View style={styles.visibilityRow}><Text style={{ color: palette.muted }}>Visibilidad</Text><Button compact disabled={adminLoading} mode={manualForm.mostrar ? "contained" : "outlined"} onPress={() => setManualForm((current) => ({ ...current, mostrar: !current.mostrar }))} buttonColor={palette.accent}>{manualForm.mostrar ? "Mostrar" : "Ocultar"}</Button></View></>}
          </ScrollView>
          <Button disabled={adminLoading} loading={adminLoading} mode="contained" onPress={submitAdmin} buttonColor={palette.accent}>{adminMode === "url" ? "Importar serie" : "Agregar capítulo"}</Button>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 30 },
  center: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center", padding: 24 },
  centerCopy: { lineHeight: 22, maxWidth: 360, textAlign: "center" },
  hero: { overflow: "hidden" },
  heroImage: { justifyContent: "flex-end" },
  heroImageStyle: { opacity: 0.96 },
  heroContent: { flex: 1, justifyContent: "flex-end", paddingBottom: 28, paddingHorizontal: 18 },
  eyebrow: { color: "#c7d2fe", fontSize: 12, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 },
  searchBox: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.72)", borderColor: "rgba(255,255,255,0.32)", borderRadius: 12, borderWidth: 1, flexDirection: "row", maxWidth: 560, minHeight: 50 },
  searchInput: { color: "#fff", flex: 1, fontSize: 15, fontWeight: "700", paddingHorizontal: 2 },
  genreList: { gap: 8, paddingVertical: 10 },
  genreChip: { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.32)", borderWidth: 1, height: 30, minHeight: 30, paddingVertical: 0 },
  genreChipLandscape: { height: 28, minHeight: 28 },
  genreChipLabel: { fontSize: 12, fontWeight: "800", lineHeight: 16, marginVertical: 0, paddingVertical: 0 },
  heroTitle: { color: "#fff", fontSize: 38, fontWeight: "900", lineHeight: 43, maxWidth: 650 },
  heroMeta: { color: "rgba(255,255,255,0.82)", fontSize: 16, fontWeight: "800", marginTop: 10 },
  heroCopy: { color: "rgba(255,255,255,0.78)", fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 590 },
  heroActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  row: { gap: 10, marginTop: 24 },
  rowHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18 },
  rowTitle: { fontWeight: "900" },
  rowContent: { gap: 12, paddingHorizontal: 16, paddingBottom: 2 },
  posterPressable: { width: 158 },
  posterPressableCompact: { width: 148 },
  posterCard: { borderRadius: 14, borderWidth: 1, height: 236, overflow: "hidden" },
  posterImage: { flex: 1 },
  posterImageStyle: { borderRadius: 14 },
  posterBadge: { alignSelf: "flex-start", backgroundColor: "#6366f1", borderRadius: 5, margin: 10, paddingHorizontal: 8, paddingVertical: 4 },
  posterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  posterFooter: { bottom: 0, left: 0, padding: 12, position: "absolute", right: 0 },
  posterTitle: { color: "#fff", fontSize: 15, fontWeight: "900", lineHeight: 19 },
  posterMeta: { color: "rgba(255,255,255,0.68)", fontSize: 11, fontWeight: "700", marginTop: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  loading: { alignItems: "center", gap: 10, justifyContent: "center", padding: 28 },
  empty: { alignItems: "center", borderRadius: 14, borderWidth: 1, gap: 8, margin: 18, padding: 24 },
  sheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 16, marginHorizontal: 18, width: "auto" },
  sheetHeaderInfo: { flex: 1, minWidth: 0, paddingRight: 8 },
  sheetEyebrow: { color: "#6366f1", fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginBottom: 5 },
  sheetTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, lineHeight: 31 },
  sheetCloseBtn: { margin: 0, marginTop: -4 },
  sheetContent: { gap: 14 },
  sheetChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  sheetBadge: { alignItems: "center", borderRadius: 9, borderWidth: 1, flexDirection: "row", minHeight: 34, paddingHorizontal: 9, paddingVertical: 5 },
  chipIcon: { margin: 0, marginRight: 2, padding: 0, width: 16, height: 16 },
  sheetBadgeText: { color: "#f1f5f9", fontSize: 12, fontWeight: "800" },
  sheetCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  sheetCardHeader: { alignItems: "center", flexDirection: "row", gap: 2 },
  cardHeaderIcon: { margin: 0, marginRight: 4, width: 20, height: 20 },
  sheetCardTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  detailCopy: { fontSize: 13.5, lineHeight: 20 },
  actorsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  actorChip: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  actorName: { fontSize: 12, fontWeight: "700" },
  sheetActions: { gap: 10, marginTop: 2, paddingBottom: 2 },
  sheetPrimaryBtn: { borderRadius: 12, elevation: 4, shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  sheetSecondaryBtn: { borderColor: "rgba(255,255,255,0.22)", borderRadius: 12 },
  season: { borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 12 },
  seasonHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  chapter: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 8, minHeight: 62, paddingVertical: 8 },
  adminModalRoot: { flex: 1, justifyContent: "flex-end" },
  adminBackdrop: { backgroundColor: "rgba(2,6,23,0.72)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  adminBackdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.42)" },
  adminSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", padding: 18 },
  adminHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  adminModes: { flexDirection: "row", gap: 8, marginBottom: 8 },
  adminContent: { gap: 12, paddingBottom: 16, paddingTop: 8 },
  adminInput: { borderRadius: 10, borderWidth: 1, fontSize: 15, minHeight: 48, paddingHorizontal: 12 },
  adminColumns: { flexDirection: "row", gap: 10 },
  adminColumn: { flex: 1 },
  visibilityRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
