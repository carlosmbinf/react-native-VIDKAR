import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React from "react";
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Divider,
  Icon,
  IconButton,
  Portal,
  RadioButton,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import {
  CursosCategoriasCollection,
  EvaluacionesIASesionesCollection,
} from "../collections/collections";

const Meteor = MeteorBase;
const EMPTY_CATEGORY = {
  activa: true,
  descripcion: "",
  maxPreguntas: 8,
  niveles: [
    { nivel: 1, descripcion: "" },
    { nivel: 2, descripcion: "" },
  ],
  nombre: "",
  promptEvaluador: "",
};

const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});
const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value.toHexString === "function") return value.toHexString();
  const rawValue = String(value).trim();
  const match = rawValue.match(/^ObjectI[dD]\s*\(\s*["']?([a-f\d]{24})["']?\s*\)$/i);
  return match ? match[1] : rawValue;
};
const normalizeEvaluationResponse = (response, questionNumber) => ({
  ...response,
  numeroPregunta: response?.numeroPregunta || questionNumber,
  opciones: Array.isArray(response?.opciones)
    ? response.opciones.map((option) => String(option).trim()).filter(Boolean)
    : [],
  sessionId: normalizeId(response?.sessionId),
});
const formatDate = (value) => value ? new Date(value).toLocaleString("es") : "Sin fecha";
const getHistoryCardVisual = (status, darkMode) => {
  const key = String(status || "").toUpperCase();
  if (key === "COMPLETADA") {
    return {
      accent: darkMode ? "#2dd4bf" : "#0f766e",
      gradient: darkMode
        ? ["rgba(19, 78, 74, 0.95)", "rgba(15, 23, 42, 0.94)"]
        : ["#dff8f3", "#f7fffd"],
      stateBg: darkMode ? "rgba(45, 212, 191, 0.18)" : "rgba(15, 118, 110, 0.14)",
      stateText: darkMode ? "#99f6e4" : "#0f766e",
      stateIcon: "check-circle-outline",
    };
  }
  if (key === "ERROR") {
    return {
      accent: darkMode ? "#f59e0b" : "#b45309",
      gradient: darkMode
        ? ["rgba(120, 53, 15, 0.92)", "rgba(15, 23, 42, 0.94)"]
        : ["#fff4dd", "#fffaf0"],
      stateBg: darkMode ? "rgba(245, 158, 11, 0.18)" : "rgba(180, 83, 9, 0.12)",
      stateText: darkMode ? "#fcd34d" : "#92400e",
      stateIcon: "alert-circle-outline",
    };
  }
  if (key === "CANCELADA") {
    return {
      accent: darkMode ? "#94a3b8" : "#64748b",
      gradient: darkMode
        ? ["rgba(30, 41, 59, 0.94)", "rgba(15, 23, 42, 0.94)"]
        : ["#eef2f7", "#f8fafc"],
      stateBg: darkMode ? "rgba(148, 163, 184, 0.2)" : "rgba(100, 116, 139, 0.12)",
      stateText: darkMode ? "#cbd5e1" : "#475569",
      stateIcon: "close-circle-outline",
    };
  }
  return {
    accent: darkMode ? "#38bdf8" : "#0ea5e9",
    gradient: darkMode
      ? ["rgba(12, 74, 110, 0.94)", "rgba(15, 23, 42, 0.94)"]
      : ["#e0f2fe", "#f5fbff"],
    stateBg: darkMode ? "rgba(56, 189, 248, 0.2)" : "rgba(14, 165, 233, 0.12)",
    stateText: darkMode ? "#bae6fd" : "#0369a1",
    stateIcon: "progress-clock",
  };
};

export default function EvaluacionesIAScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { categoriaId } = useLocalSearchParams();
  const { height: windowHeight } = useWindowDimensions();
  const headerInset = useAppHeaderContentInset();
  const currentUser = Meteor.user();
  const isAdminUser = currentUser?.profile?.role === "admin" || String(currentUser?.username || "").toLowerCase() === "carlosmbinf";
  const initialCategoryId = normalizeId(Array.isArray(categoriaId) ? categoriaId[0] : categoriaId);
  const [tab, setTab] = React.useState("evaluation");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [session, setSession] = React.useState(null);
  const [answer, setAnswer] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [working, setWorking] = React.useState(false);
  const [categoryDialog, setCategoryDialog] = React.useState(false);
  const [categoryForm, setCategoryForm] = React.useState(EMPTY_CATEGORY);
  const [selectedHistory, setSelectedHistory] = React.useState(null);
  const exitInProgressRef = React.useRef(false);
  const allowExitRef = React.useRef(false);
  const requestExitRef = React.useRef(null);
  const palette = {
    accent: theme.dark ? "#5eead4" : "#0f766e",
    background: theme.dark ? "#050b16" : "#eef7f6",
    border: theme.dark ? "rgba(94,234,212,0.2)" : "rgba(15,118,110,0.18)",
    card: theme.dark ? "#0c1628" : "#ffffff",
    muted: theme.dark ? "#9cabbf" : "#5f6f78",
    text: theme.dark ? "#f8fafc" : "#10242a",
    warning: theme.dark ? "#fde68a" : "#92400e",
    warningBackground: theme.dark ? "rgba(245,158,11,0.1)" : "#fff7df",
  };
  const historyBodyMaxHeight = Math.max(220, Math.min(windowHeight * 0.58, 520));
  const categoryBodyMaxHeight = Math.max(260, Math.min(windowHeight * 0.6, 560));

  const data = Meteor.useTracker(() => {
    if (!Meteor.userId()) return { categories: [], loading: false, sessions: [] };
    const categoriesHandle = Meteor.subscribe("evaluacionesIA.categorias");
    const sessionsHandle = Meteor.subscribe("evaluacionesIA.sesiones", { limit: 100 });
    return {
      categories: CursosCategoriasCollection.find({}, { sort: { nombre: 1 } }).fetch(),
      loading: !categoriesHandle.ready() || !sessionsHandle.ready(),
      sessions: EvaluacionesIASesionesCollection.find({}, { sort: { createdAt: -1 } }).fetch(),
    };
  }, []);

  const activeSession = Boolean(session && !result);
  const activeCategories = React.useMemo(
    () => data.categories.filter((category) => category.activa),
    [data.categories],
  );
  const selectedCategory = activeCategories.find((category) => normalizeId(category._id) === selectedCategoryId);
  const dropdownData = activeCategories.map((category) => ({ label: category.nombre, value: normalizeId(category._id) }));

  React.useEffect(() => {
    if (initialCategoryId && activeCategories.some((category) => normalizeId(category._id) === initialCategoryId)) {
      setSelectedCategoryId(initialCategoryId);
    }
  }, [activeCategories, initialCategoryId]);

  const showError = (error) => Alert.alert(
    "No se pudo completar",
    String(error?.error || "").startsWith("gemini-")
      ? "No pudimos procesar la evaluación. Inténtalo nuevamente."
      : error?.reason || error?.message || "Inténtalo nuevamente.",
  );
  const run = async (action) => {
    setWorking(true);
    try {
      return await action();
    } catch (error) {
      showError(error);
      return null;
    } finally {
      setWorking(false);
    }
  };

  const startEvaluation = async () => {
    const response = await run(() => callMethod("evaluacionesIA.iniciar", selectedCategoryId));
    if (response?.sessionId) {
      setAnswer("");
      setSession(normalizeEvaluationResponse(response, 1));
    }
  };

  const respond = async () => {
    const response = await run(() => callMethod(
      "evaluacionesIA.responder",
      normalizeId(session.sessionId),
      answer,
    ));
    if (!response) return;
    setAnswer("");
    if (Number.isInteger(response.nivelUsuario)) setResult(response);
    else setSession(normalizeEvaluationResponse(response, session.numeroPregunta + 1));
  };

  const resetEvaluation = () => {
    setSession(null);
    setResult(null);
    setAnswer("");
    setSelectedCategoryId(initialCategoryId || "");
  };

  const cancelActiveSession = async () => {
    if (!session?.sessionId) return true;
    try {
      await callMethod("evaluacionesIA.cancelar", normalizeId(session.sessionId));
      return true;
    } catch {
      return false;
    }
  };

  const requestExit = (navigationAction) => {
    if (exitInProgressRef.current) return;
    Alert.alert(
      "Evaluación en curso",
      "Si sales ahora, se perderá el progreso actual. ¿Quieres finalizar la evaluación?",
      [
        { style: "cancel", text: "Continuar" },
        {
          text: "Salir y finalizar",
          onPress: async () => {
            exitInProgressRef.current = true;
            const cancelled = await cancelActiveSession();
            exitInProgressRef.current = false;
            if (!cancelled) {
              Alert.alert("No se pudo cerrar", "No pudimos cerrar la evaluación. Inténtalo nuevamente.");
              return;
            }
            resetEvaluation();
            if (navigationAction) {
              allowExitRef.current = true;
              navigation.dispatch(navigationAction);
              allowExitRef.current = false;
            }
          },
        },
      ],
    );
  };
  requestExitRef.current = requestExit;

  React.useEffect(() => {
    if (!activeSession) return undefined;
    const stopExit = (event) => {
      if (allowExitRef.current) return;
      event.preventDefault();
      requestExitRef.current(event.data.action);
    };
    const unsubscribe = navigation.addListener("beforeRemove", stopExit);
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestExitRef.current(null);
      return true;
    });
    return () => {
      unsubscribe();
      backSubscription.remove();
    };
  }, [activeSession, navigation]);

  const openCategory = (category = null) => {
    setCategoryForm(category ? {
      activa: category.activa,
      categoryId: normalizeId(category._id),
      descripcion: category.descripcion || "",
      maxPreguntas: category.maxPreguntas,
      niveles: category.niveles.map((level) => ({ ...level })),
      nombre: category.nombre,
      promptEvaluador: category.promptEvaluador,
    } : EMPTY_CATEGORY);
    setCategoryDialog(true);
  };

  const saveCategory = async () => {
    const response = await run(() => callMethod("evaluacionesIA.categorias.guardar", categoryForm));
    if (response?.success) {
      setCategoryDialog(false);
      Alert.alert("Listo", "Categoría guardada.");
    }
  };

  const toggleCategory = async (category) => {
    const response = await run(() => callMethod("evaluacionesIA.categorias.cambiarEstado", normalizeId(category._id), !category.activa));
    if (response?.success) Alert.alert("Listo", `Categoría ${category.activa ? "desactivada" : "activada"}.`);
  };

  const updateLevel = (index, value) => setCategoryForm((current) => ({
    ...current,
    niveles: current.niveles.map((level, levelIndex) => levelIndex === index ? { ...level, descripcion: value } : level),
  }));
  const addLevel = () => setCategoryForm((current) => ({
    ...current,
    niveles: [...current.niveles, { nivel: current.niveles.length + 1, descripcion: "" }],
  }));
  const removeLevel = (index) => setCategoryForm((current) => ({
    ...current,
    niveles: current.niveles.filter((_, levelIndex) => levelIndex !== index).map((level, levelIndex) => ({ ...level, nivel: levelIndex + 1 })),
  }));

  const removeSessionLog = (sessionId) => {
    Alert.alert(
      "Eliminar registro",
      "¿Deseas eliminar este log de la evaluación? Esta acción no se puede deshacer.",
      [
        { style: "cancel", text: "Cancelar" },
        {
          style: "destructive",
          text: "Eliminar",
          onPress: async () => {
            const response = await run(() => callMethod("evaluacionesIA.sesiones.eliminar", normalizeId(sessionId)));
            if (response?.success) {
              setSelectedHistory((current) => (normalizeId(current?._id) === normalizeId(sessionId) ? null : current));
              Alert.alert("Listo", "Registro eliminado.");
            }
          },
        },
      ],
    );
  };

  const clearHistoryLogs = () => {
    Alert.alert(
      "Limpiar historial",
      "¿Deseas eliminar todos los logs de evaluaciones finalizadas o con error?",
      [
        { style: "cancel", text: "Cancelar" },
        {
          style: "destructive",
          text: "Eliminar todo",
          onPress: async () => {
            const response = await run(() => callMethod("evaluacionesIA.sesiones.limpiar"));
            if (response?.success) {
              setSelectedHistory(null);
              Alert.alert("Listo", `Se eliminaron ${response.removed || 0} registros.`);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Evaluaciones con IA" subtitle={isAdminUser ? "Laboratorio administrativo" : "Ruta de aprendizaje"} showBackButton backHref="/(normal)/Main" overlapContent />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={theme.dark ? ["#0a1628", "#0d3a3f"] : ["#dff8f3", "#ffffff"]} style={[styles.hero, { borderColor: palette.border }]}>
          <View style={styles.heroCopy}><Text style={[styles.eyebrow, { color: palette.accent }]}>{isAdminUser ? "LABORATORIO ADMINISTRATIVO" : "RUTA DE APRENDIZAJE"}</Text><Text variant="headlineMedium" style={[styles.title, { color: palette.text }]}>Evaluaciones con IA</Text><Text style={[styles.subtitle, { color: palette.muted }]}>Evalúa tus conocimientos y desbloquea cursos sin perder el nivel alcanzado.</Text></View>
          <Icon source="brain" size={54} color={palette.accent} />
        </LinearGradient>

        {isAdminUser ? <View style={[styles.tabs, { borderColor: palette.border }]}>
          {[
            { icon: "clipboard-text-outline", key: "evaluation", label: "Nueva prueba" },
            { icon: "shape-outline", key: "categories", label: "Categorías" },
            { icon: "history", key: "history", label: "Historial" },
          ].map((item) => {
            const selected = tab === item.key;
            return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={item.key} onPress={() => !activeSession && setTab(item.key)} style={[styles.tab, selected && { backgroundColor: palette.accent }]}><Icon source={item.icon} size={20} color={selected ? "#05201f" : palette.muted} /><Text style={[styles.tabLabel, { color: selected ? "#05201f" : palette.muted }]}>{item.label}</Text></Pressable>;
          })}
        </View> : null}

        {data.loading ? <ActivityIndicator style={styles.loader} /> : null}

        {tab === "evaluation" ? (
          <Surface style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
            <View style={styles.steps}>{["Categoría", "Evaluación", "Resultado"].map((label, index) => { const activeStep = result ? 2 : session ? 1 : 0; return <React.Fragment key={label}><View style={styles.step}><View style={[styles.stepDot, { backgroundColor: index <= activeStep ? palette.accent : palette.border }]}><Text style={styles.stepNumber}>{index + 1}</Text></View><Text style={[styles.stepLabel, { color: index <= activeStep ? palette.text : palette.muted }]}>{label}</Text></View>{index < 2 ? <View style={[styles.stepLine, { backgroundColor: index < activeStep ? palette.accent : palette.border }]} /> : null}</React.Fragment>; })}</View>
            {!session ? <View style={styles.section}>
              <Dropdown accessibilityLabel="Categoría de evaluación" data={dropdownData} labelField="label" valueField="value" value={selectedCategoryId} onChange={(item) => setSelectedCategoryId(item.value)} placeholder="Selecciona una categoría" style={[styles.dropdown, { borderColor: palette.border }]} containerStyle={{ backgroundColor: palette.card }} selectedTextStyle={{ color: palette.text }} placeholderStyle={{ color: palette.muted }} itemTextStyle={{ color: palette.text }} activeColor={theme.dark ? "#12343a" : "#dff8f3"} />
              {selectedCategory ? <View style={styles.categorySummary}><Text variant="titleMedium" style={{ color: palette.text }}>{selectedCategory.nombre}</Text><Text style={{ color: palette.muted }}>{selectedCategory.descripcion}</Text><Text style={{ color: palette.muted }}>{selectedCategory.niveles.length} niveles · hasta {selectedCategory.maxPreguntas} preguntas</Text></View> : null}
              <View style={[styles.notice, { backgroundColor: palette.warningBackground, borderColor: palette.border }]}><Icon source="shield-alert-outline" size={22} color={palette.warning} /><Text style={[styles.noticeText, { color: palette.warning }]}>Las preguntas y respuestas serán procesadas por un servicio externo de IA. No escribas datos personales ni secretos.</Text></View>
              <Button mode="contained" icon="play" disabled={!selectedCategoryId || working} loading={working} onPress={startEvaluation}>Iniciar prueba</Button>
            </View> : null}
            {session && !result ? <View style={styles.section}>
              <View style={[styles.notice, { backgroundColor: palette.warningBackground, borderColor: palette.border }]}><Icon source="book-open-variant" size={18} color={palette.warning} /><Text style={[styles.noticeText, { color: palette.warning }]}>Selecciona una respuesta según tus conocimientos, sin consultar fuentes externas.</Text></View>
              <View style={[styles.question, { borderColor: palette.border }]}><Text style={[styles.eyebrow, { color: palette.accent }]}>PREGUNTA {session.numeroPregunta} DE {session.maxPreguntas}</Text><Text style={[styles.questionText, { color: palette.text }]}>{session.pregunta}</Text></View>
              {session.opciones?.length ? (
                <RadioButton.Group value={answer} onValueChange={setAnswer}>
                  <View accessibilityLabel="Opciones de respuesta" accessibilityRole="radiogroup" style={styles.optionGroup}>
                    {session.opciones.map((option, index) => (
                      <RadioButton.Item
                        color={palette.accent}
                        disabled={working}
                        key={option}
                        label={`${String.fromCharCode(65 + index)}. ${option}`}
                        labelStyle={[styles.optionLabel, { color: palette.text }]}
                        mode="android"
                        position="leading"
                        style={[
                          styles.optionItem,
                          { borderColor: answer === option ? palette.accent : palette.border },
                          answer === option && styles.optionItemSelected,
                        ]}
                        value={option}
                      />
                    ))}
                  </View>
                </RadioButton.Group>
              ) : (
                <View style={[styles.optionsUnavailable, { borderColor: palette.border }]}><Icon source="alert-circle-outline" size={20} color={palette.muted} /><Text style={{ color: palette.muted }}>No se pudieron cargar las opciones. Reinicia esta evaluación.</Text></View>
              )}
              <View style={styles.evaluationActions}><Button mode="contained" icon="send" disabled={!answer.trim() || working} loading={working} onPress={respond}>{working ? "Evaluando..." : "Responder"}</Button><Button disabled={working} onPress={() => requestExit(null)}>Salir y finalizar</Button></View>
            </View> : null}
            {result ? <View style={styles.result}><Text style={[styles.eyebrow, { color: palette.muted }]}>NIVEL DEL USUARIO</Text><Text style={[styles.resultNumber, { color: palette.accent }]}>{result.nivelUsuario}</Text><Button mode="outlined" onPress={resetEvaluation}>Nueva prueba</Button></View> : null}
          </Surface>
        ) : null}

        {isAdminUser && tab === "categories" ? <View style={styles.section}>
          <Button mode="contained" icon="plus" onPress={() => openCategory()}>Nueva categoría</Button>
          {!data.categories.length && !data.loading ? <Text style={[styles.empty, { color: palette.muted }]}>No hay categorías configuradas.</Text> : null}
          {data.categories.map((category) => <Surface key={normalizeId(category._id)} style={[styles.categoryCard, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}><View style={styles.categoryHeader}><View style={styles.categoryCopy}><Text variant="titleMedium" style={{ color: palette.text }}>{category.nombre}</Text><Text style={{ color: palette.muted }}>{category.descripcion || "Sin descripción"}</Text></View><View style={[styles.status, { backgroundColor: category.activa ? "#0f766e" : "#64748b" }]}><Text style={styles.statusText}>{category.activa ? "Activa" : "Inactiva"}</Text></View></View><Text style={{ color: palette.muted }}>{category.niveles.length} niveles · máximo {category.maxPreguntas} preguntas</Text><View style={styles.actions}><Button compact onPress={() => toggleCategory(category)}>{category.activa ? "Desactivar" : "Activar"}</Button><Button compact icon="pencil-outline" onPress={() => openCategory(category)}>Editar</Button></View></Surface>)}
        </View> : null}

        {isAdminUser && tab === "history" ? <View style={styles.section}>
          {!!data.sessions.length ? <View style={styles.historyTools}><Button compact icon="delete-sweep-outline" textColor={theme.colors.error} onPress={clearHistoryLogs}>Eliminar logs</Button></View> : null}
          {!data.sessions.length && !data.loading ? <Text style={[styles.empty, { color: palette.muted }]}>Todavía no hay pruebas registradas.</Text> : null}
          {data.sessions.map((item) => {
            const visual = getHistoryCardVisual(item.estado, theme.dark);
            return (
              <Surface key={normalizeId(item._id)} style={[styles.historyCard, { borderColor: `${visual.accent}66` }]} elevation={0}>
                <LinearGradient colors={visual.gradient} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.historyGradient}>
                  <View style={styles.historyHeader}>
                    <View style={styles.categoryCopy}>
                      <Text variant="titleMedium" style={[styles.historyTitle, { color: palette.text }]}>{item.categoriaSnapshot?.nombre || "Categoría eliminada"}</Text>
                      <View style={styles.historyMetaRow}>
                        <Icon source="calendar-clock-outline" size={14} color={palette.muted} />
                        <Text style={[styles.historyMetaText, { color: palette.muted }]}>{formatDate(item.createdAt)}</Text>
                      </View>
                      <View style={styles.historyMetaRow}>
                        <Icon source="format-list-numbered" size={14} color={palette.muted} />
                        <Text style={[styles.historyMetaText, { color: palette.muted }]}>{item.turnos?.length || 0} respuestas</Text>
                      </View>
                    </View>
                    <View style={styles.historyBadgeColumn}>
                      <View style={[styles.historyStateBadge, { backgroundColor: visual.stateBg }]}>
                        <Icon source={visual.stateIcon} size={13} color={visual.stateText} />
                        <Text style={[styles.historyStateText, { color: visual.stateText }]}>{item.estado}</Text>
                      </View>
                      {Number.isInteger(item.nivelUsuario) ? <View style={[styles.historyLevelBadge, { borderColor: `${visual.accent}99` }]}><Text style={[styles.historyLevelText, { color: visual.accent }]}>Nivel {item.nivelUsuario}</Text></View> : null}
                    </View>
                  </View>

                  <View style={styles.historyActionsRow}>
                    <Button compact mode="outlined" onPress={() => setSelectedHistory(item)}>Ver detalle</Button>
                    <Button compact mode="text" textColor={theme.colors.error} onPress={() => removeSessionLog(item._id)}>Eliminar</Button>
                  </View>
                </LinearGradient>
              </Surface>
            );
          })}
        </View> : null}
      </ScrollView>

      <Portal>
        <Dialog visible={categoryDialog} onDismiss={() => !working && setCategoryDialog(false)} style={[styles.categoryDialog, { backgroundColor: palette.card }]}>
          <LinearGradient colors={theme.dark ? ["#0a1628", "#0d3a3f"] : ["#dff8f3", "#f8fffd"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.categoryDialogHeader}>
            <Dialog.Title
              left={(props) => <View style={[styles.categoryDialogIcon, { backgroundColor: theme.dark ? "rgba(94,234,212,0.18)" : "rgba(15,118,110,0.12)" }]}><Icon {...props} source={categoryForm.categoryId ? "pencil-outline" : "shape-plus-outline"} color={palette.accent} size={22} /></View>}
              style={styles.categoryDialogTitle}
            >{categoryForm.categoryId ? "Editar categoría" : "Nueva categoría"}</Dialog.Title>
            <Text style={[styles.categoryDialogSubtitle, { color: palette.muted }]}>Configura la identidad, las instrucciones y la escala de evaluación.</Text>
          </LinearGradient>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0} style={styles.categoryKeyboard}>
            <Dialog.ScrollArea style={[styles.dialogScrollArea, { maxHeight: categoryBodyMaxHeight }]}><ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.dialogContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={[styles.formSection, { backgroundColor: theme.dark ? "rgba(15,23,42,0.48)" : "#f8fbfb", borderColor: palette.border }]}>
              <View style={styles.formSectionHeader}><View style={[styles.formSectionIcon, { backgroundColor: theme.dark ? "rgba(56,189,248,0.16)" : "#e0f2fe" }]}><Icon source="information-outline" size={18} color={theme.dark ? "#7dd3fc" : "#0369a1"} /></View><View style={styles.formSectionCopy}><Text style={[styles.formSectionTitle, { color: palette.text }]}>Identidad</Text><Text style={[styles.formSectionHint, { color: palette.muted }]}>Cómo aparecerá la categoría en el laboratorio.</Text></View></View>
              <TextInput label="Nombre" mode="outlined" value={categoryForm.nombre} onChangeText={(value) => setCategoryForm((current) => ({ ...current, nombre: value }))} />
              <TextInput contentStyle={styles.multilineContent} label="Descripción" mode="outlined" multiline numberOfLines={3} style={styles.descriptionInput} value={categoryForm.descripcion} onChangeText={(value) => setCategoryForm((current) => ({ ...current, descripcion: value }))} />
            </View>
            <View style={[styles.formSection, { backgroundColor: theme.dark ? "rgba(15,23,42,0.48)" : "#f8fbfb", borderColor: palette.border }]}>
              <View style={styles.formSectionHeader}><View style={[styles.formSectionIcon, { backgroundColor: theme.dark ? "rgba(167,139,250,0.16)" : "#ede9fe" }]}><Icon source="brain" size={18} color={theme.dark ? "#c4b5fd" : "#6d28d9"} /></View><View style={styles.formSectionCopy}><Text style={[styles.formSectionTitle, { color: palette.text }]}>Criterio de evaluación</Text><Text style={[styles.formSectionHint, { color: palette.muted }]}>Define el comportamiento del evaluador IA.</Text></View></View>
              <TextInput contentStyle={styles.multilineContent} label="Prompt del evaluador" mode="outlined" multiline numberOfLines={6} style={styles.promptInput} value={categoryForm.promptEvaluador} onChangeText={(value) => setCategoryForm((current) => ({ ...current, promptEvaluador: value }))} />
              <TextInput label="Máximo de preguntas" mode="outlined" keyboardType="number-pad" value={String(categoryForm.maxPreguntas)} onChangeText={(value) => setCategoryForm((current) => ({ ...current, maxPreguntas: Number(String(value).replace(/[^\d]/g, "") || current.maxPreguntas) }))} />
            </View>
            <View style={[styles.formSection, { backgroundColor: theme.dark ? "rgba(15,23,42,0.48)" : "#f8fbfb", borderColor: palette.border }]}>
              <View style={styles.formSectionHeader}><View style={[styles.formSectionIcon, { backgroundColor: theme.dark ? "rgba(245,158,11,0.16)" : "#fef3c7" }]}><Icon source="stairs-up" size={18} color={theme.dark ? "#fcd34d" : "#b45309"} /></View><View style={styles.formSectionCopy}><Text style={[styles.formSectionTitle, { color: palette.text }]}>Escala de niveles</Text><Text style={[styles.formSectionHint, { color: palette.muted }]}>Describe qué significa cada nivel de dominio.</Text></View></View>
              {categoryForm.niveles.map((level, index) => <View key={level.nivel} style={styles.levelRow}><View style={[styles.levelIndex, { backgroundColor: palette.accent }]}><Text style={styles.stepNumber}>{level.nivel}</Text></View><TextInput contentStyle={styles.multilineContent} style={styles.levelInput} label={`Descripción del nivel ${level.nivel}`} mode="outlined" multiline numberOfLines={3} value={level.descripcion} onChangeText={(value) => updateLevel(index, value)} /><IconButton icon="close" style={styles.levelRemove} disabled={categoryForm.niveles.length <= 2} onPress={() => removeLevel(index)} /></View>)}
              <Button icon="plus" disabled={categoryForm.niveles.length >= 20} onPress={addLevel}>Agregar nivel</Button>
              <View style={[styles.switchRow, { borderTopColor: palette.border }]}><View><Text style={[styles.switchTitle, { color: palette.text }]}>Categoría activa</Text><Text style={[styles.switchHint, { color: palette.muted }]}>Disponible para nuevas evaluaciones</Text></View><Switch value={categoryForm.activa} onValueChange={(value) => setCategoryForm((current) => ({ ...current, activa: value }))} /></View>
            </View>
            </ScrollView></Dialog.ScrollArea>
            <Dialog.Actions style={styles.categoryActions}><Button disabled={working} onPress={() => setCategoryDialog(false)}>Cancelar</Button><Button mode="contained" loading={working} disabled={working} onPress={saveCategory}>Guardar</Button></Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>

        <Dialog visible={Boolean(selectedHistory)} onDismiss={() => setSelectedHistory(null)} style={[styles.historyDialog, { backgroundColor: palette.card }]}>
          <Dialog.Title>Detalle de la prueba</Dialog.Title>
          <Dialog.ScrollArea style={[styles.historyScrollArea, { maxHeight: historyBodyMaxHeight }]}><ScrollView contentContainerStyle={styles.dialogContent}>
            <Text style={{ color: palette.muted }}>{selectedHistory?.categoriaSnapshot?.nombre} · {formatDate(selectedHistory?.createdAt)}</Text>
            {selectedHistory?.turnos?.map((turn, index) => <React.Fragment key={turn.numero}>{index > 0 ? <Divider /> : null}<View style={styles.turn}><Text style={[styles.eyebrow, { color: palette.accent }]}>PREGUNTA {turn.numero}</Text><Text style={{ color: palette.text }}>{turn.pregunta}</Text><Text style={{ color: palette.muted }}>Respuesta: {turn.respuesta}</Text></View></React.Fragment>)}
            {selectedHistory?.ultimoError ? <Text style={{ color: theme.colors.error }}>{selectedHistory.ultimoError}</Text> : null}
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions style={styles.historyActions}><Button onPress={() => setSelectedHistory(null)}>Cerrar</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, padding: 16, paddingBottom: 80 },
  hero: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 14, padding: 18 },
  heroCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: "900" },
  title: { fontWeight: "900" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  tabs: { borderRadius: 8, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  tab: { alignItems: "center", flex: 1, gap: 4, justifyContent: "center", minHeight: 58, paddingHorizontal: 4 },
  tabLabel: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  loader: { marginVertical: 18 },
  panel: { borderRadius: 8, borderWidth: 1, gap: 14, padding: 14 },
  steps: { alignItems: "flex-start", flexDirection: "row" },
  step: { alignItems: "center", gap: 5, width: 76 },
  stepDot: { alignItems: "center", borderRadius: 18, height: 32, justifyContent: "center", width: 32 },
  stepNumber: { color: "#05201f", fontWeight: "900" },
  stepLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },
  stepLine: { flex: 1, height: 2, marginHorizontal: -14, marginTop: 15 },
  section: { gap: 10 },
  dropdown: { borderRadius: 8, borderWidth: 1, minHeight: 56, paddingHorizontal: 12 },
  categorySummary: { gap: 5 },
  notice: { alignItems: "flex-start", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  question: { borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 },
  questionText: { fontSize: 17, fontWeight: "600", lineHeight: 24 },
  evaluationActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  optionGroup: { gap: 7 },
  optionItem: { borderRadius: 8, borderWidth: 1, minHeight: 54, paddingHorizontal: 4, paddingVertical: 3 },
  optionItemSelected: { backgroundColor: "rgba(15,118,110,0.08)" },
  optionLabel: { flexShrink: 1, fontSize: 14, lineHeight: 19, paddingVertical: 6, textAlign: "left" },
  optionsUnavailable: { alignItems: "center", borderRadius: 8, borderStyle: "dashed", borderWidth: 1, flexDirection: "row", gap: 8, padding: 12 },
  result: { alignItems: "center", gap: 12, paddingVertical: 28 },
  resultNumber: { fontSize: 72, fontWeight: "900", lineHeight: 78 },
  categoryCard: { borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 },
  categoryHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  categoryCopy: { flex: 1, gap: 3 },
  status: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  actions: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end" },
  historyCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  historyGradient: { gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  historyTools: { alignItems: "flex-end", marginBottom: 2 },
  historyHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  historyTitle: { fontWeight: "800", letterSpacing: 0.2 },
  historyMetaRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  historyMetaText: { fontSize: 12, opacity: 0.86 },
  historyBadgeColumn: { alignItems: "flex-end", gap: 8 },
  historyStateBadge: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  historyStateText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  historyLevelBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  historyLevelText: { fontSize: 11, fontWeight: "800" },
  historyActionsRow: { alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.18)", flexDirection: "row", justifyContent: "flex-end", paddingTop: 10 },
  levelBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  empty: { padding: 28, textAlign: "center" },
  denied: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  categoryDialog: { alignSelf: "center", borderRadius: 18, marginHorizontal: 16, overflow: "hidden", width: "92%" },
  categoryDialogHeader: { marginTop: -12, paddingBottom: 10, paddingHorizontal: 16, paddingTop: 12 },
  categoryDialogIcon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", marginRight: 8, width: 38 },
  categoryDialogTitle: { marginBottom: 0, marginTop: -6, paddingBottom: 3, paddingHorizontal: 6, paddingTop: 7 },
  categoryDialogSubtitle: { fontSize: 12, lineHeight: 17, marginLeft: 52, marginTop: -4 },
  historyDialog: { alignSelf: "center", borderRadius: 16, marginHorizontal: 16, width: "92%" },
  dialogScrollArea: { flexGrow: 0, flexShrink: 1, minHeight: 0, paddingHorizontal: 0 },
  categoryKeyboard: { flexShrink: 1 },
  historyScrollArea: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  categoryActions: { paddingBottom: 6, paddingTop: 0 },
  historyActions: { paddingBottom: 6, paddingTop: 2 },
  dialogContent: { gap: 8, paddingBottom: 20, paddingHorizontal: 0, paddingTop: 10 },
  formSection: { borderRadius: 14, borderWidth: 1, gap: 7, padding: 7 },
  formSectionHeader: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 1 },
  formSectionIcon: { alignItems: "center", borderRadius: 10, height: 30, justifyContent: "center", width: 30 },
  formSectionCopy: { flex: 1, gap: 1 },
  formSectionTitle: { fontSize: 13, fontWeight: "800" },
  formSectionHint: { fontSize: 11, lineHeight: 15 },
  descriptionInput: { minHeight: 80 },
  promptInput: { minHeight: 120 },
  multilineContent: { paddingTop: 12, textAlignVertical: "top" },
  levelRow: { alignItems: "flex-start", flexDirection: "row", gap: 4 },
  levelIndex: { alignItems: "center", borderRadius: 8, height: 38, justifyContent: "center", marginTop: 8, width: 32 },
  levelInput: { flex: 1, minHeight: 76 },
  levelRemove: { marginLeft: -4, marginRight: -6, marginTop: 4 },
  switchRow: { alignItems: "center", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 1, paddingTop: 8 },
  switchTitle: { fontSize: 13, fontWeight: "700" },
  switchHint: { fontSize: 11, marginTop: 2 },
  turn: { gap: 6, paddingVertical: 12 },
});