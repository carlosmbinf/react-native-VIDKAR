import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Divider, FAB, IconButton, Portal, Surface, Switch, Text, TextInput, useTheme } from "react-native-paper";

import { uploadCourseVideo } from "../../services/courses/courseMedia.native";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCollection, LeccionesCursoCollection } from "../collections/collections";

const Meteor = MeteorBase;
const EMPTY_COURSE = { categoria: "", descripcion: "", moneda: "CUP", nivel: "", portadaFileId: "", portadaUrl: "", precioMensual: "", titulo: "" };
const EMPTY_LESSON = { descripcion: "", titulo: "" };
const callMethod = (name, ...args) => new Promise((resolve, reject) => Meteor.call(name, ...args, (error, result) => error ? reject(error) : resolve(result)));

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

  React.useEffect(() => {
    const amount = Number(courseForm.precioMensual);
    if (!courseDialog || !isProfessor || !Number.isFinite(amount) || amount <= 0) {
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
    const result = await run(
      "course",
      async () => {
        const payload = { ...courseForm, precioMensual: Number(courseForm.precioMensual) };
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
      descripcion: course.descripcion || "",
      moneda: course.moneda || "CUP",
      nivel: course.nivel || "",
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
      <ScrollView contentContainerStyle={styles.content} style={{ marginTop: headerInset + 12 }}>
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
          <Surface key={course._id} style={[styles.courseRow, { backgroundColor: palette.card, borderColor: selectedCourseId === course._id ? palette.accent : palette.border }]} elevation={1}>
            <View style={styles.courseCopy}>
              <View style={styles.courseMeta}><Text style={[styles.courseCategory, { color: palette.accent }]}>{String(course.categoria || "CURSO").toUpperCase()}</Text><View style={[styles.statusDot, { backgroundColor: course.publicado ? "#22c55e" : "#f59e0b" }]} /><Text style={[styles.statusText, { color: palette.muted }]}>{course.publicado ? "Publicado" : "Borrador"}</Text></View>
              <Text variant="titleMedium" style={[styles.courseTitle, { color: palette.text }]}>{course.titulo}</Text>
              <Text style={{ color: palette.muted }}>{course.profesorNombre}</Text>
              <Text style={[styles.coursePrice, { color: palette.primary }]}>{Number(course.precioMensual).toFixed(2)} {course.moneda}<Text style={[styles.coursePeriod, { color: palette.muted }]}> / mes</Text></Text>
            </View>
            <View style={styles.courseActions}>
              {course.profesorId === Meteor.userId() ? <IconButton mode="contained-tonal" icon="pencil-outline" size={19} onPress={() => openCourseDialog(course)} /> : null}
              <IconButton mode="contained-tonal" icon="delete-outline" iconColor="#dc2626" size={19} disabled={Boolean(workingKey)} onPress={() => deleteCourse(course)} />
              <Button compact mode={selectedCourseId === course._id ? "contained" : "outlined"} icon="book-open-page-variant" onPress={() => setSelectedCourseId(course._id)}>Clases</Button>
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
                    <View style={[styles.lessonIndex, { backgroundColor: theme.dark ? "rgba(125,211,252,0.1)" : "rgba(3,105,161,0.08)" }]}><Text style={{ color: palette.accent, fontWeight: "900" }}>{String(lesson.orden).padStart(2, "0")}</Text></View>
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
                    {lesson?.video?.fileId ? <IconButton icon="delete-outline" iconColor="#dc2626" size={18} disabled={Boolean(workingKey)} onPress={() => deleteVideo(lesson)} /> : null}
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
        <Dialog visible={courseDialog} onDismiss={() => !workingKey && setCourseDialog(false)} style={[styles.dialog, { borderColor: palette.border }]}>
          <BlurView pointerEvents="none" intensity={55} tint={theme.dark ? "dark" : "light"} experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? "rgba(7,16,24,0.72)" : "rgba(255,255,255,0.68)" }]} />
          <View style={styles.dialogHeader}><View style={styles.dialogHeaderCopy}><Text style={[styles.dialogEyebrow, { color: palette.accent }]}>CONFIGURACIÓN</Text><Text variant="headlineSmall" style={[styles.dialogTitle, { color: palette.text }]}>{editingCourseId ? "Editar curso" : "Nuevo curso"}</Text><Text style={[styles.dialogSubtitle, { color: palette.muted }]}>Define la información visible y el precio mensual del curso.</Text></View><IconButton icon="close" mode="contained-tonal" style={styles.dialogClose} onPress={() => setCourseDialog(false)} disabled={Boolean(workingKey)} /></View>
          <Dialog.ScrollArea style={styles.dialogScroll}><ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <TextInput label="Título" mode="outlined" left={<TextInput.Icon icon="format-title" />} value={courseForm.titulo} onChangeText={(value) => setCourseForm((current) => ({ ...current, titulo: value }))} style={styles.formInput} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <TextInput label="Descripción" mode="outlined" left={<TextInput.Icon icon="text-long" />} multiline value={courseForm.descripcion} onChangeText={(value) => setCourseForm((current) => ({ ...current, descripcion: value }))} style={[styles.formInput, styles.textArea]} contentStyle={[styles.inputContent, styles.textAreaContent]} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <View style={styles.formRow}><TextInput style={[styles.formField, styles.formInput]} label="Categoría" mode="outlined" value={courseForm.categoria} onChangeText={(value) => setCourseForm((current) => ({ ...current, categoria: value }))} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} /><TextInput style={[styles.formField, styles.formInput]} label="Nivel" mode="outlined" value={courseForm.nivel} onChangeText={(value) => setCourseForm((current) => ({ ...current, nivel: value }))} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} /></View>
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
                  onChangeText={(value) => setCourseForm((current) => ({ ...current, precioMensual: value }))}
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
                      <View style={styles.previewMetric}><Text style={[styles.previewMetricLabel, { color: palette.muted }]}>Cliente</Text><Text style={[styles.previewMetricValue, { color: palette.text }]}>{Number(courseForm.precioMensual).toFixed(2)} {courseForm.moneda}</Text></View>
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
          <Dialog.Actions style={styles.dialogActions}><Button onPress={() => setCourseDialog(false)} style={styles.secondaryAction} labelStyle={styles.actionLabel}>Cancelar</Button><Button mode="contained" icon="check" onPress={saveCourse} loading={workingKey === "course"} style={styles.primaryAction} labelStyle={styles.actionLabel}>{editingCourseId ? "Guardar" : "Crear curso"}</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={lessonDialog} onDismiss={() => !workingKey && setLessonDialog(false)} style={[styles.dialog, { borderColor: palette.border }]}>
          <BlurView pointerEvents="none" intensity={55} tint={theme.dark ? "dark" : "light"} experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? "rgba(7,16,24,0.72)" : "rgba(255,255,255,0.68)" }]} />
          <View style={styles.dialogHeader}><View style={styles.dialogHeaderCopy}><Text style={[styles.dialogEyebrow, { color: palette.accent }]}>CONTENIDO</Text><Text variant="headlineSmall" style={[styles.dialogTitle, { color: palette.text }]}>Nueva lección</Text><Text style={[styles.dialogSubtitle, { color: palette.muted }]}>Organiza el contenido que verá el estudiante.</Text></View><IconButton icon="close" mode="contained-tonal" style={styles.dialogClose} onPress={() => setLessonDialog(false)} disabled={Boolean(workingKey)} /></View>
          <Dialog.ScrollArea style={styles.dialogScroll}><ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.formPanel, { backgroundColor: theme.dark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.54)", borderColor: palette.border }]}>
              <TextInput label="Título" mode="outlined" left={<TextInput.Icon icon="format-title" />} value={lessonForm.titulo} onChangeText={(value) => setLessonForm((current) => ({ ...current, titulo: value }))} style={styles.formInput} contentStyle={styles.inputContent} outlineStyle={styles.inputOutline} theme={inputTheme} />
              <TextInput label="Descripción" mode="outlined" left={<TextInput.Icon icon="text-long" />} multiline value={lessonForm.descripcion} onChangeText={(value) => setLessonForm((current) => ({ ...current, descripcion: value }))} style={[styles.formInput, styles.textArea]} contentStyle={[styles.inputContent, styles.textAreaContent]} outlineStyle={styles.inputOutline} theme={inputTheme} />
            </View>
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}><Button onPress={() => setLessonDialog(false)} style={styles.secondaryAction} labelStyle={styles.actionLabel}>Cancelar</Button><Button mode="contained" icon="plus" onPress={createLesson} loading={workingKey === "lesson"} style={styles.primaryAction} labelStyle={styles.actionLabel}>Crear</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
    root: { flex: 1 }, content: { gap: 12, padding: 16, paddingBottom: 100 }, pageTitle: { fontWeight: "900" },
    hero: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 6, overflow: "hidden", padding: 16 }, heroIcon: { alignItems: "center", borderRadius: 8, height: 52, justifyContent: "center", width: 52 }, heroCopy: { flex: 1, gap: 3 }, heroText: { fontSize: 13, lineHeight: 18 }, heroMetric: { alignItems: "center", minWidth: 52 }, heroMetricValue: { fontSize: 24, fontWeight: "900" }, heroMetricLabel: { fontSize: 11 },
    courseRow: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 }, courseCopy: { flex: 1, gap: 5 }, courseTitle: { fontWeight: "850" }, courseActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 210 }, courseMeta: { alignItems: "center", flexDirection: "row", gap: 6 }, courseCategory: { fontSize: 10, fontWeight: "900" }, statusDot: { borderRadius: 4, height: 6, marginLeft: 4, width: 6 }, statusText: { fontSize: 11 }, coursePrice: { fontSize: 16, fontWeight: "900" }, coursePeriod: { fontSize: 11, fontWeight: "500" },
    empty: { padding: 24, textAlign: "center" }, lessonsSection: { marginTop: 18 }, sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, sectionCopy: { flex: 1 }, sectionTitle: { fontWeight: "850" },
    lessonList: { borderRadius: 8, borderWidth: 1, overflow: "hidden" }, lessonRow: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 76, padding: 10 }, lessonIndex: { alignItems: "center", borderRadius: 8, height: 36, justifyContent: "center", width: 36 }, lessonCopy: { flex: 1, gap: 3 }, lessonTitle: { fontSize: 14, fontWeight: "800" }, previewButton: { marginTop: 12 },
    orderActions: { alignItems: "center" },
    fab: { bottom: 22, position: "absolute", right: 18 },
    dialog: { borderRadius: 16, borderWidth: 1,  overflow: "hidden" },
    dialogHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between", paddingLeft: 20, paddingRight: 14, paddingTop: 18 },
    dialogHeaderCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
    dialogClose: { flexShrink: 0, margin: 0, marginTop: -2 },
    dialogEyebrow: { fontSize: 10, fontWeight: "900" },
    dialogTitle: { fontWeight: "900", lineHeight: 30 },
    dialogSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 1 },
    dialogScroll: { borderBottomWidth: 0, borderTopWidth: 0 },
    dialogContent: { gap: 12, paddingBottom: 8, paddingTop: 14 },
    dialogActions: { paddingBottom: 14, paddingHorizontal: 18 },
    formRow: { flexDirection: "row", gap: 10 },
    formField: { flex: 1 },
    priceSection: { gap: 9 },
    priceInputGroup: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 58, overflow: "hidden" },
    priceAmountInput: { backgroundColor: "transparent", flex: 1, margin: 0 },
    priceAmountContent: { paddingHorizontal: 0 },
    priceDivider: { height: 30, width: 1 },
    priceCurrencySelector: { alignItems: "center", flexDirection: "row", gap: 3, paddingHorizontal: 5 },
    priceCurrencyOption: { alignItems: "center", borderRadius: 9, justifyContent: "center", minHeight: 40, minWidth: 42, paddingHorizontal: 8 },
    priceCurrencyText: { fontSize: 12, fontWeight: "900" },
    earningsPreview: { borderRadius: 8, borderWidth: 1, gap: 10, marginTop: 12, padding: 12 },
    earningsPreviewHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
    earningsPreviewIcon: { margin: 0 },
    earningsPreviewCopy: { flex: 1, gap: 2 },
    earningsPreviewMetrics: { flexDirection: "row", gap: 8 },
    previewMetric: { flex: 1, gap: 3, minWidth: 0 },
    previewMetricLabel: { fontSize: 10, fontWeight: "700" },
    previewMetricValue: { fontSize: 13, fontWeight: "900" },
    previewError: { fontSize: 12, lineHeight: 17 },
    coverUploadHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    coverUploadCopy: { flex: 1, gap: 2 },
    coverPreview: { aspectRatio: 16 / 9, borderRadius: 12, marginTop: 10, width: "100%" },
    coverPlaceholder: { alignItems: "center", aspectRatio: 16 / 9, borderRadius: 12, borderStyle: "dashed", borderWidth: 1, justifyContent: "center", marginTop: 10 },
    coverPlaceholderText: { fontSize: 12 },
    fieldLabel: { fontSize: 13, fontWeight: "800" },
});