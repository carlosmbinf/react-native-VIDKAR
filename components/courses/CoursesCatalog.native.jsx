import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { SuscripcionesCursoCollection } from "../collections/collections";

const Meteor = MeteorBase;
const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const isSubscriptionActive = (subscription) =>
  subscription?.estado === "ACTIVA" && new Date(subscription.fechaFin) > new Date();
const isPrincipalAdmin = (user) => ["carlosmbinf"].includes(String(user?.username || "").toLowerCase());

export default function CoursesCatalog() {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const dataReady = useDeferredScreenData();
  const currentUser = Meteor.user();
  const currentUserId = Meteor.userId();
  const [query, setQuery] = React.useState("");
  const [courses, setCourses] = React.useState([]);
  const [coursesLoading, setCoursesLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const palette = {
    accent: theme.dark ? "#67e8f9" : "#0e7490",
    background: theme.dark ? "#071018" : "#edf5f7",
    border: theme.dark ? "rgba(103,232,249,0.16)" : "rgba(14,116,144,0.14)",
    card: theme.dark ? "#0d1b25" : "#ffffff",
    muted: theme.dark ? "#a5b7c0" : "#5b707a",
    primary: theme.dark ? "#fbbf24" : "#b45309",
    text: theme.dark ? "#f8fafc" : "#10232e",
  };

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
    else setCoursesLoading(true);
    try {
      const result = await callMethod("cursos.catalogo.obtener");
      setCourses(Array.isArray(result?.courses) ? result.courses : []);
    } catch (_error) {
      if (!isRefresh) setCourses([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setCoursesLoading(false);
    }
  }, [currentUserId, dataReady]);

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

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

  const renderCourse = ({ item }) => {
    const subscription = subscriptions.find((entry) => entry.cursoId === item._id);
    const active = isPrincipalAdmin(currentUser) || isSubscriptionActive(subscription);
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/(normal)/CursoDetalle?courseId=${encodeURIComponent(item._id)}`)}
        style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: palette.border, opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={styles.coverFrame}>
          {item.portadaUrl ? (
            <Image source={{ uri: item.portadaUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <LinearGradient colors={theme.dark ? ["#113344", "#172554", "#3b2a0d"] : ["#cffafe", "#dbeafe", "#fef3c7"]} style={styles.coverFallback}><Text style={[styles.coverInitial, { color: palette.accent }]}>{item.titulo?.slice(0, 1)?.toUpperCase() || "C"}</Text></LinearGradient>
          )}
          <LinearGradient colors={["transparent", "rgba(2,8,13,0.78)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.coverTopRow}><View style={styles.categoryBadge}><Icon source="school-outline" color="#ffffff" size={14} /><Text style={styles.categoryText}>{item.categoria || "Curso"}</Text></View>{active ? <View style={styles.activeBadge}><Icon source="check-decagram" color="#bbf7d0" size={14} /><Text style={styles.activeText}>{isPrincipalAdmin(currentUser) ? "Acceso admin" : "Activo"}</Text></View> : null}</View>
          <View style={styles.coverBottom}><Text style={styles.teacher} numberOfLines={1}>{item.profesorNombre || `@${item.profesorUsername}`}</Text></View>
        </View>
          <View style={styles.cardBody}>
            <Text variant="titleLarge" style={[styles.title, { color: palette.text }]} numberOfLines={2}>{item.titulo}</Text>
            <Text style={[styles.description, { color: palette.muted }]} numberOfLines={3}>{item.descripcion}</Text>
            <View style={styles.footerRow}>
              <View style={styles.levelRow}><Icon source="signal" color={palette.muted} size={15} /><Text style={[styles.level, { color: palette.muted }]}>{item.nivel}</Text></View>
              <View style={styles.priceBlock}><Text style={[styles.price, { color: palette.primary }]}>{Number(item.precioMensual).toFixed(2)} {item.moneda}</Text><Text style={[styles.period, { color: palette.muted }]}>por mes</Text></View>
            </View>
          </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <LinearGradient colors={theme.dark ? ["rgba(8,47,73,0.42)", "transparent"] : ["rgba(165,243,252,0.48)", "transparent"]} style={styles.backgroundWash} />
      <AppHeader title="Cursos" subtitle="Aprende con profesores VIDKAR" showBackButton backHref="/(normal)/Main" overlapContent />
      {coursesLoading || subscriptionsLoading ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={[styles.loadingText, { color: palette.muted }]}>Cargando cursos...</Text>
        </View>
      ) : <FlatList
        contentContainerStyle={[styles.content]}
        style={{ marginTop: headerInset + 14 }}
        data={filteredCourses}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCourses(true)} />}
        renderItem={renderCourse}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>VIDKAR ACADEMY</Text>
            <Text variant="headlineMedium" style={[styles.heading, { color: palette.text }]}>Conocimiento que avanza contigo</Text>
            <Text style={[styles.subheading, { color: palette.muted }]}>Explora clases creadas por especialistas y aprende a tu ritmo.</Text>
            <View style={[styles.search, { backgroundColor: palette.card, borderColor: palette.border }]}><Icon source="magnify" color={palette.muted} size={21} /><TextInput accessibilityLabel="Buscar cursos o profesores" cursorColor={palette.accent} placeholder="Buscar por tema, nivel o profesor" placeholderTextColor={palette.muted} style={[styles.searchInput, { color: palette.text }]} value={query} onChangeText={setQuery} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery("")}><Icon source="close-circle" color={palette.muted} size={20} /></Pressable> : null}</View>
            <View style={styles.resultRow}><Text style={[styles.resultCount, { color: palette.text }]}>{filteredCourses.length} {filteredCourses.length === 1 ? "curso" : "cursos"}</Text><Text style={[styles.resultHint, { color: palette.muted }]}>Catálogo actualizado</Text></View>
          </View>
        }
        ListEmptyComponent={coursesLoading || subscriptionsLoading ? <ActivityIndicator style={styles.empty} /> : (
          <View style={styles.empty}><Text style={{ color: palette.muted }}>No hay cursos que coincidan con la búsqueda.</Text></View>
        )}
      />
      }
    </View>
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
  card: { borderRadius: 8, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  coverFrame: { aspectRatio: 16 / 7, position: "relative", width: "100%" },
  cover: { height: "100%", width: "100%" },
  coverFallback: { alignItems: "center", height: "100%", justifyContent: "center", width: "100%" },
  coverInitial: { fontSize: 46, fontWeight: "900" },
  coverTopRow: { flexDirection: "row", justifyContent: "space-between", left: 12, position: "absolute", right: 12, top: 12 }, categoryBadge: { alignItems: "center", backgroundColor: "rgba(2,8,13,0.58)", borderRadius: 6, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 5 }, categoryText: { color: "#ffffff", fontSize: 10, fontWeight: "800" }, activeBadge: { alignItems: "center", backgroundColor: "rgba(20,83,45,0.72)", borderRadius: 6, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 5 }, activeText: { color: "#dcfce7", fontSize: 10, fontWeight: "800" },
  coverBottom: { bottom: 10, left: 12, position: "absolute", right: 12 },
  cardBody: { gap: 8, padding: 15 },
  title: { fontWeight: "800", letterSpacing: 0 },
  teacher: { color: "rgba(255,255,255,0.86)", fontSize: 12, fontWeight: "700" },
  description: { fontSize: 13, lineHeight: 19 },
  footerRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 3 }, levelRow: { alignItems: "center", flexDirection: "row", flex: 1, gap: 5 }, level: { fontSize: 12 }, priceBlock: { alignItems: "flex-end" }, price: { fontSize: 17, fontWeight: "900" }, period: { fontSize: 10 },
  empty: { alignItems: "center", justifyContent: "center", minHeight: 180 },
});