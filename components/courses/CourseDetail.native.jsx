import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Image, ScrollView, StyleSheet, UIManager, View } from "react-native";
import { ActivityIndicator, Button, Chip, Divider, Modal, Portal, Surface, Text, useTheme } from "react-native-paper";

import { resolveCourseMediaUrl } from "../../services/courses/courseMedia.native";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCollection, LeccionesCursoCollection, SuscripcionesCursoCollection } from "../collections/collections";

const { VLCPlayer } = require("react-native-vlc-media-player");
const Meteor = MeteorBase;
const isVlcPlayerAvailable = Boolean(
  UIManager.getViewManagerConfig?.("RCTVLCPlayer"),
);

const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

export default function CourseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { courseId } = useLocalSearchParams();
  const headerInset = useAppHeaderContentInset();
  const [working, setWorking] = React.useState(false);
  const [player, setPlayer] = React.useState(null);
  const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;
  const palette = {
    background: theme.dark ? "#07110f" : "#f4f8f5",
    border: theme.dark ? "rgba(110,231,183,0.2)" : "rgba(15,118,110,0.14)",
    card: theme.dark ? "#10201c" : "#ffffff",
    muted: theme.dark ? "#9fb7af" : "#5f6f69",
    primary: theme.dark ? "#6ee7b7" : "#0f766e",
    text: theme.dark ? "#f0fdf4" : "#10231d",
  };

  const data = Meteor.useTracker(() => {
    if (!normalizedCourseId || !Meteor.userId()) return { course: null, lessons: [], loading: true, subscription: null };
    const catalog = Meteor.subscribe("cursos.catalogo");
    const management = Meteor.subscribe("cursos.gestion");
    const lessons = Meteor.subscribe("cursos.lecciones", normalizedCourseId);
    const subscriptions = Meteor.subscribe("cursos.suscripciones.propias");
    return {
      course: CursosCollection.findOne(normalizedCourseId),
      lessons: LeccionesCursoCollection.find({ cursoId: normalizedCourseId }, { sort: { orden: 1 } }).fetch(),
      loading: !catalog.ready() || !management.ready() || !lessons.ready() || !subscriptions.ready(),
      subscription: SuscripcionesCursoCollection.findOne({ cursoId: normalizedCourseId, userId: Meteor.userId() }),
    };
  }, [normalizedCourseId]);

  const currentUser = Meteor.user();
  const isManager = data.course && (
    data.course.profesorId === Meteor.userId() ||
    currentUser?.username === "carlosmbinf" ||
    (currentUser?.profile?.role === "admin" && data.course.adminId === Meteor.userId())
  );
  const active = data.subscription?.estado === "ACTIVA" && new Date(data.subscription.fechaFin) > new Date();

  const addToCart = async () => {
    setWorking(true);
    try {
      await callMethod("cursos.agregarAlCarrito", normalizedCourseId);
      Alert.alert("Curso añadido", active ? "La renovación mensual está en el carrito." : "La suscripción mensual está en el carrito.", [
        { text: "Continuar", onPress: () => router.replace("/(normal)/Main") },
      ]);
    } catch (error) {
      Alert.alert("No se pudo continuar", error?.reason || error?.message || "Inténtalo nuevamente.");
    } finally {
      setWorking(false);
    }
  };

  const playLesson = async (lesson) => {
    if (!isVlcPlayerAvailable) {
      Alert.alert(
        "Reproductor no disponible",
        "Esta instalación no incluye el módulo nativo de VLC. Recompila e instala el development build de VIDKAR; Expo Go no admite este reproductor.",
      );
      return;
    }

    setWorking(true);
    try {
      const result = await callMethod("cursos.media.solicitarReproduccion", lesson._id);
      setPlayer({ title: lesson.titulo, url: resolveCourseMediaUrl(result.url) });
    } catch (error) {
      Alert.alert("Video no disponible", error?.reason || error?.message || "No se pudo iniciar la reproducción.");
    } finally {
      setWorking(false);
    }
  };

  if (data.loading && !data.course) {
    return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator /></View>;
  }
  if (!data.course) {
    return <View style={[styles.center, { backgroundColor: palette.background }]}><Text>Curso no encontrado.</Text></View>;
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Detalle del curso" subtitle={data.course.profesorNombre} showBackButton backHref="/(normal)/Cursos" overlapContent />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
        {data.course.portadaUrl ? <Image source={{ uri: data.course.portadaUrl }} style={styles.cover} /> : null}
        <View style={styles.titleBlock}>
          <View style={styles.chipRow}>
            <Chip compact icon="shape-outline">{data.course.categoria}</Chip>
            <Chip compact icon="signal">{data.course.nivel}</Chip>
          </View>
          <Text variant="headlineMedium" style={[styles.title, { color: palette.text }]}>{data.course.titulo}</Text>
          <Text style={[styles.teacher, { color: palette.primary }]}>{data.course.profesorNombre}</Text>
          <Text style={[styles.description, { color: palette.muted }]}>{data.course.descripcion}</Text>
        </View>

        {!isManager ? (
          <Surface style={[styles.subscriptionPanel, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={1}>
            <View style={styles.subscriptionCopy}>
              <Text variant="titleMedium" style={{ color: palette.text, fontWeight: "800" }}>{active ? "Acceso vigente" : "Suscripción mensual"}</Text>
              <Text style={{ color: palette.muted }}>
                {active
                  ? `Disponible hasta ${new Date(data.subscription.fechaFin).toLocaleDateString("es-ES")}`
                  : `${Number(data.course.precioMensual).toFixed(2)} ${data.course.moneda} por 30 días`}
              </Text>
            </View>
            {!active ? (
              <Button mode="contained" icon={data.subscription ? "calendar-refresh" : "cart-plus"} onPress={addToCart} loading={working} disabled={working}>
                {data.subscription ? "Renovar" : "Suscribirme"}
              </Button>
            ) : null}
          </Surface>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>Contenido del curso</Text>
          <Text style={{ color: palette.muted }}>{data.lessons.length} clases</Text>
        </View>
        <Surface style={[styles.lessonList, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
          {data.lessons.map((lesson, index) => (
            <React.Fragment key={lesson._id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.lessonRow}>
                <View style={[styles.orderBadge, { borderColor: palette.border }]}><Text style={{ color: palette.primary, fontWeight: "800" }}>{lesson.orden}</Text></View>
                <View style={styles.lessonCopy}>
                  <Text style={[styles.lessonTitle, { color: palette.text }]}>{lesson.titulo}</Text>
                  <Text style={{ color: palette.muted }} numberOfLines={2}>{lesson.descripcion || "Clase en video"}</Text>
                </View>
                <Button compact icon={active || isManager ? "play-circle" : "lock"} disabled={working || (!active && !isManager)} onPress={() => playLesson(lesson)}>Ver</Button>
              </View>
            </React.Fragment>
          ))}
          {data.lessons.length === 0 ? <Text style={[styles.empty, { color: palette.muted }]}>Aún no hay clases publicadas.</Text> : null}
        </Surface>
      </ScrollView>

      <Portal>
        <Modal visible={Boolean(player)} onDismiss={() => setPlayer(null)} contentContainerStyle={styles.playerModal}>
          <View style={styles.playerHeader}>
            <Text numberOfLines={1} style={styles.playerTitle}>{player?.title}</Text>
            <Button textColor="#ffffff" onPress={() => setPlayer(null)}>Cerrar</Button>
          </View>
          {player?.url ? <VLCPlayer source={{ uri: player.url }} autoplay style={styles.player} /> : null}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, center: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 }, cover: { aspectRatio: 16 / 8, borderRadius: 8, marginBottom: 18, width: "100%" },
  titleBlock: { gap: 8 }, chipRow: { flexDirection: "row", gap: 8 }, title: { fontWeight: "900", letterSpacing: 0 },
  teacher: { fontSize: 15, fontWeight: "800" }, description: { fontSize: 15, lineHeight: 22 },
  subscriptionPanel: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 20, padding: 14 },
  subscriptionCopy: { flex: 1, gap: 4 }, sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 26 },
  sectionTitle: { fontWeight: "850" }, lessonList: { borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  lessonRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 78, padding: 12 }, orderBadge: { alignItems: "center", borderRadius: 8, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  lessonCopy: { flex: 1, gap: 3 }, lessonTitle: { fontSize: 15, fontWeight: "800" }, empty: { padding: 24, textAlign: "center" },
  playerModal: { alignSelf: "center", backgroundColor: "#050505", borderRadius: 8, overflow: "hidden", width: "94%" },
  playerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingLeft: 14 }, playerTitle: { color: "#ffffff", flex: 1, fontWeight: "800" }, player: { aspectRatio: 16 / 9, width: "100%" },
});