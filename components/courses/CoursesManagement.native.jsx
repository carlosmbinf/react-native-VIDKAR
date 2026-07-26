import MeteorBase from "@meteorrn/core";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Divider, FAB, IconButton, Portal, Surface, Switch, Text, TextInput, useTheme } from "react-native-paper";

import { uploadCourseVideo } from "../../services/courses/courseMedia.native";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCollection, LeccionesCursoCollection } from "../collections/collections";

const Meteor = MeteorBase;
const EMPTY_COURSE = { categoria: "", descripcion: "", moneda: "CUP", nivel: "", portadaUrl: "", precioMensual: "", titulo: "" };
const EMPTY_LESSON = { descripcion: "", titulo: "" };
const callMethod = (name, ...args) => new Promise((resolve, reject) => Meteor.call(name, ...args, (error, result) => error ? reject(error) : resolve(result)));

const inferMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const extension = String(asset?.fileName || asset?.uri || "").split(".").pop()?.toLowerCase();
  return extension === "mov" ? "video/quicktime" : extension === "webm" ? "video/webm" : extension === "mkv" ? "video/x-matroska" : "video/mp4";
};

export default function CoursesManagement() {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const currentUser = Meteor.user();
  const isProfessor = currentUser?.profile?.role === "profesor";
  const [courseForm, setCourseForm] = React.useState(EMPTY_COURSE);
  const [lessonForm, setLessonForm] = React.useState(EMPTY_LESSON);
  const [courseDialog, setCourseDialog] = React.useState(false);
  const [editingCourseId, setEditingCourseId] = React.useState(null);
  const [lessonDialog, setLessonDialog] = React.useState(false);
  const [selectedCourseId, setSelectedCourseId] = React.useState(null);
  const [workingKey, setWorkingKey] = React.useState(null);
  const [uploadProgress, setUploadProgress] = React.useState({});
  const palette = {
    background: theme.dark ? "#0d0d12" : "#f7f6f2",
    border: theme.dark ? "rgba(251,146,60,0.24)" : "rgba(194,65,12,0.16)",
    card: theme.dark ? "#191820" : "#ffffff",
    muted: theme.dark ? "#b6b0aa" : "#6f675f",
    primary: theme.dark ? "#fdba74" : "#c2410c",
    text: theme.dark ? "#fff7ed" : "#2b211b",
  };

  const data = Meteor.useTracker(() => {
    if (!Meteor.userId()) return { courses: [], lessons: [], loading: true };
    const coursesHandle = Meteor.subscribe("cursos.gestion");
    const lessonsHandle = selectedCourseId ? Meteor.subscribe("cursos.lecciones", selectedCourseId) : null;
    return {
      courses: CursosCollection.find({}, { sort: { updatedAt: -1 } }).fetch(),
      lessons: selectedCourseId ? LeccionesCursoCollection.find({ cursoId: selectedCourseId }, { sort: { orden: 1 } }).fetch() : [],
      loading: !coursesHandle.ready() || Boolean(lessonsHandle && !lessonsHandle.ready()),
    };
  }, [selectedCourseId]);
  const selectedCourse = data.courses.find((course) => course._id === selectedCourseId) || null;

  const run = async (key, action, successMessage) => {
    setWorkingKey(key);
    try {
      const result = await action();
      if (successMessage) Alert.alert("Listo", successMessage);
      return result;
    } catch (error) {
      Alert.alert("No se pudo completar", error?.reason || error?.message || "Inténtalo nuevamente.");
      return null;
    } finally {
      setWorkingKey(null);
    }
  };

  const saveCourse = async () => {
    const payload = { ...courseForm, precioMensual: Number(courseForm.precioMensual) };
    const result = await run(
      "course",
      () => editingCourseId ? callMethod("cursos.actualizar", editingCourseId, payload) : callMethod("cursos.crear", payload),
      editingCourseId ? "Curso actualizado." : "Curso creado como borrador.",
    );
    if (result?.success) {
      setCourseForm(EMPTY_COURSE);
      setCourseDialog(false);
      setSelectedCourseId(editingCourseId || result.courseId);
      setEditingCourseId(null);
    }
  };

  const openCourseDialog = (course = null) => {
    setEditingCourseId(course?._id || null);
    setCourseForm(course ? {
      categoria: course.categoria || "",
      descripcion: course.descripcion || "",
      moneda: course.moneda || "CUP",
      nivel: course.nivel || "",
      portadaUrl: course.portadaUrl || "",
      precioMensual: String(course.precioMensual || ""),
      titulo: course.titulo || "",
    } : EMPTY_COURSE);
    setCourseDialog(true);
  };

  const createLesson = async () => {
    const result = await run("lesson", () => callMethod("cursos.lecciones.crear", selectedCourseId, lessonForm), "Lección creada.");
    if (result?.lessonId) {
      setLessonForm(EMPTY_LESSON);
      setLessonDialog(false);
    }
  };

  const selectAndUploadVideo = async (lesson) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Autoriza el acceso a la biblioteca para seleccionar un video.");
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (selection.canceled || !selection.assets?.[0]) return;
    const asset = selection.assets[0];
    const file = {
      fileName: asset.fileName || `clase_${lesson.orden}.mp4`,
      mimeType: inferMimeType(asset),
      size: asset.fileSize || null,
      uri: asset.uri,
    };
    await run(`upload-${lesson._id}`, async () => {
      const authorization = await callMethod("cursos.media.solicitarSubida", lesson._id, {
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
      });
      await uploadCourseVideo({
        file,
        path: authorization.path,
        token: authorization.token,
        onProgress: (progress) => setUploadProgress((current) => ({ ...current, [lesson._id]: progress })),
      });
    }, "Video subido correctamente.");
    setUploadProgress((current) => {
      const next = { ...current };
      delete next[lesson._id];
      return next;
    });
  };

  const moveLesson = async (lesson, offset) => {
    const index = data.lessons.findIndex((entry) => entry._id === lesson._id);
    const target = data.lessons[index + offset];
    if (!target) return;
    await run(`order-${lesson._id}`, () => Promise.all([
      callMethod("cursos.lecciones.actualizar", lesson._id, { orden: target.orden }),
      callMethod("cursos.lecciones.actualizar", target._id, { orden: lesson.orden }),
    ]));
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Gestión de cursos" subtitle={isProfessor ? "Panel del profesor" : "Supervisión administrativa"} showBackButton backHref="/(normal)/Main" overlapContent />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
        <View style={styles.pageIntro}>
          <Text variant="headlineSmall" style={[styles.pageTitle, { color: palette.text }]}>{isProfessor ? "Tus cursos" : "Cursos del equipo docente"}</Text>
          <Text style={{ color: palette.muted }}>{isProfessor ? "Organiza clases, videos y publicación." : "Revisa los cursos de profesores asignados a tu administración."}</Text>
        </View>

        {data.loading && data.courses.length === 0 ? <ActivityIndicator /> : null}
        {data.courses.map((course) => (
          <Surface key={course._id} style={[styles.courseRow, { backgroundColor: palette.card, borderColor: selectedCourseId === course._id ? palette.primary : palette.border }]} elevation={1}>
            <View style={styles.courseCopy}>
              <Text variant="titleMedium" style={[styles.courseTitle, { color: palette.text }]}>{course.titulo}</Text>
              <Text style={{ color: palette.muted }}>{course.profesorNombre} · {Number(course.precioMensual).toFixed(2)} {course.moneda}/mes</Text>
            </View>
            <View style={styles.courseActions}>
              {course.profesorId === Meteor.userId() ? <IconButton icon="pencil-outline" size={20} onPress={() => openCourseDialog(course)} /> : null}
              <Button compact icon="book-open-page-variant" onPress={() => setSelectedCourseId(course._id)}>Clases</Button>
              <Switch
                value={Boolean(course.publicado)}
                disabled={workingKey === `course-${course._id}`}
                onValueChange={(value) => run(`course-${course._id}`, () => callMethod("cursos.publicar", course._id, value))}
              />
            </View>
          </Surface>
        ))}
        {data.courses.length === 0 && !data.loading ? <Text style={[styles.empty, { color: palette.muted }]}>No hay cursos registrados.</Text> : null}

        {selectedCourse ? (
          <View style={styles.lessonsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>{selectedCourse.titulo}</Text>
                <Text style={{ color: palette.muted }}>{data.lessons.length} lecciones</Text>
              </View>
              <Button mode="contained-tonal" icon="plus" onPress={() => setLessonDialog(true)}>Lección</Button>
            </View>
            <Surface style={[styles.lessonList, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
              {data.lessons.map((lesson, index) => (
                <React.Fragment key={lesson._id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.lessonRow}>
                    <View style={styles.lessonIndex}><Text style={{ color: palette.primary, fontWeight: "900" }}>{lesson.orden}</Text></View>
                    <View style={styles.lessonCopy}>
                      <Text style={[styles.lessonTitle, { color: palette.text }]}>{lesson.titulo}</Text>
                      <Text style={{ color: palette.muted }}>
                        {uploadProgress[lesson._id] !== undefined
                          ? `Subiendo ${Math.round(uploadProgress[lesson._id] * 100)}%`
                          : lesson?.video?.estado === "LISTO"
                            ? `${((lesson?.video?.size || 0) / 1024 / 1024).toFixed(1)} MB`
                            : lesson?.video?.estado || "Sin video"}
                      </Text>
                    </View>
                    <View style={styles.orderActions}>
                      <IconButton icon="chevron-up" size={18} disabled={index === 0 || Boolean(workingKey)} onPress={() => moveLesson(lesson, -1)} />
                      <IconButton icon="chevron-down" size={18} disabled={index === data.lessons.length - 1 || Boolean(workingKey)} onPress={() => moveLesson(lesson, 1)} />
                    </View>
                    <Button compact icon="upload" loading={workingKey === `upload-${lesson._id}`} disabled={Boolean(workingKey)} onPress={() => selectAndUploadVideo(lesson)}>Video</Button>
                    <Switch
                      value={Boolean(lesson.publicada)}
                      disabled={lesson?.video?.estado !== "LISTO" || Boolean(workingKey)}
                      onValueChange={(value) => run(`lesson-${lesson._id}`, () => callMethod("cursos.lecciones.publicar", lesson._id, value))}
                    />
                  </View>
                </React.Fragment>
              ))}
              {data.lessons.length === 0 ? <Text style={[styles.empty, { color: palette.muted }]}>Crea la primera lección del curso.</Text> : null}
            </Surface>
            <Button icon="eye-outline" mode="outlined" style={styles.previewButton} onPress={() => router.push(`/(normal)/CursoDetalle?courseId=${encodeURIComponent(selectedCourse._id)}`)}>Vista del curso</Button>
          </View>
        ) : null}
      </ScrollView>

      {isProfessor ? <FAB icon="plus" label="Curso" style={styles.fab} onPress={() => openCourseDialog()} /> : null}
      <Portal>
        <Dialog visible={courseDialog} onDismiss={() => !workingKey && setCourseDialog(false)}>
          <Dialog.Title>{editingCourseId ? "Editar curso" : "Nuevo curso"}</Dialog.Title>
          <Dialog.ScrollArea><ScrollView contentContainerStyle={styles.dialogContent}>
            <TextInput label="Título" mode="outlined" value={courseForm.titulo} onChangeText={(value) => setCourseForm((current) => ({ ...current, titulo: value }))} />
            <TextInput label="Descripción" mode="outlined" multiline value={courseForm.descripcion} onChangeText={(value) => setCourseForm((current) => ({ ...current, descripcion: value }))} />
            <TextInput label="Categoría" mode="outlined" value={courseForm.categoria} onChangeText={(value) => setCourseForm((current) => ({ ...current, categoria: value }))} />
            <TextInput label="Nivel" mode="outlined" value={courseForm.nivel} onChangeText={(value) => setCourseForm((current) => ({ ...current, nivel: value }))} />
            <TextInput label="Precio mensual" mode="outlined" keyboardType="decimal-pad" value={courseForm.precioMensual} onChangeText={(value) => setCourseForm((current) => ({ ...current, precioMensual: value }))} />
            <TextInput label="URL de portada (opcional)" mode="outlined" autoCapitalize="none" value={courseForm.portadaUrl} onChangeText={(value) => setCourseForm((current) => ({ ...current, portadaUrl: value }))} />
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setCourseDialog(false)}>Cancelar</Button><Button onPress={saveCourse} loading={workingKey === "course"}>{editingCourseId ? "Guardar" : "Crear"}</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={lessonDialog} onDismiss={() => !workingKey && setLessonDialog(false)}>
          <Dialog.Title>Nueva lección</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput label="Título" mode="outlined" value={lessonForm.titulo} onChangeText={(value) => setLessonForm((current) => ({ ...current, titulo: value }))} />
            <TextInput label="Descripción" mode="outlined" multiline value={lessonForm.descripcion} onChangeText={(value) => setLessonForm((current) => ({ ...current, descripcion: value }))} />
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setLessonDialog(false)}>Cancelar</Button><Button onPress={createLesson} loading={workingKey === "lesson"}>Crear</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { gap: 10, padding: 16, paddingBottom: 100 }, pageIntro: { gap: 5, marginBottom: 10 }, pageTitle: { fontWeight: "900" },
  courseRow: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, padding: 13 }, courseCopy: { flex: 1, gap: 4 }, courseTitle: { fontWeight: "850" }, courseActions: { alignItems: "center", flexDirection: "row" },
  empty: { padding: 24, textAlign: "center" }, lessonsSection: { marginTop: 18 }, sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, sectionCopy: { flex: 1 }, sectionTitle: { fontWeight: "850" },
  lessonList: { borderRadius: 8, borderWidth: 1, overflow: "hidden" }, lessonRow: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 72, padding: 10 }, lessonIndex: { alignItems: "center", justifyContent: "center", width: 28 }, lessonCopy: { flex: 1, gap: 3 }, lessonTitle: { fontSize: 14, fontWeight: "800" }, previewButton: { marginTop: 12 },
  orderActions: { alignItems: "center" },
  fab: { bottom: 22, position: "absolute", right: 18 }, dialogContent: { gap: 12, paddingVertical: 8 },
});