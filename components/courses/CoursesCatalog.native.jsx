import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";
import { syncCourseSpotlightIndex } from "../../services/spotlight/spotlight";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { SuscripcionesCursoCollection } from "../collections/collections";
import { ServiceEntrance, ServiceMotionProvider, ServicePressable, ServiceScrollViewport } from "../motion/ServiceMotion";
import CourseCover from "./CourseCover.native";
import { saveCourseZoomSnapshot } from "./courseZoomSnapshot";

const Meteor = MeteorBase;
const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const isSubscriptionActive = (subscription) =>
  subscription?.estado === "ACTIVA" && new Date(subscription.fechaFin) > new Date();
const isPrincipalAdmin = (user) => ["carlosmbinf"].includes(String(user?.username || "").toLowerCase());

export function CourseCard({ item, active = false, accessWithoutSubscription = false, locked = false, onPress, onEvaluate, width }) {
  const theme = useTheme();
  const palette = getCoursePalette(theme);
  const CardPressable = locked ? Pressable : ServicePressable;
  const reducedMotion = useSystemReducedMotion();
  const zoomEnabled = !locked && Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 18 && !reducedMotion;
  const [failedUrl, setFailedUrl] = React.useState(null);
  const url = typeof item.portadaUrl === "string" && item.portadaUrl.trim() ? item.portadaUrl : null;
  const initial = item.titulo?.slice(0, 1)?.toUpperCase() || "C";
  const visual = { url, failed: Boolean(url && failedUrl === url), initial };
  const cover = <View collapsable={false} style={styles.cover}><CourseCover {...visual} onError={() => setFailedUrl(url)} /></View>;
  const card = (
    <CardPressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir curso ${item.titulo}`}
      accessibilityState={{ disabled: locked }}
      onPress={locked || zoomEnabled ? undefined : onPress}
      style={StyleSheet.flatten([
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: locked ? palette.primary : palette.border,
          shadowColor: theme.dark ? "#000000" : "#0f172a",
          width,
        },
      ])}
    >
      <View style={styles.coverFrame}>
        {zoomEnabled ? <Link.AppleZoom>{cover}</Link.AppleZoom> : cover}
        <LinearGradient
          colors={["rgba(2,8,13,0.45)", "transparent", "rgba(2,8,13,0.85)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.coverTopRow}>
          <View style={styles.categoryBadge}>
            <Icon source="school-outline" color="#ffffff" size={13} />
            <Text style={styles.categoryText}>{item.categoria || "Curso"}</Text>
          </View>
          {active ? (
            <View style={styles.activeBadge}>
              <Icon source="check-decagram" color="#bbf7d0" size={13} />
              <Text style={styles.activeText}>{accessWithoutSubscription ? "Acceso libre" : "Activo"}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.coverBottom}>
          <View style={styles.teacherBadge}>
            <Icon source="account-circle-outline" color="rgba(255,255,255,0.9)" size={14} />
            <Text style={styles.teacher} numberOfLines={1}>
              {item.profesorNombre || (item.profesorUsername ? `@${item.profesorUsername}` : "Profesor VIDKAR")}
            </Text>
          </View>
        </View>

        {locked ? (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconBox}>
              <Icon source="lock-outline" color="#ffffff" size={26} />
            </View>
            <Text style={styles.lockTitle}>Requiere nivel {item.nivelRequerido}</Text>
            <Text style={styles.lockCaption}>Tu nivel: {item.nivelUsuario === null ? "sin evaluar" : item.nivelUsuario}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text variant="titleMedium" style={[styles.title, { color: palette.text }]} numberOfLines={2}>
          {item.titulo}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {item.descripcion}
        </Text>

        <View style={[styles.footerRow, { borderTopColor: palette.border }]}>
          <View style={[styles.levelBadge, { backgroundColor: theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
            <Icon source="signal" color={palette.accent} size={13} />
            <Text style={[styles.level, { color: palette.text }]}>{item.nivel || "Todos los niveles"}</Text>
          </View>

          {item.precioMensual != null ? (
            <View style={styles.priceContainer}>
              <View style={styles.priceBlock}>
                <Text style={[styles.price, { color: palette.primary }]}>
                  {Number(item.precioMensual).toFixed(2)} {item.moneda}
                </Text>
                <Text style={[styles.period, { color: palette.muted }]}>/ mes</Text>
              </View>
              <View style={[styles.actionIconBox, { backgroundColor: palette.accent + "18" }]}>
                <Icon source="arrow-top-right" color={palette.accent} size={15} />
              </View>
            </View>
          ) : null}
        </View>

        {locked && onEvaluate ? (
          <Pressable
            accessibilityRole="button"
            onPress={onEvaluate}
            style={[styles.reEvaluateButton, { borderColor: palette.primary, backgroundColor: palette.primary + "12" }]}
          >
            <Icon source="school-outline" color={palette.primary} size={16} />
            <Text style={[styles.reEvaluateText, { color: palette.primary }]}>Reevaluarme</Text>
          </Pressable>
        ) : null}
      </View>
    </CardPressable>
  );
  return zoomEnabled ? (
    <Link
      href={{ pathname: "/(normal)/CursoDetalle", params: { courseId: item._id } }}
      asChild
      push
      onPress={() => saveCourseZoomSnapshot(item._id, visual)}
    >
      <Link.Trigger>{card}</Link.Trigger>
    </Link>
  ) : card;
}

const getCoursePalette = (theme) => ({
  accent: theme.dark ? "#67e8f9" : "#0e7490",
  background: theme.dark ? "#071018" : "#edf5f7",
  border: theme.dark ? "rgba(103,232,249,0.16)" : "rgba(14,116,144,0.14)",
  card: theme.dark ? "#0d1b25" : "#ffffff",
  muted: theme.dark ? "#a5b7c0" : "#5b707a",
  primary: theme.dark ? "#fbbf24" : "#b45309",
  text: theme.dark ? "#f8fafc" : "#10232e",
});

export default function CoursesCatalog({ searchResultIds } = {}) {
  const theme = useTheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const headerInset = useAppHeaderContentInset();
  const dataReady = useDeferredScreenData();
  const currentUser = Meteor.user();
  const currentUserId = Meteor.userId();
  const [query, setQuery] = React.useState("");
  const [courses, setCourses] = React.useState([]);
  const [coursesLoading, setCoursesLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [coursesError, setCoursesError] = React.useState("");
  const requestRef = React.useRef(0);
  const hasLoadedCoursesRef = React.useRef(false);
  const revealedCategories = React.useRef(new Set());
  const palette = getCoursePalette(theme);

  const { subscriptions, subscriptionsLoading } = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId) return { subscriptions: [], subscriptionsLoading: true };
    const subscriptionsHandle = Meteor.subscribe("cursos.suscripciones.propias");
    return {
      subscriptions: SuscripcionesCursoCollection.find({ userId: currentUserId }).fetch(),
      subscriptionsLoading: !subscriptionsHandle.ready(),
    };
  }, [currentUserId, dataReady]);

  const loadCourses = React.useCallback(async (isRefresh = false) => {
    if (!dataReady || !currentUserId) {
      setCourses([]);
      setCoursesLoading(Boolean(dataReady));
      return;
    }

    if (isRefresh) setRefreshing(true);
    else if (!hasLoadedCoursesRef.current) setCoursesLoading(true);
    const requestId = ++requestRef.current;
    setCoursesError("");
    try {
      const result = await callMethod("cursos.catalogo.obtener");
      if (requestRef.current !== requestId) return;
      const nextCourses = Array.isArray(result?.courses) ? result.courses : [];
      setCourses(nextCourses);
      hasLoadedCoursesRef.current = true;
      syncCourseSpotlightIndex(nextCourses).catch((error) => {
        console.warn("[Spotlight] No se pudo sincronizar el catálogo de cursos:", error);
      });
    } catch (error) {
      if (requestRef.current !== requestId) return;
      console.warn("[Cursos] No se pudo cargar el catálogo:", error);
      setCoursesError(error?.reason || error?.message || "No se pudo cargar el catálogo de cursos.");
      if (!isRefresh) setCourses([]);
    } finally {
      if (requestRef.current === requestId) {
        if (isRefresh) setRefreshing(false);
        else setCoursesLoading(false);
      }
    }
  }, [currentUserId, dataReady]);

  useFocusEffect(React.useCallback(() => {
    loadCourses();
    return () => { requestRef.current += 1; };
  }, [loadCourses]));

  React.useEffect(() => {
    courses.filter((course) => course.portadaUrl).forEach((course) => {
      console.log("[COURSE_COVER] URL recibida en catálogo:", course._id, course.portadaUrl);
    });
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return courses;
    return courses.filter((course) =>
      [course.titulo, course.descripcion, course.categoria, course.nivel, course.profesorNombre, course.profesorUsername]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(normalized)),
    );
  }, [courses, query]);
  const groupedCourses = React.useMemo(() => filteredCourses.reduce((groups, course) => {
    const key = course.categoriaEvaluacionId || `legacy:${course.categoria || "General"}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.courses.push(course);
    else groups.push({ courses: [course], key, name: course.categoria || "General" });
    return groups;
  }, []), [filteredCourses]);
  const cardWidth = Math.min(windowWidth >= 768 ? 360 : windowWidth * 0.82, windowWidth - 40);

  const renderCourse = ({ item }) => {
    const subscription = subscriptions.find((entry) => entry.cursoId === item._id);
    const isOwner = item.profesorId === currentUserId;
    const active = isPrincipalAdmin(currentUser) || isOwner || isSubscriptionActive(subscription);
    const locked = Boolean(item.bloqueadoPorNivel) && !isPrincipalAdmin(currentUser) && !isOwner;
    return (
      <CourseCard
        item={item}
        active={active}
        accessWithoutSubscription={isPrincipalAdmin(currentUser) || isOwner}
        locked={locked}
        width={cardWidth}
        onPress={() => router.push(`/(normal)/CursoDetalle?courseId=${encodeURIComponent(item._id)}`)}
        onEvaluate={() => router.push(`/(normal)/EvaluacionesIA?categoriaId=${encodeURIComponent(item.categoriaEvaluacionId)}`)}
      />
    );
  };

  const renderCategory = ({ item }) => (
    <ServiceEntrance
      initiallyRevealed={revealedCategories.current.has(item.key)}
      onReveal={() => revealedCategories.current.add(item.key)}
      style={styles.categorySection}
    >
      <Text variant="titleLarge" style={[styles.categoryTitle, { color: palette.text }]}>{item.name}</Text>
      <FlatList
        contentContainerStyle={styles.courseRail}
        data={item.courses}
        horizontal
        keyExtractor={(course) => course._id}
        renderItem={renderCourse}
        showsHorizontalScrollIndicator={false}
      />
    </ServiceEntrance>
  );

  if (searchResultIds) return (
    <ServiceMotionProvider>
    <View>
      {coursesError ? <Text accessibilityRole="alert">{coursesError}</Text> : null}
      <FlatList
        horizontal
        data={coursesLoading || subscriptionsLoading ? [] : searchResultIds.map((id) => courses.find((course) => course._id === id)).filter(Boolean)}
        keyExtractor={(course) => course._id}
        renderItem={renderCourse}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courseRail}
        ListEmptyComponent={coursesLoading || subscriptionsLoading ? <ActivityIndicator style={styles.empty} /> : <Text>No hay cursos disponibles para estos resultados.</Text>}
      />
    </View>
    </ServiceMotionProvider>
  );

  return (
    <ServiceMotionProvider>
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <LinearGradient colors={theme.dark ? ["rgba(8,47,73,0.42)", "transparent"] : ["rgba(165,243,252,0.48)", "transparent"]} style={styles.backgroundWash} />
      <AppHeader title="Cursos" subtitle="Aprende con profesores VIDKAR" showBackButton backHref="/(normal)/Main" overlapContent />
      {coursesError ? <Text accessibilityRole="alert" style={{ marginTop: headerInset }}>{coursesError}</Text> : null}
      {coursesLoading || (subscriptionsLoading && !hasLoadedCoursesRef.current) ? (
        <View style={[styles.loadingScreen, { marginTop: headerInset + 14 }]}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={[styles.loadingText, { color: palette.muted }]}>Cargando cursos...</Text>
        </View>
      ) : <ServiceScrollViewport topInset={headerInset}><FlatList
        contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}
        data={groupedCourses}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl onRefresh={() => loadCourses(true)} progressViewOffset={headerInset + 14} refreshing={refreshing} />}
        renderItem={renderCategory}
        ListHeaderComponent={
          <ServiceEntrance style={styles.headerBlock} variant="hero">
            <Text style={[styles.eyebrow, { color: palette.accent }]}>VIDKAR ACADEMY</Text>
            <Text variant="headlineMedium" style={[styles.heading, { color: palette.text }]}>Conocimiento que avanza contigo</Text>
            <Text style={[styles.subheading, { color: palette.muted }]}>Explora clases creadas por especialistas y aprende a tu ritmo.</Text>
            <View style={[styles.search, { backgroundColor: palette.card, borderColor: palette.border }]}><Icon source="magnify" color={palette.muted} size={21} /><TextInput accessibilityLabel="Buscar cursos o profesores" cursorColor={palette.accent} placeholder="Buscar por tema, nivel o profesor" placeholderTextColor={palette.muted} style={[styles.searchInput, { color: palette.text }]} value={query} onChangeText={setQuery} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery("")}><Icon source="close-circle" color={palette.muted} size={20} /></Pressable> : null}</View>
            <View style={styles.resultRow}><Text style={[styles.resultCount, { color: palette.text }]}>{filteredCourses.length} {filteredCourses.length === 1 ? "curso" : "cursos"}</Text><Text style={[styles.resultHint, { color: palette.muted }]}>Catálogo actualizado</Text></View>
          </ServiceEntrance>
        }
        ListEmptyComponent={coursesLoading || subscriptionsLoading ? <ActivityIndicator style={styles.empty} /> : (
          <View style={styles.empty}><Text style={{ color: palette.muted }}>No hay cursos que coincidan con la búsqueda.</Text></View>
        )}
      /></ServiceScrollViewport>
      }
    </View>
    </ServiceMotionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1},
  backgroundWash: { height: 300, left: 0, position: "absolute", right: 0, top: 0 },
  content: { padding: 16, paddingBottom: 36 },
  headerBlock: { gap: 7, marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: "900" },
  heading: { fontWeight: "900", lineHeight: 36 },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  search: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, minHeight: 50, paddingVertical: 0 },
  resultRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 3 }, resultCount: { fontSize: 13, fontWeight: "800" }, resultHint: { fontSize: 11 },
  categorySection: { gap: 9, marginBottom: 22 },
  categoryTitle: { fontWeight: "900" },
  courseRail: { gap: 12, paddingRight: 16 },
  card: {
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    elevation: 3,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
  },
  coverFrame: {
    aspectRatio: 16 / 9,
    position: "relative",
    width: "100%",
  },
  cover: { height: "100%", width: "100%" },
  coverFallback: { alignItems: "center", height: "100%", justifyContent: "center", width: "100%" },
  coverInitial: { fontSize: 46, fontWeight: "900" },
  coverTopRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    left: 12,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 2,
  },
  categoryBadge: {
    alignItems: "center",
    backgroundColor: "rgba(2,8,13,0.68)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  activeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.85)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  coverBottom: {
    bottom: 12,
    left: 12,
    position: "absolute",
    right: 12,
    zIndex: 2,
  },
  teacherBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(2,8,13,0.65)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "85%",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  teacher: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  lockOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(2,8,13,0.82)",
    bottom: 0,
    gap: 4,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
  },
  lockIconBox: {
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.2)",
    borderColor: "rgba(251,191,36,0.45)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginBottom: 4,
    width: 48,
  },
  lockTitle: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  lockCaption: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  cardBody: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 12,
  },
  levelBadge: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  level: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  period: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: -2,
  },
  actionIconBox: {
    alignItems: "center",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  reEvaluateButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 40,
  },
  reEvaluateText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", justifyContent: "center", minHeight: 180 },
});
