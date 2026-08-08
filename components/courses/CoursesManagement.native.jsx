import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { NestableDraggableFlatList, NestableScrollContainer } from "react-native-draggable-flatlist";
import { Dropdown } from "react-native-element-dropdown";
import { ActivityIndicator, Button, Dialog, FAB, IconButton, Portal, Surface, Switch, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadCourseVideo } from "../../services/courses/courseMedia.native";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCategoriasCollection, CursosCollection, LeccionesCursoCollection } from "../collections/collections";

const Meteor = MeteorBase;
const EMPTY_COURSE = { categoria: "", categoriaEvaluacionId: "", descripcion: "", moneda: "CUP", nivel: "", nivelEvaluacion: "", portadaFileId: "", portadaUrl: "", precioMensual: "", titulo: "" };
const EMPTY_LESSON = { descripcion: "", titulo: "" };
const PRINCIPAL_USERNAMES = ["carlosmbinf"];
const callMethod = (name, ...args) => new Promise((resolve, reject) => Meteor.call(name, ...args, (error, result) => error ? reject(error) : resolve(result)));
const normalizeCategoryId = (value) => {
  if (!value) return "";
  if (typeof value.toHexString === "function") return value.toHexString();
  const rawValue = String(value).trim();
  const match = rawValue.match(/^ObjectI[dD]\s*\(\s*["']?([a-f\d]{24})["']?\s*\)$/i);
  return match ? match[1] : rawValue;
};
const normalizePriceInput = (value) => {
  return String(value ?? "").replace(/\./g, ",");
};
const parsePrice = (value) => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};

const inferMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const extension = String(asset?.fileName || asset?.uri || "").split(".").pop()?.toLowerCase();
  return extension === "mov" ? "video/quicktime" : extension === "webm" ? "video/webm" : extension === "mkv" ? "video/x-matroska" : "video/mp4";
};

const inferImageMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const extension = String(asset?.fileName || asset?.uri || "").split(".").pop()?.toLowerCase();
  return extension === "png" ? "image/png" : "image/jpeg";
};

export default function CoursesManagement() {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const currentUser = Meteor.user();
  const isProfessor = currentUser?.profile?.role === "profesor";
  const isAdmin = currentUser?.profile?.role === "admin";
  const isPrincipalAdmin = PRINCIPAL_USERNAMES.includes(String(currentUser?.username || "").toLowerCase());
  const [courseForm, setCourseForm] = React.useState(EMPTY_COURSE);
  const [lessonForm, setLessonForm] = React.useState(EMPTY_LESSON);
  const [courseDialog, setCourseDialog] = React.useState(false);
  const [editingCourseId, setEditingCourseId] = React.useState(null);
  const [lessonDialog, setLessonDialog] = React.useState(false);
  const [editingLessonId, setEditingLessonId] = React.useState(null);
  const [selectedCourseId, setSelectedCourseId] = React.useState(null);
  const [workingKey, setWorkingKey] = React.useState(null);
  const [uploadProgress, setUploadProgress] = React.useState({});
  const [orderedLessons, setOrderedLessons] = React.useState([]);
  const reorderingLessonsRef = React.useRef(false);
  const [coverAsset, setCoverAsset] = React.useState(null);
  const [earningsPreview, setEarningsPreview] = React.useState({ data: null, error: null, loading: false });
  const palette = {
    accent: theme.dark ? "#7dd3fc" : "#0369a1",
    background: theme.dark ? "#071018" : "#eef6f8",
    border: theme.dark ? "rgba(125,211,252,0.18)" : "rgba(3,105,161,0.14)",
    card: theme.dark ? "#0d1b25" : "#ffffff",
    muted: theme.dark ? "#9eb1bd" : "#58707c",
    primary: theme.dark ? "#fbbf24" : "#b45309",
    text: theme.dark ? "#f8fafc" : "#10232e",
  };
  const inputTheme = {
    colors: {
      background: theme.dark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.92)",
      onSurfaceVariant: palette.muted,
      outline: theme.dark ? "rgba(148,163,184,0.24)" : "rgba(15,23,42,0.16)",
      primary: palette.accent,
    },
    roundness: 14,
  };
  const dialogSize = {
    maxHeight: Math.max(320, windowHeight - insets.top - insets.bottom - 32),
    width: Math.min(Math.max(windowWidth - 32, 320), 680),
  };

  const data = Meteor.useTracker(() => {
    if (!Meteor.userId()) return { categories: [], courses: [], lessons: [], loading: true };
    const coursesHandle = Meteor.subscribe("cursos.gestion");
    const categoriesHandle = Meteor.subscribe("cursos.categorias");
    const lessonsHandle = selectedCourseId ? Meteor.subscribe("cursos.lecciones", selectedCourseId) : null;
    return {
      categories: CursosCategoriasCollection.find({ activa: true }, { sort: { nombre: 1 } }).fetch(),
      courses: CursosCollection.find({}, { sort: { updatedAt: -1 } }).fetch(),
      lessons: selectedCourseId ? LeccionesCursoCollection.find({ cursoId: selectedCourseId }, { sort: { orden: 1 } }).fetch() : [],
      loading: !coursesHandle.ready() || !categoriesHandle.ready() || Boolean(lessonsHandle && !lessonsHandle.ready()),
    };
  }, [selectedCourseId]);
  const selectedCourse = data.courses.find((course) => course._id === selectedCourseId) || null;
  const selectedCategory = data.categories.find((category) => normalizeCategoryId(category._id) === courseForm.categoriaEvaluacionId) || null;
  const categoryOptions = data.categories.map((category) => ({ label: category.nombre, value: normalizeCategoryId(category._id) }));
  const levelOptions = [...(selectedCategory?.niveles || [])]
    .sort((left, right) => left.nivel - right.nivel)
    .map((level) => ({ label: `${level.nivel} · ${level.descripcion}`, value: String(level.nivel) }));

  React.useEffect(() => {
    if (!reorderingLessonsRef.current) setOrderedLessons(data.lessons);
  }, [data.lessons]);

  React.useEffect(() => {
    const amount = parsePrice(courseForm.precioMensual);
    if (!courseDialog || !isProfessor || amount === null || amount <= 0) {
      setEarningsPreview({ data: null, error: null, loading: false });
      return undefined;
    }
    setEarningsPreview((current) => ({ ...current, error: null, loading: true }));
    const timer = setTimeout(() => {
      Meteor.call("cursos.ganancias.preview", amount, courseForm.moneda, (error, result) => {
        if (error) {
          setEarningsPreview({ data: null, error: error.reason || error.message, loading: false });
          return;
        }
        setEarningsPreview({ data: result, error: null, loading: false });
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [courseDialog, courseForm.moneda, courseForm.precioMensual, isProfessor]);

  const run = React.useCallback(async (key, action, successMessage) => {
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
  }, []);

  const saveCourse = async () => {
    const price = parsePrice(courseForm.precioMensual);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("Precio inválido", "Introduce un precio mensual mayor que cero. Puedes usar la coma decimal, por ejemplo 12,50.");
      return;
    }
    if (!courseForm.categoriaEvaluacionId || !courseForm.nivelEvaluacion) {
      Alert.alert("Datos incompletos", "Selecciona la categoría y el nivel requerido del curso.");
      return;
    }
    const result = await run(
      "course",
      async () => {
        const payload = { ...courseForm, precioMensual: price };
        payload.categoriaEvaluacionId = normalizeCategoryId(courseForm.categoriaEvaluacionId) || undefined;
        payload.nivelEvaluacion = payload.categoriaEvaluacionId ? Number(courseForm.nivelEvaluacion || courseForm.nivel) : undefined;
        if (coverAsset) {
          const mimeType = inferImageMimeType(coverAsset);
          const uploadedCover = await callMethod("images.upload", {
            base64: coverAsset.base64,
            name: coverAsset.fileName || `portada_${Date.now()}.jpg`,
            size: coverAsset.fileSize || 0,
            type: mimeType,
          }, {
            category: "COURSE",
            channel: "COURSES",
            source: "CoursesManagement.native.jsx",
            sourceApp: "mobile",
            type: "COURSE_COVER",
          });
          console.log("[COURSE_COVER] URL devuelta por images.upload:", uploadedCover.url);
          payload.portadaFileId = uploadedCover.fileId;
          payload.portadaUrl = uploadedCover.url;
        }
        return editingCourseId ? callMethod("cursos.actualizar", editingCourseId, payload) : callMethod("cursos.crear", payload);
      },
      editingCourseId ? "Curso actualizado." : "Curso creado como borrador.",
    );
    if (result?.success) {
      setCourseForm(EMPTY_COURSE);
      setCoverAsset(null);
      setCourseDialog(false);
      setSelectedCourseId(editingCourseId || result.courseId);
      setEditingCourseId(null);
    }
  };

  const openCourseDialog = (course = null) => {
    setEditingCourseId(course?._id || null);
    setCourseForm(course ? {
      categoria: course.categoria || "",
      categoriaEvaluacionId: normalizeCategoryId(course.categoriaEvaluacionId),
      descripcion: course.descripcion || "",
      moneda: course.moneda || "CUP",
      nivel: course.nivel || "",
      nivelEvaluacion: course.nivelEvaluacion || (course.categoriaEvaluacionId ? course.nivel : ""),
      portadaFileId: course.portadaFileId || "",
      portadaUrl: course.portadaUrl || "",
      precioMensual: String(course.precioMensual || ""),
      titulo: course.titulo || "",
    } : EMPTY_COURSE);
    setCoverAsset(null);
    setCourseDialog(true);
  };

  const selectCourseCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges !== "limited") {
      Alert.alert("Permiso requerido", "Autoriza el acceso a la galería para seleccionar la portada.");
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (selection.canceled || !selection.assets?.[0]) return;
    if (!selection.assets[0].base64) {
      Alert.alert("No se pudo cargar", "La imagen seleccionada no contiene datos para subir.");
      return;
    }
    setCoverAsset(selection.assets[0]);
  };

  const deleteCourse = (course) => {
    Alert.alert(
      "Eliminar curso",
      `Se eliminarán el curso, sus lecciones y sus videos. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const result = await run(
              `delete-course-${course._id}`,
              () => callMethod("cursos.eliminar", course._id),
              "Curso eliminado.",
            );
            if (result?.success) {
              if (selectedCourseId === course._id) setSelectedCourseId(null);
              if (editingCourseId === course._id) setEditingCourseId(null);
            }
          },
        },
      ],
    );
  };

  const deleteVideo = (lesson) => {
    Alert.alert(
      "Eliminar video",
      `Se eliminará el video de "${lesson.titulo}". Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => run(
            `delete-video-${lesson._id}`,
            () => callMethod("cursos.media.eliminar", lesson._id),
            "Video eliminado.",
          ),
        },
      ],
    );
  };

  const saveLesson = async () => {
    const result = await run("lesson", () => editingLessonId
      ? callMethod("cursos.lecciones.actualizar", editingLessonId, lessonForm)
      : callMethod("cursos.lecciones.crear", selectedCourseId, lessonForm), editingLessonId ? "Lección actualizada." : "Lección creada.");
    if (result?.success || result?.lessonId) {
      setLessonForm(EMPTY_LESSON);
      setLessonDialog(false);
      setEditingLessonId(null);
    }
  };

  const openLessonDialog = (lesson = null) => {
    setEditingLessonId(lesson?._id || null);
    setLessonForm(lesson ? { descripcion: lesson.descripcion || "", titulo: lesson.titulo || "" } : EMPTY_LESSON);
    setLessonDialog(true);
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

  const reorderLessons = React.useCallback(async ({ data: reorderedLessons, from, to }) => {
    setOrderedLessons(reorderedLessons);
    if (from === to) {
      reorderingLessonsRef.current = false;
      return;
    }
    const orderValues = data.lessons.map((lesson) => Number(lesson.orden)).sort((left, right) => left - right);
    const result = await run("reorder-lessons", () => Promise.all(reorderedLessons.map((lesson, index) => {
      const orden = orderValues[index] ?? index + 1;
      return Number(lesson.orden) === orden ? Promise.resolve() : callMethod("cursos.lecciones.actualizar", lesson._id, { orden });
    })));
    reorderingLessonsRef.current = false;
    if (!result) setOrderedLessons(data.lessons);
  }, [data.lessons, run]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Gestión de cursos" subtitle={isProfessor ? "Panel del profesor" : "Supervisión administrativa"} showBackButton backHref="/(normal)/Main" overlapContent />
      <NestableScrollContainer contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
        <LinearGradient colors={theme.dark ? ["#0e3042", "#10202b", "#2a210d"] : ["#dff4fb", "#ffffff", "#fff3d6"]} style={[styles.hero, { borderColor: palette.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.dark ? "rgba(125,211,252,0.12)" : "rgba(3,105,161,0.09)" }]}><IconButton icon="school-outline" iconColor={palette.accent} size={28} /></View>
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={[styles.pageTitle, { color: palette.text }]}>{isProfessor ? "Tu estudio" : "Academia VIDKAR"}</Text>
            <Text style={[styles.heroText, { color: palette.muted }]}>{isProfessor ? "Diseña, publica y organiza experiencias de aprendizaje." : "Supervisa el catálogo y la actividad del equipo docente."}</Text>
          </View>
          <View style={styles.heroMetric}><Text style={[styles.heroMetricValue, { color: palette.text }]}>{data.courses.length}</Text><Text style={[styles.heroMetricLabel, { color: palette.muted }]}>cursos</Text></View>
        </LinearGradient>

        {data.loading && data.courses.length === 0 ? <ActivityIndicator /> : null}
        {data.courses.map((course) => (
          <Pressable key={course._id} onPress={() => setSelectedCourseId(course._id)} accessibilityRole="button" accessibilityLabel={`Abrir clases de ${course.titulo}`} style={styles.courseCardPressable}>
            <Surface style={[styles.courseRow, { backgroundColor: palette.card, borderColor: selectedCourseId === course._id ? palette.accent : palette.border }]} elevation={1}>
            <View style={styles.courseCopy}>
              <View style={styles.courseMeta}><Text style={[styles.courseCategory, { color: palette.accent }]}>{String(course.categoria || "CURSO").toUpperCase()}</Text><View style={[styles.statusDot, { backgroundColor: course.publicado ? "#22c55e" : "#f59e0b" }]} /><Text style={[styles.statusText, { color: palette.muted }]}>{course.publicado ? "Publicado" : "Borrador"}</Text></View>
              <Text variant="titleMedium" style={[styles.courseTitle, { color: palette.text }]}>{course.titulo}</Text>
              <Text style={{ color: palette.muted }}>{course.profesorNombre}</Text>
              <Text style={[styles.coursePrice, { color: palette.primary }]}>{Number(course.precioMensual).toFixed(2)} {course.moneda}<Text style={[styles.coursePeriod, { color: palette.muted }]}> / mes</Text></Text>
            </View>
            <Pressable style={styles.courseDeleteAction} onPress={(event) => { event?.stopPropagation?.(); deleteCourse(course); }} disabled={Boolean(workingKey)} accessibilityRole="button" accessibilityLabel={`Eliminar ${course.titulo}`}>
              <IconButton icon="delete-outline" iconColor="#f87171" size={18} style={styles.compactIconButton} />
            </Pressable>
            <Pressable style={styles.courseActions} onPress={(event) => event.stopPropagation()}>
              <View style={styles.courseActionGroup}>
                {course.profesorId === Meteor.userId() || isAdmin || isPrincipalAdmin ? <Button compact mode="contained-tonal" icon="pencil-outline" labelStyle={styles.compactButtonLabel} onPress={(event) => { event?.stopPropagation?.(); openCourseDialog(course); }}>Editar</Button> : null}
              </View>
              <View style={styles.courseActionGroup}>
                <Button compact mode={selectedCourseId === course._id ? "contained" : "outlined"} icon="book-open-page-variant" labelStyle={styles.compactButtonLabel} onPress={() => setSelectedCourseId(course._id)}>Clases</Button>
                <Switch
                  value={Boolean(course.publicado)}
                  disabled={workingKey === `course-${course._id}`}
                  onValueChange={(value) => run(`course-${course._id}`, () => callMethod("cursos.publicar", course._id, value))}
                />
              </View>
            </Pressable>
          </Surface>
          </Pressable>
        ))}
        {data.courses.length === 0 && !data.loading ? <Text style={[styles.empty, { color: palette.muted }]}>No hay cursos registrados.</Text> : null}

        {selectedCourse ? (
          <View style={styles.lessonsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>{selectedCourse.titulo}</Text>
                <Text style={{ color: palette.muted }}>{data.lessons.length} lecciones</Text>
              </View>
              <Button compact mode="contained-tonal" icon="plus" labelStyle={styles.compactButtonLabel} style={styles.lessonAddButton} onPress={() => openLessonDialog()}>Lección</Button>
            </View>
            <NestableDraggableFlatList
              data={orderedLessons}
              keyExtractor={(lesson) => lesson._id}
              activationDistance={8}
              removeClippedSubviews={false}
              style={styles.lessonDraggableList}
              onDragBegin={() => { reorderingLessonsRef.current = true; }}
              onDragEnd={reorderLessons}
              contentContainerStyle={styles.lessonList}
              renderItem={({ item: lesson, drag, isActive }) => (
                <Pressable onLongPress={orderedLessons.length > 1 ? drag : undefined} delayLongPress={180} disabled={Boolean(workingKey)} accessibilityRole="button" accessibilityLabel={orderedLessons.length > 1 ? `Mantén pulsada la lección ${lesson.titulo} para reordenarla` : lesson.titulo}>
                <Surface style={[styles.lessonCard, { backgroundColor: palette.card, borderColor: isActive ? palette.accent : palette.border }, isActive && styles.lessonCardActive]} elevation={isActive ? 4 : 1}>
                  {uploadProgress[lesson._id] !== undefined ? <LinearGradient pointerEvents="none" colors={theme.dark ? ["rgba(56,189,248,0.12)", "rgba(14,165,233,0.26)", "rgba(245,158,11,0.22)"] : ["rgba(14,165,233,0.08)", "rgba(14,165,233,0.18)", "rgba(245,158,11,0.24)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.lessonUploadProgress, { width: `${Math.max(0, Math.min(1, uploadProgress[lesson._id])) * 100}%` }]} /> : null}
                  <View style={styles.lessonMain}>
                    <View style={[styles.lessonIndex, { backgroundColor: theme.dark ? "rgba(125,211,252,0.1)" : "rgba(3,105,161,0.08)" }]}><Text style={{ color: palette.accent, fontWeight: "900" }}>{String(lesson.orden).padStart(2, "0")}</Text></View>
                    <View style={styles.lessonCopy}>
                      <Text style={[styles.lessonTitle, { color: palette.text }]} numberOfLines={1}>{lesson.titulo}</Text>
                      <Text style={[styles.lessonMeta, { color: palette.muted }]}>
                        {uploadProgress[lesson._id] !== undefined
                          ? `Subiendo ${Math.round(uploadProgress[lesson._id] * 100)}%`
                          : lesson?.video?.estado === "LISTO"
                            ? `${((lesson?.video?.size || 0) / 1024 / 1024).toFixed(1)} MB`
                            : lesson?.video?.estado || "Sin video"}
                      </Text>
                    </View>
                    <Button compact mode="contained-tonal" icon="upload" labelStyle={styles.lessonUploadLabel} contentStyle={styles.lessonUploadContent} style={styles.lessonUploadButton} loading={workingKey === `upload-${lesson._id}`} disabled={Boolean(workingKey)} onPress={() => selectAndUploadVideo(lesson)}>Subir video</Button>
                  </View>
                  <View style={styles.lessonActions}>
                    <View style={styles.lessonActionGroup}>
                      <IconButton mode="contained-tonal" icon="pencil-outline" size={17} style={styles.lessonIconButton} disabled={Boolean(workingKey)} onPress={() => openLessonDialog(lesson)} accessibilityLabel={`Editar ${lesson.titulo}`} />
                      {lesson?.video?.fileId ? <IconButton mode="contained-tonal" icon="delete-outline" iconColor="#f87171" size={17} style={styles.lessonIconButton} disabled={Boolean(workingKey)} onPress={() => deleteVideo(lesson)} accessibilityLabel="Eliminar video" /> : null}
                    </View>
                    <View style={styles.lessonPublishGroup}>
                      <Text style={[styles.lessonPublishLabel, { color: palette.muted }]}>{lesson.publicada ? "Publicada" : "Oculta"}</Text>
                      <Switch
                        value={Boolean(lesson.publicada)}
                        disabled={lesson?.video?.estado !== "LISTO" || Boolean(workingKey)}
                        onValueChange={(value) => run(`lesson-${lesson._id}`, () => callMethod("cursos.lecciones.publicar", lesson._id, value))}
                      />
                    </View>
                  </View>
                </Surface>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={[styles.empty, { color: palette.muted }]}>Crea la primera lección del curso.</Text>}
            />
            <Button icon="eye-outline" mode="outlined" labelStyle={styles.previewButtonLabel} style={styles.previewButton} contentStyle={styles.previewButtonContent} onPress={() => router.push(`/(normal)/CursoDetalle?courseId=${encodeURIComponent(selectedCourse._id)}`)}>Vista del curso</Button>
          </View>
        ) : null}
      </NestableScrollContainer>

      {isProfessor ? <FAB icon="plus" label="Curso" style={styles.fab} onPress={() => openCourseDialog()} /> : null}
      <Portal>
        <Dialog visible={courseDialog} onDismiss={() => !workingKey && setCourseDialog(false)} style={[styles.dialog, dialogSize, { borderColor: palette.border }]}>
          <BlurView pointerEvents="none" intensity={55} tint={theme.dark ? "dark" : "light"} experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? "rgba(7,16,24,0.72)" : "rgba(255,255,255,0.68)" }]} />
          <View style={styles.dialogHeader}><View style={styles.dialogHeaderCopy}><Text style={[styles.dialogEyebrow, { color: palette.accent }]}>CONFIGURACIÓN</Text><Text variant="headlineSmall" style={[styles.dialogTitle, { color: palette.text }]}>{editingCourseId ? "Editar curso" : "Nuevo curso"}</Text><Text style={[styles.dialogSubtitle, { color: palette.muted }]}>Define la información visible y el precio mensual del curso.</Text></View><IconButton icon="close" mode="contained-tonal" style={styles.dialogClose} onPress={() => setCourseDialog(false)} disabled={Boolean(workingKey)} /></View>
          <Dialog.ScrollArea style={styles.dialogScroll}><ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <TextInput label="Título" mode="outlined" left={<TextInput.Icon icon="format-title" />} value={courseForm.titulo} onChangeText={(value) => setCourseForm((current) => ({ ...current, titulo: value }))} style={styles.formInput} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <TextInput label="Descripción" mode="outlined" left={<TextInput.Icon icon="text-long" />} multiline value={courseForm.descripcion} onChangeText={(value) => setCourseForm((current) => ({ ...current, descripcion: value }))} style={[styles.formInput, styles.textArea]} contentStyle={[styles.inputContent, styles.textAreaContent]} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <View style={styles.dropdownGroup}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Categoría de evaluación</Text>
                <Dropdown
                  accessibilityLabel="Categoría de evaluación"
                  data={categoryOptions}
                  labelField="label"
                  valueField="value"
                  value={courseForm.categoriaEvaluacionId}
                  onChange={(item) => setCourseForm((current) => ({ ...current, categoria: item.label, categoriaEvaluacionId: item.value, nivel: "", nivelEvaluacion: "" }))}
                  placeholder="Selecciona una categoría"
                  style={[styles.dropdown, { backgroundColor: theme.dark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.92)", borderColor: palette.border }]}
                  containerStyle={{ backgroundColor: palette.card }}
                  selectedTextStyle={[styles.dropdownText, { color: palette.text }]}
                  placeholderStyle={[styles.dropdownText, { color: palette.muted }]}
                  itemTextStyle={[styles.dropdownText, { color: palette.text }]}
                  activeColor={theme.dark ? "#12343a" : "#dff8f3"}
                />
              </View>
              {courseForm.categoriaEvaluacionId ? <View style={styles.dropdownGroup}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Nivel requerido</Text>
                <Dropdown
                  accessibilityLabel="Nivel requerido para el curso"
                  data={levelOptions}
                  labelField="label"
                  valueField="value"
                  value={String(courseForm.nivelEvaluacion || "")}
                  onChange={(item) => setCourseForm((current) => ({ ...current, nivel: item.value, nivelEvaluacion: item.value }))}
                  placeholder="Selecciona un nivel"
                  style={[styles.dropdown, { backgroundColor: theme.dark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.92)", borderColor: palette.border }]}
                  containerStyle={{ backgroundColor: palette.card }}
                  selectedTextStyle={[styles.dropdownText, { color: palette.text }]}
                  placeholderStyle={[styles.dropdownText, { color: palette.muted }]}
                  itemTextStyle={[styles.dropdownText, { color: palette.text }]}
                  activeColor={theme.dark ? "#12343a" : "#dff8f3"}
                />
              </View> : null}
            </View>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <View style={styles.sectionLabelRow}><Text style={[styles.fieldLabel, { color: palette.text }]}>Precio mensual</Text><Text style={[styles.fieldHint, { color: palette.muted }]}>Importe y moneda de cobro</Text></View>
              <View style={[styles.priceInputGroup, { backgroundColor: theme.dark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.92)", borderColor: palette.border }]}>
                <TextInput
                  accessibilityLabel="Importe mensual"
                  activeUnderlineColor="transparent"
                  keyboardType="decimal-pad"
                  left={<TextInput.Icon icon="cash" />}
                  mode="flat"
                  placeholder="Importe"
                  underlineColor="transparent"
                  value={courseForm.precioMensual}
                  onChangeText={(value) => setCourseForm((current) => ({ ...current, precioMensual: normalizePriceInput(value) }))}
                  style={styles.priceAmountInput}
                  contentStyle={styles.priceAmountContent}
                  theme={inputTheme}
                />
                <View style={[styles.priceDivider, { backgroundColor: palette.border }]} />
                <View style={styles.priceCurrencySelector} accessibilityLabel="Moneda de cobro" accessibilityRole="radiogroup">
                  {["CUP", "UYU", "USD"].map((currency) => {
                    const selected = courseForm.moneda === currency;
                    return (
                      <Pressable
                        accessibilityLabel={`Seleccionar ${currency}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={currency}
                        onPress={() => setCourseForm((current) => ({ ...current, moneda: currency }))}
                        style={[styles.priceCurrencyOption, selected && { backgroundColor: palette.accent }]}
                      >
                        <Text style={[styles.priceCurrencyText, { color: selected ? "#ffffff" : palette.text }]}>{currency}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {isProfessor ? (
                <View style={[styles.earningsPreview, { backgroundColor: theme.dark ? "rgba(3,105,161,0.12)" : "rgba(14,116,144,0.07)", borderColor: palette.border }]}>
                  <View style={styles.earningsPreviewHeader}>
                    <IconButton icon="calculator-variant-outline" iconColor={palette.accent} size={20} style={styles.earningsPreviewIcon} />
                    <View style={styles.earningsPreviewCopy}>
                      <Text style={[styles.fieldLabel, { color: palette.text }]}>Tu ganancia estimada</Text>
                      <Text style={[styles.fieldHint, { color: palette.muted }]}>El cálculo definitivo se fija cuando se confirma la compra.</Text>
                    </View>
                  </View>
                  {earningsPreview.loading ? <ActivityIndicator size="small" /> : earningsPreview.error ? (
                    <Text style={[styles.previewError, { color: "#dc2626" }]}>{earningsPreview.error}</Text>
                  ) : earningsPreview.data ? (
                    <View style={styles.earningsPreviewMetrics}>
                      <View style={styles.previewMetric}><Text style={[styles.previewMetricLabel, { color: palette.muted }]}>Cliente</Text><Text style={[styles.previewMetricValue, { color: palette.text }]}>{parsePrice(courseForm.precioMensual).toFixed(2)} {courseForm.moneda}</Text></View>
                      <View style={styles.previewMetric}><Text style={[styles.previewMetricLabel, { color: palette.muted }]}>Comisión</Text><Text style={[styles.previewMetricValue, { color: palette.text }]}>{earningsPreview.data.commissionPercent}%</Text></View>
                      <View style={styles.previewMetric}><Text style={[styles.previewMetricLabel, { color: palette.muted }]}>Recibirás</Text><Text style={[styles.previewMetricValue, { color: palette.primary }]}>{Number(earningsPreview.data.professorAmountUsd).toFixed(2)} USD</Text></View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <View style={styles.coverUploadHeader}><View style={styles.coverUploadCopy}><Text style={[styles.fieldLabel, { color: palette.text }]}>Portada del curso</Text><Text style={[styles.fieldHint, { color: palette.muted }]}>Sube una imagen horizontal para el catálogo.</Text></View><Button compact mode="outlined" icon="image-plus" onPress={selectCourseCover}>Seleccionar</Button></View>
              {coverAsset?.uri || courseForm.portadaUrl ? <Image source={{ uri: coverAsset?.uri || courseForm.portadaUrl }} style={styles.coverPreview} resizeMode="cover" /> : <View style={[styles.coverPlaceholder, { backgroundColor: theme.dark ? "rgba(125,211,252,0.08)" : "rgba(3,105,161,0.06)", borderColor: palette.border }]}><IconButton icon="image-outline" iconColor={palette.accent} size={26} /><Text style={[styles.coverPlaceholderText, { color: palette.muted }]}>Aún no has seleccionado una portada</Text></View>}
            </View>
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}><Button mode="text" onPress={() => setCourseDialog(false)} style={styles.secondaryAction} contentStyle={styles.actionContent} labelStyle={[styles.actionLabel, { color: palette.accent }]}>Cancelar</Button><Button mode="contained" icon="check" disabled={!courseForm.categoriaEvaluacionId || !courseForm.nivelEvaluacion} onPress={saveCourse} loading={workingKey === "course"} style={styles.primaryAction} contentStyle={styles.actionContent} labelStyle={[styles.actionLabel, styles.primaryActionLabel]}>{editingCourseId ? "Guardar" : "Crear curso"}</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={lessonDialog} onDismiss={() => !workingKey && setLessonDialog(false)} style={[styles.dialog, dialogSize, { borderColor: palette.border }]}>
          <BlurView pointerEvents="none" intensity={55} tint={theme.dark ? "dark" : "light"} experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? "rgba(7,16,24,0.72)" : "rgba(255,255,255,0.68)" }]} />
          <View style={styles.dialogHeader}><View style={styles.dialogHeaderCopy}><Text style={[styles.dialogEyebrow, { color: palette.accent }]}>CONTENIDO</Text><Text variant="headlineSmall" style={[styles.dialogTitle, { color: palette.text }]}>{editingLessonId ? "Editar lección" : "Nueva lección"}</Text><Text style={[styles.dialogSubtitle, { color: palette.muted }]}>Organiza el contenido que verá el estudiante.</Text></View><IconButton icon="close" mode="contained-tonal" style={styles.dialogClose} onPress={() => setLessonDialog(false)} disabled={Boolean(workingKey)} /></View>
          <Dialog.ScrollArea style={styles.dialogScroll}><ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <TextInput label="Título" mode="outlined" left={<TextInput.Icon icon="format-title" />} value={lessonForm.titulo} onChangeText={(value) => setLessonForm((current) => ({ ...current, titulo: value }))} style={styles.formInput} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <TextInput label="Descripción" mode="outlined" left={<TextInput.Icon icon="text-long" />} multiline value={lessonForm.descripcion} onChangeText={(value) => setLessonForm((current) => ({ ...current, descripcion: value }))} style={[styles.formInput, styles.textArea]} contentStyle={[styles.inputContent, styles.textAreaContent]} outlineStyle={styles.inputOutline} theme={inputTheme} />
            </View>
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}><Button mode="text" onPress={() => setLessonDialog(false)} style={styles.secondaryAction} contentStyle={styles.actionContent} labelStyle={[styles.actionLabel, { color: palette.accent }]}>Cancelar</Button><Button mode="contained" icon={editingLessonId ? "check" : "plus"} onPress={saveLesson} loading={workingKey === "lesson"} style={styles.primaryAction} contentStyle={styles.actionContent} labelStyle={[styles.actionLabel, styles.primaryActionLabel]}>{editingLessonId ? "Guardar" : "Crear"}</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
    root: { flex: 1 }, content: { gap: 12, padding: 16, paddingBottom: 100 }, pageTitle: { fontWeight: "900" },
    hero: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 6, overflow: "hidden", padding: 16 }, heroIcon: { alignItems: "center", borderRadius: 8, height: 52, justifyContent: "center", width: 52 }, heroCopy: { flex: 1, gap: 3 }, heroText: { fontSize: 13, lineHeight: 18 }, heroMetric: { alignItems: "center", minWidth: 52 }, heroMetricValue: { fontSize: 24, fontWeight: "900" }, heroMetricLabel: { fontSize: 11 },
    courseCardPressable: { borderRadius: 8 }, courseRow: { borderRadius: 8, borderWidth: 1, gap: 8, overflow: "hidden", padding: 12, position: "relative" }, courseCopy: { gap: 3, paddingRight: 34 }, courseTitle: { fontSize: 15, fontWeight: "850" }, courseDeleteAction: { position: "absolute", right: 7, top: 7 }, courseActions: { alignItems: "center", borderTopColor: "rgba(148,163,184,0.14)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: 7 }, courseActionGroup: { alignItems: "center", flexDirection: "row", gap: 4 }, courseMeta: { alignItems: "center", flexDirection: "row", gap: 5 }, courseCategory: { fontSize: 9, fontWeight: "900" }, statusDot: { borderRadius: 4, height: 6, marginLeft: 3, width: 6 }, statusText: { fontSize: 10 }, coursePrice: { fontSize: 15, fontWeight: "900" }, coursePeriod: { fontSize: 10, fontWeight: "500" }, compactButtonLabel: { fontSize: 11, marginHorizontal: 4, marginVertical: 0 }, compactIconButton: { margin: 0 },
    empty: { padding: 24, textAlign: "center" }, lessonsSection: { marginTop: 18 }, sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, sectionCopy: { flex: 1, gap: 2 }, sectionTitle: { fontSize: 18, fontWeight: "850" }, lessonAddButton: { borderRadius: 20 },
    lessonDraggableList: { marginHorizontal: -8, overflow: "visible" }, lessonList: { gap: 10, overflow: "visible", paddingHorizontal: 8, paddingVertical: 8 }, lessonCard: { borderRadius: 8, borderWidth: 1, gap: 9, minHeight: 96, padding: 10, shadowColor: "#000000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.12, shadowRadius: 4 }, lessonCardActive: { elevation: 10, opacity: 0.98, shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.34, shadowRadius: 12, transform: [{ scale: 1.018 }], zIndex: 20 }, lessonUploadProgress: { bottom: 0, left: 0, position: "absolute", top: 0 }, lessonMain: { alignItems: "center", flexDirection: "row", gap: 9, minHeight: 38 }, lessonIndex: { alignItems: "center", borderRadius: 8, height: 34, justifyContent: "center", width: 34 }, lessonCopy: { flex: 1, gap: 3, minWidth: 0 }, lessonTitle: { fontSize: 13, fontWeight: "800" }, lessonMeta: { fontSize: 11 }, lessonUploadButton: { borderRadius: 18, flexShrink: 0 }, lessonUploadContent: { height: 32, paddingHorizontal: 7 }, lessonUploadLabel: { fontSize: 10, fontWeight: "800", marginHorizontal: 0, marginVertical: 0 }, lessonActions: { alignItems: "center", borderTopColor: "rgba(148,163,184,0.14)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: 7 }, lessonActionGroup: { alignItems: "center", flexDirection: "row", gap: 5 }, lessonPublishGroup: { alignItems: "center", flexDirection: "row", gap: 4 }, lessonPublishLabel: { fontSize: 10, fontWeight: "700" }, lessonIconButton: { margin: 0 }, previewButton: { borderRadius: 22, marginTop: 12 }, previewButtonContent: { minHeight: 42 }, previewButtonLabel: { fontSize: 12, fontWeight: "800" },
    fab: { bottom: 22, position: "absolute", right: 18 },
    dialog: { borderRadius: 16, borderWidth: 1, marginVertical: 16, overflow: "hidden" },
    dialogHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between", paddingLeft: 16, paddingRight: 10, paddingTop: 12 },
    dialogHeaderCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
    dialogClose: { flexShrink: 0, margin: 0, marginTop: -2 },
    dialogEyebrow: { fontSize: 9, fontWeight: "900" },
    dialogTitle: { fontSize: 24, fontWeight: "900", lineHeight: 27 },
    dialogSubtitle: { fontSize: 11, lineHeight: 15, marginTop: 1 },
    dialogScroll: { borderBottomWidth: 0, borderTopWidth: 0, flexShrink: 1, minHeight: 0 },
    dialogContent: { gap: 8, paddingBottom: 4, paddingTop: 8 },
    dialogActions: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "flex-end", paddingBottom: 10, paddingHorizontal: 12, paddingTop: 6 },
    actionContent: { height: 36, paddingHorizontal: 10 },
    actionLabel: { fontSize: 12, fontWeight: "700", marginHorizontal: 0, marginVertical: 0 },
    primaryAction: { borderRadius: 20, minWidth: 104 },
    primaryActionLabel: { color: "#ffffff" },
    secondaryAction: { minWidth: 78 },
    formRow: { flexDirection: "row", gap: 10 },
    formField: { flex: 1 },
    formPanel: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 9 },
    sectionLabelRow: { gap: 1 },
    formInput: { minHeight: 48 },
    inputContent: { fontSize: 14, paddingVertical: 8 },
    inputOutline: { borderRadius: 12, borderWidth: 1 },
    textArea: { minHeight: 68 },
    textAreaContent: { minHeight: 68, paddingVertical: 8 },
    dropdownGroup: { gap: 4 },
    dropdown: { borderRadius: 12, borderWidth: 1, minHeight: 48, paddingHorizontal: 10 },
    dropdownText: { fontSize: 13 },
    priceSection: { gap: 9 },
    priceInputGroup: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", minHeight: 50, overflow: "hidden" },
    priceAmountInput: { backgroundColor: "transparent", flex: 1, margin: 0 },
    priceAmountContent: { fontSize: 14, paddingHorizontal: 0 },
    priceDivider: { height: 26, width: 1 },
    priceCurrencySelector: { alignItems: "center", flexDirection: "row", gap: 3, paddingHorizontal: 5 },
    priceCurrencyOption: { alignItems: "center", borderRadius: 8, justifyContent: "center", minHeight: 36, minWidth: 38, paddingHorizontal: 6 },
    priceCurrencyText: { fontSize: 11, fontWeight: "900" },
    earningsPreview: { borderRadius: 8, borderWidth: 1, gap: 7, marginTop: 8, padding: 9 },
    earningsPreviewHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
    earningsPreviewIcon: { margin: 0 },
    earningsPreviewCopy: { flex: 1, gap: 2 },
    earningsPreviewMetrics: { flexDirection: "row", gap: 8 },
    previewMetric: { flex: 1, gap: 3, minWidth: 0 },
    previewMetricLabel: { fontSize: 9, fontWeight: "700" },
    previewMetricValue: { fontSize: 11, fontWeight: "900" },
    previewError: { fontSize: 11, lineHeight: 15 },
    coverUploadHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
    coverUploadCopy: { flex: 1, gap: 2 },
    coverPreview: { borderRadius: 10, height: 90, marginTop: 7, width: "100%" },
    coverPlaceholder: { alignItems: "center", borderRadius: 10, borderStyle: "dashed", borderWidth: 1, height: 70, justifyContent: "center", marginTop: 7 },
    coverPlaceholderText: { fontSize: 10 },
    fieldLabel: { fontSize: 11, fontWeight: "800" },
    fieldHint: { fontSize: 10, lineHeight: 13 },
});