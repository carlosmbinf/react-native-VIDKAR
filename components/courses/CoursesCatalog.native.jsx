import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Searchbar, Surface, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCollection, SuscripcionesCursoCollection } from "../collections/collections";

const Meteor = MeteorBase;
const COURSE_FIELDS = {
  categoria: 1,
  descripcion: 1,
  moneda: 1,
  nivel: 1,
  portadaUrl: 1,
  precioMensual: 1,
  profesorId: 1,
  profesorNombre: 1,
  profesorUsername: 1,
  publicado: 1,
  titulo: 1,
};

const isSubscriptionActive = (subscription) =>
  subscription?.estado === "ACTIVA" && new Date(subscription.fechaFin) > new Date();

export default function CoursesCatalog() {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const dataReady = useDeferredScreenData();
  const [query, setQuery] = React.useState("");
  const palette = {
    background: theme.dark ? "#07110f" : "#f4f8f5",
    border: theme.dark ? "rgba(110,231,183,0.2)" : "rgba(15,118,110,0.14)",
    card: theme.dark ? "#10201c" : "#ffffff",
    muted: theme.dark ? "#9fb7af" : "#5f6f69",
    primary: theme.dark ? "#6ee7b7" : "#0f766e",
    text: theme.dark ? "#f0fdf4" : "#10231d",
  };

  const { courses, loading, subscriptions } = Meteor.useTracker(() => {
    if (!dataReady || !Meteor.userId()) return { courses: [], loading: true, subscriptions: [] };
    const coursesHandle = Meteor.subscribe("cursos.catalogo");
    const subscriptionsHandle = Meteor.subscribe("cursos.suscripciones.propias");
    return {
      courses: CursosCollection.find({ publicado: true }, { fields: COURSE_FIELDS, sort: { publishedAt: -1 } }).fetch(),
      loading: !coursesHandle.ready() || !subscriptionsHandle.ready(),
      subscriptions: SuscripcionesCursoCollection.find({ userId: Meteor.userId() }).fetch(),
    };
  }, [dataReady]);

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
    const active = isSubscriptionActive(subscription);
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/(normal)/CursoDetalle?courseId=${encodeURIComponent(item._id)}`)}
      >
        <Surface style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={1}>
          {item.portadaUrl ? (
            <Image source={{ uri: item.portadaUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: theme.dark ? "#183b32" : "#dff4eb" }]}>
              <Text style={[styles.coverInitial, { color: palette.primary }]}>{item.titulo?.slice(0, 1)?.toUpperCase() || "C"}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.metaRow}>
              <Chip compact icon="school-outline" style={styles.compactChip}>{item.categoria || "Curso"}</Chip>
              {active ? <Chip compact icon="check-decagram" textStyle={{ color: palette.primary }}>Activo</Chip> : null}
            </View>
            <Text variant="titleLarge" style={[styles.title, { color: palette.text }]} numberOfLines={2}>{item.titulo}</Text>
            <Text style={[styles.teacher, { color: palette.primary }]} numberOfLines={1}>{item.profesorNombre || `@${item.profesorUsername}`}</Text>
            <Text style={[styles.description, { color: palette.muted }]} numberOfLines={3}>{item.descripcion}</Text>
            <View style={styles.footerRow}>
              <Text style={[styles.level, { color: palette.muted }]}>{item.nivel}</Text>
              <Text style={[styles.price, { color: palette.text }]}>{Number(item.precioMensual).toFixed(2)} {item.moneda}/mes</Text>
            </View>
          </View>
        </Surface>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Cursos" subtitle="Aprende con profesores VIDKAR" showBackButton backHref="/(normal)/Main" overlapContent />
      <FlatList
        contentContainerStyle={[styles.content, { paddingTop: headerInset + 14 }]}
        data={filteredCourses}
        keyExtractor={(item) => item._id}
        renderItem={renderCourse}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text variant="headlineSmall" style={[styles.heading, { color: palette.text }]}>Formación a tu ritmo</Text>
            <Text style={[styles.subheading, { color: palette.muted }]}>Busca por asignatura, nivel o profesor.</Text>
            <Searchbar placeholder="Buscar cursos o profesores" value={query} onChangeText={setQuery} style={styles.search} />
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.empty} /> : (
          <View style={styles.empty}><Text style={{ color: palette.muted }}>No hay cursos que coincidan con la búsqueda.</Text></View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 12, padding: 16, paddingBottom: 36 },
  headerBlock: { gap: 5, marginBottom: 12 },
  heading: { fontWeight: "800" },
  subheading: { fontSize: 14, marginBottom: 10 },
  search: { borderRadius: 8 },
  card: { borderRadius: 8, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  cover: { aspectRatio: 16 / 7, width: "100%" },
  coverFallback: { alignItems: "center", aspectRatio: 16 / 7, justifyContent: "center", width: "100%" },
  coverInitial: { fontSize: 46, fontWeight: "900" },
  cardBody: { gap: 7, padding: 14 },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  compactChip: { alignSelf: "flex-start" },
  title: { fontWeight: "800", letterSpacing: 0 },
  teacher: { fontSize: 13, fontWeight: "700" },
  description: { fontSize: 13, lineHeight: 19 },
  footerRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  level: { flex: 1, fontSize: 12 },
  price: { fontSize: 15, fontWeight: "800" },
  empty: { alignItems: "center", justifyContent: "center", minHeight: 180 },
});